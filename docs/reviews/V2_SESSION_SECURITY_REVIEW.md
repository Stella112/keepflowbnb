# Session security review — 2026-10-09

Release 20261009093526. Independent Codex implementation and review fulfilled the builder and verifier roles; no Claude CLI was invoked.

The session API derives account identity only from the protected opaque cookie. Revocation acquires a database write lock and then revalidates the current session and expiry. It preserves the current session, foreign accounts and expired records. Responses expose counts and expiry, without credentials or device guesses.

Review identified stale asynchronous QR completion overwriting newer account state. Lifecycle and request generations now fence results. A shared operation lock also prevents competing QR and desktop sign-in requests from committing conflicting identities. Cleanup does not release the lock before the operation settles.

Validation: four focused session tests; 139 Linux tests; typecheck and production build; npm audit zero vulnerabilities. Deployed mobile session revocation passed, including idempotent replay and preservation of the current and unrelated accounts. Certificate-validating browser QR regression passed 15 checks, including an actual FINISH request held while desktop sign-in was attempted. No desktop signature or transaction was requested during that competing operation.

Evidence: test-results/session-security-proof.json and test-results/qr-login-proof.json. Synthetic unfunded signers were used for authentication. TLS was verified through SSH; public port 443 and a physical phone scan remain unverified. Mainnet writes remain disabled. The full Version 2 mandate remains incomplete.
