import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AgentReviewStore} from '../lib/agents/review-store.ts';
import {buildBellReview} from '../lib/agents/review-report.ts';
import {defaultPolicy,type Flow} from '../lib/paper/model.ts';
import type {StockBrief} from '../lib/research/brief.ts';
const now=Date.parse('2026-10-09T12:00:00Z');
const bell:Flow={id:'bell',title:'Research',description:'',assets:[{ticker:'NVDA',weightBps:9000}],reserveBps:1000,version:1,contentHash:'hash',createdAt:new Date(now).toISOString(),example:false};
const brief:StockBrief={status:'FACTUAL_DATA_ONLY',ticker:'NVDA',source:{name:'Binance RWA discovery',url:'https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data',fetchedAt:new Date(now).toISOString()},representations:[{provider:'verified fixture',chainId:56,contract:'0x'+'1'.repeat(40),tokenSymbol:'NVDA',tokenName:'Fixture NVDA',underlyingName:'NVDA',decimals:18,tokenPriceUsd:'1',tokenToShareRatio:'1',derivedReferencePriceUsd:'1',status:{openState:true,marketStatus:null,reasonCode:null,reasonMsg:null,nextOpenTime:null,nextCloseTime:null}}],paidProviderConfigured:false,analystResearchAvailable:false,limitations:[]};
const input=(requestId:string)=>({requestId,bell,policy:defaultPolicy,policyVersion:2});
test('history remains owner-private, bounded and excludes report and session material',()=>{
 const db=new DatabaseSync(':memory:');let time=now;const store=new AgentReviewStore(db,()=>true,()=>time);for(let n=0;n<55;n++){const job=store.admit('owner','private-grant',input('history-'+n)).job;store.cancel('owner',job.id);time++;}const other=store.admit('other','other-grant',input('other')).job;
 const history=store.list('owner');assert.equal(history.length,50);assert.equal(history.some(value=>value.id===other.id),false);assert.equal(history[0].createdAt,new Date(now+54).toISOString());assert.equal(JSON.stringify(history).includes('private-grant'),false);assert.equal('report' in history[0],false);assert.deepEqual(store.list('missing'),[]);time+=180001;assert.equal(store.list('other')[0].status,'FAILED');db.close();
});
test('source-grounded review preserves captured rules and rejects invalid, stale, duplicated sources',()=>{
 const captured=JSON.stringify({bell,brief,defaultPolicy}),report=buildBellReview(bell,defaultPolicy,2,[brief],now);
 assert.equal(report.allocationReview[0].withinExposureCap,false);assert.equal(report.policyVersion,2);assert.equal(report.studioRuntimeVerified,false);assert.equal(report.executionEnabled,false);assert.equal(JSON.stringify({bell,brief,defaultPolicy}),captured);
 for(const bad of [{...brief,source:{...brief.source,fetchedAt:new Date(now-120001).toISOString()}},{...brief,source:{...brief.source,url:'https://attacker.invalid'}},{...brief,ticker:'MSFT' as const}])assert.throws(()=>buildBellReview(bell,defaultPolicy,2,[bad],now));
 assert.throws(()=>buildBellReview(bell,defaultPolicy,2,[brief,brief],now));
});
test('private immutable admission replay and per-owner bounded queue',()=>{
 const db=new DatabaseSync(':memory:'),store=new AgentReviewStore(db,()=>true,()=>now),job=store.admit('a','grant',input('one')).job;
 assert.equal(store.admit('a','grant',{...input('one'),policy:{...defaultPolicy,maxTradeUsd:'1'},policyVersion:3}).job.policyVersion,2);
 assert.throws(()=>store.admit('a','grant',{...input('one'),bell:{...bell,version:2}}),/REQUEST_CONFLICT/);
 store.admit('a','grant',input('two'));assert.throws(()=>store.admit('a','grant',input('three')),/QUEUE_LIMIT/);assert.equal(store.read('b',job.id),undefined);assert.equal(store.cancel('b',job.id),undefined);db.close();
});
test('reopened worker recovers expired lease and old claim cannot finish or overwrite cancellation',()=>{
 const db=new DatabaseSync(':memory:');let time=now;const store=new AgentReviewStore(db,()=>true,()=>time),job=store.admit('a','grant',input('one')).job,old=store.claim('a',job.id)!;
 assert.equal(store.claim('a',job.id),undefined);time+=30001;const reopened=new AgentReviewStore(db,()=>true,()=>time),current=reopened.claim('a',job.id)!;assert.notEqual(current.claim,old.claim);assert.equal(store.finish(old),false);
 assert.equal(reopened.cancel('a',job.id)?.status,'CANCELLED');assert.equal(reopened.finish(current),false);assert.equal(reopened.claim('a',job.id),undefined);db.close();
});
test('session revocation cancels active work and fences publication',()=>{
 const db=new DatabaseSync(':memory:');let authorized=true;const store=new AgentReviewStore(db,()=>authorized,()=>now),job=store.admit('a','grant',input('one')).job,work=store.claim('a',job.id)!;
 authorized=false;assert.equal(store.valid(work),false);assert.equal(store.read('a',job.id)?.status,'CANCELLED');assert.equal(store.finish(work),false);assert.throws(()=>store.admit('a','grant',input('two')),/SESSION_REVOKED/);db.close();
});
test('expired jobs from other owners are swept before global admission',()=>{
 const db=new DatabaseSync(':memory:');let time=now;const store=new AgentReviewStore(db,()=>true,()=>time);for(let n=0;n<20;n++){store.admit('owner'+n,'grant',input('one'));store.admit('owner'+n,'grant',input('two'));}
 assert.throws(()=>store.admit('new','grant',input('one')),/QUEUE_LIMIT/);time+=180001;assert.equal(store.admit('new','grant',input('one')).created,true);assert.equal(store.find('owner1','one')?.status,'FAILED');db.close();
});
test('completed captured report is durable and mismatched output never commits',()=>{
 const db=new DatabaseSync(':memory:'),store=new AgentReviewStore(db,()=>true,()=>now),job=store.admit('a','grant',input('one')).job,work=store.claim('a',job.id)!,report=buildBellReview(bell,defaultPolicy,2,[brief],now);
 assert.throws(()=>store.finish(work,{...report,policyVersion:3}),/REPORT_MISMATCH/);
 assert.throws(()=>store.finish(work,{...report,personalPolicy:{...report.personalPolicy,maxTradeUsd:'1'}}),/REPORT_MISMATCH/);
 assert.throws(()=>store.finish(work,{...report,effectivePolicy:{...report.effectivePolicy,minReserveBps:0}}),/REPORT_MISMATCH/);
 assert.throws(()=>store.finish(work,{...report,bell:{...report.bell,title:'Altered'}}),/REPORT_MISMATCH/);
 work.policy.maxTradeUsd='1';assert.throws(()=>store.finish(work,{...report,personalPolicy:{...report.personalPolicy,maxTradeUsd:'1'}}),/REPORT_MISMATCH/);
 assert.equal(store.read('a',job.id)?.status,'RUNNING');assert.equal(store.finish(work,report),true);assert.equal(store.finish(work,report),false);const reopened=new AgentReviewStore(db,()=>true,()=>now);assert.deepEqual(reopened.read('a',job.id)?.report,JSON.parse(JSON.stringify(report)));assert.equal(JSON.stringify(reopened.read('a',job.id)).includes('grant'),false);db.close();
});
test('file-backed restart reclaims abandoned work and preserves final report after another reopen',()=>{
 const directory=mkdtempSync(join(tmpdir(),'firstbell-agent-review-')),path=join(directory,'review.sqlite');let db=new DatabaseSync(path),time=now;
 try{let store=new AgentReviewStore(db,()=>true,()=>time);const job=store.admit('a','grant',input('persisted')).job,old=store.claim('a',job.id)!;db.close();time+=30001;db=new DatabaseSync(path);store=new AgentReviewStore(db,()=>true,()=>time);const current=store.claim('a',job.id)!;assert.notEqual(current.claim,old.claim);assert.equal(store.finish(old),false);const report=buildBellReview(bell,defaultPolicy,2,[brief],time);assert.equal(store.finish(current,report),true);db.close();db=new DatabaseSync(path);store=new AgentReviewStore(db,()=>true,()=>time);assert.equal(store.read('a',job.id)?.report?.bell.contentHash,'hash');assert.equal(store.read('a',job.id)?.status,'COMPLETE');}finally{db.close();rmSync(directory,{recursive:true,force:true});}
});
