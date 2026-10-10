import {z} from "zod";
import {createHash} from "node:crypto";

const address=z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const atomicAmount=z.string().regex(/^[1-9]\d{0,77}$/).refine(value=>BigInt(value)<=(1n<<256n)-1n,"Amount exceeds uint256.");
const requirement=z.object({scheme:z.literal("exact"),network:z.literal("eip155:56"),amount:atomicAmount,asset:address,payTo:address,maxTimeoutSeconds:z.number().int().positive().max(3600),extra:z.record(z.string(),z.unknown()).optional()});
const challenge=z.object({x402Version:z.literal(2),resource:z.object({url:z.string().url(),description:z.string().max(1000).optional(),mimeType:z.string().max(100).optional()}),accepts:z.array(requirement).min(1).max(8)});
export type ResearchMerchant={url:string;payTo:string;asset:string;maximumAtomicAmount:string};

// Decode a provider offer only. This module creates no payment proof, signature or retry.
// A matching address is a configured merchant assertion, not cryptographic identity proof.
export function inspectResearchPayment(header:string,merchant:ResearchMerchant,now=Date.now()){
 if(header.length>16384||! /^[A-Za-z0-9+/]+={0,2}$/.test(header)||header.length%4!==0)throw new Error("INVALID_PAYMENT_REQUIRED");
 const bytes=Buffer.from(header,"base64");if(bytes.toString("base64")!==header)throw new Error("INVALID_PAYMENT_REQUIRED");
 const parsed=challenge.parse(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)));
 const target=new URL(merchant.url),resource=new URL(parsed.resource.url);
 if(target.protocol!=="https:"||target.username||target.password||resource.href!==target.href)throw new Error("RESOURCE_MISMATCH");
 if(!address.safeParse(merchant.payTo).success||!address.safeParse(merchant.asset).success||!atomicAmount.safeParse(merchant.maximumAtomicAmount).success)throw new Error("INVALID_MERCHANT_CONFIGURATION");
 const accepted=parsed.accepts.find(item=>item.asset.toLowerCase()===merchant.asset.toLowerCase()&&item.payTo.toLowerCase()===merchant.payTo.toLowerCase()&&BigInt(item.amount)<=BigInt(merchant.maximumAtomicAmount));
 if(!accepted)throw new Error("MERCHANT_TOKEN_OR_BUDGET_MISMATCH");
 return {status:"PAYMENT_REQUIRED" as const,resource:resource.href,scheme:accepted.scheme,network:accepted.network,asset:accepted.asset,payTo:accepted.payTo,amountAtomic:accepted.amount,observedAt:new Date(now).toISOString(),offerMaxTimeoutSeconds:accepted.maxTimeoutSeconds,challengeHash:createHash("sha256").update(bytes).digest("hex"),merchantIdentity:"CONFIGURATION_MATCH_ONLY" as const,paymentAuthorized:false,paymentSubmitted:false,executionEnabled:false};
}
