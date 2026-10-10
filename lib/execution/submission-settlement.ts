import type {Hex} from 'viem';
import {reconcileIntent,type ReconcileRpc,type ChainReceipt} from './intents/reconcile-core.ts';
import type {Intent} from './intents/model.ts';
import type {LiveReceipt} from './live-receipt.ts';
import type {VerifiedSettlement} from './budget-store.ts';
import {fromUnits} from '../binance/amounts.ts';
export async function verifySubmissionSettlement(intent:Intent,hash:Hex,rpc:ReconcileRpc):Promise<{verification:string;evidence?:VerifiedSettlement;receipt?:LiveReceipt}>{
 let captured:ChainReceipt|undefined;
 const result=await reconcileIntent(intent,hash,{...rpc,receipt:async requested=>{const receipt=await rpc.receipt(requested);if(receipt)captured=structuredClone(receipt);return receipt;}});
 if(!['CONFIRMED','REVERTED'].includes(result.status))return {verification:result.status};
 // Use exactly the receipt whose effects were verified, never a second substituted receipt.
 const receipt=captured;if(!receipt)return {verification:'UNKNOWN'};
 const block=await rpc.block(receipt.blockNumber),head=await rpc.head(),confirmations=head-receipt.blockNumber+1n;
 if(confirmations<12n||block.hash?.toLowerCase()!==receipt.blockHash.toLowerCase()||(await rpc.block(receipt.blockNumber)).hash?.toLowerCase()!==receipt.blockHash.toLowerCase())return {verification:'PENDING_FINALITY'};
 const amount=result.status==='REVERTED'?0n:BigInt(result.spentUnits!);
 // USDT BSC 18 decimals -> budget USD6; round UP so a sub-micro debit is never ignored.
 if(intent.quote?.fundingDecimals!==18)return {verification:'UNVERIFIED'};
 const micros=(amount+10n**12n-1n)/10n**12n;
 return {verification:'VERIFIED_FINAL',receipt:{intentId:intent.id,mode:'MAINNET',chainId:56,wallet:intent.wallet,ticker:intent.input.ticker,provider:intent.input.provider,hash,outcome:result.status as 'CONFIRMED'|'REVERTED',confirmedAt:new Date(Number(block.timestamp)*1000).toISOString(),blockHash:receipt.blockHash,confirmations:Number(confirmations),funding:intent.quote.funding,stock:intent.quote.stock,fundingDecimals:intent.quote.fundingDecimals,stockDecimals:intent.quote.stockDecimals,spentUnits:amount.toString(),receivedUnits:result.receivedUnits??'0',stockBalanceAtBlock:result.stockBalanceAtBlock??null,blockNumber:receipt.blockNumber.toString(),policySnapshot:{...intent.policySnapshot}},evidence:{chainId:56,intentId:intent.id,wallet:intent.wallet,hash,actualSpendUsd:fromUnits(micros,6),confirmedAt:new Date(Number(block.timestamp)*1000).toISOString(),outcome:result.status as 'CONFIRMED'|'REVERTED',finality:'VERIFIED_FINAL',canonical:true,confirmations:Number(confirmations),blockHash:receipt.blockHash}};
}
