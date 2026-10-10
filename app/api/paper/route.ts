import {readBoundedJson} from "../../../lib/request-body";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {getDiscovery} from "../../../lib/binance/rwa";
import {curatedTickers,addressSchema} from "../../../lib/binance/rwa-schemas";
import {sameOrigin} from "../../../lib/request-origin";
import {takePreviewSlot} from "../../../lib/binance/preview-limit";
import {accountId,readAccount,transact,getBell,requestFingerprint} from "../../../lib/paper/store";
import {accountView} from "../../../lib/paper/view";
import {usdSchema,policySchema,type Receipt} from "../../../lib/paper/model";
import {money,fillSell,buyWithPolicy,basketPlan,contributionPlan,runLegs} from "../../../lib/paper/engine";
import {mutatePolicy,assertTradeRequestAvailable,PolicyConflict} from "../../../lib/paper/policy-mutations";
import {effectiveBellPolicy} from "../../../lib/execution/rules";
import {paperReceiptEvidence} from "../../../lib/paper/receipt-evidence";
export const dynamic="force-dynamic";
const requestId=z.string().uuid();
const inputSchema=z.discriminatedUnion("action",[
 z.object({action:z.literal("BUY"),requestId,ticker:z.enum(curatedTickers),provider:z.string().min(1).max(50),amount:usdSchema}).strict(),
 z.object({action:z.literal("SELL"),requestId,address:addressSchema}).strict(),
 z.object({action:z.enum(["BASKET","AUTOPILOT"]),requestId,bellId:z.string().min(1).max(80),amount:usdSchema}).strict(),
 z.object({action:z.literal("POLICY"),requestId,policy:policySchema,expectedPolicyVersion:z.number().int().min(0).optional()}).strict(),
]);
const headers={"Cache-Control":"no-store"};
export async function GET(){const id=await accountId();const market=await getDiscovery().catch(()=>null);return Response.json(accountView(readAccount(id),market?.tokens??[],market?.fetchedAt??null),{headers});}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Open KeepFlow to use your paper account."},{status:403,headers});
 try{
  const input=inputSchema.parse(await readBoundedJson(request,4096));
  const id=await accountId();
  if(input.action==="POLICY"){if(money(input.policy.maxTradeUsd)<=0n||money(input.policy.maxTradeUsd)>money("1000"))throw new Error("Maximum paper trade must be between 0 and 1,000 virtual dollars.");const result=transact(id,s=>mutatePolicy(s,{...input,fingerprint:requestFingerprint(input)}));return Response.json(result,{headers});}
  assertTradeRequestAvailable(readAccount(id),input.requestId);
  const fingerprint=requestFingerprint(input);const prior=readAccount(id).receipts.find(r=>r.requestId===input.requestId);
  if(prior){if(prior.fingerprint!==fingerprint)throw new Error("This request was already used for a different action.");return Response.json({receipt:prior},{headers});}
  if(!takePreviewSlot())return Response.json({error:"Paper trading checks are busy. Try again in one minute."},{status:429,headers:{...headers,"Retry-After":"60"}});
  const amount="amount"in input?money(input.amount):0n;if("amount"in input&&(amount<money("1")||amount>money("1000")))throw new Error("Enter between 1 and 1,000 virtual dollars.");
  const market=await getDiscovery();
  const bell="bellId"in input?getBell(input.bellId):undefined;if("bellId"in input&&!bell)throw new Error("This Flow was not found.");
  const receipt=transact(id,state=>{
   assertTradeRequestAvailable(state,input.requestId);
   const existing=state.receipts.find(r=>r.requestId===input.requestId);if(existing){if(existing.fingerprint!==fingerprint)throw new Error("Request conflict.");return existing;}
   if(state.receipts.length>=500)throw new Error("This practice account has reached its 500-receipt limit.");
   let legs:Receipt["legs"];
   if(input.action==="BUY")legs=[buyWithPolicy(state,market.tokens.find(t=>t.underlyingTicker===input.ticker&&t.platformId===input.provider),amount,market.fetchedAt,market.tokens,state.policy)];
   else if(input.action==="SELL")legs=[fillSell(state,input.address,market.tokens,market.fetchedAt)];
   else{
    const plan=input.action==="AUTOPILOT"?contributionPlan(bell!,state,market.tokens,amount):basketPlan(bell!,amount);
    legs=runLegs(plan,(ticker,budget)=>{const choices=market.tokens.filter(t=>t.underlyingTicker===ticker);const asset=choices.find(t=>t.platformId==="bstock"&&t.statusInfo.openState)??choices.find(t=>t.statusInfo.openState);return buyWithPolicy(state,asset,budget,market.fetchedAt,market.tokens,effectiveBellPolicy(bell!,state.policy));});
   }
   const filled=legs.filter(l=>l.status==="PAPER_FILLED").length;
   const status:Receipt["status"]=!legs.length?"SKIPPED":filled===legs.length?"PAPER_FILLED":filled>0?"PARTIAL":legs[0].status==="BLOCKED"?"BLOCKED":"FAILED";
   const result:Receipt={id:randomUUID(),requestId:input.requestId,fingerprint,mode:"PAPER",...paperReceiptEvidence(state,bell),action:input.action,...(bell?{bellId:bell.id}:{}),status,reason:!legs.length?"No underweight assets meet your drift and cash-reserve rules.":status==="PAPER_FILLED"?"Completed in your virtual account. No mainnet transaction, approval or gas fee.":status==="PARTIAL"?"Some paper legs completed; processing stopped at the first blocked or failed leg.":legs[0].reason,legs,createdAt:new Date().toISOString(),transactionHash:null,simulation:"NOT_RUN_PAPER_MODE"};
   state.receipts.push(result);return result;
  });
  return Response.json({receipt},{headers});
 }catch(error){const message=error instanceof z.ZodError?"Check your paper amount, holdings or rules.":error instanceof Error&&!("businessCode"in error)&&!error.message.includes("SQLITE")?error.message:"Live market data is unavailable. No paper balance was changed.";return Response.json({error:message},{status:error instanceof PolicyConflict?409:400,headers});}
}


