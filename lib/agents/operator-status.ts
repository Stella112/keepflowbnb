import {execFile} from "node:child_process";
import {readFile,realpath} from "node:fs/promises";
import {resolve,relative,isAbsolute} from "node:path";
import {z} from "zod";

// No public HTTP handler: trusted single-operator diagnostics, never user execution.
export type ReadonlyCommand="WALLET_STATUS"|"WALLET_ADDRESS"|"WALLET_SETTINGS"|"STUDIO_VERSION";
export const readonlyCommands:Readonly<Record<ReadonlyCommand,readonly string[]>>=Object.freeze({WALLET_STATUS:Object.freeze(["wallet","status","--json"]),WALLET_ADDRESS:Object.freeze(["wallet","address","--json"]),WALLET_SETTINGS:Object.freeze(["wallet","settings","--json"]),STUDIO_VERSION:Object.freeze(["--version"])});
type Runner=(command:ReadonlyCommand)=>Promise<string>;
type Status={status:"DISABLED"|"BLOCKED"|"UNAVAILABLE"|"UNCONNECTED"|"CREATING"|"CONNECTED"|"INSTALLED";code:string;scope:"SINGLE_OPERATOR";executionEnabled:false;wallet?:string;version?:string;sessionExpireTime?:string;dailyLimit?:number;tradeAllTokens?:boolean;abnormalTxnHandling?:"AutoReject"|"NeedConfirmation"};
const base=(status:Status["status"],code:string):Status=>({status,code,scope:"SINGLE_OPERATOR",executionEnabled:false});
const bindingSchema=z.object({operatorId:z.string().min(1).max(80),requesterId:z.string().min(1).max(80),wallet:z.string().regex(/^0x[0-9a-fA-F]{40}$/),authorization:z.literal("OPERATOR_READ_ONLY")}).strict();
function parsed(text:string):unknown{if(Buffer.byteLength(text)>32768)throw new Error("CLI response exceeded limit");return JSON.parse(text);}
function contained(root:string,path:string){const rel=relative(root,path);return rel!==""&&!rel.startsWith("..")&&!isAbsolute(rel);}

export function projectLocalRunner(projectRoot:string):Runner{
 return async(command)=>{
  const studio=command==="STUDIO_VERSION";const packageName=studio?"@bnbagent/studio-cli":"@binance/agentic-wallet";const binName=studio?"bag":"baw";
  const root=await realpath(resolve(projectRoot,"tools/agents/node_modules",packageName));
  const expected=resolve(projectRoot,"tools/agents/node_modules",packageName);if(root!==expected)throw new Error("CLI package path is not isolated");
  const manifest=z.object({name:z.literal(packageName),version:z.string().regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/),bin:z.union([z.string(),z.record(z.string(),z.string())])}).parse(JSON.parse(await readFile(resolve(root,"package.json"),"utf8")));
  if(!studio){const [major,minor]=manifest.version.split(".").map(Number);if(manifest.version.includes("-")||major<1||(major===1&&minor<10))throw new Error("Unsupported Agentic Wallet CLI version");}
  const path=typeof manifest.bin==="string"?manifest.bin:manifest.bin[binName];if(!path)throw new Error("CLI entry missing");const entry=await realpath(resolve(root,path));if(!contained(root,entry)||!/[.]m?js$/.test(entry))throw new Error("CLI entry is outside reviewed package");
  // Never inherit application API keys. CLI operates only as the local OS operator.
  const env:NodeJS.ProcessEnv={NODE_ENV:process.env.NODE_ENV??"production"};for(const name of ["PATH","SystemRoot","TEMP","TMP","HOME","USERPROFILE","APPDATA","LOCALAPPDATA"])if(process.env[name])env[name]=process.env[name];
  return await new Promise<string>((success,failure)=>execFile(process.execPath,[entry,...readonlyCommands[command]],{cwd:root,env,timeout:10000,maxBuffer:32768,windowsHide:true,shell:false},(error,stdout)=>error?failure(new Error("CLI unavailable")):success(stdout)));
 };
}

export async function agenticWalletOperatorStatus(binding:unknown,options:{enabled?:boolean;projectRoot?:string;runner?:Runner}={}):Promise<Status>{
 if(!(options.enabled??process.env.AGENTIC_WALLET_ENABLED==="true"))return base("DISABLED","AGENTIC_WALLET_DISABLED");
 const checked=bindingSchema.safeParse(binding);if(!checked.success||checked.data.operatorId!==checked.data.requesterId)return base("BLOCKED","OPERATOR_SCOPE_REQUIRED");
 const run=options.runner??projectLocalRunner(options.projectRoot??process.cwd());
 try{
  const status=z.object({success:z.literal(true),data:z.object({status:z.enum(["UNCONNECTED","CREATING","CONNECTED"])})}).parse(parsed(await run("WALLET_STATUS")));
  if(status.data.status!=="CONNECTED")return base(status.data.status,"APP_AUTHORIZATION_REQUIRED");
  const addresses=z.object({success:z.literal(true),data:z.object({addresses:z.array(z.object({binanceChainId:z.string(),address:z.string().max(128)})).max(32)})}).parse(parsed(await run("WALLET_ADDRESS")));
  const bsc=addresses.data.addresses.filter(item=>item.binanceChainId==="56");if(bsc.length!==1||bsc[0].address.toLowerCase()!==checked.data.wallet.toLowerCase())return base("BLOCKED","OPERATOR_WALLET_MISMATCH");
  const settings=z.object({success:z.literal(true),data:z.object({sessionExpireTime:z.string().datetime({offset:true}),inactiveSignOutTime:z.string().datetime({offset:true}).optional(),dailyLimit:z.number().finite().nonnegative(),tradeAllTokens:z.boolean(),abnormalTxnHandling:z.enum(["AutoReject","NeedConfirmation"])})}).parse(parsed(await run("WALLET_SETTINGS")));
  if(Math.min(Date.parse(settings.data.sessionExpireTime),settings.data.inactiveSignOutTime?Date.parse(settings.data.inactiveSignOutTime):Infinity)<=Date.now())return base("UNCONNECTED","SESSION_EXPIRED");
  return {...base("CONNECTED","READ_ONLY_STATUS_VERIFIED"),wallet:bsc[0].address,...settings.data};
 }catch{return base("UNAVAILABLE","CLI_OR_RESPONSE_UNVERIFIED");}
}

export async function agentStudioVersion(options:{enabled?:boolean;projectRoot?:string;runner?:Runner}={}):Promise<Status>{
 if(!(options.enabled??process.env.AGENT_STUDIO_ENABLED==="true"))return base("DISABLED","AGENT_STUDIO_DISABLED");
 try{const text=(await (options.runner??projectLocalRunner(options.projectRoot??process.cwd()))("STUDIO_VERSION")).trim();if(!/^(?:bag\s+)?\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(text))return base("UNAVAILABLE","CLI_VERSION_UNVERIFIED");return {...base("INSTALLED","CLI_VERSION_ONLY"),version:text};}catch{return base("UNAVAILABLE","CLI_NOT_AVAILABLE");}
}
