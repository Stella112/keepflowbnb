# Policy and identity security review

Reviewer: Codex independent review agent. Date: 2026-10-08 (Africa/Lagos).

Scope: `lib/paper/`, `lib/execution/`, and relevant `app/api/` handlers. This is a source and local test review, not a penetration test or proof of live execution. No secrets were read, no server settings were changed, and no funds were spent. Only this report was written.

## Severity-ranked findings

### P1 — Public HTTP exposes authenticated account bearer sessions

References: `scripts/deploy.mjs:66`; `lib/paper/store.ts:28`; `app/api/account/route.ts:20`; `app/api/account/qr/[id]/route.ts:21`; `docs/DEPLOYMENT.md:27` and `:37`.

Deployment explicitly chooses `http://56.125.248.192` as the public URL. Session cookies are Secure only when the opt-in `PAPER_COOKIE_SECURE` variable is true, and last 90 days. The documented deployment keeps authenticated virtual-account access on HTTP while HTTPS remains unreachable. A network intermediary can read the account cookie or modify delivered login JavaScript. Possession of the cookie permits policy changes, private receipt access, and publication as the linked creator; wallet sign-in is not repeated for those operations. This affects identity and account integrity even though current trade paths cannot spend real funds.

Fix: finish reachable HTTPS, redirect HTTP, force Secure session cookies outside explicit localhost development, and restrict authenticated login/QR endpoints to trusted HTTPS origins. Rotate/revoke existing bearer sessions when migrating. Do not claim wallet-backed identity is protected merely because private keys remain in the wallet. Add an integration test that rejects production HTTP authentication and checks cookie attributes.

### P2 — Real Bell checks omit the Bell reserve from effective policy

References: `app/api/execution/route.ts:26`; `lib/execution/check.ts:18`; `lib/execution/rules.ts:16`; contrast `app/api/paper/route.ts:41`.

The dry receipt copies only the account's policy. The checker applies that policy without taking `max(personal.minReserveBps, bell.reserveBps)`. The planner's reserved portion is a fraction of the requested budget, not an enforcement of the wallet's post-action reserve fraction. Consequently, a Bell with a stricter reserve can produce an ALLOWED policy result inconsistent with its own rules.

Controlled reproduction: `walletPolicy(6000000n, 20000000n, 0n, 100000000n, {maxTradeUsd:'25', maxSingleAssetBps:10000, minReserveBps:1000, driftBps:500})` returns ALLOWED. A Bell requiring 20% cash would leave 14% cash and should block. This invokes the actual pure function without upstream fixtures or funds.

Fix: persist and enforce an effective Bell/personal policy intersection; include Bell rules/version in the receipt and regression-test this stricter Bell reserve case. Current impact is an inaccurate read-only decision, not a live spend.

### P2 — Policy mutation skips idempotency despite accepting a request ID

References: `app/api/paper/route.ts:17`, `:26`, `:27`, `:35`.

POLICY requests return before the request-fingerprint/replay logic used by trade actions. A delayed duplicate of policy update A can overwrite later update B, including replacing tighter spending limits with stale looser settings. The request ID implies deduplication but is ignored for this mutation; no durable policy version or mutation receipt is saved.

Fix: atomically record policy request IDs and fingerprints, reject conflicting replay, and require a current policy version for updates. Repeated identical old requests should return their original result without reapplying. Test A, B, then replay A, and verify B remains current. This currently changes paper and dry-check rules; live execution is absent.

### P2 — Full paper sells claim policy allowance without evaluating the trade limit

References: `app/api/paper/route.ts:38`; `lib/paper/engine.ts:41-45` (function starts at line 41).

`fillSell` liquidates the entire paper position and labels the result `policy: ALLOWED`, but does not receive or evaluate personal policy. A position worth $125 can be fully sold while `maxTradeUsd` is $1. The existing conservation test demonstrates a $125 sell and does not check the policy boundary. Manual selling need not be prohibited by an automatic-selling switch, but a general maximum-trade rule should either apply or the product must clearly identify a deliberate manual-exit exception.

Fix: evaluate the applicable sell rules and record a real decision, or define and display an explicit manual-full-exit exception rather than reporting unevaluated policy as ALLOWED. Add an over-limit manual sell regression test. No onchain sell is performed by this path.

### P3 — Active dry-check admission is not atomic

References: `app/api/execution/route.ts:23-27`; `lib/execution/store.ts:5` and `:8`.

