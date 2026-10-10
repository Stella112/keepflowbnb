import {chromium} from '@playwright/test';
import {privateKeyToAccount} from 'viem/accounts';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='https://56.125.248.192:80',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.goto(base+'/account',{waitUntil:'domcontentloaded'});
 assert.equal(await page.evaluate(()=>isSecureContext),true);
 const send=async(data)=>page.evaluate(async input=>{const response=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});return {status:response.status,body:await response.json()};},data);
 const signer=privateKeyToAccount('0x'+randomBytes(32).toString('hex'));
 const challenge=await send({action:'CHALLENGE',address:signer.address});assert.equal(challenge.status,200);assert.match(challenge.body.message,/56\.125\.248\.192:80/);
 const verified=await send({action:'VERIFY',signature:await signer.signMessage({message:challenge.body.message})});assert.equal(verified.status,200);
 const cookie=(await context.cookies()).find(value=>value.name==='firstbell-identity');assert.ok(cookie?.secure&&cookie?.httpOnly);
 const sessions=await page.evaluate(async()=>{const response=await fetch('/api/account/sessions');return {status:response.status,body:await response.json()};});assert.equal(sessions.status,200);assert.equal(sessions.body.activeSessions,1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const logout=await send({action:'LOGOUT'});assert.equal(logout.status,200);
 mkdirSync('test-results',{recursive:true});writeFileSync('test-results/public-tls-proof.json',JSON.stringify({result:'PASS',url:base,externalNetwork:true,certificateValidation:true,secureContext:true,secureHttpOnlyIdentityCookie:true,originIncludesPort:true,mobileLayout:true,syntheticUnfundedSigner:true,financialExecutionEnabled:false,physicalPhoneTested:false},null,2));
 console.log('PASS: externally reachable certificate-validated HTTPS, secure context, real signature verification and secure HttpOnly cookie. No transactions.');
}finally{await browser.close();}
