# FIRST BELL — FINAL MASTER BUILD MANDATE

> **Canonical build contract for Claude Code + Codex**
>
> Put this file at the repo root as `CLAUDE.md`.
> Codex must also read this document before reviewing or modifying the project.
>
> Re-read it:
> - at the beginning of every coding session;
> - before starting a new phase;
> - before any mainnet transaction;
> - before marking any integration as complete.

---

# 0. MISSION

You are building a real submission for:

**BNB Hack: Tokenized Stocks Edition**

Hard deadline:

**Sunday, 11 October 2026 — 12:00 UTC**

The human product owner is:

**Maris**

The working project codename is:

**First Bell**

The public brand is NOT permanently locked.

Centralize branding so the project can be renamed without restructuring the app.

Example:

```ts
export const PRODUCT_NAME = "First Bell";
```

Do not scatter the name across files.

Working tagline:

**Scan it. Own it. Fork it. Automate it.**

The product:

> First Bell turns tokenized stocks and transparent portfolios into shareable links. A user can discover a company or portfolio, purchase the underlying tokenized stocks on BNB Chain, fork the portfolio into their own version, and optionally let a permissioned agent maintain recurring contributions and portfolio rules.

Simple consumer explanation:

> Discover a stock or portfolio. Own it onchain. Put it on autopilot.

This is not an ideation exercise.

This is an implementation mandate.

A smaller product that works reliably on BSC mainnet is better than a large product with half-working sponsor integrations.

---

# 1. OPERATING PRINCIPLES

These rules are non-negotiable.

## 1.1 Working beats impressive-looking

Prioritize:

```text
verified integration
>
beautiful mock
```

and:

```text
one real BSC transaction
>
ten simulated features
```

---

## 1.2 Verified beats assumed

Never implement an external integration from memory.

Read the official documentation.

Make a real request where possible.

Capture the response.

Validate it.

Only then integrate it.

---

## 1.3 Product scope is frozen

Do not redesign First Bell unless:

1. official documentation proves an intended capability unavailable;
2. a live API behaves differently from documentation;
3. a security limitation makes the proposed implementation unsafe;
4. Maris explicitly changes scope.

Do not invent additional hackathon features because they sound impressive.

---

## 1.4 Investigate ordinary engineering failures yourself

Do NOT stop and ask Maris for every normal coding error.

Investigate:

- compilation errors;
- dependency issues;
- schema mismatches;
- integration bugs;
- failed unit tests;
- runtime errors;
- deployment errors;
- ordinary API debugging.

Stop and request human input only when one of these applies:

1. an API key, secret or account action is required;
2. a real mainnet transaction will spend money;
3. Binance requires approval/application/account confirmation;
4. official docs materially contradict one another;
5. live API behavior materially contradicts the docs;
6. a scope-changing product decision is required;
7. a feature appears genuinely impossible with available infrastructure.

When blocked, report:

```text
EXPECTED:
...

OBSERVED:
...

EVIDENCE:
...

ATTEMPTS:
...

SAFEST FALLBACK:
...

DECISION NEEDED:
...
```

Never guess around a blocker.

---

# 2. TEAM ROLES

There are three actors.

---

## 2.1 MARIS — PRODUCT OWNER / HUMAN

Maris owns:

- product direction;
- final scope;
- API registrations;
- credentials;
- Binance account actions;
- wallet confirmations;
- funding test wallets;
- mainnet spend approval;
- final branding;
- demo recording;
- hackathon submission;
- writing the Developer Experience Report narrative.

The agents must not fabricate actions that require Maris.

---

## 2.2 CLAUDE CODE — LEAD BUILDER

Claude Code is the primary implementation agent.

Claude owns:

- repository bootstrap;
- architecture;
- web application;
- UX;
- Bell creation;
- Bell pages;
- QR/share flows;
- stock pages;
- wallet connection;
- frontend state;
- backend route orchestration;
- portfolio UX;
- fork UX;
- Autopilot UX;
- receipt UX;
- deployment;
- documentation;
- integration of reviewed Codex work;
- milestone coordination.

Claude maintains:

```text
docs/STATUS.md
docs/DECISIONS.md
docs/VERIFIED_FACTS.md
docs/API_VERIFICATION.md
docs/DEVEX_RAW.md
docs/DX_EVIDENCE.md
docs/CODEX_QUEUE.md
docs/MAINNET_RUNBOOK.md
docs/ARCHITECTURE.md
docs/DEMO_SCRIPT.md
docs/AGENT_STUDIO_PROOF.md
```

After every meaningful milestone:

update `docs/STATUS.md`.

---

## 2.3 CODEX — BACKEND / VERIFICATION / ADVERSARIAL REVIEWER

Codex is not another frontend builder.

Codex owns or reviews:

- Binance authentication/signing;
- REST client correctness;
- request validation;
- response schemas;
- captured fixtures;
- RWA normalization;
- stock representation resolution;
- quote pipeline;
- approval handling;
- simulation pipeline;
- transaction execution safety;
- contribution-first rebalancing;
- deterministic policy engine;
- idempotency;
- retry/backoff rules;
- mainnet safety;
- integration tests;
- adversarial failure tests;
- code review;
- security review.

Codex's job is partly to prove Claude wrong.

Codex should actively test questions such as:

```text
What happens if the quote expires?

What happens if the selected token becomes paused?

What happens if only one provider has liquidity?

What happens if approval succeeds and swap fails?

What happens if basket leg 2 fails after leg 1 succeeded?

What happens if the user rejects the wallet signature?

What happens if the wallet changes chains?

What happens if API response fields change?

What happens if RWA search returns an unknown provider?

What happens if Binance returns HTTP 429?

What happens if timestamp signing is rejected?

What happens if simulation passes but the quote changes before signing?

What happens if a scheduled Autopilot run is triggered twice?

What happens if USDT balance is insufficient?

What happens if the contribution is too small to execute?

What happens if selling is disabled but drift cannot be corrected with deposits?

What happens if reference-price semantics cannot be proven?

What happens if a provider uses a token/share ratio different from another provider?

What happens if a response validates structurally but contains an unexpected semantic value?
```

A phase is not fully complete until the relevant Codex review either:

```text
PASSED
```

or:

```text
PASSED WITH DOCUMENTED LIMITATIONS
```

---

## 2.4 IF CLAUDE CANNOT DIRECTLY INVOKE CODEX

Claude must never pretend Codex reviewed something.

Instead write a complete task to:

```text
docs/CODEX_QUEUE.md
```

Every task must contain:

```text
GOAL

FILES TO INSPECT

FILES ALLOWED TO MODIFY

OFFICIAL DOCUMENTATION

KNOWN VERIFIED FACTS

EXPECTED BEHAVIOR

FAILURE CASES TO TEST

TESTS REQUIRED

ACCEPTANCE CRITERIA

THINGS NOT TO CHANGE
```

Maris can then paste the task into Codex.

---

# 3. ANTI-HALLUCINATION PROTOCOL

This section overrides speed.

The largest risk in this project is a convincing-looking implementation that calls APIs, parameters, fields, wallets or contracts that do not actually exist.

---

## 3.1 Never invent integration facts

Never invent:

- endpoint paths;
- query parameters;
- JSON fields;
- headers;
- authentication requirements;
- token addresses;
- decimals;
- chain IDs;
- contract ABIs;
- CLI commands;
- wallet capabilities;
- Agent Studio commands;
- Agentic Wallet commands;
- x402/B402 fields;
- provider IDs;
- approval spenders;
- quote lifetimes;
- rate limits;
- error codes.

Each integration fact must come from at least one of:

1. official documentation;
2. a live API response;
3. an onchain read;
4. an official SDK implementation inspected directly.

---

# 4. VERIFIED FACTS SYSTEM

Maintain:

```text
docs/VERIFIED_FACTS.md
```

Each entry must contain:

```text
FACT:
...

SOURCE:
official URL / captured response / onchain read

DATE VERIFIED:
YYYY-MM-DD

VERIFICATION METHOD:
...

CODE DEPENDENCIES:
...
```

