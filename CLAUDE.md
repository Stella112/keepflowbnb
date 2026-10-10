# FIRST BELL
# FINAL MASTER ENGINEERING MANDATE
## CLAUDE.md / AGENTS.md

**Version:** 2.0 — October 8, 2026  
**Project:** First Bell  
**Network:** BNB Smart Chain Mainnet  
**Chain ID:** 56  
**Hackathon:** BNB Hack: Tokenized Stocks Edition  
**Deadline:** October 11, 2026, 12:00 UTC  
**Target internal freeze:** October 10, 2026, 20:00 UTC  
**Product owner:** Maris  
**Lead engineer:** Claude Code  
**Independent engineer and verifier:** Codex

**Product tagline:** Scan it. Own it. Fork it. Automate it.

**Product thesis:** First Bell makes investment intent portable.

---

# 0. THE MISSION

Build a fully functioning First Bell application using real BNB Chain infrastructure, verified Binance integrations, actual tokenized stocks, real wallet transactions and production-grade security boundaries.

First Bell transforms a stock, portfolio or natural-language investment idea into a shareable, versioned and executable investment mandate called a Bell.

Users can discover a Bell, open it through a link or QR, connect Binance Wallet, fund a purchase in USDT, acquire the underlying supported tokenized stocks, fork the portfolio and automate future activity under their own policies.

The existing First Bell MCP makes the same services available to compatible AI assistants.

BNB Agent Studio supplies research and persistent agent capabilities.

Binance Agentic Wallet provides a controlled execution route for supported agent-driven operations.

Paymaster sponsors eligible BSC gas fees through a genuinely compatible transaction pathway.

**The goal is the complete functioning product, not merely a hackathon mockup.**

## Mandatory end-to-end journey

```text
Discover First Bell
        ↓
Open general QR / Bell link / AI assistant
        ↓
Connect Binance Wallet
        ↓
Select or create a Bell
        ↓
Research supported tokenized stocks
        ↓
Review assets and allocations
        ↓
Enter USDT investment amount
        ↓
Resolve actual supported stock tokens
        ↓
Obtain executable market quotes
        ↓
Intersect Bell policy and personal policy
        ↓
Simulate real transactions
        ↓
Check Paymaster eligibility
        ↓
Obtain required wallet authorization
        ↓
Execute on BSC Mainnet
        ↓
Confirm transactions and final balances
        ↓
Generate Bell Receipt
        ↓
Fork / Share / Follow
        ↓
Activate authorized Autopilot
        ↓
Manage through First Bell MCP
```

Every arrow must correspond to actual code and a verified integration.

No stage may be replaced by fabricated behavior.

---

# 1. ABSOLUTE ENGINEERING PRINCIPLES

These rules have priority over all convenience, deadlines and aesthetic preferences.

## 1.1 Build real software

Do not produce a landing-page-only prototype.

Do not stop at scaffolding.

Do not create buttons without functional handlers.

Do not display a successful investment without real confirmation.

Do not replace failing production APIs with fabricated values.

Do not label an unimplemented feature as available.

## 1.2 The entire agreed product remains in scope

The required product includes:

1. Binance Wallet-first onboarding.
2. General and Bell-specific QR entry.
3. Live tokenized-stock discovery.
4. Actual USDT stock purchases.
5. Portfolio Bells, including support for up to eight assets where executable.
6. Shareable links.
7. Forking.
8. Immutable Bell versions.
9. Personal policies.
10. Contribution-first rebalancing.
11. Autopilot.
12. Bell Receipts.
13. Existing First Bell MCP.
14. Natural-language portfolio creation.
15. Research integration.
16. Binance Agentic Wallet.
17. BNB Agent Studio.
18. Paymaster gas sponsorship.
19. x402-enabled paid research or agent services.
20. Production deployment.
21. Security testing.
22. Mainnet evidence.
23. Developer Experience evidence.
24. Hackathon submission readiness.

**No engineer may silently remove these capabilities.**

Implementation may be ordered by dependency.

If a capability is genuinely blocked by missing provider support, credentials, permissions, legal eligibility or an incompatible external API, record that blocker with evidence and escalate it.

Do not invent a workaround that compromises funds or security.

Do not claim the entire product is complete until all mandatory acceptance gates pass.

## 1.3 No hallucinations

Never invent:

- Binance API endpoints.
- Wallet APIs.
- CLI commands.
- SDK exports.
- Token contracts.
- Token decimals.
- Issuer mappings.
- Market prices.
- Quote validity.
- Approval spenders.
- Signing payloads.
- Paymaster capabilities.
- Agentic Wallet session capabilities.
- Transaction hashes.
- Research reports.
- Market status.
- Liquidity.
- Transaction confirmations.
- Successful tests.
- Performance measurements.
- Agent identity registrations.

Every integration assertion must be traceable to authoritative evidence.

## 1.4 Three levels of evidence

A feature may be:

**DOCUMENTATION VERIFIED:** Its API or mechanism is confirmed in an official source.

**LOCALLY VERIFIED:** Code has run successfully against its intended local or external integration with recorded evidence.

**LIVE VERIFIED:** It has operated successfully in its intended deployed or BSC Mainnet environment.

Documentation verification is not live verification.

A successful simulation is not live execution.

A transaction hash is not final settlement.

A frontend screenshot is not proof of an integration.

## 1.5 No false certainty

If the docs and live behavior disagree, record the discrepancy.

If an assumption has not been tested, label it unverified.

If a provider fails, show the actual error state.

If a market is unavailable, show that it is unavailable.

If a feature needs approval, wait for approval.

Do not state that a capability works because you believe it should.

## 1.6 No unauthorized funds movement

Neither Claude nor Codex can independently authorize spending.

All user transactions require the applicable owner authorization.

Agent execution must remain within previously approved, revocable wallet permissions.

Never ask for seed phrases.

Never put private keys in frontend code.

Never use a founder-controlled backend wallet as an unrestricted substitute for users' wallets.

---

# 2. TEAM STRUCTURE

## 2.1 Maris — Product owner

Maris controls:

- Product vision.
- Final architecture decisions when genuine tradeoffs exist.
- Binance account setup.
- API key registration.
- Wallet setup and access.
- Mainnet funding.
- Financial expenditure approval.
- Paymaster funding approval.
- Agent permission approval.
- External account authorization.
- Final branding.
- Demo approval.
- Developer Experience Report narrative.
- Submission.

Do not assume an agent may make these decisions.

## 2.2 Claude Code — Lead builder

Claude Code is responsible for making the entire product work.

Responsibilities:

### Architecture
- Audit the existing repository.
- Preserve working code.
- Choose compatible dependencies.
- Maintain system architecture.
- Coordinate shared contracts.
- Integrate backend modules.
- Resolve build failures.

### Application
- Wallet-first onboarding.
- Stock pages.
- Bell creation.
- Bell detail pages.
- Link sharing.
- QR generation.
- Forking.
- Version comparisons.
- Portfolio dashboard.
- Purchase review.
- Transaction progress.
- Autopilot dashboard.
- Receipts.
- MCP setup and user flows.

### Integration
- Binance Web3 API integration.
- Transaction-engine wiring.
- Paymaster adapter.
- Agentic Wallet adapter.
- Agent Studio service.
- Research integration.
- MCP service integration.

### Delivery
- Build.
- Typecheck.
- Tests.
- Production deployment.
- README.
- Mobile testing.
- Demo script.
- Submission preparation.

Claude is accountable for the complete integrated result.

## 2.3 Codex — Backend engineer and adversarial verifier

Codex owns the correctness of financially sensitive infrastructure.

Responsibilities:

### Binance infrastructure
- Authentication.
- Request signing.
- Zod schemas.
- Real response fixtures.
- Rate limiting.
- Error handling.
- Token resolution.
- Quote validation.
- Approval verification.
- Transaction preparation.
- Simulation.
- Broadcasting.
- Confirmation reconciliation.

