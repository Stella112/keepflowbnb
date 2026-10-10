import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const base=process.env.FIRSTBELL_TEST_URL??'http://56.125.248.192';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:380,height:820}});
 // Test-only provider: exercises connection without accessing or signing with a real wallet.
 await page.addInitScript(()=>{window.ethereum={request:async({method})=>{if(method==='eth_requestAccounts'||method==='eth_accounts')return ['0x1f41ebf1e60e5daa9cdda69637a78a9381b23388'];if(method==='eth_chainId')return '0x38';throw new Error('Unexpected wallet operation: '+method);}};});
 await page.goto(base,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.stock-card').count(),8);
 await page.locator('a[href="/s/NVDA"]').click();
 await page.getByText('Representation settings',{exact:true}).click();await page.getByLabel('Issuer',{exact:true}).selectOption('bstock');
 await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
 await page.getByRole('button',{name:'Get purchase estimate',exact:true}).click();
 await page.getByText('The purchase simulation failed. Your wallet needs more USDT for this amount.',{exact:true}).waitFor({timeout:60000});
 await page.getByText('Exact amount approval simulation: success.',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'380px layout must not overflow');
 mkdirSync('test-results',{recursive:true});
 await page.screenshot({path:'test-results/nvda-mobile.png',fullPage:true});
 await page.getByLabel('You pay in USDT').fill('4');
 assert.equal(await page.locator('.quote-result').count(),0,'Changing amount clears the prior result');
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'/s/NVDA',{waitUntil:'networkidle'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.screenshot({path:'test-results/nvda-desktop.png',fullPage:true});
 console.log('PASS: live discovery, wallet connection, live quote/build/simulation, stale-result clearing, 380px and desktop layouts. No signature or broadcast.');
}finally{await browser.close();}
