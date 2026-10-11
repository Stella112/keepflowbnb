import {createHash,timingSafeEqual} from 'node:crypto';
import {identityTransportAllowed} from '../../../../lib/request-origin';
import {runDueAgentic} from '../../../../lib/agents/agentic-autopilot-server';
export const dynamic='force-dynamic';
export const maxDuration=300;
// Private loopback scheduler for the single operator plan; each period runs at most once.
export async function POST(request:Request){
 const configured=process.env.AGENTIC_RUNNER_TOKEN,provided=request.headers.get('authorization'),headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const digest=(v:string)=>createHash('sha256').update(v).digest();
 if(!identityTransportAllowed(request)||!configured||configured.length<32||!provided?.startsWith('Bearer ')||!timingSafeEqual(digest(configured),digest(provided.slice(7))))return Response.json({error:'Private scheduler authorization required.'},{status:401,headers});
 try{return Response.json({runs:await runDueAgentic()},{headers});}catch{return Response.json({error:'Scheduled Autopilot check failed. Nothing was resent.'},{status:503,headers});}
}
