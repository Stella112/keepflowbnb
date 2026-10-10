import {chromium} from '@playwright/test';
import {privateKeyToAccount} from 'viem/accounts';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.FIRSTBELL_TEST_URL??'http://localhost:3100',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const primary=await browser.newContext({viewport:{width:390,height:844}}),other=await browser.newContext(),foreign=await browser.newContext(),guest=await browser.newContext(),signer=privateKeyToAccount('0x'+randomBytes(32).toString('hex')),stranger=privateKeyToAccount('0x'+randomBytes(32).toString('hex')),headers={Origin:base};
 const login=async(context,account)=>{const challenge=await context.request.post(base+'/api/account',{headers,data:{action:'CHALLENGE',address:account.address}});assert.equal(challenge.status(),200);const data=await challenge.json(),signature=await account.signMessage({message:data.message});assert.equal((await context.request.post(base+'/api/account',{headers,data:{action:'VERIFY',signature}})).status(),200);};
 assert.equal((await guest.request.get(base+'/api/account/sessions')).status(),401);await login(primary,signer);await login(other,signer);await login(foreign,stranger);
 const summary=await primary.request.get(base+'/api/account/sessions');assert.equal(summary.status(),200);assert.match(summary.headers()['cache-control'],/no-store/);const data=await summary.json();assert.equal(data.activeSessions,2);assert.equal(data.financialAuthorization,'UNCHANGED');assert.deepEqual(Object.keys(data).sort(),['activeSessions','currentExpiresAt','financialAuthorization']);
 assert.equal((await primary.request.post(base+'/api/account/sessions',{headers,data:{action:'REVOKE_OTHERS',accountId:'injected'}})).status(),400);assert.equal((await primary.request.post(base+'/api/account/sessions',{headers:{Origin:'https://foreign.invalid'},data:{action:'REVOKE_OTHERS'}})).status(),403);
 const page=await primary.newPage();await page.goto(base+'/account',{waitUntil:'domcontentloaded'});await page.getByText('2 active sign-in sessions.',{exact:true}).waitFor();await page.getByRole('button',{name:'Sign out other browsers',exact:true}).click();await page.getByText('1 other sign-in session signed out.',{exact:true}).waitFor();
 assert.equal((await primary.request.get(base+'/api/account/sessions')).status(),200);assert.equal((await other.request.get(base+'/api/account/sessions')).status(),401);assert.equal((await foreign.request.get(base+'/api/account/sessions')).status(),200);
 const replay=await primary.request.post(base+'/api/account/sessions',{headers,data:{action:'REVOKE_OTHERS'}});assert.equal(replay.status(),200);assert.equal((await replay.json()).revokedCount,0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 writeFileSync('test-results/session-security-proof.json',JSON.stringify({result:'PASS',syntheticUnfundedSigners:true,sameAccountSessionRevoked:true,currentAndForeignSessionsPreserved:true,credentialFieldsExposed:false,mobileLayout:true,financialAuthorization:'UNCHANGED'},null,2));console.log('PASS: other sign-in session revoked, current/foreign preserved, private session metadata only, strict/origin checks and mobile UI. Synthetic unfunded message signers; no transactions.');
}finally{await browser.close();}
