import {existingAccountId,paperDatabase} from "../../../../../lib/paper/store";
import {paperReceiptExport,readOwnedPaperReceipt} from "../../../../../lib/paper/receipt-evidence";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,owner=await existingAccountId();
 const receipt=readOwnedPaperReceipt(paperDatabase(),owner,id);
 if(!receipt)return Response.json({error:"This paper receipt is not in this browser's account."},{status:404,headers});
 if(new URL(request.url).searchParams.get("download")==="1")return Response.json(paperReceiptExport(receipt),{headers:{...headers,"Content-Disposition":`attachment; filename="firstbell-paper-${receipt.id.replace(/[^a-zA-Z0-9-]/g,"")}.json"`}});
 return Response.json({receipt},{headers});
}

