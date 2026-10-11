import 'server-only';
import {randomUUID} from 'node:crypto';
import {erc20Abi,parseEventLogs,type Address,type Hex} from 'viem';
import {existingAccountId,linkedWallet,paperDatabase,readAccount,bellHistory} from '../paper/store';
import {identityTransportAllowed,sameOrigin} from '../request-origin';
import {walletPortfolio} from '../execution/portfolio';
import {submissionEnabled} from '../execution/submission-server';
import {getDiscovery} from '../binance/rwa';
import {publicClient} from '../binance/onchain';
import {isolatedAgenticRunner,parseBscAddress,parseLeftQuota,parseStatus} from './agentic-cli';
import {AgenticStore,duePeriod,reconcileAgenticRun,runAgenticContribution,USDT,agenticPlanSchema,type AgenticDeps,type AgenticPlan,type ChainVerification} from './agentic-autopilot';

const address=/^0x[0-9a-fA-F]{40}$/;
export function agenticConfig(){
 const operator=process.env.AUTOPILOT_OPERATOR_ADDRESS??'',owner=process.env.AGENTIC_OPERATOR_OWNER_WALLET??'';
 const live=process.env.AGENTIC_WALLET_ENABLED==='true'&&process.env.AUTOPILOT_LIVE_ENABLED==='true'&&submissionEnabled()&&address.test(operator)&&address.test(owner);
 return {live,operator:operator.toLowerCase(),ownerWallet:owner.toLowerCase(),capUsd:process.env.LIVE_MAX_TRADE_USD??'5'};
}
const store=()=>new AgenticStore(paperDatabase());

/** Single-operator scope: only the KeepFlow account signed in with the configured owner wallet may operate the Agentic Wallet. */
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

function deps():AgenticDeps{return {store:store(),cli:isolatedAgenticRunner(process.cwd()),snapshot:walletPortfolio,resolveToken,verify,sleep:ms=>new Promise(r=>setTimeout(r,ms)),now:()=>Date.now()};}

export async function agenticOverview(owner:string,isOperator:boolean){
 const config=agenticConfig(),s=store(),plan=isOperator?s.readPlan(owner)??null:null;
 let wallet:{status:string;address:string|null;quota:{left:number;dailyLimit:number;used:number}|null}|null=null;
 if(isOperator&&config.live){
  const cli=isolatedAgenticRunner(process.cwd());
  try{const status=parseStatus(await cli({kind:'STATUS'}));let addr:string|null=null,quota=null;
   if(status==='CONNECTED'){addr=parseBscAddress(await cli({kind:'ADDRESS'}));try{quota=parseLeftQuota(await cli({kind:'LEFT_QUOTA'}));}catch{}}
   wallet={status,address:addr,quota};}catch{wallet={status:'UNAVAILABLE',address:null,quota:null};}
 }
 return {live:config.live,isOperator,operatorWallet:config.operator||null,capUsd:config.capUsd,wallet,plan,runs:isOperator?s.list(owner):[]};
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
 const account=readAccount(owner);
 return runAgenticContribution({owner,plan,bell,policy:account.policy,policyVersion:account.policyVersion??0,period,trigger,wallet:config.operator,operatorCapUsd:config.capUsd},deps());
}
export async function runAgenticNow(owner:string,requestId:string){const plan=store().readPlan(owner);if(!plan)throw Error('NO_PLAN');return execute(owner,plan,'M'+requestId,'MANUAL');}
export async function reconcileAgentic(owner:string,key:string){if(!agenticConfig().live)throw Error('LIVE_DISABLED');return reconcileAgenticRun(owner,key,deps());}
export async function runDueAgentic(){
 const config=agenticConfig();if(!config.live)return [];const results=[];
 for(const plan of store().plans()){
  if(!plan.enabled||linkedWallet(plan.owner)?.toLowerCase()!==config.ownerWallet)continue;
  const period=duePeriod(plan,Date.now());if(!period)continue;
  try{const {created,run}=await execute(plan.owner,plan,period,'SCHEDULED');results.push({period,created,state:run.state});}catch{results.push({period,created:false,state:'ERROR'});}
 }
 return results;
}
