import {randomUUID,createHash} from "node:crypto";
import {z} from "zod";
import {bellDryPlan,effectiveBellPolicy,type DryReceipt} from "./rules.ts";
import type {Flow,Policy} from "../paper/model.ts";
import type {ToolAuthorization} from "../tools/service.ts";

export const bellPreparationInput=z.object({requestId:z.string().uuid(),bellId:z.string().min(1).max(80),amount:z.string().regex(/^\d+(\.\d{1,6})?$/).max(16)}).strict();
export type BellPreparationKind="QUOTE_ONLY"|"SIMULATE";
const authorizationSchema=z.object({verifiedSession:z.literal(true),accountId:z.string().min(1).max(80),scopes:z.array(z.enum(["PRIVATE_READ","OWNED_BELL_MUTATION","EXECUTION_PREPARATION"])),userConfirmedMutation:z.boolean()}).strict();
type Existing={fingerprint:string;receipt:DryReceipt};
type Admission=({kind:"EXISTING"}&Existing)|{kind:"BUSY"}|{kind:"ADMITTED"};
export type BellPreparationDependencies={
 sessionAccount:()=>Promise<string|undefined>;
 linkedWallet:(owner:string)=>string|undefined;
 bell:(id:string)=>Flow|undefined;
 personalPolicy:(owner:string)=>Policy;
 find:(owner:string,requestId:string)=>Existing|undefined;
 admit:(owner:string,fingerprint:string,receipt:DryReceipt)=>Admission;
 read:(owner:string,id:string)=>DryReceipt|undefined;
 run:(owner:string,fingerprint:string,receipt:DryReceipt,kind:BellPreparationKind)=>Promise<void>;
 takeSlot:()=>boolean;
};
export class BellPreparationError extends Error{code:string;constructor(code:string,message:string){super(message);this.code=code;}}
// Authorization must originate at a trusted transport. It is never accepted in
// Flow tool arguments; it is also checked against the actual opaque session.
export function createBellPreparation(deps:BellPreparationDependencies){
 async function owner(authorization:ToolAuthorization|undefined){
  const session=await deps.sessionAccount();
  const checked=authorizationSchema.safeParse(authorization);
  if(!session||!checked.success||checked.data.accountId!==session||!checked.data.scopes.includes("EXECUTION_PREPARATION"))throw new BellPreparationError("AUTHORIZATION_REQUIRED","A verified session with execution-preparation scope is required.");
  const wallet=deps.linkedWallet(session);if(!wallet||!/^0x[0-9a-fA-F]{40}$/.test(wallet))throw new BellPreparationError("WALLET_SIGN_IN_REQUIRED","Sign in with your own wallet before preparing a Flow.");
  return {owner:session,wallet:wallet.toLowerCase()};
 }
 return {
  async prepare(input:unknown,authorization:ToolAuthorization|undefined,kind:BellPreparationKind="SIMULATE"){
   const checked=bellPreparationInput.safeParse(input);if(!checked.success)throw new BellPreparationError("INVALID_INPUT","Supply a request ID, Flow ID and decimal USDT amount only.");
   if(kind!=="QUOTE_ONLY"&&kind!=="SIMULATE")throw new BellPreparationError("INVALID_INPUT","Unknown read-only preparation mode.");
   const identity=await owner(authorization),args=checked.data;
   const fingerprint=createHash("sha256").update(JSON.stringify({requestId:args.requestId,bellId:args.bellId,amount:args.amount,wallet:identity.wallet,kind})).digest("hex");
   const existing=deps.find(identity.owner,args.requestId);
   if(existing){if(existing.fingerprint!==fingerprint)throw new BellPreparationError("REQUEST_CONFLICT","This request ID already belongs to different instructions.");return {receipt:existing.receipt,executionAvailable:false as const,financialAuthorization:"NONE" as const};}
   const bell=deps.bell(args.bellId);if(!bell)throw new BellPreparationError("NOT_FOUND","Flow not found.");
   const plan=bellDryPlan(bell,args.amount),policy=effectiveBellPolicy(bell,deps.personalPolicy(identity.owner));
   if(!deps.takeSlot())throw new BellPreparationError("RATE_LIMITED","Read-only preparation is busy. Try again later.");
   const receipt:DryReceipt={...plan,id:randomUUID(),requestId:args.requestId,mode:"DRY_RUN",status:"CHECKING",bell:{id:bell.id,title:bell.title,version:bell.version,contentHash:bell.contentHash},wallet:identity.wallet,amount:args.amount,policy,createdAt:new Date().toISOString(),reason:kind==="QUOTE_ONLY"?"Checking real wallet rules and obtaining quotes. No simulations, signing or submission requested.":"Checking real wallet rules, quotes and simulations. Signing and submission are unavailable.",executionEnabled:false,transactionHash:null,checkKind:kind};
   const admitted=deps.admit(identity.owner,fingerprint,receipt);
   if(admitted.kind==="BUSY")throw new BellPreparationError("CHECK_BUSY","A read-only Flow check is already active for this account.");
   if(admitted.kind==="EXISTING"){if(admitted.fingerprint!==fingerprint)throw new BellPreparationError("REQUEST_CONFLICT","This request ID already belongs to different instructions.");return {receipt:admitted.receipt,executionAvailable:false as const,financialAuthorization:"NONE" as const};}
   await deps.run(identity.owner,fingerprint,receipt,kind);
   const saved=deps.read(identity.owner,receipt.id);if(!saved)throw new BellPreparationError("NOT_FOUND","The recorded check could not be read.");
   return {receipt:saved,executionAvailable:false as const,financialAuthorization:"NONE" as const};
  },
 };
}
