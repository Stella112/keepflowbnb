import {z} from 'zod';
import {intentOwner} from '../../../../../../lib/execution/intents/server';
import {paperDatabase} from '../../../../../../lib/paper/store';
import {StockAnalystJobStore,stockAnalystJobs} from '../../../../../../lib/research/stockanalyst-job';
import {readBoundedJson} from '../../../../../../lib/request-body';
import {takePreviewSlot} from '../../../../../../lib/binance/preview-limit';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
type Context={params:Promise<{id:string}>};
async function handle(request:Request,context:Context,action:'STATUS'|'REPORT'|'RESUME'){
 let identity;try{identity=await intentOwner(request,action==='RESUME');}catch{return Response.json({error:'Wallet sign-in required.'},{status:401,headers});}
 const id=(await context.params).id;if(!/^x402_[a-f0-9]{32}$/.test(id))return Response.json({error:'Research job not found.'},{status:404,headers});
 if(!takePreviewSlot())return Response.json({error:'Research checks are busy.'},{status:429,headers});
 const key=process.env.FIRSTBELL_RESEARCH_JOB_KEY;if(!key||! /^[a-f0-9]{64}$/.test(key))return Response.json({error:'Private research job storage is not configured.'},{status:503,headers});
 const store=new StockAnalystJobStore(paperDatabase(),Buffer.from(key,'hex'));
 try{store.secret(identity.owner,id);}catch{return Response.json({error:'Research job not found.'},{status:404,headers});}
 try{
  const jobs=stockAnalystJobs(store),result=action==='REPORT'?await jobs.report(identity.owner,id):action==='RESUME'?await jobs.resume(identity.owner,id):await jobs.poll(identity.owner,id);
  const current=await intentOwner(request,action==='RESUME');if(current.owner!==identity.owner||current.wallet!==identity.wallet)return Response.json({error:'Wallet session changed.'},{status:401,headers});
  return Response.json({result,paymentSubmitted:false,newPaymentSubmitted:false,paymentVerification:'NOT_INFERRED_FROM_JOB_STATUS'},{headers});
 }catch{return Response.json({error:'The existing research job could not be verified. No new payment was submitted.'},{status:502,headers});}
}
export async function GET(request:Request,context:Context){const url=new URL(request.url);if([...url.searchParams.keys()].some(key=>key!=='view')||!['status','report'].includes(url.searchParams.get('view')??'status'))return Response.json({error:'Invalid research view.'},{status:400,headers});return handle(request,context,url.searchParams.get('view')==='report'?'REPORT':'STATUS');}
export async function POST(request:Request,context:Context){try{z.object({action:z.literal('RESUME')}).strict().parse(await readBoundedJson(request,128));}catch{return Response.json({error:'Choose resume for an existing retryable job.'},{status:400,headers});}return handle(request,context,'RESUME');}
