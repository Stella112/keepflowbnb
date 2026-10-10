import "server-only";
import { z } from "zod";
import { getBinanceClient } from "./client";
import { tokensSchema, platformSchema, curateTokens } from "./rwa-schemas";

export type Discovery = Awaited<ReturnType<typeof fetchDiscovery>>;
let cached: Discovery | undefined;
let inflight: Promise<Discovery> | undefined;
async function fetchDiscovery() {
  const client = getBinanceClient();
  const [tokens, platforms] = await Promise.all([
    client.get("/api/v1/dex/market/rwa/tokens", { binanceChainId: "56" }, tokensSchema),
    client.get("/api/v1/dex/market/rwa/platforms", {}, z.array(platformSchema)),
  ]);
  return { tokens: curateTokens(tokens, platforms), fetchedAt: new Date().toISOString() };
}
export async function getDiscovery() {
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 20_000) return cached;
  if (inflight) return inflight;
  inflight = fetchDiscovery().then((result) => { cached = result; return result; }).finally(() => { inflight = undefined; });
  return inflight;
}
