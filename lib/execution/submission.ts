import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Intent,PinnedTransaction} from './intents/model.ts';
import {verifiedWallet} from './intents/model.ts';
import {toUnits} from '../binance/amounts.ts';
import {policySchema,type Policy} from '../paper/model.ts';
import type {BudgetStore} from './budget-store.ts';
import {SubmissionStore,type SubmissionRecord} from './submission-store.ts';
const transactionSchema=z.object({chainId:z.literal(56),from:z.string().regex(/^0x[0-9a-fA-F]{40}$/),to:z.string().regex(/^0x[0-9a-fA-F]{40}$/),data:z.string().regex(/^0x(?:[0-9a-fA-F]{2})+$/),value:z.string().regex(/^\d+$/),gas:z.string().regex(/^\d+$/),gasPrice:z.string().regex(/^\d+$/)}).strict();
export type SubmissionContext={account:string;wallet:string;intentId:string;confirmedFingerprint:string;trustedBudgetPolicy?:Policy};
export type SubmissionDependencies={
 // Explicit trusted server operator gate; absent/false always disables signing.
 enabled?:boolean;store:SubmissionStore;budget:BudgetStore;now?:()=>number;
 readOwnedIntent:(account:string,intentId:string)=>Intent|undefined;
 // Fresh chain, identity, policy, allowance, balance and EXACT pinned simulation checks.
 // Transport must independently derive account/wallet; this callback is trusted server code.
 revalidate:(context:Readonly<SubmissionContext>,intent:Readonly<Intent>)=>Promise<{intent:Intent;policy:Policy;wallet:string;allowanceSufficient:boolean}>;
 wallet:{submitExactTransaction:(transaction:Readonly<PinnedTransaction>)=>Promise<string>};
 // Read-only verifier must freshly authenticate owner and verify actual chain/from/to/data/value.
 verifyObservedHash?:(account:string,intent:Readonly<Intent>,hash:string)=>Promise<boolean>;
};
export function submissionFingerprint(intent:Intent){return createHash('sha256').update(JSON.stringify({id:intent.id,revision:intent.revision,wallet:intent.wallet,input:intent.input,quote:intent.quote,transaction:intent.transaction,approval:intent.approval??null,policy:intent.policySnapshot})).digest('hex');}
export function recoverExistingSubmission(service:{status:(account:string,intentId:string)=>SubmissionRecord|undefined;recover:(account:string,intentId:string)=>SubmissionRecord},account:string,intentId:string){return service.status(account,intentId)?service.recover(account,intentId):undefined;}
function ready(intent:Intent,wallet:string,now:number){
 if(intent.status!=='READY_READ_ONLY'||!intent.quote||!intent.transaction||!intent.policySnapshot||intent.approval||intent.policy?.allowed!==true||intent.simulation?.swapStatus!=='SUCCESS'||intent.simulation.approvalStatus==='FAILED')throw Error('INTENT_NOT_SUBMITTABLE');
 const tx=transactionSchema.parse(intent.transaction);if(verifiedWallet(intent.wallet)!==wallet||verifiedWallet(tx.from)!==wallet||BigInt(tx.value)!==0n||BigInt(tx.gas)<=0n||BigInt(tx.gasPrice)<=0n)throw Error('TRANSACTION_BINDING_MISMATCH');
 const expiry=Date.parse(intent.quote.localFreshUntil),fetched=Date.parse(intent.quote.fetchedAt),simulated=Date.parse(intent.simulation.checkedAt);
 if(!Number.isFinite(now)||!Number.isFinite(expiry)||!Number.isFinite(fetched)||!Number.isFinite(simulated)||fetched>now||simulated>now||expiry<=now||now-fetched>25000||now-simulated>25000)throw Error('INTENT_EXPIRED');
 if(toUnits(intent.input.amount,intent.quote.fundingDecimals).toString()!==intent.quote.amountUnits||intent.quote.fundingDecimals!==18||intent.quote.funding.toLowerCase()!=='0x55d398326f99059ff775485246999027b3197955')throw Error('FUNDING_AMOUNT_MISMATCH');
 return tx as PinnedTransaction;
}
// No live caller, RPC broadcaster or wallet signer is installed by this module.
// An ambiguous start is terminal for submit(): status/reconcile can continue, never spending retry.
export function submissionService(deps:SubmissionDependencies){const now=deps.now??Date.now;
 const run=async(context:SubmissionContext,handoff?: (record:SubmissionRecord,transaction:Readonly<PinnedTransaction>)=>void):Promise<SubmissionRecord>=>{
  if(deps.enabled!==true)throw Error('EXECUTION_DISABLED');
  const wallet=verifiedWallet(context.wallet),owned=deps.readOwnedIntent(context.account,context.intentId);if(!owned||owned.id!==context.intentId)throw Error('INTENT_NOT_FOUND');const intent=structuredClone(owned);
  const fingerprint=submissionFingerprint(intent);if(context.confirmedFingerprint!==fingerprint)throw Error('EXACT_CONFIRMATION_REQUIRED');
  const previous=deps.store.read(context.account,intent.id);if(previous){if(previous.fingerprint!==fingerprint)throw Error('SUBMISSION_CONFLICT');return previous;}
  ready(intent,wallet,now());
  const claim=deps.store.claim(context.account,intent.id,fingerprint,now());if(!claim.created)return claim.record;
  let reservationId:string|undefined,started=false;
  try{
   const fresh=await deps.revalidate(Object.freeze({...context,wallet}),Object.freeze(structuredClone(intent)));
   if(submissionFingerprint(fresh.intent)!==fingerprint||verifiedWallet(fresh.wallet)!==wallet||!fresh.allowanceSufficient||JSON.stringify(policySchema.parse(fresh.policy))!==JSON.stringify(policySchema.parse(intent.policySnapshot)))throw Error('FRESH_VALIDATION_MISMATCH');
   const transaction=ready(fresh.intent,wallet,now()),policy=policySchema.parse(fresh.policy);
   const budgetPolicy=context.trustedBudgetPolicy===undefined?policy:policySchema.parse(context.trustedBudgetPolicy);
   for(const key of ['maxTradeUsd','maxDailySpendUsd','maxWeeklySpendUsd'] as const){const original=policy[key],narrowed=budgetPolicy[key];if(original!==undefined&&(narrowed===undefined||toUnits(narrowed,6)>toUnits(original,6)))throw Error('BUDGET_POLICY_WIDENED');}
   const reservation=deps.budget.reserve({account:context.account,requestId:intent.requestId,intentId:intent.id,wallet,amount:intent.input.amount,maxTradeUsd:budgetPolicy.maxTradeUsd,...(budgetPolicy.maxDailySpendUsd===undefined?{}:{maxDailySpendUsd:budgetPolicy.maxDailySpendUsd}),...(budgetPolicy.maxWeeklySpendUsd===undefined?{}:{maxWeeklySpendUsd:budgetPolicy.maxWeeklySpendUsd})},now());reservationId=reservation.id;
   if(reservation.state!=='RESERVED')throw Error('BUDGET_ALREADY_STARTED');
   deps.store.transition(context.account,intent.id,'CLAIMED','RESERVED',now(),{reservationId});
   // Freshness checked again after durable reservation, before the irreversible boundary.
   ready(fresh.intent,wallet,now());
   const current=deps.readOwnedIntent(context.account,intent.id);if(!current||submissionFingerprint(current)!==fingerprint)throw Error('INTENT_CHANGED');
   deps.budget.submissionStarted(context.account,reservationId);started=true;
   deps.store.transition(context.account,intent.id,'RESERVED','SUBMISSION_STARTED',now());
   if(handoff){const record=deps.store.read(context.account,intent.id)!;handoff(record,Object.freeze(structuredClone(transaction)));return record;}
   const returned=await deps.wallet.submitExactTransaction(Object.freeze(structuredClone(transaction)));
   const hash=z.string().regex(/^0x[0-9a-fA-F]{64}$/).parse(returned).toLowerCase();
   deps.budget.bindHash(context.account,reservationId,hash);deps.budget.mark(context.account,reservationId,'PENDING');
   return deps.store.transition(context.account,intent.id,'SUBMISSION_STARTED','PENDING',now(),{hash});
  }catch{
   if(started){if(reservationId)deps.budget.mark(context.account,reservationId,'UNKNOWN');const record=deps.store.read(context.account,intent.id)!;if(record.state==='SUBMISSION_STARTED')return deps.store.transition(context.account,intent.id,'SUBMISSION_STARTED','UNKNOWN',now());return record;}
   if(reservationId){const reservation=deps.budget.read(context.account,reservationId);if(reservation?.state==='RESERVED')deps.budget.cancel(context.account,reservationId);}
   const record=deps.store.read(context.account,intent.id)!;return deps.store.transition(context.account,intent.id,record.state,'CANCELLED',now());
  }
 };
 return {
 submit:(context:SubmissionContext)=>run(context),
 // Callback is trusted server transport code, not client input. It must durably create
 // a one-time ticket before returning the transaction. Callback errors remain UNKNOWN.
 beginHandoff:(context:SubmissionContext,deliver:(record:SubmissionRecord,transaction:Readonly<PinnedTransaction>)=>void)=>run(context,deliver),
 recover(account:string,intentId:string){
  let record=deps.store.read(account,intentId);if(!record)throw Error('NOT_FOUND');
  const reservation=deps.budget.findIntent(account,intentId);if(!reservation)return record;
  if(record.state==='CLAIMED')record=deps.store.transition(account,intentId,'CLAIMED','RESERVED',now(),{reservationId:reservation.id});
  if(record.state==='RESERVED'&&['SUBMISSION_STARTED','UNKNOWN','PENDING','CONFIRMED','REVERTED'].includes(reservation.state))record=deps.store.transition(account,intentId,'RESERVED','SUBMISSION_STARTED',now());
  if(record.state==='SUBMISSION_STARTED')record=deps.store.transition(account,intentId,'SUBMISSION_STARTED',reservation.hash?'PENDING':'UNKNOWN',now(),reservation.hash?{hash:reservation.hash}:{});
  if(record.state==='UNKNOWN'&&reservation.hash)record=deps.store.transition(account,intentId,'UNKNOWN','PENDING',now(),{hash:reservation.hash});
  if(record.state==='RESERVED'&&reservation.state==='CANCELLED')record=deps.store.transition(account,intentId,'RESERVED','CANCELLED',now());
  return record;
 },
 status(account:string,intentId:string){return deps.store.read(account,intentId);},
 async observeHash(account:string,intentId:string,observedHash:string){
  const hash=z.string().regex(/^0x[0-9a-fA-F]{64}$/).parse(observedHash).toLowerCase(),record=deps.store.read(account,intentId),intent=deps.readOwnedIntent(account,intentId);
  if(!record?.reservationId||!intent||submissionFingerprint(intent)!==record.fingerprint||!['UNKNOWN','SUBMISSION_STARTED','PENDING'].includes(record.state)||!deps.verifyObservedHash)throw Error('HASH_RECOVERY_UNAVAILABLE');
  if(record.hash&&record.hash!==hash)throw Error('SUBMISSION_HASH_CONFLICT');
  if(!await deps.verifyObservedHash(account,Object.freeze(structuredClone(intent)),hash))throw Error('UNRELATED_TRANSACTION');
  deps.budget.bindHash(account,record.reservationId,hash);deps.budget.mark(account,record.reservationId,'PENDING');
  if(record.state==='PENDING')return deps.store.read(account,intentId)!;
  return deps.store.transition(account,intentId,record.state,'PENDING',now(),{hash});
 },
 // Only independently verified actual canonical settlement can release/account for holds.
 reconcile(account:string,intentId:string,evidence:unknown){const record=deps.store.read(account,intentId);if(!record?.reservationId||!record.hash)throw Error('BOUND_SUBMISSION_REQUIRED');const result=deps.budget.settle(account,record.reservationId,evidence,now());if(result.state!=='CONFIRMED'&&result.state!=='REVERTED')throw Error('SETTLEMENT_UNVERIFIED');if(record.state===result.state)return record;return deps.store.transition(account,intentId,record.state,result.state,now());}
};}
