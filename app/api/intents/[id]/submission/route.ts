import {z} from 'zod';
import {intentOwner} from '../../../../../lib/execution/intents/server';
import {submissionEnabled,submissionStatus,beginSubmissionHandoff,observeSubmissionHash} from '../../../../../lib/execution/submission-server';
import {readBoundedJson} from '../../../../../lib/request-body';
import {takePreviewSlot} from '../../../../../lib/binance/preview-limit';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const input=z.discriminatedUnion('action',[z.object({action:z.literal('PREPARE'),confirmedFingerprint:z.string().regex(/^[0-9a-f]{64}$/),userConfirmed:z.literal(true)}).strict(),z.object({action:z.literal('OBSERVE'),ticket:z.string().regex(/^[0-9a-f]{64}$/).optional(),hash:z.string().regex(/^0x[0-9a-fA-F]{64}$/)}).strict()]);
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const {owner,wallet}=await intentOwner(request),id=z.string().uuid().parse((await params).id),result=submissionStatus(owner,id),current=await intentOwner(request);if(current.owner!==owner||current.wallet!==wallet)throw Error('AUTH_CHANGED');return Response.json(result,{headers});}catch{return Response.json({error:'Authenticated owned intent required.'},{status:401,headers});}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{let identity;try{identity=await intentOwner(request,true);}catch{return Response.json({error:'Authenticated owned intent required.'},{status:401,headers});}const {owner,wallet}=identity,id=z.string().uuid().parse((await params).id);let data;try{data=input.parse(await readBoundedJson(request,512));}catch{return Response.json({error:'Invalid submission instructions.'},{status:400,headers});}
  if(data.action==='PREPARE'&&!submissionEnabled())return Response.json({error:'Live signing and submission are disabled.',executionAvailable:false},{status:403,headers});
  if(!takePreviewSlot())return Response.json({error:'Submission checks are busy. Try later.'},{status:429,headers});
  const result=data.action==='PREPARE'?await beginSubmissionHandoff(owner,wallet,id,data.confirmedFingerprint):await observeSubmissionHash(owner,id,data.ticket,data.hash as `0x${string}`);try{const current=await intentOwner(request,true);if(current.owner!==owner||current.wallet!==wallet)throw Error('AUTH_CHANGED');}catch{return Response.json({error:'Session expired or changed. No transaction handoff is returned; do not retry spending.',executionAvailable:false},{status:401,headers});}return Response.json(result,{headers});
 }catch{return Response.json({error:'Submission could not be verified. Do not retry spending; check the owned intent status.'},{status:409,headers});}
}

