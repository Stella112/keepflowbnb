import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { platformSchema, searchSchema, tokensSchema, curateTokens, marketLabel } from "../lib/binance/rwa-schemas.ts";
const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(`../fixtures/api/${name}.json`, import.meta.url), "utf8"));
const envelope = z.object({ code: z.literal(0), success: z.literal(true), data: z.unknown() });
const providers = z.array(platformSchema).parse(envelope.parse(fixture("rwa-platforms")).data);
const tokens = tokensSchema.parse(envelope.parse(fixture("rwa-bsc-tech")).data);
test("live search and token fixtures validate; NVIDIA has two BSC providers", () => {
  const search = searchSchema.parse(envelope.parse(fixture("rwa-search-nvda")).data);
  assert.equal(search[0].ticker, "NVDA");
  const nvda = curateTokens(tokens, providers).filter((token) => token.underlyingTicker === "NVDA");
  assert.deepEqual(nvda.map((token) => token.platformId).sort(), ["bstock", "ondo"]);
  assert.equal(marketLabel(nvda.find((token) => token.platformId === "bstock")!), "Market status unavailable");
});
test("unknown providers, other chains, pre-IPO and duplicate assets are excluded", () => {
  const token = tokens.find((entry) => entry.underlyingTicker === "NVDA")!;
  assert.equal(curateTokens([token, token, { ...token, platformId: "unverified" }, { ...token, binanceChainId: "1" }, { ...token, assetType: 2 }], providers).length, 1);
});
test("malformed decimals, address and ratio fail closed; unknown market status is unavailable", () => {
  const token = tokens.find((entry) => entry.underlyingTicker === "NVDA")!;
  for (const field of [{ decimals: "256" }, { decimals: 18 }, { tokenContractAddress: "0x123" }, { tokenToShareRatio: "0" }, { tokenPrice: "NaN" }]) assert.equal(tokensSchema.safeParse([{ ...token, ...field }]).success, false);
  assert.equal(marketLabel({ ...token, statusInfo: { ...token.statusInfo, marketStatus: "future-value" } }), "Market status unavailable");
});
