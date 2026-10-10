import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildUnderlyingResearch as build,underlyingResearchSchema,underlyingBinding,safeUnderlyingLink,type UnderlyingBinding} from '../lib/research/underlying.ts';
import type {RwaToken} from '../lib/binance/rwa-schemas.ts';
const profile=JSON.parse(readFileSync(new URL('../fixtures/api/nvda-underlying-profile.json',import.meta.url),'utf8')).data,market=JSON.parse(readFileSync(new URL('../fixtures/api/nvda-underlying-market.json',import.meta.url),'utf8')).data;
const selected:UnderlyingBinding={ticker:'NVDA',provider:'ondo',contract:profile.tokenContractAddress,assetType:1};
const time='2026-10-09T12:00:00Z';
const buildUnderlyingResearch=(selected:UnderlyingBinding,profile:unknown,market:unknown,times={profile:time,market:time})=>build(selected,profile,market,times);
test('actual sanitized underlying fixtures preserve sourced profile and exact market strings',()=>{
 const result=buildUnderlyingResearch(selected,profile,market,{profile:time,market:time});assert.equal(result.status,'AVAILABLE');assert.equal(result.profile.company?.ceo,'Jensen Huang');assert.equal(result.profile.company?.website,'https://www.nvidia.com/');assert.equal(result.market.data?.marketCap,'5550610522500');assert.equal(result.market.data?.referencePrice,'229.473895');assert.equal(result.profile.protections.length,2);assert.equal(result.analystResearchAvailable,false);assert.equal(result.executionEnabled,false);assert.deepEqual(underlyingResearchSchema.parse(result),result);
});
test('wrong chain contract issuer ticker or asset type is unavailable independently',()=>{
 for(const changed of [{binanceChainId:'1'},{tokenContractAddress:'0x'+'1'.repeat(40)},{platformId:'bstock'},{underlyingTicker:'MSFT'},{assetType:3}]){const result=buildUnderlyingResearch(selected,{...profile,...changed},market);assert.equal(result.profile.status,'UNAVAILABLE');assert.equal(result.market.status,'AVAILABLE');assert.equal(result.status,'PARTIAL');}
 for(const changed of [{binanceChainId:'1'},{tokenContractAddress:'0x'+'1'.repeat(40)},{platformId:'bstock'},{underlyingTicker:'MSFT'},{assetType:3}])assert.equal(buildUnderlyingResearch(selected,profile,{...market,...changed}).market.status,'UNAVAILABLE');
});
test('optional numeric data is null and failed independent endpoint never gains fallback facts',()=>{
 const missing=buildUnderlyingResearch(selected,undefined,{...market,marketData:{referencePrice:'1'}});assert.equal(missing.profile.company,null);assert.equal(missing.market.data?.marketCap,null);assert.equal(missing.market.data?.peRatioTTM,null);assert.equal(missing.market.data?.referencePrice,'1');
 assert.equal(buildUnderlyingResearch(selected,profile,undefined).status,'PARTIAL');assert.equal(buildUnderlyingResearch(selected,undefined,undefined).status,'UNAVAILABLE');
 for(const value of ['NaN','1e4',1,'9'.repeat(121)])assert.equal(buildUnderlyingResearch(selected,profile,{...market,marketData:{referencePrice:value}}).market.status,'UNAVAILABLE');
});
test('safe external links allow HTTPS public domains only and sanitize links without fetching',()=>{
 for(const value of ['javascript:alert(1)','http://www.nvidia.com','https://user:pass@www.nvidia.com','https://127.0.0.1/','https://[::1]/','https://localhost/','https://service.internal/','https://www.nvidia.com:8443/'])assert.equal(safeUnderlyingLink(value),null);
 const result=buildUnderlyingResearch(selected,{...profile,companyInfo:{...profile.companyInfo,website:'javascript:alert(1)'},protections:{report:{supported:true,url:'http://localhost/private',description:null}}},market);assert.equal(result.profile.status,'AVAILABLE');assert.equal(result.profile.company?.website,null);assert.equal(result.profile.protections[0].url,null);
 assert.throws(()=>underlyingResearchSchema.parse({...result,profile:{...result.profile,company:{...result.profile.company,website:'javascript:alert(1)'}}}));
});
test('server resolution binding rejects unsupported discovery before provider requests',()=>{
 const token={binanceChainId:'56',tokenContractAddress:selected.contract,platformId:'ondo',assetType:1,underlyingTicker:'NVDA',underlyingName:'NVIDIA',tokenName:'Fixture',tokenSymbol:'NVDA',tokenLogoUrl:'https://www.nvidia.com/logo.png',decimals:'18',tokenToShareRatio:'1',tokenPrice:'1',referencePrice:'1',statusInfo:market.statusInfo} as RwaToken;
 assert.deepEqual(underlyingBinding(token),selected);for(const changed of [{binanceChainId:'1'},{platformId:'unknown'},{assetType:2},{underlyingTicker:'UNSUPPORTED'}])assert.throws(()=>underlyingBinding({...token,...changed}));
});

test('missing future retrieval times fail closed and documented English description is preserved',()=>{assert.equal(build(selected,profile,market).status,'UNAVAILABLE');assert.equal(build(selected,profile,market,{profile:'2099-01-01T00:00:00Z',market:time}).status,'PARTIAL');const result=buildUnderlyingResearch(selected,{...profile,companyInfo:{descriptionEn:'Documented English description'}},market);assert.equal(result.profile.company?.description,'Documented English description');});
