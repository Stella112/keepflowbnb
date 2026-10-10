import {accountId} from "../../../../lib/paper/store";
import {expireDryCheck} from "../../../../lib/execution/store";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const receipt=expireDryCheck(await accountId(),(await params).id);
 if(!receipt)return Response.json({error:"Check not found."},{status:404});
 return Response.json(receipt,{headers:{"Cache-Control":"no-store"}});
}