### Financial correctness
- Basis-point allocation.
- Integer amount arithmetic.
- Token decimal conversion.
- Quote expiry.
- Reserve handling.
- Exposure calculations.
- Provider normalization.
- Partial basket execution.
- Idempotency.

### Security
- Policy engine.
- Authorization checks.
- MCP security.
- Wallet permission boundaries.
- Paymaster eligibility constraints.
- Agent execution isolation.
- Replay protection.
- Sensitive-data handling.

### Independent verification
Codex must challenge Claude's implementation.

Codex must deliberately attempt to find:

- Unsafe signing.
- Unauthorized mainnet execution.
- Stale quotes.
- Wrong-chain execution.
- Duplicate purchases.
- Approval-spender mistakes.
- Policy bypasses.
- Incorrect financial calculations.
- Leaked secrets.
- Invented UI outcomes.
- Incorrect transaction success states.

Codex does not simply approve Claude's work.

## 2.4 Division of work

Claude owns user-facing implementation and overall integration.

Codex owns sensitive backend implementation and independent review.

When both must work on related code:

1. Define the shared interface.
2. Assign file ownership.
3. Implement independently.
4. Test the components.
5. Integrate.
6. Run system-level tests.
7. Conduct independent review.
8. Fix findings.
9. Retest.

Do not have both agents overwrite the same files simultaneously.

## 2.5 Codex handoff

If direct Codex execution is available, use the actual supported interface.

If not, Claude must create a runnable task in:

`docs/CODEX_QUEUE.md`

Each task must specify:

```text
Task ID:
Objective:
Relevant documentation:
Files to inspect:
Files permitted to modify:
Expected interfaces:
Security constraints:
Required tests:
Acceptance criteria:
Evidence to return:
Files not to modify:
```

Never claim Codex reviewed anything without an actual Codex result.

---

# 3. OPERATING RULES

## 3.1 Inspect before editing

First inspect:

- Repository structure.
- Current branch.
- Uncommitted changes.
- Commit history.
- Existing First Bell MCP.
- Existing API clients.
- Existing wallet logic.
- Existing database.
- Existing policies.
- Current UI.
- Existing tests.
- Environment variables.
- Current deployment.

Do not rewrite functional modules unnecessarily.

Do not delete existing work.

## 3.2 Stop-and-ask conditions

Stop and request an exact human action only when:

1. API credentials or external account access is needed.
2. A real-money transaction requires approval.
3. A paid service requires funding authorization.
4. A wallet permission must be approved.
5. A legal or account-eligibility question prevents use.
6. Official documentation cannot resolve a material security-sensitive choice.
7. A mandatory capability is proven unsupported by the available infrastructure.
8. A change would alter custody or execution authority.

For routine engineering decisions, choose the most conservative viable solution, document it and continue.

## 3.3 Mainnet execution

Start with:

```env
EXECUTION_MODE=DRY_RUN
MAINNET_WRITE_ENABLED=false
AUTOPILOT_LIVE_ENABLED=false
```

Explicit human approval is required before enabling a financial write operation.

Never automatically change these flags to bypass safeguards.

## 3.4 Continuous execution

Work through each phase until its acceptance tests pass or a real external blocker is evidenced.

Do not stop merely because code was generated.

Do not provide generic reassurance or long progress essays.

At the end of each phase, report factual results.

---

# 4. HACKATHON REQUIREMENTS AND ELIGIBILITY

Official event:

https://www.bnbchain.org/en/hackathons/tokenized-stocks

Required network: BSC Mainnet.

At least one of these tokenized-stock families must be central:

- bStocks.
- Ondo.
- xStocks.

Spot only.

No perps.

A public repository and reproducible project access are required.

Prepare a short demo video.

The Developer Experience Report is mandatory and accounts for 25% of judging.

## Judging

- Technical implementation: 30%.
- Creativity and originality: 25%.
- Developer Experience Report: 25%.
- Product quality and UX: 20%.

## Special prizes

Agentic Wallet / Wallet Skills: $2,000.

BNB Agent Studio: $2,000.

Build both integrations to compete credibly, but never claim special-prize eligibility merely because a package was installed.

## Eligibility gate

Check the official eligibility and restricted-region rules before initiating paid mainnet work or submission.

The event excludes certain locations and residences, including the UK and Canada.

Do not infer eligibility from nationality, wallet address or VPN location.

Do not recommend bypassing regional restrictions.

Record the human-confirmed eligibility status without collecting unnecessary personal details.

---

# 5. PROJECT REPOSITORY AND STACK

Preserve the existing working architecture when viable.

For a new or incomplete implementation, the preferred stack is:

- Next.js App Router.
- TypeScript strict.
- Tailwind CSS.
- viem.
- wagmi where compatible with Binance Wallet.
- Zod.
- Drizzle ORM.
- PostgreSQL for reliable hosted persistence.
- SQLite only when deployment persistence requirements allow.
- Vitest.
- Playwright for the critical browser journey.
- An official maintained MCP SDK.
- Verified Binance Web3 API client or exact documented signing implementation.
- Lightweight QR-generation library.

Avoid needless microservices.

Do not introduce Redis unless genuinely needed.

Do not build a custom indexer.

Do not create custom smart contracts unless a required capability truly cannot be implemented safely through the documented infrastructure and Maris approves the design.

## Suggested modules

```text
src/
  app/
  components/
  lib/
    binance/
    wallets/
    chain/
    assets/
    bells/
    execution/
    policy/
    paymaster/
    autopilot/
    research/
    agent-studio/
    agentic-wallet/
    mcp/
    receipts/
  db/
  tests/

docs/
  STATUS.md
  DECISIONS.md
  VERIFIED_FACTS.md
  API_VERIFICATION.md
  ARCHITECTURE.md
  SECURITY.md
  MAINNET_RUNBOOK.md
  CODEX_QUEUE.md
  CODEX_REVIEW.md
  DEVEX_RAW.md
  DEVEX_HUMAN_NOTES.md
  DX_EVIDENCE.md
  DEMO_SCRIPT.md
  SUBMISSION_CHECKLIST.md
  BLOCKERS.md
  RISK.md
  evidence/
```

The actual layout may differ if existing code should be preserved.

## Environment template

Create `.env.example` with names, never secrets.

Candidate configuration:

```env
BINANCE_WEB3_API_KEY=
BINANCE_WEB3_SECRET_KEY=
BINANCE_WEB3_BASE_URL=https://web3.binance.com/build

BSC_RPC_URL=
DATABASE_URL=
NEXT_PUBLIC_APP_URL=

EXECUTION_MODE=DRY_RUN
MAINNET_WRITE_ENABLED=false
LIVE_MAX_TRADE_USD=5

AUTOPILOT_LIVE_ENABLED=false
AGENTIC_WALLET_ENABLED=false

PAYMASTER_ENABLED=false
PAYMASTER_PROVIDER=
PAYMASTER_RPC_URL=

AGENT_STUDIO_ENABLED=false
AGENT_STUDIO_ENDPOINT=

RESEARCH_ENABLED=false
RESEARCH_SPEND_LIMIT_USD=0

MCP_ENABLED=true
```

These are application configuration names, not claimed external API configuration requirements.

Add verified provider-specific variables as required.

Do not expose server-side secrets through `NEXT_PUBLIC_` variables.

---

# 6. OFFICIAL DOCUMENTATION

Use primary sources.

## Binance Web3 API

https://web3.binance.com/en/dev-docs/introduction

https://web3.binance.com/en/dev-docs/authentication

https://web3.binance.com/en/dev-docs/llms.txt

https://web3.binance.com/en/dev-docs/llms-full.txt

## API modules

RWA:

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data

Market:

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/general-data

Trading:

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api

Transaction:

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/transaction-api

Wallet:

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/wallet-api

Address portfolio:

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/address-portfolio

B402:

https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/b402-payments

## Agentic Wallet

https://developers.binance.com/en/docs/products/agentic-wallet/welcome

https://developers.binance.com/en/docs/products/agentic-wallet/quickstart/install-agentic-wallet

