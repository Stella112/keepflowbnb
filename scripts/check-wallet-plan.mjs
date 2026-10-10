import {chromium} from '@playwright/test';
import {privateKeyToAccount} from 'viem/accounts';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.FIRSTBELL_TEST_URL??'http://localhost:3100',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const signed=await browser.newContext({viewport:{width:390,height:844}}),guest=await browser.newContext(),headers={Origin:base};
 const signer=privateKeyToAccount('0x'+randomBytes(32).toString('hex'));
 const challenge=await signed.request.post(base+'/api/account',{headers,data:{action:'CHALLENGE',address:signer.address}});assert.equal(challenge.status(),200);
 const signature=await signer.signMessage({message:(await challenge.json()).message});assert.equal((await signed.request.post(base+'/api/account',{headers,data:{action:'VERIFY',signature}})).status(),200);
 const bells=await(await signed.request.get(base+'/api/bells')).json(),bell=bells.bells.find(item=>item.id==='ai-compute');
 const input={bellId:bell.id,bellVersion:bell.version,bellContentHash:bell.contentHash,contributionUsd:'20'};
 assert.equal((await guest.request.post(base+'/api/wallet/plan',{headers,data:input})).status(),401);
 assert.equal((await signed.request.post(base+'/api/wallet/plan',{headers,data:{...input,wallet:signer.address}})).status(),400);
 assert.equal((await signed.request.post(base+'/api/wallet/plan',{headers,data:{...input,bellVersion:999999}})).status(),409);
 assert.equal((await signed.request.post(base+'/api/wallet/plan',{headers:{Origin:'https://foreign.invalid'},data:input})).status(),403);
 const page=await signed.newPage();await page.goto(base+'/autopilot',{waitUntil:'domcontentloaded'});
 const button=page.getByRole('button',{name:'Preview actual-wallet contribution',exact:true});await button.waitFor();await page.waitForFunction(()=>!document.querySelector('button')?.disabled);
 const responsePromise=page.waitForResponse(response=>response.url().endsWith('/api/wallet/plan')&&response.request().method()==='POST',{timeout:120000});await button.click();
 const response=await responsePromise;assert.equal(response.status(),200);const {plan}=await response.json();
 assert.equal(plan.wallet.toLowerCase(),signer.address.toLowerCase());assert.equal(plan.mode,'READ_ONLY');assert.equal(plan.executionEnabled,false);assert.equal(plan.budgetAvailability,'UNVERIFIED');assert.equal(plan.bell.contentHash,bell.contentHash);assert.equal(plan.currentCashUsd,'0');assert.equal(plan.currentTotalUsd,'0');assert.equal(plan.provenance.chainId,56);assert.ok(BigInt(plan.provenance.blockNumber)>0n);
 await page.getByText('Read-only proposal. Live budget availability is unverified. No schedule, wallet permission or transaction has been created.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#wallet-plan-amount').fill('21');assert.equal(await page.getByText('Read-only proposal. Live budget availability is unverified. No schedule, wallet permission or transaction has been created.',{exact:true}).count(),0);
 await page.goto(base+'/b/ai-compute/history',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Compare published versions.',exact:true}).waitFor();
 assert.equal(await page.locator('#history-before').inputValue(),String(bell.version));assert.equal(await page.locator('#history-after').inputValue(),String(bell.version));await page.getByText('No Flow rule changes between these versions.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 mkdirSync('test-results',{recursive:true});writeFileSync('test-results/wallet-plan-proof.json',JSON.stringify({result:'PASS',syntheticUnfundedSigner:true,actualBscBalanceRead:true,blockNumber:plan.provenance.blockNumber,currentCashUsd:plan.currentCashUsd,bellVersion:plan.bell.version,pinnedHashVerified:true,privateSessionRequired:true,clientWalletInjectionRejected:true,staleVersionRejected:true,inputEditClearsPlan:true,mobileLayout:true,historicalComparisonUi:true,financialExecutionEnabled:false},null,2));console.log('PASS: actual BSC empty-wallet contribution plan, pinned Flow, session/input/version boundaries and mobile history/planner UI. No funds or transactions.');
}finally{await browser.close();}
