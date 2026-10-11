import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {AgenticStore,runAgenticContribution,reconcileAgenticRun,duePeriod,watPeriods,USDT,type AgenticDeps,type AgenticPlan} from '../lib/agents/agentic-autopilot.ts';
import {agenticArgs,parseOrder,parseLeftQuota,parseBscAddress} from '../lib/agents/agentic-cli.ts';
import type {AgenticCommand} from '../lib/agents/agentic-cli.ts';
type SwapCommand=Extract<AgenticCommand,{kind:'QUOTE'|'SWAP'}>;
import type {Flow,Policy} from '../lib/paper/model.ts';
import type {WalletSnapshot} from '../lib/execution/rules.ts';

const wallet='0x43b9beb18853487d48bcb863eeedf95597a1fe7c';
const NVDA='0x'+'a'.repeat(40),MSFT='0x'+'b'.repeat(40);
const policy:Policy={maxTradeUsd:'50',maxSingleAssetBps:10000,minReserveBps:0,driftBps:0};
const bell={id:'ai',title:'AI',description:'AI',assets:[{ticker:'NVDA',weightBps:5000},{ticker:'MSFT',weightBps:5000}],reserveBps:0,policy:{},version:1,contentHash:'hash',createdAt:new Date().toISOString()} as unknown as Flow;
const plan=(over:Partial<AgenticPlan>={}):AgenticPlan=>({id:'00000000-0000-4000-8000-000000000001',owner:'owner',bellId:'ai',bellVersion:1,bellHash:'hash',contributionUsd:'10',cadence:'DAILY',enabled:true,createdAt:'x',updatedAt:'x',...over});
const snap=(cash='20000000'):WalletSnapshot=>({wallet,chainId:56,blockNumber:'1',checkedAt:new Date().toISOString(),marketFetchedAt:new Date().toISOString(),bnb:'0.01',usdt:'20',cashMicros:cash,totalMicros:cash,exposures:{},positions:[]} as unknown as WalletSnapshot);
const ok=(data:unknown)=>JSON.stringify({success:true,data});
function fakeCli(over:{order?:string;swapThrows?:boolean;quota?:number;status?:string;address?:string}={}){
 const calls:AgenticCommand[]=[];
 const cli=async(c:AgenticCommand)=>{calls.push(c);switch(c.kind){
  case 'STATUS':return ok({status:over.status??'CONNECTED'});
  case 'ADDRESS':return ok({addresses:[{binanceChainId:'56',chainName:'BSC',address:over.address??wallet}]});
  case 'LEFT_QUOTA':return ok({quotaUsed:0,quotaLeft:over.quota??100,dailyLimit:100,date:'2026-10-10'});
  case 'QUOTE':return ok({fromCoinAmount:c.amount,toCoinAmount:'0.02'});
  case 'SWAP':if(over.swapThrows)throw Error('SWAP_OUTCOME_UNKNOWN');return ok({orderId:'ord-'+c.toToken.slice(2,4)});
  case 'ORDER':{const leg=calls.find((x):x is SwapCommand=>x.kind==='SWAP'&&('ord-'+x.toToken.slice(2,4))===c.orderId)!;return ok({list:[{orderId:c.orderId,status:over.order??'FINISHED',txHash:'0x'+'c'.repeat(64),fromToken:USDT,toToken:leg.toToken,fromTokenQty:leg.amount}]});}
  default:throw Error('unexpected command');
 }};
 return {cli,calls};
}
function deps(store:AgenticStore,cli:AgenticDeps['cli'],verify:AgenticDeps['verify']=async()=>({status:'CONFIRMED',receivedUnits:10n,spentUnits:5n,blockNumber:9n}),cash?:string):AgenticDeps{
 return {store,cli,snapshot:async()=>snap(cash),resolveToken:async t=>({address:t==='NVDA'?NVDA:MSFT,provider:'bstock'}),verify,sleep:async()=>{},now:()=>Date.now(),pollAttempts:3};
}
const input=(over:Partial<Parameters<typeof runAgenticContribution>[0]>={})=>({owner:'owner',plan:plan(),bell,policy,policyVersion:1,period:'D2026-10-10',trigger:'SCHEDULED' as const,wallet,operatorCapUsd:'5',...over});