https://developers.binance.com/en/docs/products/agentic-wallet/use-cases/trading/stock-trading

https://developers.binance.com/en/docs/products/agentic-wallet/reference/skills

https://github.com/binance/binance-skills-hub

## Binance Wallet dApp testing

https://developers.binance.com/en/docs/products/web3-dapp/self-testing

## BNB Agent Studio

https://www.bnbchain.org/en/bnb-agent-studio

## BSC Paymaster

https://docs.bnbchain.org/bnb-smart-chain/developers/paymaster/overview/

https://docs.bnbchain.org/bnb-smart-chain/developers/paymaster/wallet-integration/

## Other

https://docs.bnbchain.org

https://bsctrace.com

https://pancakeswap.finance

https://github.com/bnb-chain/stockanalyst-agent-demo

## Verification record

For each integration record:

- Exact documentation URL.
- Date inspected.
- Endpoint/package/command.
- Authentication.
- Parameters.
- Response fields.
- Network.
- Permissions.
- Error behavior.
- Real test result.
- Evidence location.
- Known limitations.

Never rely on this mandate as a replacement for current documentation.

---

# 7. BINANCE API AUTHENTICATION

The official Binance Web3 API uses:

```text
Base URL:
https://web3.binance.com/build

Required headers:
X-OC-APIKEY
X-OC-TIMESTAMP
X-OC-SIGN
```

The documented HMAC-SHA256 signing construction is:

```text
preHash =
  timestamp +
  UPPERCASE_HTTP_METHOD +
  full_request_path_with_query +
  raw_request_body

signature =
  Base64(HMAC_SHA256(secret, preHash))
```

The signed request path must include `/build`.

The path and query serialization must match the bytes sent on the wire.

Verify the exact signing behavior from the current Authentication page.

## Required tests

- Valid signature.
- Missing `/build` prefix.
- Incorrect timestamp.
- Wrong method.
- Reordered query string.
- Modified body after signing.
- Invalid API key.
- Clock skew.
- Request timeout.
- Rate limit.
- Network failure.
- Nonzero business error code.

Use a fixed timestamp and dummy secret for deterministic signature tests.

Capture the first real successful authenticated response.

Store a sanitized fixture.

Never retry a state-changing request blindly.

---

# 8. BINANCE API MODULES

Use real documented endpoints.

The following paths are candidates from the official documentation and must be checked before implementation.

## RWA

```text
GET /api/v1/dex/market/rwa/platforms
GET /api/v1/dex/market/rwa/tokens
GET /api/v1/dex/market/rwa/search
GET /api/v1/dex/market/rwa/price
GET /api/v1/dex/market/rwa/underlying-profile
GET /api/v1/dex/market/rwa/underlying-market
```

## Market

```text
POST /api/v1/dex/market/price
POST /api/v1/dex/market/price-info
GET  /api/v1/dex/market/candles
GET  /api/v1/dex/market/token/top-liquidity
```

## Trading

```text
GET /api/v1/dex/aggregator/supported/chain
GET /api/v1/dex/aggregator/quote
GET /api/v1/dex/aggregator/approve-transaction
GET /api/v1/dex/aggregator/swap
```

Additional Trading API methods, including RFQ routes and order-status endpoints, must be handled according to the actual route type.

Do not assume every quote becomes a standard EVM swap transaction.

## Transaction

```text
GET  /api/v1/dex/pre-transaction/gas-price
POST /api/v1/dex/pre-transaction/gas-limit
POST /api/v1/dex/pre-transaction/simulate
POST /api/v1/dex/pre-transaction/broadcast-transaction
```

Use the currently documented transaction and order-status lookups for settlement verification.

## Wallet

Use the current documented balance and transaction-detail endpoints.

## Data validation

Every external response must be runtime-validated.

Build Zod schemas from documented contracts and sanitized real responses.

If the response differs from the expected schema, fail visibly and log the mismatch.

Mocks are permitted for isolated tests only.

Production must not silently return fabricated data.

---

# 9. BINANCE WALLET-FIRST EXPERIENCE

Binance Wallet must be the first and most prominent wallet option.

Use its correct official branding.

Secondary supported BSC wallets can appear below it.

## Connection requirements

Test:

- Binance Wallet discovery.
- Correct provider integration.
- Address retrieval.
- Chain ID 56.
- Network switch.
- Account changes.
- User rejection.
- Wallet disconnection.
- Desktop connection.
- Mobile connection.
- Phone browser.
- Wallet in-app browser when supported.

Do not assume the presence of an EIP-1193 provider automatically means it is Binance Wallet.

Do not fabricate a wallet-connect success screen.

## Wallet creation

Use only a documented supported onboarding path.

Do not assume scanning a QR creates a Binance Wallet.

Do not assume Agentic Wallet is created through the ordinary consumer connection.

If the user does not have a compatible wallet, show the verified onboarding route.

---

# 10. QR CODES AND LINKS

First Bell supports two QR formats.

## General First Bell QR

Opens the First Bell onboarding and investment experience.

## Bell-specific QR

Opens a particular Bell.

Example:

```text
https://firstbell.example/b/ai-compute
```

The URL above is illustrative, not a registered deployment.

A QR encodes only the verified HTTPS URL and non-sensitive routing context.

Never encode:

- Private keys.
- Wallet sessions.
- Signing permissions.
- Seed phrases.
- Secret API credentials.
- Executable calldata.

## Mobile behavior

A person scanning a Bell QR must be able to:

1. Open the correct Bell.
2. See its assets and allocation.
3. Connect Binance Wallet.
4. Choose a purchase amount.
5. Review the execution.
6. Approve the transaction.
7. View the actual result.

Preserve Bell context throughout wallet connection.

QR onboarding and purchase must work on real devices before being marked live.

---

# 11. BELL MANIFEST

A Bell is a portable investment mandate.

It defines investment intent, not custody.

## Required data

- Bell ID.
- Slug.
- Schema version.
- Published version.
- Creator identity.
- Name.
- Description.
- Visibility.
- Underlying assets.
- Target weights.
- USDT reserve.
- Policy.
- Automation preferences.
- Content hash.
- Source Bell/version where forked.
- Creation/publish timestamps.

Example:

```json
{
  "schemaVersion": 1,
  "id": "bell_ai_compute",
  "version": 1,
  "name": "AI Compute",
  "creatorAddress": "0x...",
  "assets": [
    { "ticker": "NVDA", "weightBps": 3000 },
    { "ticker": "MSFT", "weightBps": 2500 },
    { "ticker": "GOOGL", "weightBps": 2000 },
    { "ticker": "AMZN", "weightBps": 1500 },
    { "asset": "USDT_RESERVE", "weightBps": 1000 }
  ],
  "policy": {
    "maxSingleAssetWeightBps": 3500,
    "maxSlippageBps": 50,
    "allowAutomaticSelling": false,
    "contributionFirst": true
  }
}
```

This is First Bell's proposed internal schema, not a Binance response.

## Validation

- Weights total 10,000 basis points.
- No invalid or negative weights.
- No duplicated holdings after normalization.
- No unsupported asset type.
- No arbitrary execution target.
- No invalid policy values.
- No hidden wallet permissions.
- No creator-controlled transaction calldata.

## Versioning

Published Bell versions are immutable.

Create deterministic hashes from canonical serialized content.

Store every published version.

Do not claim a Bell is recorded onchain merely because it has a local content hash.

## Direct ownership

A Bell does not issue a First Bell basket token.

When a user invests, the intended supported tokenized assets are purchased for that user.

The creator receives no custody rights.

---

# 12. CREATE, SHARE, FORK AND FOLLOW

## Create

A user selects holdings and sets percentages.

They may choose a theme or construct a custom portfolio.

A Bell can contain up to eight holdings, subject to verified execution feasibility.

More holdings can be considered later without redesigning the underlying model.

## Share

Generate:

- Canonical URL.
- QR.
- Copy-link action.
- Social preview.

## Fork

Forking creates an independent Bell.

The user may:

