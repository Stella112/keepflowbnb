# API verification — 2026-10-04

| Capability | Official reference | Candidate method/path | State | Live request | Fixture |
| --- | --- | --- | --- | --- | --- |
| Authentication | https://web3.binance.com/en/dev-docs/authentication.md | Not verified | NOT STARTED | No | None |
| RWA search | https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data | GET /api/v1/dex/market/rwa/search | Index only | No | None |
| Quote | https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api | GET /api/v1/dex/aggregator/quote | Index only | No | None |
| Approval | Same trading reference | GET /api/v1/dex/aggregator/approve-transaction | Index only | No | None |
| Simulation | https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/transaction-api | POST /api/v1/dex/pre-transaction/simulate | Index only | No | None |
| Wallet | https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/wallet-api | Not implemented | NOT STARTED | No | None |

Parameters, headers, authentication, chain format, response fields, errors, rate limits and quote validity remain unverified for every endpoint. No external response schema is implemented without a reference and live fixture.

EXPECTED: Read official signing and endpoint references; make a harmless authenticated request.
OBSERVED: Authentication HTML and full-document URLs redirect in the browsing tool to binance.com/en-GB. Markdown URLs are inaccessible there. PowerShell downloads returned zero-byte files. Credential environment variables are unset.
EVIDENCE: Browser results on 2026-10-04; docs/sources files were measured at zero bytes and removed to avoid treating them as references.
ATTEMPTS: Official HTML reference, Markdown reference, llms-full.txt and direct HTTPS download. No geographic bypass attempted.
SAFEST FALLBACK: Leave integrations disabled and show unavailable data.
DECISION NEEDED: Maris supplies accessible official reference content and configures developer credentials locally. Signing remains unimplemented until verified.


## 2026-10-05 — Authentication reference and live probe

Official authentication reference is now readable: https://web3.binance.com/en/dev-docs/authentication
Signing uses a UTF-8 HMAC-SHA256 digest encoded as Base64. Input concatenates timestamp, uppercase method, encoded request path including /build, and exact body. Query serialization must match the request bytes. Source last-modified date: 2026-10-01.

Harmless request: GET /build/api/v1/dex/balance/supported/chain?binanceChainId=56.
Timestamp: 2026-10-05T12:42:51.737Z. HTTP status: 200. Latency: 1948 ms. Retries: 0.
Observed response: code 40304, success false, message Service not available due to compliance restriction. No data property is present. Captured fixture: fixtures/api/wallet-supported-chains.json. It is an error fixture, not proof that signing was accepted.

EXPECTED: Successful supported-chain response proving authenticated access.
OBSERVED: Explicit compliance restriction.
EVIDENCE: Sanitized real fixture and ignored logs/dx.jsonl.
ATTEMPTS: One documented, signed harmless request. No geographic bypass, proxy change or repeat request.
SAFEST FALLBACK: Keep live integrations unavailable and writes disabled.
DECISION NEEDED: Maris contacts Binance developer/hackathon support to clarify whether the account and connection are eligible and how to resolve code 40304 legitimately. No further live probes until resolved.

## VPN-off retry — 2026-10-05
User reported VPN disabled. Read-only probe at 13:14:26.174 UTC failed before HTTP response (132 ms). Credential-free diagnostic returned ENOTFOUND for web3.binance.com; BSC RPC host was reachable. Windows DNS reported operation refused for web3.binance.com and www.binance.com. WiFi DNS server is 192.168.1.1; WinHTTP reports no proxy. Earlier compliance fixture preserved separately. No API success and no network settings changed.


## OwnPay VPS connectivity — 2026-10-05
User authorized using OwnPay VPS. Identified server from ownpay.online DNS and C:\base deployment notes; authenticated SSH with existing deploy key. Node runtime v22.23.1. No services changed. Credential-free API request returned HTTP 401, code 40101, API Key is required. This proves API reachability only; no authentication success. Public docs HEAD returned WAF challenge. Automatic approval review rejected sending the Binance API secret to the shared VPS because that specific credential transfer was not explicitly authorized. No credentials were transferred. Await explicit approval before authenticated remote probe; planned transfer is encrypted SSH stdin, process memory only, no remote credential file.


## Approved authenticated OwnPay VPS probe — 2026-10-05

User explicitly approved transferring Binance API key and secret to OwnPay VPS for one read-only test. Credentials were sent through encrypted SSH stdin, used in the remote Python process, and not saved as a remote file. Existing services were not modified.
Request: GET /build/api/v1/dex/balance/supported/chain?binanceChainId=56.
Timestamp: 2026-10-05T13:26:58.691Z. HTTP 200; code 40304; latency 401 ms; retry count 0. Sanitized fixture: fixtures/api/vps-wallet-supported-chains.json. Envelope validation passed. Authenticated access is NOT VERIFIED: a compliance response is not evidence that signing was accepted. No further API requests were made.

