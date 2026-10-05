import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { buildReadUrl, signRequest } from "../lib/binance/auth.ts";
const key = process.env.BINANCE_WEB3_API_KEY;
const secret = process.env.BINANCE_WEB3_API_SECRET;
if (!key || !secret) throw new Error("Missing credentials");
const envelope = z.object({ code: z.number().int(), msg: z.string(), data: z.unknown().optional(), timestamp: z.number().int().optional(), success: z.boolean().optional() });
const jobs: {path: string; query: Record<string,string>; name: string}[] = [
  {path: "/api/v1/dex/balance/supported/chain", query: {binanceChainId: "56"}, name: "wallet-supported-chains"},
  {path: "/api/v1/dex/market/rwa/platforms", query: {}, name: "rwa-platforms"},
  {path: "/api/v1/dex/market/rwa/search", query: {keyword: "NVDA"}, name: "rwa-search-nvda"},
];
await mkdir("fixtures/api", {recursive:true}); await mkdir("logs", {recursive:true});
for (const job of jobs) {
  const url = buildReadUrl(process.env.BINANCE_WEB3_BASE_URL ?? "", job.path, job.query);
  const timestamp = new Date().toISOString(); const start = performance.now();
  try {
    const response = await fetch(url, {redirect:"manual", signal:AbortSignal.timeout(15000), headers:{"X-OC-APIKEY":key,"X-OC-TIMESTAMP":timestamp,"X-OC-SIGN":signRequest(secret,timestamp,"GET",url.pathname+url.search),"X-OC-NONCE":randomUUID(),Accept:"application/json"}});
    const raw = (await response.text()).replaceAll(key,"[REDACTED]").replaceAll(secret,"[REDACTED]");
    await writeFile(`fixtures/api/${job.name}.json`,raw);
    let value: unknown; try {value=JSON.parse(raw);} catch {value=null;}
    const parsed=envelope.safeParse(value);
    const log={timestamp,module:"verification",endpoint:job.path,httpStatus:response.status,businessCode:parsed.success?parsed.data.code:null,latencyMs:Math.round(performance.now()-start),retryCount:0,schemaValidation:parsed.success?"ENVELOPE_VALID":"ENVELOPE_MISMATCH",note:"Read-only probe; payload schema pending fixture inspection"};
    await appendFile("logs/dx.jsonl",JSON.stringify(log)+"\n"); console.log(JSON.stringify(log));
    if(!response.ok || !parsed.success || parsed.data.code!==0 || parsed.data.success===false){process.exitCode=1;break;}
  } catch {
    const log={timestamp,module:"verification",endpoint:job.path,httpStatus:null,latencyMs:Math.round(performance.now()-start),retryCount:0,schemaValidation:"NO_RESPONSE",note:"Network failure; no retry"};
    await appendFile("logs/dx.jsonl",JSON.stringify(log)+"\n");console.log(JSON.stringify(log));process.exitCode=1;break;
  }
}