The active-check lookup and initial insert are separate database operations with no per-owner active-work uniqueness constraint. Multiple processes can accept different requests for the same account before either inserts. Identical request-ID races are contained by the unique owner/request constraint, but the losing request gets the generic 400 response instead of the existing receipt. This is a read-only concurrency and upstream-resource issue, not duplicate spending.

Fix: admit new checks in a short atomic transaction with a durable active-work claim. Test overlapping admissions across database connections and return the original receipt on identical replay.

## Positive controls verified in source

- Paper trade mutations recheck idempotency inside `BEGIN IMMEDIATE`; private receipt lookups include owner identity. Bell publication checks owner and expected version atomically.
- Scheduled paper work rechecks plan identity, due period, and enabled state inside its mutation transaction. It records the virtual contribution and scheduled receipt together, advances to a future period, and does not backfill missed periods.
- Sequential paper and dry-run processing preserves preceding results and leaves subsequent legs NOT_STARTED after the first failure. Dry receipts retain `transactionHash: null`, `executionEnabled: false`, and mode DRY_RUN.
- Wallet login binds the signed domain, address, nonce, chain, and five-minute expiry. Challenge consumption and QR redemption use transactions and reject replay/expired or wrong-desktop redemption.
- Onchain portfolio reads use the same block for balance and token-metadata reads. Missing verification fails rather than substituting zero balances.
- The inspected API transport has no broadcast/order-submission method. Source search found no `eth_sendTransaction` or `sendTransaction` execution path in the reviewed backend. No authenticated account signature itself authorizes spending.

## Verification and remaining evidence

`npm test`: 39 tests passed, 0 failed. The suite covers pure policy boundaries, sequential partial outcomes, login-message binding, QR rules, API signing, and fixture quote validation. It does not establish HTTP transport security, end-to-end SQLite policy replay handling, cross-process dry-check admission, successful real swap simulation, confirmed onchain trade, or ownership after a real purchase.

The current scheduler is PAPER only; the real Bell checker is DRY_RUN only. An autonomous mainnet wallet/session/permission model, live spending-policy intersection, transaction-state reconciliation, and confirmed ownership proof remain unimplemented or unproven in this reviewed snapshot. These absences must remain explicit completion blockers, not be inferred from passing paper tests. The user's paper-only instruction still prohibits enabling or testing funded mainnet writes.


## Resolution evidence — policy replay and manual sell

Implemented the two assigned P2 fixes on 2026-10-08. `lib/paper/policy-mutations.ts` stores an append-only request-ID/fingerprint/result ledger inside the existing durable account JSON. `app/api/paper/route.ts` calls it under the existing immediate SQLite transaction; stale distinct edits return 409, legacy omitted versions work only at version 0, identical old replays return their original version without reapplying, and policy/trade request-ID reuse is rejected. `/api/paper` exposes policyVersion and the portfolio UI sends it on save. The ledger is capped at 500 entries without evicting replay protection.

`fillSell` now checks proceeds against maxTradeUsd before changing cash or positions. Over-limit full exits record BLOCKED; an exact-boundary exit succeeds. The existing conservation test now verifies that blocked exits do not mutate account state before authorizing the $125 virtual limit.

Added three policy-mutation tests including an on-disk SQLite close/reopen test, A/B/A replay, changed payload conflict, stale CAS, legacy migration and cross-action IDs. Full local suite at this point: 49 tests passed, 0 failed (includes concurrent work by other agents). Updated check-paper.mjs with actual endpoint replay/CAS assertions and an explicit $1000 virtual sell limit. That browser script has not been run against a deployed version of these changes by this reviewer. The earlier HTTP, Bell reserve and admission findings are not marked resolved by these policy-only edits; the primary agent owns those changes.

## Resolution evidence — authenticated transport and session migration

Implemented source-level HTTPS identity guards on account and QR endpoints, plus restoration guards in the shared account store. Public HTTP cannot issue or restore linked identities; exact localhost/127.0.0.1/::1 origins remain supported for SSH preview/development. QR creation refuses a configured public HTTP phone URL and explains the HTTPS blocker. HTTPS cookie Secure is derived from verified request transport rather than an opt-in environment setting.

