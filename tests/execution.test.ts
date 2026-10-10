import {test} from "node:test";
import assert from "node:assert/strict";
import {bellDryPlan,effectiveBellPolicy,walletPolicy,runSequentialDryLegs,finalDryStatus} from "../lib/execution/rules.ts";
import {defaultPolicy,type Flow} from "../lib/paper/model.ts";
const bell:Flow={id:"test",title:"Test",description:"",version:1,contentHash:"hash",createdAt:new Date().toISOString(),example:false,assets:[{ticker:"NVDA",weightBps:3000},{ticker:"MSFT",weightBps:3000},{ticker:"AMZN",weightBps:3000}],reserveBps:1000};
test("Flow and personal reserve intersect without weakening either",()=>{
 const policy=effectiveBellPolicy({...bell,reserveBps:5000},defaultPolicy);
 assert.equal(policy.minReserveBps,5000);
 assert.equal(walletPolicy(5_000_000n,54_000_000n,0n,100_000_000n,policy).code,"MIN_RESERVE");
 assert.equal(effectiveBellPolicy(bell,{...defaultPolicy,minReserveBps:6000}).minReserveBps,6000);
 assert.equal(defaultPolicy.minReserveBps,1000);
});
test("dry run conserves all budget units including cash and rounding",()=>{
 const plan=bellDryPlan(bell,"20.000001");assert.deepEqual(plan.legs.map(leg=>leg.amount),["6","6","6"]);assert.equal(plan.reserveAmount,"2");assert.equal(plan.roundingAmount,"0.000001");assert.ok(plan.legs.every(leg=>leg.transactionHash===null));
 assert.throws(()=>bellDryPlan(bell,"0"));assert.throws(()=>bellDryPlan(bell,"100.000001"));
});
test("real spending checks fail closed with stable reason codes",()=>{
 const check=(amount:bigint,cash=100_000_000n,exposure=0n,total=100_000_000n,policy=defaultPolicy)=>walletPolicy(amount,cash,exposure,total,policy);
 assert.equal(check(5_000_000n).code,"ALLOWED");assert.equal(check(0n).code,"AMOUNT_TOO_SMALL");assert.equal(check(26_000_000n).code,"READ_ONLY_LIMIT");
 assert.equal(check(5_000_000n,1_000_000n).code,"INSUFFICIENT_USDT");assert.equal(check(5_000_000n,12_000_000n).code,"MIN_RESERVE");assert.equal(check(5_000_000n,100_000_000n,39_000_000n).code,"MAX_EXPOSURE");
 assert.equal(check(5_000_000n,100_000_000n,0n,100_000_000n,{...defaultPolicy,maxTradeUsd:"4.999999"}).code,"MAX_TRADE");
 // Exactly on the reserve/exposure boundaries is allowed, one micro-unit beyond is not.
 assert.equal(check(5_000_000n,15_000_000n,35_000_000n).allowed,true);assert.equal(check(5_000_001n,15_000_000n).code,"MIN_RESERVE");
});
test("a failed second simulation preserves the first and never starts the third",async()=>{
 const {legs}=bellDryPlan(bell,"20"),calls:string[]=[];let saved=0;
 await runSequentialDryLegs(legs,async leg=>{calls.push(leg.ticker);leg.status=leg.ticker==="NVDA"?"SIMULATED":"FAILED";},()=>saved++);
 assert.deepEqual(calls,["NVDA","MSFT"]);assert.deepEqual(legs.map(leg=>leg.status),["SIMULATED","FAILED","NOT_STARTED"]);assert.equal(finalDryStatus(legs),"PARTIAL");assert.equal(saved,3);assert.ok(legs.every(leg=>leg.transactionHash===null));
});
test("a blocked first leg and thrown verification error stop the basket",async()=>{
 for(const thrown of [false,true]){const {legs}=bellDryPlan(bell,"20");let calls=0;await runSequentialDryLegs(legs,async leg=>{calls++;if(thrown)throw new Error("RPC unavailable");leg.status="BLOCKED";},()=>{});assert.equal(calls,1);assert.equal(legs[1].status,"NOT_STARTED");assert.equal(finalDryStatus(legs),thrown?"FAILED":"BLOCKED");}
});
