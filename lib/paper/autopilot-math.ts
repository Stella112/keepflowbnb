import type {AutopilotPlan,Flow,Policy} from "./model.ts";
export function nextPaperRun(after:string,cadence:"DAILY"|"WEEKLY",weekday:number){
 const date=new Date(after);if(!Number.isFinite(date.getTime())||!Number.isInteger(weekday)||weekday<0||weekday>6)throw new Error("Invalid paper schedule");
 // 09:00 WAT = 08:00 UTC. Advancing from a completed due time avoids duplicate periods.
 const next=new Date(date);next.setUTCHours(8,0,0,0);
 if(next<=date)next.setUTCDate(next.getUTCDate()+1);
 if(cadence==="WEEKLY")while(next.getUTCDay()!==weekday)next.setUTCDate(next.getUTCDate()+1);
 return next.toISOString();
}
export function paperRunKey(plan:AutopilotPlan){return `paper-autopilot:${plan.id}:${plan.nextRunAt}`;}
export function planDue(plan:AutopilotPlan,now=Date.now()){return plan.enabled&&Date.parse(plan.nextRunAt)<=now;}
export function strategyAllowed(bell:Flow,policy:Policy){if(bell.assets.some(asset=>asset.weightBps>policy.maxSingleAssetBps))return {allowed:false,reason:"The new strategy exceeds your single-holding target limit."};if(bell.reserveBps<policy.minReserveBps)return {allowed:false,reason:"The new strategy's cash target is below your minimum reserve."};return {allowed:true,reason:"The new strategy fits your exposure and reserve rules. Your contribution schedule and trade limits stay in place."};}
