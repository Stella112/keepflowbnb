import {execFile} from 'node:child_process';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {z} from 'zod';

const address=z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const quantity=z.string().regex(/^\d+(\.\d{1,6})?$/).max(16);
const orderId=z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);
const slippage=z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v=>Number(v)>0&&Number(v)<=5);

export type AgenticCommand=
 {kind:'STATUS'}|{kind:'ADDRESS'}|{kind:'LEFT_QUOTA'}|
 {kind:'QUOTE'|'SWAP';fromToken:string;toToken:string;amount:string;slippage:string}|
 {kind:'ORDER';orderId:string}|
 {kind:'X402_PREVIEW';requirements:string}|{kind:'X402_SIGN';paymentId:string;index:number};
export type AgenticRunner=(command:AgenticCommand)=>Promise<string>;

/** Fixed documented `baw` arguments only (binance-skills-hub references/market-order.md, wallet-view.md). */
export function agenticArgs(command:AgenticCommand):readonly string[]{
 switch(command.kind){
  case 'STATUS':return Object.freeze(['wallet','status','--json']);
  case 'ADDRESS':return Object.freeze(['wallet','address','--json']);
  case 'LEFT_QUOTA':return Object.freeze(['wallet','left-quota','--json']);
  case 'QUOTE':case 'SWAP':{
   const from=address.parse(command.fromToken),to=address.parse(command.toToken),amount=quantity.parse(command.amount),slip=slippage.parse(command.slippage);
   const base=['market-order',command.kind==='QUOTE'?'quote':'swap','--fromTokenQty',amount,'--fromToken',from,'--toToken',to,'--binanceChainId','56','--slippage',slip];
   return Object.freeze(command.kind==='SWAP'?[...base,'--mev','true','--json']:[...base,'--json']);
  }
  case 'ORDER':return Object.freeze(['market-order','list','--orderId',orderId.parse(command.orderId),'--binanceChainId','56','--json']);
  case 'X402_PREVIEW':{if(command.requirements.length>16384)throw Error('REQUIREMENTS_TOO_LARGE');JSON.parse(command.requirements);return Object.freeze(['x402-payment','preview','--paymentRequirements',command.requirements,'--json']);}
  case 'X402_SIGN':return Object.freeze(['x402-payment','sign','--paymentId',z.string().uuid().parse(command.paymentId),'--selectedIndex',String(z.number().int().min(1).max(10).parse(command.index)),'--json']);
 }
}

