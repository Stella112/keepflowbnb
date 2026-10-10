# MCP and real-wallet planning review — 2026-10-09

Builder work and independent Codex review were performed by distinct agents. No Claude CLI/model execution is claimed. Financial authority remains paper trading and read-only integration.

The MCP implementation preserves service/application bindings and uses official SDK1.32.1 stateless Streamable HTTP. Authentication is resolved per private call, never cached in a protocol session. Strict tool schemas reject injected wallet/context fields. Mutation, signing, funding and execution authorization are excluded. Independent review reproduced three batched calls consuming one admission slot; builder added per-operation limits and a batch regression. Preparation annotations were corrected because dry-check evidence is persisted. Final independent source review accepted the repairs; four SDK protocol tests passed.

Actual-wallet contribution planning derives identity from the existing opaque wallet session, verifies secure transport and same-origin, caps and validates input, pins an immutable Bell version/hash and reads real balances at one BSC block. Exact bigint math uses hypothetical contribution only, with stricter Bell/personal trade, exposure, reserve and aggregate configured daily/weekly ceilings. No selling or current-cash spending occurs. Remaining live budget usage is explicitly UNVERIFIED. Independent review accepted secure-transport and cumulative-cap repairs. Five targeted tests passed, including stale/future snapshots, micro rounding, zero caps and reserve shortfall.

UI adds a separate read-only planning section alongside paper Autopilot. Input changes clear obsolete proposals; requests are aborted and fenced on changes/unmount. Historical Bell versions now expose stored rules and selectable allocation/policy comparisons with content hashes. These comparisons do not change adopted strategies or personal policy.

Linux release 20261009135927 passed 165/165 tests, typecheck, production build and dependency audit with zero reported vulnerabilities before activation. Deployed protocol, actual RPC and browser evidence are recorded separately as they complete. No paid call or real transaction is permitted by this review.

Deployed wallet/browser acceptance passed with actual empty-wallet BSC balances at block126648386. Active release guard check retained DRY_RUN and MAINNET_WRITE_ENABLED=false, database0600 and zero secret matches in browser bundles.

Deployed official SDK client acceptance also passed: discovery, Bell read, private paper portfolio and same-client revocation, strict input/context and foreign-origin boundaries. Evidence: test-results/mcp-protocol-proof.json.
