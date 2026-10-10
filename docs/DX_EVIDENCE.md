# DX evidence

Authenticated API sample count: 0. Schema mismatches: not measured. Latency percentiles, provider availability and market behavior: not measured. See DEVEX_RAW.md for documentation access observations.


2026-10-05 sample count: 1 supported-chain request. HTTP 200; business success count 0; business error count 1 (40304). Observed latency 1948 ms; retries 0. Initial envelope mismatch: 1 (missing data in error response). No percentile estimates from one sample. No provider or market observations.

Approved VPS sample: HTTP 200, business error 40304, latency 401 ms, retry count 0, envelope validation passed. Cumulative HTTP API response samples: 2, both business failures. One additional local probe failed before HTTP at DNS lookup. No successful authenticated samples; no latency percentile claims.
# 2026-10-06 build and deployment evidence

| Check | Observed result |
| --- | --- |
| Signing/client tests | 11 passed locally; 11 passed on Lightsail |
| Strict TypeScript | Passed locally and on Lightsail |
| Production build | Passed locally on retry; passed on Lightsail |
| External landing / health | HTTP 200 / HTTP 200 |
| Services | firstbell and nginx active and enabled |
| Execution | Unavailable; no mainnet write functionality |
| Credential-free Binance call | 40101; authentication not proved |
| Signed Lightsail call | Not run; explicit destination approval pending |

2026-10-06: First real quote/build/simulation consumer flow verified in Edge. Browser test exposed and regression-tested nginx/internal-origin mismatch. Actual simulated failure shown in app instead of treating HTTP/business-code success as execution success. Approval dry simulation showed exact 5-USDT permission change; swap reported insufficient balance. Public HTTPS firewall remains an operator action. See current STATUS.md for exact gates and release.

2026-10-06 — Paper agent verification: release 20261006104052; 32 unit/contract tests; Linux types/build pass. Edge API/UI test used actual firstbell-paper-agent.service, not a browser-only CHECK, and observed one $20 virtual contribution and three PAPER_FILLED legs. Concurrent retry/save, pause/resume, creator ownership/CAS conflicts, blocked unsafe proposal, explicit safe adoption and unchanged parent validated. MainnetWrites false. Worker/timer active, protected scheduler key 0600. Ignored local proof: test-results/agent-proof.json and mobile screenshots. No transaction hash, wallet signature or real funds.

Additional actual-worker guarded SKIP: personal drift 50 percentage points, AI Compute Bell targets <=30%; worker retained contribution in cash, recorded SKIPPED with no legs/positions, cash $10,020. Authenticated scheduler boundary rejects an unauthenticated POST with 401. Pinned strategy, schedule, balances, quantities and receipts survived service restart.

2026-10-06 workspace evidence: release 20261006201051; 33 tests and Linux types/build pass. A newly generated test-only EOA signed one login message; browser made no transaction request. Invalid signature and reused nonce rejected; cross-browser account rules/owned Bells restored. Newly created Bell attributed only to verified wallet; archived versions displayed. Real Binance quote/approval/swap simulation returned approval SUCCESS, swap FAILED for the empty test wallet. Private saved preview denied to another account and visible to restored wallet account. Stale UI clearing and mobile layouts verified. This is not mainnet execution evidence.

2026-10-07 QR evidence: release 20261007181147; 35 tests/types/build pass. Fourteen two-context browser checks passed: phone-reachable QR, message-only wallet login, code matching, explicit phone+desktop approval, restored paper account, rejection of unauthorized phone/wrong code/different PC/replay/cancel/superseded/cross-origin requests, mobile layout. No transaction request. actualPhoneScanTested false; physical device scan and native wallet browser are not claimed tested.

## Version 2 release — 2026-10-08
Release 20261008223301: 72 Linux tests passed, strict typecheck and production build passed; dependency audit reported zero vulnerabilities. Draft/export browser 12 checks, paper workflow 13 checks, secure QR 14 checks, real-wallet dry pipeline 13 checks passed. QR TLS used encrypted SSH forwarding with certificate checks retained; physical phone and public port443 are not proved. Actual quote in unfunded-wallet dry receipt; no transaction submitted. Paper and dry receipts survived controlled restarts. Both configured API secrets checked against browser bundles: zero matches. Database mode0600.

Observed developer friction: Windows disk full blocked automatic approval review and browser profile creation; deleting generated workspace build output and regenerable npm cache restored capacity. Local tunnel instability was separated from healthy public paper API. Playwright Node API proxy mishandled IP certificate hostname; tests used Chromium's normal validated TLS fetch transport instead, without disabling verification. Browser-blocked cross-origin requests are reported as browser blocking rather than fabricated server status. Agent CLI subprocess tests used an isolated synthetic package, not a real provider installation.

Remaining provider/Mainnet evidence is explicitly unverified in BLOCKERS.md and SECURITY.md. No paid calls or funds spent.
