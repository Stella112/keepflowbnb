import { WalletProvider, JobStatus } from '@bnbagent/sdk';
import { Transport } from 'viem';

/**
 * Read-only chain query functions — port of
 * `bnbagent_studio_core/tools/chain_readonly.py`.
 *
 * Pure functions that read wallet / chain / ERC-8004 / ERC-8183 / Pieverse
 * state without changing on-chain state. Designed to be wrapped as agent
 * tools by any framework and as read-only MCP tools by the deployed
 * `--protocol MCP` runtime.
 *
 * **Read-only definition:**
 * - produces no on-chain state change AND no transferable authority.
 * - No transaction signing. No EIP-712 typed-data signing.
 * - `getWallet()` decrypts the keystore in-memory to report the active
 *   address; the wallet object is never used to sign transactions or
 *   typed-data in this module.
 * - All RPC reads go through a viem `PublicClient` with the network's
 *   `rpcUrl` (transport injectable for tests via `_setTransportFactory`).
 *
 * **Exception**: `pieverseUsage` performs a one-time SIWE EIP-191
 * personal_sign to obtain a Pieverse session token. SIWE is structurally
 * read-only (no on-chain effect, domain+nonce+expiry replay protected, no
 * ReCap `Resources:` lines allowed); safety lives in the pieverse SIWE
 * message builder.
 *
 * Tool inventory (15):
 * - Wallet/chain basics: `walletInfo`, `walletList`, `walletAddress`,
 *   `balanceNative`, `balanceU`, `networkInfo`, `txStatus`
 * - LLM provider: `pieverseUsage`
 * - ERC-8004 identity: `agentInfo`, `agentByAddress`
 * - ERC-8183 jobs: `jobStatus`, `jobList`, `jobCount`
 * - Advanced/debug: `blockInfo`, `contractCallView`
 *
 * Output objects keep the Python dict key spelling (snake_case) — they are
 * the tool/wire contract consumed by LLMs and MCP clients, and must not
 * drift between the Python and TS runtimes.
 */

type WalletGetter = () => WalletProvider;
/**
 * Test seam: replace the active-wallet lookup (the TS stand-in for Python
 * tests monkeypatching `core_wallet.get_wallet`). Pass null to restore.
 */
declare function _setWalletGetter(getter: WalletGetter | null): void;
type TransportFactory = (rpcUrl: string) => Transport;
/** Test seam: replace the viem transport used for RPC reads. Null restores. */
declare function _setTransportFactory(factory: TransportFactory | null): void;
/** The narrow ERC8004Agent surface the identity tools consume. */
interface Erc8004Reader {
    getAgentInfo(agentId: number): Promise<unknown>;
    getAllAgents(limit?: number, offset?: number): Promise<unknown>;
}
type Erc8004ReaderFactory = (wallet: WalletProvider, network: string) => Promise<Erc8004Reader>;
/** Test seam: replace the ERC8004Agent factory. Null restores. */
declare function _setErc8004Factory(factory: Erc8004ReaderFactory | null): void;
/** The narrow ERC8183 client surface the job tools consume. */
interface Erc8183Reader {
    commerce: {
        jobCounter(): Promise<bigint>;
    };
    inflightJobCount(): Promise<bigint>;
    getJob(jobId: bigint): Promise<unknown>;
    getJobStatus(jobId: bigint): Promise<JobStatus>;
}
type Erc8183ClientProvider = (network: string) => Promise<Erc8183Reader>;
/** Test seam: replace the shared ERC-8183 client lookup. Null restores. */
declare function _set8183ClientProvider(provider: Erc8183ClientProvider | null): void;
/** Pieverse hooks (SIWE login + usage query) — injectable for tests. */
interface PieverseHooks {
    siweLogin: (wallet: WalletProvider) => Promise<string>;
    getAccountUsage: (token: string, opts?: {
        days?: number;
    }) => Promise<Record<string, unknown>>;
}
/** Test seam: replace the pieverse SIWE/usage calls. Null restores. */
declare function _setPieverseHooks(hooks: PieverseHooks | null): void;
/** Return the protocol-safe active wallet summary. Secret-layout metadata is
 * available only through local CLI diagnostics, never model/MCP tools. */
declare function walletInfo(): Promise<Record<string, unknown>>;
/**
 * List addresses of every keystore under the configured keystore_dir.
 *
 * Does NOT decrypt — reads the `"address"` field from each `*.json`
 * keystore file directly. kind='twak' manages exactly one wallet per home,
 * so the list is the active address.
 */
declare function walletList(): Promise<{
    addresses: string[];
}>;
/** Return just the active wallet's address as a string. */
declare function walletAddress(): Promise<string>;
/**
 * Return the native-token (BNB/tBNB) balance of an address.
 *
 * If `address` is null/omitted, uses the active wallet's address.
 */
