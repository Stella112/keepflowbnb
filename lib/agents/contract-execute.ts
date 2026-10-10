import {execFile} from 'node:child_process';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {z} from 'zod';
import {agenticWalletOperatorStatus} from './operator-status.ts';
const id=z.string().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),address=z.string().regex(/^0x[0-9a-fA-F]{40}$/),hash=z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const identitySchema=z.object({operatorId:id,requesterId:id,wallet:address,authorization:z.literal('OPERATOR_EXECUTION')}).strict();
const approvedSchema=z.object({intentId:id,operatorId:id,wallet:address,chainId:z.literal(56),previewRequestId:id,transactionFingerprint:z.string().regex(/^[a-f0-9]{64}$/),approvedFingerprint:z.string().regex(/^[a-f0-9]{64}$/),expiresAt:z.number().int().positive(),financialAuthorization:z.literal('EXPLICIT_USER_APPROVAL'),effectsVerified:z.literal(true),budgetReserved:z.literal(true)}).strict();
export type AgenticApprovedExecution=z.infer<typeof approvedSchema>;
type ProviderObservation={status:'BROADCASTED';orderId:string;txHash:string}|{status:'PENDING_CONFIRMATION';orderId:string;txHash:null};
export type AgenticExecuteDependencies={
 /** Trusted server reads immutable approval+preview, revalidates exact effects,
  * current policy, wallet-scoped budget and revocation. Never parse client claims. */
 authorize:(intentId:string,operatorId:string)=>Promise<AgenticApprovedExecution|undefined>;
 /** Atomic durable CAS: reject repeats, bind approval fingerprint/requestId and
  * retain budget; mark ambiguity BEFORE any signing/submission invocation. */
 start:(approved:AgenticApprovedExecution)=>Promise<boolean>;
 observe:(intentId:string,observation:ProviderObservation)=>Promise<void>;
 unknown:(intentId:string)=>Promise<void>;
 session?:typeof agenticWalletOperatorStatus;
 runner?:(requestId:string)=>Promise<string>;
};
export function agenticExecuteArgs(requestId:string){return Object.freeze(['contract-call','execute','--requestId',id.parse(requestId),'--json']);}
export function isolatedAgenticExecuteRunner(projectRoot:string){return async(requestId:string)=>{
 const expected=resolve(projectRoot,'tools/agents/node_modules/@binance/agentic-wallet'),root=await realpath(expected);if(root!==expected)throw Error('ISOLATED_PACKAGE_REQUIRED');
 const manifest=z.object({name:z.literal('@binance/agentic-wallet'),version:z.string().regex(/^1\.(?:1[0-9]|[2-9][0-9])\.\d+$/),bin:z.union([z.string(),z.record(z.string(),z.string())])}).parse(JSON.parse(await readFile(resolve(root,'package.json'),'utf8')));
 const bin=typeof manifest.bin==='string'?manifest.bin:manifest.bin.baw;if(!bin)throw Error('CLI_ENTRY_REQUIRED');const entry=await realpath(resolve(root,bin)),rel=relative(root,entry);if(!rel||rel.startsWith('..')||isAbsolute(rel)||!/[.]m?js$/.test(entry))throw Error('CONTAINED_ENTRY_REQUIRED');
 const env:NodeJS.ProcessEnv={NODE_ENV:'production'};for(const key of ['PATH','SystemRoot','TEMP','TMP','HOME','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[key])env[key]=process.env[key];
 return new Promise<string>((accept,reject)=>execFile(process.execPath,[entry,...agenticExecuteArgs(requestId)],{cwd:root,env,shell:false,windowsHide:true,timeout:10000,maxBuffer:32768},(error,out)=>error?reject(Error('CLI_OUTCOME_UNKNOWN')):accept(out)));
 };}
const responseSchema=z.object({success:z.literal(true),data:z.discriminatedUnion('status',[z.object({status:z.literal('BROADCASTED'),orderId:id,txHash:hash}),z.object({status:z.literal('PENDING_CONFIRMATION'),orderId:id,txHash:z.null()})])});
/** Future-only server adapter. No HTTP route invokes this, no automatic retries.
 * enablement alone is insufficient: all durable trusted callbacks are required.
 * Provider response has no effects binding: authorize must establish that separately.
 * Neither provider BROADCASTED nor App pending proves chain settlement. */
export async function executeAgenticContract(identity:unknown,intentId:unknown,deps:AgenticExecuteDependencies,options:{enabled?:boolean;projectRoot?:string;now?:()=>number}={}){
 const base={confirmed:false as const,source:'Binance Agentic Wallet contract-call execute' as const};
 if(options.enabled!==true)return {...base,status:'DISABLED' as const,executionEnabled:false as const};
 let approved:AgenticApprovedExecution|undefined,started=false;
 try{
 const owner=identitySchema.parse(identity),intent=id.parse(intentId);if(owner.operatorId!==owner.requesterId)throw Error('OPERATOR_SCOPE_REQUIRED');
 approved=approvedSchema.parse(await deps.authorize(intent,owner.operatorId));const now=(options.now??Date.now)();
 if(!Number.isFinite(now)||approved.expiresAt<=now||approved.intentId!==intent||approved.operatorId!==owner.operatorId||approved.wallet.toLowerCase()!==owner.wallet.toLowerCase()||approved.approvedFingerprint!==approved.transactionFingerprint)throw Error('BOUND_APPROVAL_REQUIRED');
 const session=await (deps.session??agenticWalletOperatorStatus)({...owner,authorization:'OPERATOR_READ_ONLY'},{enabled:true,projectRoot:options.projectRoot});if(session.status!=='CONNECTED'||session.wallet?.toLowerCase()!==owner.wallet.toLowerCase())throw Error('CURRENT_WALLET_SESSION_REQUIRED');
 if(!await deps.start(approved))return {...base,status:'ALREADY_STARTED' as const,executionEnabled:false as const};started=true;
 // Recheck time after potentially blocking lock; once started, any error retains
 // ambiguity. Never release a budget or retry execute because a response is missing.
 const submissionTime=(options.now??Date.now)();if(!Number.isFinite(submissionTime)||approved.expiresAt<=submissionTime)throw Error('PREVIEW_EXPIRED_AFTER_LOCK');
 const output=await (deps.runner??isolatedAgenticExecuteRunner(options.projectRoot??process.cwd()))(approved.previewRequestId);if(Buffer.byteLength(output)>32768)throw Error('OVERSIZED_RESPONSE');
 const observation=responseSchema.parse(JSON.parse(output)).data;
 await deps.observe(intent,observation);return {...base,...observation,executionEnabled:true as const};
 }catch{if(started&&approved){try{await deps.unknown(approved.intentId);}catch{}return {...base,status:'UNKNOWN' as const,executionEnabled:false as const};}return {...base,status:'BLOCKED' as const,executionEnabled:false as const};}
}

