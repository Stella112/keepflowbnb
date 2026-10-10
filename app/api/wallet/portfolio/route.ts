import {readBoundedJson,RequestBodyError} from "../../../../lib/request-body";
import {z} from "zod";
import {addressSchema} from "../../../../lib/binance/rwa-schemas";
import {sameOrigin} from "../../../../lib/request-origin";
import {takePreviewSlot} from "../../../../lib/binance/preview-limit";
import {walletPortfolio} from "../../../../lib/execution/portfolio";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Open KeepFlow to check a wallet."},{status:403});
 try{const input=z.object({wallet:addressSchema}).strict().parse(await readBoundedJson(request,256));
  if(!takePreviewSlot())return Response.json({error:"Wallet checks are busy. Try again in one minute."},{status:429});
  return Response.json(await walletPortfolio(input.wallet),{headers:{"Cache-Control":"no-store"}});
 }catch(error){if(error instanceof RequestBodyError)return Response.json({error:"Invalid request."},{status:400});return Response.json({error:"The wallet balances could not be verified. Try again; unavailable balances are never shown as zero."},{status:503});}
}
