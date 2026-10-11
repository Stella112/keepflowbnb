## More Binance Web3 API modules — 2026-10-11 00:10 UTC

Release 20261010235843 is live; the referencePrice fix below is committed but not yet deployed. Features: stock pages compare Ondo vs bStocks per underlying share with 72h hourly charts and the on-chain 24h move (RWA Data `rwa/price` + Market API `candles`); receipts get an independent Binance check (Transaction API `transaction-detail-by-txhash`: hash, status, block, USDT out, tokens in, fee); the portfolio wallet section shows Address Portfolio `overview` + `recent-pnl` filtered to listed stocks. Read-only, existing signed client and rate limit. Real responses in fixtures/api; 7 new tests.

Observed API facts (DevEx evidence): Wallet API `all-token-balances-by-address` returns `tokenAssets: []` with code 0 for a wallet holding 24,493 NVDAon (Address Portfolio shows it); candles reject `bar=1H` (40001, lowercase only); `rwa/price` needs `tokenContractAddresses` (plural); transaction detail returns an array keyed `txhash`/`height`/`chainIndex`; RWA `referencePrice` equals tokenPrice / tokenToShareRatio for Ondo and bStocks, so it is not an independent exchange quote (first release showed a meaningless 0% premium; replaced); VPN egress gives 40304. Latency ~0.5–1 s, `rwa/tokens` 1.5–2.5 s.

Agentic Wallet funded by the owner (amounts per owner: ~2 USDT, 0.002 BNB, 0.5 USD1); not yet verified on-chain by Claude. Live Autopilot and paid research still switched off pending operator wallet address and approval.

## KeepFlow mainnet-first checkpoint — 2026-10-10 22:00 UTC

Owner renamed the product to KeepFlow (keepflow.site) and directed mainnet as the default with paper trading as an option. Production app.env: EXECUTION_MODE=MAINNET, MAINNET_WRITE_ENABLED=true, FIRSTBELL_APPROVAL_ENABLED=true, LIVE_MAX_TRADE_USD=5; Autopilot live execution stays disabled. https://keepflow.site serves a Let's Encrypt certificate (valid to 2027-01-08); www and http redirect to it; Lightsail 443 opened by the owner.

Release 20261010215838: wallet purchase is the primary stock/Flow panel with inline wallet sign-in; paper is a secondary option; new /rules (shared personal-rules editor enforced on live and paper paths), /activity (owner-scoped verified live receipts, new LiveReceiptStore.list with test), receipt navigation, request-time mode badge. 318/318 VPS tests, typecheck and production build passed.

Not yet verified: any confirmed mainnet purchase through the app, phone/Binance Wallet flow on the domain, Paymaster sponsorship, Agentic Wallet execution, Agent Studio identity, paid x402 call. No Codex review of these changes.

Dedicated Studio wallet and read-only runtime VERIFIED on VPS: 0xcEf06DA67ACcBcdd6614A9875eFCe2c85A960329. Official bag dev launcher, SDK initialize/listTools and actual pinned nvidia version1 public sourced NVDA review passed. Protected password and encrypted keystore0600; no wallet signing, payment, funding, identity registration or cloud deployment. Runtime test stopped afterward. Independent source review accepted loopback, owner-private wallet isolation, deadline and corrected concurrency. Reviewer Windows HTTP readiness test failed separately; no Windows test pass is inferred from Linux proof. Evidence: test-results/studio-wallet-runtime-proof.json.

Dedicated Studio wallet created with explicit owner authorization on VPS: 0xcEf06DA67ACcBcdd6614A9875eFCe2c85A960329. Official CLI0.0.14 private password generation, encrypted keystore/password0600, wallet/config binding and BSC connectivity verified. Runtime doctor found missing entrypoint/seller policy; no funds, identity registration, cloud deployment or financial operation. Evidence: test-results/studio-wallet-proof.json.

VPS Agentic authentication verified after owner app confirmation: CONNECTED, BSC56 wallet 0x43b9bEB18853487d48bCB863EeEDF95597a1Fe7C. No financial authorization or execution enabled. Evidence: test-results/agentic-vps-auth-proof.json.

Production acceptance — release20261010140734:317 Linux tests, typecheck, production build and dependency audit0 passed. Certificate-validated actual StockAnalyst price/unpaid402 offer, owner binding, disabledfeeauthorization, invalidticker and logout checks passed. Actual mobile fees/offer UI passed with no horizontaloverflow or walletcalls. Runtime DRY_RUN / MAINNET_WRITE_ENABLED=false; database0600; two APIsecret bundle scan0. Evidence: test-results/stockanalyst-routes-proof.json and paid-research-ui-proof.json. No fee, stocktrade, tokenapproval or sponsoredtransaction was submitted.
## Verified checkpoint — 2026-10-10

