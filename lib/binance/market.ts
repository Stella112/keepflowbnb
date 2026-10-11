import "server-only";
import { z } from "zod";
import { getBinanceClient } from "./client";
import { getDiscovery } from "./rwa";
import { curatedTickers } from "./rwa-schemas";
import {
  rwaPriceSchema, candlesSchema, toCandles, buildGap, txDetailSchema, checkReceiptAgainstBinance,
  portfolioOverviewSchema, recentPnlSchema, buildWalletPnl, type Candle, type StockGap, type BinanceTxCheck, type WalletPnl,
} from "./market-schemas";

const gapCache = new Map<string, StockGap>();

/** RWA Data price + Market API candles for every issuer of one underlying. */
export async function getStockGap(ticker: unknown): Promise<StockGap> {
  const checked = z.enum(curatedTickers).parse(ticker);
  const cached = gapCache.get(checked);
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 30_000) return cached;
  const tokens = (await getDiscovery()).tokens.filter((token) => token.underlyingTicker === checked);
  if (!tokens.length || tokens.length > 4) throw Error("REPRESENTATION_UNAVAILABLE");
  const client = getBinanceClient();
  const contracts = tokens.map((token) => token.tokenContractAddress.toLowerCase());
  const [prices, ...series] = await Promise.all([
    client.get("/api/v1/dex/market/rwa/price", { binanceChainId: "56", tokenContractAddresses: contracts.join(",") }, rwaPriceSchema),
    ...contracts.map((contract) => client.get("/api/v1/dex/market/candles", { binanceChainId: "56", tokenContractAddress: contract, bar: "1h", limit: "72" }, candlesSchema)
      .then(toCandles).catch((): Candle[] => [])),
  ]);
  const gap = buildGap({ ticker: checked, fetchedAt: new Date().toISOString(), tokens, prices, candles: Object.fromEntries(contracts.map((contract, index) => [contract, series[index]])) });
  if (!gap.legs.length) throw Error("PRICE_UNAVAILABLE");
  gapCache.set(checked, gap);
  return gap;
}

/** Transaction API detail as an independent check of a receipt already verified from the chain. */
export async function getBinanceTxCheck(receipt: Parameters<typeof checkReceiptAgainstBinance>[0]): Promise<BinanceTxCheck | null> {
  try {
    const rows = await getBinanceClient().get("/api/v1/dex/post-transaction/transaction-detail-by-txhash", { binanceChainId: "56", txHash: receipt.hash }, txDetailSchema);
    return checkReceiptAgainstBinance(receipt, rows);
  } catch { return null; }
}

/** Address Portfolio overview + recent PnL, filtered to tokenized stocks KeepFlow lists. */
export async function getWalletPnl(wallet: unknown): Promise<WalletPnl> {
  const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/).parse(wallet).toLowerCase();
  const client = getBinanceClient();
  const [overview, recent, discovery] = await Promise.all([
    client.get("/api/v1/dex/market/portfolio/overview", { binanceChainId: "56", walletAddress: address, timeFrame: "4" }, portfolioOverviewSchema),
    client.get("/api/v1/dex/market/portfolio/recent-pnl", { binanceChainId: "56", walletAddress: address, limit: "20" }, recentPnlSchema),
    getDiscovery(),
  ]);
  return buildWalletPnl(address, overview, recent, discovery.tokens, new Date().toISOString());
}
