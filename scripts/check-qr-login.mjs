import {useBrowserApi} from './browser-api.mjs';
import {chromium} from '@playwright/test';
import {privateKeyToAccount} from 'viem/accounts';
import {hexToString} from 'viem';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const desktopBase=process.env.FIRSTBELL_QR_DESKTOP_URL??'http://localhost:3100';
const browser=await chromium.launch({channel:'msedge',headless:true,...(process.env.FIRSTBELL_TEST_PROXY?{proxy:{server:process.env.FIRSTBELL_TEST_PROXY}}:{})}),signer=privateKeyToAccount('0x'+randomBytes(32).toString('hex'));
try{
 const desktop=await useBrowserApi(await browser.newContext({viewport:{width:1280,height:1000}})),page=await desktop.newPage();const desktopSigner=privateKeyToAccount('0x'+randomBytes(32).toString('hex')),desktopCalls=[];await page.exposeFunction('testDesktopWallet',async(method)=>{desktopCalls.push(method);if(['eth_requestAccounts','eth_accounts'].includes(method))return [desktopSigner.address];if(method==='eth_chainId')return '0x38';throw new Error('Parallel desktop signing must be blocked.');});await page.addInitScript(()=>{window.ethereum={request:({method})=>window.testDesktopWallet(method)};});
 page.on('response',async response=>{if(response.url().endsWith('/api/account/qr')&&response.request().method()==='POST'){const result=await response.json().catch(()=>({}));console.log(JSON.stringify({qrHttp:response.status(),error:result.error??null,created:!!result.id}));}});await page.goto(desktopBase+'/account',{waitUntil:'domcontentloaded'});console.log(JSON.stringify({accountTitle:await page.title(),accountText:(await page.locator('body').innerText()).slice(0,1200)}));await page.waitForFunction(()=>Object.keys(document.querySelector('.qr-login button')??{}).some(key=>key.startsWith('__reactProps$')));await page.getByRole('button',{name:'Show login QR',exact:true}).click();await page.getByAltText('Scan this QR to log in with your phone').waitFor();
 const phoneUrl=await page.getByRole('link',{name:'Open phone approval link ↗',exact:true}).getAttribute('href');const id=new URL(phoneUrl).pathname.split('/').pop(),phoneBase=new URL(phoneUrl).origin;
 assert.equal(phoneBase,process.env.FIRSTBELL_PUBLIC_QR_ORIGIN??'https://56.125.248.192:80','phone URL must use the configured public HTTPS origin, not localhost');assert.match(await page.getByAltText('Scan this QR to log in with your phone').getAttribute('src'),/^data:image\/png;base64,/);
 const desktopCode=await page.locator('.pair-code').innerText();assert.match(desktopCode,/^[0-9A-F]{8}$/);
 const phone=await useBrowserApi(await browser.newContext({viewport:{width:390,height:844}})),phonePage=await phone.newPage(),calls=[];
 await phonePage.exposeFunction('testWallet',async(method,params)=>{calls.push(method);if(['eth_requestAccounts','eth_accounts'].includes(method))return [signer.address];if(method==='eth_chainId')return '0x38';if(method==='personal_sign'){assert.match(hexToString(params[0]),/does not authorize trades or transfers/);return signer.signMessage({message:hexToString(params[0])});}throw new Error('Unexpected wallet call');});
 await phonePage.addInitScript(()=>{window.ethereum={request:({method,params})=>window.testWallet(method,params)};});
 const action=async(context,base,data)=>context.request.post(base+'/api/account/qr/'+id,{headers:{Origin:base},data});
 assert.equal((await action(phone,phoneBase,{action:'APPROVE',code:desktopCode})).status(),400,'a QR alone must not authenticate or approve');
 await phonePage.goto(phoneUrl,{waitUntil:'domcontentloaded'});await phonePage.waitForFunction(()=>Object.keys(document.querySelector('.wallet-control button')??{}).some(key=>key.startsWith('__reactProps$')));await phonePage.getByRole('button',{name:'Connect wallet',exact:true}).click();await phonePage.getByLabel('I checked that the code matches my computer.',{exact:true}).waitFor();
 assert.equal(await phonePage.locator('.pair-code').innerText(),desktopCode);assert.equal(await phonePage.getByRole('button',{name:'Approve computer login',exact:true}).isDisabled(),true);
 assert.equal((await action(phone,phoneBase,{action:'APPROVE',code:'00000000'})).status(),400);
 await phone.request.post(phoneBase+'/api/paper',{headers:{Origin:phoneBase},data:{action:'POLICY',requestId:randomUUID(),policy:{maxTradeUsd:'67',maxSingleAssetBps:4000,minReserveBps:1000,driftBps:500}}});
 await phonePage.getByLabel('I checked that the code matches my computer.',{exact:true}).check();await phonePage.getByRole('button',{name:'Approve computer login',exact:true}).click();await phonePage.getByRole('heading',{name:'Computer approved.',exact:true}).waitFor();
 await page.getByRole('button',{name:'Finish QR login',exact:true}).waitFor({timeout:12000});
 assert.equal((await (await desktop.request.get(desktopBase+'/api/account')).json()).wallet,null,'phone approval must not silently log the PC in');
 const outsider=await useBrowserApi(await browser.newContext());assert.equal((await action(outsider,desktopBase,{action:'FINISH'})).status(),400,'only the originating PC can redeem');await outsider.close();
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/qr-login-desktop-approved.png',fullPage:true});await phonePage.screenshot({path:'test-results/qr-login-phone-approved.png',fullPage:true});
 let releaseFinish,finishEntered;const held=new Promise(resolve=>releaseFinish=resolve),entered=new Promise(resolve=>finishEntered=resolve);await page.route('**/api/account/qr/'+id,async route=>{if(route.request().method()==='POST'&&route.request().postDataJSON()?.action==='FINISH'){finishEntered();await held;await route.continue();}else await route.continue();});
 await page.getByRole('button',{name:'Finish QR login',exact:true}).click();await entered;
 await page.getByText('Or connect a wallet on this computer',{exact:true}).click();await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await page.getByText('Finish the current sign-in operation before starting another.',{exact:true}).waitFor();assert.ok(!desktopCalls.includes('personal_sign'));releaseFinish();await page.getByRole('heading',{name:'Signed in.',exact:true}).waitFor();await page.unroute('**/api/account/qr/'+id);
 assert.equal((await (await desktop.request.get(desktopBase+'/api/account')).json()).wallet,signer.address.toLowerCase());assert.equal((await (await desktop.request.get(desktopBase+'/api/paper')).json()).policy.maxTradeUsd,'67');
 assert.equal((await action(desktop,desktopBase,{action:'FINISH'})).status(),400,'consumed QR cannot be reused');assert.equal((await action(phone,phoneBase,{action:'APPROVE',code:desktopCode})).status(),400);
 const guest=await useBrowserApi(await browser.newContext());const headers={Origin:desktopBase};const older=await (await guest.request.post(desktopBase+'/api/account/qr',{headers})).json(),newer=await (await guest.request.post(desktopBase+'/api/account/qr',{headers})).json();
 assert.equal((await (await guest.request.get(desktopBase+'/api/account/qr/'+older.id)).json()).status,'CANCELLED','generating a new QR invalidates the previous code');assert.equal((await guest.request.post(desktopBase+'/api/account/qr/'+newer.id,{headers,data:{action:'CANCEL'}})).status(),200);
 assert.equal((await phone.request.post(phoneBase+'/api/account/qr/'+newer.id,{headers:{Origin:phoneBase},data:{action:'APPROVE',code:newer.code}})).status(),400);
 const crossSite=await guest.request.post(desktopBase+'/api/account/qr',{headers:{Origin:'http://attacker.example'}});assert.ok(crossSite.status()===403||crossSite.blockedByBrowser===true,'cross-origin access must be rejected by server or browser');
 assert.equal(await phonePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.ok(!calls.includes('eth_sendTransaction'));assert.equal(calls.filter(m=>m==='personal_sign').length,1);
 writeFileSync('test-results/qr-login-proof.json',JSON.stringify({result:'PASS',checks:['configured public HTTPS QR URL','two independent browser contexts','phone wallet signature','matching code confirmation','unauthenticated approval rejected','wrong code rejected','explicit desktop finish','desktop ownership','single use','cancel and supersede','cross-origin rejected','paper account restored','mobile layout','parallel desktop sign-in blocked during QR finish','no transaction requested'],actualPhoneScanTested:false},null,2));
 console.log(JSON.stringify({result:'PASS',checks:15,actualPhoneScanTested:false,transactionRequests:0}));
}finally{await browser.close();}








