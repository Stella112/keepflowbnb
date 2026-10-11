import type {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import {parseX402Preview,parseX402Sign,type AgenticRunner} from '../agents/agentic-cli.ts';
import {STOCKANALYST_PAY_TO} from './stockanalyst.ts';

export const RESEARCH_FEE='0.1';
const EIP3009_TOKENS:Record<string,string>={'0xce24439f2d9c6a2289f741120fe202248b666666':'U','0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d':'USD1'};
export type ResearchState='SIGNING'|'SUBMITTING'|'ACCEPTED'|'FAILED'|'UNKNOWN';
export type ResearchAttempt={id:string;owner:string;ticker:string;state:ResearchState;reason:string;token?:string;fee:string;jobId?:string;settlementTx?:string;createdAt:string;updatedAt:string};

export class AgenticResearchStore{
 private db:DatabaseSync;
 constructor(db:DatabaseSync){this.db=db;db.exec('CREATE TABLE IF NOT EXISTS agentic_research(id TEXT PRIMARY KEY,owner TEXT NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL)');}
 begin(a:ResearchAttempt){return this.db.prepare('INSERT OR IGNORE INTO agentic_research(id,owner,created_at,payload) VALUES(?,?,?,?)').run(a.id,a.owner,a.createdAt,JSON.stringify(a)).changes===1;}
 read(owner:string,id:string){const row=this.db.prepare('SELECT payload FROM agentic_research WHERE owner=? AND id=?').get(owner,id);return row?JSON.parse(String(row.payload)) as ResearchAttempt:undefined;}
 update(a:ResearchAttempt){a.updatedAt=new Date().toISOString();this.db.prepare('UPDATE agentic_research SET payload=? WHERE id=? AND owner=?').run(JSON.stringify(a),a.id,a.owner);}
 list(owner:string,ticker?:string){return this.db.prepare('SELECT payload FROM agentic_research WHERE owner=? ORDER BY created_at DESC LIMIT 50').all(owner).map(r=>JSON.parse(String(r.payload)) as ResearchAttempt).filter(a=>!ticker||a.ticker===ticker);}
 /** Every attempt that reached signing may have spent the fee. */
 committedSince(owner:string,since:string){return this.db.prepare('SELECT payload FROM agentic_research WHERE owner=? AND created_at>=?').all(owner,since).map(r=>JSON.parse(String(r.payload)) as ResearchAttempt).filter(a=>a.state!=='FAILED').length;}
}

export type ResearchDeps={
 store:AgenticResearchStore;cli:AgenticRunner;now:()=>number;
 offer:(ticker:string)=>Promise<{requestBody:string;challenge:unknown}>;
 submit:(requestBody:string,paymentHeader:string)=>Promise<{receipt:unknown;paymentResponse:string|null}>;
 saveJob:(owner:string,receipt:unknown,symbols:string[])=>{jobId:string;status:string};
};

/** Buy one StockAnalyst report with the operator's Agentic Wallet. The fee is separate from portfolio money
 * and buys an analysis attempt only. Signing happens once; an ambiguous outcome is never re-signed. */
export async function buyAgenticResearch(input:{owner:string;ticker:string;requestId:string;dailyLimit:number;dayStart:string},deps:ResearchDeps):Promise<{created:boolean;attempt:ResearchAttempt}>{
 const now=new Date(deps.now()).toISOString();
 const attempt:ResearchAttempt={id:z.string().uuid().parse(input.requestId),owner:input.owner,ticker:input.ticker,state:'SIGNING',reason:'Checking the provider price.',fee:RESEARCH_FEE,createdAt:now,updatedAt:now};
 if(deps.store.committedSince(input.owner,input.dayStart)>=input.dailyLimit)return {created:false,attempt:{...attempt,state:'FAILED',reason:'Today\'s research budget is used up.'}};
 if(!deps.store.begin(attempt))return {created:false,attempt:deps.store.read(input.owner,attempt.id)!};
 const fail=(reason:string)=>{attempt.state='FAILED';attempt.reason=reason;deps.store.update(attempt);return {created:true,attempt};};
 let offer;try{offer=await deps.offer(input.ticker);}catch{return fail('The research provider price could not be verified. Nothing was paid.');}
 let preview;try{preview=parseX402Preview(await deps.cli({kind:'X402_PREVIEW',requirements:JSON.stringify(offer.challenge)}));}catch{return fail('The Agentic Wallet could not preview this payment. Nothing was paid.');}
 const option=preview.options.find(o=>o.status==='READY_TO_SIGN'&&o.assetTransferMethod==='eip3009'&&o.binanceChainId==='56'&&o.needApproveFirst!==true&&o.amount===RESEARCH_FEE&&o.payTo?.toLowerCase()===STOCKANALYST_PAY_TO&&!!o.tokenAddress&&EIP3009_TOKENS[o.tokenAddress.toLowerCase()]===o.tokenSymbol);
 if(!option)return fail('No ready 0.1 U or USD1 payment option. Fund the Agentic Wallet with U or USD1 on BSC.');
 attempt.token=option.tokenSymbol;attempt.reason='Signing the exact 0.1 fee in the Agentic Wallet.';deps.store.update(attempt);
 let signed;try{signed=parseX402Sign(await deps.cli({kind:'X402_SIGN',paymentId:preview.paymentId,index:option.index}));}
 catch{attempt.state='UNKNOWN';attempt.reason='The wallet did not confirm the signature. It will not be signed again automatically.';deps.store.update(attempt);return {created:true,attempt};}
 if(signed.signatureExpiresAt*1000<=deps.now())return fail('The payment signature expired before use. Nothing was submitted.');
 attempt.state='SUBMITTING';attempt.reason='Submitting the paid request once.';deps.store.update(attempt);
 try{
  const {receipt,paymentResponse}=await deps.submit(offer.requestBody,signed.paymentHeaderValue);
  const saved=deps.saveJob(input.owner,receipt,[input.ticker]);attempt.jobId=saved.jobId;
  if(paymentResponse){try{const settlement=JSON.parse(Buffer.from(paymentResponse,'base64').toString('utf8'));const tx=typeof settlement?.transaction==='string'?settlement.transaction:settlement?.txHash;if(typeof tx==='string'&&/^0x[0-9a-fA-F]{64}$/.test(tx))attempt.settlementTx=tx;}catch{}}
  attempt.state='ACCEPTED';attempt.reason='The provider accepted the paid research job. The report appears when it finishes.';deps.store.update(attempt);return {created:true,attempt};
 }catch{attempt.state='UNKNOWN';attempt.reason='The provider response was not verified. The signed payment will not be replayed again.';deps.store.update(attempt);return {created:true,attempt};}
}
