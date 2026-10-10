import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkStrategyAdoption,strategyDiff,StrategyVersionConflict} from '../lib/paper/strategy-adoption.ts';
import {defaultPolicy,type Flow,type AutopilotPlan} from '../lib/paper/model.ts';
const before:Flow={id:'bell',title:'Test',description:'',assets:[{ticker:'NVDA',weightBps:3000},{ticker:'MSFT',weightBps:6000}],reserveBps:1000,version:1,contentHash:'before',createdAt:'2026-10-09T00:00:00Z',example:false};
const after:Flow={...before,version:2,contentHash:'after',assets:[{ticker:'NVDA',weightBps:3000},{ticker:'AAPL',weightBps:3000},{ticker:'MSFT',weightBps:3000}]};
const plan:AutopilotPlan={id:'plan',bell:before,contributionUsd:'20',cadence:'WEEKLY',weekday:5,maxTradeUsd:'10',enabled:true,nextRunAt:'2026-10-16T08:00:00Z',createdAt:'2026-10-09T00:00:00Z'};
const expected={expectedPlanId:'plan',expectedBellId:'bell',expectedPinnedVersion:1,expectedCurrentVersion:2};
test('adoption fences old pinned versions, creator races and different strategies before any mutation',()=>{
 const snapshot=JSON.stringify({plan,after,defaultPolicy});
 for(const input of [{...expected,expectedPinnedVersion:0},{...expected,expectedCurrentVersion:3},{...expected,expectedBellId:'other'}])assert.throws(()=>checkStrategyAdoption(plan,after,defaultPolicy,input),StrategyVersionConflict);
 assert.throws(()=>checkStrategyAdoption({...plan,bell:after},after,defaultPolicy,expected),StrategyVersionConflict);
 assert.throws(()=>checkStrategyAdoption({...plan,id:'replacement'},after,defaultPolicy,expected),StrategyVersionConflict);
 const namedPlan={...plan,bell:{...before,creatorWallet:'0x1111111111111111111111111111111111111111'}};
 assert.throws(()=>checkStrategyAdoption(namedPlan,{...after,creatorWallet:'0x2222222222222222222222222222222222222222'},defaultPolicy,expected),StrategyVersionConflict);
 assert.throws(()=>checkStrategyAdoption(namedPlan,after,defaultPolicy,expected),StrategyVersionConflict);
 assert.equal(JSON.stringify({plan,after,defaultPolicy}),snapshot);
});
test('guest creator can link a verified wallet on the same trusted Flow without altering plan settings',()=>{
 const snapshot=JSON.stringify(plan);
 assert.equal(checkStrategyAdoption(plan,{...after,creatorWallet:'0x1111111111111111111111111111111111111111'},defaultPolicy,expected).allowed,true);
 assert.equal(JSON.stringify(plan),snapshot);
});
test('selected version is checked under stricter Flow/personal rules without changing policy or schedule',()=>{
 const snapshot=JSON.stringify(plan),allowed=checkStrategyAdoption(plan,after,defaultPolicy,expected);assert.equal(allowed.allowed,true);
 assert.equal(checkStrategyAdoption(plan,{...after,policy:{maxSingleAssetBps:2000}},defaultPolicy,expected).allowed,false);
 assert.equal(checkStrategyAdoption(plan,{...after,reserveBps:500},defaultPolicy,expected).allowed,false);
 assert.equal(JSON.stringify(plan),snapshot);
});
test('diff includes removed companies, reserve movement and policy removal',()=>{
 const changes=strategyDiff({...before,policy:{maxTradeUsd:'10'}},{...after,assets:[{ticker:'AAPL',weightBps:8000}],reserveBps:2000});
 assert.equal(changes.assets.find(item=>item.ticker==='NVDA')?.afterBps,0);assert.equal(changes.reserve.afterBps,2000);assert.deepEqual(changes.policy,[{field:'maxTradeUsd',before:'10',after:null}]);
});
