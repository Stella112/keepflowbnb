# Developer Experience Report — evidence notes

Raw, verifiable facts collected while building KeepFlow, grouped by the report's sections. These are notes to write the report from, not the report itself: the organisers reject AI-written reports, so put it in your own words and add what you personally experienced (marked **You:**).

Evidence lives in this repo: `fixtures/api/*.json` (real responses), `docs/API_VERIFICATION.md`, `docs/DEVEX_RAW.md`, `docs/PAYMASTER_VERIFICATION.md`, and the app's request log (98 signed calls, 5–11 Oct 2026).

---

## 1. Onboarding — time to first successful call

- 4 Oct: started reading docs. 5 Oct 12:42 UTC: first signed call (`GET /dex/balance/supported/chain`) → HTTP **200** but business code **40304** "Service not available due to compliance restriction", 1948 ms.
- Same 40304 from a second server (OwnPay VPS, 401 ms). With VPN off, `web3.binance.com` failed DNS (ENOTFOUND) on the home network.
- **First success: 5 Oct 23:54 UTC** from the Lightsail VPS (code 0, 324 ms) — about **1.5 days** after opening the docs, almost all of it spent on 40304 and DNS, not on signing.
- Signing itself worked first time once a permitted host was used. The docs' warning that the signed path must include `/build` was accurate and useful.
- 40304 comes back with **HTTP 200** and **no `data` field**, and the message gives no reason (region? VPN? account? IP reputation?). On 11 Oct a VPN on the dev PC triggered it again; turning the VPN off fixed it.
- **You:** how long the Developer Portal sign-up/API-key step took, and whether anything there was unclear.

## 2. Documentation issues (page + where)

- **Authentication page** (`/en/dev-docs/authentication`): on 4 Oct the HTML redirected to `binance.com/en-GB`, the `.md` version was unreachable, and direct downloads (incl. `llms-full.txt`) returned **zero-byte files**. Readable again on 5 Oct.
- **RWA Data page**: routes described as RFQ-only returned real **SWAP / LiquidMesh** candidates and buildable swaps. The token-list `tabId` filter (e.g. 9) still returned the broad list. Some rows have null `assetType`/`underlyingName`. bStocks `marketStatus` is `null`. Status spelling differs from the reference ("pause" vs "paused").
- **RWA "reference price"**: `referencePrice` equals `tokenPrice / tokenToShareRatio` for both Ondo and bStocks (checked 11 Oct, NVDA). It is not an independent exchange quote, so it cannot be used to measure the on-chain vs real-stock gap the hackathon brief describes. The same holds for `underlying-market.marketData.referencePrice`. (Fixture: `rwa-price-nvda.json`.)
- **RWA price endpoint**: the parameter is `tokenContractAddresses` (plural, comma-separated). The singular form returns `40001 Parameter tokenContractAddresses is required`.
- **Market API candles**: `bar=1H` is rejected (`40001 … valid values: 12h,15m,1M,1d,1h,1m,1s,1w,2h,30m,30s,3d,3m,4h,5m,5s,6h,8h`). Lowercase only. Rows are unlabeled arrays `[o,h,l,c,vol,ts,count]`. (Fixture: `candles-bar-uppercase-error.json`.)
- **Transaction API detail-by-hash**: returns an **array**, with keys `txhash`, `height`, `chainIndex`. The rest of the API uses `binanceChainId`. (Fixture: `tx-detail-nvda-buy.json`.)
- **Agentic Wallet — Skills reference page** (`/products/agentic-wallet/reference/skills`): lists skill categories but **no command names or flags**. Real usage needed the Skills Hub repo files (`references/market-order.md`, `x402-payment.md`, `authentication.md`).
- **Tokenized securities use case page**: says the `binance-tokenized-securities-info` skill is *required* for ticker resolution and status. We did the same with the RWA Data API instead, and it worked. The page doesn't say an API alternative exists.
- **`baw wallet left-quota --json` output** (`quotaUsed, quotaLeft, dailyLimit, date`) is not documented. We read it from the package's `dist`.
- **Paymaster docs disagree on the RPC method**: NodeReal SDKs use `pm_isSponsorable`, the older NodeReal guide says `pm_sponsorable`, and the BNB wallet guide says `gm_sponsorable`. Response field names also differ. Binance Wallet is not in BNB's list of Paymaster-integrated wallets (Bitget is).

## 3. API pitfalls

