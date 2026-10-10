# External integration audit — 2026-10-08

Reviewer: Codex. Scope: repository MCP discovery, MCP authorization design, Binance Agentic Wallet and BSC EOA Paymaster/MegaFuel documentation. This is a read-only engineering review, not a Claude review. No installation, account sign-in, permission grant, paid call, signing or transaction submission was performed.

## Repository evidence: existing First Bell MCP not located

Before proposing any replacement, inspected `package.json`, root inventory including hidden names, and `app`, `lib`, `scripts`, `tests`. Commands:

```powershell
rg --files --hidden -g '!.git/**' -g '!.next/**' -g '!node_modules/**' -g '!test-results/**' -g '!logs/**' | Select-String 'mcp|MCP|agentic|paymaster'
rg -n -i 'McpServer|modelcontextprotocol|tools/list|tools/call|streamable|/api/mcp|stdio' app lib scripts tests package.json .gitignore
```

No MCP server, tool registration, transport, authorization handler, MCP SDK dependency or relevant source filename was found. `stdio` hits were unrelated SSH/deployment subprocess options. `docs/BUILD_COVERAGE.md:22` marks MCP unshipped. Older status documents also list it as unimplemented. This establishes absence in the inspected application tree, not absence on another machine, remote repository or installed assistant connector. The assistant's Binance MCP connector is not a First Bell MCP implementation.

**Blocker:** mandate v2 says an existing First Bell MCP must be preserved, but its source/location is not established here. Do not delete or replace an external implementation on that assumption. Record this discrepancy; locate its repository/deployment before migration. Independent read-only protocol work can reuse current application services without claiming preservation or a connected-client gate pass.

Required application boundaries from mandate §19: public read; authenticated private read; owned Bell mutation; policy mutation; preparation; execution authorization. Wallet address input is not authentication. Reuse verified sign-in identity, enforce owner checks at the service layer, validate inputs, rate-limit, and never expose arbitrary signing. MCP credentials need explicit scopes, expiry, revocation and user binding; an HTTP cookie is not automatically a suitable cross-client bearer credential. Tool discovery, ownership rejection, revoked credential rejection and a real application result must be demonstrated from an actual compatible client.

## Binance Agentic Wallet

