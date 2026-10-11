import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {WebStandardStreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {CallToolRequestSchema,ListToolsRequestSchema} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";
import {toolSchemas,type ToolAuthorization} from "./service.ts";
import {identityTransportAllowed,sameOrigin} from "../request-origin.ts";

export const mcpPublicReads=new Set(["search_stock","get_stock","get_stock_research","get_stock_underlying","get_bell","get_bell_versions","compare_bell_versions","create_bell_from_prompt","modify_bell_from_prompt"]);
export const mcpPrivateReads=new Set(["get_portfolio","get_portfolio_drift","get_receipt","explain_decision","create_policy_from_prompt","preview_next_contribution","preview_rebalance","get_execution_status"]);
export const mcpPreparations=new Set(["quote_stock","quote_bell","simulate_stock_buy","simulate_bell_buy","prepare_bell_execution"]);
const promptTools=new Set(["create_bell_from_prompt","modify_bell_from_prompt","create_policy_from_prompt"]);
const allowed=new Set([...mcpPublicReads,...mcpPrivateReads,...mcpPreparations]);
/** What each tool does, written for the model choosing tools. */
export const mcpDescriptions:Record<string,string>={
 "search_stock": "Find tokenized US stocks and ETFs available on BNB Smart Chain (bStocks and Ondo) by ticker or company name. Start here when the user names a company.",
 "get_stock": "Live data for one tokenized stock: each issuer's token, on-chain price, token-to-share ratio and trading status, from the Binance RWA Data API.",
 "get_stock_research": "Factual research brief for one stock from Binance data (price, issuers, market status). Not investment advice.",
 "get_stock_underlying": "Company profile and underlying market facts (market cap, P/E, 52-week range, dividend, issuer attestation links) for one tokenized stock and issuer.",
 "get_bell": "Read a Flow (a shareable portfolio: stocks, target weights, USDT reserve and rules) by id, e.g. \"ai-compute\", \"everyday-leaders\", \"nvidia\".",
 "get_bell_versions": "List the published versions of a Flow so you can see how its composition changed.",
 "compare_bell_versions": "Show exactly what changed between two versions of a Flow (added, removed and reweighted stocks, rule changes).",
 "create_bell_from_prompt": "Turn a plain-English idea (\"$100 in AI chips, max 30% each, keep 10% cash\") into an unsaved draft Flow the user can review on KeepFlow. Saves nothing.",
 "modify_bell_from_prompt": "Draft a fork of an existing Flow from an instruction (\"swap Tesla for an ETF, cut NVIDIA to 15%\"). Unsaved; the user decides whether to keep it.",
 "get_portfolio": "The user's paper portfolio: holdings, values and cash. Requires a KeepFlow assistant token.",
 "get_portfolio_drift": "How far the user's holdings are from their Flow's targets, per stock. Requires a KeepFlow assistant token.",
 "get_receipt": "A recorded purchase or decision receipt by id. Requires a KeepFlow assistant token.",
 "explain_decision": "Why the user's agent bought, skipped or rejected something, from the recorded decision (never invented). Requires a KeepFlow assistant token.",
 "create_policy_from_prompt": "Turn plain-English limits (\"never more than 25% in one company, no automatic selling\") into draft personal rules. Requires a KeepFlow assistant token; saves nothing.",
 "preview_next_contribution": "Preview what the user's next scheduled contribution would buy under their rules. Requires a KeepFlow assistant token.",
 "preview_rebalance": "Preview how new money would rebalance toward targets without selling. Requires a KeepFlow assistant token.",
 "get_execution_status": "Status of one of the user's purchases: submitted, confirmed, failed or partial. Requires a KeepFlow assistant token.",
 "quote_stock": "Executable quote for buying a stock with USDT. KeepFlow website session only.",
 "quote_bell": "Executable quotes for buying a whole Flow with USDT. KeepFlow website session only.",
 "simulate_stock_buy": "Dry-run a stock purchase with the Binance Transaction API. KeepFlow website session only.",
 "simulate_bell_buy": "Dry-run a Flow purchase leg by leg. KeepFlow website session only.",
 "prepare_bell_execution": "Prepare a checked Flow purchase for the user to sign in their own wallet. KeepFlow website session only."
};
export type McpReadDelegation={accountId:string;allowedTools:string[]};
export type McpDependencies={call:(name:string,args:unknown,authorization?:ToolAuthorization)=>Promise<unknown>;authorize:(request:Request,name:string)=>Promise<ToolAuthorization|undefined>;resolveBearer?:(token:string,request:Request)=>Promise<McpReadDelegation|undefined>;takeSlot:()=>boolean;takeAnonymousSlot?:()=>boolean};
/** Stateless per-request MCP. Authorization is freshly derived by a trusted server
 * callback on every tool call; no MCP session/bearer/client context grants authority.
 * Flow/policy mutation, execution authorization, arbitrary calldata and signing are
 * deliberately absent. Cookie-based identity requires explicit same-origin headers. */
export function createMcpHandler(deps:McpDependencies){return async(request:Request):Promise<Response>=>{
 const headers={"Cache-Control":"no-store"};
 if(request.method!=="POST")return Response.json({error:"Stateless MCP accepts POST only."},{status:405,headers:{...headers,Allow:"POST"}});
 if(!identityTransportAllowed(request))return Response.json({error:"Secure KeepFlow transport is required."},{status:403,headers});
 const authorizationHeader=request.headers.get('authorization'),bearer=authorizationHeader?.match(/^Bearer (fbm_[a-f0-9]{64})$/)?.[1];
 const unauthenticated=()=>Response.json({error:'A valid scoped read-only assistant token is required.'},{status:401,headers:{...headers,'WWW-Authenticate':'Bearer realm="KeepFlow read-only MCP"'}});
 if(authorizationHeader!==null&&!bearer)return unauthenticated();
 // Browser cookies always require same-origin. A non-browser client (no Origin header) without a token
 // gets anonymous public reads only and cookies are never consulted. A supplied foreign Origin is still rejected.
 const anonymous=!bearer&&!request.headers.has('origin');
 if(!anonymous&&(!bearer||request.headers.has('origin'))&&!sameOrigin(request))return Response.json({error:"Secure same-origin KeepFlow requests are required."},{status:403,headers});
 let delegation:McpReadDelegation|undefined;
 if(bearer){try{delegation=await deps.resolveBearer?.(bearer,request);}catch{}if(!delegation)return unauthenticated();}
 const slot=anonymous&&deps.takeAnonymousSlot?deps.takeAnonymousSlot:deps.takeSlot;
 if(!slot())return Response.json({error:"MCP requests are busy. Try again in one minute."},{status:429,headers});
 const server=new Server({name:"keepflow",version:"2.0.0"},{capabilities:{tools:{}},instructions:"KeepFlow helps people own tokenized US stocks (bStocks, Ondo) on BNB Smart Chain and package them as shareable portfolios called Flows. Use search_stock/get_stock for live Binance data, get_bell for Flows, and create_bell_from_prompt to turn an idea into a draft Flow. Private tools need a KeepFlow assistant token from keepflow.site/assistant. Tools never move money: purchases are always signed by the user in their own wallet on keepflow.site."});
 server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[...allowed].filter(name=>anonymous?mcpPublicReads.has(name):!bearer||!mcpPreparations.has(name)&&delegation!.allowedTools.includes(name)).map(name=>({name,description:`${mcpDescriptions[name]??"KeepFlow tool."} Never moves money.`,inputSchema:z.toJSONSchema(toolSchemas[name as keyof typeof toolSchemas]) as {type:"object";[key:string]:unknown},annotations:{readOnlyHint:!mcpPreparations.has(name),destructiveHint:false,openWorldHint:true}}))}));
 server.setRequestHandler(CallToolRequestSchema,async({params})=>{
  if(!allowed.has(params.name)||anonymous&&!mcpPublicReads.has(params.name))return {content:[{type:"text" as const,text:"This tool is unavailable through the read-only MCP interface."}],isError:true};
  if(!slot())return {content:[{type:"text" as const,text:"Read-only tool operations are busy. Try again in one minute."}],isError:true};
  try{let authorization:ToolAuthorization|undefined;
   if(bearer){const fresh=await deps.resolveBearer?.(bearer,request);if(!fresh||mcpPreparations.has(params.name)||!fresh.allowedTools.includes(params.name))return {content:[{type:'text' as const,text:'This tool is outside the current read-only assistant grant.'}],isError:true};authorization={verifiedSession:true,accountId:fresh.accountId,scopes:['PRIVATE_READ'],userConfirmedMutation:false};}
   else if(!anonymous)authorization=await deps.authorize(request,params.name);
   if(!mcpPublicReads.has(params.name)&&(!authorization||!authorization.verifiedSession||!authorization.scopes.includes(mcpPreparations.has(params.name)?"EXECUTION_PREPARATION":"PRIVATE_READ")))return {content:[{type:"text" as const,text:"Fresh verified wallet sign-in with the required scope is needed."}],isError:true};
   const schema=toolSchemas[params.name as keyof typeof toolSchemas];const checked=schema.safeParse(params.arguments??{});if(!checked.success)return {content:[{type:"text" as const,text:"Tool arguments do not match the strict schema."}],isError:true};
   const result=await deps.call(params.name,checked.data,authorization);return {content:[{type:"text" as const,text:JSON.stringify({result,executionAvailable:false})}],structuredContent:{result,executionAvailable:false}};
  }catch(error){
   // Draft parsers throw fixed, user-facing guidance; pass it back so the assistant can rephrase. Everything else stays sanitized.
   const guidance=promptTools.has(params.name)&&error instanceof Error&&/^[\w\s.,;:'"%()\-–]{8,240}$/.test(error.message)?error.message:null;
   return {content:[{type:"text" as const,text:guidance?`Draft not created: ${guidance}`:"The read-only tool request could not be verified."}],isError:true};}
 });
 const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true,maxRequestBodySize:8192});
 try{await server.connect(transport);const response=await transport.handleRequest(request);response.headers.set("Cache-Control","no-store");return response;}catch{return Response.json({error:"The MCP request could not be verified."},{status:400,headers});}finally{await server.close();}
 };}
