import {z} from "zod";
import {applicationTools} from "../../../lib/tools/application";
import {ToolError,type ToolAuthorization} from "../../../lib/tools/service";
import {existingAccountId,linkedWallet} from "../../../lib/paper/store";
import {identityTransportAllowed,sameOrigin} from "../../../lib/request-origin";
import {takePreviewSlot} from "../../../lib/binance/preview-limit";
import {readIntentBody} from "../../../lib/execution/intents/server";

export const dynamic="force-dynamic";
export const maxDuration=300;
const publicReads=new Set(["search_stock","get_stock","get_stock_research","get_stock_underlying","get_bell","get_bell_versions","compare_bell_versions","create_bell_from_prompt","modify_bell_from_prompt"]);
const privateReads=new Set(["get_portfolio","get_portfolio_drift","get_receipt","explain_decision","create_policy_from_prompt","preview_next_contribution","preview_rebalance","get_execution_status"]);
const preparations=new Set(["quote_stock","quote_bell","simulate_stock_buy","simulate_bell_buy","prepare_bell_execution"]);
const inputSchema=z.object({name:z.string().min(1).max(80),arguments:z.record(z.string(),z.unknown())}).strict();
// A read/preview HTTP boundary for the shared service, not an MCP transport.
// No Flow mutation, policy save, execution authorization or client context is accepted.
export async function POST(request:Request){
 const headers={"Cache-Control":"no-store"};
 if(!sameOrigin(request))return Response.json({error:"Open KeepFlow to request a tool preview."},{status:403,headers});
 try{
  const input=inputSchema.parse(await readIntentBody(request));
  if(!publicReads.has(input.name)&&!privateReads.has(input.name)&&!preparations.has(input.name))return Response.json({error:"This operation is unavailable through the read-only tool interface."},{status:403,headers});
  let authorization:ToolAuthorization|undefined;
  if(!publicReads.has(input.name)){
   if(!identityTransportAllowed(request))return Response.json({error:"Secure wallet sign-in required."},{status:401,headers});
   const owner=await existingAccountId();if(!owner||!linkedWallet(owner))return Response.json({error:"Wallet sign-in required."},{status:401,headers});
   authorization={verifiedSession:true,accountId:owner,scopes:preparations.has(input.name)?["EXECUTION_PREPARATION"]:["PRIVATE_READ"],userConfirmedMutation:false};
  }
  if(!takePreviewSlot())return Response.json({error:"Tool previews are busy. Try again in a minute."},{status:429,headers});
  return Response.json({result:await applicationTools.call(input.name,input.arguments,authorization),executionAvailable:false},{headers});
 }catch(error){return Response.json({error:error instanceof ToolError?error.message:"The read-only tool request could not be verified.",executionAvailable:false},{status:error instanceof ToolError&&error.code==="NOT_FOUND"?404:400,headers});}
}
