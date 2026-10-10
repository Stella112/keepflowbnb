import "server-only";
import { randomUUID } from "node:crypto";
import { decodeFunctionData, erc20Abi, type Address } from "viem";
import { z } from "zod";
import { getBinanceClient } from "./client";
import { getDiscovery } from "./rwa";
import { publicClient, USDT_ADDRESS, verifyToken } from "./onchain";
import { quoteSchema, swapSchema, approvalSchema, assertQuoteMatches, simulationSchema, simulationSucceeded, swapEffectsMatch } from "./trading-schemas";
import { toUnits, fromUnits, shareExposure } from "./amounts";
import { addressSchema, curatedTickers } from "./rwa-schemas";

export const purchaseInputSchema=z.object({ticker:z.enum(curatedTickers),provider:z.string().min(1).max(50),wallet:addressSchema,amount:z.string().regex(/^\d+(\.\d{1,6})?$/).max(20)}).strict();
export type PurchaseInput=z.infer<typeof purchaseInputSchema>;
export class PurchaseError extends Error { constructor(readonly code:string,message:string){super(message);} }
export async function prepareQuote(input:PurchaseInput){
  const checked=purchaseInputSchema.parse(input);
  const asset=(await getDiscovery()).tokens.find((token)=>token.underlyingTicker===checked.ticker&&token.platformId===checked.provider);
  if(!asset)throw new PurchaseError("ASSET_UNAVAILABLE","This representation is temporarily unavailable.");
  if(!asset.statusInfo.openState||["ASSET_PAUSED","ASSET_LIMITED","UNSUPPORTED","MARKET_PAUSED","MARKET_MAINTENANCE"].includes(asset.statusInfo.reasonCode??""))throw new PurchaseError("ASSET_BLOCKED","This representation is not currently available for purchase.");
  const [funding,stock]=await Promise.all([verifyToken(USDT_ADDRESS),verifyToken(asset.tokenContractAddress)]);
  if(funding.symbol!=="USDT"||stock.symbol!==asset.tokenSymbol||String(stock.decimals)!==asset.decimals)throw new PurchaseError("TOKEN_MISMATCH","Token details could not be verified.");
  const amount=toUnits(checked.amount,funding.decimals);
  if(amount<=0n||amount>25n*10n**BigInt(funding.decimals))throw new PurchaseError("AMOUNT_LIMIT","Enter an amount between 0 and 25 USDT for this read-only preview.");
  const client=getBinanceClient();
  const query={binanceChainId:"56",amount:amount.toString(),fromTokenAddress:funding.address,toTokenAddress:stock.address,userWalletAddress:checked.wallet};
  const routes=await client.get("/api/v1/dex/aggregator/quote",query,z.array(quoteSchema));
  const matches=routes.filter((route)=>{try{assertQuoteMatches(route,{amount,from:funding.address,to:stock.address,fromDecimals:funding.decimals,toDecimals:stock.decimals,toSymbol:stock.symbol});return true;}catch{return false;}});
  // Single issuer only; never compare token quantities across issuers or assume RWA always uses RFQ.
  const route=matches.find((route)=>route.executionMode==="SWAP");
  if(!route)throw new PurchaseError("NO_VERIFIED_ROUTE","No verified transaction route is available for this amount.");
  const [balance,allowance]=await Promise.all([
    publicClient().readContract({address:funding.address,abi:erc20Abi,functionName:"balanceOf",args:[checked.wallet as Address]}),
    route.approveTarget?publicClient().readContract({address:funding.address,abi:erc20Abi,functionName:"allowance",args:[checked.wallet as Address,route.approveTarget as Address]}):Promise.resolve(0n),
  ]);
  return {id:randomUUID(),input:checked,asset,funding,stock,route,query,amount,balance,allowance,fetchedAt:new Date().toISOString()};
}
export type PreparedQuote=Awaited<ReturnType<typeof prepareQuote>>;
export function quoteSummary(prepared:PreparedQuote){
  return {id:prepared.id,ticker:prepared.input.ticker,provider:prepared.asset.platformId,amount:prepared.input.amount,tokenSymbol:prepared.stock.symbol,estimatedTokens:fromUnits(BigInt(prepared.route.toTokenAmount),prepared.stock.decimals),estimatedShares:shareExposure(BigInt(prepared.route.toTokenAmount),prepared.stock.decimals,prepared.asset.tokenToShareRatio),route:prepared.route.vendorName,estimatedNetworkFeeUsd:prepared.route.tradeFee,priceImpactPercent:prepared.route.priceImpactPercent,approvalRequired:prepared.allowance<prepared.amount,balanceSufficient:prepared.balance>=prepared.amount,usdtBalance:fromUnits(prepared.balance,prepared.funding.decimals),fetchedAt:prepared.fetchedAt,executionEnabled:false};
}
export async function buildCandidate(prepared:PreparedQuote){
  if(Date.now()-Date.parse(prepared.fetchedAt)>15_000)throw new PurchaseError("QUOTE_STALE","The quote changed, so request a fresh estimate.");
  const client=getBinanceClient();
  const built=await client.get("/api/v1/dex/aggregator/swap",{...prepared.query,quoteId:prepared.route.quoteId,slippagePercent:"0.5"},swapSchema);
  assertQuoteMatches({...built.routerResult,quoteId:prepared.route.quoteId,executionMode:built.executionMode,approveTarget:prepared.route.approveTarget,isBest:false},{amount:prepared.amount,from:prepared.funding.address,to:prepared.stock.address,fromDecimals:prepared.funding.decimals,toDecimals:prepared.stock.decimals,toSymbol:prepared.stock.symbol});
  if(built.tx.from.toLowerCase()!==prepared.input.wallet.toLowerCase()||built.tx.value!=="0"||!prepared.route.approveTarget||built.tx.to.toLowerCase()!==prepared.route.approveTarget.toLowerCase()||built.routerResult.vendorName!==prepared.route.vendorName||built.tx.slippagePercent!=="0.5"||BigInt(built.tx.minReceiveAmount)<BigInt(built.routerResult.toTokenAmount)*9950n/10_000n)throw new PurchaseError("BUILD_MISMATCH","The built transaction did not match the verified purchase.");
  let approval;
  if(prepared.allowance<prepared.amount){
    const approvals=await client.get("/api/v1/dex/aggregator/approve-transaction",{binanceChainId:"56",tokenContractAddress:prepared.funding.address,approveAmount:prepared.amount.toString(),vendor:prepared.route.vendorName},approvalSchema);
    approval=approvals[0];const decoded=decodeFunctionData({abi:erc20Abi,data:approval.data as `0x${string}`});
    if(decoded.functionName!=="approve"||String(decoded.args?.[0]).toLowerCase()!==prepared.route.approveTarget.toLowerCase()||decoded.args?.[1]!==prepared.amount||approval.dexContractAddress.toLowerCase()!==prepared.route.approveTarget.toLowerCase())throw new PurchaseError("APPROVAL_MISMATCH","The token approval did not match the required exact amount and spender.");
  }
  return {built,approval};
}
export async function simulateCandidate(prepared:PreparedQuote,candidate?:Awaited<ReturnType<typeof buildCandidate>>){
  if(Date.now()-Date.parse(prepared.fetchedAt)>15_000)throw new PurchaseError("QUOTE_STALE","Request a fresh quote before simulating.");
  const {built,approval}=candidate??await buildCandidate(prepared);
  const client=getBinanceClient();
  let approvalStatus:"NOT_NEEDED"|"SUCCESS"|"FAILED"="NOT_NEEDED";
  if(approval){
    const result=await client.simulate({from:prepared.input.wallet,to:prepared.funding.address,value:"0",data:approval.data},simulationSchema);
    const exact=result.allowanceChanges.length===1&&result.allowanceChanges.every(change=>change.tokenAddress.toLowerCase()===prepared.funding.address.toLowerCase()&&change.owner.toLowerCase()===prepared.input.wallet.toLowerCase()&&change.spender.toLowerCase()===prepared.route.approveTarget?.toLowerCase()&&BigInt(change.postAmount)===prepared.amount);
    approvalStatus=simulationSucceeded(result)&&exact&&result.balanceChanges.length===0?"SUCCESS":"FAILED";
  }
  const result=await client.simulate(built.tx,simulationSchema);
  const swapStatus=swapEffectsMatch(result,{wallet:prepared.input.wallet,funding:prepared.funding.address,stock:prepared.stock.address,amount:prepared.amount,minimumReceive:BigInt(built.tx.minReceiveAmount),spender:prepared.route.approveTarget??undefined,allowance:prepared.allowance})?"SUCCESS":"FAILED";
  // No state override or approval submission: swap simulation uses the wallet's actual onchain state.
  const message=swapStatus==="SUCCESS"?"The purchase transaction simulated successfully. Purchases remain disabled.":simulationSucceeded(result)?"The provider reported simulation success, but the balance or allowance effects could not be verified. No transaction was submitted.":prepared.balance<prepared.amount?"The purchase simulation failed. Your wallet needs more USDT for this amount.":prepared.allowance<prepared.amount?"The purchase simulation failed. The exact token approval must exist onchain before this swap can succeed.":"The purchase simulation failed. No transaction was submitted.";
  return {approvalStatus,swapStatus,message,checkedAt:new Date().toISOString(),executionEnabled:false as const};
}
