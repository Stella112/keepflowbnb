import "server-only";
import {randomUUID} from "node:crypto";
import {getDiscovery} from "../binance/rwa";
import {money,contributionPlan,runLegs,buyWithPolicy} from "./engine";
import {planDue,paperRunKey,nextPaperRun} from "./autopilot-math";
import {readAccount,transact} from "./store";
import type {Receipt} from "./model";
import {effectiveBellPolicy} from '../execution/rules';
import {paperReceiptEvidence} from "./receipt-evidence";
export async function runPaperAgent(accountId:string,now=Date.now(),sharedMarket?:Awaited<ReturnType<typeof getDiscovery>>|null){
 const before=readAccount(accountId);if(!before.autopilot||!planDue(before.autopilot,now))return {due:false};
 const expectedPlan=before.autopilot.id,scheduledFor=before.autopilot.nextRunAt;
 const market=sharedMarket===undefined?await getDiscovery().catch(()=>null):sharedMarket;
 return transact(accountId,state=>{
  const plan=state.autopilot;
  if(!plan||plan.id!==expectedPlan||plan.nextRunAt!==scheduledFor||!planDue(plan,now))return {due:false};
  const key=paperRunKey(plan);const duplicate=state.receipts.find(r=>r.requestId===key);
  if(duplicate)return {due:true,receipt:duplicate};
  if(state.receipts.length>=500){plan.enabled=false;return {due:false,paused:true};}
  const contribution=money(plan.contributionUsd);state.cashMicros=(BigInt(state.cashMicros)+contribution).toString();
  let legs:Receipt["legs"]=[],reason="The virtual contribution stays in cash because live prices are unavailable.";
  if(market){
   try{
    const allocation=contributionPlan(plan.bell,state,market.tokens,contribution);
    const maxTrade=money(plan.maxTradeUsd)<money(state.policy.maxTradeUsd)?plan.maxTradeUsd:state.policy.maxTradeUsd;
    legs=runLegs(allocation,(ticker,amount)=>{const choices=market.tokens.filter(t=>t.underlyingTicker===ticker);const asset=choices.find(t=>t.platformId==="bstock"&&t.statusInfo.openState)??choices.find(t=>t.statusInfo.openState);return buyWithPolicy(state,asset,amount,market.fetchedAt,market.tokens,effectiveBellPolicy(plan.bell,{...state.policy,maxTradeUsd:maxTrade}),now);});
    reason=legs.length?"Your paper agent added the virtual contribution and applied your current rules. No existing position was sold.":"Your virtual contribution stays in cash: no target shortfall meets your drift and reserve rules.";
   }catch{reason="Your virtual contribution stays in cash because a held position could not be valued safely.";}
  }
  const fills=legs.filter(l=>l.status==="PAPER_FILLED").length;
  const status:Receipt["status"]=!legs.length?"SKIPPED":fills===legs.length?"PAPER_FILLED":fills>0?"PARTIAL":"BLOCKED";
  const receipt:Receipt={id:randomUUID(),requestId:key,fingerprint:key,mode:"PAPER",...paperReceiptEvidence(state,plan.bell,{...state.policy,maxTradeUsd:money(plan.maxTradeUsd)<money(state.policy.maxTradeUsd)?plan.maxTradeUsd:state.policy.maxTradeUsd}),action:"AUTOPILOT",bellId:plan.bell.id,planId:plan.id,scheduledFor,contributionUsd:plan.contributionUsd,status,reason,legs,createdAt:new Date(now).toISOString(),transactionHash:null,simulation:"NOT_RUN_PAPER_MODE"};
  state.receipts.push(receipt);plan.lastRunAt=new Date(now).toISOString();plan.lastReceiptId=receipt.id;
  // Missed periods are not charged retroactively. Next run is strictly after now.
  plan.nextRunAt=nextPaperRun(new Date(now).toISOString(),plan.cadence,plan.weekday);
  return {due:true,receipt};
 });
}


