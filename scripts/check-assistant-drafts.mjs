import {chromium} from '@playwright/test';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {privateKeyToAccount} from 'viem/accounts';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='https://56.125.248.192:80',cookies=new Map();
async function post(path,data){const headers=new Headers({'Content-Type':'application/json',Origin:base});if(cookies.size)headers.set('Cookie',[...cookies].map(([key,value])=>key+'='+value).join('; '));const response=await fetch(base+path,{method:'POST',headers,body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});for(const line of response.headers.getSetCookie()){const pair=line.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}assert.equal(response.status,200);return response.json();}
const signer=privateKeyToAccount('0x'+randomBytes(32).toString('hex')),challenge=await post('/api/account',{action:'CHALLENGE',address:signer.address});await post('/api/account',{action:'VERIFY',signature:await signer.signMessage({message:challenge.message})});
const tools=['create_bell_from_prompt','modify_bell_from_prompt','create_policy_from_prompt'],pending=await post('/api/account/delegations',{action:'CHALLENGE',label:'Unsaved draft acceptance',tools}),approved=await post('/api/account/delegations',{action:'APPROVE',challengeId:pending.challenge.id});
const client=new Client({name:'Unsaved draft acceptance',version:'1'}),transport=new StreamableHTTPClientTransport(new URL(base+'/api/mcp'),{requestInit:{headers:{Authorization:'Bearer '+approved.token}}});
let result,policyResult;
try{
 await client.connect(transport);assert.deepEqual((await client.listTools()).tools.map(tool=>tool.name).sort(),[...tools].sort());
 const created=await client.callTool({name:'create_bell_from_prompt',arguments:{prompt:'NVDA 50%, MSFT 40%, cash 10%'}});assert.notEqual(created.isError,true);result=created.structuredContent;assert.equal(result.executionAvailable,false);assert.equal(result.result.saved,false);
 const modified=await client.callTool({name:'modify_bell_from_prompt',arguments:{id:'ai-compute',prompt:'NVDA 50%, MSFT 40%, cash 10%'}});assert.notEqual(modified.isError,true);assert.equal(modified.structuredContent.result.saved,false);assert.equal(modified.structuredContent.result.originalBellId,'ai-compute');
 const policy=await client.callTool({name:'create_policy_from_prompt',arguments:{prompt:'max trade 7 USD, reserve 15%'}});assert.notEqual(policy.isError,true);policyResult=policy.structuredContent;
 assert.equal((await client.callTool({name:'create_bell',arguments:{definition:result.result.draft.definition}})).isError,true);
 await post('/api/account',{action:'LOGOUT'});await assert.rejects(()=>client.listTools());
}finally{await client.close();}
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});let writes=0;
 page.on('request',request=>{if(request.url().includes('/api/bells')&&['POST','PATCH'].includes(request.method()))writes++;});
 await page.goto(base+'/create',{waitUntil:'networkidle'});
 await page.getByLabel('Unsaved tool result JSON').fill(JSON.stringify(result));await page.getByRole('button',{name:'Validate pasted draft',exact:true}).click();await page.getByRole('button',{name:'Use reviewed draft in editor',exact:true}).waitFor();assert.equal(writes,0);
 await page.getByRole('button',{name:'Use reviewed draft in editor',exact:true}).click();assert.equal(await page.getByLabel('NVDA (%)',{exact:true}).inputValue(),'50');assert.equal(await page.getByLabel('MSFT (%)',{exact:true}).inputValue(),'40');assert.equal(await page.getByLabel('Virtual cash reserve (%)',{exact:true}).inputValue(),'10');assert.equal(writes,0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.getByLabel('Unsaved tool result JSON').fill(JSON.stringify({...result,executionAvailable:true}));await page.getByRole('button',{name:'Validate pasted draft',exact:true}).click();await page.locator('p[role="alert"]').waitFor();assert.equal(writes,0);
 await page.goto(base+'/portfolio',{waitUntil:'networkidle'});let ruleWrites=0;page.on('request',request=>{if(request.url().endsWith('/api/paper')&&request.method()==='POST')ruleWrites++;});
 await page.getByLabel('Unsaved personal rule JSON',{exact:true}).fill(JSON.stringify(policyResult));await page.getByRole('button',{name:'Validate assistant rule draft',exact:true}).click();await page.getByRole('button',{name:'Use reviewed assistant rules in editor',exact:true}).click();assert.equal(await page.getByLabel('Maximum paper trade (USD)',{exact:true}).inputValue(),'7');assert.equal(await page.getByLabel('Minimum virtual cash reserve (%)',{exact:true}).inputValue(),'15');assert.equal(ruleWrites,0);
 const savedResponse=page.waitForResponse(response=>response.url().endsWith('/api/paper')&&response.request().method()==='POST');await page.getByRole('button',{name:'Save paper rules',exact:true}).click();assert.equal((await savedResponse).status(),200);assert.equal(ruleWrites,1);await page.getByRole('button',{name:'Save paper rules',exact:true}).waitFor();await page.getByRole('button',{name:'Validate assistant rule draft',exact:true}).click();await page.getByText('Invalid or stale rule draft.',{exact:false}).waitFor();assert.equal(ruleWrites,1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/assistant-draft-import-mobile.png',fullPage:true});writeFileSync('test-results/assistant-drafts-proof.json',JSON.stringify({result:'PASS',nativeSdk:true,exactDraftScopes:true,publicationDenied:true,parentSessionRevocation:true,reviewedImport:true,reviewedRuleImport:true,ruleSaveRequiresSeparateAction:true,staleRuleImportRejected:true,automaticWrites:0,mobileLayout:true,financialAuthority:false},null,2));console.log('PASS: native SDK unsaved drafts, explicit reviewed editor import, denied publication and parent-session revocation; zero automatic writes.');
}finally{await browser.close();}
