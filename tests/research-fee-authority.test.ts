import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ResearchFeeAuthorityStore} from '../lib/research/fee-authority.ts';
import type {StockAnalystChallenge} from '../lib/research/stockanalyst.ts';
const wallet='0x'+'1'.repeat(40),asset='0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d',session='a'.repeat(64),options={enabled:true,explicitHumanApproval:true,periodLimitAtomic:'100000000000000000'};
const challenge={x402Version:2,resource:{url:'https://stock-agent.bnbchain.org/x402/analyze/async',description:'analysis',mimeType:'application/json'},accepts:[{scheme:'exact',network:'eip155:56',amount:'100000000000000000',asset,payTo:'0xd10bddc20e4dc42a1a19a9653e994991e25b8153',maxTimeoutSeconds:600,extra:{name:'World Liberty Financial USD',version:'1',assetTransferMethod:'eip3009',signerAddress:'0x'+'2'.repeat(40)}}]} as StockAnalystChallenge;
function setup(){const db=new DatabaseSync(':memory:');let now=1000;const store=new ResearchFeeAuthorityStore(db,()=>now,()=>true),offer=store.save('owner',wallet,'b'.repeat(64),challenge);return {db,store,offer,time:(value:number)=>{now=value;}};}
test('research fee needs enabled write gate, exact owner wallet offer and human confirmation',()=>{const s=setup();assert.equal(s.store.read('other',s.offer.id),undefined);for(const flags of [{...options,enabled:false},{...options,explicitHumanApproval:false}])assert.throws(()=>s.store.approve('owner',s.offer.id,wallet,s.offer.fingerprint,asset,session,flags),/DISABLED/);assert.throws(()=>s.store.approve('other',s.offer.id,wallet,s.offer.fingerprint,asset,session,options),/CHANGED/);assert.throws(()=>s.store.approve('owner',s.offer.id,wallet,'c'.repeat(64),asset,session,options),/CHANGED/);s.db.close();});
test('approval is idempotent and claims are single use with exact session binding',()=>{const s=setup(),g=s.store.approve('owner',s.offer.id,wallet,s.offer.fingerprint,asset,session,options);assert.equal(g.financialScope,'EXACT_RESEARCH_FEE_ONLY');assert.deepEqual(s.store.approve('owner',s.offer.id,wallet,s.offer.fingerprint,asset,session,options),g);assert.throws(()=>s.store.claim('owner',s.offer.id,wallet,'c'.repeat(64)),/UNAVAILABLE/);assert.equal(s.store.claim('owner',s.offer.id,wallet,session).state,'CLAIMED');assert.throws(()=>s.store.claim('owner',s.offer.id,wallet,session),/UNAVAILABLE/);assert.throws(()=>s.store.revoke('owner',s.offer.id),/RECONCILIATION/);s.db.close();});
test('claimed unknown fees retain wallet-wide budget even after grant expiry',()=>{const s=setup();s.store.approve('owner',s.offer.id,wallet,s.offer.fingerprint,asset,session,options);s.store.claim('owner',s.offer.id,wallet,session);s.time(999999);const other=s.store.save('other-owner',wallet,'c'.repeat(64),challenge);assert.throws(()=>s.store.approve('other-owner',other.id,wallet,other.fingerprint,asset,session,options),/BUDGET/);s.db.close();});
test('revoked approvals and expired offers cannot become spending claims',()=>{const s=setup();s.store.approve('owner',s.offer.id,wallet,s.offer.fingerprint,asset,session,options);assert.equal(s.store.revoke('owner',s.offer.id).state,'REVOKED');assert.throws(()=>s.store.claim('owner',s.offer.id,wallet,session),/UNAVAILABLE/);s.time(s.offer.expiresAt);assert.throws(()=>s.store.approve('owner',s.offer.id,wallet,s.offer.fingerprint,asset,session,options),/CHANGED/);s.db.close();});
test('parent session revocation blocks approval and claim without releasing an existing hold',()=>{
 const db=new DatabaseSync(':memory:');let valid=false;const store=new ResearchFeeAuthorityStore(db,()=>1000,()=>valid),offer=store.save('owner',wallet,'b'.repeat(64),challenge);
 assert.throws(()=>store.approve('owner',offer.id,wallet,offer.fingerprint,asset,session,options),/CHANGED/);
 valid=true;store.approve('owner',offer.id,wallet,offer.fingerprint,asset,session,options);valid=false;
 assert.throws(()=>store.claim('owner',offer.id,wallet,session),/UNAVAILABLE/);assert.equal(store.grant('owner',offer.id)?.state,'APPROVED');
 valid=true;const second=store.save('other',wallet,'c'.repeat(64),challenge);assert.throws(()=>store.approve('other',second.id,wallet,second.fingerprint,asset,session,options),/BUDGET/);
 db.close();
});
test('missing parent session validator fails closed',()=>{
 const db=new DatabaseSync(':memory:'),store=new ResearchFeeAuthorityStore(db,()=>1000),offer=store.save('owner',wallet,'b'.repeat(64),challenge);
 assert.throws(()=>store.approve('owner',offer.id,wallet,offer.fingerprint,asset,session,options),/CHANGED/);db.close();
});

