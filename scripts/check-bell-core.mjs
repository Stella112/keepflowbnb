import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {privateKeyToAccount} from 'viem/accounts';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.FIRSTBELL_TEST_URL??'http://56.125.248.192';
// A fresh, unfunded public address. Its private key is never transmitted or used to sign.
const wallet=privateKeyToAccount('0x'+randomBytes(32).toString('hex')).address;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),calls=[];
 page.on('pageerror',error=>console.log('Browser error: '+error.message));
 await page.exposeFunction('coreWallet',async method=>{calls.push(method);if(method==='eth_requestAccounts'||method==='eth_accounts')return [wallet];if(method==='eth_chainId')return '0x38';throw new Error('Unexpected wallet request: '+method);});
 await page.addInitScript(()=>{window.ethereum={request:({method})=>window.coreWallet(method)};});
 await page.goto(base+'/b/ai-compute',{waitUntil:'networkidle'});
 await page.getByText('Check this Flow against a real wallet',{exact:true}).click();
 await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
 await page.getByLabel('Flow budget (USDT)',{exact:true}).fill('20');
 await page.getByRole('button',{name:'Check this Flow',exact:true}).click();
 const link=page.getByRole('link',{name:'Open saved check receipt ↗',exact:true});await link.waitFor({timeout:30000}).catch(async error=>{console.log((await page.locator('main').innerText()).slice(-1400));throw error;});
 const href=await link.getAttribute('href'),id=href.split('/').pop();
 let receipt;for(let attempt=0;attempt<90;attempt++){const response=await context.request.get(base+'/api/execution/'+id);assert.equal(response.status(),200);receipt=await response.json();if(receipt.status!=='CHECKING')break;await new Promise(resolve=>setTimeout(resolve,2000));}
 if(receipt.status!=='BLOCKED')console.log(JSON.stringify({status:receipt.status,reason:receipt.reason,legs:receipt.legs.map(leg=>({ticker:leg.ticker,status:leg.status,reason:leg.reason}))}));
 assert.equal(receipt.status,'BLOCKED');assert.equal(receipt.mode,'DRY_RUN');assert.equal(receipt.executionEnabled,false);assert.equal(receipt.transactionHash,null);
 assert.equal(receipt.snapshot.usdt,'0');assert.ok(BigInt(receipt.snapshot.blockNumber)>0n);assert.equal(receipt.legs[0].policy.code,'INSUFFICIENT_USDT');
 assert.equal(receipt.legs[0].provider,'bstock');assert.ok(receipt.legs[0].quote.id);assert.ok(receipt.legs.slice(1).every(leg=>leg.status==='NOT_STARTED'&&leg.transactionHash===null));
 const headers={Origin:base},input={requestId:receipt.requestId,bellId:'ai-compute',wallet,amount:'20'};
 const replay=await context.request.post(base+'/api/execution',{headers,data:input});assert.equal(replay.status(),200);assert.equal((await replay.json()).id,id);
 assert.equal((await context.request.post(base+'/api/execution',{headers,data:{...input,amount:'21'}})).status(),409);
 assert.equal((await context.request.post(base+'/api/execution',{headers:{Origin:'https://example.invalid'},data:{...input,requestId:randomUUID()}})).status(),403);
 const stranger=await browser.newContext();assert.equal((await stranger.request.get(base+'/api/execution/'+id)).status(),404);await stranger.close();
 await page.goto(base+href,{waitUntil:'networkidle'});await page.getByText('No funds spent. No token approval submitted. No stock ownership created.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/bell-check-mobile.png',fullPage:true});
 await page.goto(base+'/portfolio?mode=wallet',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await page.getByRole('button',{name:'Read wallet holdings',exact:true}).click();
 await page.getByText('No holdings were found for the curated stock contracts at this block.',{exact:true}).waitFor({timeout:120000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'test-results/wallet-holdings-mobile.png',fullPage:true});
 assert.ok(!calls.includes('personal_sign')&&!calls.includes('eth_sendTransaction'));
 await context.storageState({path:'test-results/core-browser-state.json'});
 writeFileSync('test-results/core-proof.json',JSON.stringify({result:'PASS',receiptId:id,wallet,blockNumber:receipt.snapshot.blockNumber,quoteProvider:receipt.legs[0].provider,policyCode:receipt.legs[0].policy.code,checks:['real wallet snapshot','real provider quote','insufficient funds blocked','remaining legs not started','null transaction hashes','idempotent retry','conflicting retry rejected','cross-origin request rejected','private saved receipt','receipt reload','real wallet portfolio','mobile layout','no signature or transaction request']}));
 console.log(JSON.stringify({result:'PASS',checks:13,receiptId:id,mode:'DRY_RUN',realQuote:true,transactionSubmitted:false}));
}finally{await browser.close();}
