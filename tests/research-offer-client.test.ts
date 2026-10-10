import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchResearchOffer} from '../lib/research/offer-client.ts';
const configuration={enabled:true,url:'https://research.vendor.com/report?ticker=NVDA',approvedOrigin:'https://research.vendor.com',payTo:'0x'+'1'.repeat(40),asset:'0x'+'2'.repeat(40),maximumAtomicAmount:'1000'};
const offer={x402Version:2,resource:{url:configuration.url},accepts:[{scheme:'exact',network:'eip155:56',amount:'123',asset:configuration.asset,payTo:configuration.payTo,maxTimeoutSeconds:60}]};
test('configured read-only provider offer uses exact resource and never sends payment or credentials',async()=>{
 let calls=0,cancelled=false;
 const value=await fetchResearchOffer(configuration,{fetch:async(input,init)=>{calls++;assert.equal(String(input),configuration.url);assert.equal(init?.redirect,'error');assert.equal(init?.credentials,'omit');assert.deepEqual(init?.headers,{Accept:'application/json'});return new Response(new ReadableStream({cancel(){cancelled=true;}}),{status:402,headers:{'PAYMENT-REQUIRED':Buffer.from(JSON.stringify(offer)).toString('base64')}});},now:()=>1000});
 assert.equal(value.status,'PAYMENT_REQUIRED');if(value.status==='PAYMENT_REQUIRED')assert.equal(value.amountAtomic,'123');assert.equal(value.paymentSubmitted,false);assert.equal(calls,1);assert.equal(cancelled,true);
});
test('disabled, origin mismatch, private hosts and credential query fail before network',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;throw Error();};
 assert.equal((await fetchResearchOffer(undefined,{fetch:fetcher})).status,'UNAVAILABLE');
 for(const change of [{enabled:false},{approvedOrigin:'https://other.vendor.com'},{url:'https://localhost/report',approvedOrigin:'https://localhost'},{url:'https://127.0.0.1/report',approvedOrigin:'https://127.0.0.1'},{url:configuration.url+'&apiKey=private'},{url:'https://user:secret@research.vendor.com/report'}])assert.equal((await fetchResearchOffer({...configuration,...change},{fetch:fetcher})).status,'UNAVAILABLE');assert.equal(calls,0);
});
test('wrong merchant, budget, response and failure never retry or claim a report',async()=>{
 for(const response of [new Response('{}',{status:200}),new Response(null,{status:402}),new Response(null,{status:402,headers:{'PAYMENT-REQUIRED':Buffer.from(JSON.stringify({...offer,accepts:[{...offer.accepts[0],amount:'1001'}]})).toString('base64')}})]){
  let calls=0;assert.equal((await fetchResearchOffer(configuration,{fetch:async()=>{calls++;return response;}})).status,'UNAVAILABLE');assert.equal(calls,1);
 }
 const value=await fetchResearchOffer(configuration,{fetch:async()=>{throw Error('PRIVATE_PROVIDER_SECRET');}});assert.equal(JSON.stringify(value).includes('PRIVATE_PROVIDER_SECRET'),false);
});
