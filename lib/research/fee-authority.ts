import {createHash,randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {challengeSchema,type StockAnalystChallenge} from './stockanalyst.ts';
const allowedAssets=new Set(['0xce24439f2d9c6a2289f741120fe202248b666666','0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d']);
export type ResearchFeeOffer={id:string;wallet:string;fingerprint:string;requestHash:string;challenge:StockAnalystChallenge;createdAt:number;expiresAt:number};
export type ResearchFeeGrant={offerId:string;wallet:string;asset:string;amountAtomic:string;state:'APPROVED'|'CLAIMED'|'REVOKED';expiresAt:number;financialScope:'EXACT_RESEARCH_FEE_ONLY'};
// Approval records grant one research fee only. They never authorize stock
// purchases. The server's disabled write gate must be checked before approve.
export class ResearchFeeAuthorityStore{
 private db:DatabaseSync;private now:()=>number;private sessionValid:(owner:string,wallet:string,binding:string,now:number)=>boolean;
 constructor(db:DatabaseSync,now:()=>number=Date.now,sessionValid:(owner:string,wallet:string,binding:string,now:number)=>boolean=()=>false){this.db=db;this.now=now;this.sessionValid=sessionValid;db.exec('CREATE TABLE IF NOT EXISTS research_fee_offers(id TEXT PRIMARY KEY,owner TEXT NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS research_fee_grants(offer_id TEXT PRIMARY KEY,owner TEXT NOT NULL,session_binding TEXT NOT NULL,payload TEXT NOT NULL)');}
 private atomic<T>(fn:()=>T){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
 save(owner:string,wallet:string,requestHash:string,challenge:StockAnalystChallenge){if(!owner||!/^0x[0-9a-fA-F]{40}$/.test(wallet)||! /^[a-f0-9]{64}$/.test(requestHash)||challenge.resource.url!=='https://stock-agent.bnbchain.org/x402/analyze/async')throw Error('INVALID_RESEARCH_OFFER');
  challenge=challengeSchema.parse(challenge);const now=this.now(),fingerprint=createHash('sha256').update(JSON.stringify([wallet.toLowerCase(),requestHash,challenge])).digest('hex'),offer:ResearchFeeOffer={id:randomUUID(),wallet:wallet.toLowerCase(),requestHash,fingerprint,challenge:structuredClone(challenge),createdAt:now,expiresAt:now+300000};
  return this.atomic(()=>{if(Number(this.db.prepare('SELECT COUNT(*) AS n FROM research_fee_offers WHERE owner=? AND CAST(json_extract(payload,\'$.expiresAt\') AS INTEGER)>?').get(owner,now)?.n??0)>=20)throw Error('RESEARCH_OFFER_LIMIT');this.db.prepare('INSERT INTO research_fee_offers VALUES(?,?,?)').run(offer.id,owner,JSON.stringify(offer));return offer;});
 }
 read(owner:string,id:string):ResearchFeeOffer|undefined{const row=this.db.prepare('SELECT payload FROM research_fee_offers WHERE id=? AND owner=?').get(id,owner);return row?JSON.parse(String(row.payload)):undefined;}
 grant(owner:string,id:string):ResearchFeeGrant|undefined{const row=this.db.prepare('SELECT payload FROM research_fee_grants WHERE offer_id=? AND owner=?').get(id,owner);return row?JSON.parse(String(row.payload)):undefined;}
 approve(owner:string,id:string,wallet:string,fingerprint:string,asset:string,sessionBinding:string,options:{enabled:boolean;explicitHumanApproval:boolean;periodLimitAtomic:string}){
  if(options.enabled!==true||options.explicitHumanApproval!==true)throw Error('RESEARCH_PAYMENTS_DISABLED');
  if(! /^[a-f0-9]{64}$/.test(sessionBinding)||! /^\d{1,78}$/.test(options.periodLimitAtomic)||!allowedAssets.has(asset.toLowerCase()))throw Error('RESEARCH_AUTHORITY_INVALID');
  return this.atomic(()=>{const offer=this.read(owner,id),now=this.now();if(!this.sessionValid(owner,wallet.toLowerCase(),sessionBinding,now)||!offer||offer.wallet!==wallet.toLowerCase()||offer.fingerprint!==fingerprint||now<offer.createdAt||now>=offer.expiresAt)throw Error('RESEARCH_OFFER_CHANGED');const requirement=offer.challenge.accepts.find(item=>item.asset.toLowerCase()===asset.toLowerCase());
   if(!requirement||requirement.network!=='eip155:56'||requirement.payTo.toLowerCase()!=='0xd10bddc20e4dc42a1a19a9653e994991e25b8153'||requirement.amount!=='100000000000000000'||requirement.extra?.assetTransferMethod!=='eip3009')throw Error('RESEARCH_FEE_UNSUPPORTED');
   const old=this.grant(owner,id);if(old){const row=this.db.prepare('SELECT session_binding FROM research_fee_grants WHERE offer_id=?').get(id);if(old.wallet!==offer.wallet||old.asset!==asset.toLowerCase()||row?.session_binding!==sessionBinding)throw Error('RESEARCH_GRANT_CONFLICT');return old;}
   const held=this.db.prepare('SELECT payload FROM research_fee_grants').all().reduce((sum,row)=>{const g=JSON.parse(String(row.payload)) as ResearchFeeGrant;return g.wallet===offer.wallet&&g.asset===asset.toLowerCase()&&(g.state==='CLAIMED'||g.state==='APPROVED'&&g.expiresAt>now)?sum+BigInt(g.amountAtomic):sum;},0n);
   if(held+BigInt(requirement.amount)>BigInt(options.periodLimitAtomic))throw Error('RESEARCH_FEE_BUDGET_EXCEEDED');
   const grant:ResearchFeeGrant={offerId:id,wallet:offer.wallet,asset:asset.toLowerCase(),amountAtomic:requirement.amount,state:'APPROVED',expiresAt:offer.expiresAt,financialScope:'EXACT_RESEARCH_FEE_ONLY'};this.db.prepare('INSERT INTO research_fee_grants VALUES(?,?,?,?)').run(id,owner,sessionBinding,JSON.stringify(grant));return grant;
  });
 }
 claim(owner:string,id:string,wallet:string,sessionBinding:string){return this.atomic(()=>{const grant=this.grant(owner,id),row=this.db.prepare('SELECT session_binding FROM research_fee_grants WHERE offer_id=? AND owner=?').get(id,owner);if(!this.sessionValid(owner,wallet.toLowerCase(),sessionBinding,this.now())||!grant||grant.state!=='APPROVED'||grant.wallet!==wallet.toLowerCase()||row?.session_binding!==sessionBinding||grant.expiresAt<=this.now())throw Error('RESEARCH_GRANT_UNAVAILABLE');const next={...grant,state:'CLAIMED' as const};this.db.prepare('UPDATE research_fee_grants SET payload=? WHERE offer_id=?').run(JSON.stringify(next),id);return next;});}
 revoke(owner:string,id:string){return this.atomic(()=>{const grant=this.grant(owner,id);if(!grant)throw Error('RESEARCH_GRANT_NOT_FOUND');if(grant.state==='CLAIMED')throw Error('RESEARCH_PAYMENT_OUTCOME_REQUIRES_RECONCILIATION');const next={...grant,state:'REVOKED' as const};this.db.prepare('UPDATE research_fee_grants SET payload=? WHERE offer_id=?').run(JSON.stringify(next),id);return next;});}
}