The full mandate remains incomplete; financial authorization remains paper trading and read-only integration.

Local Binance Agentic Wallet1.10.0 authentication is CONNECTED after the owner confirmed the official app QR. The verified local BSC operator wallet is 0x43b9bEB18853487d48bCB863EeEDF95597a1Fe7C. This does not authenticate the VPS or authorize financial execution. Application signing/payment flags remain disabled; no session state was copied between machines.

Research now has an actual fixed-origin StockAnalyst pricing/402 offer adapter, exact owner/session-bound fee grants, an independently recovered EIP3009 signer, a durable once-only asynchronous submission core, encrypted owner-bound job tokens and private status/report/resume routes. Unknown outcomes never resend; accepted jobs never imply verified payment settlement. Production payment submission is not wired or enabled. U/USD1 EIP3009 and USDT/USDC Permit2 are kept distinct. No paid request was made.

Sponsored execution now has a concrete zero-gas raw-transaction verifier, durable submission journal and canonical transaction/receipt binding. It requires a genuinely compatible raw signer and funded authorized evidence; these are not established. Zero fees do not prove sponsor payment. Studio configuration, credential-presence diagnostics and public MCP are tested; its real wallet/runtime/cloud identity is not authenticated.

317 local and Linux regression tests passed, plus six local supplemental Studio tests. Independent research authority/signer/submission/private-route review accepted the fixes. Public provider latency exceeded twelve seconds from the VPS; read-only discovery now permits thirty seconds. Latest production and public acceptance results follow as separate evidence.

# Current engineering checkpoint — 2026-10-10

INCOMPLETE — mandatory funded and external integration gates remain unverified. Current authorization is paper trading and read-only integration.

281/281 local regression tests and TypeScript check passed. Independent basket backend, UI, cancellation and orphan-intent reviews passed; the final targeted review passed29 tests. Guarded manual approval/swap handoffs, owner-private canonical live receipts, sequential multi-asset basket routes and UI are implemented. Effective Bell limits narrow whole-wallet durable spending reservations. Unknown outcomes never resend; basket progress requires twelve canonical confirmations and actual settled receipts. No mainnet purchase or approval was sent.

The deployed read-only scheduler checks due plans every five minutes through a private loopback token. It cannot sign, reserve live spending or pay research fees. Actual public route and synthetic wallet browser checks passed on release 20261010083705. Basket/receipt/cancellation release20261010091648 passed281 VPS tests, typecheck and production build. Deployed synthetic basket UI and actual unfunded-owner basket replay/default-off/partial-stop route checks passed. API-secret bundle scan returned zero matches and database permissions0600.

Official Agentic Wallet 1.10.0 is installed in an isolated package; actual local status is UNCONNECTED. Preview/execute adapters have tested default-off permission boundaries, but no user Agentic Wallet authority or funded operation is verified. Studio's official pinned configuration loader and sole public read-only stdio MCP tool initialized successfully without wallet bootstrap. Cloud runtime/identity remains unconfigured. Paid x402 transport has strict settlement and budget checks, but requires a real compatible merchant, signer and explicit fee authority; BSC USDT is not assumed to support EIP-3009. Sponsored mainnet gas and external phone proof remain unverified.

Historical checkpoints below are retained as dated evidence; they are not current completion claims.
# Current status — 2026-10-09

Version 2 mandate remains authoritative. Product is INCOMPLETE; paper-only authorization remains active.

Deployed release: 20261009225007, Lightsail 56.125.248.192. Linux test suite216/216, typecheck and production build passed; dependency audit reported zero vulnerabilities. Public HTTPS https://56.125.248.192:80. Paper-only guards and browser-secret scan0 passed. Historical checkpoints are retained below; they are not the current release.

MCP and wallet planning release: the existing tool handlers now have official SDK1.32.1 stateless Streamable HTTP at /api/mcp. Four SDK protocol/security tests passed; independent review repaired batched-call quota bypass and preparation annotations. Actual-wallet contribution planning uses authenticated consistent-block BSC holdings, immutable Bell pins, exact reserve/exposure/trade and configured period ceilings, with no sells, signing or schedule activation. Five tests and deployed mobile/actual empty-wallet proof passed at BSC block126648386. Historical Bell UI now supports selected-version allocation and policy comparison. Input edits clear stale proposals; live budget availability is explicitly unverified. Actual external-assistant delegation remains separate from the tested controlled client.

