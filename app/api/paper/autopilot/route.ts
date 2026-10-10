import {readBoundedJson} from "../../../../lib/request-body";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {sameOrigin} from "../../../../lib/request-origin";
import {accountId,readAccount,transact,getBell,requestFingerprint} from "../../../../lib/paper/store";
import {autopilotInputSchema} from "../../../../lib/paper/model";
import {money} from "../../../../lib/paper/engine";
import {runPaperAgent} from "../../../../lib/paper/autopilot";
import {strategyAllowed} from "../../../../lib/paper/autopilot-math";
import {checkStrategyAdoption,strategyAdvisory,strategyDiff,StrategyVersionConflict} from '../../../../lib/paper/strategy-adoption';
import type {Receipt} from "../../../../lib/paper/model";
import {paperReceiptEvidence} from "../../../../lib/paper/receipt-evidence";
export const dynamic="force-dynamic";
export async function GET(){const state=readAccount(await accountId());const current=state.autopilot?getBell(state.autopilot.bell.id):undefined;return Response.json({plan:state.autopilot??null,policy:state.policy,updatedBell:current&&current.version!==state.autopilot?.bell.version?current:null,updateDiff:current&&state.autopilot?strategyDiff(state.autopilot.bell,current):null,policyCheck:current?strategyAdvisory(current,state.policy):null},{headers:{"Cache-Control":"no-store"}});}
const schema=z.discriminatedUnion("action",[z.object({action:z.literal("ENABLE"),...autopilotInputSchema.shape}).strict(),z.object({action:z.enum(["PAUSE","RESUME","CHECK"])}).strict(),z.object({action:z.literal("ADOPT"),expectedPlanId:z.string().min(1).max(80),expectedBellId:z.string().min(1).max(80),expectedPinnedVersion:z.number().int().positive(),expectedCurrentVersion:z.number().int().positive()}).strict()]);
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Open KeepFlow to manage your paper agent."},{status:403});
 try{const input=schema.parse(await readBoundedJson(request,2048));const id=await accountId();
  if(input.action==="CHECK")return Response.json(await runPaperAgent(id),{headers:{"Cache-Control":"no-store"}});
  if(input.action==="ADOPT"){
   const result=transact(id,state=>{const plan=state.autopilot;if(!plan)throw new Error("Configure a paper agent first.");const latest=getBell(plan.bell.id);const checked=checkStrategyAdoption(plan,latest,state.policy,input);if(!latest)throw new Error("This strategy is unavailable.");
    const key=`strategy:${plan.id}:${latest.id}:${latest.version}:${latest.contentHash}:${requestFingerprint(state.policy)}`;const prior=state.receipts.find(r=>r.requestId===key);if(prior)return {adopted:prior.status==="ADOPTED",receiptId:prior.id};
    if(state.receipts.length>=500)throw new Error("This paper account has reached its 500-receipt limit.");
    if(checked.allowed)plan.bell=structuredClone(latest);
    const receipt:Receipt={id:randomUUID(),requestId:key,fingerprint:key,mode:"PAPER",...paperReceiptEvidence(state,latest),action:"STRATEGY_UPDATE",bellId:latest.id,planId:plan.id,status:checked.allowed?"ADOPTED":"BLOCKED",reason:checked.reason,legs:[],createdAt:new Date().toISOString(),transactionHash:null,simulation:"NOT_RUN_PAPER_MODE"};state.receipts.push(receipt);plan.lastReceiptId=receipt.id;return {adopted:checked.allowed,receiptId:receipt.id};});return Response.json(result,{headers:{"Cache-Control":"no-store"}});
  }
  if(input.action==="ENABLE"){
   const bell=getBell(input.bellId);if(!bell)throw new Error("Choose an available Flow.");
   if(money(input.contributionUsd)<money("1")||money(input.contributionUsd)>money("1000")||money(input.maxTradeUsd)<money("1")||money(input.maxTradeUsd)>money("1000"))throw new Error("Use virtual contributions and limits between $1 and $1,000.");
   transact(id,state=>{const previous=state.autopilot;state.autopilot={id:previous?.id??randomUUID(),bell:previous?.bell.id===bell.id?previous.bell:bell,contributionUsd:input.contributionUsd,cadence:input.cadence,weekday:input.weekday,maxTradeUsd:input.maxTradeUsd,enabled:true,nextRunAt:previous?.nextRunAt??new Date().toISOString(),createdAt:previous?.createdAt??new Date().toISOString(),lastRunAt:previous?.lastRunAt,lastReceiptId:previous?.lastReceiptId};});
  }else transact(id,state=>{if(!state.autopilot)throw new Error("Choose a Flow and enable paper autopilot first.");state.autopilot.enabled=input.action==="RESUME";});
  return Response.json({saved:true},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return Response.json({error:error instanceof z.ZodError?"Check your contribution and schedule.":error instanceof Error?error.message:"Could not update the paper agent."},{status:error instanceof StrategyVersionConflict?409:400});}
}




