import {readBoundedJson} from "../../../lib/request-body";
import {after} from "next/server";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {accountId,getBell,readAccount,requestFingerprint} from "../../../lib/paper/store";
import {sameOrigin} from "../../../lib/request-origin";
import {addressSchema} from "../../../lib/binance/rwa-schemas";
import {usdSchema} from "../../../lib/paper/model";
import {takePreviewSlot} from "../../../lib/binance/preview-limit";
import {bellDryPlan,effectiveBellPolicy,type DryReceipt} from "../../../lib/execution/rules";
import {findDryRequest,admitDryCheck,activeDryCheck} from "../../../lib/execution/store";
import {checkBell} from "../../../lib/execution/check";
export const dynamic="force-dynamic";
export const maxDuration=300;
const schema=z.object({requestId:z.string().uuid(),bellId:z.string().min(1).max(80),wallet:addressSchema,amount:usdSchema}).strict();
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Open the Flow to run a check."},{status:403});
 try{
  
  const input=schema.parse(await readBoundedJson(request,512)),owner=await accountId(),fingerprint=requestFingerprint({...input,wallet:input.wallet.toLowerCase()});
  const existing=findDryRequest(owner,input.requestId);
  if(existing)return existing.fingerprint===fingerprint?Response.json(existing.receipt,{headers:{"Cache-Control":"no-store"}}):Response.json({error:"This request ID was already used for different instructions."},{status:409});
  const bell=getBell(input.bellId);if(!bell)return Response.json({error:"Flow not found."},{status:404});
  const plan=bellDryPlan(bell,input.amount);
  if(activeDryCheck(owner))return Response.json({error:"A wallet check is already running for this account. Open its receipt or wait for it to finish."},{status:409});
  if(!takePreviewSlot())return Response.json({error:"Checks are busy. Try again in one minute."},{status:429});
  const receipt:DryReceipt={...plan,id:randomUUID(),requestId:input.requestId,mode:"DRY_RUN",status:"CHECKING",bell:{id:bell.id,title:bell.title,version:bell.version,contentHash:bell.contentHash},wallet:input.wallet,amount:input.amount,policy:effectiveBellPolicy(bell,readAccount(owner).policy),createdAt:new Date().toISOString(),reason:"Reading the wallet and checking each stock in order.",executionEnabled:false,transactionHash:null};
  const admission=admitDryCheck(owner,fingerprint,receipt);
  if(admission.kind==="BUSY")return Response.json({error:"A wallet check is already running for this account."},{status:409});
  if(admission.kind==="EXISTING")return admission.fingerprint===fingerprint?Response.json(admission.receipt,{headers:{"Cache-Control":"no-store"}}):Response.json({error:"This request ID was already used for different instructions."},{status:409});
  after(()=>checkBell(owner,fingerprint,receipt));
  return Response.json(receipt,{status:202,headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Check the wallet and amount. Flow checks accept up to 100 USDT, with at most 25 USDT per stock."},{status:400});}
}
