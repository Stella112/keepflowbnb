import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {encodeEventTopics,encodeAbiParameters,type Hex} from "viem";
import {erc20Abi} from "viem";
import {IntentStore,intentFingerprint} from "../lib/execution/intents/store-core.ts";
import {intentInputSchema,intentView,type Intent} from "../lib/execution/intents/model.ts";
import {reconcileIntent,type ReconcileRpc,type ChainReceipt} from "../lib/execution/intents/reconcile-core.ts";
// Entirely synthetic adversarial fixtures: not real provider or mainnet evidence.
const wallet="0x1111111111111111111111111111111111111111",router="0x2222222222222222222222222222222222222222",funding="0x3333333333333333333333333333333333333333",stock="0x4444444444444444444444444444444444444444";
const hash=("0x"+"a".repeat(64)) as Hex,blockHash="0x"+"b".repeat(64);
function intent(id="one"):Intent{return {id,requestId:id,wallet,input:{requestId:id,ticker:"NVDA",provider:"bstock",amount:"5"},createdAt:"2026-10-08T00:00:00Z",status:"PREPARING",revision:0,executionAvailable:false,reason:"Synthetic preparation"};}
function prepared(id="one"):Intent{return {...intent(id),status:"READY_READ_ONLY",revision:1,quote:{id:"quote",provider:"bstock",funding,stock,fundingDecimals:18,stockDecimals:18,amountUnits:"5",minimumReceiveUnits:"10",spender:router,fetchedAt:"2026-10-08T00:00:01Z",localFreshUntil:"2026-10-08T00:00:16Z",expirySource:"LOCAL_15_SECOND_PREFLIGHT_LIMIT_NOT_PROVIDER_EXPIRY"},transaction:{chainId:56,from:wallet,to:router,data:"0x1234",value:"0",gas:"100000",gasPrice:"1"}};}
function transfer(address:string,from:`0x${string}`,to:`0x${string}`,value:bigint){return {address,topics:encodeEventTopics({abi:erc20Abi,eventName:"Transfer",args:{from,to}}) as readonly Hex[],data:encodeAbiParameters([{type:"uint256"}],[value])};}
function rpc():ReconcileRpc{const receipt:ChainReceipt={transactionHash:hash,status:"success",blockNumber:10n,blockHash,logs:[transfer(funding,wallet,router,5n),transfer(stock,router,wallet,10n)]};return {chainId:async()=>56,transaction:async()=>({hash,from:wallet,to:router,input:"0x1234",value:0n,blockNumber:10n}),receipt:async()=>receipt,head:async()=>12n,block:async()=>({hash:blockHash,timestamp:1791417601n}),stockBalance:async()=>10n};}
test("intent admission is durable, owner scoped, idempotent and payload-conflict detectable",()=>{
 const db=new DatabaseSync(":memory:"),store=new IntentStore(db),initial=intent();try{
  assert.equal(store.admit("owner","fp",initial).created,true);assert.equal(store.admit("owner","other",initial).fingerprint,"fp");assert.equal(store.read("stranger","one"),undefined);assert.equal(store.events("stranger","one"),undefined);
  const ready=prepared();assert.equal(store.update("owner",initial,ready),true);assert.equal(store.update("owner",initial,ready),false);
  assert.equal(store.events("owner","one")?.length,2);assert.equal(store.read("owner","one")?.transaction?.data,"0x1234");assert.equal(new IntentStore(db).read("owner","one")?.status,"READY_READ_ONLY");
  assert.equal(store.update("owner",ready,{...ready,revision:2,status:"PENDING",transaction:{...ready.transaction!,data:"0xabcd"}}),false);
 }finally{db.close();}
});
test("reconciliation binds a matching hash to exactly one intent and fences terminal results",()=>{
 const db=new DatabaseSync(":memory:"),store=new IntentStore(db);try{
  for(const id of ["one","two"]){const first=intent(id);store.admit("owner",id,first);store.update("owner",first,prepared(id));}
  const ready=prepared(),pending:Intent={...ready,revision:2,status:"PENDING",reconciliation:{hash,status:"PENDING",reason:"waiting",checkedAt:new Date().toISOString()}};
  assert.equal(store.update("owner",ready,pending),true);assert.equal(store.update("owner",prepared("two"),{...pending,id:"two",requestId:"two",input:prepared("two").input}),false);
  const confirmed:Intent={...pending,revision:3,status:"CONFIRMED",reconciliation:{...pending.reconciliation!,status:"CONFIRMED"}};assert.equal(store.update("owner",pending,confirmed),true);assert.equal(store.update("owner",confirmed,{...confirmed,revision:4,status:"UNKNOWN"}),false);
 }finally{db.close();}
});
test("synthetic confirmed receipt requires exact debit, minimum receive and actual block balance",async()=>{
 const result=await reconcileIntent(prepared(),hash,rpc());assert.equal(result.status,"CONFIRMED");assert.equal(result.receivedUnits,"10");assert.equal(result.confirmations,"3");
 assert.equal((await reconcileIntent(prepared(),hash,{...rpc(),stockBalance:async()=>9n})).status,"UNVERIFIED");
 const reader=rpc(),receipt=await reader.receipt(hash);assert.equal((await reconcileIntent(prepared(),hash,{...reader,receipt:async()=>({...receipt!,logs:[]})})).status,"UNVERIFIED");
});
test("pruned receipt-block state falls back to the current balance, which must still cover the receipt",async()=>{
 const pruned=(latest:bigint)=>({...rpc(),stockBalance:async(_t:string,_w:string,block:bigint)=>{if(block===10n)throw Error("missing trie node");return latest;}});
 const result=await reconcileIntent(prepared(),hash,pruned(10n));assert.equal(result.status,"CONFIRMED");assert.equal(result.stockBalanceAtBlock,undefined);
 assert.equal((await reconcileIntent(prepared(),hash,pruned(9n))).status,"UNVERIFIED");
});
test("approval logs from transferFrom are ignored instead of breaking settlement (live 2026-10-11)",async()=>{
 const approval={address:funding,topics:encodeEventTopics({abi:erc20Abi,eventName:"Approval",args:{owner:wallet,spender:router}}) as readonly Hex[],data:encodeAbiParameters([{type:"uint256"}],[0n])};
 const reader=rpc(),receipt=await reader.receipt(hash);
 assert.equal((await reconcileIntent(prepared(),hash,{...reader,receipt:async()=>({...receipt!,logs:[approval,...receipt!.logs,approval]})})).status,"CONFIRMED");
});
test("unrelated hash sender, target, calldata, value and old block cannot reconcile",async()=>{
 const reader=rpc(),tx=await reader.transaction(hash);
 for(const mutation of [{from:router},{to:stock},{input:"0xffff"},{value:1n},{hash:"0x"+"c".repeat(64)}])await assert.rejects(reconcileIntent(prepared(),hash,{...reader,transaction:async()=>({...tx!,...mutation})}),/UNRELATED_HASH/);
 await assert.rejects(reconcileIntent(prepared(),hash,{...reader,block:async()=>({hash:blockHash,timestamp:1n})}),/UNRELATED_HASH/);
});
test("RPC absence, wrong chain, reorg and errors remain unknown; pending is never failure",async()=>{
 for(const patch of [{transaction:async()=>null},{chainId:async()=>1},{block:async()=>({hash:"0xdead",timestamp:1791417601n})},{head:async()=>{throw new Error("RPC error");}}])assert.equal((await reconcileIntent(prepared(),hash,{...rpc(),...patch})).status,"UNKNOWN");
 assert.equal((await reconcileIntent(prepared(),hash,{...rpc(),receipt:async()=>null})).status,"PENDING");assert.equal((await reconcileIntent(prepared(),hash,{...rpc(),head:async()=>10n})).status,"PENDING");
 const reader=rpc(),receipt=await reader.receipt(hash);assert.equal((await reconcileIntent(prepared(),hash,{...reader,receipt:async()=>({...receipt!,status:"reverted"})})).status,"REVERTED");
});
test("API inputs reject client wallet/authority and public views omit executable calldata",()=>{
 const input={requestId:"11111111-1111-4111-8111-111111111111",ticker:"NVDA",provider:"bstock",amount:"5"};assert.equal(intentInputSchema.safeParse(input).success,true);for(const extra of [{wallet},{executionAvailable:true},{arbitraryData:"0x12"}])assert.equal(intentInputSchema.safeParse({...input,...extra}).success,false);
 const view=intentView(prepared());assert.ok(!JSON.stringify(view).includes("0x1234"));assert.equal(view.executionAvailable,false);assert.equal(view.authorization,"NONE_READ_ONLY");assert.notEqual(intentFingerprint({...input,amount:"6"}),intentFingerprint(input));
});
test("interrupted preparation expires without resurrection or rewriting its immutable journal",()=>{
 const db=new DatabaseSync(":memory:"),store=new IntentStore(db),old={...intent(),createdAt:new Date(Date.now()-400_000).toISOString()};try{store.admit("owner","fp",old);assert.equal(store.expirePreparation("owner","one")?.status,"BLOCKED");assert.equal(store.update("owner",old,{...prepared(),createdAt:old.createdAt}),false);assert.equal(store.events("owner","one")?.length,2);}finally{db.close();}
});
test("observed hash remains bound through unknown RPC outcomes and store reopening",()=>{
 const db=new DatabaseSync(":memory:");let store=new IntentStore(db);try{
  const first=intent();store.admit("owner","fp",first);const ready=prepared();store.update("owner",first,ready);
  const pending:Intent={...ready,revision:2,status:"PENDING",reconciliation:{hash,status:"PENDING",reason:"seen",checkedAt:new Date().toISOString()}};assert.equal(store.update("owner",ready,pending),true);
  const unknown:Intent={...pending,revision:3,status:"UNKNOWN",reconciliation:{...pending.reconciliation!,status:"UNKNOWN",reason:"RPC outage"}};assert.equal(store.update("owner",pending,unknown),true);
  store=new IntentStore(db);const reopened=store.read("owner","one")!;
  const wrong:Intent={...reopened,revision:4,status:"PENDING",reconciliation:{...pending.reconciliation!,hash:"0x"+"c".repeat(64)}};assert.equal(store.update("owner",reopened,wrong),false);
  assert.equal(store.update("owner",reopened,{...reopened,revision:4,status:"PENDING",reconciliation:pending.reconciliation}),true);
 }finally{db.close();}
});
test("an initial unknown unseen hash does not bind the intent",()=>{
 const db=new DatabaseSync(":memory:"),store=new IntentStore(db);try{const first=intent();store.admit("owner","fp",first);const ready=prepared();store.update("owner",first,ready);const unknown:Intent={...ready,revision:2,status:"UNKNOWN",reconciliation:{hash:"0x"+"c".repeat(64),status:"UNKNOWN",reason:"unseen",checkedAt:new Date().toISOString()}};assert.equal(store.update("owner",ready,unknown),true);assert.equal(store.update("owner",unknown,{...unknown,revision:3,status:"PENDING",reconciliation:{...unknown.reconciliation!,hash,status:"PENDING"}}),true);}finally{db.close();}
});
test("reorganization during balance verification does not produce a confirmed claim",async()=>{
 const reader=rpc();let calls=0;assert.equal((await reconcileIntent(prepared(),hash,{...reader,block:async()=>({hash:++calls===1?blockHash:"0xchanged",timestamp:1791417601n})})).status,"UNKNOWN");
});
