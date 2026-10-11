import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {createMcpHandler} from "../lib/tools/mcp-transport.ts";
import {firstBellToolService,ToolError,type ToolAuthorization} from "../lib/tools/service.ts";
import {PurchaseReviewStore,purchaseReviewInput,REVIEW_TTL_MS} from "../lib/tools/purchase-review.ts";
import {applyKeepflowEnvAliases} from "../lib/env-compat.ts";
import {newAccount,type Flow} from "../lib/paper/model.ts";
import type {RwaToken} from "../lib/binance/rwa-schemas.ts";

const url="http://localhost:3100/api/mcp";
const flow:Flow={id:"ai-compute",title:"AI Compute",description:"fixture",assets:[{ticker:"NVDA",weightBps:6000},{ticker:"MSFT",weightBps:3000}],reserveBps:1000,version:2,contentHash:"fixture",createdAt:"2026-10-09T00:00:00Z",example:true};
const token=(ticker:string,platformId:string,price:string,ratio="1",open=true)=>({underlyingTicker:ticker,binanceChainId:"56",platformId,tokenPrice:price,tokenToShareRatio:ratio,tokenSymbol:ticker+(platformId==="ondo"?"on":"B"),tokenContractAddress:"0x"+"1".repeat(40),statusInfo:{openState:open}}) as unknown as RwaToken;
const tokens=[token("NVDA","ondo","201","1"),token("NVDA","bstock","200","1"),token("MSFT","bstock","400","2",false)];

function service(record:{reviews:unknown[];preparations:unknown[];stocks:unknown[]}){
 return firstBellToolService({discovery:async()=>({tokens,fetchedAt:"2026-10-11T00:00:00Z"}),getBell:id=>id===flow.id?flow:undefined,history:()=>[flow],account:()=>newAccount(),ownedIds:()=>[],
  create:()=>{throw Error("mutation forbidden");},publish:()=>{throw Error("mutation forbidden");},
  createReview:async(input,owner)=>{record.reviews.push({input,owner});return {reviewUrl:"https://keepflow.example/review/x",executed:false};},
  bellPreparation:async(input,authorization,kind)=>{record.preparations.push({input,authorization,kind});return {receipt:{id:"r1"},executionAvailable:false};},
  stockPreparation:async(owner,input,simulate)=>{record.stocks.push({owner,input,simulate});return {status:simulate?"SIMULATION":"QUOTE",executionEnabled:false};}});
}

test("review links expire after 15 minutes, use unguessable ids and accept a stock or a Flow, never both",()=>{
 const store=new PurchaseReviewStore(new DatabaseSync(":memory:")),now=1_000_000;
 const review=store.create({kind:"STOCK",ticker:"NVDA",provider:"bstock",amount:"5",source:"MCP"},now);
 assert.match(review.id,/^[A-Za-z0-9_-]{24}$/);
 assert.equal(store.read(review.id,now+REVIEW_TTL_MS-1)?.ticker,"NVDA");
 assert.equal(store.read(review.id,now+REVIEW_TTL_MS),undefined);
 assert.equal(store.read("../../etc/passwd",now),undefined);
 assert.notEqual(store.create({kind:"STOCK",ticker:"NVDA",amount:"5",source:"MCP"},now).id,review.id);
 for(const bad of [{ticker:"NVDA",flowId:"ai-compute",amount:"5"},{amount:"5"},{ticker:"NVDA",amount:"26"},{flowId:"x",amount:"101"},{flowId:"x",provider:"ondo",amount:"5"},{ticker:"NVDA",amount:"5",calldata:"0xdeadbeef"},{ticker:"NVDA",amount:"0"}])assert.equal(purchaseReviewInput.safeParse(bad).success,false,JSON.stringify(bad));
 assert.equal(purchaseReviewInput.safeParse({flowId:"ai-compute",amount:"100"}).success,true);
});

