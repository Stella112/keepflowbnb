import {toUnits,fromUnits} from "../binance/amounts.ts";
import type {Flow,Policy} from "../paper/model.ts";

export type Decision={allowed:boolean;code:string;reason:string};
export function effectiveBellPolicy(bell:Flow,personal:Policy):Policy{
 const chosen=bell.policy;
 const cap=(a:number|undefined,b:number|undefined)=>a===undefined?b:b===undefined?a:Math.min(a,b);
 const usdCap=(a:string|undefined,b:string|undefined)=>a===undefined?b:b===undefined?a:toUnits(a,6)<toUnits(b,6)?a:b;
 return {...personal,maxDailySpendUsd:usdCap(personal.maxDailySpendUsd,chosen?.maxDailySpendUsd),maxWeeklySpendUsd:usdCap(personal.maxWeeklySpendUsd,chosen?.maxWeeklySpendUsd),maxTradeUsd:chosen?.maxTradeUsd&&toUnits(chosen.maxTradeUsd,6)<toUnits(personal.maxTradeUsd,6)?chosen.maxTradeUsd:personal.maxTradeUsd,maxSingleAssetBps:Math.min(personal.maxSingleAssetBps,chosen?.maxSingleAssetBps??10000),minReserveBps:Math.max(bell.reserveBps,personal.minReserveBps,chosen?.minReserveBps??0),maxSlippageBps:cap(personal.maxSlippageBps,chosen?.maxSlippageBps),quoteMaxAgeSeconds:cap(personal.quoteMaxAgeSeconds,chosen?.quoteMaxAgeSeconds),priceMaxAgeSeconds:cap(personal.priceMaxAgeSeconds,chosen?.priceMaxAgeSeconds)};
}
export function quotePolicy(policy:Policy,quoteFetchedAt:string,priceFetchedAt:string,slippageBps:number,now=Date.now()):Decision{
 if(policy.maxSlippageBps!==undefined&&slippageBps>policy.maxSlippageBps)return {allowed:false,code:'MAX_SLIPPAGE',reason:'The verified route slippage exceeds your effective Flow and personal cap.'};
 for(const [time,limit,code] of [[quoteFetchedAt,policy.quoteMaxAgeSeconds,'STALE_QUOTE'],[priceFetchedAt,policy.priceMaxAgeSeconds,'STALE_PRICE']] as const){if(limit!==undefined&&(!Number.isFinite(Date.parse(time))||Date.parse(time)>now||now-Date.parse(time)>limit*1000))return {allowed:false,code,reason:'The quote or indicative price exceeds your selected freshness limit. Refresh before continuing.'};}
 return {allowed:true,code:'ALLOWED',reason:'Within the selected slippage and local freshness limits; this is not an upstream expiry guarantee.'};
}
export type WalletSnapshot={wallet:string;chainId:56;blockNumber:string;checkedAt:string;marketFetchedAt:string;bnb:string;usdt:string;cashMicros:string;totalMicros:string;exposures:Record<string,string>;positions:{ticker:string;name:string;provider:string;address:string;symbol:string;quantity:string;shares:string;valueUsd:string;priceUsd:string}[];scope:string};
import type {SponsoredPreparation} from "../paymaster/workflow.ts";
export type DryLeg={sponsorship?:SponsoredPreparation;ticker:string;amount:string;provider?:string;status:"NOT_STARTED"|"QUOTED"|"BLOCKED"|"SIMULATED"|"FAILED";reason:string;policy?:Decision;quote?:{id:string;amount:string;estimatedTokens:string;estimatedShares:string;tokenSymbol:string;route:string;approvalRequired:boolean;fetchedAt:string};simulation?:{approvalStatus:string;swapStatus:string;message:string;checkedAt:string};transactionHash:null};
export type DryReceipt={id:string;requestId:string;mode:"DRY_RUN";checkKind?:"QUOTE_ONLY"|"SIMULATE";status:"CHECKING"|"QUOTED"|"SIMULATED"|"PARTIAL"|"BLOCKED"|"FAILED";bell:{id:string;title:string;version:number;contentHash:string};wallet:string;amount:string;reserveAmount:string;roundingAmount:string;policy:Policy;createdAt:string;finishedAt?:string;snapshot?:WalletSnapshot;legs:DryLeg[];reason:string;executionEnabled:false;transactionHash:null};

// These limits are for read-only checks; they do not authorize a live trade.
export function walletPolicy(amount:bigint,cash:bigint,exposure:bigint,total:bigint,policy:Policy):Decision{
 const deny=(code:string,reason:string):Decision=>({allowed:false,code,reason});
 if(amount<=0n)return deny("AMOUNT_TOO_SMALL","The allocation rounds down to zero.");
 if(amount>toUnits(policy.maxTradeUsd,6))return deny("MAX_TRADE","This leg exceeds your maximum trade amount.");
 if(amount>25_000_000n)return deny("READ_ONLY_LIMIT","A read-only quote is limited to 25 USDT per stock.");
 if(cash<amount)return deny("INSUFFICIENT_USDT","The wallet does not have enough USDT for this leg.");
 if(total<=0n||(cash-amount)*10000n<total*BigInt(policy.minReserveBps))return deny("MIN_RESERVE","This leg would reduce the USDT reserve below your rule.");
 if((exposure+amount)*10000n>total*BigInt(policy.maxSingleAssetBps))return deny("MAX_EXPOSURE","This leg would exceed your single-company exposure rule.");
 return {allowed:true,code:"ALLOWED",reason:"Within the wallet spending and allocation rules."};
}
export function bellDryPlan(bell:Flow,amount:string){
 const units=toUnits(amount,6);if(units<=0n||units>100_000_000n)throw new Error("Enter between 0 and 100 USDT for a read-only Flow check.");
 const legs=bell.assets.map(asset=>({ticker:asset.ticker,amount:fromUnits(units*BigInt(asset.weightBps)/10000n,6),status:"NOT_STARTED" as const,reason:"Waiting for the preceding leg.",transactionHash:null}));
 const reserve=units*BigInt(bell.reserveBps)/10000n;
 const allocated=legs.reduce((sum,leg)=>sum+toUnits(leg.amount,6),reserve);
 return {legs,reserveAmount:fromUnits(reserve,6),roundingAmount:fromUnits(units-allocated,6)};
}
export function finalDryStatus(legs:DryLeg[],quoteOnly=false):DryReceipt["status"]{
 if(quoteOnly&&legs.every(leg=>leg.status==="QUOTED"))return "QUOTED";
 if(quoteOnly&&legs.some(leg=>leg.status==="QUOTED"))return "PARTIAL";
 if(legs.every(leg=>leg.status==="SIMULATED"))return "SIMULATED";
 if(legs.some(leg=>leg.status==="SIMULATED"))return "PARTIAL";
 return legs.some(leg=>leg.status==="BLOCKED")?"BLOCKED":"FAILED";
}
export async function runSequentialDryLegs(legs:DryLeg[],check:(leg:DryLeg)=>Promise<void>,save:()=>void,successStatus:"SIMULATED"|"QUOTED"="SIMULATED"){
 let stopped=false;
 for(const leg of legs){
  if(stopped){leg.reason="Stopped after the preceding leg failed or was blocked. No transactions were submitted.";save();continue;}
  try{await check(leg);}catch{leg.status="FAILED";leg.reason="The leg could not be verified. No transaction was submitted.";}
  if(leg.status!==successStatus)stopped=true;
  save();
 }
}