Code depending on an unverified external assumption is considered unfinished.

---

## 4.1 Verification states

Use:

```text
NOT STARTED
DOC VERIFIED
LIVE RESPONSE VERIFIED
SIMULATION VERIFIED
MAINNET VERIFIED
```

Do not use vague statuses like:

```text
DONE
```

for third-party integrations.

---

# 5. CAPTURE REAL API RESPONSES

For every external Binance endpoint used by the demo path:

save one sanitized real response under:

```text
fixtures/api/
```

Example:

```text
fixtures/api/rwa-search-nvda.json
fixtures/api/rwa-underlying-market-nvda.json
fixtures/api/aggregator-quote-nvda.json
fixtures/api/transaction-simulate.json
```

Strip:

- secrets;
- auth headers;
- user-sensitive data.

Build TypeScript types and Zod schemas from:

1. the official reference;
2. the captured live response.

Never build response types purely from memory.

---

# 6. RUNTIME VALIDATION

Every external response must be parsed with Zod.

If validation fails:

1. do not silently coerce the value;
2. create a structured error;
3. record the mismatch in DX evidence;
4. preserve the raw sanitized response for debugging;
5. fail visibly but safely.

No `any` for external API data.

---

# 7. NO FAKE PRODUCTION DATA

Mocks are allowed only in development/tests.

Mocks must live under:

```text
dev/mock/
```

or:

```text
fixtures/
```

Production behavior may never silently fall back to fake:

- stock prices;
- balances;
- quotes;
- issuer information;
- transaction hashes;
- slippage;
- market status;
- portfolios.

If live data is unavailable, show:

```text
Data temporarily unavailable.
```

The demo must clearly distinguish:

```text
LIVE
DRY RUN
SIMULATION
```

---

# 8. PRODUCT SUMMARY

**First Bell** is a consumer investing layer for tokenized stocks on BNB Chain.

It turns:

```text
stocks
```

and:

```text
transparent portfolios
```

into:

```text
shareable, programmable links
```

The user thinks in:

- companies;
- dollars;
- portfolios.

First Bell hides:

- tokenized representations;
- issuer differences;
- contract addresses;
- approvals;
- routing;
- simulations;
- portfolio drift;
- transaction machinery.

---

# 9. CORE PRODUCT CONCEPTS

## 9.1 Bell

A **Bell** is a shareable investment definition.

It is NOT:

- a fund;
- a vault;
- a custody contract;
- a pooled investment vehicle.

### Single Stock Bell

Example:

```text
NVIDIA

Start with:
10 USDT
```

### Portfolio Bell

Example:

```text
AI Compute

NVDA    30%
MSFT    25%
GOOGL   20%
AMZN    15%
USDT    10%
```

The Bell stores investment intent.

Prefer:

```json
{
  "ticker": "NVDA",
  "targetWeightBps": 3000
}
```

Do not permanently bind a Bell to a hard-coded token contract unless required by a documented immutable reason.

The execution engine resolves the actual supported token representation at execution time.

---

## 9.2 Fork

A user can copy a Bell and create their own version.

Example:

Original:

```text
AI Compute

NVDA   30
MSFT   25
GOOGL  20
AMZN   15
USDT   10
```

Fork:

```text
My AI Compute

NVDA   20
MSFT   25
GOOGL  25
AMZN   15
BNB     5
USDT   10
```

The fork is independent.

The original creator has:

- no custody;
- no withdrawal rights;
- no execution rights;
- no unilateral control.

---

## 9.3 Autopilot

Autopilot does NOT predict stocks.

Autopilot enforces deterministic portfolio rules.

Example:

```text
Contribution:
20 USDT weekly

Max single-company exposure:
40%

Stable reserve:
10%

Drift threshold:
5 percentage points

Max autonomous trade:
10 USDT

Max accepted slippage:
0.50%

Selling existing holdings:
OFF
```

Priority:

1. new contributions first;
2. minimize unnecessary selling;
3. remain inside user policy;
4. simulate before execution;
5. skip unsafe executions;
6. explain every action.

---

## 9.4 Strategy update

A creator or agent may publish a new version of a Bell.

A follower's personal agent may:

1. retrieve the new strategy;
2. compare it with the previous version;
3. validate proposed changes against the user's own rules;
4. apply only permitted changes.

Strategy creator instructions never override user policy.

---

# 10. PRODUCT DIFFERENTIATION

Do NOT position First Bell as:

> a bStocks vs Ondo vs xStocks router.

Other projects already focus on route comparison.

Representation selection is infrastructure.

The consumer should see:

```text
NVIDIA
```

not:

```text
NVDAB
NVDAon
NVDAx
```

unless they open technical details.

First Bell's differentiation is:

```text
distribution
+
first ownership
+
forkable portfolios
+
guarded automation
```

---

# 11. HACKATHON REQUIREMENTS

Official main track:

**Tokenized Stocks Products & Agents**

Treat these rules as immutable unless official organizers publish a change.

Required:

- at least one of bStocks, Ondo or xStocks is central;
- BSC mainnet;
- spot only;
- no perps;
- cross-asset portfolios allowed;
- public repository;
- deployed app or runnable instructions;
- demo video four minutes or less strongly recommended;
- Developer Experience Report mandatory.

Judging:

```text
Technical implementation      30%
Creativity & originality      25%
Developer Experience Report   25%
Product quality & UX          20%
```

Special prizes:

```text
Best Use of Agentic Wallet / Wallet Skills — $2,000

Best Use of BNB Agent Studio — $2,000
```

Do not compromise the core submission to chase special prizes.

---

# 12. CORE SCOPE — MUST SHIP

## 12.1 Curated stock discovery

Do NOT build a giant stock marketplace before the core works.

Ship initially with approximately:

```text
3–4 curated Bells
```

and approximately:

```text
6–8 supported stock tickers
```

where live APIs confirm support.

Suggested examples only:

```text
NVDA
AAPL
MSFT
GOOGL
META
AMZN
TSLA
one supported ETF
```

Never present an unsupported ticker.

---

## 12.2 Stock link page

Route:

```text
/s/[ticker]
```

Display:

- company/ticker;
- live supported token data;
- market status;
- available representations under technical details;
- onchain/reference information only where semantics are verified;
- buy panel.

---

## 12.3 Wallet connection

Must support a documented EIP-1193-compatible wallet flow on BSC.

Target compatibility includes Binance Web3 Wallet if officially supported through the chosen integration path.

Requirements:

- detect wallet;
- request connection;
- obtain address;
- verify chain;
- request BSC chain switch if supported;
- handle rejection;
- sign transactions;
- show tx hash;
- verify confirmation.

Do not store private keys.

---

## 12.4 Single stock buy

Core guaranteed funding path:

```text
USDT
→
tokenized stock
```

Flow:

```text
resolve
→
quote
→
policy
→
approval if needed
→
simulate
→
user signs
→
broadcast
→
confirm
→
verify balance
→
receipt
```

---

## 12.5 Bell creation

Bell supports:

- stock Bell;
- portfolio Bell;
- title;
- description;
- creator wallet;
- holdings;
- basis-point weights;
- optional stable reserve;
- stable public ID;
- version;
- content hash;
- creation time;
- fork origin.

---

## 12.6 Bell page

Route:

```text
/b/[bellId]
```

Show:

- holdings;
- target percentages;
- investment amount;
- QR;
- share;
- fork;
- invest.

---

## 12.7 Basket investment

Basket buys are NOT atomic.

Execute legs sequentially.

Example:

```text
Leg 1 NVDA — success
Leg 2 MSFT — failed
Leg 3 GOOGL — not started
```

If a leg fails:

1. stop remaining legs by default;
2. record already-completed trades honestly;
3. mark remaining legs `NOT_STARTED`;
4. show exact partial state;
5. never label the basket purchase complete.

Do not attempt compensating sells automatically.

---

## 12.8 Fork

User can:

- copy portfolio;
- add/remove holdings;
- change weights;
- modify reserve;
- save as independent Bell.

---

