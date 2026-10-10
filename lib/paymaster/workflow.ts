import {z} from "zod";
import {fromUnits} from "../binance/amounts.ts";
import {checkMegaFuelSponsorability,transactionFingerprint,type SponsorabilityResult} from "./megafuel.ts";
const address=z.string().regex(/^0x[0-9a-fA-F]{40}$/),uint=z.string().regex(/^\d+$/).max(78).refine(value=>BigInt(value)<(1n<<256n));
const candidateSchema=z.object({from:address,to:address,value:z.literal("0"),data:z.string().regex(/^0x[0-9a-fA-F]{8}(?:[0-9a-fA-F]{2})*$/).max(20002),gas:uint.refine(value=>BigInt(value)>0n),gasPrice:uint}).strict();
const inputSchema=z.object({chainId:z.literal(56),wallet:address,amountUsdtMicros:z.string().regex(/^\d+$/).max(8),quoteAt:z.iso.datetime({offset:true}),route:address,policyAllowed:z.boolean(),candidate:candidateSchema,simulation:z.object({swapStatus:z.enum(["SUCCESS","FAILED"]),approvalStatus:z.enum(["NOT_NEEDED","SUCCESS","FAILED"]),checkedAt:z.iso.datetime({offset:true}),transactionFingerprint:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}).strict();
export type SponsoredPreparationInput=z.input<typeof inputSchema>;
export type SponsoredPreparation={phase:"READ_ONLY_PREPARATION";eligibility:SponsorabilityResult;transactionFingerprint:string|null;gas:{limit:string;priceWei:string;estimatedBnb:string;source:"VALIDATED_BUILD_ESTIMATE_NOT_SPENT"}|null;signable:false;executionEnabled:false;blockers:string[]};
export type SponsorWorkflowOptions={enabled?:boolean;now?:number;fetcher?:typeof fetch;allowedRoutes?:string[];allowedSelectors?:string[]};
function sponsorTransaction(candidate:z.infer<typeof candidateSchema>){return {from:candidate.from,to:candidate.to,value:"0x0" as const,data:candidate.data,gas:`0x${BigInt(candidate.gas).toString(16)}`};}
export function sponsorCandidateFingerprint(candidate:unknown){return transactionFingerprint(sponsorTransaction(candidateSchema.parse(candidate)));}
function configured(name:string){return (process.env[name]??"").split(",").map(value=>value.trim()).filter(Boolean);}
/** Internal only. Inputs must originate from verified application policy/quote/build
 * and the same actual simulation. Operator allowlists never originate from client JSON.
 * Eligibility is a public provider read; it grants no financial permission. */
export async function checkSponsorship(input:unknown,options:SponsorWorkflowOptions={}):Promise<SponsorabilityResult>{
 const now=options.now??Date.now(),parsed=inputSchema.safeParse(input);const blocked=(code:string):SponsorabilityResult=>({status:"BLOCKED",code,checkedAt:now,executionEnabled:false});
 if(!parsed.success||!Number.isFinite(now))return blocked("INVALID_VALIDATED_PREPARATION");const value=parsed.data;
 if(!value.policyAllowed||value.simulation.swapStatus!=="SUCCESS"||value.simulation.approvalStatus==="FAILED")return blocked("POLICY_OR_SIMULATION_NOT_PASSED");
 if(value.route.toLowerCase()!==value.candidate.to.toLowerCase()||value.wallet.toLowerCase()!==value.candidate.from.toLowerCase())return blocked("CANDIDATE_ROUTE_MISMATCH");
 const tx=sponsorTransaction(value.candidate);
 return checkMegaFuelSponsorability(tx,{chainId:56,wallet:value.wallet,allowedRoutes:options.allowedRoutes??configured("PAYMASTER_ALLOWED_ROUTES"),allowedSelectors:options.allowedSelectors??configured("PAYMASTER_ALLOWED_SELECTORS"),maxGas:1_000_000,amountUsdtMicros:value.amountUsdtMicros,policyAllowed:true,quoteAt:Date.parse(value.quoteAt),simulation:{status:"SUCCESS",checkedAt:Date.parse(value.simulation.checkedAt),transactionFingerprint:value.simulation.transactionFingerprint}},options);
}
export async function prepareSponsoredExecution(input:unknown,options:SponsorWorkflowOptions={}):Promise<SponsoredPreparation>{
 const eligibility=await checkSponsorship(input,options),parsed=inputSchema.safeParse(input);
 return {phase:"READ_ONLY_PREPARATION",eligibility,transactionFingerprint:parsed.success?sponsorCandidateFingerprint(parsed.data.candidate):null,gas:parsed.success?{limit:parsed.data.candidate.gas,priceWei:parsed.data.candidate.gasPrice,estimatedBnb:fromUnits(BigInt(parsed.data.candidate.gas)*BigInt(parsed.data.candidate.gasPrice),18),source:"VALIDATED_BUILD_ESTIMATE_NOT_SPENT"}:null,signable:false,executionEnabled:false,blockers:["Raw zero-gas transaction signing compatibility with this wallet is unverified.","A guarded durable raw-signing/submission engine exists, but this read-only endpoint has no financially authorized compatible signer attached.","Sponsor eligibility is not a promise of available sponsor funds or final confirmation. Canonical zero gas proves the original fee, not the sponsor payment.","Financial authorization and budget reservation are not granted by this read-only check. No paid fallback is performed."]};
}
// These app abstractions deliberately have no signer, payment, raw submission or
// invented provider method. Only verified future integration may replace the gates.
export function authorizeSponsoredExecution(){return {status:"EXECUTION_DISABLED" as const,authorized:false as const,executionEnabled:false as const,reason:"Mainnet financial authorization and wallet capability verification are unavailable."};}
export function submitSponsoredExecution(){return {status:"EXECUTION_DISABLED" as const,submitted:false as const,transactionHash:null,executionEnabled:false as const,reason:"No signed transaction submission or fallback is enabled."};}
export function verifySponsoredExecution(){return {status:"UNVERIFIED" as const,confirmed:false as const,executionEnabled:false as const,reason:"Provider status alone cannot establish canonical original-transaction sponsorship, exact wallet effects and gas payer."};}
