import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bellInputSchema,bellPolicySchema,defaultPolicy,type Flow} from '../lib/paper/model.ts';
import {effectiveBellPolicy,quotePolicy,walletPolicy} from '../lib/execution/rules.ts';
import {bellManifest} from '../lib/bells/manifest.ts';
const bell:Flow={id:'test',title:'Test',description:'',assets:[{ticker:'NVDA',weightBps:9000}],reserveBps:1000,version:1,contentHash:'test',createdAt:'2026-10-08T12:00:00Z',example:false};
test('legacy policy remains unchanged while explicit creator caps intersect with stricter personal rules',()=>{
 assert.equal(effectiveBellPolicy(bell,defaultPolicy).maxTradeUsd,'100');assert.equal(effectiveBellPolicy(bell,defaultPolicy).maxSlippageBps,undefined);
 const chosen={...bell,policy:{maxTradeUsd:'12',maxSingleAssetBps:3000,minReserveBps:2000,maxSlippageBps:25,quoteMaxAgeSeconds:5,priceMaxAgeSeconds:20}};
 const result=effectiveBellPolicy(chosen,{...defaultPolicy,maxTradeUsd:'10',maxSlippageBps:10,priceMaxAgeSeconds:10});
 assert.equal(result.maxTradeUsd,'10');assert.equal(result.maxSingleAssetBps,3000);assert.equal(result.minReserveBps,2000);assert.equal(result.maxSlippageBps,10);assert.equal(result.priceMaxAgeSeconds,10);
 assert.equal(walletPolicy(11_000_000n,100_000_000n,0n,100_000_000n,result).code,'MAX_TRADE');
});
test('actual policy is portable and changes canonical manifest integrity',()=>{
 const policy={maxTradeUsd:'12',maxSlippageBps:25,allowAutomaticSelling:false as const};
 const manifest=bellManifest({...bell,policy});assert.equal(manifest.policy.maxTradeUsd,'12');assert.equal(manifest.policy.maxSlippageBps,25);
 assert.notEqual(manifest.manifestHash,bellManifest({...bell,policy:{...policy,maxTradeUsd:'11'}}).manifestHash);
 assert.equal(bellManifest(bell).policy.maxSlippageBps,undefined);
});
test('policy schema rejects unsupported sells, fractional basis points, zero caps and unbounded freshness',()=>{
 for(const policy of [{allowAutomaticSelling:true},{maxTradeUsd:'0'},{maxTradeUsd:'1001'},{maxSlippageBps:1.1},{quoteMaxAgeSeconds:61},{priceMaxAgeSeconds:301},{unknown:true}])assert.equal(bellPolicySchema.safeParse(policy).success,false);
 assert.equal(bellInputSchema.safeParse({title:'Test',description:'',assets:bell.assets,reserveBps:1000,policy:{maxTradeUsd:'5'}}).success,true);
});
test('route slippage and selected local freshness limits fail closed at precise boundaries',()=>{
 const now=Date.parse('2026-10-08T12:00:00Z'),policy={...defaultPolicy,maxSlippageBps:25,quoteMaxAgeSeconds:5,priceMaxAgeSeconds:10};
 assert.equal(quotePolicy(policy,new Date(now-5000).toISOString(),new Date(now-10000).toISOString(),25,now).allowed,true);
 assert.equal(quotePolicy(policy,new Date(now-5001).toISOString(),new Date(now).toISOString(),25,now).code,'STALE_QUOTE');
 assert.equal(quotePolicy(policy,new Date(now).toISOString(),'invalid',25,now).code,'STALE_PRICE');
 assert.equal(quotePolicy(policy,new Date(now).toISOString(),new Date(now).toISOString(),50,now).code,'MAX_SLIPPAGE');
});
