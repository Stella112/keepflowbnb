import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newAccount,bellInputSchema,defaultPolicy,type Flow} from "../lib/paper/model.ts";
import {fillBuy,fillSell,checkPolicy,money,contributionPlan,runLegs,valueMicros} from "../lib/paper/engine.ts";
import {tokensSchema} from "../lib/binance/rwa-schemas.ts";
import {accountView} from "../lib/paper/view.ts";
import {nextPaperRun,paperRunKey,planDue,strategyAllowed} from "../lib/paper/autopilot-math.ts";
import {effectiveBellPolicy} from '../lib/execution/rules.ts';
const tokens=tokensSchema.parse(JSON.parse(readFileSync(new URL("../fixtures/api/rwa-bsc-tech.json",import.meta.url),"utf8")).data);
// Controlled price/status ONLY for deterministic math tests; production never uses this override.
const actual=tokens.find(t=>t.underlyingTicker==="NVDA"&&t.platformId==="bstock")!;
const asset={...actual,tokenPrice:"200",statusInfo:{...actual.statusInfo,openState:true}};
const time="2026-10-06T10:00:00.000Z";
test('manual exits reject stale, invalid and future price timestamps without changing cash or holdings',()=>{
 for(const timestamp of ['invalid',new Date(Date.now()-20000).toISOString(),new Date(Date.now()+20000).toISOString()]){
  const state=newAccount();fillBuy(state,asset,money('50'),new Date().toISOString());state.policy.priceMaxAgeSeconds=1;
  const before=JSON.stringify(state),leg=fillSell(state,asset.tokenContractAddress,[asset],timestamp);
  assert.equal(leg.status,'BLOCKED');assert.equal(leg.policy,'BLOCKED');assert.equal(JSON.stringify(state),before);
 }
 const state=newAccount();fillBuy(state,asset,money('50'),new Date().toISOString());state.policy.priceMaxAgeSeconds=10;
 assert.equal(fillSell(state,asset.tokenContractAddress,[asset],new Date().toISOString()).status,'PAPER_FILLED');
});
test('contribution allocation preserves an explicitly stricter Flow reserve with unchanged personal state',()=>{
 const state=newAccount(),bell={...({assets:[{ticker:'NVDA',weightBps:9000}],reserveBps:1000} as Flow),policy:{minReserveBps:9000}};
 const before=JSON.stringify(state),plan=contributionPlan(bell,state,[asset],money('2000'));
 assert.equal(plan.reduce((sum,leg)=>sum+leg.amount,0n),money('1000'));assert.equal(JSON.stringify(state),before);
});
test('selected Flow spend and price-freshness caps block paper fills without mutating holdings',()=>{
 const state=newAccount(),before=JSON.stringify(state),bell={reserveBps:1000,policy:{maxTradeUsd:'5'}} as Flow;
 const blocked=fillBuy(state,asset,money('6'),new Date().toISOString(),effectiveBellPolicy(bell,state.policy),[asset]);
 assert.equal(blocked.status,'BLOCKED');assert.equal(JSON.stringify(state),before);
 const stale=fillBuy(state,asset,money('1'),new Date(Date.now()-10000).toISOString(),{...state.policy,priceMaxAgeSeconds:1},[asset]);
 assert.equal(stale.status,'BLOCKED');assert.equal(JSON.stringify(state),before);
});
test("scheduled paper periods run at 09:00 WAT and never backfill or repeat a completed period",()=>{
 assert.equal(nextPaperRun("2026-10-06T07:59:00Z","DAILY",5),"2026-10-06T08:00:00.000Z");
 assert.equal(nextPaperRun("2026-10-06T08:00:00Z","DAILY",5),"2026-10-07T08:00:00.000Z");
 assert.equal(nextPaperRun("2026-10-09T08:00:00Z","WEEKLY",5),"2026-10-16T08:00:00.000Z");
 const plan={id:"test",nextRunAt:time,enabled:true} as Parameters<typeof planDue>[0];
 assert.equal(planDue(plan,Date.parse(time)-1),false);assert.equal(planDue(plan,Date.parse(time)),true);
 assert.equal(planDue({...plan,enabled:false},Date.parse(time)),false);
 assert.equal(paperRunKey(plan),paperRunKey({...plan}));assert.notEqual(paperRunKey(plan),paperRunKey({...plan,nextRunAt:"2026-10-07T08:00:00Z"}));
});
test("creator proposals cannot override follower exposure and reserve rules",()=>{
 const bell={assets:[{ticker:"NVDA",weightBps:4000}],reserveBps:1000} as Flow;
 assert.equal(strategyAllowed(bell,defaultPolicy).allowed,true);
 assert.equal(strategyAllowed({...bell,assets:[{ticker:"NVDA",weightBps:4001}]},defaultPolicy).allowed,false);
 assert.equal(strategyAllowed({...bell,reserveBps:999},defaultPolicy).allowed,false);
});
test("unexpected failure on a later leg preserves the fill and records remaining legs as not started",()=>{
 const state=newAccount();
 const legs=runLegs([{ticker:"NVDA",amount:money("10")},{ticker:"MSFT",amount:money("10")},{ticker:"GOOGL",amount:money("10")}],(ticker,amount)=>{if(ticker!=="NVDA")throw new Error("Controlled failure");return fillBuy(state,asset,amount,time);});
 assert.deepEqual(legs.map(l=>l.status),["PAPER_FILLED","FAILED","NOT_STARTED"]);assert.equal(state.positions.length,1);assert.equal(state.cashMicros,money("9990").toString());
});
test("paper buy and sell conserve virtual money and preserve exact token units",()=>{
 const state=newAccount();const leg=fillBuy(state,asset,money("100"),time);
 assert.equal(leg.status,"PAPER_FILLED");assert.equal(leg.quantity,"0.5");assert.equal(state.cashMicros,money("9900").toString());
 assert.equal(valueMicros(BigInt(state.positions[0].quantity),18,"200"),money("100"));
 const before=JSON.stringify(state);const blocked=fillSell(state,asset.tokenContractAddress,[{...asset,tokenPrice:"250"}],time);
 assert.equal(blocked.status,"BLOCKED");assert.equal(blocked.policy,"BLOCKED");assert.equal(JSON.stringify(state),before);
 state.policy.maxTradeUsd="125";
 const closed=fillSell(state,asset.tokenContractAddress,[{...asset,tokenPrice:"250"}],time);
 assert.equal(closed.amountUsd,"125");assert.equal(state.cashMicros,money("10025").toString());assert.equal(state.positions.length,0);
});
test("closed markets, inadequate cash and missing prices do not mutate a paper account",()=>{
 for(const token of [undefined,{...asset,tokenPrice:"0"},{...asset,statusInfo:{...asset.statusInfo,openState:false}}]){const state=newAccount();const before=JSON.stringify(state);assert.notEqual(fillBuy(state,token,money("100"),time).status,"PAPER_FILLED");assert.equal(JSON.stringify(state),before);}
 const state=newAccount();assert.equal(fillBuy(state,asset,money("10001"),time).status,"BLOCKED");assert.equal(state.positions.length,0);
});
test("policy checks exact trade, reserve and concentration boundaries",()=>{
 assert.equal(checkPolicy(money("100"),money("1000"),money("4000"),money("10000"),defaultPolicy).allowed,true);
 assert.equal(checkPolicy(money("100.000001"),money("1000"),money("4000"),money("10000"),defaultPolicy).allowed,false);
 assert.equal(checkPolicy(money("100"),money("999.999999"),money("4000"),money("10000"),defaultPolicy).allowed,false);
 assert.equal(checkPolicy(money("100"),money("1000"),money("4000.000001"),money("10000"),defaultPolicy).allowed,false);
});
test("invalid Flow totals and duplicate tickers are rejected; parent is provenance only",()=>{
 const input={title:"Test basket",description:"",assets:[{ticker:"NVDA",weightBps:9000}],reserveBps:1000};assert.equal(bellInputSchema.safeParse(input).success,true);
 assert.equal(bellInputSchema.safeParse({...input,reserveBps:1001}).success,false);
 assert.equal(bellInputSchema.safeParse({...input,assets:[{ticker:"NVDA",weightBps:4500},{ticker:"NVDA",weightBps:4500}]}).success,false);
 const fork=bellInputSchema.parse({...input,forkedFromId:"parent"});fork.assets[0].weightBps=8000;assert.equal(input.assets[0].weightBps,9000);
});
test("sequential paper basket preserves a filled leg and stops after failure on leg two",()=>{
 const state=newAccount();let calls=0;
 const legs=runLegs([{ticker:"NVDA",amount:money("10")},{ticker:"MSFT",amount:money("10")},{ticker:"GOOGL",amount:money("10")}],(ticker,amount)=>{calls++;return ticker==="NVDA"?fillBuy(state,asset,amount,time):{ticker,provider:null,amountUsd:"10",status:"FAILED",reason:"Forced test failure",policy:"NOT_CHECKED"};});
 assert.deepEqual(legs.map(l=>l.status),["PAPER_FILLED","FAILED","NOT_STARTED"]);assert.equal(calls,2);assert.equal(state.cashMicros,money("9990").toString());assert.equal(state.positions.length,1);
});
test("contribution plan targets underweights, respects reserve and never proposes selling",()=>{
 const state=newAccount();fillBuy(state,asset,money("5000"),time);
 const bell:Flow={title:"AI",description:"",assets:[{ticker:"NVDA",weightBps:3000},{ticker:"MSFT",weightBps:3000},{ticker:"GOOGL",weightBps:3000}],reserveBps:1000,id:"test",version:1,contentHash:"test",createdAt:time,example:true};
 const plan=contributionPlan(bell,state,[asset],money("100"));
 assert.equal(plan.some(p=>p.ticker==="NVDA"),false);assert.ok(plan.every(p=>p.amount>0n));assert.ok(plan.reduce((n,p)=>n+p.amount,0n)<=money("100"));assert.equal(state.positions.length,1);
 assert.deepEqual(contributionPlan(bell,{...state,policy:{...state.policy,minReserveBps:9000}},[asset],money("100")),[]);
});
test("missing or zero prices leave holdings intact and never fabricate a portfolio value",()=>{
 const state=newAccount();fillBuy(state,asset,money("100"),time);
 assert.equal(accountView(state,[asset],time).totalUsd,"10000");
 for(const prices of [[],[{...asset,tokenPrice:"0"}]]){const result=accountView(state,prices,null);assert.equal(result.totalUsd,null);assert.equal(result.positions[0].valueUsd,null);assert.equal(result.cashUsd,"9900");assert.equal(result.positions[0].quantity,"0.5");}
});
test("price precision beyond 18 decimals is preserved without rejecting or rounding a fill upward",()=>{
 const state=newAccount();const precise={...asset,tokenPrice:"200.123456789012345678901234567890123456"};
 const leg=fillBuy(state,precise,money("100"),time);assert.equal(leg.status,"PAPER_FILLED");
 assert.ok(BigInt(state.positions[0].quantity)<500000000000000000n);assert.ok(BigInt(state.cashMicros)>=money("9900"));
 assert.ok(valueMicros(BigInt(state.positions[0].quantity),18,precise.tokenPrice)<=money("100"));
});