Historical checkpoints below predate this MCP transport unless explicitly stated.
Receipt and future-budget pass: new paper receipts preserve event-time Bell version/hash, personal/effective rules and remaining virtual cash, with readable rules and owner-only JSON download. Four tests and deployed mobile/private/history/restart checks passed. Legacy missing snapshots remain explicitly absent. Future wallet-wide budget reservation core passed ten tests and independent review; unknown holds never expire, transitions are journaled and verified overruns quarantine the wallet. It has no signer, live caller or RPC settlement verifier. Studio0.0.14 source-backed static diagnostic contract passed two tests; actual CLI invocation stays disabled because startup loads project secrets/wallet sessions. No provider authentication or payment occurred.

Public sharing acceptance: general First Bell and Bell-specific QR links use the configured HTTPS origin, including from localhost previews. Local/private address forms and sensitive routes fail closed. Independent review repaired IPv6, local DNS and CGNAT validation gaps. Deployed home/Bell QR and mobile layout passed; manifest downloads remain available. Evidence: test-results/public-sharing-proof.json. Public phone reachability remains unverified.

Account security acceptance: active session counts and expiry, explicit sign-out of other sessions, transaction-lock authorization recheck, and shared QR/desktop sign-in serialization are deployed. Independent source review and four session-store tests passed. Deployed mobile session revocation preserved the current and unrelated accounts. Certificate-validated QR regression passed 15 checks, including delayed FINISH blocking desktop signing. These tests use synthetic unfunded signers; physical phone and public HTTPS remain unverified.

Budget and strategy acceptance pass: optional daily/weekly paper purchase caps, stricter Bell/personal intersections, exact-cost durable WAT period ledger, usage/remaining display and reviewed draft/editor fields are deployed. Zero caps pause purchases. Successful legs count immediately; sells do not refund usage. Paper Autopilot update acceptance now binds plan ID, Bell ID and both versions, with creator continuity and legitimate guest wallet linking supported. Independent review and fifteen targeted tests passed. Deployed concurrent budget/mobile checks, budget restart persistence and thirteen scheduler/strategy/browser checks passed. A restart overlapped an initial scheduler check; after completion, the final rerun passed with explicit hydration/enable-response verification. Three unchanged temporary QA Bells were removed and their plans paused; private receipts preserved.

Informational follow pass: private durable Bell follows, pinned snapshots, creator update diffs, stricter personal-policy advisories and explicit stale-version-checked acknowledgement are deployed. Following changes no policies, balances or Autopilot plans. Independent review fixed a stale error-response UI issue. Three new store tests and the deployed mobile follow/update/acknowledge/unfollow flow passed. Runtime guards remain DRY_RUN and MAINNET_WRITE_ENABLED=false; both actual API secrets have zero browser-bundle matches. Temporary test Bell was safely removed. Evidence: test-results/bell-follow-proof.json. Preview supervisor reconnects transient SSH resets.

Saved-brief follow-up: owner-only latest-completed retrieval and an explicit Open latest saved brief button are deployed. Independent review found no blocking issues. The mobile browser reopened the persisted Binance report with zero creation requests; unsupported tickers and unauthenticated access were rejected. Evidence: test-results/saved-brief-proof.json.

New this pass: reviewed unsaved personal-policy drafts with source-version CAS handoff; actual production bindings for all requested tool names through a scoped read/preview HTTP boundary; distinct QUOTE_ONLY Bell checks; sourced factual Binance stock briefs and durable owner-scoped asynchronous jobs. Execution requests remain disabled; no MCP protocol connection or paid analyst research is claimed.

New browser proofs: policy drafting 18 checks PASS, including explicit save and stale409 rejection; read-only HTTP tools 18 checks PASS with actual empty-wallet checks and durable quote-only replay; sourced briefs 18 checks PASS with actual Binance data, job privacy/replay/conflict checks and mobile UI. Sourced report persisted exactly across a controlled restart. Zero wallet requests and zero paid calls in these flows. Local preview tunnel is now held in a persistent terminal session after detached helpers ended prematurely.

Latest additions: stored configurable Bell policy caps with stricter personal intersection, manual/scheduled paper enforcement and sell-price freshness, actual-policy manifests and policy version comparison; authenticated durable read-only intents with pinned metadata, immutable journals, owner-scoped status and external-hash reconciliation; reusable validated tool service and paper contribution preview; bounded x402 v2 offer inspection without payment authority. No connected MCP or paid report is claimed.