EXPECTED: Successful harmless authentication test.
OBSERVED: Same compliance code as earlier local VPN request.
EVIDENCE: Sanitized VPS fixture and ignored DX log.
ATTEMPTS: Local VPN probe, VPN-off DNS check, credential-free VPS connectivity check, one explicitly approved authenticated VPS probe.
SAFEST FALLBACK: Keep live functionality unavailable; do not change hosts or credentials to evade the restriction.
DECISION NEEDED: Binance developer/hackathon support clarifies code 40304 for this API project. No account-specific or geographic cause can be proven from this response.

## 2026-10-06 — Lightsail and client preparation

Credential-free response from `56.125.248.192`: code 40101, API Key is required. Fixture: `fixtures/api/lightsail-unauthenticated.json`. This is reachability evidence only. Automatic approval review rejected the authenticated Lightsail probe because earlier explicit credential-transfer approval named OwnPay. No signed request occurred; a separate approval question is pending.

Re-read https://web3.binance.com/en/dev-docs/authentication. DOC VERIFIED: nonce is optional and prevents replay; the default timestamp window is 5000 ms; documented HTTP 429 responses include Retry-After in seconds; codes 50000/50001 describe service failures. The read-only client retries at most once for these retryable read failures, honors short Retry-After values, and stops rather than retrying earlier when the requested delay exceeds its two-second budget. These retry responses have NOT been live verified.

RWA reference https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data is now readable. It documents signed RWA platforms/search/list/price calls. No RWA data schema is treated as verified until real successful fixtures are captured.

## 2026-10-06 — Explicitly approved signed Lightsail test

User answered yes to the separate one-call credential transfer request for ubuntu@56.125.248.192. Ran exactly one signed GET /build/api/v1/dex/balance/supported/chain?binanceChainId=56. Credentials passed through encrypted SSH stdin and were not persisted remotely.
Observed at 2026-10-05T23:54:39.943Z: HTTP 200; business code 0; success true; latency 324 ms; retry count 0. Data contains BNB Chain, shortName BSC, binanceChainId 56, and its logo URL. Sanitized fixture: fixtures/api/lightsail-wallet-supported-chains.json. Envelope validation passed. Gate 1 authentication PASSED for this server/request. Other endpoint access and RWA schemas remain unverified. No funds spent.

## 2026-10-06 — Live RWA, build and simulation observations

Official references read: https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data ; https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api ; https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/transaction-api .
Successful raw endpoint fixtures now include RWA platforms, NVIDIA search, BSC token list, quote, swap builder, approval builder and pre-transaction simulation. Onchain BSC token metadata verified separately with viem. Production responses require Zod validation plus intent/address/amount/decimals checks.
Observed inconsistencies: token-list tabId 9 still returns a broad list, so curate explicitly; three rows have null assetType/name and are excluded; bStocks marketStatus can be null; paused spelling differs from reference. Unknown market statuses remain unavailable. RWA routes documented as RFQ returned actual SWAP/LiquidMesh candidates with supported SWAP builds. Do not invent an RFQ implementation. Five USDT can fail Ondo's minimum five-USD check (40375); ten USDT succeeded as a read-only probe, without changing the first-purchase five-USDT cap. Reference price is token-derived share value, not an exchange quote. estimateGasFee units were ambiguous, so not presented as a monetary cost.
POST /api/v1/dex/pre-transaction/simulate accepts {binanceChainId:"56",evmTx:{from,to,value,data}}. Approval returned status SUCCESS, failReason empty string, exact allowanceChanges postAmount 5000000000000000000. Swap returned status FAILED and balance shortfall. Business envelope code 0 alone does not mean simulation success. Empty string/null failure reason is accepted only with SUCCESS status; contradictory failure text fails closed. POST simulations never retry and no generic write/broadcast transport exists.
Raw wallet-associated fixtures remain local evidence and must be redacted before public publication. No repository push performed.

## 2026-10-09 release 20261009201428

Underlying company and market integration shipped on stock pages and the read-only get_stock_underlying shared tool/MCP interface. Live signed NVDA underlying-profile and underlying-market fixtures returned HTTP200/businesscode0. Responses bind exact curated ticker/issuer/BSCcontract/assettype, sanitize external links without fetching them, retain exact metric strings/nullmissing values and independent partial availability, and require valid retrieval times. Six underlying tests and the public strict-tool test passed; full Linux suite194tests, typecheck/build and audit0 passed. Public HTTPS stock-page/API/tool and mobile acceptance passed. DRY_RUN, MAINNET_WRITE_ENABLED=false and browser credential scan0 verified. Independent review accepted the initial5-test binding/URL/partial/UI scope; final retrieval-time/English-description repairs were completed and tested by the primary engineer after review agents reached their usage limit. No paid research or mainnet operation occurred.
