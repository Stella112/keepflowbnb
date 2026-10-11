import { z } from "zod";
import { addressSchema, decimalSchema, positiveDecimalSchema } from "./rwa-schemas.ts";

// Shapes taken from real 2026-10-11 responses (fixtures/api/rwa-price-nvda.json, candles-*, tx-detail-*, portfolio-*).
// Documented field tables differ from what the API returns; these parsers follow the observed responses.

/** GET /api/v1/dex/market/rwa/price — the query parameter is `tokenContractAddresses` (plural, comma-separated). */
export const rwaPriceSchema = z.array(z.object({
  binanceChainId: z.literal("56"), tokenContractAddress: addressSchema, platformId: z.string().min(1),
  tokenPrice: positiveDecimalSchema, referencePrice: positiveDecimalSchema, tokenPriceUpdatedAt: z.number().int().positive(),
}).passthrough()).max(20);
export type RwaPrice = z.infer<typeof rwaPriceSchema>[number];

/** GET /api/v1/dex/market/candles — rows are [open, high, low, close, volume, openTimeMs, tradeCount]; `bar` must be lowercase (1h, not 1H). */
export const candleBars = ["15m", "1h", "4h", "1d"] as const;
export const candlesSchema = z.array(z.tuple([
  z.number().positive(), z.number().positive(), z.number().positive(), z.number().positive(),
  z.number().nonnegative(), z.number().int().positive(),
]).rest(z.number())).max(300);
export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export function toCandles(rows: z.infer<typeof candlesSchema>): Candle[] {
  return rows.map(([open, high, low, close, volume, time]) => ({ time, open, high, low, close, volume }))
    .filter((row) => row.high >= row.low).sort((a, b) => a.time - b.time);
}

export type GapLeg = {
  provider: string; contract: string; tokenPrice: string; sharePrice: number;
  change24hPct: number | null; updatedAt: string; candles: Candle[]; lastTradeAt: string | null;
};
export type StockGap = {
  ticker: string; legs: GapLeg[]; marketOpen: boolean; nextOpenTime: number | null;
  crossSpreadPct: number | null; cheaper: string | null; fetchedAt: string;
};
const round = (value: number, places = 4) => Math.round(value * 10 ** places) / 10 ** places;

/**
 * Compares issuers per underlying share and reports each token's own on-chain 24h move.
 * The API's referencePrice is tokenPrice / tokenToShareRatio (observed 2026-10-11 for Ondo and bStocks),
 * not an independent exchange quote, so no "premium vs reference" is computed from it.
 * Per-share price divides by tokenToShareRatio so two issuers with different ratios compare fairly.
 */
export function buildGap(input: {
  ticker: string; fetchedAt: string;
  tokens: { platformId: string; tokenContractAddress: string; tokenToShareRatio: string; statusInfo: { openState: boolean; nextOpenTime: number | null } }[];
  prices: RwaPrice[]; candles: Record<string, Candle[]>;
}): StockGap {
  const legs: GapLeg[] = [];
  for (const token of input.tokens) {
    const price = input.prices.find((row) => row.tokenContractAddress.toLowerCase() === token.tokenContractAddress.toLowerCase());
    const ratio = Number(token.tokenToShareRatio);
    if (!price || price.platformId !== token.platformId || !(ratio > 0)) continue;
    const tokenPrice = Number(price.tokenPrice);
    const candles = input.candles[token.tokenContractAddress.toLowerCase()] ?? [];
    const last = candles[candles.length - 1], dayAgo = last ? [...candles].reverse().find((row) => row.time <= last.time - 86_400_000) : undefined;
    legs.push({
      provider: token.platformId, contract: token.tokenContractAddress.toLowerCase(),
      tokenPrice: price.tokenPrice, sharePrice: round(tokenPrice / ratio),
      change24hPct: last && dayAgo ? round((last.close / dayAgo.close - 1) * 100) : null,
      updatedAt: new Date(price.tokenPriceUpdatedAt).toISOString(), candles,
      lastTradeAt: candles.length ? new Date(candles[candles.length - 1].time).toISOString() : null,
    });
  }
  legs.sort((a, b) => a.provider.localeCompare(b.provider));
  let crossSpreadPct: number | null = null, cheaper: string | null = null;
  if (legs.length >= 2) {
    const [low, high] = [...legs].sort((a, b) => a.sharePrice - b.sharePrice);
    crossSpreadPct = round((high.sharePrice / low.sharePrice - 1) * 100);
    cheaper = low.provider;
  }
  const open = input.tokens.some((token) => token.statusInfo.openState);
  const nextOpen = input.tokens.map((token) => token.statusInfo.nextOpenTime).filter((value): value is number => value !== null).sort()[0] ?? null;
  return { ticker: input.ticker, legs, marketOpen: open, nextOpenTime: nextOpen, crossSpreadPct, cheaper, fetchedAt: input.fetchedAt };
}

