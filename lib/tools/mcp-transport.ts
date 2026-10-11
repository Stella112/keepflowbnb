import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {WebStandardStreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {CallToolRequestSchema,ListToolsRequestSchema} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";
import {toolSchemas,ToolError,type ToolAuthorization} from "./service.ts";
import {identityTransportAllowed,sameOrigin} from "../request-origin.ts";

// quote_stock, quote_flow and prepare_purchase_review are public: without a wallet-scoped grant they return a
// labelled price estimate and an unbound review link. With a grant or website session they use the verified wallet.
export const mcpPublicReads=new Set(["search_stock","get_stock","get_stock_research","get_stock_underlying","get_bell","get_bell_versions","compare_bell_versions","create_bell_from_prompt","modify_bell_from_prompt","get_flow","get_flow_versions","compare_flow_versions","create_flow_from_prompt","modify_flow_from_prompt","quote_stock","quote_flow","prepare_purchase_review","check_flow_against_rules"]);
export const mcpPrivateReads=new Set(["get_portfolio","get_wallet_portfolio","get_portfolio_drift","get_receipt","explain_decision","create_policy_from_prompt","preview_next_contribution","preview_rebalance","get_execution_status"]);
export const mcpPreparations=new Set(["quote_stock","quote_bell","quote_flow","simulate_stock_buy","simulate_bell_buy","simulate_flow_buy","prepare_bell_execution","prepare_purchase_review"]);
/** Preparations an approved assistant grant may use. prepare_bell_execution stays website-only. */
export const mcpGrantablePreparations=new Set(["quote_stock","quote_bell","quote_flow","simulate_stock_buy","simulate_bell_buy","simulate_flow_buy","prepare_purchase_review"]);
/** Grants list KeepFlow names; the legacy *_bell tool is covered by its Flow name. */
export const grantName=(name:string)=>name==="quote_bell"?"quote_flow":name==="simulate_bell_buy"?"simulate_flow_buy":name;
const promptTools=new Set(["create_bell_from_prompt","modify_bell_from_prompt","create_policy_from_prompt","create_flow_from_prompt","modify_flow_from_prompt"]);
const allowed=new Set([...mcpPublicReads,...mcpPrivateReads,...mcpPreparations]);
const safeMessage=/^[\w\s.,;:'"‘’“”%()\-–\/$+?!]{8,400}$/;
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
 "get_portfolio": "The user's paper-practice portfolio (virtual money): holdings, values and cash. Requires a KeepFlow assistant token.",
 "get_wallet_portfolio": "The user's real BNB Smart Chain wallet: USDT, BNB and tokenized-stock positions read from the chain at a stated block. Requires a KeepFlow assistant token that includes get_wallet_portfolio.",
 "get_portfolio_drift": "How far the user's holdings are from their Flow's targets, per stock. Requires a KeepFlow assistant token.",
 "get_receipt": "A recorded purchase or decision receipt by id. Requires a KeepFlow assistant token.",
 "explain_decision": "Why the user's agent bought, skipped or rejected something, from the recorded decision (never invented). Requires a KeepFlow assistant token.",
 "create_policy_from_prompt": "Turn plain-English limits (\"never more than 25% in one company, no automatic selling\") into draft personal rules. Requires a KeepFlow assistant token; saves nothing.",
 "preview_next_contribution": "Preview what the user's next scheduled contribution would buy under their rules. Requires a KeepFlow assistant token.",
 "preview_rebalance": "Preview how new money would rebalance toward targets without selling. Requires a KeepFlow assistant token.",
 "get_execution_status": "Status of one of the user's purchases: submitted, confirmed, failed or partial. Requires a KeepFlow assistant token.",
 "quote_stock": "Price a USDT purchase of one stock. Without a token: a labelled estimate from the live onchain price (not executable). With an assistant token that includes quote_stock: a real Binance quote for the user's verified wallet, with balance and rule checks.",
 "quote_flow": "Price a USDT purchase of a whole Flow, split by its target weights. Without a token: a labelled estimate per holding. With a token that includes quote_flow: real per-holding Binance quotes for the user's verified wallet, checked against the Flow's and the user's rules (poll get_execution_status with the returned receipt id).",
 "quote_bell": "Same as quote_flow, under its original First Bell name (takes bellId and a requestId UUID).",
 "simulate_stock_buy": "Dry-run a stock purchase from the user's verified wallet with the Binance Transaction API: quote, rule checks and simulation. Needs an assistant token that includes simulate_stock_buy. Nothing is signed or sent.",
 "simulate_flow_buy": "Dry-run a whole Flow purchase leg by leg from the user's verified wallet (quotes, rules, simulations). Needs an assistant token that includes simulate_flow_buy; poll get_execution_status with the receipt id. Nothing is signed or sent.",
 "simulate_bell_buy": "Same as simulate_flow_buy, under its original First Bell name (takes bellId and a requestId UUID).",
 "prepare_purchase_review": "When the user wants to buy, create a 15-minute KeepFlow review link for a stock (ticker) or a Flow (flowId) and an amount in USDT. The user opens it, signs in with their own wallet, and KeepFlow re-quotes, re-checks balance and rules and simulates before their wallet asks them to sign. Calling this buys nothing.",
 "get_flow": "Read a Flow (a shareable portfolio: stocks, target weights, USDT reserve and rules) by id, e.g. \"ai-compute\", \"everyday-leaders\", \"nvidia\".",
 "get_flow_versions": "List the published versions of a Flow so you can see how its composition changed.",
 "compare_flow_versions": "Show exactly what changed between two versions of a Flow (added, removed and reweighted stocks, rule changes).",
 "create_flow_from_prompt": "Turn a plain-English idea with named companies (\"$100: NVDA 40%, MSFT 30%, GOOGL 20%, keep 10% cash, max 40% each\") into an unsaved draft Flow. If it fails, the error explains how to rephrase and lists the available tickers. Saves nothing.",
 "modify_flow_from_prompt": "Draft a new version or fork of an existing Flow from an instruction with explicit weights. Unsaved; the user decides whether to keep it on KeepFlow.",
 "check_flow_against_rules": "Check a Flow against an investor's rules with KeepFlow's deterministic policy engine (not an AI judgement): returns ALLOW, ADJUSTMENT_REQUIRED, BLOCK or UNAVAILABLE, a reason per holding, and a proposed compliant allocation where removed weight stays in USDT. Pass maxSingleAssetBps/minReserveBps, or use a token with saved rules. Saves nothing.",
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
 const server=new Server({name:"keepflow",version:"2.0.0"},{capabilities:{tools:{}},instructions:"KeepFlow helps people own tokenized US stocks (bStocks, Ondo) on BNB Smart Chain and package them as shareable portfolios called Flows. Research with search_stock, get_stock, get_stock_research and get_stock_underlying (live Binance data). Read Flows with get_flow, draft one from an idea with create_flow_from_prompt, and price a plan with quote_stock or quote_flow. When the user wants to buy, call prepare_purchase_review and give them the link: they sign in with their own wallet on KeepFlow, which re-quotes, checks balance and rules and simulates before their wallet asks them to sign. Private tools (portfolio, receipts, wallet-specific quotes and simulations) need an assistant token from keepflow.site/assistant. No tool moves money, signs or submits a transaction, and drafts are never saved or published by the assistant."});
 server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[...allowed].filter(name=>anonymous?mcpPublicReads.has(name):!bearer||(!mcpPreparations.has(name)||mcpGrantablePreparations.has(name))&&delegation!.allowedTools.includes(grantName(name))).map(name=>({name,description:`${mcpDescriptions[name]??"KeepFlow tool."} Never moves money.`,inputSchema:z.toJSONSchema(toolSchemas[name as keyof typeof toolSchemas]) as {type:"object";[key:string]:unknown},annotations:{readOnlyHint:name!=="prepare_purchase_review"&&name!=="prepare_bell_execution",destructiveHint:false,idempotentHint:name!=="prepare_purchase_review",openWorldHint:true}}))}));
 server.setRequestHandler(CallToolRequestSchema,async({params})=>{
  if(!allowed.has(params.name)||anonymous&&!mcpPublicReads.has(params.name))return {content:[{type:"text" as const,text:"This tool is unavailable through the read-only MCP interface."}],isError:true};
  if(!slot())return {content:[{type:"text" as const,text:"Read-only tool operations are busy. Try again in one minute."}],isError:true};
  try{let authorization:ToolAuthorization|undefined;
   if(bearer){
    // The grant is re-resolved on every call; it never carries mutation authority.
    const fresh=await deps.resolveBearer?.(bearer,request),granted=Boolean(fresh?.allowedTools.includes(grantName(params.name)))&&(!mcpPreparations.has(params.name)||mcpGrantablePreparations.has(params.name));
    if(!fresh||!granted)return {content:[{type:'text' as const,text:'This tool is outside the current assistant grant. Approve a new grant that includes it at keepflow.site/account.'}],isError:true};
    authorization={verifiedSession:true,accountId:fresh.accountId,scopes:[mcpPreparations.has(params.name)?'EXECUTION_PREPARATION':'PRIVATE_READ'],userConfirmedMutation:false,channel:'ASSISTANT_GRANT'};}
   else if(!anonymous)authorization=await deps.authorize(request,params.name);
   if(!mcpPublicReads.has(params.name)&&(!authorization||!authorization.verifiedSession||!authorization.scopes.includes(mcpPreparations.has(params.name)?"EXECUTION_PREPARATION":"PRIVATE_READ")))return {content:[{type:"text" as const,text:"Fresh verified wallet sign-in with the required scope is needed."}],isError:true};
   const schema=toolSchemas[params.name as keyof typeof toolSchemas];const checked=schema.safeParse(params.arguments??{});if(!checked.success)return {content:[{type:"text" as const,text:`Tool arguments do not match the strict schema: ${checked.error.issues.slice(0,4).map(issue=>`${issue.path.join(".")||"arguments"}: ${issue.message}`).join("; ").slice(0,400)}`}],isError:true};
   const result=await deps.call(params.name,checked.data,authorization);return {content:[{type:"text" as const,text:JSON.stringify({result,executionAvailable:false})}],structuredContent:{result,executionAvailable:false}};
  }catch(error){
   // Draft parsers and KeepFlow tool errors carry fixed, user-facing guidance; pass it back so the assistant can rephrase. Everything else stays sanitized.
   const message=error instanceof Error&&safeMessage.test(error.message)?error.message:null;
   const guidance=message&&promptTools.has(params.name)?`Draft not created: ${message}`:message&&error instanceof ToolError?message:null;
   return {content:[{type:"text" as const,text:guidance??"The tool request could not be completed. Nothing was bought, signed or saved."}],isError:true};}
 });
 const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true,maxRequestBodySize:8192});
 try{await server.connect(transport);const response=await transport.handleRequest(request);response.headers.set("Cache-Control","no-store");return response;}catch{return Response.json({error:"The MCP request could not be verified."},{status:400,headers});}finally{await server.close();}
 };}
