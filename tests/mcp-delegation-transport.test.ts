import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createMcpHandler} from '../lib/tools/mcp-transport.ts';
const url='http://localhost:3100/api/mcp',token='fbm_'+'1'.repeat(64);
test('scoped SDK draft tools remain unsaved and cannot escalate into publication',async()=>{
 const names=['create_bell_from_prompt','modify_bell_from_prompt','create_policy_from_prompt'];let calls=0;
 const handler=createMcpHandler({takeSlot:()=>true,resolveBearer:async()=>({accountId:'owner',allowedTools:names}),authorize:async()=>{throw Error('Cookie fallback forbidden');},call:async(name,_args,auth)=>{calls++;assert.equal(auth?.userConfirmedMutation,false);assert.deepEqual(auth?.scopes,['PRIVATE_READ']);return {saved:false,name};}});
 const client=new Client({name:'draft-pat',version:'1'}),transport=new StreamableHTTPClientTransport(new URL(url),{requestInit:{headers:{Authorization:'Bearer '+token}},fetch:async(input,init)=>handler(new Request(input,init))});
 try{await client.connect(transport);assert.deepEqual((await client.listTools()).tools.map(item=>item.name).sort(),[...names].sort());for(const name of names){const result=await client.callTool({name,arguments:{prompt:'NVDA 50%, MSFT 50%',...(name==='modify_bell_from_prompt'?{id:'example'}:{})}});assert.notEqual(result.isError,true);assert.equal((result.structuredContent as {result:{saved:boolean}}).result.saved,false);}assert.equal((await client.callTool({name:'create_bell',arguments:{}})).isError,true);assert.equal(calls,3);}finally{await client.close();}
});
test('manual bearer client discovers only granted reads; scopes never admit preparation or cookie fallback',async()=>{
 let active=true,cookieReads=0,calls=0;
 const handler=createMcpHandler({takeSlot:()=>true,resolveBearer:async(value)=>active&&value===token?{accountId:'owner',allowedTools:['get_portfolio','get_bell','quote_stock']}:undefined,authorize:async()=>{cookieReads++;return {verifiedSession:true,accountId:'cookie-owner',scopes:['PRIVATE_READ','EXECUTION_PREPARATION'],userConfirmedMutation:false};},call:async(name,_args,auth)=>{calls++;assert.equal(auth?.accountId,'owner');assert.deepEqual(auth?.scopes,['PRIVATE_READ']);return {mode:'PAPER',name};}});
 const client=new Client({name:'manual-pat-fixture',version:'1'}),transport=new StreamableHTTPClientTransport(new URL(url),{requestInit:{headers:{Authorization:'Bearer '+token,Cookie:'fixture-cookie=unused'}},fetch:async(input,init)=>handler(new Request(input,init))});
 try{
  await client.connect(transport);const list=await client.listTools();assert.deepEqual(list.tools.map(item=>item.name).sort(),['get_bell','get_portfolio']);
  assert.notEqual((await client.callTool({name:'get_portfolio',arguments:{}})).isError,true);
  assert.equal((await client.callTool({name:'get_receipt',arguments:{id:'private'}})).isError,true);
  assert.equal((await client.callTool({name:'quote_stock',arguments:{ticker:'NVDA',provider:'bstock',amount:'1'}})).isError,true);
  assert.equal(calls,1);assert.equal(cookieReads,0);
  active=false;await assert.rejects(()=>client.callTool({name:'get_portfolio',arguments:{}}));assert.equal(calls,1);assert.equal(cookieReads,0);
 }finally{await client.close();}
});
test('invalid bearer cannot use wallet cookies and foreign-origin bearer requests are rejected',async()=>{
 let cookieReads=0,resolutions=0;
 const handler=createMcpHandler({takeSlot:()=>true,authorize:async()=>{cookieReads++;return undefined;},resolveBearer:async()=>{resolutions++;return {accountId:'owner',allowedTools:['get_bell']};},call:async()=>({})});
 const request=(headers:Record<string,string>)=>new Request(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...headers},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});
 assert.equal((await handler(request({Authorization:'Basic invalid',Cookie:'fixture-cookie=unused',Origin:'http://localhost:3100'}))).status,401);
 assert.equal((await handler(request({Authorization:'Bearer '+token,Origin:'https://foreign.invalid'}))).status,403);
 assert.equal(cookieReads,0);assert.equal(resolutions,0);
});
