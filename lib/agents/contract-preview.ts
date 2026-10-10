import {execFile} from 'node:child_process';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {agenticWalletOperatorStatus} from './operator-status.ts';
const address=z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const candidate=z.object({chainId:z.literal(56),from:address,to:address,value:z.literal('0'),data:z.string().regex(/^0x[0-9a-fA-F]{8}(?:[0-9a-fA-F]{2})*$/).max(16384)}).strict();
const binding=z.object({operatorId:z.string().min(1).max(80),requesterId:z.string().min(1).max(80),wallet:address,authorization:z.literal('OPERATOR_READ_ONLY')}).strict();
export type AgenticPreviewCandidate=z.infer<typeof candidate>;
type Operation='SETTINGS'|'PREVIEW';
export type AgenticPreviewRunner=(operation:Operation,transaction?:AgenticPreviewCandidate)=>Promise<string>;
export function agenticPreviewArgs(operation:Operation,transaction?:AgenticPreviewCandidate):readonly string[]{
 if(operation==='SETTINGS')return Object.freeze(['wallet','settings','--json']);
 const tx=candidate.parse(transaction);return Object.freeze(['contract-call','preview','--binanceChainId','56','--from',tx.from,'--to',tx.to,'--value','0','--inputData',tx.data,'--json']);
}
/** Fixed official CLI operations only; no execute, raw signing or shell path. */
export function isolatedAgenticPreviewRunner(projectRoot:string):AgenticPreviewRunner{return async(operation,tx)=>{
 const expected=resolve(projectRoot,'tools/agents/node_modules/@binance/agentic-wallet'),root=await realpath(expected);if(root!==expected)throw Error('ISOLATED_PACKAGE_REQUIRED');
 const manifest=z.object({name:z.literal('@binance/agentic-wallet'),version:z.string().regex(/^1\.(?:1[0-9]|[2-9][0-9])\.\d+$/),bin:z.union([z.string(),z.record(z.string(),z.string())])}).parse(JSON.parse(await readFile(resolve(root,'package.json'),'utf8')));
 const bin=typeof manifest.bin==='string'?manifest.bin:manifest.bin.baw;if(!bin)throw Error('CLI_ENTRY_REQUIRED');const entry=await realpath(resolve(root,bin)),rel=relative(root,entry);if(!rel||rel.startsWith('..')||isAbsolute(rel)||!/[.]m?js$/.test(entry))throw Error('CONTAINED_ENTRY_REQUIRED');
 const env:NodeJS.ProcessEnv={NODE_ENV:'production'};for(const key of ['PATH','SystemRoot','TEMP','TMP','HOME','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[key])env[key]=process.env[key];
 return new Promise<string>((accept,reject)=>execFile(process.execPath,[entry,...agenticPreviewArgs(operation,tx)],{cwd:root,env,shell:false,windowsHide:true,timeout:10000,maxBuffer:32768},(error,out)=>error?reject(Error('CLI_UNAVAILABLE')):accept(out)));
 };}
const object=z.record(z.string(),z.unknown());
const previewResponse=z.object({success:z.literal(true),data:z.object({requestId:z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),parsedTx:object,simulationResult:z.object({simulationCode:z.literal('000000000'),simulationErrorDetail:z.null(),balanceChanges:z.array(object).max(100),allowanceChanges:z.array(object).max(100),authorityChanges:z.array(object).max(100),preCheckCode:z.literal('')}),risks:z.object({riskDetails:z.array(object).max(100),addresses:z.record(z.string(),object),riskBehaviors:z.array(z.unknown()).max(100)}),requireConfirmation:z.boolean(),expiresAt:z.number().int().positive()})});
function parse(text:string){if(Buffer.byteLength(text)>32768)throw Error('OVERSIZED_RESPONSE');return JSON.parse(text);}
/** Internal single-operator preview of an already validated KeepFlow transaction.
 * Provider preview is advisory and never a substitute for effect/policy validation. */
export async function previewAgenticContract(identity:unknown,input:unknown,options:{enabled?:boolean;projectRoot?:string;allowedRoutes?:readonly string[];allowedSelectors?:readonly string[];validatedFingerprint?:string;status?:typeof agenticWalletOperatorStatus;runner?:AgenticPreviewRunner;now?:()=>number}={}){
 const base={executionEnabled:false as const,financialAuthorization:'NONE' as const,source:'Binance Agentic Wallet contract-call preview' as const};
 if(options.enabled!==true)return {...base,status:'DISABLED' as const,code:'AGENTIC_PREVIEW_DISABLED'};
 try{
 const owner=binding.parse(identity),tx=candidate.parse(input);if(owner.operatorId!==owner.requesterId||owner.wallet.toLowerCase()!==tx.from.toLowerCase())throw Error('OPERATOR_WALLET_MISMATCH');
 const fingerprint=createHash('sha256').update(JSON.stringify(tx)).digest('hex');
 if(options.validatedFingerprint!==fingerprint||!options.allowedRoutes?.some(route=>route.toLowerCase()===tx.to.toLowerCase())||!options.allowedSelectors?.some(selector=>selector.toLowerCase()===tx.data.slice(0,10).toLowerCase()))throw Error('VALIDATED_FIRST_BELL_ROUTE_REQUIRED');
 const status=await (options.status??agenticWalletOperatorStatus)(owner,{enabled:true,projectRoot:options.projectRoot});if(status.status!=='CONNECTED')throw Error('AUTHORIZED_OPERATOR_SESSION_REQUIRED');
 const run=options.runner??isolatedAgenticPreviewRunner(options.projectRoot??process.cwd());
 const settings=z.object({success:z.literal(true),data:z.object({devMode:z.object({enabled:z.literal(true)})})}).parse(parse(await run('SETTINGS')));void settings;
 const response=previewResponse.parse(parse(await run('PREVIEW',tx))).data,now=(options.now??Date.now)();if(!Number.isFinite(now)||response.expiresAt<=now)throw Error('PREVIEW_EXPIRED');
 // Forward only documented parsed effects and risks; no signature or credential.
 return {...base,status:'PREVIEWED' as const,transactionFingerprint:fingerprint,requestId:response.requestId,expiresAt:new Date(response.expiresAt).toISOString(),requireAppConfirmation:response.requireConfirmation,parsedTransaction:response.parsedTx,simulation:response.simulationResult,risks:response.risks,signable:false as const};
 }catch{return {...base,status:'UNAVAILABLE' as const,code:'SESSION_ROUTE_OR_PROVIDER_PREVIEW_UNVERIFIED'};}
}
export function agenticExecuteCapability(){return {supportedCommand:'contract-call execute --requestId <provider-preview-requestId> --json',status:'EXECUTION_DISABLED',executionEnabled:false,blockers:['Separate explicit financial authorization is required.','Durable immutable user approval, wallet budget reservation and submission ambiguity tracking must be wired before provider execution.','BROADCASTED is pending chain verification, not a completed purchase.','Provider preview may expire or require Binance App confirmation.']};}