test('agentic CLI arguments are fixed, documented and reject unsafe values',()=>{
 assert.deepEqual(agenticArgs({kind:'SWAP',fromToken:USDT,toToken:NVDA,amount:'5',slippage:'0.50'}),['market-order','swap','--fromTokenQty','5','--fromToken',USDT,'--toToken',NVDA,'--binanceChainId','56','--slippage','0.50','--mev','true','--json']);
 assert.throws(()=>agenticArgs({kind:'SWAP',fromToken:USDT,toToken:'0xbad;rm',amount:'5',slippage:'0.5'}));
 assert.throws(()=>agenticArgs({kind:'SWAP',fromToken:USDT,toToken:NVDA,amount:'5',slippage:'30'}));
 assert.throws(()=>agenticArgs({kind:'ORDER',orderId:'1 --x'}));
});

test('order status must match the exact order, token and amount',()=>{
 const row={orderId:'1',status:'FINISHED',txHash:'0x'+'c'.repeat(64),fromToken:USDT,toToken:NVDA,fromTokenQty:'5'};
 assert.equal(parseOrder(ok({list:[row]}),{orderId:'1',fromToken:USDT,toToken:NVDA,amount:'5'}).status,'FINISHED');
 assert.throws(()=>parseOrder(ok({list:[{...row,toToken:MSFT}]}),{orderId:'1',fromToken:USDT,toToken:NVDA,amount:'5'}));
 assert.throws(()=>parseOrder(ok({list:[{...row,fromTokenQty:'50'}]}),{orderId:'1',fromToken:USDT,toToken:NVDA,amount:'5'}));
 assert.throws(()=>parseOrder(ok({list:[]}),{orderId:'1',fromToken:USDT,toToken:NVDA,amount:'5'}));
 assert.equal(parseLeftQuota(ok({quotaUsed:3,quotaLeft:-1,dailyLimit:2,date:'d'})).left,0);
 assert.throws(()=>parseBscAddress(ok({addresses:[]})));
});

test('contribution run buys underweights through the wallet, capped per leg, and confirms onchain',async()=>{
 const store=new AgenticStore(new DatabaseSync(':memory:')),{cli,calls}=fakeCli();
 const {run}=await runAgenticContribution(input(),deps(store,cli));
 assert.equal(run.state,'COMPLETED');assert.equal(run.contributionUsd,'10');
 assert.deepEqual(run.legs.map(l=>[l.ticker,l.amountUsd,l.state]),[['NVDA','5','CONFIRMED'],['MSFT','5','CONFIRMED']]);
 assert.equal(calls.filter(c=>c.kind==='SWAP').length,2);
});

test('the same period never buys twice',async()=>{
 const store=new AgenticStore(new DatabaseSync(':memory:')),{cli,calls}=fakeCli();
 await runAgenticContribution(input(),deps(store,cli));const second=await runAgenticContribution(input(),deps(store,cli));
 assert.equal(second.created,false);assert.equal(calls.filter(c=>c.kind==='SWAP').length,2);
});

test('failure stops remaining legs and reports partial completion without reversing',async()=>{
 const store=new AgenticStore(new DatabaseSync(':memory:')),{cli,calls}=fakeCli();let n=0;
 const {run}=await runAgenticContribution(input(),deps(store,cli,async()=>(++n===1?{status:'CONFIRMED',receivedUnits:1n,spentUnits:1n,blockNumber:1n}:{status:'REVERTED',receivedUnits:0n,spentUnits:0n,blockNumber:2n})));
 assert.equal(run.state,'PARTIAL');assert.equal(calls.filter(c=>c.kind==='SWAP').length,2);
 const {run:stopped}=await runAgenticContribution(input({period:'D2'}),deps(new AgenticStore(new DatabaseSync(':memory:')),fakeCli({order:'FAILED'}).cli));
 assert.equal(stopped.state,'FAILED');assert.deepEqual(stopped.legs.map(l=>l.state),['FAILED','SKIPPED']);
});

