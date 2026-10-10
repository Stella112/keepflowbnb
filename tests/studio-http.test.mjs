import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {request} from 'node:http';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
test('Studio bag dev HTTP face exposes only public factual work and rejects browser origins',{timeout:30000},async()=>{
 const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const child=spawn(process.execPath,['tools/studio-firstbell/app/agent/src/mcpMain.ts'],{env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,AGENT_PORT:String(port)},stdio:['ignore','ignore','pipe']});
 const exit=once(child,'exit');let stderr='';child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-8192);});
 const bounded=async work=>{let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('MCP_TEST_DEADLINE')),5000);})]);}finally{clearTimeout(timer);}};
 const client=new Client({name:'studio-http-test',version:'1'});
 try{
  let ready=false;const until=Date.now()+15000;while(Date.now()<until&&child.exitCode===null){try{const response=await fetch(`http://127.0.0.1:${port}/mcp`,{signal:AbortSignal.timeout(1000)});if(response.status===405){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
  assert.equal(ready,true,['EPERM','EACCES','ERR_MODULE_NOT_FOUND','EADDRINUSE'].find(code=>stderr.includes(code))??'NO_RECOGNIZED_STARTUP_ERROR');
  await bounded(client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`))));
  const tools=await bounded(client.listTools());assert.deepEqual(tools.tools.map(tool=>tool.name),['review_public_bell']);
  assert.equal((await fetch(`http://127.0.0.1:${port}/mcp`,{method:'POST',headers:{Origin:'https://malicious.invalid'},body:'{}',signal:AbortSignal.timeout(2000)})).status,403);
  const wrongHost=await new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,path:'/mcp',method:'POST',headers:{Host:'untrusted.invalid'},timeout:2000},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.on('timeout',()=>req.destroy(Error('TEST_TIMEOUT')));req.end('{}');});assert.equal(wrongHost,403);
  assert.equal((await fetch(`http://127.0.0.1:${port}/mcp`,{method:'POST',body:'x'.repeat(16385),signal:AbortSignal.timeout(2000)})).status,413);
  assert.equal((await fetch(`http://127.0.0.1:${port}/mcp`,{method:'POST',body:'{invalid',signal:AbortSignal.timeout(2000)})).status,400);
 }finally{try{await bounded(client.close());}finally{child.kill();await bounded(exit);}}
});