- Add assets.
- Remove assets.
- Change weights.
- Modify reserves.
- Tighten policies.
- Change permitted automation.

Preserve source attribution.

Do not copy source wallet permissions.

## Follow

Users may follow a Bell's public updates.

Following is informational by default.

It does not authorize creator-controlled trading.

## Strategy updates

When the creator publishes a new version:

- Detect changes.
- Compare allocations.
- Show an update diff.
- Explain the effect on the follower.
- Check the follower's personal policy.
- Require the applicable user authorization before execution.

Do not allow an upstream creator to override user rules.

---

# 13. STOCK RESOLUTION AND ISSUER SAFETY

A stock ticker is not a token contract.

For every requested ticker:

1. Search actual RWA instruments.
2. Filter to supported BSC assets.
3. Record issuer/platform.
4. Verify contract address.
5. Verify decimals.
6. Check market status.
7. Check trading restrictions.
8. Check available executable routes.
9. Record source and timestamp.

Initial search candidates can include:

```text
NVDA
MSFT
GOOGL
AMZN
TSLA
AAPL
AMD
QQQ
```

Do not claim they are all currently executable.

Use real API responses to determine availability.

## Multiple issuers

Different issuers can represent the same underlying company differently.

Check:

- Token/share ratios.
- Economic exposure.
- Pricing conventions.
- Distribution/dividend treatment where relevant.
- Market availability.
- Liquidity.
- Fees.
- Redemption restrictions.

Never compare issuers merely by output-token count.

If a fair comparison is impossible, disclose the limitation and use a clearly defined verified route.

## Market-hours reference

Do not assume a field called reference price means official exchange closing price.

Verify its exact semantics.

Only enable reference-gap policy rules after the semantics and timestamp treatment have been established.

---

# 14. CORE TRANSACTION ENGINE

This is the most important part of First Bell.

## Required pipeline

```text
WALLET_CONNECTED
        ↓
CHAIN_VERIFIED
        ↓
ASSET_RESOLVED
        ↓
BALANCES_CHECKED
        ↓
QUOTE_REQUESTED
        ↓
QUOTE_VALIDATED
        ↓
POLICY_APPROVED
        ↓
ALLOWANCE_CHECKED
        ↓
APPROVAL_PREPARED_IF_NEEDED
        ↓
APPROVAL_SIMULATED
        ↓
APPROVAL_AUTHORIZED
        ↓
APPROVAL_CONFIRMED
        ↓
QUOTE_REFRESHED_IF_REQUIRED
        ↓
POLICY_RECHECKED
        ↓
SWAP_BUILT
        ↓
SWAP_SIMULATED
        ↓
PAYMASTER_CHECKED
        ↓
USER_AUTHORIZATION
        ↓
TRANSACTION_SUBMITTED
        ↓
TRANSACTION_CONFIRMED
        ↓
BALANCES_VERIFIED
        ↓
RECEIPT_GENERATED
```

Account for route-specific exceptions such as RFQ order signing and asynchronous settlement.

## Quote expiry

Binance Trading documentation describes cached quote identifiers with roughly 30-second validity.

Implement quote expiration explicitly.

A quote must be refreshed before execution if stale.

A refreshed quote requires any relevant new policy checks and simulation.

Do not reuse stale calldata.

## Approval spender

Resolve the exact spender for the selected verified route.

Do not assume every route uses the same spender.

Do not approve an unrelated contract.

Avoid unlimited approvals unless specifically justified, verified and approved.

## Simulation

Simulate the relevant approval and stock purchase before broadcast.

Record:

- Request identity.
- Simulation time.
- Predicted outcome.
- Relevant balance changes.
- Allowance changes.
- Failure reasons.
- Gas estimates.

Simulation success is not transaction success.

## Confirmation

Do not treat a transaction hash as a completed purchase.

Check:

- Chain.
- Transaction receipt.
- Execution status.
- Relevant logs.
- Recipient.
- Actual token balance changes.
- Actual spending.
- Final execution state.

Store reproducible evidence.

## Failure handling

Support:

- Wallet rejection.
- Wrong chain.
- Expired quote.
- Insufficient balance.
- Insufficient gas.
- Approval failure.
- RFQ order rejection.
- Reverted swap.
- Pending transaction.
- Transaction timeout.
- Inconsistent balance.
- Provider failure.

Never automatically repeat a potentially submitted transaction.

Reconcile before retry.

---

# 15. MULTI-ASSET BASKET EXECUTION

The engine must support up to eight assets in a Bell.

Actual executable legs depend on:

- Supported instruments.
- Liquidity.
- Minimum trade sizes.
- USDT balance.
- Gas.
- Sponsorship availability.
- Wallet permissions.

## Allocation

Use integer basis points.

Keep reserve amounts separate.

Use bigint for token base units.

Do not overspend due to rounding.

## Execution

Sequential execution is the default unless a real verified atomic mechanism is provided.

A transaction is complete only after confirmation.

## Partial failure

If leg three fails:

- Preserve successful legs one and two.
- Record their actual balances.
- Stop remaining legs by default.
- Mark the overall basket partially completed.
- Record unspent USDT.
- Present a truthful receipt.
- Never claim the basket fully completed.
- Never automatically reverse purchases.

## Testing

Test:

- One-stock Bell.
- Two-stock basket.
- Four-asset basket.
- Eight-asset plan.
- Eight-asset live execution when actual minimums, liquidity and funds allow.
- Unavailable asset.
- Partial failure.
- Expired quote.
- Insufficient reserve.
- Duplicate execution.
- Wallet cancellation.
- Sponsorship failure.

Do not label eight-asset execution live until it has actually worked.

---

# 16. POLICY ENGINE

The policy engine is deterministic.

An AI cannot change the rules at execution time.

The policy engine must be implemented as pure functions with typed inputs and outputs.

Example:

```ts
type PolicyDecision = {
  allowed: boolean;
  code: string;
  humanReason: string;
  policyVersion: string;
  evaluatedAt: string;
};
```

## Required policy controls

- BSC-only.
- Spot-only.
- Supported issuer.
- Supported token.
- Maximum spend per trade.
- Maximum daily spending.
- Maximum weekly spending.
- Maximum slippage.
- Maximum single-company exposure.
- Minimum USDT reserve.
- Optional liquidity thresholds.
- Quote freshness.
- Price data freshness.
- Trading pause/halt checks.
- Selling permissions.
- Drift thresholds.
- Authorization validity.
- Simulation outcome.

Optional market-gap policies must remain inactive until the reference-price semantics are proven.

## Policy intersection

```text
BELL RULES
     ∩
PERSONAL USER RULES
     ∩
WALLET PERMISSIONS
     ∩
EXECUTION SAFETY CHECKS
     ∩
SPONSOR RULES WHEN SPONSORED
     =
PERMITTED ACTION
```

Sponsor rules govern sponsorship eligibility, not whether an otherwise valid user-funded transaction may proceed.

If sponsorship is denied, a normal-gas fallback requires its own checks and the user's appropriate approval.

A creator cannot override a follower's rules.

An AI cannot override user restrictions.

## Examples

An agent proposes buying 10 USDT of NVIDIA.

If the purchase violates the user's concentration limit, block it.

An agent proposes selling an overweight stock.

If automatic selling is disabled, block it.

An agent proposes executing an expired quote.

Block and re-quote.

Every decision has a clear reason.

---

# 17. CONTRIBUTION-FIRST REBALANCING

Autopilot prioritizes using new contributions to reduce portfolio drift before selling existing positions.

Inputs:

- Target weights.
- Current position values.
- Stablecoin reserve.
- New contribution.
- Per-asset limits.
- Trade minimums.
- Selling permissions.
- Drift threshold.

## Deterministic calculation

For portfolio value V and contribution C:

```text
New portfolio value = V + C

Target value for asset i:
targetWeight_i × (V + C)

Shortfall_i:
max(0, targetValue_i - currentValue_i)
```

Allocate investable contribution toward underweight holdings, subject to:

