import { AgentEndpoint, WalletProvider, NetworkConfig } from '@bnbagent/sdk';

/**
 * ERC-8004 identity helpers — port of
 * `bnbagent_studio_core/erc8004/helpers.py`.
 *
 * Thin wrappers over the bnbagent SDK's `ERC8004Agent`. All on-chain
 * interaction is delegated to the SDK; these helpers normalise the SDK's
 * loosely-typed results into typed studio-level results and throw
 * studio-level errors when the wallet's registration state doesn't match
 * what the caller expects.
 */

declare class ERC8004Error extends Error {
    constructor(message?: string, opts?: ErrorOptions);
}
/**
 * Thrown when register() is called for a wallet that already has an
 * agent_id. `agentId` carries the existing on-chain token id (when
 * extractable) so callers can fall back to {@link updateServiceEndpoint}
 * without a second chain scan.
 */
declare class AlreadyRegisteredError extends ERC8004Error {
    readonly agentId: number | null;
    constructor(message: string, opts?: {
        agentId?: number | null;
    });
}
/** Thrown when show() finds no agent registered for the wallet. */
declare class NotRegisteredError extends ERC8004Error {
    constructor(message?: string);
}
/** Thrown when an ERC-8004 transaction was broadcast but not confirmed yet. */
declare class ERC8004TransactionPendingError extends ERC8004Error {
    readonly txHash: string;
    readonly timeoutSeconds: number | null;
    readonly agentId: number | null;
    constructor(message: string, opts: {
        txHash: string;
        timeoutSeconds?: number | null;
        agentId?: number | null;
    });
}
/** Thrown when register minted an agent_id but URI completion did not finish. */
declare class ERC8004PartialRegistrationError extends ERC8004Error {
    readonly agentId: number;
    readonly agentUri: string | null;
    readonly cause: unknown;
    readonly txHash: string | null;
    readonly retryable: boolean;
    constructor(message: string, opts: {
        agentId: number;
        agentUri: string | null;
        cause: unknown;
        txHash?: string | null;
        retryable?: boolean;
    });
}
interface AgentRecord {
    readonly agentId: number;
    readonly address: string;
    readonly agentUri: string;
    readonly metadata: Record<string, unknown>;
}
/**
 * Output of {@link resolveService}.
 *
 * `providerAddress` is the agent's owner wallet (used on-chain to address
 * create_job). `endpoint` is the protocol-specific base URL discovered in
 * the agent's services[] (used off-chain to e.g. POST /negotiate).
 */
interface ResolvedService {
    readonly agentId: number;
    readonly protocol: string;
    readonly providerAddress: string;
    readonly endpoint: string;
}
/**
 * The narrow ERC8004Agent surface these helpers consume. Structural on
 * purpose: the real SDK agent satisfies it, and tests substitute a fake via
 * {@link _setSdkFactory} (the TS stand-in for Python's
 * `patch.object(helpers, "ERC8004Agent")`).
 */
interface Erc8004Sdk {
    readonly walletAddress: string;
    getAllAgents(limit?: number, offset?: number): Promise<unknown>;
    generateAgentUri(opts: {
        name: string;
        description: string;
        endpoints: AgentEndpoint[];
    }): string;
    registerAgent(agentUri: string): Promise<unknown>;
    getAgentInfo(agentId: number): Promise<unknown>;
    setAgentUri(agentId: number, agentUri: string): Promise<unknown>;
    setMetadata(agentId: number, key: string, value: string): Promise<unknown>;
    getMetadata(agentId: number, key: string): Promise<string>;
}
/** Options threaded from the write helpers into the SDK network config. */
interface SdkNetworkOpts {
    /** Skip the network's MegaFuel paymaster and self-pay gas. */
    noPaymaster?: boolean;
}
type SdkFactory = (wallet: WalletProvider, network: string, opts?: SdkNetworkOpts) => Promise<Erc8004Sdk>;
/**
 * SDK network config for the ERC-8004 agent, adjusted per wallet kind.
 *
 * twak on bsc-mainnet drops the paymaster: mainnet ERC-8004 sponsorship is
 * handled INSIDE twak (Trust gateway) — forwarding the SDK's MegaFuel
 * mainnet URL as `--paymaster-url` would override it. On bsc-testnet the
 * SDK preset stays (MegaFuel testnet URL → sponsored twak writes). Non-twak
 * wallets always get the preset unchanged.
 *
 * `noPaymaster` (CLI `--no-paymaster`) drops the paymaster unconditionally —
 * the escape hatch for a relay that accepts a tx but never broadcasts it.
 */
