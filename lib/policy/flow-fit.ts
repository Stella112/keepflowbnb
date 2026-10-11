import type {Flow,Policy} from "../paper/model.ts";

/** Deterministic check of a published Flow against an investor's own rules. It never edits the
 * Flow; it proposes a separate allocation the investor may accept (saved as their own fork).
 * Conservative default: weight removed from a holding goes to the USDT reserve, never to other
 * stocks. Execution re-checks every leg against real holdings, quotes and balances. */
export type FitStatus="ALLOW"|"ADJUSTMENT_REQUIRED"|"BLOCK"|"UNAVAILABLE";
export type FitChange={ticker:string;fromBps:number;toBps:number;code:"SINGLE_ASSET_CAP"|"ASSET_UNAVAILABLE"|"MIN_RESERVE";reason:string};
export type FlowFit={status:FitStatus;code:string;explanation:string;limits:{maxSingleAssetBps:number;minReserveBps:number};
 original:{assets:{ticker:string;weightBps:number}[];reserveBps:number};adjusted:{assets:{ticker:string;weightBps:number}[];reserveBps:number}|null;changes:FitChange[]};
const pct=(bps:number)=>`${(bps/100).toFixed(bps%100?2:0)}%`;

export function fitFlowToRules(flow:Pick<Flow,"assets"|"reserveBps"|"policy">,personal:Policy,unavailable:readonly string[]=[]):FlowFit{
 // A creator's rules can only narrow the investor's limits, never loosen them.
 const cap=Math.min(personal.maxSingleAssetBps,flow.policy?.maxSingleAssetBps??10000);
 const minReserve=Math.max(personal.minReserveBps,flow.policy?.minReserveBps??0);
 const original={assets:flow.assets.map(a=>({...a})),reserveBps:flow.reserveBps},limits={maxSingleAssetBps:cap,minReserveBps:minReserve};
 const changes:FitChange[]=[];
 let assets=flow.assets.map(a=>{
  if(unavailable.includes(a.ticker)){changes.push({ticker:a.ticker,fromBps:a.weightBps,toBps:0,code:"ASSET_UNAVAILABLE",reason:`${a.ticker} has no open BNB Smart Chain listing right now, so its ${pct(a.weightBps)} stays in USDT.`});return {...a,weightBps:0};}
  if(a.weightBps>cap){changes.push({ticker:a.ticker,fromBps:a.weightBps,toBps:cap,code:"SINGLE_ASSET_CAP",reason:`Your rules allow at most ${pct(cap)} in one company; the Flow puts ${pct(a.weightBps)} in ${a.ticker}. The extra ${pct(a.weightBps-cap)} stays in USDT.`});return {...a,weightBps:cap};}
  return {...a};
 });
 let reserve=10000-assets.reduce((n,a)=>n+a.weightBps,0);
 if(reserve<minReserve){
  // Scale every holding down evenly (integer basis points, rounding toward more reserve) until the reserve rule holds.
  const invested=10000-reserve,target=10000-minReserve;
  assets=assets.map(a=>{const next=Math.floor(a.weightBps*target/invested);if(next!==a.weightBps){const prior=changes.find(c=>c.ticker===a.ticker);if(prior)prior.toBps=next;else changes.push({ticker:a.ticker,fromBps:a.weightBps,toBps:next,code:"MIN_RESERVE",reason:`Your rules keep at least ${pct(minReserve)} in USDT, so ${a.ticker} is reduced proportionally.`});}return {...a,weightBps:next};});
  reserve=10000-assets.reduce((n,a)=>n+a.weightBps,0);
 }
 const kept=assets.filter(a=>a.weightBps>0);
 if(!kept.length)return {status:unavailable.length?"UNAVAILABLE":"BLOCK",code:unavailable.length?"NO_AVAILABLE_ASSETS":"NO_ELIGIBLE_ASSETS",explanation:"No holding in this Flow can be bought under your rules right now, so nothing would be invested.",limits,original,adjusted:null,changes};
 if(!changes.length)return {status:"ALLOW",code:"WITHIN_RULES",explanation:`This Flow already fits your rules: no company above ${pct(cap)} and at least ${pct(minReserve)} kept in USDT. Each purchase is still checked against your real balance and holdings.`,limits,original,adjusted:null,changes};
 return {status:"ADJUSTMENT_REQUIRED",code:changes[0].code,explanation:`This Flow doesn't fit your rules as published. KeepFlow can propose your own version: ${changes.length} holding${changes.length>1?"s":""} reduced, ${pct(reserve)} kept in USDT. The creator's Flow is not changed.`,limits,original,adjusted:{assets:kept,reserveBps:reserve},changes};
}
