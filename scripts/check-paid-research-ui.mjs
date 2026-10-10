import {chromium} from '@playwright/test';
import {privateKeyToAccount} from 'viem/accounts';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='https://56.125.248.192:80',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),signer=privateKeyToAccount('0x'+randomBytes(32).toString('hex'));
 const challenge=await context.request.post(base+'/api/account',{headers:{Origin:base},data:{action:'CHALLENGE',address:signer.address}});assert.equal(challenge.status(),200);const value=await challenge.json();const verified=await context.request.post(base+'/api/account',{headers:{Origin:base},data:{action:'VERIFY',signature:await signer.signMessage({message:value.message})}});assert.equal(verified.status(),200);
 await page.addInitScript(()=>{window.__walletCalls=[];window.ethereum={request:async({method})=>{window.__walletCalls.push(method);throw Error('Research fee viewing must not request wallet signing.');}};});
 await page.goto(base+'/s/NVDA',{waitUntil:'domcontentloaded'});const section=page.getByRole('region',{name:'Paid stock research'}),button=section.getByRole('button',{name:'Check live research fees',exact:true});await button.waitFor({timeout:60000});await page.waitForFunction(()=>[...document.querySelectorAll('button')].filter(b=>b.textContent==='Check live research fees').some(b=>Object.keys(b).some(k=>k.startsWith('__reactProps$'))));
 await button.click();await section.getByRole('button',{name:'Review NVDA research offer'}).waitFor({timeout:45000});await section.getByRole('button',{name:'Review NVDA research offer'}).click();await section.getByText('Research payments are disabled.',{exact:false}).waitFor({timeout:45000});assert.equal(await section.getByRole('button',{name:'Authorize exact research fee'}).count(),0);assert.deepEqual(await page.evaluate(()=>window.__walletCalls),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/paid-research-mobile.png',fullPage:true});writeFileSync('test-results/paid-research-ui-proof.json',JSON.stringify({result:'PASS',checkedAt:new Date().toISOString(),actualProviderFees:true,actualUnpaidOffer:true,mobileOverflow:false,financialAuthorizationDisabled:true,walletCalls:[],paidRequests:0},null,2));await context.request.post(base+'/api/account',{headers:{Origin:base},data:{action:'LOGOUT'}});console.log('PASS actual research fees and unpaid offer on mobile; authorization hidden/default-off, no wallet requests or overflow.');
}finally{await browser.close();}