## 12.9 Policy engine

Pure deterministic functions.

No external I/O.

Input:

```ts
ProposedTrade
MarketSnapshot
PortfolioState
UserPolicy
```

Output:

```ts
{
  allowed: boolean;
  code: string;
  reason: string;
}
```

100% unit tested for demo-path rules.

---

## 12.10 Receipts

Route:

```text
/r/[receiptId]
```

Receipt must show:

- requested action;
- selected representation;
- reason;
- amount;
- quote;
- simulation result;
- policy result;
- tx hash;
- final status.

Basket receipt:

per leg.

---

## 12.11 Autopilot

Minimum must-ship version:

single operator / Maris wallet is acceptable.

Autopilot must:

1. read current portfolio;
2. read available contribution;
3. calculate target shortfall;
4. allocate new contribution to underweight assets first;
5. resolve/quote each leg;
6. apply policy;
7. simulate;
8. execute or skip;
9. persist decision receipt.

---

## 12.12 Execution modes

Required:

```text
DRY_RUN
LIVE
```

Default:

```text
DRY_RUN
```

Also require:

```text
MAINNET_WRITE_ENABLED=false
```

by default.

A live write requires BOTH:

```text
EXECUTION_MODE=LIVE
```

and:

```text
MAINNET_WRITE_ENABLED=true
```

and explicit user action.

---

# 13. STRETCH FEATURES

Only start these after the mainnet single-stock buy and core Bell flows work.

Priority:

```text
S1 Agentic Wallet adapter

S2 Strategy updates

S3 Agent Studio deployment

S4 MCP server

S5 B402 paid strategy/data update

S6 Card/on-ramp experiment

S7 Mainnet gas sponsorship/paymaster

S8 DeFi idle-USDT yield
```

Stretch features must never block core submission.

---

# 14. OUT OF SCOPE

Do not build:

- perps;
- leverage;
- margin;
- options;
- shorting;
- prediction markets;
- AI stock prediction;
- sentiment trading;
- "AI beats the market";
- custom token;
- First Bell governance;
- social feed;
- chat;
- NFTs;
- custody;
- pooled funds;
- custom AMM;
- custom liquidity pool;
- custom vault;
- native mobile app;
- giant analytics terminal;
- complicated smart contracts;
- arbitrary multi-chain support.

---

# 15. SMART CONTRACT POLICY

Default:

```text
NO CUSTOM SMART CONTRACT
```

Do not deploy Solidity merely to appear technically sophisticated.

Before proposing a contract, document:

```text
WHY NECESSARY

WHAT EXISTING INFRASTRUCTURE CANNOT DO

CUSTODY IMPLICATIONS

SECURITY SURFACE

UPGRADE MODEL

GAS COST

TEST PLAN
```

Maris must approve before contract development begins.

---

# 16. TECH STACK

Use a small, practical stack.

Frontend/backend:

- Next.js App Router;
- TypeScript strict mode;
- Tailwind CSS;
- Zod;
- viem;
- wagmi where appropriate;
- QR generation library;
- Vitest.

Persistence:

Prefer:

```text
SQLite + Drizzle
```

for local speed unless deployment requirements make it impractical.

If production deployment needs persistent hosted storage:

switch to PostgreSQL only with a clear migration.

Do not add:

- Redis;
- queues;
- Kafka;
- microservices;

unless proven necessary.

Autopilot:

simple Node process / cron-compatible runner.

No complex distributed scheduler for hackathon MVP.

---

# 17. REPOSITORY STRUCTURE

Recommended:

```text
/
├── app/
│   ├── s/[ticker]/
│   ├── b/[bellId]/
│   ├── b/new/
│   ├── r/[receiptId]/
│   ├── autopilot/
│   └── api/
│
├── lib/
│   ├── binance/
│   │   ├── auth.ts
│   │   ├── rwa.ts
│   │   ├── market.ts
│   │   ├── trading.ts
│   │   ├── transaction.ts
│   │   ├── wallet.ts
│   │   └── b402.ts
│   │
│   ├── resolver/
│   ├── policy/
│   ├── execution/
│   ├── autopilot/
│   ├── bells/
│   ├── receipts/
│   └── dx/
│
├── agent/
│
├── scripts/
│   ├── smoke.ts
│   └── autopilot.ts
│
├── fixtures/
│   └── api/
│
├── tests/
│
├── docs/
│   ├── STATUS.md
│   ├── DECISIONS.md
│   ├── VERIFIED_FACTS.md
│   ├── API_VERIFICATION.md
│   ├── DEVEX_RAW.md
│   ├── DX_EVIDENCE.md
│   ├── CODEX_QUEUE.md
│   ├── MAINNET_RUNBOOK.md
│   ├── ARCHITECTURE.md
│   ├── AGENT_STUDIO_PROOF.md
│   └── DEMO_SCRIPT.md
│
├── logs/
│   └── .gitkeep
│
├── .env.example
├── CLAUDE.md
├── README.md
└── package.json
```

---

# 18. ENVIRONMENT

Example only.

Never commit real values.

```env
BINANCE_WEB3_API_KEY=
BINANCE_WEB3_API_SECRET=
BINANCE_WEB3_BASE_URL=

BSC_RPC_URL=

DATABASE_URL=file:./firstbell.db

EXECUTION_MODE=DRY_RUN
MAINNET_WRITE_ENABLED=false
LIVE_MAX_TRADE_USD=5

AUTOPILOT_OPERATOR_ADDRESS=

NEXT_PUBLIC_APP_URL=
```

Do not invent Agent Studio environment variables before the official scaffold/docs prove them.

---

# 19. OFFICIAL RESOURCES

These are the primary sources of truth.

## Hackathon

https://www.bnbchain.org/en/hackathons/tokenized-stocks

## Developer portal

https://web3.binance.com/en/dev-portal

## Web3 API

https://web3.binance.com/en/dev-docs/introduction

## Authentication

https://web3.binance.com/en/dev-docs/authentication

## REST

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api

## RWA

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data

## Market

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/general-data

## Trading

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api

## Transaction

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/transaction-api

## Wallet

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/wallet-api

## Portfolio

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/address-portfolio

## DeFi

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/defi-data

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/defi-transaction

## B402

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/b402-payments

## Agentic Wallet

https://developers.binance.com/en/docs/products/agentic-wallet/welcome

https://developers.binance.com/en/docs/products/agentic-wallet/quickstart/install-agentic-wallet

https://developers.binance.com/en/docs/products/agentic-wallet/use-cases/trading/stock-trading

https://developers.binance.com/en/docs/products/agentic-wallet/reference/skills

## Wallet Skills

https://developers.binance.com/en/docs/products/wallet-skills/overview

## Skills repo

https://github.com/binance/binance-skills-hub

## Agent Studio

https://www.bnbchain.org/en/bnb-agent-studio

## BNB docs

https://docs.bnbchain.org

## BscTrace

https://bsctrace.com

## PancakeSwap

https://pancakeswap.finance

## Documentation index

https://web3.binance.com/en/dev-docs/llms.txt

## Full documentation

https://web3.binance.com/en/dev-docs/llms-full.txt

---

# 20. KNOWN ENDPOINT INDEX — VERIFY BEFORE USE

The following endpoint names/paths were taken from the current documentation index supplied for this build.

They are provided to reduce discovery time.

**Their parameters, response shapes, limits and exact semantics must still be verified from the official reference and live calls before implementation.**

---

## 20.1 RWA Data

Candidate paths to verify:

```text
GET /api/v1/dex/market/rwa/platforms

GET /api/v1/dex/market/rwa/tokens

GET /api/v1/dex/market/rwa/search

GET /api/v1/dex/market/rwa/price

GET /api/v1/dex/market/rwa/underlying-profile

GET /api/v1/dex/market/rwa/underlying-market
```

---

## 20.2 Market

Candidate paths to verify:

```text
POST /api/v1/dex/market/price

POST /api/v1/dex/market/price-info

GET /api/v1/dex/market/candles

GET /api/v1/dex/market/token/top-liquidity
```