- Reserve requirements.
- Per-trade limits.
- Exposure limits.
- Minimum trade sizes.
- Available liquidity.
- Rounding.
- Policy rules.

If no valid transaction is possible, retain available USDT and explain why.

## Required tests

- Zero contribution.
- Full allocation.
- Insufficient contribution.
- Maximum exposure.
- Reserve preservation.
- Rounding down.
- No overspending.
- Overweight asset receives no contribution.
- Automatic selling prohibited.
- All trades below minimum.
- No tradable assets.
- Duplicate allocation request.

---

# 18. LIVE AUTOPILOT

Autopilot must support a real operating mode, not only visual previews.

However, live unattended execution requires actual scoped signing permission.

## Modes

**PREVIEW:** Calculates proposed actions.

**DRY_RUN:** Uses real data, quotes and simulation without broadcasting.

**LIVE_AUTHORIZED:** Executes within verified wallet permissions and user-approved policies.

## Required actions

- Enable.
- Disable.
- Pause.
- Resume.
- Change contribution schedule.
- Change limits.
- View next planned contribution.
- View execution history.
- View skipped decisions.
- Inspect receipts.
- Revoke or terminate execution authorization through the supported wallet mechanism.

## Scheduler safety

Create a deterministic idempotency key:

```text
userId:bellId:policyVersion:scheduledPeriod
```

Use a durable unique database constraint and execution state tracking.

A second invocation must not double-buy.

## Security

A cron job does not provide transaction-signing authority.

A server-side scheduler cannot impersonate a user.

Do not rely on stored browser wallet sessions for unattended signing.

Use Binance Agentic Wallet or another explicitly approved, documented, revocable permission mechanism compatible with the actual execution design.

Do not create a central wallet that can spend arbitrary user funds.

## Live proof

Demonstrate:

1. User policy enabled.
2. Valid session/permission.
3. Real portfolio read.
4. Contribution proposal.
5. Valid policy decision.
6. Real quote and simulation.
7. Authorized execution.
8. Mainnet confirmation.
9. Receipt.
10. One independently verified rejected or skipped decision.

Until all necessary permissions are verified, keep autonomous live execution disabled.

---

# 19. FIRST BELL MCP — PRESERVE AND EXPAND

There must be one First Bell MCP.

Do not discard the existing MCP implementation.

Do not create an unrelated Sarf clone.

Audit the existing MCP before modifying it.

## Required MCP tools

Read-only:

```text
search_stock
get_stock
get_stock_research
get_bell
get_bell_versions
get_portfolio
get_portfolio_drift
get_receipt
explain_decision
```

Bell management:

```text
create_bell
fork_bell
modify_bell
compare_bell_versions
```

Natural-language interface:

```text
create_bell_from_prompt
create_policy_from_prompt
modify_bell_from_prompt
```

Execution preparation:

```text
quote_stock
quote_bell
simulate_stock_buy
simulate_bell_buy
preview_next_contribution
preview_rebalance
```

Sensitive execution:

```text
prepare_bell_execution
request_bell_execution
get_execution_status
```

These are desired application-level tool names, not claimed Binance SDK methods.

Reuse verified existing tool names when already implemented.

## Natural-language example

The user tells Claude:

"Create a 100 USDT AI-stock Bell, keep 10% in USDT, cap one stock at 30%, and don't automatically sell."

The MCP:

1. Parses the intent.
2. Retrieves real supported ticker candidates.
3. Retrieves current research where authorized.
4. Produces a proposed Bell.
5. Validates all weights.
6. Produces structured personal policy suggestions.
7. Returns the draft for review.
8. Creates the Bell after required user authorization.

The MCP does not independently spend funds.

## Security

MCP authorization must distinguish:

- Public read.
- Private read.
- User-owned Bell mutation.
- Policy mutation.
- Execution preparation.
- Execution authorization.

Never accept a client-provided wallet address alone as authentication.

Use a verified wallet sign-in/authorization mechanism for sensitive user identity.

Check ownership.

Apply rate limits.

Validate inputs with Zod.

Do not expose arbitrary transaction signing tools.

## Integration tests

Test the actual MCP from a compatible client.

A valid proof must show:

- Client connection.
- Tool discovery.
- Real tool call.
- Actual application result.
- Correct policy behavior.
- No unauthorized financial execution.

---

# 20. BINANCE AGENTIC WALLET

Binance Agentic Wallet is a distinct integration from regular Binance Wallet.

## Prerequisites

Official documentation requires:

- Binance account.
- Existing Binance MPC Wallet.
- Agentic Wallet setup.
- Binance App authorization.
- Appropriate Wallet Skills/CLI.

Do not assume ordinary wallet connection completes these prerequisites.

## Integration objective

Make Agentic Wallet a constrained execution option for First Bell Autopilot and authorized MCP requests.

The user must maintain control of permissions.

## Security requirements

Configure permissions through the supported Binance App settings.

Where available, verify:

- Daily spend limits.
- Asset scopes.
- High-risk confirmations.
- Supported BSC execution.
- Session validity.
- Revocation.
- Failure behavior.

The LLM cannot raise limits or change wallet security settings.

## Multi-user session question

Independently verify whether the documented tooling supports multiple unrelated user sessions in one hosted backend.

Do not assume CLI authentication is a multi-tenant SDK.

If only a single operator workflow is supported, implement and label that exact supported scope.

Do not expose one user's Agentic Wallet session to other users.

## Live acceptance

A working integration requires:

- A real authorized Agentic Wallet setup.
- At least one authenticated capability call.
- Verified restriction enforcement.
- A supported stock-related execution or equivalent permitted onchain proof.
- A recorded denied action.
- A confirmed result where execution was performed.

A package installed on disk does not count.

---

# 21. PAYMASTER — MANDATORY ENGINEERING WORKSTREAM

Paymaster remains central to First Bell.

It must not be silently cut.

Its goal is to let eligible users purchase supported tokenized stocks without separately funding BNB gas.

## Critical architectural fact

The BSC EOA Paymaster flow requires a compatible wallet and transaction-signing path.

The documented workflow includes:

1. Sponsorability check.
2. Zero-gas-price transaction preparation where supported.
3. User signing.
4. Submission through the Paymaster-supported pathway.
5. Onchain confirmation.

Do not assume a normal browser-wallet transaction automatically becomes sponsored.

Do not assume Binance Wallet supports every operation needed for raw signed transaction submission.

## Required investigation

Claude and Codex must jointly determine:

- Which BSC Paymaster service is supported.
- Whether Binance Wallet exposes the required signing/submission behavior.
- Whether the chosen sponsor can sponsor the relevant tokenized-stock approvals and swaps.
- Whether sponsor registration or funding is required.
- Which policies the sponsor can enforce.
- Whether a compatible alternate wallet execution method is necessary.
- The actual mainnet costs.
- How sponsored transaction failure is reported.

Investigate documented providers including applicable EOA Paymaster infrastructure such as MegaFuel where supported.

## Application adapter

Implement an internal abstraction:

```text
checkSponsorship
prepareSponsoredExecution
authorizeSponsoredExecution
submitSponsoredExecution
verifySponsoredExecution
```

Map these abstractions to actual verified provider APIs.

Do not fabricate external RPC methods.

## Sponsorship policy

Only sponsor permitted transactions.

Example restrictions:

- BSC Mainnet.
- Approved stock-token routes.
- Approved router/spender contracts.
- Bounded gas usage.
- Per-wallet budget.
- Per-period budget.
- Valid quote.
- Passing simulation.
- Approved user action.

Reject unrelated transfers.

Reject unsupported tokens.

Reject arbitrary calldata.

## Fallback

If sponsorship is unavailable:

- Explain the failure.
- Show actual BNB gas requirements.
- Allow a normal transaction only with sufficient BNB and valid user approval.
- Preserve Paymaster code and documented blocker.
- Do not say the transaction is gasless.

## Live acceptance

A genuine Paymaster milestone requires a real sponsored BSC Mainnet transaction with:

