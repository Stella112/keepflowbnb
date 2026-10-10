import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.FIRSTBELL_TEST_URL??'http://localhost:3100';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.addInitScript(()=>{window.__walletCalls=0;window.ethereum={request:async()=>{window.__walletCalls++;throw new Error('Drafting must not request wallet authorization');}};});
 page.on('pageerror',error=>console.log('Browser error: '+error.message));await page.goto(base+'/create',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Allocation instructions').fill('NVIDIA 30%, Microsoft 30%, Apple 30%, keep 10% in USDT');
 await page.getByRole('button',{name:'Prepare a draft',exact:true}).click();
 await page.getByRole('button',{name:'Use draft in editor',exact:true}).waitFor({timeout:45000});
 await page.getByRole('button',{name:'Use draft in editor',exact:true}).click();
 assert.equal(await page.getByLabel('NVDA (%)',{exact:true}).inputValue(),'30');
 assert.equal(await page.getByLabel('MSFT (%)',{exact:true}).inputValue(),'30');
 assert.equal(await page.getByLabel('Virtual cash reserve (%)',{exact:true}).inputValue(),'10');
 await page.getByLabel('Flow title',{exact:true}).fill('QA verified draft');
 await page.getByRole('button',{name:'Create paper Flow',exact:true}).click();
 await page.waitForURL(/\/b\//);const id=page.url().split('/').pop();
 const manifestResponse=await context.request.get(`${base}/api/bells/${id}/manifest?version=1`);
 assert.equal(manifestResponse.status(),200);const manifest=await manifestResponse.json();
 assert.equal(manifest.version,1);assert.equal(manifest.schemaVersion,1);assert.equal(manifest.assets.length,3);
 assert.ok(manifest.publishedAt);assert.match(manifest.manifestHash,/^[a-f0-9]{64}$/);
 assert.equal(manifest.integrity.onchainRecorded,false);assert.equal(manifest.automation.defaultEnabled,false);
 assert.equal((await context.request.get(`${base}/api/bells/${id}/manifest?version=2`)).status(),404);
 assert.equal(await page.evaluate(()=>window.__walletCalls),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const headers={Origin:base};
 const malicious=await context.request.post(`${base}/api/research/draft`,{headers,data:{prompt:'NVDA -90%, keep 10% cash'}});
 assert.equal(malicious.status(),400);
 const publicLogin=await context.request.post('http://56.125.248.192/api/account',{headers:{Origin:'http://56.125.248.192'},data:{action:'CHALLENGE',address:'0x1111111111111111111111111111111111111111'}});
 assert.equal(publicLogin.status(),403);
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/v2-draft-bell.png',fullPage:true});
 writeFileSync('test-results/v2-proof.json',JSON.stringify({result:'PASS',bellId:id,checks:12,walletRequests:0,mode:'PAPER',physicalPhoneTested:false},null,2));
 console.log(JSON.stringify({result:'PASS',checks:12,walletRequests:0,mode:'PAPER'}));
}finally{await browser.close();}

