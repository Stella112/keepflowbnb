import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.FIRSTBELL_TEST_BASE??'https://56.125.248.192:80';
const browser=await chromium.launch({channel:'msedge',headless:true});
const wallet='0x'+'1'.repeat(40),hash='0x'+'a'.repeat(64),id='00000000-0000-4000-8000-000000000001';
try{
 const page=await browser.newPage();
 await page.addInitScript(({wallet,hash})=>{window.__sends=[];window.ethereum={request:async({method,params})=>{if(['eth_requestAccounts','eth_accounts'].includes(method))return [wallet];if(method==='eth_chainId')return '0x38';if(method==='eth_sendTransaction'){window.__sends.push(params[0]);return hash;}throw Error('Unexpected wallet method');}};},{wallet,hash});
 let session={id,wallet,revision:0,state:'ACTIVE',retainedReserveUsd:'0.5',executionAvailable:false,approvalAvailable:false,reason:'Synthetic acceptance fixture',legs:[{ticker:'NVDA',amount:'1.5',state:'PLANNED'}]},submits=0;
 await page.route('**/api/paper',route=>route.fulfill({json:{policyVersion:0}}));
 await page.route('**/api/baskets**',route=>{if(route.request().method()==='GET'){session={...session,state:'ACTIVE',executionAvailable:true,legs:[{ticker:'NVDA',amount:'1.5',state:'SWAP_READY',intentId:id}]};return route.fulfill({json:{session}});}const body=route.request().postDataJSON();if(body.action==='CREATE')assert.equal(body.amount,'5');if(body.action==='CANCEL'){assert.equal(body.expectedRevision,0);session={...session,state:'CANCELLED',legs:session.legs.map(leg=>({...leg,state:'CANCELLED'}))};}if(body.action==='SUBMIT'){assert.equal(body.userConfirmed,true);submits++;session={...session,legs:[{ticker:'NVDA',amount:'1.5',state:'SWAP_PENDING',intentId:id,operation:'SWAP'}]};return route.fulfill({json:{session,handoff:{kind:'SWAP',ticket:'b'.repeat(64),expiresAt:new Date(Date.now()+15000).toISOString(),transaction:{chainId:56,from:wallet,to:'0x'+'2'.repeat(40),data:'0x1234',value:'0',gas:'21000',gasPrice:'1000000000'}}}});}if(body.action==='OBSERVE_SWAP')assert.equal(body.hash,hash);return route.fulfill({json:{session}});});
 await page.goto(base+'/bells',{waitUntil:'domcontentloaded'});const href=await page.locator('a[href^="/b/"]').first().getAttribute('href');assert.ok(href);await page.goto(base+href,{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(1200);await page.getByText('Wallet basket purchase',{exact:true}).click();const section=page.getByRole('region',{name:'Wallet basket'});await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(el=>el.textContent==='Review basket'&&Object.keys(el).some(key=>key.startsWith('__reactProps'))));await section.getByRole('button',{name:'Review basket',exact:true}).click();await section.getByText('Live purchases are disabled. Preparing this basket does not spend funds.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__sends.length),0);await section.getByRole('button',{name:'Cancel unsubmitted basket legs',exact:true}).click();await section.getByText('Basket: CANCELLED · Reserve retained: 0.5 USDT',{exact:true}).waitFor();
 await section.getByText('Recover an existing basket',{exact:true}).click();await section.getByLabel('Recovery ID',{exact:true}).fill(id);await section.getByRole('button',{name:'Load basket',exact:true}).click();await section.getByRole('button',{name:'Connect wallet',exact:true}).click();await section.getByRole('button',{name:'Confirm 1.5 USDT purchase in wallet',exact:true}).click();await section.getByText('Transaction submitted. Check confirmations before the next leg.',{exact:true}).waitFor();assert.equal(submits,1);assert.equal(await page.evaluate(()=>window.__sends.length),1);assert.equal(await section.getByRole('button',{name:'Confirm 1.5 USDT purchase in wallet',exact:true}).count(),0);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);console.log('PASS mobile basket review disabled gate, owner recovery, explicit exact synthetic handoff, chain observation and no resend. Financial endpoints and wallet mocked; no funds used.');
}finally{await browser.close();}