---

## 20.3 Trading / Aggregator

Candidate paths to verify:

```text
GET /api/v1/dex/aggregator/supported/chain

GET /api/v1/dex/aggregator/approve-transaction

GET /api/v1/dex/aggregator/quote

GET /api/v1/dex/aggregator/swap

GET /api/v1/dex/aggregator/history
```

---

## 20.4 Transaction

Candidate paths to verify:

```text
GET /api/v1/dex/pre-transaction/gas-price

POST /api/v1/dex/pre-transaction/gas-limit

POST /api/v1/dex/pre-transaction/simulate

POST /api/v1/dex/pre-transaction/broadcast-transaction

GET /api/v1/dex/post-transaction/transaction-detail-by-txhash
```

---

## 20.5 Wallet / Portfolio

Candidate paths to verify:

```text
POST /api/v1/dex/balance/token-balances-by-address

GET /api/v1/dex/balance/all-token-balances-by-address

GET /api/v1/dex/market/portfolio/overview
```

---

## 20.6 B402

Candidate paths to verify:

```text
POST /api/v2/b402/supported

POST /api/v2/b402/verify

POST /api/v2/b402/settle
```

---

# 21. API VERIFICATION TABLE

Before implementing an endpoint, record in:

```text
docs/API_VERIFICATION.md
```

Fields:

```text
CAPABILITY

OFFICIAL DOCUMENTATION URL

ENDPOINT / COMMAND

HTTP METHOD

REQUEST PARAMETERS

REQUIRED HEADERS

AUTHENTICATION

CHAIN PARAMETER FORMAT

RESPONSE FIELDS USED

ERROR FORMAT

RATE LIMIT

QUOTE VALIDITY

VERIFIED VIA LIVE REQUEST?
yes/no

CAPTURED FIXTURE

NOTES
```

---

# 22. AUTHENTICATION — VERIFY, DO NOT ASSUME

Do not treat the following as immutable facts until they are verified from the current Authentication documentation or official SDK.

Current implementation hints to verify include:

```text
Base URL possibly:
https://web3.binance.com/build
```

and possible headers:

```text
X-OC-APIKEY
X-OC-TIMESTAMP
X-OC-SIGN
```

and possible signing scheme:

```text
timestamp
+
HTTP method
+
request path
+
raw body
```

with:

```text
HMAC-SHA256
+
Base64
```

The request path may need to include:

```text
/build
```

in signing.

VERIFY THIS.

Do not copy it blindly.

---

# 23. AUTH EDGE CASES TO VERIFY

Investigate explicitly:

## Clock skew

A builder report suggests a possible timestamp/clock-skew error code:

```text
40103
```

and a possible header:

```text
X-OC-RECV-WINDOW
```

This is a HINT ONLY.

Verify through official docs/live API.

If confirmed:

add clock-skew handling and document it.

---

## Rate limits

A builder report suggests a possible limit near:

```text
5 requests/second per endpoint
```

This is NOT an accepted fact.

Verify.

Once verified:

implement bounded concurrency/rate handling accordingly.

---

# 24. API CLIENT

All Binance signed API calls occur server-side.

Never expose API secret in browser bundles.

Implement one centralized client.

Responsibilities:

- URL construction;
- exact signing;
- timestamp;
- optional nonce if documented;
- timeout;
- retries;
- response validation;
- error normalization;
- DX logging.

Do not log:

- secrets;
- full auth headers;
- sensitive wallet information.

---

# 25. RETRIES

Safe/idempotent reads may use:

```text
bounded exponential backoff
```

Only retry errors proven retryable.

State-changing transactions must NOT be blindly retried.

Example:

```text
broadcast timed out
```

does NOT mean:

```text
broadcast again
```

First determine whether the transaction was accepted.

---

# 26. RWA PROVIDER MODEL

Hackathon supports:

- bStocks;
- Ondo;
- xStocks.

Do NOT hard-code this union into core domain types.

Use:

```ts
type RwaProviderId = string;
```

The API may return other IDs.

Only display or execute verified providers.

If xStocks is not available through the specific Binance RWA endpoints used:

do not fake xStocks support.

Correct support for two real providers beats dishonest support for three.

---

# 27. TOKEN ADDRESSES

Never manually paste stock token contract addresses into production code.

Resolve from:

- verified RWA API;
- verified official provider source;
- onchain validation.

Cache only if necessary.

The Bell itself should remain ticker/intention oriented.

---

# 28. TOKEN DECIMALS

Never assume:

```text
18 decimals
```

Read decimals from:

- official API;
- token contract.

Use `bigint` for token amounts.

Never use JS floating-point values for onchain amounts.

---

# 29. REFERENCE-PRICE SEMANTICS

Do NOT assume a field named:

```text
referencePrice
```

means:

> latest NYSE/Nasdaq underlying stock price.

Before enabling market-gap guards:

verify:

- what exact value is returned;
- whether it is underlying equity price;
- whether issuer conversion ratios affect it;
- whether timestamps are provided;
- what happens outside traditional market hours.

Until verified:

```text
UnderlyingMarketGuard = disabled
```

or:

```text
informational only
```

Never mislabel a normalized token valuation as an official market reference.

---

# 30. STOCK REPRESENTATION NORMALIZATION

This is critical.

Do NOT route simply by:

```text
most tokens received per USDT
```

Different tokenized representations may use different economic ratios or structures.

Candidate comparison must be based on:

```text
normalized economic exposure/value
```

after:

- fees;
- price impact;
- conversion ratio;
- issuer-specific economics where documented.

If cross-provider normalization cannot be proven confidently:

do NOT automatically claim one provider offers better execution.

Fallback:

1. use a configured verified default provider;
2. disclose that cross-provider economic normalization is not yet proven;
3. keep comparison informational.

Correctness beats fake optimization.

---

# 31. RESOLUTION RESULT

Implement something like:

```ts
type ResolutionResult = {
  ticker: string;
  candidates: Candidate[];
  selected?: Candidate;
  status:
    | "READY"
    | "NO_SUPPORTED_ASSET"
    | "NO_LIQUIDITY"
    | "POLICY_BLOCKED"
    | "MARKET_BLOCKED"
    | "SIMULATION_FAILED";
  reason: string;
};
```

Candidate concept:

```ts
type Candidate = {
  provider: string;
  tokenAddress: string;
  symbol: string;
  chainId: number;
  assetType: string;
  tokenPrice?: string;
  normalizedExposure?: string;
  underlyingMarketData?: unknown;
  quote?: unknown;
  expectedOutput?: string;
  slippageBps?: number;
  approvalRequired?: boolean;
  quoteExpiry?: string;
};
```

Use exact fields only after verification.

---

# 32. PROVIDER SELECTION POLICY

Candidate is eligible only when:

1. verified BSC asset;
2. verified spot asset;
3. currently tradable;
4. executable quote exists;
5. required minimum is met;
6. slippage under user limit;
7. simulation passes;
8. no policy block.

Among economically comparable candidates:

choose best verified post-cost execution.

If comparability is not provable:

do not rank automatically.

---

# 33. TRADING APPROVALS

Never approve unlimited USDT by default.

Prefer:

```text
exact required amount
```

unless documented infrastructure requires otherwise.

Record:

```text
token
spender
amount
transaction hash
```

---

# 34. APPROVAL SPENDER

Do not assume one universal aggregator spender.

Some RWA/RFQ routes may require route/vendor-specific approval behavior.

A field such as:

```text
vendorName
```

was previously discussed but is currently considered:

```text
UNVERIFIED
```

Do NOT code against that field until official docs/live responses confirm:

- whether it exists;
- what it means;
- how spender selection works.

The general requirement remains:

> use the spender explicitly required by the verified quote/build/approval flow.

---

# 35. QUOTE EXPIRY

Treat quote freshness as first-class state.

Do not invent:

```text
30-second quote validity
```

if Binance does not document it.

If expiry information exists:

use it.

If expiry is undocumented:

requote immediately before final transaction construction/signing.

Never submit obviously stale calldata.

---

