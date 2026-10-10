# Informational follows — independent review

Release 20261009082916 adds private durable follow snapshots and informational creator-update acknowledgement. Integration and UI builders were separate from the auth reviewer. All workers were Codex; no Claude runtime was invoked.

Primary review repaired strict BellInput parsing of a Bell containing publication metadata and Node strip-only constructor syntax. Independent auth review repaired stale mutation error responses clearing a newer component state before the generation/abort check. Final review found no blocking source issues.

The current/pinned version check and snapshot write run under BEGIN IMMEDIATE on the same SQLite database as creator publication. Retries retain the pinned version. Ownership is derived from the server session; request arguments cannot supply account identity. Mutations use same-origin, supported transport, strict schemas and a 1024-byte streaming bound. Fifty records per account bounds growth. Following never writes account policy, balances, holdings or Autopilot.

All 123 Linux tests, typecheck and production build passed. Deployed mobile browser exercised follow, actual creator publication, diffs and personal-policy warning, stale409 rejection, explicit informational acknowledgement and idempotent unfollow. It verified unchanged personal policy/Autopilot. Runtime guard and secret bundle scans passed. The unchanged QA Bell was removed after exact identity/content validation.

Evidence: test-results/bell-follow-proof.json. Store fixtures establish logic rather than mainnet integration. This feature grants no financial authority and does not satisfy pending MCP, paid research, external wallet, sponsorship or mainnet acceptance gates.
