import {test} from 'node:test';
import assert from 'node:assert/strict';
import {walletContributionPlan} from '../lib/planning/wallet-contribution.ts';
import {defaultPolicy,type Flow} from '../lib/paper/model.ts';
import type {WalletSnapshot} from '../lib/execution/rules.ts';
const now=Date.parse('2026-10-09T12:00:00Z');
const bell:Flow={id:'b',title:'Plan',description:'',assets:[{ticker:'NVDA',weightBps:4500},{ticker:'MSFT',weightBps:4500}],reserveBps:1000,version:2,contentHash:'hash',createdAt:new Date(now).toISOString(),example:false};
const snapshot:WalletSnapshot={wallet:'0x'+'1'.repeat(40),chainId:56,blockNumber:'42',checkedAt:new Date(now).toISOString(),marketFetchedAt:new Date(now).toISOString(),bnb:'1',usdt:'10',cashMicros:'10000000',totalMicros:'100000000',exposures:{NVDA:'70000000',MSFT:'20000000'},positions:[],scope:'Curated tracked assets only'};
test('real holdings contribution targets underweight without selling or mutating input',()=>{
 const original=JSON.stringify({snapshot,bell,defaultPolicy});const plan=walletContributionPlan(snapshot,bell,{...defaultPolicy,maxSingleAssetBps:5000},'20',now);
 assert.equal(plan.assets.find(a=>a.ticker==='NVDA')?.proposedPurchaseUsd,'0');assert.equal(plan.assets.find(a=>a.ticker==='MSFT')?.proposedPurchaseUsd,'18');assert.equal(plan.projectedCashUsd,'12');assert.equal(plan.unallocatedContributionUsd,'2');assert.equal(plan.provenance.blockNumber,'42');assert.equal(plan.budgetAvailability,'UNVERIFIED');assert.equal(plan.executionEnabled,false);assert.equal(JSON.stringify({snapshot,bell,defaultPolicy}),original);
});
test('stricter Flow trade reserve exposure controls and exact micro-dollar remainder apply',()=>{
 const plan=walletContributionPlan(snapshot,{...bell,policy:{maxTradeUsd:'1.000001',minReserveBps:2000,maxSingleAssetBps:4000}},{...defaultPolicy,maxSingleAssetBps:5000},'20',now);
 assert.equal(plan.assets.every(a=>a.proposedPurchaseUsd==='0'),true);assert.match(plan.assets[1].reason,/target exceeds/);
 const capped=walletContributionPlan(snapshot,{...bell,policy:{maxTradeUsd:'1.000001',minReserveBps:2000}},{...defaultPolicy,maxSingleAssetBps:5000},'20',now);
 assert.equal(capped.assets.find(a=>a.ticker==='MSFT')?.proposedPurchaseUsd,'1.000001');assert.equal(capped.projectedCashUsd,'28.999999');assert.equal(capped.unallocatedContributionUsd,'18.999999');
});
test('untracked targets, zero-value account and rounding cannot spend existing cash',()=>{
 const zero={...snapshot,cashMicros:'0',totalMicros:'0',exposures:{}};
 const plan=walletContributionPlan(zero,bell,{...defaultPolicy,maxSingleAssetBps:5000,driftBps:0},'0.000003',now);
 assert.equal(plan.assets.reduce((sum,a)=>sum+Number(a.proposedPurchaseUsd),0)<=0.000003,true);assert.equal(plan.projectedCashUsd,'0.000001');
 const existing=walletContributionPlan({...snapshot,cashMicros:'100000000',totalMicros:'100000000',exposures:{}},bell,{...defaultPolicy,maxSingleAssetBps:5000},'0',now);assert.equal(existing.assets.every(a=>a.proposedPurchaseUsd==='0'),true);
 assert.throws(()=>walletContributionPlan(zero,bell,defaultPolicy,'0',now),/Positive/);
});
test('invalid inconsistent stale and future snapshots fail closed',()=>{
 for(const changed of [{totalMicros:'1'},{cashMicros:'-1'},{chainId:1},{marketFetchedAt:new Date(now-60001).toISOString()},{checkedAt:new Date(now+1).toISOString()}])assert.throws(()=>walletContributionPlan({...snapshot,...changed} as WalletSnapshot,bell,defaultPolicy,'20',now));
 for(const amount of ['-1','10000.000001','0.0000001'])assert.throws(()=>walletContributionPlan(snapshot,bell,defaultPolicy,amount,now));
});
test('known daily and weekly ceilings bound cumulative proposals without claiming remaining budget',()=>{
 for(const policy of [{maxDailySpendUsd:'2',maxWeeklySpendUsd:'3'},{maxDailySpendUsd:'3',maxWeeklySpendUsd:'2'},{maxDailySpendUsd:'0'}]){
  const result=walletContributionPlan(snapshot,bell,{...defaultPolicy,maxSingleAssetBps:5000,...policy},'20',now);
  assert.equal(result.assets.find(a=>a.ticker==='MSFT')?.proposedPurchaseUsd,policy.maxDailySpendUsd==='0'?'0':'2');assert.equal(result.budgetAvailability,'UNVERIFIED');
 }
 const deficient=walletContributionPlan({...snapshot,cashMicros:'0',totalMicros:'90000000'},bell,{...defaultPolicy,maxSingleAssetBps:5000,minReserveBps:9000},'1',now);
 assert.equal(deficient.assets.every(a=>a.proposedPurchaseUsd==='0'),true);assert.equal(deficient.projectedCashUsd,'1');assert.equal(deficient.projectedReserveShortfallUsd,'80.9');
});