# 36. SINGLE-LEG BUY STATE MACHINE

Persist state transitions.

Suggested:

```text
IDLE

RESOLVING

QUOTING

POLICY_CHECK

POLICY_REJECTED

APPROVAL_REQUIRED

APPROVAL_SIMULATING

APPROVAL_AWAITING_SIGNATURE

APPROVAL_BROADCASTING

APPROVAL_CONFIRMED

BUILDING_SWAP

SIMULATING_SWAP

SIMULATION_FAILED

DRY_RUN_COMPLETE

AWAITING_SIGNATURE

BROADCASTING

CONFIRMING

SUCCESS

FAILED
```

The exact implementation may differ.

What matters is:

state must be explicit.

---

# 37. BUY PIPELINE

Mandatory order:

```text
resolve
↓
quote
↓
policy check
↓
allowance check
↓
approval build if required
↓
approval simulation where supported
↓
approval signature
↓
approval confirmation
↓
requote if needed
↓
swap build
↓
transaction simulation
↓
user confirmation
↓
signature
↓
broadcast
↓
confirmation
↓
balance verification
↓
receipt
```

Never show:

```text
SUCCESS
```

just because a transaction hash exists.

Verify final state.

---

# 38. BASKET EXECUTION

Portfolio Bell purchases execute sequentially.

Example:

```text
NVDA
→ success

MSFT
→ success

GOOGL
→ failure

AMZN
→ not started
```

After a failure:

default behavior:

```text
STOP
```

Do not automatically continue unless a later verified product decision changes this.

Do not automatically reverse successful previous legs.

Receipt must show partial ownership clearly.

---

# 39. POLICY ENGINE

No LLM decides whether money moves.

LLM may:

- explain;
- summarize;
- translate natural-language preference into a proposed structured policy.

Deterministic code must:

- validate;
- calculate;
- approve;
- reject;
- select permitted actions.

---

# 40. POLICY RESULT

Return:

```ts
{
  allowed: boolean;
  code: string;
  reason: string;
}
```

Reason must be understandable by a normal consumer.

Example:

```text
Purchase skipped because the available quote exceeded your 0.5% slippage limit.
```

Not:

```text
ERR_SLIPPAGE_BPS_67
```

---

# 41. POLICY RULES

Possible rules include:

```text
TOKEN_PAUSED

MAX_SLIPPAGE

MAX_TRADE

MAX_EXPOSURE

MIN_STABLE_RESERVE

STALE_DATA

QUOTE_EXPIRED

SIMULATION_FAILED

NOT_BSC

NOT_SPOT

INSUFFICIENT_LIQUIDITY

UNDERLYING_MARKET_GAP
```

Do not activate a rule until required data semantics are verified.

---

# 42. PRODUCT DEFAULT THRESHOLDS

Any numeric thresholds are:

```text
product/demo defaults
```

NOT:

```text
financially safe levels
```

For example, if a temporary demo default is:

```text
maxSlippage = 0.50%
```

this means:

> the product owner chose this policy value for the demo.

It does NOT mean:

> 0.50% is objectively safe.

The UI and documentation must not make false safety claims.

---

# 43. UNDERLYING MARKET GUARD

Only enable after reference-price semantics are verified.

Possible behavior:

```text
underlying market closed

AND

verified token-vs-underlying divergence
>
user-configured threshold

→

SKIP
```

Example user-facing reason:

```text
Purchase skipped because the underlying market is closed and this token is outside your configured price-gap limit.
```

Do not claim:

```text
we prevented a loss
```

---

# 44. CONTRIBUTION-FIRST REBALANCING

Signature product feature.

Given:

```text
target allocations
current values
new USDT contribution
```

calculate underweight positions.

Allocate the new contribution to underweight holdings first.

Example target:

```text
NVDA    40%
MSFT    30%
GOOGL   20%
USDT    10%
```

Current:

```text
NVDA    48%
MSFT    24%
GOOGL   18%
USDT    10%
```

Contribution:

```text
20 USDT
```

Do NOT sell NVDA automatically.

Allocate toward:

```text
MSFT
GOOGL
```

first.

---

# 45. SELLING

Default:

```text
allowSellingExistingPositions = false
```

Existing holdings may be sold only when:

```text
allowSellingExistingPositions = true
```

and:

- deterministic policy permits it;
- user/agent wallet permissions permit it;
- simulation succeeds.

---

# 46. CONTRIBUTION ALGORITHM

Implement as pure deterministic math.

No network calls.

Inputs:

```text
target weights
current USD-equivalent portfolio
new contribution
reserve target
min trade size
```

Outputs:

```text
planned contribution legs
unallocated reserve
reasoning metadata
```

Comprehensive unit tests required.

Codex must adversarially review it.

---

# 47. AUTOPILOT IDEMPOTENCY

Critical.

Autopilot must not double-buy if the scheduler fires twice.

Each scheduled run gets a deterministic key.

Example:

```text
policyId + scheduledPeriod
```

Example:

```text
policy_123:2026-10-09
```

or:

```text
policy_123:2026-W41-Friday
```

Persist it.

If duplicate:

return previous run.

Do not execute again.

Unit test required.

---

# 48. AUTOPILOT FLOW

For each run:

```text
load policy
↓
check idempotency
↓
read wallet portfolio
↓
price holdings
↓
calculate current weights
↓
calculate contribution allocation
↓
for each proposed leg:
    resolve
    quote
    policy
    simulate
    execute or skip
↓
persist receipts
↓
persist run result
```

---

# 49. AGENTIC WALLET

Do not describe Agentic Wallet as:

> automatic email-created wallet.

Current understanding to verify from official docs:

- Binance account required;
- existing Binance MPC Wallet may be required;
- Agentic Wallet has keyless/MPC characteristics;
- trading permissions/limits may be controlled through Binance;
- agent tools/skills/CLI are central to interaction.

VERIFY EVERYTHING before implementation.

---

# 50. AGENTIC WALLET ROLE

Core web first-buy flow must not depend on unproven Agentic Wallet browser integration.

Base architecture:

```text
Web purchase:
supported connected wallet
```

and:

```text
Autopilot / AI execution:
Agentic Wallet where verified and feasible
```

If a supported direct dApp integration exists:

document and use it.

If not:

do not fake one.

---

# 51. AGENTIC WALLET FEASIBILITY SPIKE

Do this immediately after the first real mainnet stock buy succeeds.

Do not wait until the very final day.

Investigate:

- sign-in flow;
- CLI/tools;
- session persistence;
- multi-user support;
- tokenized-security support;
- automation permissions;
- execution output format;
- error states;
- daily limits;
- token scope;
- high-risk confirmations.

Document in:

```text
docs/VERIFIED_FACTS.md
```

If multi-user sessions are unsupported:

use Agentic Wallet only for Maris/operator demo and state that limitation honestly.

---

# 52. AGENT STUDIO

Do NOT assume commands such as:

```text
npm install -g @bnbagent/studio-cli
```

or:

```text
bag skills install
```

are valid.

They are currently:

```text
UNVERIFIED
```

Discover exact Agent Studio setup from current official documentation.

Record:

```text
installation
scaffold command
runtime
deployment flow
identity registration
wallet model
x402 integration
```

before writing agent deployment code.

---

# 53. AGENT STUDIO GOAL

If successfully integrated, prove:

- persistent deployed agent;
- actual runtime;
- actual ERC-8004 identity if supported/used;
- reachable endpoint;
- execution logs;
- strategy update capability.

Store evidence in:

```text
docs/AGENT_STUDIO_PROOF.md
```

Never claim:

```text
ERC-8004 agent
```

unless registration is real and evidenced.

---

# 54. B402

B402 is NOT the user's stock payment method.

Use only for machine-to-machine commerce.

Preferred use:

```text
User Portfolio Agent
↓
requests strategy/data update
↓
remote strategy/data service requires payment
↓
B402/x402 payment
↓
structured strategy/data returned
↓
First Bell policy engine validates
↓
permitted action only
```

If no credible paid service is available:

skip B402 rather than forcing it.