- **Wallet API** `all-token-balances-by-address` returned `{"tokenAssets":[]}` with **code 0** for a wallet holding **24,493 NVDAon** (and for others). Address Portfolio `recent-pnl` showed the same holdings correctly, so we used that. (Fixture: `wallet-balances-empty-holder.json`.) Silent empty success is the worst failure mode: nothing tells you it's wrong.
- **Business code vs HTTP status**: errors such as 40304, 40001 and 40375 arrive as HTTP 200. Simulation returns code 0 with `status: FAILED` inside. You must check three layers (HTTP, `code`, payload status).
- **Ondo minimum**: a 5 USDT quote failed with **40375** (below Ondo's 5 USD minimum after fees). 10 USDT worked. bStocks accepted small amounts.
- **Rate limit**: two 42900 responses during normal page loads (RWA price, underlying-profile). They recovered on one retry with `Retry-After`.
- **Large decimals**: token prices arrive with more than 18 fractional digits (e.g. `231.587420708732692695509314201104`), so fixed-18-decimal maths broke our first paper buy.
- **Error responses omit `data`** entirely, so schemas must allow it to be missing.
- **Latency** (request log, p50 / p90 / max, ms):

| Endpoint | n | p50 | p90 | max |
|---|---|---|---|---|
| rwa/tokens | 24 | 2156 | 2751 | 3222 |
| rwa/platforms | 25 | 1470 | 2014 | 3246 |
| market/candles | 10 | 821 | 2170 | 2170 |
| rwa/price | 6 | 783 | 2087 | 2087 |
| rwa/underlying-profile | 9 | 742 | 2105 | 2105 |
| rwa/underlying-market | 8 | 675 | 1886 | 1886 |
| aggregator/quote | 5 | 352 | 572 | 572 |
| aggregator/swap | 2 | 325 | — | 325 |
| aggregator/approve-transaction | 2 | 294 | — | 294 |
| pre-transaction/simulate | 2 | 340 | — | 340 |

`rwa/tokens` (needed on every page) is the slowest call by far. Trading and Transaction calls are fast.

## 4. AI stack feedback (Agentic Wallet, Wallet Skills, CLI)

- Used the **`baw` CLI 1.10.0** directly: `wallet status/address/left-quota`, `market-order quote/swap/list`, `x402-payment preview/sign`, `auth signin/verify`.
- **What worked**: QR sign-in with a pairing code confirmed in the Binance app; `--json` on every command; the daily limit set in the app is enforced by Binance, which is a strong safety story; `market-order swap --mev true`.
- **Multi-user friction**:
  - The session goes to the OS keychain under a **fixed** service/account (`baw` / `agentSessionId`) when available. Two users on one machine would overwrite each other.
  - `BINANCE_BAW_DIR` isolates the file session but isn't documented.
  - `auth verify` blocks for up to about 5 minutes while polling, which doesn't fit a web request behind a 60 s proxy, so we had to cap it.
- **Missing**:
  - No documented JSON schemas for command outputs.
  - No way to scope a session to read-only or to specific tokens.
  - No sign-out command that also revokes on Binance's side.
  - USDT is the only documented quote token for stock buys.
- **x402**: paid StockAnalyst research works through `x402-payment preview` and `sign`. The merchant reports facilitator `binance-b402-v2`, so b402 is used on the payer side. The b402 REST API (`/api/v2/b402/verify|settle`) is merchant-side.
- **You:** your own experience setting up the Agentic Wallet in the Binance app: how long it took, what confused you, and the app's default daily limit (it showed **1000 USDT**, which is high for a first-time user).

## 5. Tokenized-stock specifics

- **Same stock, two issuers** (NVDA, 11 Oct ~00:30 UTC):
  - Ondo NVDAon: token-to-share ratio 1.0017, about $230.68 per share.
  - bStocks NVDAB: ratio about 1.0008, about $230.32 per share.
  - bStocks was **~0.14–0.15% cheaper per share**. You must divide by the ratio before comparing.
- **Outside market hours**: on Sunday both tokens showed `openState: true` and kept trading (hourly candles kept printing). There is no reliable "underlying market closed" flag for bStocks, because `marketStatus` is null.
- **Liquidity / routing**: recent NVDAon trades went through PancakeSwap v3 and Uniswap v4 on BSC, and one trade swapped NVDAon directly into NVDAB (an issuer-to-issuer route exists). Hourly volume on Sunday was thin: some hours had 1–3 trades.
- **Minimums**: the Ondo 5 USD minimum (40375) versus bStocks accepting smaller amounts matters for small DCA and first purchases.
- **You:** the slippage you actually saw on your live purchase, and how long confirmation took.

## 6. Redesign suggestions (prompts — answer in your own words)

- A **"try it" console in the docs** with a sandbox key, so the first call needs no signing code.
- Return **HTTP 4xx with a reason code** for 40304, saying whether it's region, IP, VPN or account.
- Make **Wallet API balances** consistent with Address Portfolio, or fail loudly.
- Publish **JSON schemas / OpenAPI** for every endpoint and every `baw --json` output.
- Give RWA a **true underlying reference price and a market-closed flag**, so on-chain vs real-stock gaps are measurable.

## 7. Requested capabilities

- An independent underlying stock quote (last trade, previous close) next to the token price.
- A cross-issuer quote endpoint: "best per-share price for NVDA across Ondo and bStocks".
- A multi-tenant Agentic Wallet mode, or documented session isolation, plus a non-blocking `auth verify`.
- Scoped Agentic sessions (token allow-list, per-day cap set by the integrating app).
- Paymaster support confirmed for Binance Wallet, and one canonical RPC method name.
- An official TypeScript SDK covering RWA, Market, Address Portfolio and b402.

---

**Still to verify before you write** (only include them once they've happened): your live Agentic Wallet purchase, a purchase from your own wallet, a paid research report, and MegaFuel's `sponsorable: true` (currently `false`).
