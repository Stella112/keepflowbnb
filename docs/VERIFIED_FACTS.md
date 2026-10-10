# Verified facts

FACT: Submissions lock 11 October 2026 at 12:00 UTC.
SOURCE: https://www.bnbchain.org/en/hackathons/tokenized-stocks
DATE VERIFIED: 2026-10-04
VERIFICATION METHOD: Official page read, Key Dates table.
CODE DEPENDENCIES: None.

FACT: Documentation index lists RWA search, aggregator quote/approval and transaction simulation paths.
SOURCE: https://web3.binance.com/en/dev-docs/llms.txt
DATE VERIFIED: 2026-10-04
VERIFICATION METHOD: Official index read.
CODE DEPENDENCIES: None; endpoint semantics remain unverified.


## 2026-10-05 facts

FACT: Request signing requires Base64 HMAC-SHA256 over timestamp + uppercase method + full encoded /build path/query + exact body.
SOURCE: https://web3.binance.com/en/dev-docs/authentication
DATE VERIFIED: 2026-10-05
VERIFICATION METHOD: Official reference read; local signing tests. DOC VERIFIED only.
CODE DEPENDENCIES: lib/binance/auth.ts; scripts/verify-api.ts.

FACT: Supported-chain probe returned HTTP 200, code 40304, success false, compliance restriction. Authentication success cannot be inferred.
SOURCE: fixtures/api/wallet-supported-chains.json
DATE VERIFIED: 2026-10-05
VERIFICATION METHOD: One live read-only request.
CODE DEPENDENCIES: Probe stops immediately on nonzero business status.

## 2026-10-06 facts

FACT: Authentication documentation describes optional X-OC-NONCE, a 5000 ms default timestamp window, HTTP 429 Retry-After in seconds, and service codes 50000/50001.
SOURCE: https://web3.binance.com/en/dev-docs/authentication
DATE VERIFIED: 2026-10-06
VERIFICATION METHOD: Official reference read; injected-response client tests. DOC VERIFIED; retry errors not live verified.
CODE DEPENDENCIES: lib/binance/client-core.ts.

FACT: The Lightsail credential-free API call returned 40101 (API Key is required); a successful signed request has not occurred.
SOURCE: fixtures/api/lightsail-unauthenticated.json
DATE VERIFIED: 2026-10-06
VERIFICATION METHOD: Read-only HTTPS call through authenticated SSH, with no API credentials.
CODE DEPENDENCIES: Authentication gate remains pending.

FACT: The deployed bootstrap and health endpoint are accessible at http://56.125.248.192/ and return HTTP 200. Both services are active and enabled; no API credential file was deployed.
SOURCE: External HTTP checks and direct SSH systemctl checks; docs/DEPLOYMENT.md.
DATE VERIFIED: 2026-10-06
VERIFICATION METHOD: Windows and Linux tests/builds, external web requests, service checks.
CODE DEPENDENCIES: scripts/deploy.mjs; app/api/health/route.ts.

FACT: The approved signed Lightsail supported-chain request returned HTTP 200, code 0, success true, and BNB Chain with binanceChainId 56. Authentication Gate 1 passed for this server and endpoint.
SOURCE: fixtures/api/lightsail-wallet-supported-chains.json; sanitized lightsail-verification metric.
DATE VERIFIED: 2026-10-06 (local date); request 2026-10-05T23:54:39.943Z UTC.
VERIFICATION METHOD: One live read-only signed request, encrypted SSH stdin credentials, no remote credential persistence, no retry.
CODE DEPENDENCIES: scripts/verify-vps.mjs. RWA and execution capabilities remain unverified.

2026-10-06 live verified: /api/quote delivers real 5-USDT bStocks NVIDIA estimate and separate actual simulations. Exact approval simulation SUCCESS does not establish swap success. Swap FAILED due to balance. Execution remains disabled. Browser test passed on deployed release 20261006092204 at 380px and 1440px using test-only EIP-1193 provider; API/RPC data were live. Twenty-one unit/integration regression tests and production build passed on Linux. Public TLS not yet reachable; locally trusted IP certificate verified.

2026-10-06 scheduled paper evidence: 32 tests, types/build pass; release 20261006104052. Real installed systemd worker completed one $20 virtual contribution with three live-price paper fills. Concurrent checks/repeated saves did not refuel the period. Creator proposal exceeding the follower's 40% exposure target was blocked; safe version was explicitly adopted without changing schedule or policy. Ownership/version conflicts and mobile layouts verified. This proves paper maintenance and guarded decisions only; it does not prove Agentic Wallet, Agent Studio, B402 or mainnet execution.

2026-10-06 release 20261006201051: optional verified EOA account recovery, owned Bell workspace, published version history, private durable real quote/simulation receipts. 33 tests/build/types and 12 browser/API checks passed. Exact nonce/domain/address/expiry enforced, replay rejected. Approval simulation SUCCESS and swap FAILED on empty test wallet; no signature for a transaction or broadcast. Historical mainnet completion remains unpassed.

2026-10-07: QR login added separately from Bell-sharing QR. Originating PC cookie, matching code, authenticated phone approval, five-minute expiry, explicit PC wallet confirmation and transactional single-use consumption verified. 35 tests/build/types and fourteen emulated-phone/desktop browser/API checks pass. Physical phone/native wallet scan not tested. No real transaction requested.
