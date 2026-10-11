import "server-only";
import {randomUUID} from "node:crypto";
import {erc20Abi,type Address,type Hex} from "viem";
import {existingAccountId,linkedWallet,paperDatabase,readAccount} from "../../paper/store";
import {identityTransportAllowed,sameOrigin} from "../../request-origin";
import {buildCandidate,prepareQuote,simulateCandidate} from "../../binance/trading";
import {publicClient} from "../../binance/onchain";
import {toUnits} from "../../binance/amounts";
import {walletPortfolio} from "../portfolio";
import {walletPolicy,quotePolicy} from "../rules";
import {IntentStore,intentFingerprint} from "./store-core";
import {reconcileIntent,type ReconcileRpc} from "./reconcile-core";
import {verifiedWallet,type Intent,type IntentInput} from "./model";
export const intentStore=()=>new IntentStore(paperDatabase());
export async function intentOwner(request:Request,mutation=false){
 if(!identityTransportAllowed(request)||(mutation&&!sameOrigin(request)))throw new Error("AUTH_REQUIRED");
 const owner=await existingAccountId(),wallet=owner?linkedWallet(owner):undefined;
 if(!owner||!wallet)throw new Error("AUTH_REQUIRED");
 return {owner,wallet:verifiedWallet(wallet)};
}
export async function readIntentBody(request:Request){const reader=request.body?.getReader();if(!reader)throw new Error("INVALID_BODY");let bytes=0,text="";const decoder=new TextDecoder();try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2048){await reader.cancel();throw new Error("INVALID_BODY");}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}finally{reader.releaseLock();}}
export async function prepareIntent(owner:string,wallet:string,input:IntentInput){
 const store=intentStore(),fingerprint=intentFingerprint({...input,wallet}),initial:Intent={id:randomUUID(),requestId:input.requestId,wallet,input,createdAt:new Date().toISOString(),status:"PREPARING",revision:0,executionAvailable:false,reason:"Checking authenticated wallet, policy and real transaction simulation. No financial authorization is granted."};
 const admission=store.admit(owner,fingerprint,initial);
 if(!admission.created){if(admission.fingerprint!==fingerprint)throw new Error("REQUEST_CONFLICT");return admission.intent;}
 const next:Intent={...initial,revision:1};
 try{
  const policy=readAccount(owner).policy,snapshot=await walletPortfolio(wallet);
  next.policySnapshot={...policy};next.walletSnapshot={blockNumber:snapshot.blockNumber,checkedAt:snapshot.checkedAt,marketFetchedAt:snapshot.marketFetchedAt,cashMicros:snapshot.cashMicros,totalMicros:snapshot.totalMicros,companyExposureMicros:snapshot.exposures[input.ticker]??"0"};
  next.policy=walletPolicy(toUnits(input.amount,6),BigInt(snapshot.cashMicros),BigInt(snapshot.exposures[input.ticker]??"0"),BigInt(snapshot.totalMicros),policy);
  if(!next.policy.allowed){next.status="BLOCKED";next.reason=next.policy.reason;}
  else{
   const prepared=await prepareQuote({ticker:input.ticker,provider:input.provider,amount:input.amount,wallet});
   const quoteDecision=quotePolicy(policy,prepared.fetchedAt,snapshot.marketFetchedAt,50);
   if(!quoteDecision.allowed){next.policy=quoteDecision;next.status="BLOCKED";next.reason=quoteDecision.reason;}
   else{
    const candidate=await buildCandidate(prepared),{built,approval}=candidate;
    if(!prepared.route.approveTarget)throw new Error("NO_VERIFIED_SPENDER");
    next.quote={id:prepared.route.quoteId,provider:prepared.asset.platformId,funding:prepared.funding.address,stock:prepared.stock.address,fundingDecimals:prepared.funding.decimals,stockDecimals:prepared.stock.decimals,amountUnits:prepared.amount.toString(),minimumReceiveUnits:built.tx.minReceiveAmount,spender:prepared.route.approveTarget,fetchedAt:prepared.fetchedAt,localFreshUntil:new Date(Date.parse(prepared.fetchedAt)+25_000).toISOString(),expirySource:"LOCAL_15_SECOND_PREFLIGHT_LIMIT_NOT_PROVIDER_EXPIRY"};
    next.transaction={chainId:56,from:built.tx.from,to:built.tx.to,data:built.tx.data as Hex,value:built.tx.value,gas:built.tx.gas,gasPrice:built.tx.gasPrice};
    if(approval)next.approval={token:prepared.funding.address,spender:prepared.route.approveTarget,amountUnits:prepared.amount.toString(),data:approval.data as Hex};
    const finalPolicy=quotePolicy(policy,prepared.fetchedAt,snapshot.marketFetchedAt,50);if(!finalPolicy.allowed)throw new Error("QUOTE_POLICY_STALE");
    next.simulation=await simulateCandidate(prepared,candidate);
    next.status=next.simulation.swapStatus==="SUCCESS"&&next.simulation.approvalStatus!=="FAILED"?"READY_READ_ONLY":"BLOCKED";
    next.reason=next.status==="READY_READ_ONLY"?"Pinned transaction passed read-only checks. Signing and submission are unavailable. A future authorized write flow must requote and revalidate.":next.simulation.message;
   }
  }
 }catch{next.status="BLOCKED";next.reason="Real wallet, quote, build or simulation could not be verified. Nothing was signed or submitted.";}
 if(!store.update(owner,initial,next))throw new Error("INTENT_CHANGED");return next;
}
function chainReader():ReconcileRpc{
 const client=publicClient();return {
  chainId:()=>client.getChainId(),
  transaction:async hash=>{try{return await client.getTransaction({hash});}catch(error){if(error instanceof Error&&error.name==="TransactionNotFoundError")return null;throw error;}},
  receipt:async hash=>{try{return await client.getTransactionReceipt({hash});}catch(error){if(error instanceof Error&&error.name==="TransactionReceiptNotFoundError")return null;throw error;}},
  head:()=>client.getBlockNumber(),block:async blockNumber=>{const block=await client.getBlock({blockNumber});return {hash:block.hash,timestamp:block.timestamp};},
  stockBalance:(token,wallet,blockNumber)=>client.readContract({address:token as Address,abi:erc20Abi,functionName:"balanceOf",args:[wallet as Address],blockNumber}),
 };
}
export async function reconcileOwnedIntent(owner:string,id:string,hash:Hex){const store=intentStore(),intent=store.read(owner,id);if(!intent)throw new Error("NOT_FOUND");if(!["READY_READ_ONLY","UNKNOWN","PENDING"].includes(intent.status))throw new Error("NOT_RECONCILABLE");const reconciliation=await reconcileIntent(intent,hash,chainReader()),next={...intent,revision:intent.revision+1,status:reconciliation.status,reason:reconciliation.reason,reconciliation};if(!store.update(owner,intent,next))throw new Error("INTENT_CHANGED_OR_HASH_ALREADY_USED");return next;}
