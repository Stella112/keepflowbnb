import {readBoundedJson} from "../../../lib/request-body";
import {cookies} from "next/headers";
import {randomBytes} from "node:crypto";
import {z} from "zod";
import {sameOrigin,identityTransportAllowed,identityTransportError} from "../../../lib/request-origin";
import {accountId,linkedWallet,saveLoginChallenge,readLoginChallenge,consumeLogin,ownedBellIds,issueIdentitySession,clearIdentitySession} from "../../../lib/paper/store";
import {loginChallenge,verifyLogin} from "../../../lib/paper/identity-message";
import {takePreviewSlot} from "../../../lib/binance/preview-limit";
export const dynamic="force-dynamic";
export async function GET(request:Request){if(!identityTransportAllowed(request))return Response.json({error:identityTransportError},{status:403,headers:{"Cache-Control":"no-store"}});const id=await accountId();return Response.json({wallet:linkedWallet(id)??null,ownedBellIds:ownedBellIds(id),mode:"PAPER"},{headers:{"Cache-Control":"no-store"}});}
const input=z.discriminatedUnion("action",[z.object({action:z.literal("CHALLENGE"),address:z.string().regex(/^0x[0-9a-fA-F]{40}$/)}).strict(),z.object({action:z.literal("VERIFY"),signature:z.string().regex(/^0x[0-9a-fA-F]{130}$/)}).strict(),z.object({action:z.literal("LOGOUT")}).strict()]);
export async function POST(request:Request){
 if(!identityTransportAllowed(request))return Response.json({error:identityTransportError},{status:403,headers:{"Cache-Control":"no-store"}});
 if(!sameOrigin(request)||!request.headers.get("origin"))return Response.json({error:"Open KeepFlow to sign in."},{status:403});
 if(!takePreviewSlot())return Response.json({error:"Sign-in is busy. Try again in a minute."},{status:429});
 try{
  const data=input.parse(await readBoundedJson(request,2048));
  if(data.action==="LOGOUT"){await clearIdentitySession();return Response.json({signedOut:true});}
  const id=await accountId(),origin=request.headers.get("origin")!;
  if(data.action==="CHALLENGE"){const challenge=loginChallenge(data.address,origin,randomBytes(12).toString("hex"));saveLoginChallenge(id,challenge);return Response.json({message:challenge.message,expiresAt:challenge.expiresAt},{headers:{"Cache-Control":"no-store"}});}
  const challenge=readLoginChallenge(id);if(!challenge||!await verifyLogin(challenge,origin,data.signature as `0x${string}`))return Response.json({error:"The signature is invalid or expired. Connect again."},{status:401});
  const restored=consumeLogin(id,challenge);await issueIdentitySession(restored,request);
  return Response.json({signedIn:true,wallet:linkedWallet(restored),restored:restored!==id},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Could not sign in. Reconnect your wallet and try again."},{status:400});}
}