declare function erc8004SdkNetwork(wallet: WalletProvider, network: string, opts?: SdkNetworkOpts): NetworkConfig;
/** Test seam: replace the ERC8004Agent factory. Pass null to restore. */
declare function _setSdkFactory(factory: SdkFactory | null): void;
/**
 * Return an A2A agent-card URL, preserving query parameters correctly.
 *
 * Appends the spec discovery path `/.well-known/agent-card.json` UNLESS the
 * URL already points at an agent card. "Already a card" covers two forms:
 * the spec path, AND **Microsoft Foundry's custom card path**
 * (`…/protocols/a2a/agentCard/v1.0` | `/v0.3`). Foundry's incoming-A2A
 * endpoint serves its card at that version-suffixed path, NOT at
 * `/.well-known/...`; without this guard a Foundry card URL would be
 * mangled into `…/agentCard/v1.0/.well-known/agent-card.json` and buyers
 * couldn't resolve it. (Foundry deploy is a later round — this only makes
 * the helper safe to hand a Foundry URL.)
 */
declare function a2aAgentCardEndpoint(endpoint: string): string;
/**
 * MCP streamable-HTTP spec revision advertised on the `MCP` endpoint's
 * `version` (the A2A `--version` default 0.3.0 is A2A-specific, not MCP).
 */
declare const MCP_PROTOCOL_VERSION = "2025-06-18";
/**
 * Return an MCP streamable-HTTP URL, appending `/mcp` unless already present.
 *
 * Mirrors {@link a2aAgentCardEndpoint}'s trailing-slash/idempotency
 * handling: a bare base URL gets `/mcp` appended; a URL already ending in
 * `/mcp` is left intact (query/fragment preserved).
 */
declare function mcpStreamableEndpoint(endpoint: string): string;
/**
 * Pull the local on-chain token id out of an SDK agent record.
 *
 * `getAllAgents` returns `agent_id` as a composite
 * `chain:contract:token_id` string. The on-chain mutators
 * (`getAgentInfo` / `setAgentUri` / `getMetadata`) take the plain int
 * `token_id`. This helper normalises.
 */
declare function _extractTokenId(agentRecord: Record<string, unknown>): number;
/**
 * Build the `AgentEndpoint` for `services[]` per protocol.
 *
 * For `A2A` use the spec-aware constructor (it appends
 * `/.well-known/agent-card.json` and carries the A2A protocol version) so
 * buyers can fetch the agent card directly. For `MCP` use the SDK's
 * `AgentEndpoint.mcp` constructor (appending `/mcp` and carrying the MCP
 * spec revision as `version` so `services[].version` is populated); the
 * A2A `version` arg is A2A-specific and is not used here. Any other
 * protocol keeps the bare `AgentEndpoint({ name: protocol, endpoint })`
 * form (back-compat).
 */
declare function _buildEndpoint(protocol: string, endpoint: string, version: string | null): AgentEndpoint;
interface RegisterOpts {
    /** Optional pre-built agent URI; if omitted, one is generated from
     * `name` + `description` + `endpoint` + `protocol`. */
    agentUri?: string | null;
    /** Network name (default bsc-testnet). */
    network?: string;
    /** Human-readable agent name (used when generating the URI). */
    name?: string;
    /** Human-readable description (used when generating the URI). */
    description?: string;
    /**
     * ERC-8004 `services[].name` — the protocol identifier the buyer uses to
     * discover this agent. Default `"A2A"`. `"ERC8183"` remains selectable
     * for back-compat.
     */
    protocol?: string;
    /** Protocol version recorded on the `A2A` endpoint (default `"0.3.0"`).
     * Ignored for non-A2A protocols. */
    version?: string | null;
    /** Optional public access summary appended to the generated description
     * (ignored when `agentUri` is provided). */
    accessDescription?: string | null;
    /** Skip the network's MegaFuel paymaster and self-pay gas. */
    noPaymaster?: boolean;
}
/**
 * Register a new ERC-8004 agent on-chain. Returns the newly-assigned
 * `agent_id`.
 *
 * @throws {AlreadyRegisteredError} if this wallet already owns an agent.
 * @throws {ERC8004PartialRegistrationError} if the agent was minted but URI
 *   completion did not finish.
 * @throws {ERC8004TransactionPendingError} if the register tx was broadcast
 *   but not confirmed before timeout.
 * @throws {ERC8004Error} if the SDK call fails or returns no agent_id.
 */
declare function register(wallet: WalletProvider, endpoint: string, opts?: RegisterOpts): Promise<number>;
/**
 * Update this wallet's agent URI on-chain. Returns the transaction hash.
 *
 * @throws {NotRegisteredError} if this wallet does not own an agent.
 * @throws {ERC8004TransactionPendingError} if the update tx was broadcast
 *   but not confirmed before timeout.
 * @throws {ERC8004Error} if the SDK call fails.
 */
