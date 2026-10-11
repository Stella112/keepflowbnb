import {z} from 'zod';
import {readBoundedJson} from '../../../../lib/request-body';
import {curatedTickers} from '../../../../lib/binance/rwa-schemas';
import {agenticOperator} from '../../../../lib/agents/agentic-autopilot-server';
import {agenticResearchConfig,agenticResearchHistory,buyResearchWithAgentic} from '../../../../lib/research/agentic-research-server';
export const dynamic='force-dynamic';
export const maxDuration=120;
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const tickerSchema=z.enum(curatedTickers);
export async function GET(request:Request){
 const ticker=tickerSchema.safeParse(new URL(request.url).searchParams.get('ticker'));if(!ticker.success)return Response.json({error:'Choose a supported stock.'},{status:400,headers});
 try{const {owner,isOperator}=await agenticOperator(request);const config=agenticResearchConfig();return Response.json({enabled:config.enabled,isOperator,dailyLimit:config.dailyLimit,fee:'0.1',attempts:isOperator?agenticResearchHistory(owner,ticker.data):[]},{headers});}
 catch{return Response.json({enabled:false,isOperator:false,attempts:[]},{headers});}
}
export async function POST(request:Request){
 let identity;try{identity=await agenticOperator(request,true);}catch{return Response.json({error:'Sign in with your wallet first.'},{status:401,headers});}
 if(!identity.isOperator)return Response.json({error:'Paid research through the Agentic Wallet is limited to the operator account.'},{status:403,headers});
 let input;try{input=z.object({ticker:tickerSchema,requestId:z.string().uuid(),userConfirmed:z.literal(true)}).strict().parse(await readBoundedJson(request,256));}catch{return Response.json({error:'Invalid research request.'},{status:400,headers});}
 try{return Response.json(await buyResearchWithAgentic(identity.owner,input.ticker,input.requestId),{headers});}
 catch(error){return Response.json({error:error instanceof Error&&error.message==='RESEARCH_PAYMENTS_DISABLED'?'Paid research is switched off on the server.':'Paid research could not start. Nothing was paid.'},{status:409,headers});}
}