Fresh wallet verification and QR redemption now issue a separate 256-bit opaque firstbell-identity session. Only SHA256 token hashes are stored in identity_sessions; sessions expire after 90 days and are revoked on logout/replacement. Previously transmitted linked account UUIDs do not authenticate even when replayed over HTTPS; accounts, Bells, paper holdings and receipts are preserved for recovery through fresh wallet sign-in. Anonymous paper UUIDs remain separate from verified identities.

Inspected deployed proxy template: nginx overwrites X-Forwarded-Proto and the Next process listens on loopback. Installed Next source next-server.js:1284 constructs its initial URL from the configured fetchHostname. Request-origin logic trusts forwarded schemes only for an internal loopback request URL; malformed lists and direct public forwarded-header spoofing fail. Five targeted origin/session tests and typecheck passed. These are source fixes only; no deployment or public HTTPS reachability proof was performed by this reviewer. Public TLS connectivity remains a deployment blocker.

## Bell policy implementation evidence

Stored Bell definitions now accept validated optional per-trade, company-exposure, reserve, route-slippage and quote/indicative-price freshness caps. The editor exposes these fields; automatic selling remains prohibited and contributions remain first. Omitted caps preserve legacy behavior. effectiveBellPolicy applies the stricter Bell/personal cap and higher reserve, including scheduled paper fills and allocation cash availability. quotePolicy supplies deterministic slippage and local freshness decisions to read-only execution callers. The manifest exports the actual stored policy and its hash changes with policy changes; it no longer invents a universal 50bps user policy. New forks inherit omitted source policy by value and retain source-version provenance, without mutating the source.

Typecheck passed; Bell-policy/paper/execution/manifest tests passed 22/22 before adding one additional paper cap regression, then paper/Bell-policy tests passed 16/16. Tests cover legacy absence, stricter intersection, invalid caps, selected slippage below the current verified 50bps builder, freshness boundaries, manifest integrity and nonmutation after blocked paper fills. Daily/weekly mainnet spending budgets and automatic selling are not implemented by these optional fields. Paper fills still do not model actual slippage or validate a live trade.

## Independent durable-intent audit

Reviewed lib/execution/intents and app/api/intents independently of their implementer. Owned reads, server-derived verified wallet identity, strict input rejection of caller authority/calldata, read-only transaction views, persistent request fingerprints, revision CAS, terminal fencing, immutable prepared quote/transaction, exact transaction sender/target/calldata/value matching, receipt token effects and stock balance verification are present. API paths never sign or broadcast.

P2 finding: lib/execution/intents/store-core.ts:18 only fences a hash while the latest reconciliation status is PENDING/terminal. Once a previously observed hash changes to UNKNOWN because of an RPC outage, a different hash can be accepted. The hash-binding table permits multiple hashes per intent. Controlled actual SQLite-store reproduction accepted READY -> PENDING(hashA) -> UNKNOWN(hashA) -> PENDING(hashB), each update returning true. Fix requested from the implementer: keep the durable observed transaction-hash binding across UNKNOWN results, while unobserved UNKNOWN hashes may remain unbound. Add a regression covering that sequence and reject alternate hash even if the new RPC result is UNKNOWN.

A second issue, a reorg during the post-receipt balance read, was identified during review. The implementer concurrently added a final canonical block hash reread in reconcile-core.ts:31. The associated test passes; current intents suite passed 8/8 at review time. The hash-fencing issue was still present at that test snapshot. All receipt fixtures are synthetic; no confirmed live First Bell trade is established.

## Final integration follow-up — 2026-10-09

The read-only intent implementer fixed hash-fencing loss with a durable binding-by-intent check inside the update transaction. An observed hash remains pinned even when the latest RPC result is UNKNOWN; first unseen UNKNOWN remains unbound. Independently inspected the guard and ran the intents suite: 10/10 passed, including resumed same-hash reconciliation and rejected alternate hash after store reconstruction. The final canonical-block recheck also remains present. The previously reported two intent P2 defects are resolved in source; no real trade proof follows from synthetic receipt tests.

A stale-paper-sell discrepancy found by the primary integration reviewer is fixed in fillSell: selected priceMaxAgeSeconds rejects stale, invalid and future indicative timestamps before changing cash/positions. Regression tests verify unchanged state for all three failures and successful fresh exit. Paper tests passed 14/14 and typecheck passed in the combined paper/intents verification.

contributionPlan already computes cash availability using effectiveBellPolicy(bell, account.policy). Therefore callers passing the stored account are safe for selected stricter Bell reserve; a regression uses Bell target reserve 10%, explicit Bell minimum reserve 90%, and personal reserve 10%, proving allocation spends at most the remaining 10% without mutating state. Full manual basket fills were separately wired to effectiveBellPolicy by the primary agent.

