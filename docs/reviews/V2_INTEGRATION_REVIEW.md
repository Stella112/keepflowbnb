# Version 2 independent review — 2026-10-08

The user requested the mandate's builder and independent verifier roles. Codex implementation agents and a separate Codex review agent performed these passes. No Claude CLI/model invocation is claimed.

## Findings and repairs

- Swap success initially trusted the status label. Production checks now require the exact wallet USDT debit and minimum supported stock receipt, rejecting unrelated owners/tokens/effects. Independent review then found legitimate allowance consumption was rejected; only the verified spender's exact decrement from independently read allowance is accepted. Native gas marker semantics remain unverified and fail closed.
- Policy updates lacked durable replay and version checks. A/B/A replay preserves B while returning A's original result; changed instructions and stale versions reject. Paper sells now obey maximum trade limits.
- Bell checks omitted the stricter Bell reserve. Effective reserve is the maximum of Bell and personal reserve.
- Dry-check admission was not atomic. SQLite BEGIN IMMEDIATE now serializes admission. Independent review found expired workers could resurrect terminal receipts; terminal-state/fingerprint fencing and stopped saves now prevent it. Production core is directly exercised with SQLite tests.
- Public HTTP identity exposed persistent account UUID credentials. Public identity operations now require HTTPS; localhost preview is permitted. Random, hashed-at-rest, revocable sessions replace UUID authentication. Old linked UUID cookies require wallet reauthentication without deleting account data.
- Draft parser accepted negative percentages, discarded unfamiliar allocations and let no-selling text exempt unrelated transfer/short instructions. Independent reproductions were repaired with adversarial tests. Request generation binding rejects stale responses. Parser/discovery labels do not claim an LLM or analyst provider.
- Agentic diagnostics ignored inactivity expiry. The earlier of session and inactivity expiry now applies. Fixed commands, contained package entry, child environment filtering and operator/wallet binding were reviewed and tested against a synthetic subprocess fixture. No real provider installation/authentication is claimed.

## Evidence

Release 20261008220331: 66/66 Linux tests, typecheck and production build passed. Deployed browser draft/export flow: 12 checks passed, zero wallet requests. Paper regression: 13 workflow checks passed, including policy replay/version conflicts, buy/sell, partial basket stop, fork and receipt privacy. Secure QR regression: 14 checks passed through certificate-validated HTTPS over SSH, zero transaction requests; physical phone scan and public port 443 are not proved by this transport.

Later operator adapter: six tests and typecheck passed locally; final deployment verification is recorded in STATUS.md. Initial browser failures were recorded and resolved: disk full, unstable local tunnel, stale public-origin process setting and the Node proxy client's IP certificate handling. TLS verification was never disabled. Cross-origin test records browser blocking when no server POST response exists; it does not fabricate an HTTP status.

## Verdict

Reviewed paper/read-only improvements can ship with the stated limitations. The full mandate is INCOMPLETE. Existing MCP source, real Agentic/Studio sessions/runtime, sponsored execution, paid research, mainnet confirmations, physical Binance Wallet/device evidence and submission gates remain open. Real spending remains unauthorized and disabled.
