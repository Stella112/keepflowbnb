import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultPolicy} from '../lib/paper/model.ts';
import {draftPersonalPolicy} from '../lib/paper/policy-draft.ts';
test('period budget drafts preserve exact units and allow an explicit purchase pause',()=>{const draft=draftPersonalPolicy('max daily spend 0 USD, max weekly spend 10000.000000 USDT',defaultPolicy);assert.equal(draft.policy.maxDailySpendUsd,'0');assert.equal(draft.policy.maxWeeklySpendUsd,'10000.000000');assert.equal(draft.saved,false);for(const prompt of ['max daily spend 10000.000001 USD','max weekly spend -1 USD','max daily spend 1.0000001 USD','max daily spend 5 USD and max daily spend 6 USD'])assert.throws(()=>draftPersonalPolicy(prompt,defaultPolicy));});
test('explicit clauses merge deterministically without changing the supplied policy or granting authority',()=>{
 const current={...defaultPolicy},before=JSON.stringify(current),draft=draftPersonalPolicy('max trade 12.123456 USD, cap one stock at 25.50%; reserve 15% and max slippage 20 bps; max quote age 5 seconds; max price age 10 seconds',current);
 assert.equal(draft.policy.maxTradeUsd,'12.123456');assert.equal(draft.policy.maxSingleAssetBps,2550);assert.equal(draft.policy.minReserveBps,1500);assert.equal(draft.policy.driftBps,current.driftBps);assert.equal(draft.explicitFields.length,6);assert.equal(draft.saved,false);assert.equal(draft.authorization,'NONE');assert.equal(JSON.stringify(current),before);
});
test('unknown, ambiguous, automatic selling and money movement clauses fail closed',()=>{
 for(const prompt of ['buy NVIDIA','transfer 20 USDT','max trade 20 USD and sell automatically','max trade 20 USD, max trade 10 USD','max trade 20 USD, invest the rest','reserve ten percent','daily budget 100 USD','max trade 20 USD,','max slippage 1.5 bps'])assert.throws(()=>draftPersonalPolicy(prompt,defaultPolicy));
});
test('bounds reject zero, excessive money, fractional percentages and unsupported freshness',()=>{
 for(const prompt of ['max trade 0 USD','max trade 1001 USD','reserve 91%','cap one stock at 0%','reserve 10.001%','max quote age 61 seconds','max price age 301 seconds','max slippage 501 bps'])assert.throws(()=>draftPersonalPolicy(prompt,defaultPolicy));
});