Earlier browser proof: policy/intents 20 checks PASS with zero wallet requests; saved private intent and journal survived a controlled restart. Browser tests wait for client initialization before checking state. Latest runtime guards remain DRY_RUN / MAINNET_WRITE_ENABLED=false / LIVE_MAX_TRADE_USD=5 / public origin HTTPS, verified from the active process. Database 0600; both configured API credentials scanned in latest deployed browser bundles with zero matches.

Existing paper workflow rerun: 13 checks PASS after deployment. Removed only three unchanged test-owned public QA definitions; private intent journal preserved. User definitions and accounts were not cleaned.

Shipped in this release: live-supported allocation drafts, reviewed parser rejection checks, downloadable version-pinned Bell manifests, publication/fork metadata for new definitions, durable policy replay/CAS, paper sell limits, bounded API streams, strict simulation effects, reserve intersection, atomic dry-check admission, expired-worker fencing, HTTPS identity enforcement and revocable opaque sessions. Existing linked accounts require fresh wallet verification; account data is preserved.

Fresh authenticated read: mandate-v2-rwa-platforms fixture, HTTP 200/business code 0, 376ms on 2026-10-08. API keys remain server-only.

Public HTTPS still times out; nginx listens on 443 and certificate validation works internally. Ubuntu firewall is inactive. Localhost SSH preview restored. Public QR origin is HTTPS; no insecure public identity fallback.

Remaining gates: external assistant authentication/delegation and reconciliation of any separately supplied legacy MCP source, Agentic/Studio authentication and operational proof, Paymaster compatibility/sponsorship, x402 provider/payment proof, guarded mainnet execution evidence after human authorization, physical phone and final security/browser evidence, public repository/submission.

Independent implementation/review used Codex agents carrying the mandate's builder and verifier roles. No claim that a Claude model/CLI actually ran. Review files are under docs/reviews.

No funds spent. Real execution remains disabled.

Final evidence: draft/export browser 12 checks PASS; paper workflow 13 checks PASS; certificate-validated QR over SSH 14 checks PASS; real-wallet dry check 13 checks PASS with real quote and honest empty-wallet block; paper and dry receipt persistence PASS after restarts. Execution guards DRY_RUN / MAINNET_WRITE_ENABLED=false / LIVE_MAX_TRADE_USD=5. Both configured API secrets scanned: zero deployed browser-bundle matches; database mode 0600. Three unchanged test-only QA Bells removed. Physical phone and public HTTPS remain unverified.







Latest deployed protocol evidence: official SDK client MCP discovery/calls/private paper access and active-client revocation PASS. Evidence: test-results/mcp-protocol-proof.json. Actual-wallet planner/browser evidence: test-results/wallet-plan-proof.json. These controlled unfunded tests grant no external assistant access or financial authority.

## 2026-10-09 release 20261009183834

Deployed private sourced Bell review jobs, scoped manual MCP bearer grants, read-only sponsorship workflow and guarded research payment-offer inspection. All 186 Linux tests, typecheck and production build passed; dependency audit reported zero vulnerabilities. Public certificate-validated HTTPS is available at https://56.125.248.192:80. Production is DRY_RUN with MAINNET_WRITE_ENABLED=false, database mode0600 and zero Binance credential matches in browser bundles. Real Studio/Agentic Wallet authorization, paid analyst provider and sponsored/mainnet execution evidence remain unresolved; paper-only authorization is unchanged.

External deployed acceptance passed: private sourced review completion and version replay/conflict; private access; scoped official MCP SDK calls with immediate revocation and denied preparation; mobile review layout; sign-out clearing; QR login15checks. ACME HTTP challenge route passed and its temporary file was removed. Proofs: test-results/private-services-proof.json and qr-login-proof.json. No physical phone, paid research or sponsored transaction is claimed.

## 2026-10-09 release 20261009185553

Private review history now lists the latest50 owner-only summaries with reopen links. No reports, session material or credentials are included in the history response. Captured-rule wording is explicit; asynchronous error paths are fenced and clear private history. Independent review and8review tests passed; full Linux suite187tests, typecheck and production build passed before activation. Public browser acceptance passed private history/reviews, scoped MCP and sign-out privacy; HTTPS home/Bell QR sharing and mobile layout passed.