/** GET /api/v1/dex/post-transaction/transaction-detail-by-txhash — returns an array; note `txhash`, `height`, `chainIndex`. */
const looseAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform((value) => value.toLowerCase());
export const txDetailSchema = z.array(z.object({
  chainIndex: z.literal("56"), txhash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((value) => value.toLowerCase()),
  height: z.string().regex(/^\d+$/), txTime: z.string().regex(/^\d+$/), txStatus: z.string(),
  txFee: decimalSchema, gasUsed: z.string().regex(/^\d+$/),
  tokenTransferDetails: z.array(z.object({ from: looseAddress, to: looseAddress, tokenContractAddress: looseAddress, symbol: z.string(), amount: decimalSchema }).passthrough()).max(500).nullable(),
}).passthrough()).max(1);
export type TxDetail = z.infer<typeof txDetailSchema>[number];

export type ReceiptCheck = { label: string; ok: boolean };
export type BinanceTxCheck = { status: "MATCHED" | "MISMATCH" | "NOT_INDEXED"; checks: ReceiptCheck[]; feeBnb: string | null; indexedAt: string | null };

const sameDecimal = (a: string, b: string) => {
  const norm = (value: string) => { const [whole, fraction = ""] = value.split("."); return `${BigInt(whole)}.${fraction.replace(/0+$/, "")}`; };
  return norm(a) === norm(b);
};
const sumTransfers = (rows: { amount: string }[], decimals: number) => rows.reduce((total, row) => {
  const [whole, fraction = ""] = row.amount.split(".");
  return total + BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction.slice(0, decimals)).padEnd(decimals, "0") || "0");
}, 0n);

/**
 * Independent second opinion on a receipt that KeepFlow already verified from the chain RPC.
 * It never changes the stored receipt; a mismatch is shown to the owner, not silently repaired.
 */
export function checkReceiptAgainstBinance(receipt: {
  hash: string; wallet: string; outcome: "CONFIRMED" | "REVERTED"; blockNumber: string;
  funding: string; stock: string; spentUnits: string; receivedUnits: string; fundingDecimals: number; stockDecimals: number;
}, rows: TxDetail[]): BinanceTxCheck {
  const detail = rows[0];
  if (!detail) return { status: "NOT_INDEXED", checks: [], feeBnb: null, indexedAt: null };
  const wallet = receipt.wallet.toLowerCase(), transfers = detail.tokenTransferDetails ?? [];
  const paid = transfers.filter((row) => row.from === wallet && row.tokenContractAddress === receipt.funding.toLowerCase());
  const got = transfers.filter((row) => row.to === wallet && row.tokenContractAddress === receipt.stock.toLowerCase());
  const confirmed = receipt.outcome === "CONFIRMED";
  const checks: ReceiptCheck[] = [
    { label: "Same transaction hash", ok: detail.txhash === receipt.hash.toLowerCase() },
    { label: confirmed ? "Binance reports success" : "Binance reports failure", ok: confirmed ? detail.txStatus === "success" : detail.txStatus !== "success" },
    { label: "Same block", ok: detail.height === receipt.blockNumber },
  ];
  if (confirmed) {
    checks.push(
      { label: "USDT left your wallet in the same amount", ok: paid.length > 0 && sumTransfers(paid, receipt.fundingDecimals) === BigInt(receipt.spentUnits) },
      { label: "Stock tokens arrived in the same amount", ok: got.length > 0 && sumTransfers(got, receipt.stockDecimals) === BigInt(receipt.receivedUnits) },
    );
  }
  return {
    status: checks.every((check) => check.ok) ? "MATCHED" : "MISMATCH", checks,
    feeBnb: sameDecimal(detail.txFee, "0") ? "0" : detail.txFee, indexedAt: new Date(Number(detail.txTime)).toISOString(),
  };
}

