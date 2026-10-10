# @bnbagent/studio-runtime

[![npm version](https://img.shields.io/npm/v/@bnbagent/studio-runtime.svg)](https://www.npmjs.com/package/@bnbagent/studio-runtime) [![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933)](https://nodejs.org/) [![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)

The TypeScript runtime library behind bnbagent-studio seller agents: configuration, wallet custody, signing policy, audit, ERC-8004 identity, ERC-8183 commerce, x402 or MPP payments over B402, Pieverse credit, deliverable storage, and read-only chain tools.

Most users should not start by programming against this package. Install [`@bnbagent/studio-cli`](https://www.npmjs.com/package/@bnbagent/studio-cli), run `bag skills install`, and use `/bnbagent-studio` in Claude Code or Cursor. The skill designs the workflow; `bag init` generates the agent; the generated agent imports this runtime.

> The runtime is under active development and may introduce breaking changes before 1.0. Start on BSC testnet and pin compatible Studio and SDK versions.

## Where it sits

```text
Claude Code / Cursor
        │  /bnbagent-studio
        ▼
@bnbagent/studio-cli (`bag`)       design, scaffold, diagnose, deploy, operate
        │  generates
        ▼
your app/agent source              business value, prompts, faces, fixed signing
        │  imports
        ▼
@bnbagent/studio-runtime           config, custody, policy, commerce, storage, tools
        │  uses
        ▼
@bnbagent/sdk + BNB Chain          protocol and on-chain implementation
```

The runtime is a deployment dependency; the CLI is not. An emitted agent keeps running if the global CLI is removed. Studio releases the CLI and runtime together so newly generated code and its runtime surface stay aligned.

## What the runtime provides

- A consistent `studio.toml` and workspace-discovery model for local and deployed execution.
- Exactly three wallet backends: encrypted `evm-local`, Trust Wallet Agent Kit `twak`, and bounded-session `altana`.
- Fixed signing policy and spend boundaries for ERC-8183 and x402 operations.
- ERC-8004 registration, resolution, metadata, and service-endpoint reconciliation.
- ERC-8183 quote verification plus buy, submit, fetch, and settle workflows.
- Guarded x402 and native MPP+B402 buyers with host, recipient, asset, network, per-request, retry/dispatch, receipt, and daily-budget checks.
- A protocol-selecting B402 seller with alternative x402 and MPP adapters, settle-before-work paid requests, explicit FREE passthrough, and replay protection.
- Pieverse authentication, model discovery, usage, credit, x402 top-up, and renewal building blocks.
- Local or IPFS deliverable storage and append-only redacted audit events.
- Fifteen read-only tools that can be wrapped for Vercel AI SDK, MCP, or another agent framework.

## Install

### Recommended: let Studio wire it for you

```bash
npm install --global @bnbagent/studio-cli
bag skills install
```

Then ask the installed skill to create or extend a seller:

```text
/bnbagent-studio Create a BNB Chain seller agent named researchagent and help me
choose its commerce rail, service faces, wallet, LLM, storage, and deployment.
```

`bag init` writes a compatible runtime and SDK dependency into `app/agent/package.json`.

### Direct library installation

```bash
npm install @bnbagent/studio-runtime @bnbagent/sdk
```

Requirements and package formats:

- Node.js 22 or newer;
- peer dependency `@bnbagent/sdk >=0.6.0 <0.7.0`;
- ESM, CommonJS, and TypeScript declarations for the root and every documented subpath;
- framework-neutral core: no agent framework or web server is imported by this package.

LLM model resolution uses the Vercel AI SDK. Chain access and transaction types use `viem` and `@bnbagent/sdk`.

## Root API

The root export is intentionally small and matches the conveniences used by generated code:

```ts
import {
  findProjectRoot,
  getPolicy,
  getWallet,
  loadStudioToml,
} from "@bnbagent/studio-runtime";

const projectRoot = findProjectRoot();
if (projectRoot === null) {
  throw new Error("studio.toml was not found");
}

const config = loadStudioToml();
const policy = getPolicy();
const wallet = getWallet();

console.log({
  projectRoot,
  project: config.project,
  walletAddress: wallet.address,
  policy,
});
```

The root also exports `Policy` and the telemetry `emit` helper. Import focused APIs from subpaths so dependencies and security boundaries remain visible in your code.

## Public subpaths

| Import | Main responsibilities |
| --- | --- |
| `@bnbagent/studio-runtime` | Project discovery plus config, policy, telemetry, and wallet conveniences. |
| `@bnbagent/studio-runtime/config` | Find workspace and agent roots, load `studio.toml`, load local env values, and read the agent registry. |
| `@bnbagent/studio-runtime/policy` | Construct the frozen runtime `Policy` used by generated code. |
| `@bnbagent/studio-runtime/secretWrite` | Atomically create owner-only secret files. |
| `@bnbagent/studio-runtime/networks` | BSC network and U-token registry, RPC selection, and decimal-string/`bigint` conversion. |
| `@bnbagent/studio-runtime/wallet` | Build `evm-local`, `twak`, or `altana` wallet providers and apply signing policy. |
| `@bnbagent/studio-runtime/llm` | Resolve Studio LLM configuration to a Vercel AI SDK language model. |
| `@bnbagent/studio-runtime/storage` | Select local development storage or durable IPFS storage for deliverables. |
| `@bnbagent/studio-runtime/audit` | Record, query, tail, and wrap operations in append-only redacted audit events. |
| `@bnbagent/studio-runtime/erc8004` | Register and resolve identities; update metadata and protocol-specific service endpoints. |
| `@bnbagent/studio-runtime/erc8183` | Negotiate, verify, buy, inspect, submit, fetch, and settle escrowed jobs. |
| `@bnbagent/studio-runtime/x402` | Guarded x402 buyer, budget ledger, payment signing, seller policy, B402 seller, and HTTP envelope middleware. |
| `@bnbagent/studio-runtime/mpp` | Native MPP+B402 quote/buy client, merchant trust policy, payment-outcome errors, and EIP-3009-only dispatch. |
| `@bnbagent/studio-runtime/b402` | Protocol-neutral B402 seller, canonical policy, X402/MPP adapter selection, sell-path resolution, MPP replay-store injection, and HTTP envelope middleware. |
| `@bnbagent/studio-runtime/pieverse` | SIWE/API-key lifecycle, model catalogue, usage, credit allocation, top-up, and auto-renew support. |
| `@bnbagent/studio-runtime/tools` | Fifteen pure read-only wallet, chain, identity, commerce, transaction, block, contract-view, and network tools. |

The generated `.d.ts` files shipped with the package are the exact symbol and argument reference for every entry point.

## Common integrations

### Read-only chain tools

The tools module does not expose signing. You can call it directly or wrap selected functions for an LLM framework:

```ts
import {
  balanceNative,
  balanceU,
  networkInfo,
  walletAddress,
} from "@bnbagent/studio-runtime/tools";

const address = await walletAddress();
const [native, u, network] = await Promise.all([
  balanceNative(address, "bsc-testnet"),
  balanceU(address, "bsc-testnet"),
  networkInfo("bsc-testnet"),
]);

console.log({ native, u, network });
```

The complete read-only set is `walletInfo`, `walletList`, `walletAddress`, `balanceNative`, `balanceU`, `pieverseUsage`, `agentInfo`, `agentByAddress`, `jobStatus`, `jobList`, `jobCount`, `txStatus`, `blockInfo`, `contractCallView`, and `networkInfo`.

### Guarded x402 buying

The buyer first probes a protected URL, validates the returned payment requirements against policy, signs the bounded payment, and retries the paid request. Configure or trust the merchant before using it; an allowed host is not permission to pay an arbitrary recipient.

The parallel MPP buyer lives at `@bnbagent/studio-runtime/mpp`. It accepts only native `b402.charge` challenges, validates a pinned realm and recipient plus Studio-owned B402 token facts, and permits one EIP-3009 paid dispatch. A missing success receipt or lost post-dispatch response is reported as `unknown`; callers must not retry automatically. P0 requires an `evm-local`-compatible `sign.typed_data` wallet.

```ts
import { loadStudioToml } from "@bnbagent/studio-runtime/config";
import { getWallet } from "@bnbagent/studio-runtime/wallet";
import {
  fetchWithPayment,
  X402BuyerPolicy,
} from "@bnbagent/studio-runtime/x402";

const policy = X402BuyerPolicy.fromToml(loadStudioToml());
const result = await fetchWithPayment("https://merchant.example/resource", {
  wallet: getWallet(),
  maxUsd: Math.min(0.25, policy.maxPerRequestUsd),
  allowedHosts: [...policy.effectiveAllowedHosts],
});

console.log({
  status: result.statusCode,
  paidUsd: result.paidUsd,
  body: result.json,
});
```

Use `bag x402 trust` to pin a merchant domain to its expected payout address and per-call cap. The runtime byte-compares the challenge recipient, constrains the network and asset, applies the tighter of caller and policy caps, and shares the configured daily ledger with other paid calls.

### ERC-8183 workflows

The ERC-8183 subpath separates the critical stages rather than exposing a general transaction primitive:

- `negotiateWithSeller` obtains a seller's signed quote;
- `verifySignedJob` checks that an on-chain funded job still matches the signed terms and expected seller;
- `buyWorkflow` performs the buyer-side create, register, budget, and fund sequence;
- `submitWorkflow` submits the seller's deliverable reference;
- `fetchWorkflow` retrieves a submitted deliverable;
- `settleWorkflow` performs the authorized approve, reject, or dispute decision;
- `getJobSummary` reads the current on-chain state.

Generated seller code keeps quote creation and funded-job verification in `src/signing.ts`. The LLM implements only the work in `src/sellerCore.ts`; it does not choose prices, see raw signing methods, or decide whether a job is funded.

### ERC-8004 identity

The identity subpath provides `register`, `show`, `resolve`, `resolveService`, `setMetadata`, `updateEndpoint`, and `updateServiceEndpoint`. The protocol-aware helpers normalize A2A agent-card and MCP streamable endpoints so updating one service does not erase another.

In a generated project, prefer `bag deploy verify --provider <bnb|aws>` after deployment. It checks provider state and reconciles the live endpoint with ERC-8004. Direct runtime functions are appropriate when you are integrating Studio into another application and own the lifecycle yourself.

## Runtime conventions

### Project discovery

Generated workspaces keep `studio.toml` in `app/agent/` and sensitive local state in workspace-root `.studio/`. Discovery walks upward from the current process and understands both locations. Do not move the wallet directory under `app/agent/`; that directory is the deployable code root.

### Configuration and amounts

- Configuration and CLI boundaries use decimal strings so token amounts do not lose precision.
- Payment code converts amounts to `bigint` internally.
- U used by ERC-8183 has 18 decimals; a B402/x402 test token may use different decimals and is not interchangeable.
- `"0"` is a deliberate FREE price, not a missing value. ERC-8183 skips token escrow at zero; x402 bypasses B402 entirely at zero.
- RPC overrides are per network. Signing domains, allowed hosts, recipients, assets, contract addresses, and budgets are security configuration, not cosmetic settings.

### Wallet material

- `evm-local` reads an encrypted keystore from workspace-root `.studio/wallets/` and unlocks it with `WALLET_PASSWORD`.
- `twak` uses a project-dedicated Trust Wallet Agent Kit home and its custody provider.
- `altana` keeps the admin keystore local and gives the runtime only a bounded session through `ALTANA_SESSION`.

Local secrets are not part of the deploy artifact. The CLI collects the minimum runtime material and sends it through the selected deployment secret channel. Do not manually bundle `.studio/`, echo secret values, or put passwords on command lines.

### Storage and audit

Local deliverable storage is for development and deliberately fails deploy readiness because it will not survive a remote runtime. IPFS storage is durable and public; configure the pinning service upload endpoint and write key before a real delivery. Audit helpers redact sensitive fields and append operation records, but an audit log is not a substitute for on-chain state verification.

## Security boundaries

- **One signer:** the generated agent is the only wallet holder for its seller runtime.
- **No LLM signing:** never wrap wallet signing, arbitrary transactions, quote signing, or settlement as an LLM tool.
- **Deterministic money paths:** price clamps, quote signing, funded-state verification, and x402 settlement belong in fixed code.
- **Verify before work:** positive-price ERC-8183 work begins only after the funded job matches the signed terms; positive-price x402 work begins only after settlement.
- **Fail closed:** recipient, host, asset, network, amount, contract, nonce, expiry, retry, and daily-budget checks are authorization boundaries.
- **Manual buyer settlement:** a submitted ERC-8183 job still requires an authorized approve, reject, or dispute action.
- **No generic transaction toolkit:** use the bounded workflow APIs and keep the LLM-facing tool surface read-only.

## Runtime versus CLI

| Need | Use |
| --- | --- |
| Create, extend, run, diagnose, or deploy a seller | `/bnbagent-studio` skill installed by `@bnbagent/studio-cli` |
| Automate a documented lifecycle step | `bag` CLI |
| Implement the generated agent's runtime behavior | `@bnbagent/studio-runtime` |
| Build a custom host or framework integration | Runtime subpath APIs plus `@bnbagent/sdk` |
| Inspect exact command flags | `bag --help` or `bag <command> --help` |
| Inspect exact TypeScript symbols | The package's shipped declaration files |

## Disclaimer

This runtime handles wallet access, signing policy, blockchain transactions, paid requests, and deliverable storage. Its checks reduce specific risks, but they do not make an agent, integration, counterparty, smart contract, model output, storage provider, RPC service, payment facilitator, or deployment platform trustworthy.

If you integrate the runtime directly, you are responsible for preserving its fixed signing boundaries, validating configuration and counterparties, protecting keys and credentials, reviewing transaction and settlement authority, limiting spend, securing infrastructure, and paying any resulting network or cloud costs. Test custom code and contract deployments on BSC testnet before using real funds.

This package is licensed under Apache-2.0 and provided **as is**, without warranties or guarantees. The authors and contributors are not responsible for lost funds, compromised credentials, service interruptions, unexpected charges, or other damages arising from its use. Nothing in this package is financial, investment, legal, or tax advice.
