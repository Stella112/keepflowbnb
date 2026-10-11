import {execFile} from 'node:child_process';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {z} from 'zod';
export const onboardingSource='https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/authentication.md';
export type OnboardingCommand='SIGNIN'|'VERIFY'|'STATUS'|'ADDRESS';
export function onboardingArgs(command:OnboardingCommand,qrCodeId?:string):string[]{switch(command){case 'SIGNIN':return ['auth','signin','--json'];case 'VERIFY':return ['auth','verify','--qrCodeId',z.string().uuid().parse(qrCodeId),'--json'];case 'STATUS':return ['wallet','status','--json'];case 'ADDRESS':return ['wallet','address','--json'];default:throw Error('UNSUPPORTED_SETUP_COMMAND');}}
export type OnboardingRunner=(command:OnboardingCommand,qrCodeId?:string)=>Promise<string>;
export function onboardingLocalRunner(projectRoot:string,bawDir?:string,verifyTimeoutMs=305000):OnboardingRunner{return async(command,id)=>{
 const expected=resolve(projectRoot,'tools/agents/node_modules/@binance/agentic-wallet'),root=await realpath(expected);if(root!==expected)throw Error('PACKAGE_UNVERIFIED');
 const manifest=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));if(manifest.name!=='@binance/agentic-wallet'||manifest.version!=='1.10.0'||manifest.bin?.baw!=='dist/index.js')throw Error('PACKAGE_UNVERIFIED');
 const entry=await realpath(resolve(root,'dist/index.js')),rel=relative(root,entry);if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('ENTRY_UNVERIFIED');
 const env:NodeJS.ProcessEnv={NODE_ENV:'production'};for(const key of ['PATH','SystemRoot','TEMP','TMP','HOME','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[key])env[key]=process.env[key];if(bawDir){env.BINANCE_BAW_DIR=bawDir;env.HOME=bawDir;env.USERPROFILE=bawDir;}
 return new Promise((accept,reject)=>execFile(process.execPath,[entry,...onboardingArgs(command,id)],{cwd:root,env,timeout:command==='VERIFY'?verifyTimeoutMs:20000,maxBuffer:32768,windowsHide:true,shell:false},(error,stdout)=>error?reject(Error('SETUP_CLI_FAILED')):accept(stdout)));
};}
const binding=z.object({operatorId:z.string().min(1).max(80),requesterId:z.string().min(1).max(80),wallet:z.string().regex(/^0x[0-9a-fA-F]{40}$/),authorization:z.literal('OPERATOR_WALLET_LOGIN_SETUP'),humanApprovedSetup:z.literal(true)}).strict();
export type OnboardingBinding=z.infer<typeof binding>;
function checked(value:unknown){const result=binding.parse(value);if(result.operatorId!==result.requesterId)throw Error('OPERATOR_REQUIRED');return result;}
function data(text:string){if(Buffer.byteLength(text)>32768)throw Error('INVALID_SETUP_RESPONSE');return z.object({success:z.literal(true),data:z.record(z.string(),z.unknown())}).parse(JSON.parse(text)).data;}
export function agenticOnboarding(options:{enabled?:boolean;runner:OnboardingRunner;now?:()=>number}){
 const now=options.now??Date.now;let pending:{operatorId:string;wallet:string;qrCodeId:string;expiresAt:number}|undefined;let busy=false;
 const authorize=(value:unknown)=>{if(options.enabled!==true)throw Error('SETUP_DISABLED');return checked(value);};
 return {
 async begin(value:unknown){const owner=authorize(value);if(busy||pending&&pending.expiresAt>now())throw Error('SETUP_ALREADY_PENDING');busy=true;try{const output=data(await options.runner('SIGNIN'));if(output.status==='ALREADY_CONNECTED')return {status:'ALREADY_CONNECTED' as const,executionAvailable:false,requiresBoundStatusCheck:true};
 const parsed=z.object({qrCodeId:z.string().uuid(),expireAt:z.string().regex(/^\d{10,16}$/),urlForWeb:z.string().max(8192),pairingCode:z.string().regex(/^[A-Za-z0-9]{6}$/)}).parse(output);const url=new URL(parsed.urlForWeb),expiry=Number(parsed.expireAt);if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!((url.hostname==='web3.binance.com'&&url.pathname==='/en/agent-login')||(url.hostname==='app.binance.com'&&/^\/uni-qr\/[A-Za-z0-9_-]{1,80}$/.test(url.pathname)&&!url.search))||!Number.isSafeInteger(expiry)||expiry<=now()||expiry>now()+600000)throw Error('INVALID_SETUP_RESPONSE');
 pending={operatorId:owner.operatorId,wallet:owner.wallet.toLowerCase(),qrCodeId:parsed.qrCodeId,expiresAt:expiry};return {status:'AWAITING_HUMAN_APP_CONFIRMATION' as const,urlForWeb:parsed.urlForWeb,pairingCode:parsed.pairingCode,expiresAt:new Date(expiry).toISOString(),executionAvailable:false,providerPermissions:'REVIEW_IN_BINANCE_APP_NOT_READ_ONLY_SCOPES'};
 }catch{throw Error('SETUP_START_UNVERIFIED');}finally{busy=false;}},
 async verify(value:unknown,humanConfirmedInApp:boolean){const owner=authorize(value),challenge=pending;if(humanConfirmedInApp!==true||!challenge||challenge.operatorId!==owner.operatorId||challenge.wallet!==owner.wallet.toLowerCase()||challenge.expiresAt<=now()||busy)throw Error('HUMAN_CONFIRMATION_AND_ACTIVE_SETUP_REQUIRED');busy=true;pending=undefined;
 try{const verified=data(await options.runner('VERIFY',challenge.qrCodeId));if(verified.status!=='SUCCESS')throw Error('UNVERIFIED');const status=data(await options.runner('STATUS'));if(status.status!=='CONNECTED')throw Error('UNVERIFIED');const addresses=z.object({addresses:z.array(z.object({binanceChainId:z.string(),address:z.string().regex(/^0x[0-9a-fA-F]{40}$/)})).max(32)}).parse(data(await options.runner('ADDRESS'))).addresses.filter(item=>item.binanceChainId==='56');if(addresses.length!==1||addresses[0].address.toLowerCase()!==owner.wallet.toLowerCase())throw Error('UNVERIFIED');return {status:'AUTHENTICATED_OPERATOR_BOUND' as const,wallet:addresses[0].address,executionAvailable:false,financialAuthorization:'NONE'};
 }catch{throw Error('SETUP_AUTHENTICATION_UNVERIFIED_RESTART_REQUIRED');}finally{busy=false;}}
 };
}
