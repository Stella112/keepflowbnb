# KeepFlow

**Scan it. Own it. Fork it. Automate it.**

KeepFlow turns a stock, a portfolio or an investing idea into a **Flow**: a shareable, versioned investment mandate that anyone can open from a link or QR code and invest in with USDT from their own wallet, buying real tokenized stocks (bStocks, Ondo) on **BNB Smart Chain mainnet**.

Live: **https://keepflow.site**

## What you can do

- **Buy tokenized stocks with your own wallet.** Stock pages show live Binance RWA data. A purchase goes: wallet sign-in → live quote → personal-rule checks → transaction simulation → exact-amount USDT approval → purchase confirmed in your wallet → receipt after 12 block confirmations.
- **Invest in a whole Flow.** Up to eight holdings plus a USDT reserve are bought one confirmed purchase at a time. If one leg fails, later legs stop and the receipt shows exactly what completed. Nothing is reversed automatically.
- **Share, fork and follow.** Every Flow has a canonical link, QR code and social preview. Published versions are immutable and content-hashed. Forks are independent and keep source attribution. Following is informational and never moves money.
- **Set your own rules.** `/rules` sets per-purchase, daily and weekly spend caps, maximum single-company weight, minimum USDT reserve, slippage and quote-age limits. A Flow creator, an assistant or Autopilot can only make them stricter.
- **See verified activity.** `/activity` lists confirmed onchain purchases, each linked to BscScan and a downloadable receipt.
- **Practice with paper money.** A $10,000 virtual account runs the same rules, Flows and a scheduled paper Autopilot without touching real funds.
- **Use it from an AI assistant.** The KeepFlow MCP server (`/api/mcp`, official MCP SDK, Streamable HTTP) exposes discovery, Flow drafting from natural language, quotes and previews behind scoped, revocable, one-hour grants. It cannot spend funds.
- **Research.** Source-grounded stock briefs are built from Binance RWA and underlying-company data. A paid StockAnalyst (x402) integration is built but payment submission is off.

## Safety model

- KeepFlow never holds funds or private keys. Every approval and purchase is shown in the user's wallet.
- Approvals are for the exact purchase amount and the quote's verified spender only. Quotes expire, failed simulations block execution, and a transaction with an unknown outcome is reconciled rather than resent.
- The server-side operator cap (`LIVE_MAX_TRADE_USD`, at most 25) limits every live purchase. Production currently uses 5 USDT.
- Live Autopilot (unattended buying) stays off until a scoped, revocable execution wallet is authorized.

## Status

Live and implemented: wallet sign-in, mainnet purchase and basket paths, Flows, versions, forks, follows, QR and share links, personal rules, receipts, paper trading and paper Autopilot, MCP, and research briefs.

Not yet proven with a confirmed transaction: a first mainnet purchase through the app, Paymaster gas sponsorship, Binance Agentic Wallet execution, BNB Agent Studio cloud identity, and a paid x402 research call. See [docs/BLOCKERS.md](docs/BLOCKERS.md) and [docs/STATUS.md](docs/STATUS.md).

## Development

Node 24+. `npm ci`, copy `.env.example` to `.env.local`, set the server-only Binance Web3 API and BSC RPC values, then `npm run dev`.

- Checks: `npm test`, `npm run typecheck`, `npm run build`.
- Remote checks on the VPS without changing the live release: `node scripts/remote-check.mjs`.
- Deploy (builds and tests on the VPS, then switches the release symlink): `npm run deploy:lightsail`. Run it from PowerShell on Windows.
- Domain and TLS setup on the VPS: `sudo python3 scripts/setup-domain.py`.

Live trading is enabled only when the server has `EXECUTION_MODE=MAINNET`, `MAINNET_WRITE_ENABLED=true` and `FIRSTBELL_APPROVAL_ENABLED=true`. The `FIRSTBELL_*` environment names are kept from the project's original name, First Bell. SQLite lives outside releases at `PAPER_DATABASE_PATH`.

Engineering mandate: [CLAUDE.md](CLAUDE.md). Architecture and security notes are in [docs/](docs/).
