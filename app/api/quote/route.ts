import {readBoundedJson,RequestBodyError} from "../../../lib/request-body";
import { prepareQuote, purchaseInputSchema, quoteSummary, simulateCandidate, PurchaseError } from "../../../lib/binance/trading";
import { savePreview } from "../../../lib/binance/preview-store";
import { BinanceApiError } from "../../../lib/binance/client-core";
import { takePreviewSlot } from "../../../lib/binance/preview-limit";
import { sameOrigin } from "../../../lib/request-origin";
import {savePreviewReceipt} from "../../../lib/paper/preview-receipts";
export const dynamic="force-dynamic";
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:"Open the stock page to request an estimate."},{status:403});
  if(Number(request.headers.get("content-length")??0)>2048)return Response.json({error:"Invalid request."},{status:400});
  try{
    
    const parsed=purchaseInputSchema.safeParse(await readBoundedJson(request,2048));
    if(!parsed.success)return Response.json({error:"Check the amount, issuer and wallet address."},{status:400});
    if(!takePreviewSlot())return Response.json({error:"Purchase checks are busy. Please try again in one minute."},{status:429,headers:{"Retry-After":"60","Cache-Control":"no-store"}});
    const prepared=await prepareQuote(parsed.data);savePreview(prepared);
    const simulation=await simulateCandidate(prepared);
    const receipt={...quoteSummary(prepared),simulation};await savePreviewReceipt(receipt);
    return Response.json(receipt,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof RequestBodyError)return Response.json({error:"Invalid request."},{status:400,headers:{"Cache-Control":"no-store"}});
    const message=error instanceof PurchaseError?error.message:error instanceof BinanceApiError&&error.businessCode===40375?"This route requires an order worth at least 5 USD. No funds were spent.":"No executable estimate is available right now. Please try again.";
    return Response.json({error:message},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
