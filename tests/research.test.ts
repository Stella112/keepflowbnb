import {test} from "node:test";
import assert from "node:assert/strict";
import {draftFromPrompt} from "../lib/research/draft.ts";
const supported=["NVDA","MSFT","AAPL","AMZN"];
test('all percentage tokens reject excess precision instead of accepting trailing substrings',()=>{
 for(const prompt of ['NVDA 90.010%, keep 10% cash','90.010% NVDA, keep 10% cash','NVDA 90%, keep 10.001% cash','NVDA 90%, keep 10% cash, cap one stock at 90.010%','.010% NVDA, keep 90% cash'])assert.throws(()=>draftFromPrompt({prompt},supported),/two decimal/);
 assert.throws(()=>draftFromPrompt({prompt:'.01% NVDA, keep 99% cash'},supported),/leading zero/);
 assert.equal(draftFromPrompt({prompt:'NVDA 90.01%, keep 9.99% cash'},supported).definition.assets[0].weightBps,9001);
});
test('multiple caps never select the first rule and silently discard the second',()=>{
 for(const prompt of ['NVDA 90%, keep 10% cash, cap one stock at 100%, cap one stock at 30%','NVDA 90%, keep 10% cash, max single stock 100%, maximum single holding 90%','NVDA 90%, keep 10% cash, cap one stock at 100%, cap one stock at 100%'])assert.throws(()=>draftFromPrompt({prompt},supported),/one single-stock cap/);
});
test("explicit company weights produce a validated draft and no authority",()=>{const draft=draftFromPrompt({prompt:"Create 100 USDT: NVIDIA 30%, Microsoft 30%, Apple 30%, keep 10% in USDT, cap one stock at 30%, don't automatically sell"},supported);assert.equal(draft.definition.reserveBps,1000);assert.equal(draft.definition.assets.length,3);assert.equal(draft.requestedAmountUsdt,"100");assert.equal(draft.policySuggestions.maxSingleAssetBps,3000);assert.equal(draft.policySuggestions.automaticSelling,false);});
test("equal split uses integer basis points and disclosed reserve",()=>{const draft=draftFromPrompt({prompt:"NVDA MSFT AAPL equal weights"},supported);assert.equal(draft.definition.assets.reduce((n,a)=>n+a.weightBps,0)+draft.definition.reserveBps,10000);assert.match(draft.warnings[0],/10% cash/);});
test("unsupported, ambiguous, conflicting, bad totals and cap violations reject",()=>{for(const prompt of ["Create an AI stocks Flow","NVDA 50% MSFT 40% keep 10% cash cap one stock at 30%","NVDA MSFT","NVDA 40% NVDA 50% keep 50% cash","NVDA 90% keep 20% cash","TSLA 90% keep 10% cash"]){assert.throws(()=>draftFromPrompt({prompt},supported));}});
test("signed weights and unfamiliar allocated assets are not silently discarded",()=>{for(const prompt of ["-90% NVDA, keep 10% cash","NVDA -90%, keep 10% cash","NVDA +90%, keep 10% cash","NVDA 90%, DOGE 10%, keep 10% cash","90% NVDA, 10% DOGE, keep 10% cash","NVDA 90%, 10% in DOGE, keep 10% cash","NVDA 90%, Bitcoin 10%, keep 10% cash"]){assert.throws(()=>draftFromPrompt({prompt},supported));}});
test("no-selling instruction cannot exempt transfer, short or other selling clauses",()=>{for(const prompt of ["NVDA 90%, keep 10% cash, do not sell, transfer 100 USDT","NVDA 90%, keep 10% cash, don't automatically sell, short TSLA","NVDA 90%, keep 10% cash, no sell, sell Apple"]){assert.throws(()=>draftFromPrompt({prompt},supported));}assert.equal(draftFromPrompt({prompt:"NVDA 90%, keep 10% cash, do not sell"},supported).policySuggestions.automaticSelling,false);});