---

# 55. STRATEGY AGENTS

Stretch feature.

Creator publishes:

```text
AI Compute v1.2
```

with target weights.

User may follow it.

Following does NOT give creator custody.

Update flow:

```text
strategy update
↓
diff old/new
↓
user policy validation
↓
contribution-first adjustment
↓
simulation
↓
permitted execution
```

---

# 56. MCP

Stretch.

Possible tools:

```text
search_stock

get_stock

create_bell

get_bell

fork_bell

quote_stock

quote_bell

simulate_stock_buy

simulate_bell_buy

get_portfolio

get_receipt
```

Do not expose unrestricted arbitrary transaction execution.

---

# 57. CARD / FIAT ON-RAMP

Not part of core MVP.

Do not collect:

- PAN;
- CVV;
- raw payment credentials.

After all must-ship gates pass:

investigate Binance-supported hosted on-ramp / Buy Any Token capability.

Only expose UI if live verification confirms:

- supported target token;
- payment method;
- quote;
- destination;
- completion callback/flow.

Core demo must survive without card support.

---

# 58. PAYMASTER

Stretch only.

Do not advertise:

```text
gasless
```

unless actual BSC mainnet gas sponsorship works.

Testnet Agent Studio sponsorship does not prove mainnet sponsorship.

If unavailable:

show required gas honestly.

---

# 59. DEFI

Optional only.

Possible use:

idle USDT reserve.

Do not auto-deposit user stablecoins.

If implemented:

- explicit opt-in;
- verified protocol;
- clear risk disclosure;
- simulation;
- redeem path;
- no unsafe protocol chosen just to satisfy sponsor API coverage.

---

# 60. BELLS DATA MODEL

Minimum conceptual model:

```ts
Bell {
  id
  version
  type
  title
  description
  creatorAddress
  visibility
  defaultContributionAmount
  recurringSuggestion
  reserveBps
  forkedFromId?
  contentHash
  createdAt
  updatedAt
}
```

---

# 61. BELL ASSET

```ts
BellAsset {
  id
  bellId
  ticker
  assetClass
  targetWeightBps
  maxWeightBps?
  sortOrder
}
```

Weights including stable reserve:

```text
10,000 basis points
```

Validate server-side.

---

# 62. POLICY MODEL

```ts
PortfolioPolicy {
  id
  ownerAddress
  bellId
  contributionAmount
  contributionAsset
  cadence
  rebalanceThresholdBps
  maxSingleAssetWeightBps
  minStableReserveBps
  maxTradeAmount
  maxSlippageBps
  allowSellingExistingPositions
  enabled
  createdAt
  updatedAt
}
```

---

# 63. RECEIPT MODEL

```ts
DecisionReceipt {
  id
  walletAddress
  bellId?
  policyId?
  decisionType
  status
  requestedAmount?
  executedAmount?
  reasonCode
  humanReason
  marketSnapshot?
  simulationResult?
  transactionHash?
  createdAt
}
```

Possible statuses:

```text
EXECUTED

SKIPPED

BLOCKED

FAILED

PARTIAL

DRY_RUN_COMPLETE
```

---

# 64. BASKET LEG MODEL

Each leg records:

```text
ticker

provider

tokenAddress

amountInUsdt

quote snapshot

policy result

simulation

approval tx?

swap tx?

state

human reason
```

---

# 65. UI PRINCIPLES

This must look like a consumer financial product.

Avoid:

- generic Web3 dashboards;
- dark neon trading terminal;
- giant chart walls;
- excessive gradients;
- purple AI aesthetic;
- glowing cards;
- raw contract addresses on main screens;
- blockchain jargon;
- ten competing CTAs.

Prefer:

- clean typography;
- generous spacing;
- mobile-first layout;
- strong hierarchy;
- one primary action;
- restrained color;
- clear loading/error states.

---

# 66. MOBILE FIRST

Primary demo width:

approximately:

```text
380 px
```

Every core screen must be usable on mobile.

Desktop must remain polished.

---

# 67. MAIN SCREENS

## Landing

Headline:

```text
Stocks and portfolios you can share, own and automate.
```

Actions:

```text
Explore Bells

Create a Bell
```

---

## Explore

Keep scope small.

Show approximately:

```text
3–4 curated Bells
```

plus a few supported stocks.

No fake live pricing.

---

## Stock page

Route:

```text
/s/NVDA
```

Show:

```text
NVIDIA

market status

amount

estimated stock received

buy
```

Technical issuer/provider details collapsed.

---

## Bell page

Example:

```text
AI Compute

NVDA    30%
MSFT    25%
GOOGL   20%
AMZN    15%
USDT    10%

[ Invest ]

[ Fork ]

[ Share ]
```

---

## Buy review

Show:

```text
You pay

Estimated stock/exposure

Selected route/provider

Estimated slippage

Estimated network cost

Simulation status
```

---

## Success

```text
You now own NVIDIA.
```

Then:

```text
Put it on Autopilot
```

---

## Portfolio

Show:

- current holdings;
- target weights;
- actual weights;
- stable reserve;
- receipts.

No unnecessary chart complexity.

---

## Autopilot

Consumer language:

```text
Invest:
20 USDT

Every:
Friday

Keep portfolio balanced:
ON

Max automatic trade:
10 USDT

Maximum slippage:
0.5%

Sell existing positions automatically:
OFF
```

---

## Receipts

Timeline:

```text
BOUGHT

SKIPPED

REBALANCED

BLOCKED

FAILED
```

Every item gets one plain-English explanation.

---

# 68. MARKET STATUS UX

When verified data exists:

show:

```text
US market open
```

or:

```text
US market closed
```

and next-open time only when supplied/derivable from verified API data.

Do not calculate market holidays from memory.

---

# 69. QR

QR contains HTTPS Bell URL only.

Example:

```text
https://firstbell.example/b/ai-compute
```

Do not put in QR:

- private key;
- auth token;
- wallet session;
- user secret;
- payment credential.

Test QR with an actual phone.

---

# 70. MAINNET SAFETY

Default:

```env
EXECUTION_MODE=DRY_RUN
MAINNET_WRITE_ENABLED=false
LIVE_MAX_TRADE_USD=5
```

No code path may broadcast unless:

```text
EXECUTION_MODE == LIVE
```

AND:

```text
MAINNET_WRITE_ENABLED == true
```

AND:

explicit human action occurs.

Scheduled mainnet Autopilot is disabled until Maris explicitly enables it.

---

# 71. REAL MONEY

Before a live transaction:

display:

```text
NETWORK:
BSC MAINNET

REAL FUNDS:
YES

MAX AMOUNT:
X USDT
```

Maris must explicitly approve first live transaction.

Never automatically increase test amount.

---

# 72. LIVE TRANSACTION TARGET

First proof:

approximately:

```text
≤ 5 USDT
```

or smallest practical amount.

Later demo may use:

```text
5–10 USDT
```

only with explicit approval.

---

# 73. ERROR UX

Never expose raw API JSON on main consumer flow.

Examples:

```text
This stock is temporarily unavailable.

No executable route is available for this amount.

The quote changed, so we refreshed it.

Your wallet does not contain enough USDT.

A small amount of BNB may be required for network gas.

The transaction simulation failed, so nothing was submitted.

You rejected the transaction.

Your portfolio rule blocked this purchase.
```

Technical details may be behind:

```text
Details
```

---

# 74. DX EVIDENCE — CRITICAL

Developer Experience Report = 25% of score.

Maris writes the actual report narrative.

Claude/Codex collect raw evidence.

Agents must NEVER invent:

- frustration;
- opinions;
- onboarding times;
- documentation problems;
- API issues.

---

# 75. RAW DX LOG

Maintain machine-readable:

```text
logs/dx.jsonl
```

Gitignore sensitive/raw logs as appropriate.

Each API call should capture:

```text
timestamp UTC

module

endpoint

HTTP status

business error code

error message

latency ms

retry count

schema validation result

market state if relevant

note
```

---

# 76. HUMAN DEVEX NOTES

