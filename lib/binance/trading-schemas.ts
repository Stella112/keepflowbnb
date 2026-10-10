import { z } from "zod";
import { addressSchema, decimalsSchema, positiveDecimalSchema, decimalSchema } from "./rwa-schemas.ts";
export const uintSchema = z.string().regex(/^\d+$/).max(78);
const positiveUint = uintSchema.refine((value) => BigInt(value) > 0n);
export const hexSchema = z.string().regex(/^0x([0-9a-fA-F]{2})*$/).max(100_000);
const quoteTokenSchema = z.object({ tokenContractAddress: addressSchema, tokenSymbol: z.string(), tokenUnitPrice: positiveDecimalSchema, decimal: decimalsSchema, isHoneyPot: z.boolean(), taxRate: decimalSchema });
export const quoteSchema = z.object({
  quoteId: z.string().min(1).max(100), vendorName: z.string().min(1), executionMode: z.enum(["SWAP", "RFQ"]),
  binanceChainId: z.literal("56"), fromTokenAmount: positiveUint, toTokenAmount: positiveUint,
  tradeFee: decimalSchema.nullable(), estimateGasFee: uintSchema.nullable(),
  priceImpactPercent: z.string().regex(/^-?\d+(\.\d+)?$/).nullable(), router: z.string(),
  fromToken: quoteTokenSchema, toToken: quoteTokenSchema,
  approveTarget: addressSchema.nullable(), isBest: z.boolean(),
  feeAmount: uintSchema.nullable(), feeToken: addressSchema.nullable(), actualSwapAmount: uintSchema.nullable(),
});
export type Quote = z.infer<typeof quoteSchema>;
// Swap routerResult omits quoteId/isBest/approveTarget in real successful response.
export const swapSchema = z.object({
  executionMode: z.literal("SWAP"), rfq: z.null(),
  routerResult: quoteSchema.omit({ quoteId:true, isBest:true, approveTarget:true, executionMode:true }),
  tx: z.object({ from:addressSchema, to:addressSchema, data:hexSchema, value:uintSchema, gas:positiveUint, gasPrice:uintSchema, minReceiveAmount:positiveUint, slippagePercent:decimalSchema }),
});
export const approvalSchema = z.array(z.object({ data:hexSchema, dexContractAddress:addressSchema, gasLimit:positiveUint, gasPrice:uintSchema })).length(1);
export const simulationSchema=z.object({status:z.enum(["SUCCESS","FAILED"]),failReason:z.string().nullable(),balanceChanges:z.array(z.object({contractAddress:addressSchema,tokenType:z.union([z.string(),z.number()]),change:z.string().regex(/^-?\d+$/),owner:addressSchema})),allowanceChanges:z.array(z.object({tokenAddress:addressSchema,owner:addressSchema,spender:addressSchema,preAmount:uintSchema,postAmount:uintSchema}))});
export function simulationSucceeded(result:z.infer<typeof simulationSchema>){return result.status==="SUCCESS"&&(result.failReason===null||result.failReason==="");}
export function swapEffectsMatch(result:z.infer<typeof simulationSchema>,intent:{wallet:string;funding:string;stock:string;amount:bigint;minimumReceive:bigint;spender?:string;allowance?:bigint}){
  if(!simulationSucceeded(result)||intent.amount<=0n||intent.minimumReceive<=0n||intent.funding.toLowerCase()===intent.stock.toLowerCase()||result.allowanceChanges.length>1)return false;
  // transferFrom may decrease the exact funding allowance. An empty changes list
  // is also valid (for example, some tokens preserve an unlimited allowance).
  // A reported change must match the independently read allowance and intent.
  for(const change of result.allowanceChanges){
    if(!intent.spender||intent.allowance===undefined||intent.allowance<intent.amount||
      change.tokenAddress.toLowerCase()!==intent.funding.toLowerCase()||
      change.owner.toLowerCase()!==intent.wallet.toLowerCase()||
      change.spender.toLowerCase()!==intent.spender.toLowerCase()||
      BigInt(change.preAmount)!==intent.allowance||BigInt(change.postAmount)!==intent.allowance-intent.amount)return false;
  }
  let spent=0n,received=0n;
  for(const change of result.balanceChanges){
    // Only ERC20 semantics are verified. Native/gas markers and other owners'
    // effects are not silently ignored or assigned invented provider meanings.
    if(change.owner.toLowerCase()!==intent.wallet.toLowerCase()||change.tokenType!=="ERC20")return false;
    const token=change.contractAddress.toLowerCase(),delta=BigInt(change.change);
    if(token===intent.funding.toLowerCase()){if(delta>0n)return false;spent-=delta;}
    else if(token===intent.stock.toLowerCase()){if(delta<0n)return false;received+=delta;}
    else return false;
  }
  return spent===intent.amount&&received>=intent.minimumReceive;
}
export function assertQuoteMatches(quote: Quote, expected: { amount:bigint; from:string; to:string; fromDecimals:number; toDecimals:number; toSymbol:string }) {
  if (BigInt(quote.fromTokenAmount)!==expected.amount || quote.fromToken.tokenContractAddress.toLowerCase()!==expected.from.toLowerCase() || quote.toToken.tokenContractAddress.toLowerCase()!==expected.to.toLowerCase() || Number(quote.fromToken.decimal)!==expected.fromDecimals || Number(quote.toToken.decimal)!==expected.toDecimals || quote.fromToken.tokenSymbol!=="USDT" || quote.toToken.tokenSymbol!==expected.toSymbol || quote.fromToken.isHoneyPot || quote.toToken.isHoneyPot || BigInt(quote.fromToken.taxRate.replace(".",""))!==0n || BigInt(quote.toToken.taxRate.replace(".",""))!==0n || quote.feeAmount!==null || quote.feeToken!==null || quote.actualSwapAmount!==null) throw new Error("Quote does not match verified purchase intent");
}
