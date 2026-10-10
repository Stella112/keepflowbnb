import {chromium} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.FIRSTBELL_TEST_URL??'http://localhost:3100',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.addInitScript(()=>{window.__walletCalls=[];window.ethereum={request:async({method})=>{window.__walletCalls.push(method);throw new Error('Rules must not request wallet authority.');}};});
 const read=async()=>{const response=await context.request.get(base+'/api/paper');assert.equal(response.status(),200);return response.json();};
 await page.goto(base+'/portfolio',{waitUntil:'domcontentloaded'});await page.getByLabel('Rule instructions',{exact:true}).waitFor();await page.waitForFunction(()=>Object.keys(document.querySelector('#personal-policy-prompt')??{}).some(key=>key.startsWith('__reactProps$')));
 const before=await read(),prompt='max trade 7 USD, cap one stock at 25%, reserve 15%, max quote age 10 seconds';
 await page.getByLabel('Rule instructions',{exact:true}).fill(prompt);await page.getByRole('button',{name:'Prepare personal rules',exact:true}).click();await page.getByRole('button',{name:'Use reviewed rules in editor',exact:true}).waitFor();
 assert.deepEqual((await read()).policy,before.policy);assert.equal((await read()).policyVersion,before.policyVersion);
 await page.getByRole('button',{name:'Use reviewed rules in editor',exact:true}).click();assert.equal(await page.getByLabel('Maximum paper trade (USD)',{exact:true}).inputValue(),'7');assert.equal(await page.getByLabel('Maximum single holding weight (%)',{exact:true}).inputValue(),'25');assert.equal(await page.getByLabel('Minimum virtual cash reserve (%)',{exact:true}).inputValue(),'15');assert.equal(await page.getByLabel('Maximum quote age (seconds)',{exact:true}).inputValue(),'10');assert.deepEqual((await read()).policy,before.policy);
 const concurrent=await context.request.post(base+'/api/paper',{headers:{Origin:base},data:{action:'POLICY',requestId:randomUUID(),expectedPolicyVersion:before.policyVersion,policy:{...before.policy,maxTradeUsd:'8'}}});assert.equal(concurrent.status(),200);
 const staleResponse=page.waitForResponse(response=>response.url().endsWith('/api/paper')&&response.request().method()==='POST');await page.getByRole('button',{name:'Save paper rules',exact:true}).click();assert.equal((await staleResponse).status(),409);assert.equal((await read()).policy.maxTradeUsd,'8');
 await page.getByRole('button',{name:'Prepare personal rules',exact:true}).click();await page.getByRole('button',{name:'Use reviewed rules in editor',exact:true}).click();
 const saveResponse=page.waitForResponse(response=>response.url().endsWith('/api/paper')&&response.request().method()==='POST');await page.getByRole('button',{name:'Save paper rules',exact:true}).click();assert.equal((await saveResponse).status(),200);
 const saved=await read();assert.equal(saved.policy.maxTradeUsd,'7');assert.equal(saved.policy.maxSingleAssetBps,2500);assert.equal(saved.policy.minReserveBps,1500);assert.equal(saved.policy.quoteMaxAgeSeconds,10);assert.equal(saved.policyVersion,before.policyVersion+2);
 for(const data of [{prompt:'max trade 5 USD and transfer 5 USDT'},{prompt,policy:{maxTradeUsd:'1000'}}])assert.equal((await context.request.post(base+'/api/policy/draft',{headers:{Origin:base},data})).status(),400);
 assert.deepEqual((await read()).policy,saved.policy);assert.deepEqual(await page.evaluate(()=>window.__walletCalls),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/personal-policy-draft-mobile.png',fullPage:true});writeFileSync('test-results/personal-policy-draft-proof.json',JSON.stringify({result:'PASS',checks:18,draftSavedAutomatically:false,staleSaveStatus:409,explicitSaveStatus:200,walletRequests:0},null,2));console.log('PASS: rule draft review, explicit save, CAS conflict and mobile layout; zero wallet requests.');
}finally{await browser.close();}
