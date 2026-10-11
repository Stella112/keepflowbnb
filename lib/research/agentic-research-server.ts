import 'server-only';
import {paperDatabase} from '../paper/store';
import {isolatedAgenticRunner} from '../agents/agentic-cli';
import {agenticConfig} from '../agents/agentic-autopilot-server';
import {watPeriods} from '../agents/agentic-autopilot';
import {STOCKANALYST_RESOURCE,stockAnalystOffer} from './stockanalyst';
import {StockAnalystJobStore} from './stockanalyst-job';
import {AgenticResearchStore,buyAgenticResearch} from './agentic-research';

export function agenticResearchConfig(){
 const key=process.env.FIRSTBELL_RESEARCH_JOB_KEY??'',limit=Number(process.env.AGENTIC_RESEARCH_DAILY_LIMIT??'3');
 return {enabled:agenticConfig().live&&process.env.FIRSTBELL_RESEARCH_PAYMENTS_ENABLED==='true'&&/^[a-f0-9]{64}$/.test(key),key,dailyLimit:Number.isInteger(limit)&&limit>=0&&limit<=20?limit:0};
}
async function submit(requestBody:string,paymentHeader:string){
 const response=await fetch(STOCKANALYST_RESOURCE,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json','PAYMENT-SIGNATURE':paymentHeader},body:requestBody,credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(60000)});
 if(response.status!==202||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('JOB_ACCEPTANCE_UNVERIFIED');
 const text=await response.text();if(Buffer.byteLength(text)>65536)throw Error('JOB_RECEIPT_TOO_LARGE');
 const receipt=JSON.parse(text);if(!['settling','queued','running'].includes(receipt?.status)||!Number.isSafeInteger(receipt.expiresAt)||receipt.expiresAt<=Date.now())throw Error('JOB_ACCEPTANCE_UNVERIFIED');
 return {receipt,paymentResponse:response.headers.get('PAYMENT-RESPONSE')};
}
export function agenticResearchHistory(owner:string,ticker:string){return new AgenticResearchStore(paperDatabase()).list(owner,ticker);}
export async function buyResearchWithAgentic(owner:string,ticker:string,requestId:string){
 const config=agenticResearchConfig();if(!config.enabled)throw Error('RESEARCH_PAYMENTS_DISABLED');
 const db=paperDatabase(),jobs=new StockAnalystJobStore(db,Buffer.from(config.key,'hex'));
 return buyAgenticResearch({owner,ticker,requestId,dailyLimit:config.dailyLimit,dayStart:watPeriods(Date.now()).dayStart},{
  store:new AgenticResearchStore(db),cli:isolatedAgenticRunner(process.cwd()),now:()=>Date.now(),
  offer:async t=>{const o=await stockAnalystOffer({symbols:[t]});return {requestBody:o.requestBody,challenge:o.challenge};},
  submit,saveJob:(o,receipt,symbols)=>jobs.save(o,receipt,symbols),
 });
}
