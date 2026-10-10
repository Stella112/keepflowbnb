import {sameOrigin,identityTransportAllowed,trustedIdentityOrigin,identityTransportError} from "../../../../lib/request-origin";
import {accountId} from "../../../../lib/paper/store";
import {createQrLogin} from "../../../../lib/paper/qr-login";
import {takePreviewSlot} from "../../../../lib/binance/preview-limit";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 if(!identityTransportAllowed(request))return Response.json({error:identityTransportError},{status:403});
 if(!sameOrigin(request))return Response.json({error:"Open KeepFlow to start QR login."},{status:403});
 if(!takePreviewSlot())return Response.json({error:"Login is busy. Try again in a minute."},{status:429});
 const origin=request.headers.get("origin")!,publicUrl=new URL(process.env.FIRSTBELL_PUBLIC_URL||origin);
 if(!trustedIdentityOrigin(publicUrl.origin)||publicUrl.username||publicUrl.password)return Response.json({error:"Phone QR login requires a reachable HTTPS public URL. Use direct wallet sign-in on localhost while server HTTPS is being fixed."},{status:503});
 const login=createQrLogin(await accountId(),origin);
 return Response.json({id:login.id,code:login.code,expiresAt:new Date(login.expiresAt).toISOString(),phoneUrl:`${publicUrl.origin}/login/qr/${login.id}`},{headers:{"Cache-Control":"no-store"}});
}