Maintain:

```text
docs/DEVEX_RAW.md
```

This file may contain:

- raw factual observations generated by Claude;
- exact errors;
- URLs;
- response behavior;
- timestamps;
- debugging steps.

Maris adds:

- personal observations;
- judgement;
- recommendations;
- final prose.

Claude does NOT write the final DevEx narrative.

---

# 77. AUTOMATED DX METRICS

Generate:

```text
docs/DX_EVIDENCE.md
```

with factual tables only.

Include where enough samples exist:

```text
request counts

success/error counts

errors grouped by code

latency p50

latency p95

schema mismatch counts

retry counts

provider availability

observed liquidity differences

observed slippage by trade size

weekend vs weekday behavior

open-market vs closed-market observations

provider differences for same ticker
```

Do not manufacture statistical significance.

If sample size is tiny:

show sample count.

---

# 78. DOCUMENTATION PROBLEM LOG

When docs cause a real problem:

record:

```text
URL

section

what documentation stated

what live behavior showed

error

workaround

time spent
```

This becomes valuable DevEx evidence.

---

# 79. README

README must include:

1. what First Bell is;
2. problem;
3. product;
4. why BNB Chain;
5. architecture;
6. Binance APIs used;
7. Bell model;
8. fork model;
9. Autopilot model;
10. wallet architecture;
11. local setup;
12. environment variables;
13. DRY_RUN vs LIVE;
14. mainnet warning;
15. demo flow;
16. known limitations;
17. DevEx evidence link;
18. special-prize integrations;
19. explicit incomplete/stretch items.

Add Mermaid architecture diagram.

---

# 80. TESTING

## Unit tests

Required:

```text
Bell weight validation

fork behavior

content hash/versioning

contribution-first allocation

stable reserve

max weight

max trade

slippage block

selling disabled

idempotency

quote freshness handling

API error normalization

auth signing test vectors once verified

receipt state transitions
```

---

## Integration tests

Where credentials/API access permit:

```text
RWA platforms

RWA search

RWA provider normalization

quote

approval builder

transaction simulation

wallet balances

portfolio read
```

---

## Playwright

Keep scope small.

One critical E2E test is enough initially:

```text
landing
→
open Bell
→
connect mocked/test wallet context
→
get quote
→
review
→
simulate
→
receipt
```

Do not burn the week writing a huge browser suite.

---

# 81. PHASE GATES

Never jump randomly between features.

---

## GATE 0 — Repository + docs

Pass when:

- repo initialized;
- app boots;
- strict TS enabled;
- docs created;
- `.env.example`;
- secrets ignored;
- no secret committed;
- official docs index read.

---

## GATE 1 — Authentication

Pass when:

a real harmless authenticated Binance API request succeeds.

Record:

- exact signing scheme;
- sanitized request metadata;
- sanitized response;
- latency;
- any timestamp problems.

---

## GATE 2 — RWA discovery

Pass when:

```text
NVDA
```

returns real BSC tokenized-stock data.

Record:

- actual providers;
- contracts;
- field semantics;
- market fields.

Display live NVDA data in UI.

---

## GATE 3 — Quote

Pass when:

```text
USDT
→
one real NVDA tokenized representation
```

returns an executable quote.

No broadcast yet.

---

## GATE 4 — Simulation

Pass when the candidate transaction is successfully simulated using the documented transaction API flow.

Record:

- inputs;
- response;
- errors;
- gas if available.

---

## GATE 5 — First mainnet buy

This is the most important technical milestone.

Human approval required.

Execute:

```text
≤ 5 USDT
```

or smallest practical amount.

Pass only if:

- BSC mainnet;
- tx confirmed;
- hash saved;
- resulting position verified;
- receipt created.

---

## GATE 6 — Bells

Pass when:

- single-stock Bell works;
- portfolio Bell works;
- QR works;
- share link works;
- Bell stores ticker/intention rather than hard-coded issuer contract.

---

## GATE 7 — Basket buy

Pass when:

- 3-leg dry-run succeeds;
- sequential execution state exists;
- forced failure on leg 2 produces honest partial result.

---

## GATE 8 — Fork

Pass when:

- Bell forks;
- weights editable;
- independent Bell created;
- parent retained for provenance;
- creator has no control over fork.

---

## GATE 9 — Autopilot math

Pass when:

- intentionally drifted portfolio exists;
- contribution-first algorithm directs new money to underweights;
- no automatic selling occurs.

---

## GATE 10 — Guarded execution

Pass when:

- one scenario produces EXECUTE;
- one produces SKIP/BLOCK;
- both have correct human-readable receipt.

---

## GATE 11 — Agentic Wallet feasibility

Pass when official integration has been:

```text
DOC VERIFIED
```

and preferably:

```text
LIVE VERIFIED
```

If unsupported:

document limitation and proceed.

---

## GATE 12 — Agent Studio

Pass only with actual deployment proof.

---

## GATE 13 — B402

Pass only after a real useful paid machine-to-machine request.

---

# 82. DAY PLAN — DEADLINE DISCIPLINE

Current date:

**4 October 2026**

Deadline:

**11 October 2026, 12:00 UTC**

Aim to finish core implementation BEFORE deadline day.

---

## OCT 4 — Recon + API proof

Target:

```text
Gate 0
Gate 1
most of Gate 2
```

Do:

- initialize repo;
- read llms.txt;
- inspect Authentication;
- inspect RWA;
- inspect Trading integration flow;
- inspect Transaction simulate;
- create verified-facts system;
- get first authenticated request;
- capture first fixtures;
- resolve NVDA.

Do NOT spend the day designing UI.

---

## OCT 5 — Quote + simulation + minimal stock UI

Target:

```text
Gate 2
Gate 3
Gate 4
```

Do:

- RWA integration;
- Zod validation;
- quote;
- approval requirements;
- transaction build;
- simulation;
- `/s/NVDA`;
- receipt skeleton.

---

## OCT 6 — FIRST MAINNET BUY

Non-negotiable target:

```text
GATE 5
```

By end of Tuesday 6 Oct:

a real small BSC mainnet tokenized-stock transaction should work.

If this is not working:

stop building bells/autopilot and fix execution.

---

## OCT 7 — Bells + QR + basket

Target:

```text
Gate 6
Gate 7
```

Do:

- Bell persistence;
- 3–4 curated Bells;
- QR;
- share links;
- basket sequential execution;
- partial failure receipts.

Also begin Agentic Wallet feasibility spike.

---

## OCT 8 — Fork + Autopilot

Target:

```text
Gate 8
Gate 9
Gate 10
```

Do:

- fork;
- contribution-first algorithm;
- policy engine;
- decision log;
- guarded skip.

---

## OCT 9 — Polish core + Agentic Wallet

Core should be substantially finished.

Target:

- mobile polish;
- deployment;
- README;
- Codex adversarial review;
- Agentic Wallet integration if verified;
- fix all demo-path issues.

Do not add new core features.

---

## OCT 10 — Special prize / evidence / video prep

Only after core works.

Possible:

- Agent Studio;
- B402;
- MCP;
- strategy update.

Also:

- DevEx evidence;
- demo script;
- deployment testing;
- clean fresh-clone setup;
- secret scan;
- mainnet runbook.

---

## OCT 11 — SUBMISSION ONLY

Do not plan major engineering work for deadline morning.

Use for:

- final video;
- submission form;
- final repo verification;
- links;
- DevEx report;
- final transaction evidence.

---

# 83. PRIORITY ORDER

When time gets tight:

```text
1. Real mainnet buy

2. Correct simulation

3. Bells + QR

4. Professional mobile UX

5. Fork

6. Contribution-first Autopilot

7. Receipts

8. Agentic Wallet

9. Agent Studio

10. B402

11. MCP

12. Card/on-ramp

13. Paymaster

14. DeFi
```

Never invert this list merely to collect APIs.

---

# 84. DESIGN OF CURATED BELLS

Do not spend time building a giant discovery catalog.

Ship 3–4 polished examples.

Possible categories:

