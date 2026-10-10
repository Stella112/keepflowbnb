# Factual observations — 2026-10-04

Official llms.txt was readable via browser. Authentication HTML redirected to Binance en-GB; Markdown browsing failed. Direct documentation downloads produced zero bytes. Default shell requests initially failed with socket access permissions; subsequent sandbox starts failed with helper_unknown_error. Approved elevated commands worked. No API requests, latency samples, or financial actions occurred.


## 2026-10-05 observation

All four local settings are populated; values were not printed. Official authentication, RWA and wallet references are accessible through browsing today. First harmless live request returned HTTP 200 with business code 40304 and compliance restriction after 1948 ms. No RWA requests followed. Error response omitted data, so probe envelope now permits that property to be absent; endpoint payload schema remains pending a successful live fixture. Automatic approval service briefly failed due to model capacity, then recovered on retry.

2026-10-05T13:26:58.691Z: One approved authenticated request from OwnPay VPS returned the same compliance restriction (40304), HTTP 200, 401 ms. Keys supplied via encrypted SSH stdin and not persisted remotely. No further requests. Result does not establish account eligibility or the precise cause of rejection.
# 2026-10-06 observations

Direct SSH to Lightsail succeeded after restricting the uploaded PEM's Windows ACL. Sandboxed local execution remains affected by a `.git` ACL refresh failure; approved per-command execution works. The Windows administrator repair was canceled and no stronger sandbox repair is claimed.

The read-only client passed 11 local and Linux tests. Initial Windows production build failed starting the native TypeScript 7 compiler; a direct compiler check and subsequent production build succeeded. Linux production build succeeded on Node 24.21.0. Deployment release 20261005234731 returned HTTP 200 externally; firstbell and nginx were active and enabled. No real API credentials were part of the source deployment.

Automatic approval review rejected a signed Lightsail test because the earlier explicit approval named OwnPay only. This is an authorization boundary in the tool, not evidence about Binance accepting or rejecting the new VPS.

2026-10-06: Live stock discovery and quote/build fixtures verified on Lightsail. Raw token rows with null classification/name were excluded rather than coerced. BSC decimals/symbols verified onchain. RWA route documentation's universal RFQ claim contradicted by successful SWAP/LiquidMesh payload and builder. Actual exact-amount approval simulation returned SUCCESS with empty failReason; actual swap returned FAILED (insufficient balance). Separate actual-read readiness: 0.03 USDT, zero spender allowance. No writes performed. See API_VERIFICATION.md and current STATUS.md for qualification and fixture names.
2026-10-06: Browser E2E caught same-origin rejection behind nginx: Request.url used internal loopback host. Corrected validation to compare browser Origin with nginx-overwritten forwarded protocol and Host. Cross-site/missing/mixed-protocol origins rejected by dedicated regression test.

2026-10-06 paper validation observation: a real token price exceeded 18 fractional digits; first paper buy failed closed with "Too many decimal places" and did not change the virtual ledger. Corrected paper arithmetic to use the supplied price's own decimal scale, not a fixed 18-place assumption. Added regression test with 36 fractional digits; no floating-point fill calculation or upward token rounding. Live market data is still required; fixtures are only test evidence. Backend and UI paper failures are explicitly distinct from live/mainnet verification.

2026-10-06 paper scheduler log: firstbell-paper-agent.service returned {mode:PAPER,completed:1,failed:0,mainnetWrites:false}. Browser check PASS, scheduledStatus PAPER_FILLED, 13 workflow checks. Test Bell advanced version 1 -> rejected proposal 2 -> adopted safe proposal 3. These are virtual-ledger decisions, not chain transactions or Agentic Wallet tool invocations.

2026-10-06 workspace browser: PASS 12 checks; quoteSimulation FAILED (real result for unfunded test wallet), no transaction request. Read-only approval SUCCESS does not imply successful swap. Wallet recovery verified via domain-bound message signing, invalid/replay rejection, restored 73-virtual-dollar account rule and owned Bell. No new mainnet spend.

2026-10-07 QR browser result: PASS, checks 14, actualPhoneScanTested false, transactionRequests 0. Desktop localhost QR used public phone origin. One test-only EOA signed one message; restored its 67-virtual-dollar max-trade rule. Physical phone scan remains unverified; no fake device test claim.

2026-10-08 core release 20261007235554: 39 Node tests passed, strict types and optimized Linux build passed. Browser core result PASS, checks 13, receiptId 0119f34a-e184-4953-a755-65879db34cbf, mode DRY_RUN, realQuote true, transactionSubmitted false. Unfunded wallet snapshot at BSC block verified; first-leg quote received; INSUFFICIENT_USDT blocked it; remaining legs NOT_STARTED. Receipt survived service restart unchanged. Process guards DRY_RUN / false / 5. Paper regression PASS, 13 checks. Cleanup removedTestOnlyBells 2; paperDatabaseMode 0o600; checkedApiSecrets 2; browserBundleSecretMatches 0. HTTP browser request-ID compatibility issue found during QA and fixed using existing crypto.getRandomValues generator. No mainnet buy or simulation-success proof is claimed by this test.