## Personal-policy drafting and tools audit — 2026-10-09

Implemented strict deterministic personal-policy suggestions in policy-draft.ts, a server-derived current-session endpoint, and a reusable review component. Explicit trade/exposure/reserve/slippage/freshness clauses merge with current policy without mutating the supplied object. Duplicate, ambiguous, unsupported, automatic-selling and money-movement clauses fail closed. Returned suggestions include explicit field names, original clause provenance, saved:false, authorization:NONE and limitations. The component emits the reviewed draft plus expectedPolicyVersion to the existing editor; it never saves by itself. Three parser tests and typecheck passed. Actual editor integration and endpoint browser tests belong to the primary agent.

Independently inspected the internal tool service/application adapter and ran tools.test.ts: 6/6 passed. Private owner context is checked against strict trusted-session scopes, owned Bell mutation additionally requires confirmation and ownership, and receipts are looked up only within that account. Unknown writes and financial execution remain disabled. At this snapshot applicationTools does not supply several optional preparation/drift/execution-status callbacks, so listed tools may truthfully report NOT_CONFIGURED/NOT_FOUND. No verified external MCP transport or deployed agent authorization was established by these internal service tests. External transports must create trusted authorization context from verified sessions and never deserialize it from caller tool arguments. No additional observed P1/P2 in the reviewed internal wrapper.

## Allocation parser adversarial fixes — 2026-10-09

Resolved two independently reported allocation-draft defects. The parser rejects percentage tokens with more than two fractional digits anywhere in the prompt before matching allocations/reserves/caps. Leading-decimal percentages cannot become trailing integer matches. Repeated single-stock cap clauses, including identical repeated caps, are rejected rather than silently selecting the first. Seven research parser tests and typecheck passed, preserving existing signed-weight, unsupported asset, ambiguous allocation, cap-violation and prohibited-action rejections.

Production internal tool callbacks were subsequently wired for read-only stock preparation, drift, contribution preview and owned execution status. This supersedes the earlier missing-callback snapshot, while the external MCP transport limitation remains. Noted to the primary that create_policy_from_prompt should return the source expectedPolicyVersion alongside its merged draft, matching the standalone endpoint; no policy mutation is performed by the current tool.

## Portfolio personal-policy draft CAS audit — 2026-10-09

Independently reviewed primary integration in app/portfolio/view.tsx. Draft application copies the proposed policy and its source expectedPolicyVersion into separate editor state; only the explicit Save paper rules action submits a POLICY mutation with that captured version. Refresh loads the policy and version together. Concurrent newer persisted rules therefore cause stale draft saves to fail CAS rather than overwriting them. Preparing or applying a draft does not call the save endpoint or grant authority.

Reviewed standalone draft endpoint: same-origin requirement, existing account/session lookup, shared rate limit, bounded 2048-byte streamed body, strict prompt-only schema, server-derived current policy/version and no-store output. It performs no policy/database mutation. Six draft/mutation tests passed in combined verification. Browser-level deferred-response/refresh races were not exercised by this reviewer; a refresh can replace unsaved editor values, but it does not bypass server CAS.

## Asynchronous factual stock brief UI and backend audit — 2026-10-09

Implemented StockResearch client component. It creates a private source-data job only after an explicit button press, polls the returned job at most 40 times with two-second waits, and has an 85-second hard deadline. AbortController and generation checks clear old results on ticker change, unmount, errors or timeout. Job creation is not automatically retried. Completed data is displayed as indicative Binance RWA facts, with source URL/timestamp, provider price/ratio/status, escaped technical details and the original limitations. It explicitly disclaims analyst/AI rating and paid research. Invalid/missing reports never become fabricated success.

Independently inspected job backend and store: caller account is derived from existing server session, owner-scoped SQL covers reads/replay/completion, request schemas exclude client owner authority, body is bounded, new job admission is rate-limited before insertion, changed ticker replay conflicts, terminal status prevents late overwrites, and expiration rereads persisted status when conditional expiration loses a race. Trusted completion calls the validated actual discovery brief builder. No payment or signing path exists. Five job-store tests and three factual-brief tests passed; typecheck passed. Primary owns browser integration/deployment testing; no real analyst research provider or live trade evidence was established.