- Original transaction.
- Relevant sponsorship policy.
- Sponsorship submission evidence.
- Confirmed onchain execution.
- Gas outcome.
- Reproducible receipt.

A sponsorability response alone does not prove gas sponsorship works.

---

# 22. BNB AGENT STUDIO

BNB Agent Studio is the persistent agent and research infrastructure.

It is not the same as First Bell MCP.

## First Bell MCP

Exposes First Bell functionality to external AI clients.

## Agent Studio

Runs or coordinates an autonomous service with its own supported runtime, wallet and identity.

The two must interoperate without being conflated.

## Setup

Official BNB Agent Studio references currently document:

```bash
npm install -g @bnbagent/studio-cli
bag skills install
```

Verify package identity, installation requirements and supported deployment options before installation.

## Agent responsibilities

Build one purposeful First Bell agent.

Suggested duties:

- Retrieve authorized research.
- Monitor public Bell information.
- Examine portfolio drift.
- Prepare strategy-update proposals.
- Generate structured review tasks.
- Produce decision inputs.
- Call First Bell services through controlled interfaces.

It cannot override personal investment policies.

It cannot sign unrestricted user transactions.

## Identity and runtime

Where supported, establish:

- Agent identity.
- Cloud runtime.
- Reachable service endpoint.
- Appropriate wallet.
- Spending limits.
- Health checks.
- Deployment logs.
- Relevant task interface.
- Real operational evidence.

## Mainnet distinction

The BNB-managed free trial may be testnet-only.

Do not represent a testnet trial as BSC Mainnet stock execution.

If production cloud deployment is required, follow the official supported deployment path and obtain required human account authorization.

## Live acceptance

Show:

- Actual deployed agent.
- Reachable endpoint.
- Supported onchain identity registration.
- Real request and response.
- Correct budget policy.
- Operational runtime evidence.
- Actual communication with First Bell services.

---

# 23. STOCK RESEARCH AND x402

First Bell research must be source-grounded.

Do not let a language model arbitrarily generate stock ratings and present them as external analysis.

## Research sources

Use:

- Binance RWA data.
- Binance Market API.
- Verified fundamental and underlying information.
- BNB Agent Studio research services.
- Documented x402-compatible research providers.

## Research workflow

```text
User investment question
        ↓
First Bell MCP
        ↓
Live asset eligibility lookup
        ↓
Verified research request
        ↓
Research provider result
        ↓
Source/timestamp verification
        ↓
Structured Bell proposal
        ↓
Deterministic policy validation
        ↓
User review
```

AI research remains advisory information.

It is not permission to trade.

## x402

Integrate an actual paid research or agent-service call where supported.

Verify:

- Merchant/service identity.
- Actual price.
- Payment token.
- Spending authorization.
- Payment network.
- Payment proof.
- Service response.
- Error handling.
- Budget limit.

Keep research fees separate from the user's portfolio principal.

Do not hardcode the cost of a research report without checking the live price.

Do not fabricate successful payments.

## Asynchronous research

If research takes longer than a normal request:

- Create a job state.
- Poll or receive results using supported mechanisms.
- Display pending status.
- Store the final sourced result.
- Handle timeout and failure.
- Avoid duplicate paid requests.

The core stock-purchase experience must not depend on an optional slow research call.

---

# 24. BELL RECEIPTS

Every important decision requires a truthful record.

## Receipt information

- Bell ID and version.
- Wallet.
- Mode.
- Requested asset.
- Selected issuer.
- Token contract.
- Requested USDT.
- Quote data.
- Slippage.
- Policy result.
- Simulation result.
- Sponsorship result.
- Authorization result.
- Transaction or order ID.
- Network.
- Confirmation status.
- Actual received tokens.
- Remaining USDT.
- Error or skip reason.

## Receipt types

- Purchase.
- Basket purchase.
- Partial execution.
- Policy rejection.
- Autopilot execution.
- Autopilot skip.
- Strategy update.
- Failed execution.

## Integrity

Receipts must correspond to recorded events.

Do not invent missing fields.

A simulated receipt must be labeled simulated.

A partially completed basket must be labeled partial.

An unconfirmed transaction must remain pending.

## MCP explanations

When a user asks:

"Why did my agent skip NVIDIA?"

Retrieve the actual recorded policy decision and explain it.

Do not allow the LLM to invent an explanation.

---

# 25. DATA MODEL

Minimum conceptual entities:

```text
UserWallet
WalletAuthorization
Bell
BellVersion
BellAsset
BellFork
BellFollower
UserPolicy
ExecutionIntent
ExecutionLeg
QuoteSnapshot
PolicyDecision
TransactionRecord
BellReceipt
AutopilotSchedule
AutopilotRun
ResearchJob
ResearchResult
AgentRuntime
SponsorshipAttempt
ApiEvidenceLog
```

Use real database persistence.

Do not depend on ephemeral memory for financial execution state.

Use database uniqueness constraints and transactions for idempotency.

Implement ownership checks for private state.

Persist transaction state transitions.

Allow execution reconciliation after a server restart.

No public route should expose a user's private authorization tokens.

---

# 26. PRODUCT DESIGN

Create a polished, professional financial application.

The visual style should be:

- Minimal.
- Distinctive.
- Refined.
- Mobile-first.
- Accessible.
- Fast.
- Clean typography.
- Restrained color.
- High-quality spacing.
- Clear transaction status.

Avoid generic AI visuals and unnecessary crypto decorations.

Do not imitate Binance's product UI wholesale.

## Required screens

1. Landing.
2. Explore Bells.
3. Stock detail.
4. Connect Binance Wallet.
5. Bell creation.
6. Bell details.
7. Bell investment review.
8. Transaction progress.
9. Transaction receipts.
10. Fork editor.
11. Portfolio.
12. Autopilot.
13. Personal policy settings.
14. MCP/AI integration.
15. Research.
16. Agent execution permissions.
17. Activity/history.

## Primary UX rule

Expose familiar concepts:

- Companies.
- Investment amounts.
- Percentages.
- Wallet.
- Portfolio.
- Buy.
- Share.
- Fork.
- Automate.

Put technical protocol details under expandable advanced sections.

Never hide issuer risks, transaction costs or confirmation status.

## Device testing

Test at approximately 380px viewport width.

Test real phone interaction.

Verify that a QR can be opened from a different device.

Verify wallet handoff and return to the correct Bell.

---

# 27. SECURITY MANDATE

Codex must produce an adversarial review before live execution.

## Mandatory attacks to test

- User A attempts to edit User B's Bell.
- User A attempts to modify User B's policy.
- A malicious MCP client requests an arbitrary transfer.
- A prompt injection attempts to bypass rules.
- An external research result contains instructions to leak secrets.
- A stale quote is replayed.
- A duplicate scheduled run attempts a second purchase.
- An approval targets the wrong spender.
- A transaction uses the wrong token.
- A transaction targets the wrong chain.
- An API response reports success but the transaction reverts.
- A sponsored transaction fails and the app claims gasless completion.
- A wallet session is expired or revoked.
- A user disables automation while a run is pending.
- A portfolio calculation exceeds available USDT.
- A basket partially completes and the UI reports full success.

Test more than the happy path.

## Secret handling

No secrets in:

- Git.
- Browser bundles.
- Public logs.
- Screenshots.
- Documentation.
- Analytics.
- Client-side environment variables.

Run secret scanning before pushing.

## Financial constraints

- No unrestricted approvals.
- No arbitrary transaction destinations.
- No hidden spending.
- No unsupported custody.
- No unauthorized signing.
- No silent chain switching.
- No blind broadcast retries.
- No execution on failed simulation.
- No override of personal policy by AI output.

---

# 28. TESTING

## Unit tests

Cover:

- Manifest validation.
- Basis-point totals.
- Hash determinism.
- Fork independence.
- Token decimal conversion.
- Allocation rounding.
- Stablecoin reserves.
- Exposure.
- Policy intersection.
- Contribution-first rebalancing.
- Quote freshness.
- Idempotency.
- Receipt states.

## API integration tests

Cover:

- Authentication.
- Actual RWA lookup.
- Asset resolution.
- Quote.
- Approval.
- Simulation.
- Balance read.
- Transaction status.
- Malformed API responses.
- API rate limits.
- Timeout.
- Business error codes.

## Wallet tests

Cover:

- Binance Wallet connection.
- Chain verification.
- Rejected signing.
- Wallet switching.
- Disconnect.
- Session expiration.
- Agentic Wallet authorization.
- Permission rejection.

## Paymaster tests

Cover:

- Eligible transaction.
- Ineligible transaction.
- Missing budget.
- Unsupported wallet.
- Failed submission.
- Successful sponsored submission.
- Correct onchain result.

## MCP tests

Cover:

- Actual client connection.
- Existing tools.
- New natural-language tools.
- Invalid allocation.
- Malicious instruction.
- Unauthorized execution.
- Policy rejection.
- Receipt explanation.

## Agent tests

Cover:

- Research request.
- Paid request budget.
- Runtime health.
- Service timeout.
- Duplicate research jobs.
- Permission boundaries.
- Agent Studio integration.

## Browser E2E

At least one full browser scenario must cover the purchase journey.

A supervised live mainnet test must separately prove real financial execution.

## Test reporting

Never report passing tests without execution output.

Record:

- Command.
- Date.
- Exit status.
- Test count.
- Failures.
- Evidence path.

---

# 29. MAINNET RUNBOOK

Before the first mainnet transaction, create:

`docs/MAINNET_RUNBOOK.md`

Include:

- Wallet address.
- Network.
- Asset contract.
- Input USDT contract.
- Approval spender.
- Amount.
- Gas estimate.
- Sponsorship status.
- Expected transaction sequence.
- Current quote information.
- Policy result.
- Simulation result.
- Maximum permitted spend.
- Stop conditions.
- Confirmation procedure.
- Human approval requirement.

## Small live tests first

Start with the smallest genuinely executable amount after human approval.

Do not exceed the configured live-trade cap.

Increase only when necessary to test a valid supported route and after renewed human approval.

## Unknown transaction state

If a transaction times out:

- Do not automatically retry.
- Inspect nonce.
- Inspect transaction hash.
- Check pending state.
- Check receipts.
- Check resulting balances.
- Reconcile.

Only then decide whether another transaction is necessary.

---

# 30. DEVELOPER EXPERIENCE REPORT

The Developer Experience Report represents 25% of the hackathon score.

This is not optional.

Maris owns the personal narrative.

Claude and Codex collect real facts and measurements.

## Required evidence

- Time to first successful API request.
- Authentication problems.
- Incorrect documentation.
- Confusing setup.
- Response schema inconsistencies.
- Rate limits.
- API latency.
- Quote availability.
- Liquidity.
- Slippage.
- Provider differences.
- Market-hours behavior.
- Tokenized-stock reference-price behavior.
- Approval spender differences.
- Transaction simulation.
- Binance Wallet connection.
- Agentic Wallet setup.
- Paymaster compatibility.
- Agent Studio setup.
- x402 payments.
- Suggested developer API improvements.

## Logs

Write sanitized structured logs to:

`logs/dx.jsonl`

Suggested fields:

```text
timestampUtc
module
endpoint
httpStatus
businessCode
businessMessage
latencyMs
retryCount
schemaValidation
marketState
executionMode
result
notes
```

No secrets.

## Reports

`docs/DEVEX_RAW.md` contains direct technical observations.

`docs/DEVEX_HUMAN_NOTES.md` is reserved for Maris's own experience and opinions.

`docs/DX_EVIDENCE.md` contains factual summaries and measurements.

Do not invent DevEx events.

Do not produce AI-authored personal testimony pretending to be Maris.

---

# 31. EVIDENCE-BASED ACCEPTANCE GATES

Every gate must contain proof.

## GATE 0 — Repository and eligibility

- Repository inspected.
- Current implementation recorded.
- Existing MCP identified.
- Eligibility checked.
- Working environment.
- Secrets protected.

## GATE 1 — Binance API

- Real signed request.
- Signing tests.
- Response fixture.
- Error handling.

## GATE 2 — RWA discovery

- Real supported tokenized stock.
- Verified chain.
- Verified contract.
- Verified issuer.
- Actual live response.

## GATE 3 — Binance Wallet

- Real supported connection.
- Correct chain.
- Mobile compatibility.
- Signing flow.

## GATE 4 — Quote and simulation

- Real USDT quote.
- Approval path.
- Policy check.
- Real Binance Transaction API simulation.

## GATE 5 — Mainnet single-stock buy

- Human authorization.
- Actual transaction.
- Onchain confirmation.
- Balance verified.
- Receipt.
- Explorer evidence.

## GATE 6 — Bell

- Create.
- Publish.
- Share.
- QR.
- Immutable version.
- Integrity validation.

## GATE 7 — Fork

- Independent fork.
- Edited weights.
- Correct source attribution.
- Policies remain independent.

## GATE 8 — Basket

- Correct allocation.
- Real executable legs.
- Confirmed purchases.
- Correct partial-failure handling.
- Eight-asset execution tested where supported.

## GATE 9 — Policies

- Deterministic engine.
- Allow and reject tests.
- Personal policy intersection.
- No AI override.

## GATE 10 — Autopilot

- Live position data.
- Drift calculation.
- Contribution-first allocation.
- Real dry-run.
- Idempotency.
- Authorized live execution evidence.
- Rejection evidence.

## GATE 11 — MCP

- Existing MCP preserved.
- Real connected client.
- Natural-language Bell creation.
- Policy drafting.
- Quotes and previews.
- User authorization boundaries.

## GATE 12 — Paymaster

- Actual compatibility verification.
- Sponsor policy.
- Real supported sponsored transaction.
- Confirmed mainnet result.

## GATE 13 — Agentic Wallet

- Authenticated wallet setup.
- Verified spending permissions.
- Real supported operation.
- Restricted-operation denial.
- Actual confirmation evidence where relevant.

## GATE 14 — Agent Studio and x402

- Deployed agent.
- Reachable service.
- Identity/runtime evidence.
- Real paid research/service call.
- Actual structured result.
- Controlled budget.

## GATE 15 — Final product and submission

- Production deployment.
- Phone-tested.
- Public repository.
- Reproducible setup.
- Honest feature inventory.
- Demo.
- DevEx report.
- Security review.
- All mandatory gates verified.

A gate cannot pass on a mock.

A blocked gate remains blocked until the cause is resolved.

---

# 32. EXECUTION ORDER

Build by dependency, not by excitement.

## Phase A — Repository and credentials

- Audit existing work.
- Create documents.
- Check credentials.
- Verify official APIs.
- Make first authenticated call.
- Audit existing MCP.

## Phase B — Single-stock execution

- Discover stock.
- Connect Binance Wallet.
- Quote.
- Policy.
- Approve.
- Simulate.
- Execute.
- Verify.
- Receipt.

This is the first mainnet milestone.

## Phase C — Bell system

- Manifest.
- Create.
- Publish.
- Version.
- Share.
- QR.
- Fork.
- Multi-asset execution.

## Phase D — MCP and intelligence

- Preserve existing MCP.
- Expand tools.
- Natural-language Bell creation.
- Policy generation.
- Research retrieval.
- Explainability.

## Phase E — Sponsorship

- Provider investigation.
- Binance Wallet compatibility.
- Sponsorship policy.
- Supported transaction signing.
- Real mainnet sponsored execution.

## Phase F — Autopilot and Agentic Wallet

- Portfolio drift.
- Contribution-first allocator.
- Schedule.
- Idempotency.
- Wallet permissions.
- Dry-run and live execution.
- Receipts.

## Phase G — Agent Studio and x402

- Agent deployment.
- Identity.
- Runtime.
- Research/payment integration.
- MCP coordination.
- Budget controls.

## Phase H — Polish and submission

- E2E tests.
- Security audit.
- Fixes.
- Production deployment.
- Phone tests.
- Demo.
- DevEx report.
- Submission.