declare function updateEndpoint(wallet: WalletProvider, newUri: string, opts?: {
    network?: string;
}): Promise<string>;
/**
 * Set an arbitrary metadata key/value on this wallet's agent on-chain.
 * Returns the transaction hash.
 *
 * @throws {NotRegisteredError} if this wallet does not own an agent.
 * @throws {ERC8004Error} if the SDK call fails.
 */
declare function setMetadata(wallet: WalletProvider, key: string, value: string, opts?: {
    network?: string;
    noPaymaster?: boolean;
}): Promise<string>;
/**
 * Read a metadata value by key from this wallet's agent (read-only).
 *
 * @throws {NotRegisteredError} if this wallet does not own an agent.
 * @throws {ERC8004Error} if the SDK call fails.
 */
declare function getMetadata(wallet: WalletProvider, key: string, opts?: {
    network?: string;
}): Promise<string>;
interface UpdateServiceEndpointOpts {
    network?: string;
    /** `services[].name` entry to patch (default `"A2A"`). */
    protocol?: string;
    /** Agent name used only when the URI must be regenerated. */
    name?: string;
    /** Agent description used only when the URI must be regenerated. */
    description?: string;
    /** Protocol version recorded on the `A2A` endpoint (default `"0.3.0"`).
     * Ignored for non-A2A protocols. */
    version?: string | null;
    /** Optional public access summary to append/replace in the top-level
     * description while preserving name/services. */
    accessDescription?: string | null;
    /** Skip the network's MegaFuel paymaster and self-pay gas. */
    noPaymaster?: boolean;
}
/** Result of {@link updateServiceEndpoint} — `(tx_hash, agent_id)` in Python. */
interface UpdateServiceEndpointResult {
    readonly txHash: string;
    readonly agentId: number;
}
/**
 * Replace only `services[protocol].endpoint` in this wallet's agent URI.
 *
 * Unlike {@link updateEndpoint} (whole-URI replacement), this preserves the
 * rest of the registration JSON (name / description / other services). If
 * the current URI is not the in-band `data:...;base64` form, a fresh URI is
 * generated from `name` + `description` (the old metadata cannot be
 * recovered from an off-chain URI).
 *
 * @throws {NotRegisteredError} if this wallet does not own an agent.
 * @throws {ERC8004Error} if the SDK call fails.
 */
declare function updateServiceEndpoint(wallet: WalletProvider, endpoint: string, opts?: UpdateServiceEndpointOpts): Promise<UpdateServiceEndpointResult>;
/**
 * Return the on-chain record for this wallet's agent.
 *
 * @throws {NotRegisteredError} if no agent is registered for this wallet.
 */
declare function show(wallet: WalletProvider, opts?: {
    network?: string;
}): Promise<AgentRecord>;
/**
 * Resolve an `agent_id` to its agent URI (read-only).
 *
 * `wallet` is required at runtime (the SDK needs a provider to construct),
 * but read-only calls don't sign.
 *
 * @throws {NotRegisteredError} if no agent with that id exists.
 */
declare function resolve(agentId: number, opts?: {
    wallet?: WalletProvider | null;
    network?: string;
}): Promise<string>;
/**
 * Resolve an agent_id to a protocol-specific {@link ResolvedService}.
 *
 * Performs:
 *   1. SDK `getAgentInfo(agentId)` → `agentURI` + `agentAddress`
 *   2. Decode the base64 data URI to JSON
 *   3. Find the entry in `services[]` matching `protocol` by name
 *   4. Return `ResolvedService{agentId, protocol, providerAddress, endpoint}`
 *
 * @throws {NotRegisteredError} agent_id not on chain, or no agentURI set.
 * @throws {ERC8004Error} URI is not base64 data:, decode fails, or the
 *   agent does not advertise the requested protocol.
 */
declare function resolveService(agentId: number, opts?: {
    wallet?: WalletProvider | null;
    network?: string;
    protocol?: string;
}): Promise<ResolvedService>;

export { type AgentRecord, AlreadyRegisteredError, ERC8004Error, ERC8004PartialRegistrationError, ERC8004TransactionPendingError, type Erc8004Sdk, MCP_PROTOCOL_VERSION, NotRegisteredError, type RegisterOpts, type ResolvedService, type SdkFactory, type SdkNetworkOpts, type UpdateServiceEndpointOpts, type UpdateServiceEndpointResult, _buildEndpoint, _extractTokenId, _setSdkFactory, a2aAgentCardEndpoint, erc8004SdkNetwork, getMetadata, mcpStreamableEndpoint, register, resolve, resolveService, setMetadata, show, updateEndpoint, updateServiceEndpoint };
