import {toUnits,fromUnits} from '../binance/amounts.ts';
import {bellInputSchema,policySchema,type Flow,type Policy} from '../paper/model.ts';
import {effectiveBellPolicy,type WalletSnapshot} from '../execution/rules.ts';
const units=(value:string)=>{if(!/^\d+$/.test(value))throw Error('Invalid tracked wallet value.');return BigInt(value);};
const min=(...values:bigint[])=>values.reduce((a,b)=>a<b?a:b);
export function walletContributionPlan(snapshot:WalletSnapshot,bell:Flow,personal:Policy,contributionUsd:string,now=Date.now()){
 bellInputSchema.parse(({title:bell.title,description:bell.description,assets:bell.assets,reserveBps:bell.reserveBps,policy:bell.policy}));policySchema.parse(personal);
 if(!/^\d+(\.\d{1,6})?$/.test(contributionUsd)||contributionUsd.length>16)throw Error('Invalid hypothetical contribution.');
 const contribution=toUnits(contributionUsd,6);if(contribution<0n||contribution>10_000_000_000n)throw Error('Use a hypothetical contribution up to 10000 USDT.');
 if(snapshot.chainId!==56||!/^0x[0-9a-fA-F]{40}$/.test(snapshot.wallet)||!/^\d+$/.test(snapshot.blockNumber))throw Error('Invalid wallet provenance.');
 const effective=effectiveBellPolicy(bell,personal),cash=units(snapshot.cashMicros),total=units(snapshot.totalMicros),values=new Map(Object.entries(snapshot.exposures).map(([ticker,value])=>[ticker,units(value)]));
 if(cash+[...values.values()].reduce((a,b)=>a+b,0n)!==total)throw Error('Tracked wallet totals are inconsistent.');
 const freshness=effective.priceMaxAgeSeconds??60;
 for(const timestamp of [snapshot.checkedAt,snapshot.marketFetchedAt]){const time=Date.parse(timestamp);if(!Number.isFinite(now)||!Number.isFinite(time)||time>now||now-time>freshness*1000)throw Error('Wallet or indicative prices are stale. Refresh the plan.');}
 const projectedTotal=total+contribution;if(projectedTotal<=0n)throw Error('Positive tracked value or hypothetical contribution required.');
 const reserve=(projectedTotal*BigInt(effective.minReserveBps)+9999n)/10000n;
 let available=min(contribution,cash+contribution>reserve?cash+contribution-reserve:0n,...[effective.maxDailySpendUsd,effective.maxWeeklySpendUsd].filter((cap):cap is string=>cap!==undefined).map(cap=>toUnits(cap,6))),spent=0n;
 const tickers=[...new Set([...bell.assets.map(a=>a.ticker),...values.keys()])];
 const assets=tickers.map(ticker=>{const targetBps=bell.assets.find(a=>a.ticker===ticker)?.weightBps??0,current=values.get(ticker)??0n,target=projectedTotal*BigInt(targetBps)/10000n;return {ticker,targetBps,current,target,deficit:target>current?target-current:0n,amount:0n,reason:'No contribution purchase needed.'};});
 for(const asset of [...assets].sort((a,b)=>a.deficit===b.deficit?a.ticker.localeCompare(b.ticker):a.deficit>b.deficit?-1:1)){
  if(asset.targetBps>effective.maxSingleAssetBps){asset.reason='Flow target exceeds effective single-company cap.';continue;}
  if(asset.deficit*10000n<=projectedTotal*BigInt(effective.driftBps)){asset.reason='Underweight is within the effective drift threshold; no selling is proposed.';continue;}
  const exposureRoom=projectedTotal*BigInt(effective.maxSingleAssetBps)/10000n-asset.current;
  asset.amount=min(asset.deficit,available,toUnits(effective.maxTradeUsd,6),exposureRoom>0n?exposureRoom:0n);
  available-=asset.amount;spent+=asset.amount;asset.reason=asset.amount>0n?'Hypothetical contribution allocated under trade, reserve and exposure caps.':'No room under contribution, trade, reserve or exposure caps.';
 }
 return {mode:'READ_ONLY' as const,executionEnabled:false as const,financialAuthorization:'NONE' as const,bell:{id:bell.id,title:bell.title,version:bell.version,contentHash:bell.contentHash},wallet:snapshot.wallet,provenance:{chainId:56 as const,blockNumber:snapshot.blockNumber,checkedAt:snapshot.checkedAt,marketFetchedAt:snapshot.marketFetchedAt,scope:snapshot.scope},personalPolicy:structuredClone(personal),effectivePolicy:effective,hypotheticalContributionUsd:fromUnits(contribution,6),currentTotalUsd:fromUnits(total,6),currentCashUsd:fromUnits(cash,6),projectedTotalUsd:fromUnits(projectedTotal,6),projectedCashUsd:fromUnits(cash+contribution-spent,6),minimumReserveUsd:fromUnits(reserve,6),projectedReserveShortfallUsd:fromUnits(reserve>cash+contribution-spent?reserve-(cash+contribution-spent):0n,6),unallocatedContributionUsd:fromUnits(contribution-spent,6),budgetAvailability:'UNVERIFIED' as const,assets:assets.map(a=>({ticker:a.ticker,targetBps:a.targetBps,currentValueUsd:fromUnits(a.current,6),currentBps:total>0n?Number(a.current*10000n/total):null,projectedBps:Number((a.current+a.amount)*10000n/projectedTotal),driftBps:Number(a.current*10000n/projectedTotal)-a.targetBps,proposedPurchaseUsd:fromUnits(a.amount,6),reason:a.reason})),limitations:['Hypothetical new USDT has not been deposited; this plan cannot spend it.','Only the tracked curated companies and USDT are valued; prices are indicative, not executable quotes.','Existing holdings are never sold. Fees, slippage, issuer availability and quote simulation still require separate verification.','Configured daily/weekly ceilings bound total proposed purchases, but live usage and reservations are not wired; remaining spending availability is unverified.','Any projected reserve shortfall remains unresolved; this calculation does not certify policy readiness or authorize execution.','No wallet permission, signing, scheduling, balance mutation or execution is authorized.']};
}
