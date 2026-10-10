import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.FIRSTBELL_TEST_URL;
assert.ok(base?.startsWith('https://'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(base+'/bells',{waitUntil:'networkidle'});
 const paths=await page.locator('a[href^="/b/"]').evaluateAll(items=>[...new Set(items.map(item=>item.getAttribute('href')))]);
 assert.ok(paths.length>0);let checked=0;
 for(const path of paths.slice(0,8)){
  await page.goto(base+path,{waitUntil:'networkidle'});
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),base+path);
  assert.match(await page.locator('meta[property="og:description"]').getAttribute('content'),/Paper trading · Version/);
  const image=await page.locator('meta[property="og:image"]').getAttribute('content');assert.ok(image);
  const imageUrl=new URL(image,base);assert.equal(imageUrl.origin,base);
  const response=await fetch(imageUrl);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/png/);
  const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);
  if(checked===0){mkdirSync('test-results',{recursive:true});writeFileSync('test-results/bell-social-preview.png',bytes);}
  checked++;
 }
 const missing=await fetch(base+'/b/nonexistent-social-preview/opengraph-image');assert.equal(missing.status,404);
 writeFileSync('test-results/social-preview-proof.json',JSON.stringify({result:'PASS',bellsChecked:checked,canonicalHttps:true,paperLabel:true,pngSize:[1200,630],missingBell404:true},null,2));
 console.log('PASS: canonical Flow social metadata and actual PNG previews; missing Flow returns404.');
}finally{await browser.close();}
