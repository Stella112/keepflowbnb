import {createHash,randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {bellInputSchema,policySchema,type Flow,type Policy} from '../paper/model.ts';
import {effectiveBellPolicy} from './rules.ts';
import {toUnits,fromUnits} from '../binance/amounts.ts';
import type {Intent} from './intents/model.ts';
export type BasketLegState='PLANNED'|'PREPARING'|'APPROVAL_REQUIRED'|'APPROVAL_STARTED'|'APPROVAL_PENDING'|'SWAP_READY'|'SWAP_STARTED'|'SWAP_PENDING'|'CONFIRMED'|'REVERTED'|'BLOCKED'|'UNKNOWN'|'CANCELLED';
export type BasketLeg={ticker:Flow['assets'][number]['ticker'];amount:string;state:BasketLegState;intentId?:string;preparationRequestIds?:string[];approvalId?:string;operation?:'APPROVAL'|'SWAP';approvalHash?:string;actualSpendUsd?:string;transactionHash?:string;confirmations?:number};
export type BasketSession={id:string;requestId:string;account:string;wallet:string;bell:{id:string;version:number;contentHash:string};policyVersion:number;personalPolicy:Policy;effectivePolicy:Policy;amount:string;retainedReserveUsd:string;state:'ACTIVE'|'PARTIAL_STOP'|'COMPLETE'|'CANCELLED';revision:number;createdAt:string;legs:BasketLeg[];reason:string};
export class BasketSessionStore{
 private db:DatabaseSync;
 constructor(db:DatabaseSync){this.db=db;db.exec('CREATE TABLE IF NOT EXISTS live_basket_sessions(id TEXT PRIMARY KEY,account TEXT NOT NULL,wallet TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(account,request_id))');}
 private atomic<T>(fn:()=>T){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
 read(account:string,id:string):BasketSession|undefined{const row=this.db.prepare('SELECT payload FROM live_basket_sessions WHERE id=? AND account=?').get(id,account);return row?JSON.parse(String(row.payload)):undefined;}
 create(account:string,wallet:string,requestId:string,bell:Flow,personal:Policy,policyVersion:number,amount:string,now=Date.now()){
  if(!account||account.length>100||!/^0x[0-9a-fA-F]{40}$/.test(wallet)||!/^[0-9a-f-]{36}$/.test(requestId)||!Number.isSafeInteger(policyVersion)||policyVersion<0)throw Error('INVALID_BASKET_OWNER');wallet=wallet.toLowerCase();
  bellInputSchema.parse({title:bell.title,description:bell.description,assets:bell.assets,reserveBps:bell.reserveBps,policy:bell.policy});policySchema.parse(personal);const total=toUnits(amount,6);if(total<=0n||total>100_000_000n)throw Error('BASKET_AMOUNT_LIMIT');
  const policy=effectiveBellPolicy(bell,personal),normalized={account,wallet,requestId,bell:{id:bell.id,version:bell.version,contentHash:bell.contentHash},personalPolicy:policySchema.parse(personal),effectivePolicy:policy,policyVersion,amount:fromUnits(total,6)},fingerprint=createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  return this.atomic(()=>{const prior=this.db.prepare('SELECT id,fingerprint FROM live_basket_sessions WHERE account=? AND request_id=?').get(account,requestId);if(prior){if(prior.fingerprint!==fingerprint)throw Error('BASKET_REQUEST_CONFLICT');return this.read(account,String(prior.id))!;}
   if(this.db.prepare("SELECT id FROM live_basket_sessions WHERE (account=? OR wallet=?) AND json_extract(payload,'$.state') IN ('ACTIVE','PARTIAL_STOP') AND EXISTS (SELECT 1 FROM json_each(json_extract(payload,'$.legs')) WHERE json_extract(value,'$.state') IN ('PLANNED','PREPARING','APPROVAL_REQUIRED','APPROVAL_STARTED','APPROVAL_PENDING','SWAP_READY','SWAP_STARTED','SWAP_PENDING','UNKNOWN'))").get(account,wallet))throw Error('BASKET_ALREADY_ACTIVE');
   const legs=bell.assets.map(asset=>({ticker:asset.ticker,amount:fromUnits(total*BigInt(asset.weightBps)/10000n,6),state:'PLANNED' as const})).filter(leg=>toUnits(leg.amount,6)>0n),allocated=legs.reduce((sum,leg)=>sum+toUnits(leg.amount,6),0n);
   const value:BasketSession={...normalized,id:randomUUID(),state:legs.length?'ACTIVE':'COMPLETE',revision:0,createdAt:new Date(now).toISOString(),legs,retainedReserveUsd:fromUnits(total-allocated,6),reason:'Sequential contribution-only basket. No deposit, approval or purchase has occurred.'};this.db.prepare('INSERT INTO live_basket_sessions VALUES (?,?,?,?,?,?)').run(value.id,account,wallet,requestId,fingerprint,JSON.stringify(value));return value;
  });
 }
 cancel(account:string,id:string,expectedRevision:number,financiallySafe?:(session:Readonly<BasketSession>)=>boolean){return this.atomic(()=>{
  const current=this.read(account,id);if(!current)throw Error('BASKET_NOT_FOUND');if(current.revision!==expectedRevision)throw Error('BASKET_CHANGED');
  if(current.state==='CANCELLED')return current;
  const safe=['PLANNED','BLOCKED','SWAP_READY','APPROVAL_REQUIRED'];
  if(current.state==='COMPLETE'||current.legs.some(leg=>leg.state!=='CONFIRMED'&&!safe.includes(leg.state)))throw Error('BASKET_CANCELLATION_UNSAFE');
  if(financiallySafe&&!financiallySafe(current))throw Error('BASKET_CANCELLATION_UNSAFE');
  const next:BasketSession={...current,state:'CANCELLED',revision:current.revision+1,reason:'Remaining unstarted plan legs cancelled. Completed receipts preserved; no financial hold released.',legs:current.legs.map(leg=>leg.state==='CONFIRMED'?leg:{...leg,state:'CANCELLED'})};
  this.db.prepare('UPDATE live_basket_sessions SET payload=? WHERE id=? AND account=?').run(JSON.stringify(next),id,account);return next;
 });}

 update(previous:BasketSession,next:BasketSession){return this.atomic(()=>{const current=this.read(previous.account,previous.id);if(!current||current.revision!==previous.revision)throw Error('BASKET_CHANGED');if(current.state==='CANCELLED')throw Error('BASKET_TERMINAL');const immutable=(value:BasketSession)=>JSON.stringify({...value,state:undefined,revision:undefined,reason:undefined,legs:value.legs.map(leg=>({ticker:leg.ticker,amount:leg.amount}))});if(immutable(current)!==immutable(next)||next.revision!==previous.revision+1)throw Error('BASKET_PIN_CHANGED');const active=current.legs.findIndex(leg=>leg.state!=='CONFIRMED');if(current.legs.some((leg,index)=>index!==active&&JSON.stringify(leg)!==JSON.stringify(next.legs[index])))throw Error('SEQUENTIAL_LEG_REQUIRED');if(next.state==='COMPLETE'&&!next.legs.every(leg=>leg.state==='CONFIRMED'))throw Error('SETTLEMENT_REQUIRED');this.db.prepare('UPDATE live_basket_sessions SET payload=? WHERE id=? AND account=?').run(JSON.stringify(next),previous.id,previous.account);return next;});}
}
type SettledLeg={state:'PENDING'|'UNKNOWN'|'CONFIRMED'|'REVERTED';confirmations?:number;hash?:string;actualSpendUsd?:string};
export type BasketDependencies={enabled?:boolean;store:BasketSessionStore;
 // Must resolve current opaque-session/agent authority, linked wallet, Flow and policy pins.
 authorize:(session:Readonly<BasketSession>)=>Promise<boolean>;
 prepare:(session:Readonly<BasketSession>,leg:Readonly<BasketLeg>)=>Promise<Intent>;
 beginApproval:(session:Readonly<BasketSession>,intentId:string)=>Promise<{id:string;handoff:unknown}>;
 approvalStatus:(session:Readonly<BasketSession>,intentId:string)=>Promise<SettledLeg>;
 beginSwap:(session:Readonly<BasketSession>,intentId:string)=>Promise<{handoff:unknown}>;
 swapStatus:(session:Readonly<BasketSession>,intentId:string)=>Promise<SettledLeg>;
};
// Server adapters invoke guarded per-leg handoff/reconciliation services. This module
// never signs, submits wallet RPC, sells, creates deposits or releases budget holds.
export function basketSessionService(deps:BasketDependencies){return {async step(account:string,id:string,action:'PREPARE'|'APPROVE'|'SUBMIT'|'RECONCILE'){
 let session=deps.store.read(account,id);if(!session)throw Error('BASKET_NOT_FOUND');if(session.state==='COMPLETE'||session.state==='CANCELLED')return {session};
 const index=session.legs.findIndex(leg=>leg.state!=='CONFIRMED');if(index<0)return {session};let leg=session.legs[index];
 const change=(patch:Partial<BasketLeg>,reason:string,state:BasketSession['state']='ACTIVE')=>{const next=structuredClone(session!);next.revision++;next.state=state;next.reason=reason;next.legs[index]={...next.legs[index],...patch};session=deps.store.update(session!,next);leg=session.legs[index];return session;};
 if(action!=='RECONCILE'&&!await deps.authorize(Object.freeze(structuredClone(session))))throw Error('BASKET_AUTHORIZATION_CHANGED');
 try{
  if(action==='PREPARE'){
   if(leg.state!=='PLANNED')throw Error('LEG_NOT_PREPARABLE');if(toUnits(leg.amount,6)>toUnits(session.effectivePolicy.maxTradeUsd,6))return {session:change({state:'BLOCKED'},'This leg exceeds the effective Flow/personal trade cap.','PARTIAL_STOP')};change({state:'PREPARING',operation:undefined,preparationRequestIds:[...(leg.preparationRequestIds??[]),randomUUID()]},'Preparing the current leg before any wallet action.');
   const intent=await deps.prepare(Object.freeze(structuredClone(session)),Object.freeze({...leg}));
   if(!await deps.authorize(Object.freeze(structuredClone(session))))return {session:change({state:'BLOCKED'},'Authority or pinned strategy/rules changed during preparation.','PARTIAL_STOP')};
   if(intent.wallet.toLowerCase()!==session.wallet||intent.input.ticker!==leg.ticker||toUnits(intent.input.amount,6)!==toUnits(leg.amount,6)||!intent.policySnapshot||JSON.stringify(policySchema.parse(intent.policySnapshot))!==JSON.stringify(policySchema.parse(session.personalPolicy)))throw Error('LEG_INTENT_MISMATCH');
   if(intent.policy?.allowed!==true)throw Error('LEG_POLICY_BLOCKED');
   if(intent.approval){return {session:change({state:'APPROVAL_REQUIRED',intentId:intent.id},'Exact token approval must be separately confirmed before a fresh purchase intent.')};}
   if(intent.status!=='READY_READ_ONLY')return {session:change({state:'BLOCKED',intentId:intent.id},'Current leg failed verified preparation; later purchases stopped.','PARTIAL_STOP')};
   return {session:change({state:'SWAP_READY',intentId:intent.id},'Exact swap is prepared; explicit enabled submission remains required.')};
  }
  if(action==='APPROVE'||action==='SUBMIT'){
   if(deps.enabled!==true)throw Error('EXECUTION_DISABLED');
   const approval=action==='APPROVE';if(leg.state!==(approval?'APPROVAL_REQUIRED':'SWAP_READY')||!leg.intentId)throw Error('LEG_ACTION_NOT_READY');
   change({state:approval?'APPROVAL_STARTED':'SWAP_STARTED',operation:approval?'APPROVAL':'SWAP'},'Durable action start recorded; this wallet handoff will not be retried.');
   const result=approval?await deps.beginApproval(Object.freeze(structuredClone(session)),leg.intentId):await deps.beginSwap(Object.freeze(structuredClone(session)),leg.intentId);
   const approvalId=approval&&'id' in result&&typeof result.id==='string'?result.id:undefined;if(approval&&!approvalId)throw Error('APPROVAL_ID_REQUIRED');
   return {session:change({state:approval?'APPROVAL_PENDING':'SWAP_PENDING',...(approvalId?{approvalId}:{})},'Waiting for actual chain reconciliation before progressing.'),handoff:result.handoff};
  }
  if(['PREPARING','APPROVAL_STARTED','SWAP_STARTED'].includes(leg.state))return {session:change({state:'UNKNOWN'},'Interrupted action needs independent per-leg reconciliation; no spending retry.','PARTIAL_STOP')};
  if(leg.intentId&&leg.operation==='APPROVAL'&&['APPROVAL_PENDING','UNKNOWN'].includes(leg.state)){
   const status=await deps.approvalStatus(Object.freeze(structuredClone(session)),leg.intentId);
   if(status.state==='CONFIRMED'&&(status.confirmations??0)>=12&&/^0x[0-9a-fA-F]{64}$/.test(status.hash??''))return {session:change({state:'PLANNED',intentId:undefined,approvalId:undefined,operation:undefined,approvalHash:status.hash},'Exact approval finalized. Prepare a fresh quote and simulation before purchase.')};
   if(status.state==='REVERTED')return {session:change({state:'REVERTED'},'Approval reverted; later purchases stopped.','PARTIAL_STOP')};return {session};
  }
  if(leg.intentId&&leg.operation==='SWAP'&&['SWAP_PENDING','UNKNOWN'].includes(leg.state)){
   const status=await deps.swapStatus(Object.freeze(structuredClone(session)),leg.intentId);
   if(status.state==='CONFIRMED'&&(status.confirmations??0)>=12&&/^0x[0-9a-fA-F]{64}$/.test(status.hash??'')&&status.actualSpendUsd!==undefined){if(toUnits(status.actualSpendUsd,6)>toUnits(leg.amount,6))throw Error('LEG_SPEND_OVERRUN');const next=change({state:'CONFIRMED',actualSpendUsd:status.actualSpendUsd,transactionHash:status.hash,confirmations:status.confirmations},'Current leg settled with verified actual debit; remaining legs require fresh checks.');if(next.legs.every(item=>item.state==='CONFIRMED')){const complete={...next,state:'COMPLETE' as const,revision:next.revision+1,reason:'All basket legs have independently verified settled receipts.'};session=deps.store.update(next,complete);}return {session};}
   if(status.state==='REVERTED')return {session:change({state:'REVERTED'},'Current purchase reverted; completed legs are preserved and later purchases stopped.','PARTIAL_STOP')};return {session};
  }
  return {session};
 }catch(error){if(error instanceof Error&&['EXECUTION_DISABLED','LEG_ACTION_NOT_READY','LEG_NOT_PREPARABLE'].includes(error.message))throw error;const started=['APPROVAL_STARTED','SWAP_STARTED','APPROVAL_PENDING','SWAP_PENDING','UNKNOWN'].includes(leg.state);return {session:change({state:started?'UNKNOWN':'BLOCKED'},started?'Outcome requires per-leg reconciliation. No automatic retry or later purchase.':'Preparation failed; later purchases stopped.','PARTIAL_STOP')};}
}};}
