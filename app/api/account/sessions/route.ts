import {cookies} from "next/headers";
import {z} from "zod";
import {paperDatabase,linkedWallet} from "../../../../lib/paper/store";
import {identitySessionSummary,revokeOtherIdentitySessions} from "../../../../lib/paper/identity-sessions";
import {identityTransportAllowed,sameOrigin} from "../../../../lib/request-origin";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
async function currentToken(request:Request){if(!identityTransportAllowed(request))return undefined;return (await cookies()).get("firstbell-identity")?.value;}
const linked=(account:string)=>!!linkedWallet(account);
export async function GET(request:Request){const token=await currentToken(request),summary=token?identitySessionSummary(paperDatabase(),token,linked):undefined;if(!summary)return Response.json({error:"Sign in with your wallet to view sessions."},{status:401,headers});return Response.json({...summary,financialAuthorization:"UNCHANGED"},{headers});}
export async function POST(request:Request){if(!sameOrigin(request)||!identityTransportAllowed(request))return Response.json({error:"Open KeepFlow securely to manage sessions."},{status:403,headers});const token=await currentToken(request);if(!token||!identitySessionSummary(paperDatabase(),token,linked))return Response.json({error:"Wallet sign-in required."},{status:401,headers});try{const reader=request.body?.getReader();if(!reader)throw new Error();let count=0,raw="";const decoder=new TextDecoder();try{for(;;){const part=await reader.read();if(part.done)break;count+=part.value.byteLength;if(count>512){await reader.cancel();throw new Error();}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}z.object({action:z.literal("REVOKE_OTHERS")}).strict().parse(JSON.parse(raw));const result=revokeOtherIdentitySessions(paperDatabase(),token,linked);return Response.json({...result,financialAuthorization:"UNCHANGED"},{headers});}catch(error){const auth=error instanceof Error&&error.message==="SESSION_REQUIRED";return Response.json({error:auth?"Your session expired. Sign in again.":"Invalid session management request."},{status:auth?401:400,headers});}}
