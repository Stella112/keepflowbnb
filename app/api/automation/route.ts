import {z} from 'zod';
import {intentOwner} from '../../../lib/execution/intents/server';
import {automationCreateSchema,listReadOnlyAutomation,readOnlyAutomationHistory,createReadOnlyAutomation,changeReadOnlyAutomation,runReadOnlyAutomation} from '../../../lib/execution/automation-server';
import {readBoundedJson} from '../../../lib/request-body';
import {takePreviewSlot} from '../../../lib/binance/preview-limit';
export const dynamic='force-dynamic';
export const maxDuration=300;
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const mutation=z.union([automationCreateSchema,z.object({action:z.enum(['ENABLE_READ_ONLY','PAUSE','REVOKE','CHECK_READ_ONLY']),id:z.string().uuid()}).strict()]);
export async function GET(request:Request){try{const {owner,wallet}=await intentOwner(request),url=new URL(request.url);if([...url.searchParams.keys()].some(key=>key!=='id')||url.searchParams.getAll('id').length>1)return Response.json({error:'Invalid history request.'},{status:400,headers});const id=url.searchParams.get('id'),result=id?readOnlyAutomationHistory(owner,z.string().uuid().parse(id)):listReadOnlyAutomation(owner),current=await intentOwner(request);if(current.owner!==owner||current.wallet!==wallet)throw Error('AUTH_CHANGED');return Response.json(result,{headers});}catch{return Response.json({error:'Authenticated wallet owner required.'},{status:401,headers});}}
export async function POST(request:Request){let identity;try{identity=await intentOwner(request,true);}catch{return Response.json({error:'Authenticated wallet owner required.'},{status:401,headers});}let input;try{input=mutation.parse(await readBoundedJson(request,2048));}catch{return Response.json({error:'Invalid read-only automation instructions.'},{status:400,headers});}if(!takePreviewSlot())return Response.json({error:'Automation checks are busy.'},{status:429,headers});
 try{const {owner,wallet}=identity,result=input.action==='CREATE_READ_ONLY'?{plan:await createReadOnlyAutomation(owner,wallet,input)}:input.action==='CHECK_READ_ONLY'?{run:await runReadOnlyAutomation(owner,input.id)??null}:{plan:changeReadOnlyAutomation(owner,input.id,input.action)};const current=await intentOwner(request,true);if(current.owner!==owner||current.wallet!==wallet)throw Error('AUTH_CHANGED');return Response.json({...result,mode:'READ_ONLY',executionAvailable:false,liveAutomationAvailable:false},{headers});}catch{return Response.json({error:'Read-only authority, ownership or captured strategy/rules could not be verified. Nothing was submitted.'},{status:409,headers});}
}
