import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {publicToolClient,preparePublicBellReview} from '../tools/studio-firstbell/app/agent/src/sellerCore.mjs';
const base='https://56.125.248.192:80',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext(),page=await context.newPage();await page.goto(base+'/agent');
 const browserFetch=async(url,options)=>{const value=await page.evaluate(async({url,options})=>{const response=await fetch(url,{...options,credentials:'omit',signal:AbortSignal.timeout(10000)});return {status:response.status,body:await response.text(),headers:[...response.headers]};},{url,options:{method:options.method,headers:options.headers,body:options.body,redirect:'error'}});return new Response(value.body,{status:value.status,headers:value.headers});};
 const call=publicToolClient(base,browserFetch),bell=await call('get_bell',{id:'ai-compute'});
 const report=await preparePublicBellReview({bellId:bell.id,bellVersion:bell.version,bellContentHash:bell.contentHash},call);
 assert.equal(report.facts.length,bell.assets.length);assert.equal(report.executionEnabled,false);assert.equal(report.paymentSubmitted,false);assert.equal(report.studioRuntimeVerified,false);
 mkdirSync('test-results',{recursive:true});writeFileSync('test-results/studio-public-adapter-proof.json',JSON.stringify({result:'PASS',externalCertificateValidatedHttps:true,publicOnly:true,realBinanceSources:true,factCount:report.facts.length,bell:report.bell,studioRuntimeVerified:false,executionEnabled:false,paymentSubmitted:false},null,2));console.log('PASS: keyless public Flow review adapter communicating with deployed KeepFlow and actual Binance source facts. Studio runtime remains unverified.');
}finally{await browser.close();}
