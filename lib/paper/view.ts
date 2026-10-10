import {fromUnits,shareExposure,toUnits} from "../binance/amounts.ts";
import {valueMicros,usd,money} from "./engine.ts";
import type {Account} from "./model";
import type {RwaToken} from "../binance/rwa-schemas";
import {paperSpendUsage} from "./spend-budget.ts";
export function accountView(account:Account,tokens:RwaToken[],fetchedAt:string|null){
 const positions=account.positions.map(p=>{const asset=tokens.find(t=>t.tokenContractAddress.toLowerCase()===p.address.toLowerCase());const value=asset&&toUnits(asset.tokenPrice,asset.tokenPrice.split(".")[1]?.length??0)>0n?valueMicros(BigInt(p.quantity),p.decimals,asset.tokenPrice):null;return {...p,quantity:fromUnits(BigInt(p.quantity),p.decimals),shares:shareExposure(BigInt(p.quantity),p.decimals,p.ratio),costUsd:usd(BigInt(p.costMicros)),valueUsd:value===null?null:usd(value),pnlUsd:value===null?null:(value<BigInt(p.costMicros)?"-":"")+usd(value<BigInt(p.costMicros)?BigInt(p.costMicros)-value:value-BigInt(p.costMicros))};});
 const known=positions.every(p=>p.valueUsd!==null);const total=known?BigInt(account.cashMicros)+positions.reduce((sum,p)=>sum+money(p.valueUsd!),0n):null;
 const spent=paperSpendUsage(account);
 const remaining=(cap:string|undefined,used:string)=>cap===undefined?null:usd(money(cap)>BigInt(used)?money(cap)-BigInt(used):0n);
 return {mode:"PAPER" as const,cashUsd:usd(BigInt(account.cashMicros)),totalUsd:total===null?null:usd(total),positions,receipts:[...account.receipts].reverse(),policy:account.policy,policyVersion:account.policyVersion??0,autopilot:account.autopilot??null,fetchedAt,paperBudget:{day:spent.day,week:spent.week,dailySpentUsd:usd(BigInt(spent.dailyMicros)),weeklySpentUsd:usd(BigInt(spent.weeklyMicros)),dailyRemainingUsd:remaining(account.policy.maxDailySpendUsd,spent.dailyMicros),weeklyRemainingUsd:remaining(account.policy.maxWeeklySpendUsd,spent.weeklyMicros)}};
}
