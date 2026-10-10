# Independent Codex authentication and transaction review

Reviewed 2026-10-08. Reviewer: independent Codex sub-agent. No Claude participation is claimed. Scope: `lib/binance/auth.ts`, `client-core.ts`, `client.ts`, `trading.ts`, `trading-schemas.ts`, `onchain.ts`, and their existing tests. No credentials were read, no production files changed, no flags changed, and no funds spent.

## Findings

### P1 — Swap simulation accepts success without verifying its effects

Location: `lib/binance/trading.ts:64-68`; `lib/binance/trading-schemas.ts:24-25`.

`swapStatus` depends only on upstream `status` and empty/null `failReason`. The response's `balanceChanges` and `allowanceChanges` are ignored for swaps. A valid-shaped response with `status: "SUCCESS"`, `failReason: null`, empty effects, or a debit to the wrong owner/token passes. The basket then labels that leg SIMULATED (`lib/execution/check.ts:29-35`). Exact approval effect checks exist, but equivalent swap intent checks do not.

Reproduction: pass `{status:"SUCCESS",failReason:null,balanceChanges:[],allowanceChanges:[]}` through `simulationSchema` and `simulationSucceeded`; both accept it. Add an unintended balance change and it still passes. This is a false positive preflight result, not an existing funds-loss path: execution is currently disabled.

Required repair: verify documented simulation effect semantics against the selected wallet, exact funding token/input, receiving token/minimum output, and permissible native gas effect. Reject unexpected allowance changes or unexplained asset debits. If upstream cannot supply reliable effects, expose "upstream simulation succeeded; effects unverified" and do not treat it as execution-ready. Test malformed/wrong-owner/wrong-token/extra-debit effects in the actual candidate pipeline.

### Retracted — Network fee mapping

The initial fee finding was incorrect. Official [Binance Trading API documentation](https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api) documents `tradeFee` as estimated network fee in USD (swap field reference, lines 1189–1195, checked 2026-10-08). Mapping it to `estimatedNetworkFeeUsd` is supported. No fee mapping change is requested.

### P2 — Response-size protection runs after the full body is buffered (repaired)

Location: `lib/binance/client-core.ts:118,126`.

`response.text()` allocates the entire body before the two-million-character check. A large upstream/challenge response can consume excessive memory on the 4 GB VPS; the check limits parsing, not network reads or allocation.

Reproduction: mocked fetch returning a body larger than the limit causes the full body to be read before INVALID_RESPONSE. The current test suite covers HTML and invalid envelopes, but not bounded streaming consumption.

Required repair: read the response stream with a byte cap and cancel on overflow; validate Content-Length when available without relying on it. Test cancellation and error classification for a stream exceeding the cap.

Repair applied: `boundedResponseText` rejects oversized declared lengths before reading, caps actual streamed bytes at 2,000,000 even when Content-Length is absent or false, cancels on overflow, incrementally decodes split UTF-8, and preserves the existing fetch abort signal. Oversized bodies classify as INVALID_RESPONSE with ENVELOPE_INVALID metrics; stream transport failures remain sanitized NETWORK errors. Neither failure is retried. Only `client-core.ts` and its tests were changed. `node --test tests/client.test.ts`: **14 passed, 0 failed**, including four new streaming tests. No live endpoint was contacted.

### P2 — Candidate/approval orchestration is not directly covered by adversarial tests

Location: `tests/trading.test.ts:9-42`; `lib/binance/trading.ts:41-68`.

Existing tests parse stored real fixtures and check the fixture's approval values. They do not invoke `buildCandidate` or `simulateCandidate` with adversarial responses. A regression removing the exact spender/amount/from/value/vendor/slippage validation from production `buildCandidate` would leave those tests green. This is material coverage missing at the future wallet-spending boundary.

