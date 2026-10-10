import {toUnits,fromUnits} from "../binance/amounts.ts";
import type {RwaToken} from "../binance/rwa-schemas.ts";
import type {Account,Policy,Leg,Flow} from "./model.ts";
import {effectiveBellPolicy} from '../execution/rules.ts';
import {checkPaperSpend,recordPaperSpend} from "./spend-budget.ts";
export const money=(value:string)=>toUnits(value,6);
export const usd=(value:bigint)=>fromUnits(value,6);
function priceUnits(price:string){const scale=price.split(".")[1]?.length??0;return {units:toUnits(price,scale),scale:10n**BigInt(scale)};}
export function valueMicros(quantity:bigint,decimals:number,price:string){const parsed=priceUnits(price);return quantity*parsed.units*10n**6n/(10n**BigInt(decimals)*parsed.scale);}
export function portfolioValue(account:Account,tokens:RwaToken[]){
 let total=BigInt(account.cashMicros);const values=new Map<string,bigint>();
 for(const p of account.positions){const asset=tokens.find(t=>t.tokenContractAddress.toLowerCase()===p.address.toLowerCase());if(!asset||moneyPrice(asset.tokenPrice)<=0n)throw new Error("Live prices are unavailable for a held position.");const value=valueMicros(BigInt(p.quantity),p.decimals,asset.tokenPrice);total+=value;values.set(p.ticker,(values.get(p.ticker)??0n)+value);}
 return {total,values};
}
const moneyPrice=(price:string)=>priceUnits(price).units;
export function checkPolicy(amount:bigint,afterCash:bigint,afterExposure:bigint,total:bigint,policy:Policy){
 if(amount>money(policy.maxTradeUsd))return {allowed:false,reason:"This paper trade exceeds your maximum trade amount."};
 if(total<=0n||afterCash*10000n<total*BigInt(policy.minReserveBps))return {allowed:false,reason:"This paper trade would reduce cash below your minimum reserve."};
 if(afterExposure*10000n>total*BigInt(policy.maxSingleAssetBps))return {allowed:false,reason:"This paper trade would exceed your single-company exposure limit."};
 return {allowed:true,reason:"Within your paper trading rules."};
}
export function fillBuy(account:Account,asset:RwaToken|undefined,amount:bigint,fetchedAt:string,policy?:Policy,tokens:RwaToken[]=[],now=Date.now()):Leg{
 const base={ticker:asset?.underlyingTicker??"Unknown",provider:asset?.platformId??null,amountUsd:usd(amount),policy:"NOT_CHECKED" as Leg["policy"]};
 if(!asset||amount<=0n)return {...base,status:"FAILED",reason:"This representation or purchase amount is unavailable."};
 if(!asset.statusInfo.openState)return {...base,status:"BLOCKED",reason:"The live provider reports that this representation is unavailable for purchase."};
 if(policy?.priceMaxAgeSeconds!==undefined&&(!Number.isFinite(Date.parse(fetchedAt))||Date.parse(fetchedAt)>Date.now()||Date.now()-Date.parse(fetchedAt)>policy.priceMaxAgeSeconds*1000))return {...base,status:'BLOCKED',reason:'The indicative price exceeds your selected freshness limit.',policy:'BLOCKED'};
 const price=priceUnits(asset.tokenPrice);if(price.units<=0n)return {...base,status:"FAILED",reason:"A positive live token price is required."};
 if(amount>BigInt(account.cashMicros))return {...base,status:"BLOCKED",reason:"Not enough virtual cash."};
 const quantity=amount*10n**BigInt(Number(asset.decimals))*price.scale/(price.units*10n**6n);
 if(quantity<=0n)return {...base,status:"FAILED",reason:"The paper amount is too small for this representation."};
 // Round cost upward to one USD micro-unit. Never create tokens by rounding cost down.
 const numerator=quantity*price.units*10n**6n,denominator=10n**BigInt(Number(asset.decimals))*price.scale;
 const cost=(numerator+denominator-1n)/denominator;
 if(policy){const values=portfolioValue(account,tokens);const checked=checkPolicy(cost,BigInt(account.cashMicros)-cost,(values.values.get(asset.underlyingTicker)??0n)+cost,values.total,policy);if(!checked.allowed)return {...base,status:"BLOCKED",reason:checked.reason,policy:"BLOCKED"};}
 const budget=checkPaperSpend(account,cost,policy??account.policy,now);if(!budget.allowed)return {...base,status:"BLOCKED",reason:budget.reason,policy:"BLOCKED"};
 const existing=account.positions.find(p=>p.address.toLowerCase()===asset.tokenContractAddress.toLowerCase());
 if(existing){existing.quantity=(BigInt(existing.quantity)+quantity).toString();existing.costMicros=(BigInt(existing.costMicros)+cost).toString();}
 else account.positions.push({ticker:asset.underlyingTicker,name:asset.underlyingName!,provider:asset.platformId,address:asset.tokenContractAddress,symbol:asset.tokenSymbol,decimals:Number(asset.decimals),ratio:asset.tokenToShareRatio,quantity:quantity.toString(),costMicros:cost.toString()});
 account.cashMicros=(BigInt(account.cashMicros)-cost).toString();recordPaperSpend(account,cost,now);
 return {...base,amountUsd:usd(cost),status:"PAPER_FILLED",policy:"ALLOWED",reason:"Paper fill at the live indicative token price. Fees and slippage excluded.",quantity:fromUnits(quantity,Number(asset.decimals)),priceUsd:asset.tokenPrice,tokenSymbol:asset.tokenSymbol,address:asset.tokenContractAddress,marketFetchedAt:fetchedAt};
}
export function buyWithPolicy(account:Account,asset:RwaToken|undefined,amount:bigint,fetchedAt:string,tokens:RwaToken[],policy?:Policy,now=Date.now()){
 return fillBuy(account,asset,amount,fetchedAt,policy,tokens,now);
}
export function fillSell(account:Account,address:string,tokens:RwaToken[],fetchedAt:string):Leg{
 const index=account.positions.findIndex(p=>p.address.toLowerCase()===address.toLowerCase());const p=account.positions[index];const asset=tokens.find(t=>t.tokenContractAddress.toLowerCase()===address.toLowerCase());
 if(p&&account.policy.priceMaxAgeSeconds!==undefined&&(!Number.isFinite(Date.parse(fetchedAt))||Date.parse(fetchedAt)>Date.now()||Date.now()-Date.parse(fetchedAt)>account.policy.priceMaxAgeSeconds*1000))return {ticker:p.ticker,provider:p.provider,amountUsd:'0',status:'BLOCKED',reason:'The indicative price exceeds your selected freshness limit.',policy:'BLOCKED'};
 if(!p||!asset||!asset.statusInfo.openState||moneyPrice(asset.tokenPrice)<=0n)return {ticker:p?.ticker??"Unknown",provider:p?.provider??null,amountUsd:"0",status:"BLOCKED",reason:"Live price and an available representation are required to close a paper position.",policy:"NOT_CHECKED"};
 const proceeds=valueMicros(BigInt(p.quantity),p.decimals,asset.tokenPrice);
 if(proceeds>money(account.policy.maxTradeUsd))return {ticker:p.ticker,provider:p.provider,amountUsd:usd(proceeds),status:"BLOCKED",reason:"Closing this paper position exceeds your maximum trade amount. Update your rules before closing it.",policy:"BLOCKED"};
 account.cashMicros=(BigInt(account.cashMicros)+proceeds).toString();account.positions.splice(index,1);
 return {ticker:p.ticker,provider:p.provider,amountUsd:usd(proceeds),quantity:fromUnits(BigInt(p.quantity),p.decimals),priceUsd:asset.tokenPrice,status:"PAPER_FILLED",reason:"Paper position closed at the live indicative price. Fees and slippage excluded.",policy:"ALLOWED",marketFetchedAt:fetchedAt,tokenSymbol:p.symbol,address:p.address};
}
export function basketPlan(bell:Flow,amount:bigint){return bell.assets.map(a=>({ticker:a.ticker,amount:amount*BigInt(a.weightBps)/10000n}));}
export function contributionPlan(bell:Flow,account:Account,tokens:RwaToken[],budget:bigint){
 const {total,values}=portfolioValue(account,tokens);
 const deficits=bell.assets.map(a=>({ticker:a.ticker,deficit:total*BigInt(a.weightBps)/10000n-(values.get(a.ticker)??0n)})).filter(a=>a.deficit>0n&&a.deficit*10000n>=total*BigInt(account.policy.driftBps));
 const sum=deficits.reduce((n,a)=>n+a.deficit,0n);if(sum===0n)return [];
 const available=BigInt(account.cashMicros)-total*BigInt(effectiveBellPolicy(bell,account.policy).minReserveBps)/10000n;
 const spend=budget<available?budget:available;if(spend<=0n)return [];
 return deficits.map(a=>({ticker:a.ticker,amount:spend*a.deficit/sum})).filter(a=>a.amount>0n);
}
export function runLegs(plan:{ticker:string;amount:bigint}[],fill:(ticker:string,amount:bigint)=>Leg){
 let stopped=false;return plan.map(item=>{if(stopped)return {ticker:item.ticker,provider:null,amountUsd:usd(item.amount),status:"NOT_STARTED",reason:"Stopped after an earlier paper leg failed or was blocked.",policy:"NOT_CHECKED"} satisfies Leg;let leg:Leg;try{leg=fill(item.ticker,item.amount);}catch{leg={ticker:item.ticker,provider:null,amountUsd:usd(item.amount),status:"FAILED",reason:"This paper leg could not be checked safely.",policy:"NOT_CHECKED"};}if(leg.status!=="PAPER_FILLED")stopped=true;return {...leg,ticker:item.ticker};});
}
