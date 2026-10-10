import {identityTransportAllowed} from '../../../../../../lib/request-origin';
import {reviewIdentity,reviewStore} from '../../../../../../lib/agents/review-server';
import {exportBellReview} from '../../../../../../lib/agents/review-export';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 if(!identityTransportAllowed(request))return Response.json({error:'Use secure KeepFlow to export a private review.'},{status:403,headers});
 const identity=await reviewIdentity();if(!identity)return Response.json({error:'Wallet sign-in required.'},{status:401,headers});
 const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return Response.json({error:'Review not found.'},{status:404,headers});
 const job=reviewStore().read(identity.owner,id);if(!job)return Response.json({error:'Review not found.'},{status:404,headers});
 try{return Response.json(exportBellReview(job),{headers:{...headers,'Content-Disposition':`attachment; filename="firstbell-review-${id}.json"`}});}catch{return Response.json({error:'Only a verified completed review can be exported.'},{status:409,headers});}
}
