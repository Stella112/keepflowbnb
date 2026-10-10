import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.FIRSTBELL_TEST_BASE??'https://56.125.248.192:80';
const browser=await chromium.launch({channel:'msedge',headless:true});
const wallet='0x'+'1'.repeat(40),id='00000000-0000-4000-8000-000000000001',hash='0x'+'a'.repeat(64);
try{
 const page=await browser.newPage();
 await page.addInitScript(({wallet,hash})=>{window.__sends=[];window.ethereum={request:async({method,params})=>{if(method==='eth_requestAccounts'||method==='eth_accounts')return [wallet];if(method==='eth_chainId')return '0x38';if(method==='eth_sendTransaction'){window.__sends.push(params[0]);return hash;}throw Error('Unexpected wallet method');}};},{wallet,hash});
 let enabled=false,prepared=0,observed=0;
 await page.route('**/api/intents',route=>route.fulfill({json:{intent:{id,status:'READY_READ_ONLY',reason:'Synthetic acceptance fixture',createdAt:new Date().toISOString(),wallet,input:{amount:'5',ticker:'NVDA'},simulation:{swapStatus:'SUCCESS',approvalStatus:'NOT_NEEDED'},executionAvailable:false}}}));
 await page.route('**/api/intents/*/submission',async route=>{const req=route.request();if(req.method()==='GET')return route.fulfill({json:{executionAvailable:enabled,confirmedFingerprint:'a'.repeat(64),submission:null}});const body=req.postDataJSON();if(body.action==='PREPARE'){prepared++;assert.equal(body.userConfirmed,true);return route.fulfill({json:{executionAvailable:true,handoff:{ticket:'b'.repeat(64),expiresAt:new Date(Date.now()+15000).toISOString(),transaction:{chainId:56,from:wallet,to:'0x'+'2'.repeat(40),data:'0x1234',value:'0',gas:'21000',gasPrice:'1000000000'}}}});}observed++;assert.equal(body.hash,hash);return route.fulfill({json:{executionAvailable:true,submission:{state:'PENDING',hash}}});});
 await page.goto(base+'/s/NVDA',{waitUntil:'domcontentloaded'});
 await page.getByText('Check my account’s purchase rules',{exact:true}).click();
 await page.getByRole('button',{name:'Prepare account check',exact:true}).click();
 await page.getByRole('button',{name:'Check execution availability',exact:true}).click();
 await page.getByText('Live purchases are disabled. Paper trading and read-only checks remain available.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__sends.length),0);assert.equal(prepared,0);
 enabled=true;await page.getByRole('button',{name:'Check execution availability',exact:true}).click();
 const section=page.getByRole('region',{name:'Wallet purchase'});await section.getByRole('button',{name:'Connect wallet',exact:true}).click();
 await section.getByRole('button',{name:'Confirm 5 USDT purchase in wallet',exact:true}).click();
 await section.getByText(/Submission: PENDING/).waitFor();
 assert.equal(prepared,1);assert.equal(observed,1);assert.equal(await page.evaluate(()=>window.__sends.length),1);
 assert.equal(await section.getByRole('button',{name:'Confirm 5 USDT purchase in wallet',exact:true}).isDisabled(),true);
 console.log('PASS browser disabled gate, explicit confirmation, exact synthetic wallet handoff, reconciliation, no resend. All financial endpoints and wallet methods mocked; no funds used.');
}finally{await browser.close();}