/** Address Portfolio: overview (timeFrame 4 = 90 days observed) and recent-pnl per token. */
export const portfolioOverviewSchema = z.object({
  realizedPnlUsd: z.string().regex(/^-?\d+(\.\d+)?$/), winRate: z.string().regex(/^\d+(\.\d+)?$/).nullable().optional(),
  buyTxCount: z.string().regex(/^\d+$/), sellTxCount: z.string().regex(/^\d+$/), totalTokenCount: z.string().regex(/^\d+$/),
  dailyPnl: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), pnlUsd: z.string().regex(/^-?\d+(\.\d+)?$/) })).max(400),
}).passthrough();
export const recentPnlSchema = z.object({
  cursor: z.string().nullable(),
  pnlList: z.array(z.object({
    binanceChainId: z.literal("56"), tokenContractAddress: looseAddress, tokenSymbol: z.string(),
    realizedPnlUsd: z.string().regex(/^-?\d+(\.\d+)?$/), tokenBalanceUsd: z.string().regex(/^-?\d+(\.\d+)?$/),
    tokenBalanceAmount: z.string().regex(/^-?\d+(\.\d+)?$/), buyTxCount: z.string().regex(/^\d+$/), lastActiveTimestamp: z.string().regex(/^\d+$/),
  }).passthrough()).max(100),
}).passthrough();
export type WalletPnl = {
  wallet: string; realizedPnlUsd: string; buys: number; sells: number; last30dPnlUsd: string;
  stocks: { ticker: string; symbol: string; contract: string; balance: string; valueUsd: string; realizedPnlUsd: string; lastActiveAt: string }[];
  otherTokens: number; fetchedAt: string;
};
const money = (value: number) => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2);

/** Keeps only tokenized stocks KeepFlow knows (by contract), so unrelated tokens never appear as holdings. */
export function buildWalletPnl(wallet: string, overview: z.infer<typeof portfolioOverviewSchema>, recent: z.infer<typeof recentPnlSchema>,
  known: { tokenContractAddress: string; underlyingTicker: string }[], fetchedAt: string): WalletPnl {
  const byContract = new Map(known.map((token) => [token.tokenContractAddress.toLowerCase(), token.underlyingTicker]));
  const stocks = recent.pnlList.filter((row) => byContract.has(row.tokenContractAddress)).map((row) => ({
    ticker: byContract.get(row.tokenContractAddress)!, symbol: row.tokenSymbol, contract: row.tokenContractAddress,
    balance: row.tokenBalanceAmount, valueUsd: money(Number(row.tokenBalanceUsd)), realizedPnlUsd: money(Number(row.realizedPnlUsd)),
    lastActiveAt: new Date(Number(row.lastActiveTimestamp)).toISOString(),
  }));
  const last30 = [...overview.dailyPnl].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).reduce((total, day) => total + Number(day.pnlUsd), 0);
  return {
    wallet: wallet.toLowerCase(), realizedPnlUsd: money(Number(overview.realizedPnlUsd)), buys: Number(overview.buyTxCount), sells: Number(overview.sellTxCount),
    last30dPnlUsd: money(last30), stocks, otherTokens: recent.pnlList.length - stocks.length, fetchedAt,
  };
}
