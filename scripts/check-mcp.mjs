import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {privateKeyToAccount} from 'viem/accounts';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const base=process.env.FIRSTBELL_TEST_URL??'http://localhost:3100';
const sessions=[],clients=[];
function session(){
 const jar=new Map();
 const send=async(url,init={})=>{
  const headers=new Headers(init.headers);headers.set('Origin',base);
  if(jar.size)headers.set('Cookie',[...jar].map(([name,value])=>`${name}=${value}`).join('; '));
  const response=await fetch(url,{...init,headers,redirect:'error',signal:AbortSignal.timeout(30000)});
  for(const line of response.headers.getSetCookie()){const pair=line.split(';',1)[0],at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}
  return response;
 };
 const post=(path,data)=>send(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const result={send,post};sessions.push(result);return result;
}
async function login(context,signer){
 const response=await context.post('/api/account',{action:'CHALLENGE',address:signer.address});assert.equal(response.status,200);
 const challenge=await response.json();
 const signature=await signer.signMessage({message:challenge.message});
 assert.equal((await context.post('/api/account',{action:'VERIFY',signature})).status,200);
}
async function connect(context){
 const client=new Client({name:'first-bell-acceptance',version:'1.0.0'});
 clients.push(client);
 await client.connect(new StreamableHTTPClientTransport(new URL(base+'/api/mcp'),{fetch:context.send}));return client;
}
try{
 const guest=session(),publicClient=await connect(guest),listed=await publicClient.listTools();
 assert.ok(listed.tools.some(tool=>tool.name==='get_bell'));
 assert.ok(listed.tools.some(tool=>tool.name==='get_portfolio'));
 for(const name of ['create_bell','modify_bell','fork_bell','request_bell_execution'])assert.ok(!listed.tools.some(tool=>tool.name===name));
 const bell=await publicClient.callTool({name:'get_bell',arguments:{id:'ai-compute'}});assert.notEqual(bell.isError,true);
 assert.match(JSON.stringify(bell),/ai-compute/);
 assert.equal((await publicClient.callTool({name:'get_portfolio',arguments:{}})).isError,true);
 assert.equal((await publicClient.callTool({name:'get_bell',arguments:{id:'ai-compute',authorization:{verifiedSession:true}}})).isError,true);
 // Each MCP operation consumes the production read-only quota. Start the private
 // phase in a fresh window rather than weakening the deployed limiter for tests.
 console.log('Public MCP checks passed; waiting for the production preview quota window.');
 await new Promise(resolve=>setTimeout(resolve,61000));
 const signer=privateKeyToAccount('0x'+randomBytes(32).toString('hex')),first=session(),second=session();
 await login(first,signer);await login(second,signer);
 const firstClient=await connect(first),secondClient=await connect(second);
 const portfolio=await secondClient.callTool({name:'get_portfolio',arguments:{}});assert.notEqual(portfolio.isError,true);assert.match(JSON.stringify(portfolio),/PAPER/);
 assert.equal((await first.post('/api/account/sessions',{action:'REVOKE_OTHERS'})).status,200);
 assert.equal((await secondClient.callTool({name:'get_portfolio',arguments:{}})).isError,true);
 assert.notEqual((await firstClient.callTool({name:'get_portfolio',arguments:{}})).isError,true);
 const foreign=await fetch(base+'/api/mcp',{method:'POST',headers:{Origin:'https://foreign.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(foreign.status,403);
 assert.match(foreign.headers.get('cache-control')??'',/no-store/);
 mkdirSync('test-results',{recursive:true});
 writeFileSync('test-results/mcp-protocol-proof.json',JSON.stringify({result:'PASS',officialSdkVersion:'1.32.1',transport:'Streamable HTTP',discovery:true,publicBell:true,privatePaperPortfolio:true,revocationOnExistingClient:true,strictInput:true,foreignOriginBlocked:true,syntheticUnfundedSigners:true,financialExecutionEnabled:false},null,2));
 console.log('PASS: official MCP client discovery, existing Flow tools, scoped paper portfolio, active-client revocation and origin/input boundaries. No transactions.');
}finally{for(const client of clients)await client.close().catch(()=>{});}