Required repair: make read-only transport/onchain dependencies injectable and exercise production candidate construction against wrong recipient, wrong spender, unlimited approval, wrong sender, nonzero native value, changed vendor, lower minimum output, stale quote, and contradictory simulation effects. Ensure rejected candidates are never handed to a signer. Do not create tests that merely repeat fixture checks.

## Positive evidence and boundaries

- HMAC signs the exact encoded pathname/query and raw POST body; fixed official API host and manual redirects prevent credential forwarding to a redirected host.
- Only simulation POST is exposed; it is not retried. Safe GET retries are bounded and exclude compliance/authentication/schema failures.
- Sanitized error and metric tests avoid logging upstream error strings or configured credentials.
- Token code, decimals, symbol and BSC chain ID are verified before quoting. Amounts use bigint.
- Production builder checks sender, zero native value, vendor, route-specific spender, exact approval amount, and minimum-output metadata. These checks are valuable but do not prove opaque swap calldata has the stated semantics.
- Approval simulation success is separate from swap simulation success. No state override falsely makes an unapproved swap pass.

Verification: `node --test tests/auth.test.ts tests/client.test.ts tests/trading.test.ts` completed with **17 passed, 0 failed**. Node emitted a MODULE_TYPELESS_PACKAGE_JSON warning; it did not affect test results. Testing used fixture/test-only credentials and no live calls.

## Gates not proven by this review

No successful live swap simulation was newly established. No wallet approval, browser transaction signing, broadcast, confirmation, token transfer effect, verified ownership increase, fee accounting, requote-after-confirmed-approval flow, or real-money purchase was tested. No mainnet mode guard implementation was certified; current methods return execution disabled. A successful test suite or upstream simulation status must not be presented as proof of a completed purchase.

## Follow-up independent review: effects and atomic admission

Reviewed mandate v2 (`CLAUDE.md`) and current `swapEffectsMatch`, candidate wiring, `execution/store.ts` and `/api/execution` admission. Date: 2026-10-08. This remains an independent Codex review; no Claude identity or financial execution is claimed.

**Repaired:** the first effect validator rejected every allowance change. A real ERC20 `transferFrom` can decrement allowance. The validator now permits at most one reported decrement only when token, owner, spender and independently read pre-allowance match, and post-allowance equals pre-allowance minus the exact input. It rejects additional entries, increases, wrong identities and stale pre-allowances. Empty allowance changes remain accepted; no unreported allowance change is fabricated. Candidate wiring supplies the verified route spender and actual read allowance. A provider SUCCESS with mismatched effects gets an explicit unverified-effects failure message.

**Native effects remain unverified:** the official [Transaction API](https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/transaction-api) defines signed balance deltas and pre/post allowance units, and describes empty/native contract markers. It does not establish the exact BSC native marker/tokenType or whether returned balance deltas include transaction gas. Native/gas deltas remain fail-closed rather than ignored. The synthetic native test is explicitly adversarial, not a recorded provider fixture. A real successful fixture or verified provider semantics is required before native effects may pass.

**Admission:** `admitDryCheck` uses BEGIN IMMEDIATE, checks existing request/fingerprint ownership and active per-owner checks within that transaction, then persists the CHECKING intent. This removes the concurrent admission race for currently active checks. Remaining P2 at `execution/store.ts:6,18`: after the six-minute expiration, a late old worker's unconditional `saveDryReceipt` may overwrite the timeout result and overlap a newer admitted check. Current work is read-only, so this is receipt consistency/resource concurrency risk, not duplicate spending. Any future financial worker requires generation/lease fencing and terminal-state conditional updates. These execution files were reviewed but not modified by this reviewer.

Evidence: `node --test tests/trading.test.ts` **8 passed, 0 failed**, exit 0; `npm run typecheck` exit 0. Added tests exercise exact allowance decrement, wrong token/owner/spender, stale amount, increase, duplicate changes, unknown native effects, contradictory status/revert, zero minimum and identical funding/output token. No server calls, deployment, wallet signatures or funds movement occurred.

