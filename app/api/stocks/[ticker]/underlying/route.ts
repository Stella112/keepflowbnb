import {z} from 'zod';
import {curatedTickers} from '../../../../../lib/binance/rwa-schemas';
import {underlyingProviderSchema} from '../../../../../lib/research/underlying';
import {getUnderlyingResearch} from '../../../../../lib/research/underlying-server';
import {takePreviewSlot} from '../../../../../lib/binance/preview-limit';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{ticker:string}>}){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};let ticker:string,provider:string;
 try{const url=new URL(request.url);if([...url.searchParams.keys()].some(key=>key!=='provider')||url.searchParams.getAll('provider').length!==1)throw Error();ticker=z.enum(curatedTickers).parse((await params).ticker);provider=underlyingProviderSchema.parse(url.searchParams.get('provider'));}catch{return Response.json({error:'Choose one supported ticker and issuer.'},{status:400,headers});}
 if(!takePreviewSlot())return Response.json({error:'Underlying research data is busy. Try again in one minute.'},{status:429,headers});
 try{return Response.json(await getUnderlyingResearch(ticker,provider),{headers});}catch{return Response.json({error:'This supported stock representation could not be verified. No company or market data was invented.'},{status:503,headers});}
}
