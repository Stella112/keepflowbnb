import {bellInputSchema,policySchema,type Flow,type Policy} from '../paper/model.ts';
import type {WalletSnapshot} from './rules.ts';
import {effectiveBellPolicy} from './rules.ts';
import {toUnits,fromUnits} from '../binance/amounts.ts';
export function existingCashAutomationPlan(snapshot:WalletSnapshot,bell:Flow,personal:Policy,maxRunUsd:string,now=Date.now()){
 bellInputSchema.parse({title:bell.title,description:bell.description,assets:bell.assets,reserveBps:bell.reserveBps,policy:bell.policy});policySchema.parse(personal);
 const checked=(value:string)=>{if(!/^\d+$/.test(value))throw Error('INVALID_ACTUAL_VALUE');return BigInt(value);},cash=checked(snapshot.cashMicros),total=checked(snapshot.totalMicros),exposures=new Map(Object.entries(snapshot.exposures).map(([ticker,value])=>[ticker,checked(value)])),policy=effectiveBellPolicy(bell,personal);
 if(snapshot.chainId!==56||cash+[...exposures.values()].reduce((sum,value)=>sum+value,0n)!==total)throw Error('INVALID_ACTUAL_TOTAL');
 for(const timestamp of [snapshot.checkedAt,snapshot.marketFetchedAt]){const time=Date.parse(timestamp);if(!Number.isFinite(now)||!Number.isFinite(time)||time>now||now-time>(policy.priceMaxAgeSeconds??60)*1000)throw Error('ACTUAL_VALUES_STALE');}
 const reserve=(total*BigInt(policy.minReserveBps)+9999n)/10000n;let available=cash>reserve?cash-reserve:0n;for(const cap of [maxRunUsd,policy.maxDailySpendUsd,policy.maxWeeklySpendUsd])if(cap!==undefined&&available>toUnits(cap,6))available=toUnits(cap,6);
 const result:{ticker:Flow['assets'][number]['ticker'];amount:string}[]=[];
 const assets=bell.assets.map(asset=>({...asset,current:exposures.get(asset.ticker)??0n,target:total*BigInt(asset.weightBps)/10000n})).sort((a,b)=>{const left=a.target-a.current,right=b.target-b.current;return left===right?a.ticker.localeCompare(b.ticker):left>right?-1:1;});
 for(const asset of assets){if(asset.weightBps>policy.maxSingleAssetBps||asset.target<=asset.current||(asset.target-asset.current)*10000n<=total*BigInt(policy.driftBps))continue;let amount=asset.target-asset.current;for(const bound of [available,toUnits(policy.maxTradeUsd,6),25_000_000n,total*BigInt(policy.maxSingleAssetBps)/10000n-asset.current])if(amount>bound)amount=bound;if(amount<=0n)continue;result.push({ticker:asset.ticker,amount:fromUnits(amount,6)});available-=amount;}
 return {allocations:result,financialAuthorization:'NONE' as const,budgetAvailability:'UNVERIFIED' as const,currentCashUsd:fromUnits(cash,6),minimumReserveUsd:fromUnits(reserve,6)};
}
