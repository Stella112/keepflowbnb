import 'server-only';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,rm,chmod} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {erc20Abi,parseEventLogs,type Address,type Hex} from 'viem';
import {existingAccountId,linkedWallet,paperDatabase,readAccount,bellHistory} from '../paper/store';
import {identityTransportAllowed,sameOrigin} from '../request-origin';
import {walletPortfolio} from '../execution/portfolio';
import {submissionEnabled} from '../execution/submission-server';
import {getDiscovery} from '../binance/rwa';
import {publicClient} from '../binance/onchain';
import {isolatedAgenticRunner,parseBscAddress,parseLeftQuota,parseStatus} from './agentic-cli';
import {onboardingLocalRunner} from './onboarding';
import {AgenticWalletStore,startAgenticConnect,verifyAgenticConnect,disconnectAgentic,type ConnectDeps} from './agentic-wallets';
import {AgenticStore,duePeriod,reconcileAgenticRun,runAgenticContribution,USDT,agenticPlanSchema,type AgenticDeps,type AgenticPlan,type ChainVerification} from './agentic-autopilot';

const address=/^0x[0-9a-fA-F]{40}$/;
export function agenticConfig(){
 const operator=process.env.AUTOPILOT_OPERATOR_ADDRESS??'',owner=process.env.AGENTIC_OPERATOR_OWNER_WALLET??'';
 // Live for every signed-in account that connects its own Agentic Wallet; the operator pair is an optional pre-connected account.
 const live=process.env.AGENTIC_WALLET_ENABLED==='true'&&process.env.AUTOPILOT_LIVE_ENABLED==='true'&&submissionEnabled();
 return {live,operator:operator.toLowerCase(),ownerWallet:owner.toLowerCase(),capUsd:process.env.LIVE_MAX_TRADE_USD??'5',dailyCapUsd:/^\d+(\.\d{1,6})?$/.test(process.env.AGENTIC_DAILY_MAX_USD??'')?process.env.AGENTIC_DAILY_MAX_USD:undefined};
}
const store=()=>new AgenticStore(paperDatabase());
const wallets=()=>new AgenticWalletStore(paperDatabase());
const userRoot=()=>process.env.AGENTIC_USER_ROOT??join(dirname(resolve(process.env.PAPER_DATABASE_PATH??'data/paper.sqlite')),'agentic-users');
const dirFor=(owner:string)=>join(userRoot(),createHash('sha256').update('keepflow-agentic:'+owner).digest('hex').slice(0,32));
function connectDeps():ConnectDeps{return {store:wallets(),runner:dir=>onboardingLocalRunner(process.cwd(),dir,50_000),dirFor,
 prepareDir:async dir=>{await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);},
 removeDir:async dir=>{if(dir.startsWith(userRoot()))await rm(dir,{recursive:true,force:true});},now:()=>Date.now(),maxWallets:Number(process.env.AGENTIC_MAX_USERS??'50')};}

/** The wallet an account's Autopilot spends from: its own connected Agentic Wallet, or the configured operator session. */
export function agenticBinding(owner:string):{wallet:string;dir?:string}|undefined{
 const own=wallets().read(owner);if(own)return {wallet:own.wallet,dir:own.dir};
 const config=agenticConfig(),linked=linkedWallet(owner)?.toLowerCase();
 if(config.ownerWallet&&address.test(config.operator)&&linked===config.ownerWallet)return {wallet:config.operator};
 return undefined;
}
export const connectAgentic=(owner:string)=>startAgenticConnect(owner,connectDeps());
export const verifyAgentic=(owner:string)=>verifyAgenticConnect(owner,connectDeps());
export const disconnectAgenticWallet=(owner:string)=>disconnectAgentic(owner,connectDeps());

/** Any signed-in account; isOperator marks the configured operator, which alone may use paid research. */
export async function agenticOperator(request:Request,mutation=false){
 if(!identityTransportAllowed(request)||(mutation&&!sameOrigin(request)))throw Error('AUTH_REQUIRED');
 const owner=await existingAccountId(),wallet=owner?linkedWallet(owner)?.toLowerCase():undefined,config=agenticConfig();
 if(!owner||!wallet)throw Error('AUTH_REQUIRED');
 return {owner,wallet,isOperator:Boolean(config.ownerWallet)&&wallet===config.ownerWallet};
}

async function resolveToken(ticker:string){
 const tokens=(await getDiscovery()).tokens.filter(t=>t.underlyingTicker===ticker&&t.binanceChainId==='56'&&[1,3].includes(t.assetType??-1)&&t.statusInfo.openState&&!['ASSET_PAUSED','ASSET_LIMITED','UNSUPPORTED','MARKET_PAUSED','MARKET_MAINTENANCE'].includes(t.statusInfo.reasonCode??''));
 const chosen=tokens.find(t=>t.platformId==='bstock')??tokens[0];
 return chosen?{address:chosen.tokenContractAddress,provider:chosen.platformId}:undefined;
}

