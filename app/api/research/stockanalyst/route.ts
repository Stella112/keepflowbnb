import {z} from 'zod';
import {intentOwner} from '../../../../lib/execution/intents/server';
import {readBoundedJson} from '../../../../lib/request-body';
import {takePreviewSlot} from '../../../../lib/binance/preview-limit';
import {curatedTickers} from '../../../../lib/binance/rwa-schemas';
import {stockAnalystPrice,stockAnalystOffer} from '../../../../lib/research/stockanalyst';
import {ResearchFeeAuthorityStore} from '../../../../lib/research/fee-authority';
import {paperDatabase,linkedWallet} from '../../../../lib/paper/store';
import {cookies} from 'next/headers';
import {createHash} from 'node:crypto';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const schema=z.union([z.object({action:z.enum(['PRICE','OFFER']),ticker:z.enum(curatedTickers)}).strict(),z.object({action:z.literal('AUTHORIZE'),offerId:z.string().uuid(),fingerprint:z.string().regex(/^[a-f0-9]{64}$/),asset:z.string().regex(/^0x[0-9a-fA-F]{40}$/),userConfirmed:z.literal(true)}).strict(),z.object({action:z.literal('REVOKE'),offerId:z.string().uuid()}).strict()]);
const paymentsEnabled=()=>process.env.MAINNET_WRITE_ENABLED==='true'&&process.env.EXECUTION_MODE==='MAINNET'&&process.env.FIRSTBELL_RESEARCH_PAYMENTS_ENABLED==='true';
export async function POST(request:Request){
 let identity;try{identity=await intentOwner(request,true);}catch{return Response.json({error:'Sign in with your wallet to check research fees.'},{status:401,headers});}
 let input;try{input=schema.parse(await readBoundedJson(request,512));}catch{return Response.json({error:'Choose a supported stock and research fee action.'},{status:400,headers});}
 if(!takePreviewSlot())return Response.json({error:'Research fee checks are busy.'},{status:429,headers});
 try{const store=new ResearchFeeAuthorityStore(paperDatabase(),Date.now,(owner,wallet,binding,now)=>linkedWallet(owner)?.toLowerCase()===wallet&&!!paperDatabase().prepare("SELECT account_id FROM identity_sessions WHERE token_hash=? AND account_id=? AND revoked=0 AND expires_at>?").get(binding,owner,now));
  if(input.action==='AUTHORIZE'){
   if(!paymentsEnabled())return Response.json({error:'Research payments remain disabled. No financial authorization was created.'},{status:403,headers});
   const token=(await cookies()).get('firstbell-identity')?.value;if(!token||! /^[a-f0-9]{64}$/.test(token))throw Error();
   const grant=store.approve(identity.owner,input.offerId,identity.wallet,input.fingerprint,input.asset,createHash('sha256').update(token).digest('hex'),{enabled:paymentsEnabled(),explicitHumanApproval:true,periodLimitAtomic:process.env.FIRSTBELL_RESEARCH_PERIOD_LIMIT_ATOMIC??'0'});
   return Response.json({grant,paymentSubmitted:false},{headers});
  }
  if(input.action==='REVOKE')return Response.json({grant:store.revoke(identity.owner,input.offerId),paymentSubmitted:false},{headers});
  const result=input.action==='PRICE'?await stockAnalystPrice():await stockAnalystOffer({symbols:[input.ticker],analysis_type:'comprehensive'});
  const current=await intentOwner(request,true);if(current.owner!==identity.owner||current.wallet!==identity.wallet)throw Error();
  const feeOffer='challenge' in result?store.save(identity.owner,identity.wallet,result.requestHash,result.challenge):undefined;
  return Response.json({result,feeOffer,feeAuthorizationAvailable:paymentsEnabled(),paymentAuthorized:false,paymentSubmitted:false,executionAvailable:false},{headers});
 }catch{return Response.json({error:'The official research provider could not be verified. No payment was submitted.'},{status:502,headers});}
}