/** bawDir isolates one user's Agentic Wallet session (BINANCE_BAW_DIR and HOME); omitted means the operator's default session. */
export function isolatedAgenticRunner(projectRoot:string,bawDir?:string):AgenticRunner{
 return async command=>{
  const args=agenticArgs(command);
  const expected=resolve(projectRoot,'tools/agents/node_modules/@binance/agentic-wallet'),root=await realpath(expected);
  if(root!==expected)throw Error('ISOLATED_PACKAGE_REQUIRED');
  const manifest=z.object({name:z.literal('@binance/agentic-wallet'),version:z.literal('1.10.0'),bin:z.object({baw:z.string()})}).parse(JSON.parse(await readFile(resolve(root,'package.json'),'utf8')));
  const entry=await realpath(resolve(root,manifest.bin.baw)),rel=relative(root,entry);
  if(!rel||rel.startsWith('..')||isAbsolute(rel)||!/[.]m?js$/.test(entry))throw Error('CONTAINED_ENTRY_REQUIRED');
  const env:NodeJS.ProcessEnv={NODE_ENV:'production'};
  for(const key of ['PATH','HOME','USERPROFILE','APPDATA','LOCALAPPDATA','SystemRoot','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
  if(bawDir){env.BINANCE_BAW_DIR=bawDir;env.HOME=bawDir;env.USERPROFILE=bawDir;}
  const timeout=command.kind==='SWAP'||command.kind==='X402_SIGN'?60_000:20_000;
  return new Promise<string>((accept,reject)=>execFile(process.execPath,[entry,...args],{cwd:root,env,shell:false,windowsHide:true,timeout,maxBuffer:65536},(error,out)=>error?reject(Error(command.kind==='SWAP'||command.kind==='X402_SIGN'?'OUTCOME_UNKNOWN':'CLI_UNAVAILABLE')):accept(out)));
 };
}

const ok=<T extends z.ZodTypeAny>(data:T)=>z.object({success:z.literal(true),data});
function parse(text:string){if(Buffer.byteLength(text)>65536)throw Error('OVERSIZED_RESPONSE');return JSON.parse(text) as unknown;}
export const parseQuote=(text:string)=>ok(z.object({toCoinAmount:z.string().regex(/^\d+(\.\d+)?$/),fromCoinAmount:z.string().regex(/^\d+(\.\d+)?$/)}).passthrough()).parse(parse(text)).data;
export const parseSwap=(text:string)=>ok(z.object({orderId:z.union([z.string(),z.number()]).transform(v=>orderId.parse(String(v)))}).passthrough()).parse(parse(text)).data;
const orderRow=z.object({orderId:z.union([z.string(),z.number()]).transform(String),status:z.enum(['PENDING','FINISHED','FAILED']),txHash:z.string().regex(/^0x[0-9a-fA-F]{64}$/).nullable().optional(),toToken:z.string(),fromToken:z.string(),fromTokenQty:z.string()}).passthrough();
/** Documented market-order list shape: {success,data:{list:[{orderId,status,txHash,fromToken,toToken,fromTokenQty}]}}. */
export function parseOrder(text:string,expected:{orderId:string;fromToken:string;toToken:string;amount:string}){
 const rows=ok(z.object({list:z.array(orderRow)}).passthrough()).parse(parse(text)).data.list.filter(row=>row.orderId===expected.orderId);
 if(rows.length!==1)throw Error('ORDER_STATUS_UNVERIFIED');const row=rows[0];
 if(row.toToken.toLowerCase()!==expected.toToken.toLowerCase()||row.fromToken.toLowerCase()!==expected.fromToken.toLowerCase()||Number(row.fromTokenQty)!==Number(expected.amount))throw Error('ORDER_MISMATCH');
 return {status:row.status,txHash:row.txHash??null};
}
export function parseStatus(text:string){return ok(z.object({status:z.enum(['CONNECTED','UNCONNECTED','EXPIRED','PENDING']).or(z.string())})).parse(parse(text)).data.status;}
export function parseBscAddress(text:string){
 const rows=ok(z.object({addresses:z.array(z.object({binanceChainId:z.string(),address:z.string()}).passthrough())})).parse(parse(text)).data.addresses.filter(row=>row.binanceChainId==='56');
 if(rows.length!==1)throw Error('BSC_ADDRESS_UNVERIFIED');return address.parse(rows[0].address).toLowerCase();
}
/** JSON mode emits {quotaUsed,quotaLeft,dailyLimit,date} (observed in @binance/agentic-wallet 1.10.0 dist). */
export function parseLeftQuota(text:string){
 const data=ok(z.object({quotaUsed:z.number().nonnegative(),quotaLeft:z.number(),dailyLimit:z.number().nonnegative(),date:z.string()})).parse(parse(text)).data;
 return {left:Math.max(0,data.quotaLeft),dailyLimit:data.dailyLimit,used:data.quotaUsed,date:data.date};
}

/** Documented x402-payment preview/sign shapes (binance-skills-hub references/x402-payment.md). */
export const parseX402Preview=(text:string)=>ok(z.object({paymentId:z.string().uuid(),options:z.array(z.object({index:z.number().int().min(1),status:z.string(),scheme:z.string().optional(),assetTransferMethod:z.string().optional(),binanceChainId:z.string().optional(),tokenAddress:z.string().optional(),tokenSymbol:z.string().optional(),amount:z.string().optional(),payTo:z.string().optional(),needApproveFirst:z.boolean().optional()}).passthrough()).max(10)})).parse(parse(text)).data;
export const parseX402Sign=(text:string)=>ok(z.object({paymentHeaderName:z.literal('PAYMENT-SIGNATURE'),paymentHeaderValue:z.string().min(16).max(16384).regex(/^[A-Za-z0-9+/=_-]+$/),approveTxHash:z.null(),signatureExpiresAt:z.number().int().positive()}).passthrough()).parse(parse(text)).data;
