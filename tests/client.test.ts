import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { BinanceApiError, createReadClient, type RequestMetric } from "../lib/binance/client-core.ts";

const config = { baseUrl: "https://web3.binance.com/build", apiKey: "test-only-key", apiSecret: "test-only-secret" };
const path = "/api/v1/dex/balance/supported/chain";
const schema = z.array(z.object({ chain: z.string() })); // Test-only payload, never a production API schema.
const success = () => Response.json({ code: 0, msg: "success", success: true, data: [{ chain: "56" }] });
const isError = (code: string) => (error: unknown) => error instanceof BinanceApiError && error.code === code;

test("simulation POST signs exact JSON body, cannot broadcast, and never retries",async()=>{
  let calls=0; const tx={from:"0x"+"1".repeat(40),to:"0x"+"2".repeat(40),value:"0",data:"0x"};
  const client=createReadClient(config,{now:()=>Date.parse("2026-10-06T00:00:00.000Z"),fetch:async(input,init)=>{
    calls++;assert.equal(String(input),config.baseUrl+"/api/v1/dex/pre-transaction/simulate");assert.equal(init?.method,"POST");
    const body=JSON.stringify({binanceChainId:"56",evmTx:tx});assert.equal(init?.body,body);
    const expected=createHmac("sha256",config.apiSecret).update("2026-10-06T00:00:00.000ZPOST/build/api/v1/dex/pre-transaction/simulate"+body).digest("base64");
    assert.equal(new Headers(init?.headers).get("X-OC-SIGN"),expected);
    return Response.json({code:50000,msg:"unavailable"},{status:503});
  }});
  await assert.rejects(client.simulate(tx,z.unknown()),isError("SERVICE_UNAVAILABLE"));assert.equal(calls,1);assert.equal("post" in client,false);
});

test("signs exact wire bytes and does not follow redirects", async () => {
  const client = createReadClient(config, { now: () => Date.parse("2026-10-06T00:00:00.000Z"), nonce: () => "nonce-test", fetch: async (input, init) => {
    assert.equal(String(input), "https://web3.binance.com/build" + path + "?keyword=NVDA%20%26%20test");
    assert.equal(init?.method, "GET"); assert.equal(init?.redirect, "manual"); assert.equal(init?.cache, "no-store");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-OC-APIKEY"), config.apiKey);
    assert.equal(headers.get("X-OC-NONCE"), "nonce-test");
    assert.equal(headers.get("X-OC-SIGN"), createHmac("sha256", config.apiSecret).update("2026-10-06T00:00:00.000ZGET/build" + path + "?keyword=NVDA%20%26%20test").digest("base64"));
    return success();
  }});
  assert.deepEqual(await client.get(path, { keyword: "NVDA & test" }, schema), [{ chain: "56" }]);
});

test("invalid host and path cannot send credentials", async () => {
  let calls = 0;
  const transport: typeof fetch = async () => { calls++; return success(); };
  assert.throws(() => createReadClient({ ...config, baseUrl: "https://example.com/build" }, { fetch: transport }), isError("CONFIGURATION"));
  const client = createReadClient(config, { fetch: transport });
  await assert.rejects(client.get("/api/v1/test?redirect=1", {}, schema), isError("CONFIGURATION"));
  assert.equal(calls, 0);
});

test("real compliance fixture fails closed even with HTTP 200; no retry", async () => {
  const fixture = readFileSync(new URL("../fixtures/api/vps-wallet-supported-chains.json", import.meta.url), "utf8");
  let calls = 0;
  const client = createReadClient(config, { fetch: async () => { calls++; return new Response(fixture); } });
  await assert.rejects(client.get(path, {}, schema), isError("COMPLIANCE_RESTRICTED"));
  assert.equal(calls, 1);
});

test("false success, nonnumeric codes, malformed data, HTML and redirects all fail closed", async () => {
  for (const [response, code] of [
    [Response.json({ code: 0, msg: "failed", success: false, data: [{ chain: "56" }] }), "API_ERROR"],
    [Response.json({ code: "0", msg: "success", data: [] }), "INVALID_RESPONSE"],
    [Response.json({ code: 0, msg: "success", data: [{ chain: 56 }] }), "INVALID_RESPONSE"],
    [new Response("<html>challenge</html>"), "INVALID_RESPONSE"],
    [new Response(null, { status: 302, headers: { Location: "https://example.com" } }), "INVALID_RESPONSE"],
  ] as const) {
    let calls = 0;
    const client = createReadClient(config, { fetch: async () => { calls++; return response; } });
    await assert.rejects(client.get(path, {}, schema), isError(code));
    assert.equal(calls, 1);
  }
});

test("documented rate limit respects Retry-After, refreshes nonce, and retries once", async () => {
  let calls = 0; let nonce = 0;
  const nonces: (string | null)[] = []; const sleeps: number[] = []; const metrics: RequestMetric[] = [];
  const client = createReadClient(config, { nonce: () => String(++nonce), log: (metric) => { metrics.push(metric); }, sleep: async (ms) => { sleeps.push(ms); }, fetch: async (_input, init) => {
    nonces.push(new Headers(init?.headers).get("X-OC-NONCE"));
    return calls++ === 0 ? Response.json({ code: 42900, msg: "busy" }, { status: 429, headers: { "Retry-After": "1" } }) : success();
  }});
  await client.get(path, {}, schema);
  assert.equal(calls, 2); assert.deepEqual(sleeps, [1000]); assert.deepEqual(nonces, ["1", "2"]);
  assert.deepEqual(metrics.map((metric) => metric.retryCount), [0, 1]);
});