All phases are delivery targets.

Dependency order must not become an excuse for silently removing later phases.

---

# 33. DEADLINE STRATEGY

## October 8

- Audit repo.
- Validate existing MCP.
- Verify documentation.
- Establish authenticated Binance calls.
- Confirm wallet and provider prerequisites.
- Initiate Paymaster compatibility investigation.

## October 9

- Complete real stock discovery.
- Complete quote/simulation.
- Complete wallet connection.
- Prove small authorized mainnet purchase.
- Implement Bells and forks.
- Integrate MCP foundations.

## October 10

- Finish baskets.
- Finish policies and Autopilot.
- Complete Paymaster integration attempts and tests.
- Complete Agentic Wallet integration.
- Complete Agent Studio/x402 integration.
- Fix security findings.
- Deploy.
- Collect final DevEx evidence.

## October 10, 20:00 UTC

Target internal code freeze.

From this point, prioritize fixing critical failures over adding unrelated functionality.

## October 11, before 12:00 UTC

- Final mainnet verification.
- Final deployment check.
- Final security review.
- Record demo.
- Finish human-authored DevEx report.
- Verify public links.
- Submit.

The target is every feature functioning live.

If a genuine blocker prevents complete delivery, it must remain recorded rather than being silently cut or falsely completed.

Do not jeopardize the complete submission while repeatedly attempting an unsupported external integration.

---

# 34. DEMO REQUIREMENTS

Target a video of four minutes or less.

The live demo should show the strongest functioning end-to-end journey.

Suggested sequence:

1. First Bell introduction.
2. Open Bell from share link/QR.
3. Connect Binance Wallet.
4. Show real stock and portfolio data.
5. Request actual USDT quote.
6. Show policy evaluation.
7. Simulate and authorize.
8. Show confirmed mainnet purchase.
9. Show assets in wallet.
10. Open Bell Receipt.
11. Fork and edit the Bell.
12. Use First Bell MCP to create a new Bell by natural language.
13. Demonstrate Autopilot and its limits.
14. Demonstrate verified Paymaster, Agentic Wallet, Agent Studio and x402 capabilities where live.

Do not pretend a previously recorded demo is happening live.

A genuine recorded transaction may be used as evidence if its status and date are clear.

Never insert a fake success screen.

---

# 35. OUT OF SCOPE

Do not expand into:

- Perpetual futures.
- Margin.
- Leverage.
- Options.
- Short selling.
- Prediction markets.
- Proprietary stock tokens.
- Unnecessary vaults.
- Custody contracts.
- Copy-trading funds.
- Price prediction models.
- General AI trading bots.
- Social feeds.
- NFTs.
- Governance tokens.
- Cross-chain bridges.
- Custom exchanges.
- Unrelated payment products.
- Creator revenue-sharing systems.
- DeFi yield on unused USDT.
- Unverified card onramps.
- Complex multi-agent debates.

If one of these features is necessary to implement a required First Bell capability, document exactly why and seek approval before adding it.

The existence of related Binance APIs does not justify including every module.

---

# 36. PROGRESS REPORT FORMAT

After each completed phase, report:

```text
FIRST BELL — ENGINEERING STATUS

CURRENT PHASE:

VERIFIED LIVE:
- ...

VERIFIED LOCAL:
- ...

IMPLEMENTED, NOT VERIFIED:
- ...

BLOCKED:
- ...

CODEX REVIEW:
- Pending / Passed / Issues found

TESTS:
- Command:
- Passed:
- Failed:

BINANCE API EVIDENCE:
- ...

MAINNET TRANSACTIONS:
- Count:
- Actual funds spent:
- Transaction references:

PAYMASTER:
- ...

MCP:
- ...

AGENTIC WALLET:
- ...

AGENT STUDIO:
- ...

DEVEX EVIDENCE:
- ...

TOP THREE NEXT ACTIONS:
1.
2.
3.
```

Never use ambiguous statements such as:

- "Should work."
- "Basically done."
- "Production-ready" without verification.
- "Connected" when only configured.
- "Gasless" without actual sponsored execution.

---

# 37. FINAL COMPLETION CONDITIONS

Do not declare First Bell fully complete until:

- Real Binance API integrations work.
- Binance Wallet connection works.
- A real supported stock purchase succeeds on BSC Mainnet.
- The resulting balance is verified.
- Bells can be created, shared, versioned and forked.
- Multi-asset execution works as documented.
- Policies are enforced.
- Receipts are truthful.
- The existing MCP works from an actual client.
- Natural-language requests produce valid Bell proposals.
- Autopilot executes only with authorized permissions.
- Agentic Wallet restrictions have been demonstrated.
- Paymaster sponsorship has been demonstrated on a real qualifying transaction.
- Agent Studio is deployed and operational.
- x402 research/service integration has been demonstrated.
- Security review passes.
- Critical E2E tests pass.
- The deployed application works on mobile.
- The Developer Experience evidence is complete.
- The public repository and submission artifacts are ready.

The final verdict must be:

**COMPLETE — ALL REQUIRED GATES VERIFIED**

or

**INCOMPLETE — SPECIFIC GATES BLOCKED OR UNVERIFIED**

No third category may be used to disguise incomplete required work.

A working subset may be submitted honestly if the deadline arrives, but it must not be described as the complete product.

---

# 38. FIRST EXECUTION INSTRUCTIONS

Claude Code, execute the following now.

### Task 1: Inspect

Audit the existing First Bell repository.

Do not assume it is empty.

Locate the existing MCP before modifying architecture.

### Task 2: Verify

Read official Binance and BNB documentation.

Record integration facts.

Confirm eligibility and external account prerequisites requiring human action.

### Task 3: Establish evidence

Create the status, verification, security, Codex queue and DevEx evidence files.

### Task 4: Assign backend review

Create specific Codex tasks for:

- Authentication.
- Stock resolution.
- Transaction engine.
- Policy engine.
- Paymaster.
- Agentic Wallet.
- MCP authorization.
- Mainnet safety.

### Task 5: Prove a real API call

Implement or verify Binance Web3 authentication.

Execute one harmless authenticated read request.

Save sanitized evidence.

### Task 6: Prove stock execution

Resolve a real tokenized stock.

Build an actual USDT quote.

Simulate the transaction.

Prepare the human-approved small mainnet purchase.

Confirm actual execution and final balances.

### Task 7: Build the complete product

Continue through Bells, baskets, forking, existing MCP, policies, Autopilot, Paymaster, Agentic Wallet, Agent Studio and x402.

### Task 8: Independently verify

Run tests.

Have Codex challenge the implemented system.

Fix critical failures.

Retest.

### Task 9: Deploy and submit

Prepare a stable production deployment, public repository, demo and genuine DevEx evidence.

---

# FINAL ENGINEERING COMMAND

You are not here to produce impressive-looking source code.

You are here to build a functioning tokenized-stock product on BNB Chain.

Keep every agreed First Bell capability in the engineering scope.

Do not replace difficult integrations with fictional implementations.

Do not remove Paymaster.

Do not remove the existing MCP.

Do not treat the Sarf-inspired copilot as a separate product.

Do not confuse Binance Wallet with Binance Agentic Wallet.

Do not let research dictate unauthorized trades.

Do not let creators control other people's wallets.

Do not allow AI-generated calldata to bypass policy.

Do not fabricate stock availability, balances, sponsorship, transactions, receipts, agent behavior or Developer Experience evidence.

Implement incrementally, prove each integration, preserve working code and proceed to the next dependency.

When credentials or permission are needed, ask for the precise human action.

When an external capability cannot work, provide the exact verified blocker and proposed resolution.

When a test fails, fix it and rerun it.

When real money is involved, require the appropriate authorization.

**First Bell must turn an investment intent into a real, user-controlled tokenized-stock position on BNB Chain, and support the complete lifecycle through Bells, policies, agents, automation and verifiable receipts.**

**Start by auditing the repository and proving Binance API authentication. Then continue through the acceptance gates.**