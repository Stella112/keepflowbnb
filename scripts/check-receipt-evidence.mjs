import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.FIRSTBELL_TEST_URL,browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const owner=await browser.newContext({viewport:{width:390,height:844}}),other=await browser.newContext(),headers={Origin:base};
 const bells=await (await owner.request.get(base+'/api/bells')).json(),bell=bells.bells.find(item=>item.id==='blue-chip');assert.ok(bell);
 const response=await owner.request.post(base+'/api/paper',{headers,data:{action:'BASKET',requestId:randomUUID(),bellId:bell.id,amount:'20'}});assert.equal(response.status(),200);const {receipt}=await response.json();
 assert.equal(receipt.bellVersion,bell.version);assert.equal(receipt.bellContentHash,bell.contentHash);assert.equal(receipt.policySnapshot.maxTradeUsd,'100');assert.equal(receipt.cashAfterUsd,(await (await owner.request.get(base+'/api/paper')).json()).cashUsd);
 const changed=await owner.request.post(base+'/api/paper',{headers,data:{action:'POLICY',requestId:randomUUID(),policy:{maxTradeUsd:'33',maxSingleAssetBps:4000,minReserveBps:1000,driftBps:500}}});assert.equal(changed.status(),200);
 const path='/api/paper/receipts/'+receipt.id+'?download=1',download=await owner.request.get(base+path),exported=await download.json();assert.equal(download.status(),200);assert.equal(download.headers()['cache-control'],'no-store');assert.match(download.headers()['content-disposition'],/^attachment;/);assert.equal(exported.receipt.policySnapshot.maxTradeUsd,'100');assert.equal(exported.financialAuthorization,'NONE_PAPER_ONLY');assert.ok(!('fingerprint' in exported.receipt));assert.ok(!('requestId' in exported.receipt));
 const denied=await other.request.get(base+path);assert.equal(denied.status(),404);assert.equal(denied.headers()['cache-control'],'no-store');assert.ok(!denied.headers()['set-cookie']);
 const page=await owner.newPage();await page.goto(base+'/r/'+receipt.id,{waitUntil:'domcontentloaded'});await page.getByText('Receipt details',{exact:true}).click();await page.getByRole('link',{name:'Download paper receipt ↗'}).waitFor();await page.getByText('Rules recorded for this event',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  execFileSync('ssh',['-o','ConnectTimeout=10','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','sudo systemctl restart firstbell'],{stdio:'inherit',timeout:30000});
 let restored;for(let attempt=0;attempt<40;attempt++){try{const response=await owner.request.get(base+path,{timeout:1500});if(response.ok()){restored=await response.json();break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}assert.deepEqual(restored,exported,'recorded receipt export must survive restart unchanged');
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/receipt-evidence-mobile.png',fullPage:true});writeFileSync('test-results/receipt-evidence-proof.json',JSON.stringify({result:'PASS',recordedBellVersion:true,recordedCashMatchesLedger:true,policySnapshotSurvivesChanges:true,restartPreserved:true,privateDownload:true,unauthorizedReadCreatesNoCookie:true,mobileLayout:true,receiptStatus:receipt.status,transactionRequests:0},null,2));console.log('PASS: historical receipt evidence, private export and mobile layout.');
 await owner.close();await other.close();
}finally{await browser.close();}


