import {test} from "node:test";
import assert from "node:assert/strict";
import {fitFlowToRules} from "../lib/policy/flow-fit.ts";
import {defaultPolicy,bellInputSchema} from "../lib/paper/model.ts";

const aiCompute={assets:[{ticker:"NVDA",weightBps:3000},{ticker:"MSFT",weightBps:2500},{ticker:"GOOGL",weightBps:2000},{ticker:"AMZN",weightBps:1500}],reserveBps:1000} as const;
const flow=()=>({assets:aiCompute.assets.map(a=>({...a})),reserveBps:aiCompute.reserveBps});

test("a 30% NVIDIA allocation under a 25% cap is reduced and the difference stays in USDT; the Flow itself is untouched",()=>{
 const original=flow(),before=JSON.stringify(original);
 const fit=fitFlowToRules(original,{...defaultPolicy,maxSingleAssetBps:2500,minReserveBps:1000});
 assert.equal(fit.status,"ADJUSTMENT_REQUIRED");assert.equal(fit.code,"SINGLE_ASSET_CAP");
 assert.deepEqual(fit.adjusted,{assets:[{ticker:"NVDA",weightBps:2500},{ticker:"MSFT",weightBps:2500},{ticker:"GOOGL",weightBps:2000},{ticker:"AMZN",weightBps:1500}],reserveBps:1500});
 assert.deepEqual(fit.changes.map(c=>[c.ticker,c.fromBps,c.toBps]),[["NVDA",3000,2500]]);
 assert.equal(JSON.stringify(original),before);
 assert.ok(bellInputSchema.safeParse({title:"AI Compute (my rules)",description:"",...fit.adjusted!}).success,"the proposal is a valid Flow");
});

test("a Flow that fits returns ALLOW with no proposal",()=>{
 const fit=fitFlowToRules(flow(),defaultPolicy);
 assert.equal(fit.status,"ALLOW");assert.equal(fit.adjusted,null);assert.equal(fit.changes.length,0);
});

test("a higher reserve rule scales holdings down without breaking the single-company cap",()=>{
 const fit=fitFlowToRules(flow(),{...defaultPolicy,maxSingleAssetBps:2500,minReserveBps:3000});
 assert.equal(fit.status,"ADJUSTMENT_REQUIRED");
 const a=fit.adjusted!;assert.ok(a.reserveBps>=3000);assert.ok(a.assets.every(x=>x.weightBps<=2500));
 assert.equal(a.assets.reduce((n,x)=>n+x.weightBps,0)+a.reserveBps,10000);
});

test("a creator's stricter cap narrows the investor's, never loosens it",()=>{
 assert.equal(fitFlowToRules({...flow(),policy:{maxSingleAssetBps:2000}},{...defaultPolicy,maxSingleAssetBps:4000}).limits.maxSingleAssetBps,2000);
 assert.equal(fitFlowToRules({...flow(),policy:{maxSingleAssetBps:5000}},{...defaultPolicy,maxSingleAssetBps:2500}).limits.maxSingleAssetBps,2500);
});

test("unavailable holdings move to USDT; nothing left to buy fails closed",()=>{
 const partial=fitFlowToRules(flow(),defaultPolicy,["AMZN"]);
 assert.equal(partial.status,"ADJUSTMENT_REQUIRED");assert.ok(!partial.adjusted!.assets.some(a=>a.ticker==="AMZN"));assert.equal(partial.adjusted!.reserveBps,2500);
 const none=fitFlowToRules(flow(),defaultPolicy,["NVDA","MSFT","GOOGL","AMZN"]);
 assert.equal(none.status,"UNAVAILABLE");assert.equal(none.adjusted,null);
});

import {firstBellToolService} from "../lib/tools/service.ts";
import {newAccount,type Flow} from "../lib/paper/model.ts";
test("the MCP tool uses the same engine: stated limits publicly, saved rules only with a private grant, and saves nothing",async()=>{
 const published:Flow={id:"ai-compute",title:"AI Compute",description:"",version:1,contentHash:"h",createdAt:"2026-10-06T00:00:00Z",example:true,...flow()};
 const account={...newAccount(),policy:{...defaultPolicy,maxSingleAssetBps:2000}};
 const tools=firstBellToolService({discovery:async()=>({tokens:["NVDA","MSFT","GOOGL","AMZN"].map(t=>({underlyingTicker:t,binanceChainId:"56",statusInfo:{openState:true}})) as never,fetchedAt:"now"}),getBell:id=>id===published.id?published:undefined,history:()=>[published],account:()=>account,ownedIds:()=>[],create:()=>{throw Error("no saving");},publish:()=>{throw Error("no saving");}});
 const stated=await tools.call("check_flow_against_rules",{flowId:"ai-compute",maxSingleAssetBps:2500}) as {rulesSource:string;fit:{status:string;adjusted:{assets:{ticker:string;weightBps:number}[]}}};
 assert.equal(stated.rulesSource,"STATED_LIMITS");assert.equal(stated.fit.status,"ADJUSTMENT_REQUIRED");assert.equal(stated.fit.adjusted.assets[0].weightBps,2500);
 const saved=await tools.call("check_flow_against_rules",{flowId:"ai-compute",maxSingleAssetBps:9000},{verifiedSession:true,accountId:"alice",scopes:["PRIVATE_READ"],userConfirmedMutation:false}) as {rulesSource:string;fit:{limits:{maxSingleAssetBps:number}}};
 assert.equal(saved.rulesSource,"SAVED_RULES");assert.equal(saved.fit.limits.maxSingleAssetBps,2000,"a caller cannot loosen saved rules");
});
