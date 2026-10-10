# Policy and read-only intent implementation / independent review

User requested the mandate's Claude Code builder and Codex audit roles. Implementation and independently assigned adversarial review were performed by separate Codex agents. No Claude Code CLI or Claude model was invoked. Canonical Version 2 remains the acceptance contract; overall full-product status remains INCOMPLETE.

Implemented stored Bell caps, canonical policy exports, stricter personal/Bell intersection, configurable creator editor, fork policy/version provenance, manual and scheduled paper checks, quote/slippage/local price freshness checks, and durable owner-scoped read-only transaction intents. Prepared transaction data is pinned internally; public views omit executable calldata. Reconciliation checks an externally submitted hash without signing or broadcasting.

Independent findings repaired:

- Paper sells ignored the user's selected indicative-price freshness. Stale, malformed and future timestamps now block before any account mutation.
- Intent PENDING -> UNKNOWN after RPC failure lost the observed hash fence. Durable binding by intent and a one-hash database index preserve it across outages and reopen; initial unseen UNKNOWN does not bind an arbitrary hash.
- Reorganization during stock balance verification could leave a false confirmation. Canonical block hash is checked again after the balance read.
- Account-check UI could label an externally reconciled transaction as absent. It now states only that First Bell submitted none, and clears the private result on authentication rejection.
- x402 research offer inspection accepted amounts above uint256. Both offered amount and configured research budget now enforce the ERC20 integer bound.

Reusable tool service has validated public reads, scoped private reads, explicitly confirmed owned Bell mutations and unsaved allocation drafts. Version comparison includes policy changes. It is not a replacement transport for the missing existing MCP. Research offer inspection validates actual offered price/resource/network/payee/token/budget but does not authenticate a merchant cryptographically, pay, sign or retrieve a paid report.

Local suite before final contribution-preview addition: 97 tests PASS; typecheck PASS. Final Linux release 20261008230321: 98 tests, typecheck and build PASS. Browser policy/intents 20 checks PASS, zero wallet requests; private journal and session persistence PASS after restart. Synthetic receipt fixtures establish reconciliation logic, not an actual mainnet transaction. No funds spent, signed or broadcast. User paper-only instruction remains active.