test("without wallet scope, quotes are labelled estimates from live prices and review links are unbound",async()=>{
 const record={reviews:[] as unknown[],preparations:[] as unknown[],stocks:[] as unknown[]},tools=service(record);
 const stock=await tools.call("quote_stock",{ticker:"NVDA",provider:"bstock",amount:"10"}) as {kind:string;executable:boolean;leg:{estimatedTokens:string;provider:string}};
 assert.equal(stock.kind,"INDICATIVE_ESTIMATE");assert.equal(stock.executable,false);assert.equal(stock.leg.estimatedTokens,"0.0500000");assert.equal(stock.leg.provider,"bstock");
 const basket=await tools.call("quote_flow",{flowId:"ai-compute",amount:"20"}) as {legs:{ticker:string;status:string;usdt:string}[];reserveUsdt:string};
 assert.deepEqual(basket.legs.map(l=>[l.ticker,l.status,l.usdt]),[["NVDA","ESTIMATED","12.00"],["MSFT","UNAVAILABLE","6.00"]]);
 assert.equal(basket.reserveUsdt,"2.00");
 await tools.call("prepare_purchase_review",{ticker:"NVDA",amount:"5"});
 assert.deepEqual(record.reviews,[{input:{ticker:"NVDA",amount:"5"},owner:undefined}]);
 assert.equal(record.preparations.length+record.stocks.length,0,"no wallet-specific preparation without scope");
 await assert.rejects(()=>tools.call("simulate_flow_buy",{flowId:"ai-compute",amount:"5"}),ToolError);
});

test("Flow names alias the original tools; a grant-scoped quote maps flowId and adds an idempotency id",async()=>{
 const record={reviews:[] as unknown[],preparations:[] as unknown[],stocks:[] as unknown[]},tools=service(record);
 const grant:ToolAuthorization={verifiedSession:true,accountId:"alice",scopes:["EXECUTION_PREPARATION"],userConfirmedMutation:false,channel:"ASSISTANT_GRANT"};
 assert.equal((await tools.call("get_flow",{id:"ai-compute"}) as Flow).title,"AI Compute");
 await tools.call("simulate_flow_buy",{flowId:"ai-compute",amount:"5"},grant);
 const [call]=record.preparations as {input:{requestId:string;bellId:string;amount:string};authorization:ToolAuthorization;kind:string}[];
 assert.equal(call.input.bellId,"ai-compute");assert.match(call.input.requestId,/^[0-9a-f-]{36}$/);assert.equal(call.kind,"SIMULATE");assert.equal(call.authorization.channel,"ASSISTANT_GRANT");
 await tools.call("prepare_purchase_review",{flowId:"ai-compute",amount:"20"},grant);
 assert.equal((record.reviews[0] as {owner:string}).owner,"alice");
 await assert.rejects(()=>tools.call("request_bell_execution",{id:"ai-compute"},grant),ToolError);
 await assert.rejects(()=>tools.call("request_bell_execution",{id:"ai-compute"},{...grant,scopes:["PRIVATE_READ","EXECUTION_PREPARATION"]}),(e:unknown)=>e instanceof ToolError&&e.code==="EXECUTION_DISABLED");
});

