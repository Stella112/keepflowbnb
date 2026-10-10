import {decodeEventLog,erc20Abi,type Hex} from "viem";
import type {Intent,IntentStatus} from "./model.ts";
export type ChainTransaction={hash:string;from:string;to:string|null;input:string;value:bigint;blockNumber:bigint|null};
export type ChainReceipt={transactionHash:string;status:"success"|"reverted";blockNumber:bigint;blockHash:string;logs:{address:string;data:Hex;topics:readonly Hex[]}[]};
export type ReconcileRpc={chainId:()=>Promise<number>;transaction:(hash:Hex)=>Promise<ChainTransaction|null>;receipt:(hash:Hex)=>Promise<ChainReceipt|null>;head:()=>Promise<bigint>;block:(block:bigint)=>Promise<{hash:string|null;timestamp:bigint}>;stockBalance:(token:string,wallet:string,block:bigint)=>Promise<bigint>};
export async function reconcileIntent(intent:Intent,hash:Hex,rpc:ReconcileRpc):Promise<NonNullable<Intent["reconciliation"]>>{
 const result=(status:IntentStatus,reason:string,extra:Partial<NonNullable<Intent["reconciliation"]>>={})=>({hash,status,reason,checkedAt:new Date().toISOString(),...extra});
 if(!intent.transaction||!intent.quote)return result("UNVERIFIED","The intent has no verified pinned transaction.");
 try{
  if(await rpc.chainId()!==56)return result("UNKNOWN","The RPC chain could not be verified. No transaction was submitted or retried.");
  const tx=await rpc.transaction(hash);if(!tx)return result("UNKNOWN","The transaction is not visible to this RPC. Its outcome is unknown; do not retry spending.");
  const pinned=intent.transaction;
  if(tx.hash.toLowerCase()!==hash.toLowerCase()||tx.from.toLowerCase()!==pinned.from.toLowerCase()||tx.to?.toLowerCase()!==pinned.to.toLowerCase()||tx.input.toLowerCase()!==pinned.data.toLowerCase()||tx.value!==BigInt(pinned.value))throw new Error("UNRELATED_HASH");
  const receipt=await rpc.receipt(hash);if(!receipt||tx.blockNumber===null)return result("PENDING","The matching transaction is not yet confirmed. No transaction was submitted or retried.");
  const block=await rpc.block(receipt.blockNumber);
  if(receipt.transactionHash.toLowerCase()!==hash.toLowerCase()||receipt.blockNumber!==tx.blockNumber||receipt.blockHash.toLowerCase()!==block.hash?.toLowerCase())return result("UNKNOWN","The transaction block is inconsistent or reorganized. Reconciliation remains pending.");
  // No clock-skew tolerance: previously mined transactions never complete a new intent.
  if(block.timestamp*1000n<BigInt(Date.parse(intent.createdAt)))throw new Error("UNRELATED_HASH");
  const head=await rpc.head();if(head<receipt.blockNumber)return result("UNKNOWN","The RPC head precedes the receipt block.");
  const confirmations=head-receipt.blockNumber+1n,extra={blockNumber:receipt.blockNumber.toString(),confirmations:confirmations.toString()};
  if(confirmations<3n)return result("PENDING","Waiting for at least three matching BSC block confirmations.",extra);
  if(receipt.status==="reverted")return result("REVERTED","The matching transaction was mined and reverted. It was not retried.",extra);
  let spent=0n,received=0n;const q=intent.quote;
  for(const log of receipt.logs){if(![q.funding.toLowerCase(),q.stock.toLowerCase()].includes(log.address.toLowerCase()))continue;let decoded;try{decoded=decodeEventLog({abi:erc20Abi,eventName:"Transfer",data:log.data,topics:log.topics as [Hex,...Hex[]]});}catch{continue;}const {from,to,value}=decoded.args;
   const delta=(to.toLowerCase()===intent.wallet.toLowerCase()?value:0n)-(from.toLowerCase()===intent.wallet.toLowerCase()?value:0n);
   if(log.address.toLowerCase()===q.funding.toLowerCase())spent-=delta;else received+=delta;
  }
  if(spent!==BigInt(q.amountUnits)||received<BigInt(q.minimumReceiveUnits))return result("UNVERIFIED","Mined success does not prove the requested token effects. Funding debit or stock receipt did not match.",extra);
  const balance=await rpc.stockBalance(q.stock,intent.wallet,receipt.blockNumber);
  if(balance<received)return result("UNVERIFIED","The stock balance at the receipt block does not substantiate the received tokens.",extra);
  if((await rpc.block(receipt.blockNumber)).hash?.toLowerCase()!==receipt.blockHash.toLowerCase())return result("UNKNOWN","The receipt block changed during balance verification. Reconcile again without retrying spending.");
  return result("CONFIRMED","An externally submitted transaction matched the pinned intent, confirmed, and produced verified token receipts and stock balance. KeepFlow submitted nothing.",{...extra,spentUnits:spent.toString(),receivedUnits:received.toString(),stockBalanceAtBlock:balance.toString()});
 }catch(error){if(error instanceof Error&&error.message==="UNRELATED_HASH")throw error;return result("UNKNOWN","The RPC result could not be verified. Outcome remains unknown; no spending was retried.");}
}
