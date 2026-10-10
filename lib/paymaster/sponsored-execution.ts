import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {keccak256,parseTransaction,recoverTransactionAddress,type Hex,type TransactionSerialized} from 'viem';
import {MEGAFUEL_ENDPOINT,type SponsorabilityResult} from './megafuel.ts';

export type SponsoredTransaction={chainId:56;type:'legacy';from:Hex;to:Hex;data:Hex;value:0n;gas:bigint;gasPrice:0n;nonce:number};
export type SponsoredJob={id:string;owner:string;intentId:string;fingerprint:string;transaction:{from:Hex;to:Hex;data:Hex;gas:string;nonce:number;chainId:56;gasPrice:'0';value:'0';type:'legacy'};state:'STARTED'|'UNKNOWN'|'BROADCASTED'|'CONFIRMED'|'REVERTED';hash?:Hex;sponsorName:string;createdAt:number;confirmedAt?:number;sponsorshipEvidence:'PROVIDER_ELIGIBILITY_AND_ZERO_GAS_ORIGINAL'|'CANONICAL_ZERO_GAS_ORIGINAL';sponsorPaymentVerified:false};
export type SponsoredDependencies={enabled:()=>boolean;now?:()=>number;authorize:(owner:string,intentId:string,fingerprint:string)=>Promise<boolean>;readOwnedCandidate:(owner:string,intentId:string,fingerprint:string)=>Promise<Omit<SponsoredTransaction,'nonce'>>;reserve:(owner:string,intentId:string,fingerprint:string)=>Promise<void>;releaseBeforeSigning:(owner:string,intentId:string)=>Promise<void>;nonce:(wallet:Hex)=>Promise<number>;eligibility:(tx:SponsoredTransaction)=>Promise<SponsorabilityResult>;simulateZeroGas:(tx:SponsoredTransaction)=>Promise<boolean>;signRaw:(tx:SponsoredTransaction)=>Promise<Hex>;chain:{transaction:(hash:Hex)=>Promise<{hash:Hex;blockNumber:bigint;blockHash:Hex;from:Hex;to:Hex;input:Hex;value:bigint;gas:bigint;gasPrice:bigint;nonce:number;chainId:number}>;receipt:(hash:Hex)=>Promise<{transactionHash:Hex;status:'success'|'reverted';blockNumber:bigint;blockHash:Hex;effectiveGasPrice:bigint}>;blockNumber:()=>Promise<bigint>;blockHash:(number:bigint)=>Promise<Hex>;verifyEffects:(intentId:string,hash:Hex)=>Promise<boolean>};fetcher?:typeof fetch};
function fingerprint(tx:SponsoredTransaction){return createHash('sha256').update(JSON.stringify([56,tx.from.toLowerCase(),tx.to.toLowerCase(),tx.data.toLowerCase(),'0',tx.gas.toString(),'0',tx.nonce])).digest('hex');}
function valid(tx:SponsoredTransaction){if(tx.chainId!==56||tx.type!=='legacy'||tx.value!==0n||tx.gasPrice!==0n||tx.gas<=0n||tx.gas>1_000_000n||!Number.isSafeInteger(tx.nonce)||tx.nonce<0||!/^0x[\da-f]{40}$/i.test(tx.from)||!/^0x[\da-f]{40}$/i.test(tx.to)||!/^0x[\da-f]{8}(?:[\da-f]{2})*$/i.test(tx.data)||tx.data.length>20002)throw Error('Invalid sponsored transaction');}
/** No private keys, raw signatures or provider response bodies are persisted.
 * STARTED is committed before signing. Ambiguity permanently freezes retries.
 * Trusted callbacks must share the app wallet-wide reservation and intent journal.
 * This engine never falls back to a transaction paid by the owner. */
