import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {WebStandardStreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {CallToolRequestSchema,ListToolsRequestSchema} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";
import {toolSchemas,type ToolAuthorization} from "./service.ts";
import {identityTransportAllowed,sameOrigin} from "../request-origin.ts";

export const mcpPublicReads=new Set(["search_stock","get_stock","get_stock_research","get_stock_underlying","get_bell","get_bell_versions","compare_bell_versions","create_bell_from_prompt","modify_bell_from_prompt"]);
export const mcpPrivateReads=new Set(["get_portfolio","get_portfolio_drift","get_receipt","explain_decision","create_policy_from_prompt","preview_next_contribution","preview_rebalance","get_execution_status"]);
export const mcpPreparations=new Set(["quote_stock","quote_bell","simulate_stock_buy","simulate_bell_buy","prepare_bell_execution"]);
const allowed=new Set([...mcpPublicReads,...mcpPrivateReads,...mcpPreparations]);
export type McpReadDelegation={accountId:string;allowedTools:string[]};
export type McpDependencies={call:(name:string,args:unknown,authorization?:ToolAuthorization)=>Promise<unknown>;authorize:(request:Request,name:string)=>Promise<ToolAuthorization|undefined>;resolveBearer?:(token:string,request:Request)=>Promise<McpReadDelegation|undefined>;takeSlot:()=>boolean};
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
 // Browser cookies always require same-origin. A manually configured bearer
 // client may omit Origin; a supplied foreign Origin is still rejected.
 if((!bearer||request.headers.has('origin'))&&!sameOrigin(request))return Response.json({error:"Secure same-origin KeepFlow requests are required."},{status:403,headers});
 let delegation:McpReadDelegation|undefined;
 if(bearer){try{delegation=await deps.resolveBearer?.(bearer,request);}catch{}if(!delegation)return unauthenticated();}
 if(!deps.takeSlot())return Response.json({error:"MCP requests are busy. Try again in one minute."},{status:429,headers});
 const server=new Server({name:"keepflow",version:"2.0.0"},{capabilities:{tools:{}},instructions:"Read-only discovery and authorized previews. No financial execution or mutations. Identity is revalidated on every request."});
 server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[...allowed].filter(name=>!bearer||!mcpPreparations.has(name)&&delegation!.allowedTools.includes(name)).map(name=>({name,description:`KeepFlow ${mcpPreparations.has(name)?"authorized read-only preparation":mcpPrivateReads.has(name)?"private read-only preview":"public read or unsaved draft"}. Financial execution is disabled.`,inputSchema:z.toJSONSchema(toolSchemas[name as keyof typeof toolSchemas]) as {type:"object";[key:string]:unknown},annotations:{readOnlyHint:!mcpPreparations.has(name),destructiveHint:false,openWorldHint:true}}))}));
 server.setRequestHandler(CallToolRequestSchema,async({params})=>{
  if(!allowed.has(params.name))return {content:[{type:"text" as const,text:"This tool is unavailable through the read-only MCP interface."}],isError:true};
  if(!deps.takeSlot())return {content:[{type:"text" as const,text:"Read-only tool operations are busy. Try again in one minute."}],isError:true};
  try{let authorization:ToolAuthorization|undefined;
   if(bearer){const fresh=await deps.resolveBearer?.(bearer,request);if(!fresh||mcpPreparations.has(params.name)||!fresh.allowedTools.includes(params.name))return {content:[{type:'text' as const,text:'This tool is outside the current read-only assistant grant.'}],isError:true};authorization={verifiedSession:true,accountId:fresh.accountId,scopes:['PRIVATE_READ'],userConfirmedMutation:false};}
   else authorization=await deps.authorize(request,params.name);
   if(!mcpPublicReads.has(params.name)&&(!authorization||!authorization.verifiedSession||!authorization.scopes.includes(mcpPreparations.has(params.name)?"EXECUTION_PREPARATION":"PRIVATE_READ")))return {content:[{type:"text" as const,text:"Fresh verified wallet sign-in with the required scope is needed."}],isError:true};
   const schema=toolSchemas[params.name as keyof typeof toolSchemas];const checked=schema.safeParse(params.arguments??{});if(!checked.success)return {content:[{type:"text" as const,text:"Tool arguments do not match the strict schema."}],isError:true};
   const result=await deps.call(params.name,checked.data,authorization);return {content:[{type:"text" as const,text:JSON.stringify({result,executionAvailable:false})}],structuredContent:{result,executionAvailable:false}};
  }catch{return {content:[{type:"text" as const,text:"The read-only tool request could not be verified."}],isError:true};}
 });
 const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true,maxRequestBodySize:8192});
 try{await server.connect(transport);const response=await transport.handleRequest(request);response.headers.set("Cache-Control","no-store");return response;}catch{return Response.json({error:"The MCP request could not be verified."},{status:400,headers});}finally{await server.close();}
 };}
