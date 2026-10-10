import {bellInputSchema} from "../../../lib/paper/model";
import {accountId,listBells,createBell,ownedBellIds,publishBell} from "../../../lib/paper/store";
import {z} from "zod";
import {sameOrigin} from "../../../lib/request-origin";
import {takePreviewSlot} from "../../../lib/binance/preview-limit";
import {readBellBody} from "../../../lib/bells/request-body";
export const dynamic="force-dynamic";
export async function GET(){return Response.json({bells:listBells(),ownedIds:ownedBellIds(await accountId())},{headers:{"Cache-Control":"no-store"}});}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Open KeepFlow to create a Flow."},{status:403});
 if(!takePreviewSlot())return Response.json({error:"Flow creation is busy. Please try again in one minute."},{status:429});
 try{const parsed=bellInputSchema.safeParse(await readBellBody(request));if(!parsed.success)return Response.json({error:"Add distinct stocks and make all weights plus cash total 100%."},{status:400});const bell=createBell(parsed.data,await accountId());return Response.json({bell},{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"Could not save this Flow. Please check the form."},{status:400});}
}
export async function PATCH(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Open KeepFlow to publish a strategy."},{status:403});
 try{const parsed=z.object({id:z.string().min(1).max(80),version:z.number().int().positive(),definition:bellInputSchema}).strict().parse(await readBellBody(request));const bell=publishBell(parsed.definition,parsed.id,await accountId(),parsed.version);return Response.json({bell},{headers:{"Cache-Control":"no-store"}});}catch(error){return Response.json({error:error instanceof z.ZodError?"Check your definition and weights.":error instanceof Error?error.message:"Could not publish the strategy."},{status:400});}
}