```text
AI Compute

Mega Tech

First Stock Starter

Balanced Tech + USDT
```

Use only supported live assets.

---

# 85. CLAIMS DISCIPLINE

Never say:

```text
guaranteed return

safe investment

risk-free

prevents losses

AI knows the best stock

best-performing stock

protected from market losses

guaranteed better execution
```

First Bell is:

> software that helps users execute and maintain their own transparent portfolio rules.

---

# 86. LLM BOUNDARY

LLMs may:

- explain;
- summarize;
- propose;
- translate human text to a structured policy draft.

LLMs may NOT:

- generate arbitrary calldata;
- bypass policy;
- select unsupported contracts;
- sign;
- broadcast;
- decide to ignore risk guards;
- invent market data.

---

# 87. RECEIPT EXAMPLES

## Executed

```text
BUY EXECUTED

NVIDIA

10.00 USDT

Provider:
<verified provider>

Simulation:
Passed

Policy:
Passed

Transaction:
0x...

Reason:
NVIDIA was below your target allocation.
```

---

## Skipped

```text
BUY SKIPPED

NVIDIA

10.00 USDT

Reason:
The available quote exceeded your configured slippage limit.

Action:
10 USDT remained unspent.
```

---

## Partial basket

```text
BASKET PARTIALLY COMPLETED

NVDA
Executed

MSFT
Failed during simulation

GOOGL
Not started

AMZN
Not started

No automatic reversal was performed.
```

---

# 88. DEPLOYMENT

Prefer simple deployment.

Likely:

```text
Vercel
```

or equivalent.

If SQLite persistence is unsuitable for deploy target:

switch to managed PostgreSQL.

Do not redesign the backend.

---

# 89. SECRET SAFETY

Before every public push:

check:

```text
git diff

git status
```

Search for:

- API keys;
- secrets;
- private keys;
- auth tokens;
- wallet session material.

Use a simple secret scanner/pre-commit check if practical.

---

# 90. GIT PRACTICE

Commit small working steps.

Examples:

```text
feat(binance): add verified signed api client

feat(rwa): resolve tokenized stocks by ticker

feat(trading): quote usdt stock purchases

feat(execution): simulate swap before signing

feat(bells): create shareable portfolio bells

feat(portfolio): implement contribution-first rebalance

feat(receipts): record partial basket execution

test(auth): add signing test vectors

docs(dx): add verified api observations
```

Never produce one giant final commit.

---

# 91. STATUS REPORT FORMAT

At the end of each phase:

```text
CURRENT GATE:
Gate X — name

DONE:
- ...

LIVE VERIFIED:
- ...

SIMULATION VERIFIED:
- ...

DOC VERIFIED ONLY:
- ...

NOT VERIFIED:
- ...

CODEX REVIEW:
pending / passed / issues

DX EVIDENCE ADDED:
- ...

BLOCKERS:
- ...

NEXT:
- ...

MAINNET FUNDS SPENT:
X
```

Do not say:

> "Almost done."

Use evidence.

---

# 92. CODEX REVIEW GATE

Before a phase is marked complete, Codex reviews relevant backend/safety behavior.

At minimum Codex must review:

```text
authentication

RWA schemas

provider normalization

approval handling

quote expiry

simulation

single trade state machine

basket partial failure

allocation algorithm

idempotency

policy engine

mainnet guard
```

---

# 93. MAINNET RUNBOOK

Maintain:

```text
docs/MAINNET_RUNBOOK.md
```

Before any real purchase:

check:

```text
correct wallet

correct BSC chain

correct token

verified quote

max value <= LIVE_MAX_TRADE_USD

simulation passed

sufficient USDT

sufficient native gas

MAINNET_WRITE_ENABLED=true

explicit user confirmation
```

After:

record:

```text
tx hash

block

stock

provider

USDT spent

stock received

final wallet balance

receipt ID
```

---

# 94. DEMO SCRIPT

Maximum:

```text
4 minutes
```

Recommended structure:

## 0:00–0:25

Problem:

> Tokenized stocks exist onchain, but discovery, wallet execution and portfolio maintenance still feel like separate workflows.

---

## 0:25–0:50

Show a Bell:

```text
AI Compute
```

Show:

- share link;
- QR;
- transparent holdings.

---

## 0:50–1:40

Investor opens Bell.

Show:

- wallet;
- 5 USDT or similar;
- real RWA data;
- quote;
- simulation;
- live BSC execution;
- transaction receipt.

---

## 1:40–2:05

Show resulting stock holding.

Show Bell receipt.

---

## 2:05–2:35

Fork Bell.

Change one weight.

Save independent version.

---

## 2:35–3:15

Turn on Autopilot.

Show:

- portfolio drift;
- contribution-first allocation;
- no unnecessary selling.

---

## 3:15–3:35

Show a blocked/skipped trade.

Example:

```text
Skipped because quote exceeded your configured limit.
```

---

## 3:35–3:50

If genuinely working:

show Agentic Wallet / Agent Studio / B402.

Do not show fake integrations.

---

## 3:50–4:00

Close:

> First Bell makes tokenized stocks distributable. Discover a stock or portfolio anywhere, own the underlying assets directly, fork it into your own strategy, and let a permissioned agent keep it inside the rules you choose.

---

# 95. DEFINITION OF DONE

The project is complete only when:

- production build passes;
- core tests pass;
- mobile UI works;
- deployment works;
- signed Binance API request works;
- RWA discovery works;
- quote works;
- simulation works;
- one real BSC mainnet stock purchase works;
- stock position is verified afterward;
- Bell creation works;
- QR works;
- Bell investment dry-run works;
- basket partial failure handled honestly;
- fork works;
- contribution-first rebalancing works;
- at least one guarded SKIP works;
- receipts work;
- no fake production data;
- no secrets leaked;
- DevEx factual evidence exists;
- README works from clean clone;
- demo path rehearsed;
- no UNVERIFIED markers remain on core demo path.

Agentic Wallet / Agent Studio / B402 may remain labelled as stretch if they cannot be completed honestly.

---

# 96. FINAL MANDATE

Build the smallest version of First Bell that completely proves the thesis.

The winning core is:

```text
shareable Bell
↓
real stock discovery
↓
real quote
↓
real simulation
↓
real BSC purchase
↓
verified ownership
↓
forkable portfolio
↓
contribution-first automation
↓
guarded execution
↓
clear receipt
```

Then deepen the AI stack.

When uncertain:

```text
working > impressive-looking

verified > assumed

real response > remembered schema

consumer UX > crypto jargon

deterministic execution > LLM improvisation

honest limitation > fake feature

mainnet safety > deadline panic
```

Proceed until the current phase acceptance criteria are satisfied.

Do not claim success without evidence.

---

# 97. FIRST ACTIONS — START NOW

Execute these in order:

```text
1. Initialize the repository.

2. Add CLAUDE.md.

3. Create:
   docs/STATUS.md
   docs/DECISIONS.md
   docs/VERIFIED_FACTS.md
   docs/API_VERIFICATION.md
   docs/DEVEX_RAW.md
   docs/DX_EVIDENCE.md
   docs/CODEX_QUEUE.md
   docs/MAINNET_RUNBOOK.md
   docs/ARCHITECTURE.md
   docs/DEMO_SCRIPT.md

4. Read:
   hackathon page
   llms.txt
   authentication
   RWA docs
   trading integration flow
   transaction simulation
   wallet documentation

5. Build an endpoint verification table.

6. Verify the authentication/signing scheme.

7. Make one harmless authenticated request.

8. Capture the sanitized real response.

9. Add the verified auth facts to VERIFIED_FACTS.md.

10. Test NVDA RWA search.

11. Capture the real NVDA response.

12. Record which providers actually appear.

13. Build Zod schemas from official docs + real response.

14. Display real NVDA information in a minimal page.

15. Ask Codex to adversarially review:
    auth
    schemas
    assumptions

16. Continue to quote integration.

17. Do not execute any mainnet transaction until Gate 4 simulation passes and Maris explicitly approves.
```

Start with Phase 0 immediately.