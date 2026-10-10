import {test} from "node:test";
import assert from "node:assert/strict";
import {paperReceiptEvidence,paperReceiptExport} from "../lib/paper/receipt-evidence.ts";
import {newAccount,type Flow,type Receipt} from "../lib/paper/model.ts";
test("event evidence preserves historical version/rules/cash after later changes",()=>{
 const state=newAccount(),bell={id:"bell",version:3,contentHash:"captured",assets:[],reserveBps:1000,policy:{maxTradeUsd:"20"}} as unknown as Flow;
 state.cashMicros="9900123456";const evidence=paperReceiptEvidence(state,bell);
 state.cashMicros="1";state.policy.maxTradeUsd="999";bell.version=4;bell.contentHash="new";bell.policy!.maxTradeUsd="90";
 assert.equal(evidence.cashAfterUsd,"9900.123456");assert.equal(evidence.bellVersion,3);assert.equal(evidence.bellContentHash,"captured");assert.equal(evidence.policySnapshot.maxTradeUsd,"100");assert.equal(evidence.effectivePolicySnapshot!.maxTradeUsd,"20");
});
test("exports omit internal replay fields and never invent legacy evidence",()=>{
 const receipt={id:"receipt",requestId:"private-replay",fingerprint:"private-hash",mode:"PAPER",action:"BUY",status:"BLOCKED",reason:"Blocked",legs:[],createdAt:"2026-10-09T00:00:00Z",transactionHash:null,simulation:"NOT_RUN_PAPER_MODE"} as Receipt;
 const exported=paperReceiptExport(receipt);assert.equal(exported.financialAuthorization,"NONE_PAPER_ONLY");assert.ok(!('requestId' in exported.receipt));assert.ok(!('fingerprint' in exported.receipt));assert.ok(!('bellVersion' in exported.receipt));assert.ok(!('cashAfterUsd' in exported.receipt));assert.equal(exported.receipt.transactionHash,null);
 exported.receipt.reason="Changed";assert.equal(receipt.reason,"Blocked");
});
test("scheduled cap is recorded as effective without rewriting personal rules",()=>{
 const state=newAccount(),bell={version:2,contentHash:"hash",policy:{maxTradeUsd:"20"}} as Flow;
 const evidence=paperReceiptEvidence(state,bell,{...state.policy,maxTradeUsd:"10"});
 assert.equal(evidence.policySnapshot.maxTradeUsd,"100");assert.equal(evidence.effectivePolicySnapshot!.maxTradeUsd,"10");
});
test("receipt retrieval rejects other/missing owners without creating accounts",async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {readOwnedPaperReceipt}=await import('../lib/paper/receipt-evidence.ts');const db=new DatabaseSync(':memory:');
 try{db.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY,state TEXT NOT NULL)');const a=newAccount(),b=newAccount();a.receipts.push({id:'private',mode:'PAPER'} as Receipt);db.prepare('INSERT INTO accounts VALUES (?,?)').run('owner',JSON.stringify(a));db.prepare('INSERT INTO accounts VALUES (?,?)').run('other',JSON.stringify(b));
 assert.equal(readOwnedPaperReceipt(db,'owner','private')?.id,'private');assert.equal(readOwnedPaperReceipt(db,'other','private'),undefined);assert.equal(readOwnedPaperReceipt(db,'missing','private'),undefined);assert.equal(readOwnedPaperReceipt(db,undefined,'private'),undefined);assert.equal(db.prepare('SELECT COUNT(*) AS count FROM accounts').get()!.count,2);
 }finally{db.close();}
});
