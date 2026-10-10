import {z} from 'zod';
import {sameOrigin,identityTransportAllowed} from '../../../../lib/request-origin';
import {existingAccountId,linkedWallet} from '../../../../lib/paper/store';
import {takePreviewSlot} from '../../../../lib/binance/preview-limit';
import {curatedTickers} from '../../../../lib/binance/rwa-schemas';
import {readIntentBody} from '../../../../lib/execution/intents/server';
import {fetchResearchOffer} from '../../../../lib/research/offer-client';
export const dynamic='force-dynamic';
const schema=z.object({ticker:z.enum(curatedTickers)}).strict();
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(!sameOrigin(request)||!identityTransportAllowed(request))return Response.json({error:'Use a secure KeepFlow session to inspect research fees.'},{status:403,headers});
 const owner=await existingAccountId();if(!owner||!linkedWallet(owner))return Response.json({error:'Wallet sign-in required.'},{status:401,headers});
 try{
  const {ticker}=schema.parse(await readIntentBody(request));
  if(!takePreviewSlot())return Response.json({error:'Research fee checks are busy. Try again in a minute.'},{status:429,headers});
  const template=process.env.FIRSTBELL_RESEARCH_URL_TEMPLATE;
  const configured=process.env.FIRSTBELL_RESEARCH_OFFERS_ENABLED==='true'&&template?.split('{ticker}').length===2;
  const offer=await fetchResearchOffer(configured?{enabled:true,url:template!.replace('{ticker}',encodeURIComponent(ticker)),approvedOrigin:process.env.FIRSTBELL_RESEARCH_MERCHANT_ORIGIN??'',payTo:process.env.FIRSTBELL_RESEARCH_MERCHANT_ADDRESS??'',asset:process.env.FIRSTBELL_RESEARCH_PAYMENT_TOKEN??'',maximumAtomicAmount:process.env.FIRSTBELL_RESEARCH_MAX_ATOMIC_FEE??''}:undefined);
  return Response.json({ticker,offer,paymentAuthorized:false,paymentSubmitted:false},{headers});
 }catch{return Response.json({error:'The research fee request could not be verified.',paymentSubmitted:false},{status:400,headers});}
}
