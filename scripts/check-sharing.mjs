import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),base=process.env.FIRSTBELL_TEST_URL;
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const home=page.getByRole('textbox',{name:'KeepFlow share link',exact:true});
 assert.equal(await home.inputValue(),'https://56.125.248.192:80/');
 await page.getByAltText('QR code containing the KeepFlow HTTPS share link',{exact:true}).waitFor();
 const bellPath=await page.locator('a[href^="/b/"]').first().getAttribute('href');
 await page.goto(base+bellPath,{waitUntil:'domcontentloaded'});
 assert.equal(await page.getByRole('textbox',{name:'this Flow share link',exact:true}).inputValue(),'https://56.125.248.192:80'+bellPath);
 await page.getByAltText("QR code containing the this Flow HTTPS share link",{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await page.getByRole('link',{name:'Download Flow definition ↗'}).count(),1);
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/public-sharing-mobile.png',fullPage:true});
 writeFileSync('test-results/public-sharing-proof.json',JSON.stringify({result:'PASS',generalQr:true,bellQr:true,configuredHttpsLinks:true,mobileLayout:true,physicalPhoneTested:false,publicReachabilityVerified:base==='https://56.125.248.192:80'},null,2));console.log('PASS: HTTPS home/Flow QR and mobile layout; physical phone scan unverified.');
}finally{await browser.close();}