2026-10-09 live adapter verification: scripts/check-studio-public-adapter.mjs passed through certificate-validated external HTTPS and actual Binance factual sources. Public Bell version/hash binding and public-only tool requests were checked. Four isolated adapter tests pass, including post-response source timestamp validation; independent review accepted. No Studio runtime, identity, cloud service, credentials, payment or mainnet operation is established. Proof: test-results/studio-public-adapter-proof.json.

## 2026-10-09 release 20261009201428

Underlying company and market integration shipped on stock pages and the read-only get_stock_underlying shared tool/MCP interface. Live signed NVDA underlying-profile and underlying-market fixtures returned HTTP200/businesscode0. Responses bind exact curated ticker/issuer/BSCcontract/assettype, sanitize external links without fetching them, retain exact metric strings/nullmissing values and independent partial availability, and require valid retrieval times. Six underlying tests and the public strict-tool test passed; full Linux suite194tests, typecheck/build and audit0 passed. Public HTTPS stock-page/API/tool and mobile acceptance passed. DRY_RUN, MAINNET_WRITE_ENABLED=false and browser credential scan0 verified. Independent review accepted the initial5-test binding/URL/partial/UI scope; final retrieval-time/English-description repairs were completed and tested by the primary engineer after review agents reached their usage limit. No paid research or mainnet operation occurred.

## 2026-10-09 release 20261009202036

Assistant setup page /assistant shipped with canonical public endpoint, explicit scope approval instructions, exact one-hour and parent-session revocation behavior, OAuth compatibility limitation and official SDK example. Account and grant UI link to it. Native Node certificate validation and official SDK were verified directly over public HTTPS without browser bridging, cookies or Origin headers in SDK requests; selectedget_bell scope worked and parent signout revoked the already-open client. Mobile setup and account entry links passed. Full Linux suite194tests/typecheck/build passed; latest production guard/credential scan passed. Proof test-results/assistant-setup-proof.json. No actual third-party assistant/OAuth/Studio/mainnet connection is claimed.

## 2026-10-09 release 20261009202716

Completed private Bell reviews now export versioned JSON evidence via owner-authenticated /api/agent/reviews/[id]/export. Export includes captured Bell/policy/source report and explicitly no financial authority, excludes request/session/worker material, and refuses incomplete or inconsistent evidence. Two tests passed; full Linux suite196tests, typecheck/build and dependency audit0 passed. Production flags, database0600 and browser-secret matches0 checked. Paymaster public RPC reachability verified from VPS; eligibility and sponsorship remain unverified.

## 2026-10-09 release 20261009204338

Stock brief admission now enforces two pending jobs per account, forty globally and five hundred stored jobs per account within the admission transaction. Request-ID replay precedes limits; expired jobs across owners release pending capacity and late workers remain fenced. Reports must match ticker and fit 131072 serialized UTF-8 bytes. Saturation returns HTTP429 without another inserted job. History is preserved; no automatic deletion policy is claimed.

Eight job-store tests and the full Linux suite of 198 tests passed, along with typecheck, production build and dependency audit (zero vulnerabilities). Public HTTPS live brief/mobile and owner-only saved brief acceptance passed with no wallet requests or paid calls. Release guards verify DRY_RUN, MAINNET_WRITE_ENABLED=false, database0600 and zero browser credential matches. Proofs: test-results/stock-brief-proof.json and saved-brief-proof.json. This increment was implemented and verified by the primary engineer; a fresh independent agent review was unavailable after review agents reached their usage limit. External integration blockers remain documented in BLOCKERS.md.

## 2026-10-09 release 20261009214732 — Bell social previews

Public Bell links now expose canonical HTTPS metadata and generated1200x630 PNG allocation previews with title, published version, paper-trading label and virtual cash reserve. Metadata uses the validated configured public origin including port; live QA caught and repaired the framework localhost image fallback. Missing Bells return image404 and nonindexing metadata. Public data only; no session/account/receipt data is read by metadata or image generation.

Delegated auth_review accepted the implementation and final origin repair (docs/reviews/social-preview-review.md). Full Linux198tests, typecheck, production build and audit0 passed. Public HTTPS metadata/image regression passed across five Bells; generated PNG visually inspected. Browser credential matches0, database0600 and paper-only guards confirmed. Proof: test-results/social-preview-proof.json. Social-platform caching and physical-device preview behavior are not established by this controlled check.


## 2026-10-09 release 20261009215433 — Bell request resource bounds

