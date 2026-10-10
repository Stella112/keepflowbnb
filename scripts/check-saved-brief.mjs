import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.FIRSTBELL_TEST_URL??'http://localhost:3100',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const owner=await browser.newContext({storageState:'test-results/stock-brief-state.json',viewport:{width:390,height:844}}),stranger=await browser.newContext();
 assert.equal((await stranger.request.get(base+'/api/research/jobs/latest?ticker=NVDA')).status(),401);
 assert.equal((await owner.request.get(base+'/api/research/jobs/latest?ticker=INVALID')).status(),400);
 const response=await owner.request.get(base+'/api/research/jobs/latest?ticker=NVDA');assert.equal(response.status(),200);assert.match(response.headers()['cache-control'],/no-store/);const saved=await response.json();assert.equal(saved.job.status,'COMPLETE');assert.equal(saved.job.ticker,'NVDA');assert.equal(saved.paymentSubmitted,false);assert.equal(saved.executionAvailable,false);
 const page=await owner.newPage();let writes=0;page.on('request',request=>{if(request.method()==='POST')writes++;});await page.goto(base+'/s/NVDA',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Object.keys(document.querySelector('#saved-stock-brief-button')??{}).some(key=>key.startsWith('__reactProps$')));await page.getByRole('button',{name:'Open latest saved brief',exact:true}).click();await page.getByText('Discovery timestamp: '+saved.job.report.source.fetchedAt,{exact:false}).waitFor();assert.equal(writes,0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 writeFileSync('test-results/saved-brief-proof.json',JSON.stringify({result:'PASS',ownerScoped:true,savedJobId:saved.job.id,creationRequests:0,mobileLayout:true},null,2));console.log('PASS: owner-only saved brief reopened on mobile without creating a job or provider request.');
}finally{await browser.close();}