/** Settlement evidence from the chain itself: sender, success, 12 confirmations and the exact token transfers. */
async function verify(hash:string,wallet:string,token:string):Promise<ChainVerification>{
 const client=publicClient(),h=hash as Hex;
 const receipt=await client.getTransactionReceipt({hash:h}).catch(()=>null);if(!receipt)return {status:'PENDING',receivedUnits:0n,spentUnits:0n,blockNumber:0n};
 const tx=await client.getTransaction({hash:h});if(tx.from.toLowerCase()!==wallet.toLowerCase()||await client.getChainId()!==56)throw Error('UNRELATED_TRANSACTION');
 const head=await client.getBlockNumber();if(head-receipt.blockNumber+1n<12n)return {status:'PENDING',receivedUnits:0n,spentUnits:0n,blockNumber:receipt.blockNumber};
 if(receipt.status!=='success')return {status:'REVERTED',receivedUnits:0n,spentUnits:0n,blockNumber:receipt.blockNumber};
 const logs=parseEventLogs({abi:erc20Abi,eventName:'Transfer',logs:receipt.logs});
 let received=0n,spent=0n;for(const log of logs){
  if(log.address.toLowerCase()===token.toLowerCase()&&log.args.to.toLowerCase()===wallet.toLowerCase())received+=log.args.value;
  if(log.address.toLowerCase()===USDT.toLowerCase()&&log.args.from.toLowerCase()===wallet.toLowerCase())spent+=log.args.value;
 }
 return {status:'CONFIRMED',receivedUnits:received,spentUnits:spent,blockNumber:receipt.blockNumber};
}

function deps(dir?:string):AgenticDeps{return {store:store(),cli:isolatedAgenticRunner(process.cwd(),dir),snapshot:walletPortfolio,resolveToken,verify,sleep:ms=>new Promise(r=>setTimeout(r,ms)),now:()=>Date.now()};}

export async function agenticOverview(owner:string,isOperator:boolean){
 const config=agenticConfig(),s=store(),binding=agenticBinding(owner),plan=binding?s.readPlan(owner)??null:null,pending=wallets().pending(owner);
 let wallet:{status:string;address:string|null;quota:{left:number;dailyLimit:number;used:number}|null}|null=null;
 if(binding&&config.live){
  const cli=isolatedAgenticRunner(process.cwd(),binding.dir);
  try{const status=parseStatus(await cli({kind:'STATUS'}));let addr:string|null=null,quota=null;
   if(status==='CONNECTED'){addr=parseBscAddress(await cli({kind:'ADDRESS'}));try{quota=parseLeftQuota(await cli({kind:'LEFT_QUOTA'}));}catch{}}
   wallet={status,address:addr,quota};}catch{wallet={status:'UNAVAILABLE',address:null,quota:null};}
 }
 return {live:config.live,isOperator,connected:Boolean(binding),connectedWallet:binding?.wallet??null,ownSession:Boolean(binding?.dir),signinPending:Boolean(pending&&pending.expiresAt>Date.now()),capUsd:config.capUsd,dailyCapUsd:config.dailyCapUsd??null,wallet,plan,runs:binding?s.list(owner):[]};
}

export function saveAgenticPlan(owner:string,input:{bellId:string;bellVersion:number;bellHash:string;contributionUsd:string;cadence:'DAILY'|'WEEKLY'}){
 const bell=bellHistory(input.bellId).find(b=>b.version===input.bellVersion&&b.contentHash===input.bellHash);if(!bell)throw Error('BELL_VERSION_UNAVAILABLE');
 const s=store(),prior=s.readPlan(owner),now=new Date().toISOString();
 const plan:AgenticPlan=agenticPlanSchema.parse({id:prior?.id??randomUUID(),owner,...input,enabled:prior?.enabled??false,createdAt:prior?.createdAt??now,updatedAt:now});
 return s.savePlan(plan);
}
export function setAgenticEnabled(owner:string,enabled:boolean){const s=store(),plan=s.readPlan(owner);if(!plan)throw Error('NO_PLAN');return s.savePlan({...plan,enabled,updatedAt:new Date().toISOString()});}

async function execute(owner:string,plan:AgenticPlan,period:string,trigger:'SCHEDULED'|'MANUAL'){
 const config=agenticConfig();if(!config.live)throw Error('LIVE_DISABLED');
 const bell=bellHistory(plan.bellId).find(b=>b.version===plan.bellVersion&&b.contentHash===plan.bellHash);if(!bell)throw Error('BELL_VERSION_UNAVAILABLE');
 const binding=agenticBinding(owner);if(!binding)throw Error('NOT_CONNECTED');
 const account=readAccount(owner);
 return runAgenticContribution({owner,plan,bell,policy:account.policy,policyVersion:account.policyVersion??0,period,trigger,wallet:binding.wallet,operatorCapUsd:config.capUsd,dailyCapUsd:config.dailyCapUsd},deps(binding.dir));
}
export async function runAgenticNow(owner:string,requestId:string){const plan=store().readPlan(owner);if(!plan)throw Error('NO_PLAN');return execute(owner,plan,'M'+requestId,'MANUAL');}
export async function reconcileAgentic(owner:string,key:string){if(!agenticConfig().live)throw Error('LIVE_DISABLED');const binding=agenticBinding(owner);if(!binding)throw Error('NOT_CONNECTED');return reconcileAgenticRun(owner,key,deps(binding.dir));}
export async function runDueAgentic(){
 const config=agenticConfig();if(!config.live)return [];const results=[];
 for(const plan of store().plans()){
  if(!plan.enabled||!agenticBinding(plan.owner))continue;
  const period=duePeriod(plan,Date.now());if(!period)continue;
  try{const {created,run}=await execute(plan.owner,plan,period,'SCHEDULED');results.push({period,created,state:run.state});}catch{results.push({period,created:false,state:'ERROR'});}
 }
 return results;
}