Bell creation and publication reject bodies exceeding4096 raw UTF-8 bytes during streaming, before retention/decoding completes. Strict UTF-8 decoding supports split characters; invalid JSON/UTF-8 or oversized input cancels the reader and releases its lock. Server ownership, schemas, same-origin and publication version fencing remain. Three targeted tests and delegated auth_review passed (docs/reviews/bell-request-body-review.md). Full Linux201tests/typecheck/build/audit0 passed before activation. Public HTTPS regression passed oversized POST/PATCH rejection without owned-row mutation, creation/publication, informational follow/update diff, stale acknowledgement rejection and mobile display. Guard scan confirms DRY_RUN/mainnetfalse/database0600/browsersecrets0. External mainnet/paid/Studio/Agentic gates remain unresolved.

Follow-up audit: eight other legacy API routes still use request.text before size checks (account, QR approval, execution, quote, wallet portfolio, paper, research draft and paper autopilot). They need the same streaming resource-bound treatment with their existing route-specific limits and identity behavior preserved. This Bell repair does not claim those routes are hardened.

## 2026-10-09 release 20261009220058 — Shared API input bounds

All eight legacy read-all body paths are replaced by a shared strict streaming JSON reader with existing256/512/2048/4096 byte ceilings. Actual bytes are bounded regardless of Content-Length. Malformed UTF-8/JSON cancels the stream and releases locks; quote/wallet malformed bodies return400 before providers are invoked. Bell4096 uses the same reader. Parse still precedes account/provider work; existing origin/identity/schema/version/idempotency gates remain.

Independent auth_review and five targeted reader tests passed. Full Linux203tests, typecheck/build/audit0 passed. External HTTPS acceptance: eight oversized routes400/no new account cookies, foreign origins403, synthetic wallet message sign-in/logout and secureHttpOnly cookie PASS; paper workflow13checks PASS with no wallet requests. No financial authority changed. Further mandate audit is ongoing.

## 2026-10-09 assistant draft workflow

Release20261009221928 adds explicitly approved manual-grant scopes create_bell_from_prompt, modify_bell_from_prompt and create_policy_from_prompt. Existing grants do not gain new scopes. Drafts remain unsaved; publication/saved policy/preparation/financial tools remain excluded. Strict paste/review bridge supports actual MCP nonexecution wrapper and raw draft, preserves owner edit/version/fork provenance and requires separate save. Client source claims are explicitly unverified. Completed factual reviews can generate user-directed proposals only from captured reviewed tickers, fresh sources and captured exposure/reserve rules; explicit cash required. This is a deterministic parser, not Studio/analyst stock selection.

Native SDK draft calls, exact scope discovery, denied publication, parent signout revocation and mobile editor import passed with zero automatic writes. Independent reviews accepted scope/import and final implicit-reserve fix. Full Linux tests/typecheck/build/audit0 passed. Source-grounded proposal-to-editor live acceptance passed on sequential rerun after a legitimate shared429 quota response. Private report/export access and sign-out clearing, explicit cash/allocations, zero automatic saves and mobile layout passed. Proofs: test-results/assistant-drafts-proof.json and private-services-proof.json.


## 2026-10-09 release20261009223621 — Assistant personal-rule import

Personal-rule MCP drafts now have a strict reviewed portfolio import. Explicit clauses regenerate against current saved rules; unspecified caps are preserved, mismatched values/provenance/authority and stale versions reject. Import fills the editor only; existing separate Save uses policy CAS. Controls disable during save/refetch. Independent review accepted three tests and final UI correction. Full216Linux tests, typecheck/build/audit0 passed. Public native SDK + mobile Bell/rule import, zero automatic writes, separate paper-rule save and stale-version rejection passed. Guard scan verifies DRY_RUN/mainnetfalse/database0600/browsersecrets0. Proof test-results/assistant-drafts-proof.json; review docs/reviews/assistant-policy-import-review.md. Real provider/mainnet gates remain incomplete.


## 2026-10-09 release20261009225007 — Portfolio view modes

User requested removing paper-only behavior or making it switchable. /portfolio now has explicit Paper portfolio and Real wallet links; ?mode=wallet shows actual-wallet holdings/checks interface only, paper remains virtual view. Mode-specific badge and readiness copy expose signing/submission/permissions/sponsorship gaps. Query mode is navigation only, does not confer authority or enable writes. Unknown mainnet mode defaults paper. Independent review, public mobile switch/interface isolation/zero automatic wallet requests passed.216tests/typecheck/build/audit0; final guard scan mainnetfalse/DRY_RUN/database0600/browsersecrets0. Proof test-results/portfolio-modes-proof.json. Funded authorization clarification remains unanswered; no real trades enabled.




