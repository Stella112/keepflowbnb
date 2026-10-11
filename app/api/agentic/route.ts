import {z} from 'zod';
import {readBoundedJson} from '../../../lib/request-body';
import {agenticOperator,agenticOverview,agenticBinding,agenticConfig,connectAgentic,verifyAgentic,disconnectAgenticWallet,reconcileAgentic,runAgenticNow,saveAgenticPlan,setAgenticEnabled} from '../../../lib/agents/agentic-autopilot-server';
export const dynamic='force-dynamic';
export const maxDuration=300;
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('SAVE_PLAN'),bellId:z.string().min(1).max(80),bellVersion:z.number().int().positive(),bellHash:z.string().min(1).max(128),contributionUsd:z.string().regex(/^\d+(\.\d{1,6})?$/).max(16).refine(v=>Number(v)>=0.25&&Number(v)<=1000),cadence:z.enum(['DAILY','WEEKLY'])}).strict(),
 z.object({action:z.enum(['ENABLE','PAUSE','CONNECT_START','CONNECT_VERIFY','DISCONNECT'])}).strict(),
 z.object({action:z.literal('RUN_NOW'),requestId:z.string().uuid()}).strict(),
 z.object({action:z.literal('RECONCILE'),key:z.string().min(1).max(400)}).strict(),
]);
export async function GET(request:Request){
 try{const {owner,isOperator}=await agenticOperator(request);return Response.json(await agenticOverview(owner,isOperator),{headers});}
 catch{return Response.json({error:'Sign in with your wallet to view Autopilot.'},{status:401,headers});}
}
export async function POST(request:Request){
 let identity;try{identity=await agenticOperator(request,true);}catch{return Response.json({error:'Sign in with your wallet first.'},{status:401,headers});}
 let input:z.infer<typeof schema>;try{input=schema.parse(await readBoundedJson(request,1024));}catch{return Response.json({error:'Invalid Autopilot request.'},{status:400,headers});}
 try{
  if(input.action==='CONNECT_START'||input.action==='CONNECT_VERIFY'){if(!agenticConfig().live)throw Error('LIVE_DISABLED');return Response.json(input.action==='CONNECT_START'?await connectAgentic(identity.owner):await verifyAgentic(identity.owner),{headers});}
  if(input.action==='DISCONNECT'){await disconnectAgenticWallet(identity.owner);return Response.json({disconnected:true},{headers});}
  if(!agenticBinding(identity.owner))throw Error('NOT_CONNECTED');
  if(input.action==='SAVE_PLAN'){const {action,...plan}=input;void action;return Response.json({plan:saveAgenticPlan(identity.owner,plan)},{headers});}
  if(input.action==='ENABLE'||input.action==='PAUSE')return Response.json({plan:setAgenticEnabled(identity.owner,input.action==='ENABLE')},{headers});
  if(input.action==='RUN_NOW')return Response.json(await runAgenticNow(identity.owner,input.requestId),{headers});
  if(input.action==='RECONCILE')return Response.json({run:await reconcileAgentic(identity.owner,input.key)},{headers});
  return Response.json({error:'Invalid Autopilot request.'},{status:400,headers});
 }catch(error){const code=error instanceof Error?error.message:'';
  const message=code==='NOT_CONNECTED'?'Connect your Agentic Wallet first.':code==='NOT_APPROVED'?'Binance has not confirmed the sign-in yet. Approve it in the Binance app, then try again.':code==='SIGNIN_EXPIRED'?'That sign-in expired. Start again to get a new code.':code==='WALLET_ALREADY_LINKED'?'That Agentic Wallet is already connected to another KeepFlow account.':code==='CAPACITY_REACHED'?'Live Autopilot is full right now. Try paper Autopilot instead.':code==='BSC_ADDRESS_UNVERIFIED'||code==='NOT_CONNECTED_AFTER_SIGNIN'?'The Agentic Wallet has no single BNB Chain address. Check it in the Binance app.':code==='LIVE_DISABLED'?'Live Autopilot is switched off on the server.':code==='NO_PLAN'?'Save a plan first.':code==='BELL_VERSION_UNAVAILABLE'?'That Flow version is no longer available. Choose it again.':'Autopilot could not complete this request. Nothing new was submitted.';
  return Response.json({error:message},{status:409,headers});}
}