test("an assistant token unlocks only the previews it was granted; execution stays website-only",async()=>{
 const record={reviews:[] as unknown[],preparations:[] as unknown[],stocks:[] as unknown[]},tools=service(record);
 const bearer="fbm_"+"a".repeat(64);let allowedTools=["quote_flow","simulate_stock_buy","prepare_purchase_review","get_wallet_portfolio"];
 const seen:(ToolAuthorization|undefined)[]=[];
 const handler=createMcpHandler({call:(name,args,a)=>{seen.push(a);return tools.call(name,args,a);},authorize:async()=>{throw Error("cookies must not be used with a token");},takeSlot:()=>true,takeAnonymousSlot:()=>true,
  resolveBearer:async t=>t===bearer?{accountId:"alice",allowedTools}:undefined});
 const client=new Client({name:"claude-code-like",version:"1"});
 await client.connect(new StreamableHTTPClientTransport(new URL(url),{requestInit:{headers:{Authorization:"Bearer "+bearer}},fetch:async(input,init)=>handler(new Request(input,init))}));
 try{
  const names=(await client.listTools()).tools.map(t=>t.name);
  for(const n of ["quote_flow","quote_bell","simulate_stock_buy","prepare_purchase_review","get_wallet_portfolio"])assert.ok(names.includes(n),n);
  for(const n of ["simulate_flow_buy","prepare_bell_execution","get_portfolio"])assert.ok(!names.includes(n),n);
  const sim=await client.callTool({name:"simulate_stock_buy",arguments:{ticker:"NVDA",provider:"bstock",amount:"5"}});
  assert.notEqual(sim.isError,true);assert.deepEqual(record.stocks,[{owner:"alice",input:{ticker:"NVDA",provider:"bstock",amount:"5"},simulate:true}]);
  assert.equal(seen.at(-1)?.channel,"ASSISTANT_GRANT");assert.deepEqual(seen.at(-1)?.scopes,["EXECUTION_PREPARATION"]);
  assert.equal((await client.callTool({name:"simulate_flow_buy",arguments:{flowId:"ai-compute",amount:"5"}})).isError,true);
  assert.equal((await client.callTool({name:"prepare_bell_execution",arguments:{requestId:"123e4567-e89b-42d3-a456-426614174000",bellId:"ai-compute",amount:"5"}})).isError,true);
  // A token sees only what it was granted, as before; quote_stock was not granted.
  assert.ok(!names.includes("quote_stock")&&!names.includes("search_stock"));
  assert.equal((await client.callTool({name:"quote_stock",arguments:{ticker:"NVDA",provider:"bstock",amount:"5"}})).isError,true);assert.equal(record.stocks.length,1);
  const bad=await client.callTool({name:"prepare_purchase_review",arguments:{ticker:"NVDA",flowId:"ai-compute",amount:"5"}});
  assert.equal(bad.isError,true);assert.match(JSON.stringify(bad.content),/either a ticker or a flowId/);
  allowedTools=[];// revocation takes effect on the next call
  assert.equal((await client.callTool({name:"simulate_stock_buy",arguments:{ticker:"NVDA",provider:"bstock",amount:"5"}})).isError,true);
 }finally{await client.close();}
});

test("KeepFlow error guidance reaches the assistant; secrets in other errors do not",async()=>{
 const handler=createMcpHandler({call:async name=>{throw name==="get_flow"?new ToolError("NOT_FOUND","Flow not found."):Error("PRIVATE_API_SECRET=fixture-not-real");},authorize:async()=>undefined,takeSlot:()=>true,takeAnonymousSlot:()=>true});
 const call=async(name:string,args:object)=>(await (await handler(new Request(url,{method:"POST",headers:{"content-type":"application/json",accept:"application/json, text/event-stream"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name,arguments:args}})}))).text());
 assert.match(await call("get_flow",{id:"missing"}),/Flow not found/);
 const leaked=await call("search_stock",{query:"nvda"});
 assert.ok(!leaked.includes("PRIVATE_API_SECRET"));assert.match(leaked,/Nothing was bought, signed or saved/);
});

test("KEEPFLOW_* settings fill missing FIRSTBELL_* settings without overriding existing ones",()=>{
 const env:Record<string,string|undefined>={KEEPFLOW_PUBLIC_URL:"https://keepflow.site/",KEEPFLOW_RESEARCH_JOB_KEY:"new",FIRSTBELL_RESEARCH_JOB_KEY:"old"};
 applyKeepflowEnvAliases(env);
 assert.equal(env.FIRSTBELL_PUBLIC_URL,"https://keepflow.site/");assert.equal(env.FIRSTBELL_RESEARCH_JOB_KEY,"old");
});
