import {intentOwner} from '../../../../lib/execution/intents/server';
import {paperDatabase} from '../../../../lib/paper/store';
import {LiveReceiptStore} from '../../../../lib/execution/live-receipt';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};try{const id=(await params).id,{owner}=await intentOwner(request),receipt=new LiveReceiptStore(paperDatabase()).read(owner,id);if(!receipt)return Response.json({error:'Receipt not found.'},{status:404,headers});return Response.json(receipt,{headers});}catch{return Response.json({error:'Sign in to view your receipt.'},{status:401,headers});}}

