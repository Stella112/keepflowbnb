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

