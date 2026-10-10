import {chromium} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.FIRSTBELL_TEST_URL??'http://localhost:3100',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),headers={Origin:base};
 const read=async()=>{const response=await context.request.get(base+'/api/paper');assert.equal(response.status(),200);return response.json();};
 const post=async(data)=>{const response=await context.request.post(base+'/api/paper',{headers,data:{requestId:randomUUID(),...data}});assert.equal(response.status(),200,await response.text());return response.json();};
 const initial=await read(),market=await (await context.request.get(base+'/api/stocks')).json();
 const tokens=market.tokens??market.assets??[];const asset=tokens.find(token=>token.statusInfo?.openState&&Number(token.tokenPrice)>0);
 assert.ok(asset,'Actual available representation required; no fabricated purchase fixture.');
 await post({action:'POLICY',expectedPolicyVersion:initial.policyVersion,policy:{...initial.policy,maxSingleAssetBps:10000,minReserveBps:0,maxDailySpendUsd:'5',maxWeeklySpendUsd:'4'}});
 const purchase={action:'BUY',ticker:asset.underlyingTicker,provider:asset.platformId,amount:'3'};
 const results=await Promise.all([post(purchase),post(purchase)]);assert.equal(results.filter(result=>result.receipt.status==='PAPER_FILLED').length,1);assert.equal(results.filter(result=>result.receipt.status==='BLOCKED').length,1);
 let account=await read();assert.ok(Number(account.paperBudget.dailySpentUsd)>2.99&&Number(account.paperBudget.dailySpentUsd)<=3);assert.equal(account.paperBudget.dailySpentUsd,account.paperBudget.weeklySpentUsd);
 await post({action:'POLICY',expectedPolicyVersion:account.policyVersion,policy:{...account.policy,maxWeeklySpendUsd:'10'}});
 assert.equal((await post({...purchase,amount:'2'})).receipt.status,'PAPER_FILLED');account=await read();assert.ok(Number(account.paperBudget.dailySpentUsd)>4.99&&Number(account.paperBudget.dailySpentUsd)<=5);
 assert.equal((await post({...purchase,amount:'1'})).receipt.status,'BLOCKED');
 const spent=account.paperBudget.dailySpentUsd;assert.equal((await post({action:'SELL',address:account.positions[0].address})).receipt.status,'PAPER_FILLED');assert.equal((await read()).paperBudget.dailySpentUsd,spent);assert.equal((await post({...purchase,amount:'1'})).receipt.status,'BLOCKED');
 account=await read();await post({action:'POLICY',expectedPolicyVersion:account.policyVersion,policy:{...account.policy,maxDailySpendUsd:'0'}});assert.equal((await post({...purchase,amount:'1'})).receipt.status,'BLOCKED');
 const page=await context.newPage();await page.goto(base+'/portfolio',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Paper spending budgets.',exact:true}).waitFor();assert.equal(await page.getByLabel('Maximum daily paper spend (USD)',{exact:true}).inputValue(),'0');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await context.storageState({path:'test-results/paper-budget-state.json'});writeFileSync('test-results/paper-budget-proof.json',JSON.stringify({result:'PASS',concurrentPurchasesLimited:true,spentUsd:spent,sellingDoesNotRestoreBudget:true,zeroCapBlocks:true,mobileLayout:true},null,2));console.log('PASS: concurrent paper purchases respect daily/weekly limits, selling preserves consumed budget, zero cap blocks and mobile usage display works.');
}finally{await browser.close();}
