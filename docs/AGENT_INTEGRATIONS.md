## Verified checkpoint — 2026-10-10

The full mandate remains incomplete; financial authorization remains paper trading and read-only integration.

Local Binance Agentic Wallet1.10.0 authentication is CONNECTED after the owner confirmed the official app QR. The verified local BSC operator wallet is 0x43b9bEB18853487d48bCB863EeEDF95597a1Fe7C. This does not authenticate the VPS or authorize financial execution. Application signing/payment flags remain disabled; no session state was copied between machines.

Research now has an actual fixed-origin StockAnalyst pricing/402 offer adapter, exact owner/session-bound fee grants, an independently recovered EIP3009 signer, a durable once-only asynchronous submission core, encrypted owner-bound job tokens and private status/report/resume routes. Unknown outcomes never resend; accepted jobs never imply verified payment settlement. Production payment submission is not wired or enabled. U/USD1 EIP3009 and USDT/USDC Permit2 are kept distinct. No paid request was made.

Sponsored execution now has a concrete zero-gas raw-transaction verifier, durable submission journal and canonical transaction/receipt binding. It requires a genuinely compatible raw signer and funded authorized evidence; these are not established. Zero fees do not prove sponsor payment. Studio configuration, credential-presence diagnostics and public MCP are tested; its real wallet/runtime/cloud identity is not authenticated.

317 local and Linux regression tests passed, plus six local supplemental Studio tests. Independent research authority/signer/submission/private-route review accepted the fixes. Public provider latency exceeded twelve seconds from the VPS; read-only discovery now permits thirty seconds. Latest production and public acceptance results follow as separate evidence.

Current checkpoint — 2026-10-10: guarded production manual approval and exact swap handoffs, whole-wallet durable budgets, canonical owner-private live receipts and sequential basket API/UI are implemented with default-off financial gates. Independent reviews and275 regression tests passed; public synthetic wallet UI and actual unfunded-owner route checks passed. No funded settlement is claimed. Official Agentic Wallet1.10.0 is installed with actual status UNCONNECTED; official documented preview/execute adapters remain authority-gated. Studio pinned official configuration loading and sole public read-only stdio MCP initialization passed; full wallet bootstrap/cloud identity remains unconfigured. Paid x402 code includes exact receipt verification and durable budgets, but a compatible real provider and payment authority remain absent. Read-only automation has an installed five-minute server timer; no autonomous spending is enabled. See STATUS.md for current deployed evidence. The dated sections below are historical.
# Read-only operator integrations — 2026-10-08

`lib/agents/operator-status.ts` and `tools/agents/status.ts` implement local diagnostics, disabled unless `AGENTIC_WALLET_ENABLED` / `AGENT_STUDIO_ENABLED` equals `true`. No environment flags, account permissions or funds were changed.

Run `node tools/agents/status.ts` for disabled-state inventory. The command accepts no arguments. Future authorized operators configure application-only `FIRSTBELL_AGENT_OPERATOR_ID` / `FIRSTBELL_AGENT_OPERATOR_WALLET` for identity binding, not claimed Binance session parameters.

## Documentation verified

The [official Binance preflight reference](https://raw.githubusercontent.com/binance/binance-skills-hub/main/skills/binance-web3/binance-agentic-wallet/references/preflight.md) identifies package `@binance/agentic-wallet`, executable `baw`, and minimum stable version 1.10.0.

The adapter invokes only `wallet status --json`, then `wallet address --json` when connected, then `wallet settings --json` after verifying the BSC address matches the configured operator wallet. Shapes are documented in [wallet view](https://raw.githubusercontent.com/binance/binance-skills-hub/main/skills/binance-web3/binance-agentic-wallet/references/wallet-view.md) and [wallet settings](https://raw.githubusercontent.com/binance/binance-skills-hub/main/skills/binance-web3/binance-agentic-wallet/references/wallet-setting.md). Unknown responses and expired sessions fail closed; only validated fields are returned, never credential fields or raw errors.

The [BNB product page](https://www.bnbchain.org/en/bnb-agent-studio) identifies `@bnbagent/studio-cli`; [official skills repository](https://github.com/bnb-chain/bnbchain-skills) documents `bag --version`. Only that Studio command is implemented. Its result proves CLI version only. Deeper plugin source retrieval failed through browsing; no undocumented cloud, research, diagnosis or payment command was invented. Managed trial is documented as 48-hour testnet-only and cannot prove mainnet execution.

## Boundary and actual prerequisites

This is SINGLE_OPERATOR only. Trusted caller authorization must derive configured operator identity; client-supplied IDs are not authentication. No public endpoint, session pool, transaction signing or automatic installer exists. Every response retains `executionEnabled:false`.

Runner resolves only project-local `tools/agents/node_modules/@binance/agentic-wallet` / `@bnbagent/studio-cli`, validates manifest name/version/bin and realpath containment, then invokes the contained JS entry with Node and frozen fixed arguments. No global binary fallback or shell interpolation. Ten-second timeout/32 KiB output cap apply. Child environment excludes application API keys. Local package isolation does not establish credential-store multi-tenancy.

Neither isolated package was present at inspection. Enabled checks return UNAVAILABLE until a reviewed local installation exists. No package/lock/global installation changes were made.

Agentic Wallet still requires owner-created Binance MPC Wallet, Agentic Wallet and App-authorized operator session. App limits/revocation/restricted-operation evidence remain unverified. Studio requires selected custody/model/runtime, cloud authorization, identity/deployment and approved budgets; none were created. Existing First Bell MCP location remains unresolved; no MCP integration is claimed.

## Verification

Six local `tests/agents.test.ts` tests passed: disabled/no-call, other-user denial, unconnected stop, wallet mismatch, credential stripping, malformed output, independent inactivity expiry and version-only interpretation. The actual subprocess runner was tested against an isolated generated package fixture, checking fixed argv, filtered environment and outside-entry/wrong-package rejection. This fixture is not a provider installation or authenticated capability. Native Windows test execution was required because the filesystem sandbox denied `realpath` for generated workspace fixtures; production containment checks were preserved. Windows injects standard OS environment fields independently; tests allow these, not application keys.

The effective authorization deadline is the earlier of `sessionExpireTime` and `inactiveSignOutTime` when supplied. Malformed/null inactivity values fail closed; omission remains supported. Actual `node tools/agents/status.ts` completed exit 0 and returned DISABLED for both providers, SINGLE_OPERATOR, executionEnabled false. No provider process or network/auth call ran. No live authenticated capability, denied financial operation, deployed agent, paid research or confirmation exists. Gates 13/14 remain unverified. Funds spent: zero.

2026-10-09 update: First Bell SDK MCP transport, scoped manual read grants and private persistent factual review jobs are deployed and publicly tested. The isolated tools/studio-firstbell project supplies a keyless public-tool adapter and gated official-shaped preparation artifacts; it does not establish Studio runtime, identity, or cloud operation. See its README for exact source/version constraints.

2026-10-09 live adapter verification: scripts/check-studio-public-adapter.mjs passed through certificate-validated external HTTPS and actual Binance factual sources. Public Bell version/hash binding and public-only tool requests were checked. Four isolated adapter tests pass, including post-response source timestamp validation; independent review accepted. No Studio runtime, identity, cloud service, credentials, payment or mainnet operation is established. Proof: test-results/studio-public-adapter-proof.json.

