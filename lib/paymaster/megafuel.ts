import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

// Internal read-only adapter. Never expose policy/context inputs directly to a client.
export const MEGAFUEL_ENDPOINT = "https://bsc-megafuel.nodereal.io/";
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const quantity = z.string().regex(/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/).max(66);
const transactionSchema = z.object({ from: address, to: address, value: z.literal("0x0"), data: z.string().regex(/^0x[0-9a-fA-F]{8}(?:[0-9a-fA-F]{2})*$/).max(20002), gas: quantity }).strict();
type Transaction = z.infer<typeof transactionSchema>;
const contextSchema = z.object({ chainId: z.literal(56), wallet: address, allowedRoutes: z.array(address).min(1).max(32), allowedSelectors: z.array(z.string().regex(/^0x[0-9a-fA-F]{8}$/)).min(1).max(32), maxGas: z.number().int().positive().max(1000000), amountUsdtMicros: z.string().regex(/^\d+$/).max(8), policyAllowed: z.literal(true), quoteAt: z.number().int(), simulation: z.object({ status: z.literal("SUCCESS"), checkedAt: z.number().int(), transactionFingerprint: z.string().regex(/^[a-f0-9]{64}$/) }).strict() }).strict();
export type SponsorabilityContext = z.infer<typeof contextSchema>;
export type SponsorabilityResult = { status: "DISABLED" | "BLOCKED" | "ELIGIBLE" | "INELIGIBLE" | "UNAVAILABLE"; code: string; sponsorName?: string; checkedAt: number; executionEnabled: false };

export function transactionFingerprint(input: unknown): string {
 const tx = transactionSchema.parse(input);
 return createHash("sha256").update(JSON.stringify([tx.from.toLowerCase(), tx.to.toLowerCase(), tx.value, tx.data.toLowerCase(), tx.gas.toLowerCase()])).digest("hex");
}

async function boundedJson(response: Response): Promise<unknown> {
 if (!response.ok || !response.body) throw new Error("Provider unavailable");
 const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
 try { while (true) { const item = await reader.read(); if (item.done) break; length += item.value.length; if (length > 16384) throw new Error("Provider response too large"); chunks.push(item.value); } }
 finally { await reader.cancel().catch(() => {}); }
 return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function checkMegaFuelSponsorability(input: unknown, trustedContext: unknown, options: { enabled?: boolean; now?: number; fetcher?: typeof fetch } = {}): Promise<SponsorabilityResult> {
 const now = options.now ?? Date.now();
 const result = (status: SponsorabilityResult["status"], code: string): SponsorabilityResult => ({ status, code, checkedAt: now, executionEnabled: false });
 if (!(options.enabled ?? process.env.PAYMASTER_ENABLED === "true")) return result("DISABLED", "PAYMASTER_DISABLED");
 if (!Number.isFinite(now)) return result("BLOCKED", "INVALID_CHECK_TIME");
 const parsedTx = transactionSchema.safeParse(input); const parsedContext = contextSchema.safeParse(trustedContext);
 if (!parsedTx.success || !parsedContext.success) return result("BLOCKED", "INVALID_TRUSTED_INPUT");
 const tx: Transaction = parsedTx.data; const context = parsedContext.data;
 if (tx.from.toLowerCase() !== context.wallet.toLowerCase() || !context.allowedRoutes.some(route => route.toLowerCase() === tx.to.toLowerCase()) || !context.allowedSelectors.some(selector => selector.toLowerCase() === tx.data.slice(0,10).toLowerCase())) return result("BLOCKED", "ROUTE_NOT_PERMITTED");
 if (BigInt(tx.gas) === 0n || BigInt(tx.gas) > BigInt(context.maxGas) || BigInt(context.amountUsdtMicros) <= 0n || BigInt(context.amountUsdtMicros) > 5000000n) return result("BLOCKED", "SPONSOR_BUDGET_EXCEEDED");
 if (context.quoteAt > now || now - context.quoteAt > 15000 || context.simulation.checkedAt > now || now - context.simulation.checkedAt > 30000 || context.simulation.transactionFingerprint !== transactionFingerprint(tx)) return result("BLOCKED", "STALE_OR_MISMATCHED_SIMULATION");
 const id = randomUUID(); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
 try {
  const response = await (options.fetcher ?? fetch)(MEGAFUEL_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "KeepFlow/read-only-sponsorability" }, redirect: "error", signal: controller.signal, body: JSON.stringify({ jsonrpc: "2.0", id, method: "pm_isSponsorable", params: [tx] }) });
  const envelope = z.object({ jsonrpc: z.literal("2.0"), id: z.literal(id), result: z.object({ Sponsorable: z.boolean(), SponsorName: z.string().max(128), SponsorIcon: z.string().max(2048), SponsorWebsite: z.string().max(2048) }).strict() }).strict().parse(await boundedJson(response));
  if (envelope.result.Sponsorable && !envelope.result.SponsorName.trim()) return result("UNAVAILABLE", "INVALID_SPONSOR_IDENTITY");
  return { ...result(envelope.result.Sponsorable ? "ELIGIBLE" : "INELIGIBLE", envelope.result.Sponsorable ? "PROVIDER_ELIGIBILITY_ONLY" : "NO_SPONSOR_POLICY"), sponsorName: envelope.result.SponsorName };
 } catch { return result("UNAVAILABLE", "PROVIDER_RESPONSE_UNVERIFIED"); }
 finally { clearTimeout(timer); }
}
