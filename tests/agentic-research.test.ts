import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {AgenticResearchStore,buyAgenticResearch,type ResearchDeps} from '../lib/research/agentic-research.ts';
import {agenticArgs,type AgenticCommand} from '../lib/agents/agentic-cli.ts';

const PAY_TO='0xd10bddc20e4dc42a1a19a9653e994991e25b8153',USD1='0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d',USDT='0x55d398326f99059ff775485246999027b3197955';
const ok=(d:unknown)=>JSON.stringify({success:true,data:d});
const option=(over:Record<string,unknown>={})=>({index:1,status:'READY_TO_SIGN',scheme:'exact',assetTransferMethod:'eip3009',binanceChainId:'56',tokenAddress:USD1,tokenSymbol:'USD1',amount:'0.1',payTo:PAY_TO,needApproveFirst:false,...over});
function deps(over:{options?:unknown[];signThrows?:boolean;submitThrows?:boolean;expires?:number}={}){
 const calls:AgenticCommand[]=[],submits:string[]=[];
 const d:ResearchDeps={store:new AgenticResearchStore(new DatabaseSync(':memory:')),now:()=>Date.parse('2026-10-10T12:00:00Z'),
  offer:async()=>({requestBody:'{"symbols":["NVDA"]}',challenge:{x402Version:2}}),
  cli:async c=>{calls.push(c);if(c.kind==='X402_PREVIEW')return ok({paymentId:'550e8400-e29b-41d4-a716-446655440000',options:over.options??[option()]});if(c.kind==='X402_SIGN'){if(over.signThrows)throw Error('OUTCOME_UNKNOWN');return ok({paymentHeaderName:'PAYMENT-SIGNATURE',paymentHeaderValue:'eyJ4NDAyVmVyc2lvbiI6Mn0=',approveTxHash:null,binanceChainId:null,signatureExpiresAt:over.expires??1893456000});}throw Error('unexpected');},
  submit:async(_b,h)=>{submits.push(h);if(over.submitThrows)throw Error('timeout');return {receipt:{jobId:'x402_'+'a'.repeat(32)},paymentResponse:Buffer.from(JSON.stringify({transaction:'0x'+'e'.repeat(64)})).toString('base64')};},
  saveJob:()=>({jobId:'x402_'+'a'.repeat(32),status:'queued'})};
 return {d,calls,submits};
}
const input=(id='11111111-1111-4111-8111-111111111111')=>({owner:'owner',ticker:'NVDA',requestId:id,dailyLimit:3,dayStart:'2026-10-09T23:00:00.000Z'});

test('x402 CLI arguments are fixed and validated',()=>{
 assert.deepEqual(agenticArgs({kind:'X402_SIGN',paymentId:'550e8400-e29b-41d4-a716-446655440000',index:1}),['x402-payment','sign','--paymentId','550e8400-e29b-41d4-a716-446655440000','--selectedIndex','1','--json']);
 assert.throws(()=>agenticArgs({kind:'X402_SIGN',paymentId:'x; rm',index:1}));assert.throws(()=>agenticArgs({kind:'X402_PREVIEW',requirements:'not json'}));
});

test('pays exactly 0.1 USD1 by EIP-3009 to the reviewed merchant, once, and saves the job',async()=>{
 const {d,calls,submits}=deps();const {attempt}=await buyAgenticResearch(input(),d);
 assert.equal(attempt.state,'ACCEPTED');assert.equal(attempt.token,'USD1');assert.equal(attempt.settlementTx,'0x'+'e'.repeat(64));
 assert.equal(calls.filter(c=>c.kind==='X402_SIGN').length,1);assert.equal(submits.length,1);
 const again=await buyAgenticResearch(input(),d);assert.equal(again.created,false);assert.equal(calls.filter(c=>c.kind==='X402_SIGN').length,1);
});

test('rejects wrong merchant, amount, token, Permit2 and unready options without signing',async()=>{
 for(const bad of [option({payTo:'0x'+'1'.repeat(40)}),option({amount:'1'}),option({tokenAddress:USDT,tokenSymbol:'USDT'}),option({assetTransferMethod:'permit2'}),option({status:'ACTION_REQUIRED'}),option({needApproveFirst:true}),option({tokenSymbol:'U'})]){
  const {d,calls}=deps({options:[bad]});const {attempt}=await buyAgenticResearch(input(),d);
  assert.equal(attempt.state,'FAILED');assert.equal(calls.filter(c=>c.kind==='X402_SIGN').length,0);
 }
});

test('ambiguous signing or submission is never repeated; expired signatures are not submitted',async()=>{
 const a=deps({signThrows:true});assert.equal((await buyAgenticResearch(input(),a.d)).attempt.state,'UNKNOWN');assert.equal(a.submits.length,0);
 const b=deps({submitThrows:true});assert.equal((await buyAgenticResearch(input(),b.d)).attempt.state,'UNKNOWN');assert.equal(b.submits.length,1);
 const c=deps({expires:1});assert.equal((await buyAgenticResearch(input(),c.d)).attempt.state,'FAILED');assert.equal(c.submits.length,0);
});

test('daily research budget caps attempts that may have spent the fee',async()=>{
 const {d}=deps();for(const id of ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'])await buyAgenticResearch(input(id),d);
 const fourth=await buyAgenticResearch(input('44444444-4444-4444-8444-444444444444'),d);assert.equal(fourth.created,false);assert.match(fourth.attempt.reason,/budget/);
});
