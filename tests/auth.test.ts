import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { buildReadUrl, signRequest } from "../lib/binance/auth.ts";
test("signs the exact encoded path, method and raw body", () => {
  const time="2026-10-05T00:00:00.000Z";
  const url=buildReadUrl("https://web3.binance.com/build","/api/v1/dex/market/rwa/search",{keyword:"NVDA & test"});
  assert.equal(url.pathname+url.search,"/build/api/v1/dex/market/rwa/search?keyword=NVDA%20%26%20test");
  const prehash=time+"GET"+url.pathname+url.search;
  assert.equal(signRequest("test-only-secret",time,"get",url.pathname+url.search),createHmac("sha256","test-only-secret").update(prehash).digest("base64"));
  assert.notEqual(signRequest("test-only-secret",time,"POST",url.pathname,'{"a":1}'),signRequest("test-only-secret",time,"POST",url.pathname,'{ "a":1}'));
});
test("rejects credentials being sent to another host and missing signed prefix", () => {
  assert.throws(()=>buildReadUrl("https://example.com/build","/api/v1/test"));
  assert.throws(()=>buildReadUrl("https://web3.binance.com/build","/api/v1/test?x=1"));
  assert.throws(()=>signRequest("test-only-secret","time","GET","/api/v1/test"));
});