export class SponsoredExecution {
 private db:DatabaseSync;private deps:SponsoredDependencies;
 constructor(db:DatabaseSync,deps:SponsoredDependencies){this.db=db;this.deps=deps;db.exec('CREATE TABLE IF NOT EXISTS sponsored_execution(id TEXT PRIMARY KEY,owner TEXT NOT NULL,intent_id TEXT UNIQUE NOT NULL,fingerprint TEXT NOT NULL,state TEXT NOT NULL,hash TEXT UNIQUE,payload TEXT NOT NULL)');}
 get(owner:string,id:string):SponsoredJob|null{const row=this.db.prepare('SELECT payload FROM sponsored_execution WHERE owner=? AND id=?').get(owner,id);return row?JSON.parse(String(row.payload)):null;}
 private async authorized(owner:string,intentId:string,confirmedFingerprint:string,candidate:Omit<SponsoredTransaction,'nonce'>){
  if(!await this.deps.authorize(owner,intentId,confirmedFingerprint))return false;
  const trusted=await this.deps.readOwnedCandidate(owner,intentId,confirmedFingerprint);
  valid({...trusted,nonce:0});valid({...candidate,nonce:0});
  return fingerprint({...trusted,nonce:0})===fingerprint({...candidate,nonce:0});
 }
 private save(job:SponsoredJob){this.db.prepare('UPDATE sponsored_execution SET state=?,hash=?,payload=? WHERE owner=? AND id=?').run(job.state,job.hash??null,JSON.stringify(job),job.owner,job.id);return job;}
 async submit(owner:string,id:string,intentId:string,candidate:Omit<SponsoredTransaction,'nonce'>,confirmedIntentFingerprint:string){
  if(!this.deps.enabled())throw Error('Sponsored execution disabled');
  if(this.get(owner,id))throw Error('Sponsored operation already started; reconcile only');
  if(!await this.authorized(owner,intentId,confirmedIntentFingerprint,candidate))throw Error('Exact financial authorization required');
  const tx:SponsoredTransaction=Object.freeze({...candidate,nonce:await this.deps.nonce(candidate.from)});valid(tx);
  const eligibility=await this.deps.eligibility(tx),now=(this.deps.now??Date.now)();
  if(eligibility.status!=='ELIGIBLE'||!eligibility.sponsorName||eligibility.checkedAt>now||now-eligibility.checkedAt>15000)throw Error('Fresh provider eligibility required');
  if(!await this.deps.simulateZeroGas(tx))throw Error('Exact zero-gas simulation failed');
  if(!this.deps.enabled()||!await this.authorized(owner,intentId,confirmedIntentFingerprint,tx))throw Error('Authorization changed');
  await this.deps.reserve(owner,intentId,confirmedIntentFingerprint);
  const job:SponsoredJob={id,owner,intentId,fingerprint:fingerprint(tx),transaction:{from:tx.from,to:tx.to,data:tx.data,gas:tx.gas.toString(),nonce:tx.nonce,chainId:56,gasPrice:'0',value:'0',type:'legacy'},state:'STARTED',sponsorName:eligibility.sponsorName,createdAt:now,sponsorshipEvidence:'PROVIDER_ELIGIBILITY_AND_ZERO_GAS_ORIGINAL',sponsorPaymentVerified:false};
  try{this.db.prepare('INSERT INTO sponsored_execution VALUES(?,?,?,?,?,?,?)').run(id,owner,intentId,job.fingerprint,job.state,null,JSON.stringify(job));}catch{throw Error('Conflicting sponsored operation; no signing; retain reservation for reconciliation');}
  try{
   if(!this.deps.enabled()||!await this.authorized(owner,intentId,confirmedIntentFingerprint,tx)||await this.deps.nonce(tx.from)!==tx.nonce||(this.deps.now??Date.now)()-eligibility.checkedAt>15000)throw Error('Authorization or nonce changed before signing');
   const raw=await this.deps.signRaw(tx);if(!/^0x[\da-f]+$/i.test(raw)||raw.length>40002)throw Error('Invalid signature');
   const signed=parseTransaction(raw),sender=await recoverTransactionAddress({serializedTransaction:raw as TransactionSerialized});
   if(sender.toLowerCase()!==tx.from.toLowerCase()||signed.type!=='legacy'||signed.chainId!==56||signed.to?.toLowerCase()!==tx.to.toLowerCase()||signed.data?.toLowerCase()!==tx.data.toLowerCase()||(signed.value??0n)!==0n||signed.gas!==tx.gas||(signed.gasPrice??0n)!==0n||signed.nonce!==tx.nonce)throw Error('Signed transaction differs from exact confirmed transaction');
   job.hash=keccak256(raw);this.save(job);
   if(!this.deps.enabled()||!await this.authorized(owner,intentId,confirmedIntentFingerprint,tx))throw Error('Authorization revoked before submission');
   const requestId=crypto.randomUUID(),response=await (this.deps.fetcher??fetch)(MEGAFUEL_ENDPOINT,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:requestId,method:'eth_sendRawTransaction',params:[raw]})});
   if(!response.ok||!response.body)throw Error('Submission unavailable');const reader=response.body.getReader();let bytes=0;const chunks:Uint8Array[]=[];try{for(;;){const item=await reader.read();if(item.done)break;bytes+=item.value.length;if(bytes>16384)throw Error('Provider response too large');chunks.push(item.value);}}finally{await reader.cancel().catch(()=>{});}const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(body.jsonrpc!=='2.0'||body.id!==requestId||body.error||String(body.result).toLowerCase()!==job.hash.toLowerCase())throw Error('Submission response unverified');
   job.state='BROADCASTED';return this.save(job);
  }catch{job.state='UNKNOWN';return this.save(job);}
 }
 async verify(owner:string,id:string,tx:SponsoredTransaction){valid(tx);const job=this.get(owner,id);if(!job||!job.hash||job.fingerprint!==fingerprint(tx))throw Error('Exact sponsored journal required');if(job.state==='CONFIRMED'||job.state==='REVERTED')return job;
  const [actual,receipt,head]=await Promise.all([this.deps.chain.transaction(job.hash),this.deps.chain.receipt(job.hash),this.deps.chain.blockNumber()]);
  if(actual.hash.toLowerCase()!==job.hash.toLowerCase()||receipt.transactionHash.toLowerCase()!==job.hash.toLowerCase()||actual.blockNumber!==receipt.blockNumber||actual.blockHash.toLowerCase()!==receipt.blockHash.toLowerCase()||receipt.blockNumber<0n||actual.chainId!==56||actual.from.toLowerCase()!==tx.from.toLowerCase()||actual.to.toLowerCase()!==tx.to.toLowerCase()||actual.input.toLowerCase()!==tx.data.toLowerCase()||actual.value!==0n||actual.gas!==tx.gas||actual.gasPrice!==0n||actual.nonce!==tx.nonce||receipt.effectiveGasPrice!==0n||head<receipt.blockNumber+11n)throw Error('Canonical zero-gas transaction not verified');
  if((await this.deps.chain.blockHash(receipt.blockNumber)).toLowerCase()!==receipt.blockHash.toLowerCase())throw Error('Receipt reorg');
  if(!await this.deps.chain.verifyEffects(job.intentId,job.hash))throw Error('Original stock effects unverified');
  if((await this.deps.chain.blockHash(receipt.blockNumber)).toLowerCase()!==receipt.blockHash.toLowerCase())throw Error('Receipt reorg');
  job.state=receipt.status==='success'?'CONFIRMED':'REVERTED';job.confirmedAt=(this.deps.now??Date.now)();job.sponsorshipEvidence='CANONICAL_ZERO_GAS_ORIGINAL';return this.save(job);
 }
}


