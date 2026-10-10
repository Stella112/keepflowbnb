import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {privateKeyToAccount} from 'viem/accounts';
import {hexToString} from 'viem';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.FIRSTBELL_TEST_URL??'http://56.125.248.192',signer=privateKeyToAccount('0x'+randomBytes(32).toString('hex'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:380,height:820}}),page=await context.newPage();
 const headers={Origin:base};await context.request.get(base+'/api/account');
 const definition={title:'QA wallet workspace',description:'Wallet recovery test only.',assets:[{ticker:'NVDA',weightBps:3000},{ticker:'MSFT',weightBps:3000},{ticker:'GOOGL',weightBps:3000}],reserveBps:1000};
 const policy=await context.request.post(base+'/api/paper',{headers,data:{action:'POLICY',requestId:randomUUID(),policy:{maxTradeUsd:'73',maxSingleAssetBps:4000,minReserveBps:1000,driftBps:500}}});assert.equal(policy.status(),200);
 const badStart=await context.request.post(base+'/api/account',{headers,data:{action:'CHALLENGE',address:signer.address}});assert.equal(badStart.status(),200);
 assert.equal((await context.request.post(base+'/api/account',{headers,data:{action:'VERIFY',signature:'0x'+'11'.repeat(65)}})).status(),401);
 const calls=[];await page.exposeFunction('testWallet',async(method,params)=>{calls.push(method);if(method==='eth_requestAccounts'||method==='eth_accounts')return [signer.address];if(method==='eth_chainId')return '0x38';if(method==='personal_sign'){assert.match(hexToString(params[0]),/does not authorize trades or transfers/);return signer.signMessage({message:hexToString(params[0])});}throw new Error('Unexpected wallet request: '+method);});
 await page.addInitScript(()=>{window.ethereum={request:({method,params})=>window.testWallet(method,params)};});
 await page.goto(base+'/account',{waitUntil:'networkidle'});await page.getByText('Or connect a wallet on this computer',{exact:true}).click();await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await page.getByRole('heading',{name:'Signed in.',exact:true}).waitFor();
 assert.equal((await (await context.request.get(base+'/api/account')).json()).wallet,signer.address.toLowerCase());
 const created=await context.request.post(base+'/api/bells',{headers,data:definition});assert.equal(created.status(),200);const bell=(await created.json()).bell;assert.equal(bell.creatorWallet,signer.address.toLowerCase());
 await page.goto(base+'/my-bells',{waitUntil:'networkidle'});await page.getByRole('heading',{name:definition.title,exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const update=await context.request.patch(base+'/api/bells',{headers,data:{id:bell.id,version:1,definition:{...definition,assets:[{ticker:'NVDA',weightBps:3500},{ticker:'MSFT',weightBps:2500},{ticker:'GOOGL',weightBps:3000}]}}});assert.equal(update.status(),200);
 await page.goto(base+'/b/'+bell.id+'/history',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Version 1',exact:true}).waitFor();await page.getByRole('heading',{name:'Version 2',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const recovered=await browser.newContext();await recovered.request.get(base+'/api/account');
 const challenge=await (await recovered.request.post(base+'/api/account',{headers,data:{action:'CHALLENGE',address:signer.address}})).json();const signature=await signer.signMessage({message:challenge.message});
 const verified=await recovered.request.post(base+'/api/account',{headers,data:{action:'VERIFY',signature}});assert.equal(verified.status(),200);assert.equal((await verified.json()).restored,true);
 assert.equal((await (await recovered.request.get(base+'/api/paper')).json()).policy.maxTradeUsd,'73');assert.ok((await (await recovered.request.get(base+'/api/account')).json()).ownedBellIds.includes(bell.id));
 assert.equal((await recovered.request.post(base+'/api/account',{headers,data:{action:'VERIFY',signature}})).status(),401,'used nonce cannot be replayed');
 await page.goto(base+'/s/NVDA',{waitUntil:'networkidle'});await page.getByText('Representation settings',{exact:true}).click();await page.getByLabel('Issuer',{exact:true}).selectOption('bstock');await page.getByText('Preview a future mainnet purchase',{exact:true}).click();await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await page.getByRole('button',{name:'Check quote and simulation',exact:true}).click();
 await page.getByRole('heading',{name:'Read-only purchase preview',exact:true}).waitFor({timeout:60000}).catch(async error=>{console.log((await page.locator('main').innerText()).slice(-1400));throw error;});
 const saved=await page.getByRole('link',{name:'Open saved preview receipt ↗',exact:true}).getAttribute('href');assert.ok(saved);
 const previewId=saved.split('/').pop();const receiptResponse=await context.request.get(base+'/api/preview/'+previewId);assert.equal(receiptResponse.status(),200);const receipt=(await receiptResponse.json()).receipt;assert.equal(receipt.executionEnabled,false);assert.equal(receipt.simulation.swapStatus,'FAILED');
 const stranger=await browser.newContext();assert.equal((await stranger.request.get(base+'/api/preview/'+previewId)).status(),404);await stranger.close();
 assert.equal((await recovered.request.get(base+'/api/preview/'+previewId)).status(),200,'saved preview follows wallet account');
 await page.getByLabel('Preview amount (USDT)',{exact:true}).fill('6');assert.equal(await page.getByRole('heading',{name:'Read-only purchase preview',exact:true}).count(),0,'input change clears stale result');
 await page.goto(base+saved,{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Purchase not ready.',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/workspace-preview-mobile.png',fullPage:true});await page.goto(base+'/account',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Signed in.',exact:true}).waitFor();await page.screenshot({path:'test-results/workspace-account-mobile.png',fullPage:true});
 assert.ok(!calls.includes('eth_sendTransaction'));assert.equal(calls.filter(method=>method==='personal_sign').length,1);
 await context.storageState({path:'test-results/workspace-browser-state.json'});writeFileSync('test-results/workspace-proof.json',JSON.stringify({result:'PASS',bellId:bell.id,previewId,checks:['invalid signature rejected','message-only wallet login','verified creator attribution','My Flows ownership','published history','cross-browser account recovery','nonce replay rejected','real quote and failed swap simulation','private durable preview receipt','preview clears stale result','mobile screens','no transaction request']}));
 console.log(JSON.stringify({result:'PASS',checks:12,quoteSimulation:receipt.simulation.swapStatus}));await recovered.close();
}finally{await browser.close();}


