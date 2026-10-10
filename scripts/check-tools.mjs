import {chromium} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.FIRSTBELL_TEST_URL??'http://localhost:3100',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const guest=await browser.newContext(),signed=await browser.newContext({storageState:'test-results/policy-intent-state.json'});
 const call=(context,name,args={})=>context.request.post(base+'/api/tools',{headers:{Origin:base},data:{name,arguments:args}});
 const publicBell=await call(guest,'get_bell',{id:'ai-compute'});assert.equal(publicBell.status(),200);assert.equal((await publicBell.json()).result.id,'ai-compute');
 assert.equal((await call(guest,'get_portfolio')).status(),401);
 assert.equal((await call(signed,'create_bell',{definition:{}})).status(),403);assert.equal((await call(signed,'request_bell_execution',{id:'ai-compute'})).status(),403);
 assert.equal((await signed.request.post(base+'/api/tools',{headers:{Origin:base},data:{name:'get_portfolio',arguments:{},authorization:{verifiedSession:true}}})).status(),400);
 assert.equal((await signed.request.post(base+'/api/tools',{headers:{Origin:'https://foreign.example'},data:{name:'get_bell',arguments:{id:'ai-compute'}}})).status(),403);
 const portfolio=await call(signed,'get_portfolio');assert.equal(portfolio.status(),200);assert.equal((await portfolio.json()).result.mode,'PAPER');
 const policyBefore=await(await signed.request.get(base+'/api/paper')).json();
 const draft=await call(signed,'create_policy_from_prompt',{prompt:'max trade 12 USD, reserve 15%'});assert.equal(draft.status(),200);const result=(await draft.json()).result;assert.equal(result.draft.saved,false);assert.equal(result.draft.policy.maxTradeUsd,'12');assert.equal(result.expectedPolicyVersion,policyBefore.policyVersion);assert.deepEqual((await(await signed.request.get(base+'/api/paper')).json()).policy,policyBefore.policy);
 assert.equal((await call(signed,'quote_stock',{ticker:'NVDA',provider:'bstock',amount:'1',wallet:'0x'+'1'.repeat(40)})).status(),400);
 const stock=await call(signed,'quote_stock',{ticker:'NVDA',provider:'bstock',amount:'1'});assert.equal(stock.status(),200);assert.equal((await stock.json()).result.status,'BLOCKED');
 const input={requestId:randomUUID(),bellId:'ai-compute',amount:'20'},quote=await call(signed,'quote_bell',input);assert.equal(quote.status(),200);const saved=(await quote.json()).result;
 assert.equal(saved.executionAvailable,false);assert.equal(saved.receipt.checkKind,'QUOTE_ONLY');assert.equal(saved.receipt.status,'BLOCKED');assert.ok(saved.receipt.legs[0].quote.id);assert.ok(saved.receipt.legs.every(leg=>!leg.simulation&&leg.transactionHash===null));
 assert.deepEqual((await(await call(signed,'quote_bell',input)).json()).result,saved);
 const status=await call(signed,'get_execution_status',{id:saved.receipt.id});assert.equal(status.status(),200);assert.equal((await status.json()).result.status,'BLOCKED');
 const brief=await call(guest,'get_stock_research',{ticker:'NVDA'});assert.equal((await brief.json()).result.status,'FACTUAL_DATA_ONLY');
 mkdirSync('test-results',{recursive:true});writeFileSync('test-results/tool-http-proof.json',JSON.stringify({result:'PASS',checks:18,receiptId:saved.receipt.id,checkKind:'QUOTE_ONLY',executionAvailable:false,mcpProtocolVerified:false},null,2));console.log('PASS: production read-only tool HTTP bindings, signed owner scope, unsaved draft, real wallet checks and durable quote-only replay. MCP transport remains unverified.');
}finally{await browser.close();}

