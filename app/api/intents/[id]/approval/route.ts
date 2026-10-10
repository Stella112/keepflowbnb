import {z} from 'zod';
import {intentOwner,readIntentBody} from '../../../../../lib/execution/intents/server';
import {approvalStatus,prepareApprovalHandoff,observeApproval} from '../../../../../lib/execution/approval-server';
import {takePreviewSlot} from '../../../../../lib/binance/preview-limit';
import type {Hex} from 'viem';
export const dynamic='force-dynamic';
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('PREPARE'),userConfirmed:z.literal(true)}).strict(),z.object({action:z.literal('OBSERVE'),hash:z.string().regex(/^0x[0-9a-fA-F]{64}$/)}).strict()]);
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function failure(error:unknown){const code=error instanceof Error?error.message:'INVALID_REQUEST';return Response.json({enabled:false,error:code==='AUTH_REQUIRED'?'Wallet sign-in required.':code==='EXECUTION_DISABLED'?'Mainnet approvals are disabled.':code==='NOT_FOUND'?'Intent not found.':'Approval review or reconciliation could not be verified. No automatic resend is available.'},{status:code==='AUTH_REQUIRED'?401:code==='EXECUTION_DISABLED'?403:code==='NOT_FOUND'?404:409,headers});}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const {owner,wallet}=await intentOwner(request),{id}=await params;return Response.json(approvalStatus(owner,wallet,id),{headers});}catch(error){return failure(error);}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const {owner,wallet}=await intentOwner(request,true),{id}=await params,input=schema.parse(await readIntentBody(request));if(!takePreviewSlot())return Response.json({enabled:false,error:'Approval checks are busy.'},{status:429,headers});return Response.json(input.action==='PREPARE'?await prepareApprovalHandoff(owner,wallet,id):await observeApproval(owner,wallet,id,input.hash as Hex),{headers});}catch(error){return failure(error);}}