**DOCUMENTATION VERIFIED:** Binance describes BSC chain 56 support, App-enforced daily limits/token scope/high-risk handling, and sign-out revocation. These are distinct from consumer Binance Wallet connection. [Official overview](https://developers.binance.com/en/docs/products/agentic-wallet/welcome).

Account plus existing MPC Wallet and App authorization are prerequisites. Security settings are configured in the App, not raised by an AI. Installation documentation describes Skills and automatic CLI setup; this review did not install them. [Install guide](https://developers.binance.com/en/docs/products/agentic-wallet/quickstart/install-agentic-wallet).

The official skill currently names package `@binance/agentic-wallet`, executable `baw`, required CLI version `1.10.0`, and skill version `1.12.0`. It also describes external contract/message preview followed by explicit execution and Developer Mode checks. This does not establish a browser raw-transaction signer or Paymaster compatibility. [Official skill source](https://raw.githubusercontent.com/binance/binance-skills-hub/main/skills/binance-web3/binance-agentic-wallet/SKILL.md).

Documented authentication commands are `baw auth signin --json`, `baw auth verify --qrCodeId <returned-id> --json`, and `baw auth signout --json`. Sign-in returns a pairing code and URL that must be preserved verbatim; App approval must be followed by CLI wallet-status verification. Sign-out clears the local session. [Authentication reference](https://raw.githubusercontent.com/binance/binance-skills-hub/main/skills/binance-web3/binance-agentic-wallet/references/authentication.md).

Read-only `baw wallet settings --json` exposes session expiry, daily/quota fields, token scope and abnormal-transaction mode. The example durations and values are illustrative, not guaranteed defaults. Developer Mode, DeFi and x402 budgets are separate categories; do not infer their limits from ordinary trading quota. [Settings reference](https://raw.githubusercontent.com/binance/binance-skills-hub/main/skills/binance-web3/binance-agentic-wallet/references/wallet-setting.md).

The stock use case documents ticker resolution, market-state checks, quote, user confirmation and order-status checks for supported tokenized stocks. It requires USDT and native gas. No execution was tested here. [Stock trading guide](https://developers.binance.com/en/docs/products/agentic-wallet/use-cases/trading/stock-trading).

**UNVERIFIED / blocking for shared hosted execution:** inspected sources do not establish a supported multi-user credential namespace/session-store API, per-request session selection, concurrent unrelated accounts or secure hosted delegation. A local CLI session must not become a global website execution identity. No session isolation, revocation propagation, denied operation or authenticated call was tested.

Conservative next step: review the pinned CLI's actual credential storage/session selection in an isolated development environment before any integration grant. If only a single-operator workflow is verified, label that exact scope. Keep all financial writes disabled until the owner authorizes a bounded operation and permissions. Do not install globally or authenticate as an engineering shortcut.

## BSC EOA Paymaster and MegaFuel

**DOCUMENTATION VERIFIED:** BNB's EOA mechanism is distinct from ERC-4337 account abstraction. Sponsorship depends on a policy and compatible wallet flow; zero gas price alone does not produce sponsorship. [BNB overview](https://docs.bnbchain.org/bnb-smart-chain/developers/paymaster/overview/).

**Documentation discrepancy:** BNB wallet guide calls the eligibility method `gm_sponsorable`; its API specification instead specifies `pm_isSponsorable`, with `from/to/value/data/gas` and result fields `Sponsorable` and `SponsorPolicy`. These are not interchangeable by assumption. [Wallet guide](https://docs.bnbchain.org/bnb-smart-chain/developers/paymaster/wallet-integration/), [API specification](https://docs.bnbchain.org/bnb-smart-chain/developers/paymaster/paymaster-api/).

MegaFuel's provider guide instead specifies `pm_sponsorable`, BSC mainnet endpoint `https://bsc-megafuel.nodereal.io/`, provider nonce retrieval and submission of the user-signed zero-price transaction. Its suggestion to fall back silently to paid execution must **not** be adopted: First Bell requires fresh explicit user agreement for changed gas costs. A pending timeout is not proof that broadcasting is safe to repeat. [Provider integration guide](https://docs.nodereal.io/docs/wallet-integration-copy).

MegaFuel documents `eth_sendRawTransaction` with one signed transaction parameter and encourages a branded User-Agent. No raw transaction was submitted. [Submission reference](https://docs.nodereal.io/reference/eth-sendrawtransaction-megafuel).

Sponsor policies have sender/recipient/method whitelists, expiry/deactivation and gas/count budgets. Documentation says approved sponsors apply for system-created policies during beta; do not assume First Bell has an approved policy or funding. Method whitelists are not full calldata-parameter validation. [Policy management](https://docs.nodereal.io/docs/megafuel-policy-management).

**UNVERIFIED / blocking for browser sponsorship:** Binance's dApp self-test checklist verifies ordinary connection, message signing and transaction sending, but does not establish raw signed transaction export, zero-gas preservation or submission through a selected EOA Paymaster. Ordinary `eth_sendTransaction` may use wallet-controlled RPC; EIP-1193 compatibility alone does not prove the required pathway. [Binance self-testing manual](https://developers.binance.com/en/docs/products/web3-dapp/self-testing).

Next steps: resolve provider-specific eligibility schema from its actual reference; perform a harmless eligibility probe for a validated transaction; separately verify actual Binance iOS/Android signing/submission capability; establish a qualifying sponsor policy. Keep sponsorship unavailable until these pass. If wallet export/submission is unsupported, preserve the adapter and exact blocker rather than routing funds through a backend key.

## Acceptance verdict

MCP gate 11: implementation location and actual client evidence unresolved. Paymaster gate 12: wallet compatibility, policy eligibility and sponsored confirmation unverified. Agentic Wallet gate 13: authenticated setup, restriction denial, isolation and operation confirmation unverified. These integrations remain required; documentation review does not pass their live gates. Actual funds spent by this review: zero.