test("long Retry-After and authentication errors never retry", async () => {
  for (const response of [
    Response.json({ code: 42900, msg: "busy" }, { status: 429, headers: { "Retry-After": "60" } }),
    Response.json({ code: 40102, msg: "invalid signature" }, { status: 401 }),
  ]) {
    let calls = 0;
    const client = createReadClient(config, { fetch: async () => { calls++; return response; }, sleep: async () => assert.fail("must not sleep") });
    await assert.rejects(client.get(path, {}, schema), BinanceApiError);
    assert.equal(calls, 1);
  }
});

test("repeated service failure stops after two calls", async () => {
  let calls = 0;
  const client = createReadClient(config, { sleep: async () => {}, fetch: async () => { calls++; return Response.json({ code: 50001, msg: "unavailable" }, { status: 503 }); } });
  await assert.rejects(client.get(path, {}, schema), isError("SERVICE_UNAVAILABLE"));
  assert.equal(calls, 2);
});

test("network failures and logs do not expose credentials or upstream messages", async () => {
  const metrics: RequestMetric[] = [];
  const client = createReadClient(config, { log: (metric) => { metrics.push(metric); }, fetch: async () => { throw new Error(config.apiSecret); } });
  await assert.rejects(client.get(path, {}, schema), (error: unknown) => {
    assert.ok(error instanceof BinanceApiError); assert.equal(error.code, "NETWORK");
    assert.ok(!error.message.includes(config.apiSecret)); return true;
  });
  assert.equal(metrics.length, 1); assert.ok(!JSON.stringify(metrics).includes(config.apiKey));
  assert.ok(!JSON.stringify(metrics).includes(config.apiSecret));
});

test("logging failure cannot turn a valid read into a retry", async () => {
  let calls = 0;
  const client = createReadClient(config, { log: () => { throw new Error("disk full"); }, fetch: async () => { calls++; return success(); } });
  await client.get(path, {}, schema); assert.equal(calls, 1);
});

test("oversized declared body is cancelled before reading and never retried", async () => {
  let calls = 0; let pulls = 0; let cancelled = false;
  const metrics: RequestMetric[] = [];
  const stream = new ReadableStream<Uint8Array>({
    pull() { pulls++; }, cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const client = createReadClient(config, { log: (metric) => { metrics.push(metric); }, fetch: async () => {
    calls++; return new Response(stream, { headers: { "Content-Length": "2000001" } });
  }});
  await assert.rejects(client.get(path, {}, schema), isError("INVALID_RESPONSE"));
  assert.equal(calls, 1); assert.equal(pulls, 0); assert.equal(cancelled, true);
  assert.equal(metrics[0].schemaValidation, "ENVELOPE_INVALID");
});

test("stream overflow counts bytes, cancels immediately despite misleading length, and never retries", async () => {
  for (const headers of [new Headers(), new Headers({ "Content-Length": "1" })]) {
    let calls = 0; let pulls = 0; let cancelled = false;
    // Each multibyte character is three bytes: character-count checks would miss this overflow.
    const chunk = new TextEncoder().encode("€".repeat(400_000));
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { pulls++; controller.enqueue(chunk); },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    const client = createReadClient(config, { fetch: async () => { calls++; return new Response(stream, { headers }); } });
    await assert.rejects(client.get(path, {}, schema), isError("INVALID_RESPONSE"));
    assert.equal(calls, 1); assert.equal(pulls, 2); assert.equal(cancelled, true);
  }
});

test("bounded stream decoding handles split UTF-8 and malformed JSON without retry", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ code: 0, msg: "€", data: [{ chain: "56" }] }));
  const start = bytes.indexOf(0xe2);
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(bytes.slice(0, start + 1)); controller.enqueue(bytes.slice(start + 1)); controller.close();
  }});
  const client = createReadClient(config, { fetch: async () => new Response(stream) });
  assert.deepEqual(await client.get(path, {}, schema), [{ chain: "56" }]);
  let calls = 0;
  const malformed = createReadClient(config, { fetch: async () => { calls++; return new Response("{broken"); } });
  await assert.rejects(malformed.get(path, {}, schema), isError("INVALID_RESPONSE"));
  assert.equal(calls, 1);
});

test("stream failure remains a sanitized network error without retry", async () => {
  let calls = 0;
  const stream = new ReadableStream<Uint8Array>({ pull(controller) { controller.error(new Error(config.apiSecret)); } });
  const client = createReadClient(config, { fetch: async () => { calls++; return new Response(stream); } });
  await assert.rejects(client.get(path, {}, schema), (error: unknown) => {
    assert.ok(error instanceof BinanceApiError); assert.equal(error.code, "NETWORK");
    assert.ok(!error.message.includes(config.apiSecret)); return true;
  });
  assert.equal(calls, 1);
});
