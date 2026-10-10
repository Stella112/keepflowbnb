import {toUnits} from "../binance/amounts.ts";
import type {Account,Policy} from "./model.ts";
const HOUR=3_600_000,DAY=24*HOUR;
export function watSpendPeriods(now=Date.now()){
 if(!Number.isFinite(now))throw new Error("Invalid paper budget time.");const shifted=new Date(now+HOUR),day=shifted.toISOString().slice(0,10);const monday=new Date(Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate()));monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);return {day,week:monday.toISOString().slice(0,10)};
}
export type PaperSpendBudget={day:string;week:string;dailyMicros:string;weeklyMicros:string};
function amount(value:string){if(!/^\d+(\.\d{1,6})?$/.test(value))throw new Error("Invalid historical paper spend.");return toUnits(value,6);}
function ledger(account:Account,now:number):PaperSpendBudget{
 const periods=watSpendPeriods(now);if(account.paperSpendBudget){const previous=account.paperSpendBudget;if(!/^\d{4}-\d{2}-\d{2}$/.test(previous.day)||!/^\d{4}-\d{2}-\d{2}$/.test(previous.week)||!/^\d+$/.test(previous.dailyMicros)||!/^\d+$/.test(previous.weeklyMicros)||new Date(previous.day+"T00:00:00Z").toISOString().slice(0,10)!==previous.day||new Date(previous.week+"T00:00:00Z").toISOString().slice(0,10)!==previous.week||new Date(previous.week+"T00:00:00Z").getUTCDay()!==1||BigInt(previous.weeklyMicros)<BigInt(previous.dailyMicros)||previous.day>periods.day||previous.week>periods.week)throw new Error("Paper budget history could not be verified.");return {...periods,dailyMicros:previous.day===periods.day?previous.dailyMicros:"0",weeklyMicros:previous.week===periods.week?previous.weeklyMicros:"0"};}
 let daily=0n,weekly=0n;for(const receipt of account.receipts){if(receipt.mode!=="PAPER"||receipt.action==="SELL"||receipt.action==="STRATEGY_UPDATE")continue;const fills=receipt.legs.filter(leg=>leg.status==="PAPER_FILLED");if(!fills.length)continue;const time=Date.parse(receipt.createdAt);if(!Number.isFinite(time)||time>now)throw new Error("Paper purchase history time could not be verified.");const key=watSpendPeriods(time);if(key.week!==periods.week&&key.day!==periods.day)continue;const spent=fills.reduce((sum,leg)=>sum+amount(leg.amountUsd),0n);if(key.day===periods.day)daily+=spent;if(key.week===periods.week)weekly+=spent;}return {...periods,dailyMicros:daily.toString(),weeklyMicros:weekly.toString()};
}
export function checkPaperSpend(account:Account,cost:bigint,policy:Policy,now=Date.now()){
 const state=ledger(account,now);if(cost<=0n)throw new Error("Positive purchase cost required.");if(policy.maxDailySpendUsd!==undefined&&BigInt(state.dailyMicros)+cost>amount(policy.maxDailySpendUsd))return {allowed:false,reason:"This paper purchase exceeds your WAT daily spending limit."};if(policy.maxWeeklySpendUsd!==undefined&&BigInt(state.weeklyMicros)+cost>amount(policy.maxWeeklySpendUsd))return {allowed:false,reason:"This paper purchase exceeds your WAT Monday-to-Sunday spending limit."};return {allowed:true,reason:"Within paper purchase period budgets."};
}
export function recordPaperSpend(account:Account,cost:bigint,now=Date.now()){if(cost<=0n)throw new Error("Positive purchase cost required.");const state=ledger(account,now);account.paperSpendBudget={...state,dailyMicros:(BigInt(state.dailyMicros)+cost).toString(),weeklyMicros:(BigInt(state.weeklyMicros)+cost).toString()};}

export function paperSpendUsage(account:Account,now=Date.now()):PaperSpendBudget{return ledger(account,now);}