test('ambiguous submission is never resent and pending orders reconcile later',async()=>{
 const store=new AgenticStore(new DatabaseSync(':memory:')),unknown=fakeCli({swapThrows:true});
 const {run}=await runAgenticContribution(input(),deps(store,unknown.cli));
 assert.equal(run.state,'PENDING');assert.equal(unknown.calls.filter(c=>c.kind==='SWAP').length,1);assert.equal(run.legs[1].state,'SKIPPED');
 const pendingStore=new AgenticStore(new DatabaseSync(':memory:')),pending=fakeCli({order:'PENDING'});
 const first=await runAgenticContribution(input(),deps(pendingStore,pending.cli));assert.equal(first.run.state,'PENDING');assert.equal(first.run.legs[0].state,'PENDING');
 const done=fakeCli();done.calls.push(...pending.calls);
 const reconciled=await reconcileAgenticRun('owner',first.run.key,deps(pendingStore,async c=>c.kind==='ORDER'?ok({list:[{orderId:c.orderId,status:'FINISHED',txHash:'0x'+'d'.repeat(64),fromToken:USDT,toToken:NVDA,fromTokenQty:'5'}]}):done.cli(c)));
 assert.equal(reconciled.legs[0].state,'CONFIRMED');assert.equal(done.calls.filter(c=>c.kind==='SWAP').length,pending.calls.filter(c=>c.kind==='SWAP').length);
});

test('limits skip safely: session, wallet mismatch, app quota, daily cap and cash',async()=>{
 const skipped=async(over:Parameters<typeof fakeCli>[0],extra:Partial<Parameters<typeof runAgenticContribution>[0]>={},cash?:string)=>{const f=fakeCli(over);const {run}=await runAgenticContribution(input(extra),deps(new AgenticStore(new DatabaseSync(':memory:')),f.cli,undefined,cash));assert.equal(run.state,'SKIPPED');assert.equal(f.calls.filter(c=>c.kind==='SWAP').length,0);return run;};
 await skipped({status:'UNCONNECTED'});await skipped({address:'0x'+'9'.repeat(40)});await skipped({quota:0.2});
 await skipped({},{policy:{...policy,maxDailySpendUsd:'0'}});await skipped({},{},'200000');
 const store=new AgenticStore(new DatabaseSync(':memory:'));const f=fakeCli({quota:6});const {run}=await runAgenticContribution(input(),deps(store,f.cli));
 assert.equal(run.contributionUsd,'6');
});

test('optional daily ceiling bounds Autopilot across runs on the same day',async()=>{
 const store=new AgenticStore(new DatabaseSync(':memory:'));
 const first=await runAgenticContribution(input({dailyCapUsd:'0.5'}),deps(store,fakeCli({quota:6}).cli));
 assert.equal(first.run.contributionUsd,'0.5');
 const f=fakeCli({quota:6});const second=await runAgenticContribution(input({dailyCapUsd:'0.5',period:'M2026-10-10-2',trigger:'MANUAL'}),deps(store,f.cli));
 assert.equal(second.run.state,'SKIPPED');assert.equal(f.calls.filter(c=>c.kind==='SWAP').length,0);
});

test('schedule is due once per WAT day or Monday after 09:00',()=>{
 const monday10=Date.parse('2026-10-12T09:30:00Z'),monday07=Date.parse('2026-10-12T07:30:00Z'),tuesday=Date.parse('2026-10-13T12:00:00Z');
 assert.equal(duePeriod(plan(),monday10),'D2026-10-12');assert.equal(duePeriod(plan(),monday07),undefined);
 assert.equal(duePeriod(plan({cadence:'WEEKLY'}),monday10),'W2026-10-12');assert.equal(duePeriod(plan({cadence:'WEEKLY'}),tuesday),undefined);
 assert.equal(watPeriods(monday10).weekday,0);
});
