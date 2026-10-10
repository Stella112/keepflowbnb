import {z} from 'zod';
import {sameOrigin} from '../../../../lib/request-origin';
import {existingAccountId,readAccount} from '../../../../lib/paper/store';
import {takePreviewSlot} from '../../../../lib/binance/preview-limit';
import {draftPersonalPolicy} from '../../../../lib/paper/policy-draft';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Open KeepFlow to draft personal rules.'},{status:403});
 const owner=await existingAccountId();if(!owner)return Response.json({error:'Open your portfolio or sign in before drafting personal rules.'},{status:401});
 if(!takePreviewSlot())return Response.json({error:'Drafting is busy. Try again in one minute.'},{status:429});
 try{
  const reader=request.body?.getReader();if(!reader)throw new Error('Enter your rule instructions.');let size=0,text='';const decoder=new TextDecoder();
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2048){await reader.cancel();throw new Error('Rule instructions are too long.');}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  const {prompt}=z.object({prompt:z.string().trim().min(1).max(1000)}).strict().parse(JSON.parse(text)),account=readAccount(owner);
  return Response.json({draft:draftPersonalPolicy(prompt,account.policy),expectedPolicyVersion:account.policyVersion??0},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return Response.json({error:error instanceof z.ZodError?'Use only a prompt with supported policy clauses.':error instanceof Error?error.message:'Could not prepare rules.'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
