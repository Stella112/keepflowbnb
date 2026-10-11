import {z} from 'zod';
import {curatedTickers} from '../../../../../lib/binance/rwa-schemas';
import {getStockGap} from '../../../../../lib/binance/market';
import {takePreviewSlot} from '../../../../../lib/binance/preview-limit';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{ticker:string}>}){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};let ticker:string;
 try{if(new URL(request.url).search)throw Error();ticker=z.enum(curatedTickers).parse((await params).ticker);}catch{return Response.json({error:'Choose one supported ticker.'},{status:400,headers});}
 if(!takePreviewSlot())return Response.json({error:'Price data is busy. Try again in one minute.'},{status:429,headers});
 try{return Response.json(await getStockGap(ticker),{headers});}catch{return Response.json({error:'Live on-chain and reference prices are unavailable right now. Nothing was estimated.'},{status:503,headers});}
}
