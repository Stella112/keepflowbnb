import {createHash,timingSafeEqual} from 'node:crypto';
import {identityTransportAllowed} from '../../../../lib/request-origin';
import {runDueReadOnlyAutomation} from '../../../../lib/execution/automation-server';
export const dynamic='force-dynamic';
export const maxDuration=300;
// Private operator scheduler boundary; no financial scope, signer or agent submission.
export async function POST(request:Request){const configured=process.env.FIRSTBELL_READONLY_RUNNER_TOKEN,provided=request.headers.get('authorization');const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};if(!identityTransportAllowed(request)||!configured||configured.length<32||!provided?.startsWith('Bearer ')||!timingSafeEqual(createHash('sha256').update(configured).digest(),createHash('sha256').update(provided.slice(7)).digest()))return Response.json({error:'Private read-only scheduler authorization required.'},{status:401,headers});try{return Response.json({mode:'READ_ONLY',executionAvailable:false,runs:await runDueReadOnlyAutomation()},{headers});}catch{return Response.json({error:'Read-only scheduling checks unavailable. Nothing was submitted.'},{status:503,headers});}}
