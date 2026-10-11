import type {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import {toUnits,fromUnits} from '../binance/amounts.ts';
import {effectiveBellPolicy,type WalletSnapshot} from '../execution/rules.ts';
import {walletContributionPlan} from '../planning/wallet-contribution.ts';
import type {Flow,Policy} from '../paper/model.ts';
import {parseBscAddress,parseLeftQuota,parseOrder,parseQuote,parseStatus,parseSwap,type AgenticRunner} from './agentic-cli.ts';

export const USDT='0x55d398326f99059fF775485246999027B3197955';
const MIN_LEG_MICROS=250_000n;

export const agenticPlanSchema=z.object({
 id:z.string().uuid(),owner:z.string().min(1).max(128),bellId:z.string().min(1).max(80),bellVersion:z.number().int().positive(),bellHash:z.string().min(1).max(128),
 contributionUsd:z.string().regex(/^\d+(\.\d{1,6})?$/).max(16),cadence:z.enum(['DAILY','WEEKLY']),enabled:z.boolean(),createdAt:z.string(),updatedAt:z.string(),
}).strict();
export type AgenticPlan=z.infer<typeof agenticPlanSchema>;
export type LegState='PLANNED'|'SUBMITTING'|'PENDING'|'CONFIRMED'|'FAILED'|'SKIPPED'|'UNKNOWN';
export type AgenticLeg={ticker:string;provider:string|null;token:string|null;amountUsd:string;state:LegState;reason:string;quotedReceive?:string;orderId?:string;txHash?:string;receivedUnits?:string;spentUnits?:string;blockNumber?:string};
export type RunState='RUNNING'|'COMPLETED'|'PARTIAL'|'FAILED'|'SKIPPED'|'PENDING';
export type AgenticRun={key:string;planId:string;owner:string;period:string;trigger:'SCHEDULED'|'MANUAL';state:RunState;reason:string;wallet:string;bell:{id:string;version:number;contentHash:string};policyVersion:number;policySnapshot:Policy;contributionUsd:string;legs:AgenticLeg[];createdAt:string;updatedAt:string};

export class AgenticStore{
 private db:DatabaseSync;
 constructor(db:DatabaseSync){
  this.db=db;
  db.exec('CREATE TABLE IF NOT EXISTS agentic_plans(owner TEXT PRIMARY KEY,payload TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS agentic_runs(key TEXT PRIMARY KEY,owner TEXT NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL)');
 }
 readPlan(owner:string){const row=this.db.prepare('SELECT payload FROM agentic_plans WHERE owner=?').get(owner);return row?agenticPlanSchema.parse(JSON.parse(String(row.payload))):undefined;}
 savePlan(plan:AgenticPlan){const value=agenticPlanSchema.parse(plan);this.db.prepare('INSERT INTO agentic_plans(owner,payload) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET payload=excluded.payload').run(value.owner,JSON.stringify(value));return value;}
 plans(){return this.db.prepare('SELECT payload FROM agentic_plans').all().map(row=>agenticPlanSchema.parse(JSON.parse(String(row.payload))));}
 /** Durable once-only admission; the primary key is the idempotency key. */
 begin(run:AgenticRun){return this.db.prepare('INSERT OR IGNORE INTO agentic_runs(key,owner,created_at,payload) VALUES(?,?,?,?)').run(run.key,run.owner,run.createdAt,JSON.stringify(run)).changes===1;}
 read(owner:string,key:string){const row=this.db.prepare('SELECT payload FROM agentic_runs WHERE owner=? AND key=?').get(owner,key);return row?JSON.parse(String(row.payload)) as AgenticRun:undefined;}
 update(run:AgenticRun){run.updatedAt=new Date().toISOString();this.db.prepare('UPDATE agentic_runs SET payload=? WHERE key=? AND owner=?').run(JSON.stringify(run),run.key,run.owner);}
 list(owner:string,limit=30){return this.db.prepare('SELECT payload FROM agentic_runs WHERE owner=? ORDER BY created_at DESC LIMIT ?').all(owner,Math.max(1,Math.min(100,limit))).map(row=>JSON.parse(String(row.payload)) as AgenticRun);}
 /** Spend that may have left the wallet: confirmed, in flight or ambiguous legs. */
 committedSince(owner:string,sinceIso:string){
  let total=0n;for(const run of this.db.prepare('SELECT payload FROM agentic_runs WHERE owner=? AND created_at>=?').all(owner,sinceIso).map(row=>JSON.parse(String(row.payload)) as AgenticRun))
   for(const leg of run.legs)if(['CONFIRMED','PENDING','SUBMITTING','UNKNOWN'].includes(leg.state))total+=toUnits(leg.amountUsd,6);
  return total;
 }
}

/** WAT (UTC+1) calendar day and Monday-start week boundaries, matching personal spend caps. */
export function watPeriods(now:number){
 const wat=new Date(now+3_600_000),day=wat.toISOString().slice(0,10),dayStart=new Date(Date.parse(day+'T00:00:00Z')-3_600_000);
 const weekday=(wat.getUTCDay()+6)%7,weekStart=new Date(dayStart.getTime()-weekday*86_400_000);
 return {day,dayStart:dayStart.toISOString(),week:new Date(weekStart.getTime()+3_600_000).toISOString().slice(0,10),weekStart:weekStart.toISOString(),watHour:wat.getUTCHours(),weekday};
}
export function duePeriod(plan:AgenticPlan,now:number){const p=watPeriods(now);if(p.watHour<9)return undefined;if(plan.cadence==='DAILY')return 'D'+p.day;return p.weekday===0?'W'+p.week:undefined;}
export const runKey=(owner:string,bellId:string,policyVersion:number,period:string)=>`${owner}:${bellId}:${policyVersion}:${period}`;

export type ResolvedToken={address:string;provider:string};
export type ChainVerification={status:'CONFIRMED'|'REVERTED'|'PENDING';receivedUnits:bigint;spentUnits:bigint;blockNumber:bigint};
export type AgenticDeps={
 store:AgenticStore;cli:AgenticRunner;snapshot:(wallet:string)=>Promise<WalletSnapshot>;resolveToken:(ticker:string)=>Promise<ResolvedToken|undefined>;
 verify:(hash:string,wallet:string,token:string)=>Promise<ChainVerification>;sleep:(ms:number)=>Promise<void>;now:()=>number;pollAttempts?:number;
};
export type AgenticRunInput={owner:string;plan:AgenticPlan;bell:Flow;policy:Policy;policyVersion:number;period:string;trigger:'SCHEDULED'|'MANUAL';wallet:string;operatorCapUsd:string;dailyCapUsd?:string};

const minBig=(...v:bigint[])=>v.reduce((a,b)=>a<b?a:b);
function finish(run:AgenticRun){
 for(const leg of run.legs)if(leg.state==='PLANNED'){leg.state='SKIPPED';leg.reason='Stopped because an earlier purchase did not complete.';}
 const states=run.legs.map(l=>l.state),confirmed=states.filter(s=>s==='CONFIRMED').length;
 if(states.some(s=>s==='PENDING'||s==='UNKNOWN'||s==='SUBMITTING')){run.state='PENDING';run.reason='A purchase is still settling. It will not be resent; check its status again.';}
 else if(states.some(s=>s==='FAILED')){run.state=confirmed?'PARTIAL':'FAILED';run.reason=confirmed?'Some purchases completed, then one failed. Remaining purchases were stopped and nothing was reversed.':'The purchase failed. Remaining purchases were stopped.';}
 else if(confirmed){run.state='COMPLETED';run.reason=`${confirmed} purchase${confirmed===1?'':'s'} confirmed onchain.`;}
 else {run.state='SKIPPED';if(!run.reason||run.reason==='Starting.')run.reason='No purchase was needed or allowed under your rules.';}
 return run;
}

/** One contribution run executed through the operator's Binance Agentic Wallet.
 * KeepFlow decides what to buy under deterministic rules; the wallet's own app limits apply on top.
 * A submitted order is never resent automatically. */
export async function runAgenticContribution(input:AgenticRunInput,deps:AgenticDeps):Promise<{created:boolean;run:AgenticRun}>{
 const now=deps.now(),key=runKey(input.owner,input.bell.id,input.policyVersion,input.period),wallet=input.wallet.toLowerCase();
 const run:AgenticRun={key,planId:input.plan.id,owner:input.owner,period:input.period,trigger:input.trigger,state:'RUNNING',reason:'Starting.',wallet,bell:{id:input.bell.id,version:input.bell.version,contentHash:input.bell.contentHash},policyVersion:input.policyVersion,policySnapshot:structuredClone(input.policy),contributionUsd:'0',legs:[],createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString()};
 if(!deps.store.begin(run))return {created:false,run:deps.store.read(input.owner,key)!};
 const skip=(reason:string)=>{run.reason=reason;deps.store.update(finish(run));return {created:true,run};};
 try{
  if(parseStatus(await deps.cli({kind:'STATUS'}))!=='CONNECTED')return skip('The Agentic Wallet session is not connected. Sign in again from the Binance app.');
  if(parseBscAddress(await deps.cli({kind:'ADDRESS'}))!==wallet)return skip('The connected Agentic Wallet does not match the configured operator wallet.');
  const effective=effectiveBellPolicy(input.bell,input.policy),periods=watPeriods(now);
  let contribution=toUnits(input.plan.contributionUsd,6);
  // Optional operator ceiling on Autopilot's total per WAT day, whatever the plan amount or number of manual runs.
  if(input.dailyCapUsd!==undefined){const left=toUnits(input.dailyCapUsd,6)-deps.store.committedSince(input.owner,periods.dayStart);contribution=minBig(contribution,left>0n?left:0n);}
  if(effective.maxDailySpendUsd!==undefined){const left=toUnits(effective.maxDailySpendUsd,6)-deps.store.committedSince(input.owner,periods.dayStart);contribution=minBig(contribution,left>0n?left:0n);}
  if(effective.maxWeeklySpendUsd!==undefined){const left=toUnits(effective.maxWeeklySpendUsd,6)-deps.store.committedSince(input.owner,periods.weekStart);contribution=minBig(contribution,left>0n?left:0n);}
  if(contribution<MIN_LEG_MICROS)return skip('Your daily or weekly spending limit has been reached.');
  const quota=parseLeftQuota(await deps.cli({kind:'LEFT_QUOTA'}));
  contribution=minBig(contribution,toUnits(quota.left.toFixed(6),6));
  if(contribution<MIN_LEG_MICROS)return skip(`The daily limit set in the Binance app is used up (${quota.used} of ${quota.dailyLimit}).`);
  const snapshot=await deps.snapshot(wallet);if(snapshot.wallet.toLowerCase()!==wallet)throw Error('SNAPSHOT_WALLET_MISMATCH');
  const cash=BigInt(snapshot.cashMicros),total=BigInt(snapshot.totalMicros);contribution=minBig(contribution,cash);
  if(contribution<MIN_LEG_MICROS)return skip('The Agentic Wallet does not hold enough USDT for this contribution.');
  run.contributionUsd=fromUnits(contribution,6);
  const adjusted:WalletSnapshot={...snapshot,cashMicros:(cash-contribution).toString(),totalMicros:(total-contribution).toString()};
  const cap=toUnits(input.operatorCapUsd,6),planningPolicy:Policy={...input.policy,maxTradeUsd:fromUnits(minBig(toUnits(input.policy.maxTradeUsd,6),cap),6)};
  const plan=walletContributionPlan(adjusted,input.bell,planningPolicy,run.contributionUsd,deps.now());
  for(const asset of plan.assets){const proposed=toUnits(asset.proposedPurchaseUsd,6);if(proposed<=0n)continue;const amount=minBig(proposed,cap);
   run.legs.push({ticker:asset.ticker,provider:null,token:null,amountUsd:fromUnits(amount,6),state:amount<MIN_LEG_MICROS?'SKIPPED':'PLANNED',reason:amount<MIN_LEG_MICROS?'Below the 0.25 USDT minimum purchase.':asset.reason});}
  deps.store.update(run);
  for(const leg of run.legs){
   if(leg.state!=='PLANNED')continue;
   const token=await deps.resolveToken(leg.ticker);if(!token){leg.state='SKIPPED';leg.reason='No open, verified BSC listing is available right now.';deps.store.update(run);continue;}
   leg.token=token.address;leg.provider=token.provider;
   const order={fromToken:USDT,toToken:token.address,amount:leg.amountUsd,slippage:((effective.maxSlippageBps??50)/100).toFixed(2)};
   const quote=parseQuote(await deps.cli({kind:'QUOTE',...order}));
   if(!(Number(quote.toCoinAmount)>0)){leg.state='FAILED';leg.reason='No executable quote was returned.';break;}
   leg.quotedReceive=quote.toCoinAmount;leg.state='SUBMITTING';leg.reason='Submitting to the Agentic Wallet.';deps.store.update(run);
   let orderId:string;
   try{orderId=parseSwap(await deps.cli({kind:'SWAP',...order})).orderId;}
   catch{leg.state='UNKNOWN';leg.reason='The wallet did not confirm whether the order was placed. It will not be resent; check the Binance app.';break;}
   leg.orderId=orderId;leg.state='PENDING';leg.reason='Order placed; waiting for it to finish onchain.';deps.store.update(run);
   const settled=await settleLeg(leg,wallet,deps);deps.store.update(run);if(!settled)break;
  }
  deps.store.update(finish(run));return {created:true,run};
 }catch{
  if(run.legs.some(l=>['SUBMITTING','PENDING','UNKNOWN','CONFIRMED'].includes(l.state))){deps.store.update(finish(run));return {created:true,run};}
  return skip('The wallet, prices or plan could not be verified, so nothing was bought.');
 }
}

/** Poll the documented order status to a terminal state, then verify the transaction onchain. */
async function settleLeg(leg:AgenticLeg,wallet:string,deps:AgenticDeps){
 const attempts=deps.pollAttempts??20;
 for(let i=0;i<attempts;i++){
  let status:{status:'PENDING'|'FINISHED'|'FAILED';txHash:string|null};
  try{status=parseOrder(await deps.cli({kind:'ORDER',orderId:leg.orderId!}),{orderId:leg.orderId!,fromToken:USDT,toToken:leg.token!,amount:leg.amountUsd});}catch{await deps.sleep(3000);continue;}
  if(status.status==='FAILED'){leg.state='FAILED';leg.reason='The wallet reported the order failed.';if(status.txHash)leg.txHash=status.txHash;return false;}
  if(status.status==='FINISHED'&&status.txHash){
   leg.txHash=status.txHash;const chain=await deps.verify(status.txHash,wallet,leg.token!);
   if(chain.status==='PENDING'){leg.reason='Finished in the wallet; waiting for onchain confirmations.';return false;}
   if(chain.status==='REVERTED'||chain.receivedUnits<=0n){leg.state='FAILED';leg.reason='The transaction did not deliver stock tokens to the wallet.';return false;}
   leg.state='CONFIRMED';leg.receivedUnits=chain.receivedUnits.toString();leg.spentUnits=chain.spentUnits.toString();leg.blockNumber=chain.blockNumber.toString();leg.reason='Confirmed onchain.';return true;
  }
  await deps.sleep(3000);
 }
 leg.reason='Still processing. It will not be resent; check its status again shortly.';return false;
}

/** Re-check legs left PENDING without placing any new order. */
export async function reconcileAgenticRun(owner:string,key:string,deps:AgenticDeps){
 const run=deps.store.read(owner,key);if(!run)throw Error('NOT_FOUND');
 for(const leg of run.legs)if(leg.state==='PENDING'&&leg.orderId&&leg.token)await settleLeg(leg,run.wallet,{...deps,pollAttempts:1});
 deps.store.update(finish(run));return run;
}
