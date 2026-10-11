import { z } from "zod";

// Official RWA reference + real 2026-10-06 fixtures. Null marketStatus is observed for bStocks.
export const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
export const decimalSchema = z.string().regex(/^\d+(\.\d+)?$/).max(120);
export const positiveDecimalSchema = decimalSchema.refine((value) => /[1-9]/.test(value), "Must be positive");
export const decimalsSchema = z.string().regex(/^\d{1,3}$/).refine((value) => Number(value) <= 255);
export const platformSchema = z.object({
  platformId: z.string().min(1), tickerCount: z.number().int().nonnegative(),
  chainDistribution: z.array(z.object({ binanceChainId: z.string(), tokenCount: z.number().int().nonnegative() })),
  website: z.string().url().nullable(), logoUrl: z.string().url().nullable(),
});
export const searchSchema = z.array(z.object({
  ticker: z.string().min(1), companyName: z.string().min(1), assets: z.array(z.object({
    platformId: z.string().min(1), binanceChainId: z.string(), tokenContractAddress: z.string().min(1),
    tokenSymbol: z.string().min(1), assetType: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })),
}));
export const statusSchema = z.object({
  openState: z.boolean(), marketStatus: z.string().nullable(), reasonCode: z.string().nullable(),
  reasonMsg: z.string().nullable(), nextOpenTime: z.number().int().nonnegative().nullable(),
  nextCloseTime: z.number().int().nonnegative().nullable(),
});
export const tokenSchema = z.object({
  binanceChainId: z.string(), tokenContractAddress: addressSchema, platformId: z.string().min(1),
  assetType: z.number().int().nullable(),
  tokenName: z.string().min(1), tokenSymbol: z.string().min(1), tokenLogoUrl: z.string().url(),
  decimals: decimalsSchema, underlyingTicker: z.string().min(1), underlyingName: z.string().min(1).nullable(),
  tokenToShareRatio: positiveDecimalSchema, statusInfo: statusSchema,
  tokenPrice: decimalSchema, referencePrice: decimalSchema,
});
export const tokensSchema = z.array(tokenSchema);
export type RwaToken = z.infer<typeof tokenSchema>;

export const curatedTickers = ["NVDA", "AAPL", "MSFT", "GOOGL", "META", "AMZN", "TSLA", "SPY"] as const;

export function curateTokens(tokens: RwaToken[], providers: z.infer<typeof platformSchema>[]) {
  const allowed = new Set(providers.filter((provider) => provider.chainDistribution.some((chain) => chain.binanceChainId === "56" && chain.tokenCount > 0)).map((provider) => provider.platformId));
  const unique = new Set<string>();
  return tokens.filter((token) => {
    const key = token.tokenContractAddress.toLowerCase();
    if (token.binanceChainId !== "56" || !allowed.has(token.platformId) || ![1, 3].includes(token.assetType ?? -1) || !token.underlyingName || !curatedTickers.some((ticker) => ticker === token.underlyingTicker) || unique.has(key)) return false;
    unique.add(key); return true;
  });
}

export function marketLabel(token: RwaToken): string {
  const labels: Record<string, string> = { regular: "Regular session", premarket: "Pre-market session", postmarket: "Post-market session", overnight: "Overnight session", closed: "Market closed", pause: "Trading paused", paused: "Trading paused" };
  // bStocks report no session (null); say what we do know: whether the token trades on-chain right now.
  if (!token.statusInfo.marketStatus) return token.statusInfo.openState ? "Trading on-chain now" : "On-chain trading paused";
  return labels[token.statusInfo.marketStatus] ?? "Market status unavailable";
}
