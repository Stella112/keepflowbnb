import {readPreviewReceipt} from "../../../../lib/paper/preview-receipts";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const receipt=await readPreviewReceipt((await params).id);return Response.json(receipt?{receipt}:{error:"Preview not found."},{status:receipt?200:404,headers:{"Cache-Control":"no-store"}});}
