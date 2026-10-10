import {readBoundedJson} from "../../../../../lib/request-body";
import {cookies} from "next/headers";
import {z} from "zod";
import {sameOrigin,identityTransportAllowed,identityTransportError} from "../../../../../lib/request-origin";
import {accountId,linkedWallet,issueIdentitySession} from "../../../../../lib/paper/store";
import {readQrLogin,updateQrLogin} from "../../../../../lib/paper/qr-login";
import {qrStatus} from "../../../../../lib/paper/qr-login-rules";
export const dynamic="force-dynamic";
const paramsSchema=z.string().uuid(),headers={"Cache-Control":"no-store","Referrer-Policy":"no-referrer"};
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 if(!identityTransportAllowed(_request))return Response.json({error:identityTransportError},{status:403,headers});
 const id=(await params).id;if(!paramsSchema.safeParse(id).success)return Response.json({error:"QR login not found."},{status:404,headers});
 const login=readQrLogin(id);if(!login)return Response.json({error:"QR login not found."},{status:404,headers});
 const caller=await accountId(),desktop=caller===login.desktop;
 return Response.json({status:qrStatus(login),code:login.code,desktopOrigin:login.origin,expiresAt:new Date(login.expiresAt).toISOString(),desktop,wallet:desktop&&login.phoneAccount?linkedWallet(login.phoneAccount)??null:null,phoneWallet:linkedWallet(caller)??null},{headers});
}
const input=z.discriminatedUnion("action",[z.object({action:z.literal("APPROVE"),code:z.string().regex(/^[A-F0-9]{8}$/)}).strict(),z.object({action:z.enum(["FINISH","CANCEL"])}).strict()]);
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!identityTransportAllowed(request))return Response.json({error:identityTransportError},{status:403,headers});
 if(!sameOrigin(request))return Response.json({error:"Open KeepFlow to approve QR login."},{status:403,headers});
 try{
  const id=paramsSchema.parse((await params).id);const data=input.parse(await readBoundedJson(request,512));
  const restored=updateQrLogin(id,await accountId(),data.action,"code"in data?data.code:undefined);
  if(restored){await issueIdentitySession(restored,request);}
  return Response.json({saved:true,signedIn:Boolean(restored)},{headers});
 }catch{return Response.json({error:"QR login expired, was cancelled, or needs approval. Generate a new code to try again."},{status:400,headers});}
}