declare function balanceNative(address?: string | null, network?: string): Promise<Record<string, unknown>>;
/**
 * Return the U ERC-20 balance of an address.
 *
 * If `address` is null/omitted, uses the active wallet's address.
 *
 * NOTE: the Python module used the SDK's `MinimalERC20Client`; the TS SDK
 * has it at `src/erc20/` but does not export the subpath from package.json,
 * so this reads `balanceOf` directly via viem `readContract` (same
 * eth_call).
 */
declare function balanceU(address?: string | null, network?: string): Promise<Record<string, unknown>>;
/**
 * In-process session-token cache: {wallet_address: token}. Never written to
 * disk — process restart re-runs SIWE.
 */
declare const _PIEVERSE_TOKEN_CACHE: Map<string, string>;
/**
 * Aggregate Pieverse LLM spend over the past `days` days.
 *
 * This is the only function in this module that signs. The signature is a
 * plain SIWE EIP-191 personal_sign — no on-chain effect, domain-bound,
 * replay-protected by nonce+expiry, no ReCap `Resources:` lines (rejected
 * at build time). The session token is cached in-process only.
 *
 * Throws if `[llm].provider != "pieverse-llm"`.
 */
declare function pieverseUsage(days?: number): Promise<Record<string, unknown>>;
/**
 * Return the on-chain ERC-8004 record for `agent_id` (read-only).
 *
 * Output shape: `{agent_id, address, agent_uri, metadata, services?}`.
 * If the agent URI is an in-band base64 `data:` URI, `services` is
 * populated with normalized `{name, endpoint, version}` entries.
 * On error returns `{"error": "..."}`.
 */
declare function agentInfo(agentId: number, network?: string): Promise<Record<string, unknown>>;
/**
 * Find the ERC-8004 agent owned by `address` (read-only).
 *
 * Walks `getAllAgents` up to 10 pages of 100 entries. Returns
 * `{agent_id, address, agent_uri}` on hit, `{found: false}` on miss, or
 * `{error: "..."}` on failure.
 */
declare function agentByAddress(address: string, network?: string): Promise<Record<string, unknown>>;
/**
 * Return the on-chain ERC-8183 job summary (read-only).
 *
 * Wraps `erc8183.getJobSummary`. Returns the normalised object (`job_id`,
 * `client`, `provider`, `status`, `budget_u`, …) or `{error: "..."}`.
 */
declare function jobStatus(jobId: number, network?: string): Promise<Record<string, unknown>>;
/**
 * List recent ERC-8183 jobs (read-only).
 *
 * Output: `{total_inflight, jobs: [{job_id, client, provider, status}, …]}`
 * or `{error: "..."}`. `mine=true` filters by the active wallet's address
 * (explicit `provider` wins if both given).
 */
declare function jobList(opts?: {
    limit?: number;
    mine?: boolean;
    provider?: string | null;
    network?: string;
}): Promise<Record<string, unknown>>;
/** Return the count of inflight ERC-8183 jobs (read-only). */
declare function jobCount(network?: string): Promise<Record<string, unknown>>;
/**
 * Return the on-chain status of a transaction (read-only).
 *
 * For reverted transactions, attempts to extract the revert reason by
 * replaying the call via `eth_call` at the original block. If the replay
 * throws, its message becomes `revert_reason`; a clean replay leaves it
 * null.
 */
declare function txStatus(txHash: string, network?: string): Promise<Record<string, unknown>>;
/**
 * Return summary info about a block (read-only).
 *
 * `block` accepts `"latest"`/`"earliest"`/`"pending"`, a decimal string
 * (e.g. `"12345678"`), or a hex string (`"0x..."` — 66 chars = block hash,
 * shorter = block number).
 */
declare function blockInfo(block?: string, network?: string): Promise<Record<string, unknown>>;
/**
 * Extract input types from a Solidity signature like `balanceOf(address)`.
 *
 * Returns `[]` for `foo()`. Throws if malformed.
 */
declare function _parseInputTypes(functionSignature: string): string[];
/**
 * Read-only generic contract view call (`eth_call`).
 *
 * `functionSignature` is Solidity-style, e.g. `"balanceOf(address)"`.
 * `outputTypes` (e.g. `["uint256"]`) decodes the result; if omitted, only
 * the raw hex is returned. No state-changing operations are possible —
 * this always uses `eth_call`.
 */
declare function contractCallView(address: string, functionSignature: string, args?: unknown[] | null, outputTypes?: string[] | null, network?: string): Promise<Record<string, unknown>>;
/** Return chain id, RPC host, native symbol, and token registry for a network. */
declare function networkInfo(network?: string): Promise<Record<string, unknown>>;

export { type PieverseHooks, type TransportFactory, type WalletGetter, _PIEVERSE_TOKEN_CACHE, _parseInputTypes, _set8183ClientProvider, _setErc8004Factory, _setPieverseHooks, _setTransportFactory, _setWalletGetter, agentByAddress, agentInfo, balanceNative, balanceU, blockInfo, contractCallView, jobCount, jobList, jobStatus, networkInfo, pieverseUsage, txStatus, walletAddress, walletInfo, walletList };
