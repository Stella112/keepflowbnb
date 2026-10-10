import { NetworkConfig, JobStatus, WalletProvider } from '@bnbagent/sdk';
import { TokenReference, VerifyNegotiationQuoteOpts, QuoteSigVerdict } from '@bnbagent/sdk/erc8183';
import { PublicClient } from 'viem';
import { AssetId } from '@bnbagent/sdk/networks';

/**
 * ERC-8183 client factory (singleton per-network) — port of
 * `bnbagent_studio_core/erc8183/client.py`.
 *
 * Wraps the SDK `ERC8183Client` with studio's wallet + network defaults.
 */

/** The narrow `Job` surface the workflows/verify layer reads. The SDK's
 * typed `Job` satisfies it structurally. */
interface JobLike {
    client?: string;
    provider: string;
    evaluator?: string;
    description: string;
    budget: bigint | number | string;
    expiredAt: bigint | number;
    status: JobStatus;
    /** keccak256 of the canonical deliverable manifest; zero before submit. */
    deliverable?: string;
    /** On-chain submission timestamp; zero before submit. */
    submittedAt?: bigint | number;
}
/**
 * The narrow ERC8183Client surface studio consumes. Structural on purpose:
 * the real SDK client satisfies it, and tests substitute a fake via
 * {@link _setClientFactory} (the TS stand-in for Python's
 * `patch.object(workflows, "get_8183_client")`).
 */
interface Erc8183ClientLike {
    /** Active contract domain for signed negotiation quotes. */
    readonly network: Pick<NetworkConfig, "name" | "chainId" | "commerceContract">;
    /** Monotonic commerce job ID source used by read-only listing tools. */
    readonly commerce: {
        jobCounter(): Promise<bigint>;
    };
    tokenSymbol(): Promise<string>;
    isPaymentTokenSupported(token: TokenReference): Promise<boolean>;
    tokenBalanceFor(token: TokenReference, address?: string): Promise<bigint>;
    verifyNegotiationQuote(envelope: Record<string, unknown>, opts: VerifyNegotiationQuoteOpts): Promise<QuoteSigVerdict>;
    /** Optional only for narrow legacy test doubles. The real SDK client
     * always exposes the Router and Studio uses it to fail before createJob
     * when the configured policy is no longer whitelisted. */
    router?: {
        policyWhitelist(policy: string): Promise<boolean>;
        jobPolicy?(jobId: bigint): Promise<string>;
    };
    policy: {
        readonly address?: string;
        disputeWindow(): Promise<bigint>;
    };
    createJobWithToken(opts: {
        asset: TokenReference;
        provider: string;
        expiredAt: bigint;
        description: string;
    }): Promise<unknown>;
    registerJob(jobId: bigint): Promise<unknown>;
    setBudget(jobId: bigint, amount: bigint): Promise<unknown>;
    fund(jobId: bigint, amount: bigint, opts?: {
        approveFloor?: bigint;
        expectedToken?: TokenReference;
    }): Promise<unknown>;
    settle(jobId: bigint): Promise<unknown>;
    voteReject(jobId: bigint): Promise<unknown>;
    dispute(jobId: bigint): Promise<unknown>;
    getJob(jobId: bigint): Promise<JobLike>;
    /** Authoritative immutable payment token bound to this job on Commerce. */
    jobPaymentToken(jobId: bigint): Promise<`0x${string}`>;
    getJobStatus(jobId: bigint): Promise<JobStatus>;
    getDeliverableUrl(jobId: bigint): Promise<string | null>;
    inflightJobCount(): Promise<bigint>;
    /**
     * Chain reads for account-signature (ERC-1271) quote verification.
     * Optional so narrow test fakes keep compiling; the real SDK client
     * always provides both, and quotes with a signed time window are only
     * verified through them (see `verify.ts` / `workflows.ts`).
     */
    publicClient?: PublicClient;
    getJobFundedBlock?(jobId: bigint, window: {
        negotiatedAt: number;
        quoteExpiresAt: number;
    }): Promise<bigint | null>;
}
type Erc8183ClientFactory = (network: string) => Promise<Erc8183ClientLike>;
/** Test seam: override the wallet used by the 8183 layer. Null restores. */
declare function _setWalletOverride(wallet: WalletProvider | null): void;
/** The wallet the ERC-8183 layer signs with (test-overridable). */
declare function resolveWallet(): WalletProvider;
/**
 * Resolve the SDK NetworkConfig for the 8183 client, re-applying the
 * `ERC8183_*_ADDRESS` env overrides. The SDK only overlays those env vars
 * when `network` is a preset *name*; `sdkNetwork()` hands it a concrete
 * object (to pin the RPC — USABILITY-11), which the SDK treats as "caller
 * takes full control" and skips the overlay. Re-apply it here so a QA /
 * staging deployment can be targeted via env without code changes.
 */
declare function erc8183Network(name: string): NetworkConfig;
/** Test seam: replace the ERC8183Client factory. Pass null to restore. */
declare function _setClientFactory(factory: Erc8183ClientFactory | null): void;
/**
 * Return a per-network singleton ERC8183Client.
 *
 * If `network` is null/omitted, reads `[network].default` from studio.toml,
 * falling back to `"bsc-testnet"`. The wallet provider is obtained via
 * `getWallet()` (or the test override).
 */
declare function get8183Client(network?: string | null): Promise<Erc8183ClientLike>;
/** Test helper — drop cached clients. */
declare function _reset8183ClientCache(): void;

/**
 * Error hierarchy for the studio ERC-8183 layer — port of
 * `bnbagent_studio_core/erc8183/errors.py`.
 *
 * All studio-level ERC-8183 errors derive from {@link ERC8183Error}.
 * Workflow helpers throw these on policy / state violations; raw SDK
 * exceptions are allowed to propagate un-wrapped so callers can inspect the
 * underlying cause.
 */
/** Base class for studio-level ERC-8183 errors. */

declare class ERC8183Error extends Error {
    constructor(message?: string, opts?: ErrorOptions);
}
/** Thrown when a buyWorkflow budget exceeds Policy.budgetCapU. */
declare class BudgetCapExceededError extends ERC8183Error {
    constructor(message?: string);
}
/** Thrown when the on-chain payment token is not in
 * Policy.allowedPaymentTokens. */
declare class TokenNotAllowedError extends ERC8183Error {
    constructor(message?: string);
}
interface PaymentAssetAlternative {
    readonly assetId: AssetId;
    readonly symbol: string;
    readonly tokenAddress: `0x${string}`;
    readonly decimals: number;
    readonly retryHint: string;
}
interface PaymentAssetErrorOpts {
    network: string;
    assetId: AssetId;
    symbol: string;
    tokenAddress: `0x${string}`;
    decimals: number;
    alternatives: readonly PaymentAssetAlternative[];
    fundingHint?: string | null;
}
/** Selected catalog asset is not enabled by the active Commerce contract. */
declare class PaymentAssetUnavailableError extends ERC8183Error {
    readonly network: string;
    readonly assetId: AssetId;
    readonly symbol: string;
    readonly tokenAddress: `0x${string}`;
    readonly decimals: number;
    readonly alternatives: readonly PaymentAssetAlternative[];
    readonly retryHint: null;
    readonly fundingHint: string | null;
    constructor(opts: PaymentAssetErrorOpts);
}
/** Selected asset balance is below the exact atomic amount being funded. */
declare class InsufficientPaymentAssetBalanceError extends ERC8183Error {
    readonly network: string;
    readonly assetId: AssetId;
    readonly symbol: string;
    readonly tokenAddress: `0x${string}`;
    readonly decimals: number;
    readonly requiredAtomic: string;
    readonly currentAtomic: string;
    readonly requiredHuman: string;
    readonly currentHuman: string;
    readonly alternatives: readonly PaymentAssetAlternative[];
    readonly retryHint: string;
    readonly fundingHint: string | null;
    constructor(opts: PaymentAssetErrorOpts & {
        requiredAtomic: bigint;
        currentAtomic: bigint;
        requiredHuman: string;
        currentHuman: string;
    });
}
/**
 * Thrown before `createJob` when the configured OptimisticPolicy is not
 * accepted by the configured EvaluatorRouter.
 *
 * Without this guard the four-step buyer workflow would create an OPEN job
 * and only then fail at `registerJob`, leaving an avoidable orphan on-chain.
 */
declare class PolicyNotWhitelistedError extends ERC8183Error {
    constructor(message?: string);
}
/** Thrown when a job_id has no on-chain record. */
declare class JobNotFoundError extends ERC8183Error {
    constructor(message?: string);
}
/** Thrown when an operation requires a specific JobStatus and the current
 * one doesn't match. */
declare class JobStateError extends ERC8183Error {
    readonly jobId: number;
    readonly expected: string | string[];
    readonly actual: string;
    constructor(opts: {
        jobId: number;
        expected: string | string[];
        actual: string;
    });
}
/** Thrown when a job's deliverable URL cannot be resolved on-chain. */
declare class DeliverableUnavailableError extends ERC8183Error {
    constructor(message?: string);
}
/** Thrown when fetched deliverable bytes do not match the on-chain commitment. */
declare class DeliverableIntegrityError extends ERC8183Error {
    constructor(message?: string, opts?: ErrorOptions);
}
/**
 * The wallet kind can NEVER submit this deliverable — skip, don't retry.
 *
 * Thrown when the SDK refuses `submitResult` with
 * `UnsupportedWalletOperation` — deterministic for a given wallet kind, so
 * the Agent maps it to the permanent `{ok: false, skip: true}` skip channel
 * and never retries (a transient ack would burn one LLM call per retry,
 * forever). Shipped trigger: the SDK's TWAKProvider fails closed before
 * broadcasting when the configured ERC-8183 addresses are not the canonical
 * ones (twak v0.20.0 has no custom-target flags, so the tx would hit the
 * wrong contracts); any future wallet kind with a capability hole gets the
 * same skip semantics for free.
 */
declare class SubmitPermanentlyUnsupportedError extends ERC8183Error {
    constructor(message?: string, opts?: ErrorOptions);
}
/**
 * Thrown when an SDK call returns a failure envelope (`success: false`).
 *
 * `ERC8183JobOps` methods report failures as `{success: false, error: ...}`
 * objects rather than throwing; workflows convert that envelope into this
 * exception so a `*Tx` field is never populated with a stringified error
 * dict. `code` carries the SDK's semantic `error_code` string (0.4.0: e.g.
 * "chain_unavailable", "budget_too_low") when present (null otherwise).
 */
declare class SdkCallFailedError extends ERC8183Error {
    readonly code: string | null;
    readonly txHash: string | null;
    readonly retryable: boolean | null;
    constructor(message: string, opts?: {
        code?: string | null;
        txHash?: string | null;
        retryable?: boolean | null;
        cause?: unknown;
    });
}

/**
 * Buyer-side ERC-8183 off-chain negotiation client — port of
 * `bnbagent_studio_core/erc8183/negotiate.py`.
 *
 * Wraps a single POST `{endpoint}/negotiate` round-trip against an ERC-8183
 * seller. The seller-side handler is implemented by the SDK
 * (`NegotiationHandler`); studio only consumes the result to derive an
 * on-chain `budget` value before `buyWorkflow` proceeds.
 *
 * The full server response is the SDK `NegotiationResult` envelope
 * (`{request, request_hash, response:{accepted, terms, ...}, response_hash,
 * negotiation_hash, provider_sig, chain_id, verifying_contract}`). We keep
 * it intact in `NegotiatedTerms.responseEnvelope` so `buyWorkflow` can
 * anchor it on-chain via `buildJobDescription` (the seller's signed quote
 * then rides verbatim in `job.description`, verifiable by the seller and
 * dispute voters).
 */

/** Thrown when the seller's response is unparseable or rejects the request. */
declare class NegotiationError extends ERC8183Error {
    constructor(message?: string, opts?: ErrorOptions);
}
/** Seller rejection with validated canonical asset alternatives. */
declare class NegotiationRejectedError extends NegotiationError {
    readonly supportedAssets: readonly AssetId[];
    constructor(message: string, supportedAssets?: readonly AssetId[]);
}
/** Outcome of a successful negotiate call (accepted=true). */
interface NegotiatedTerms {
    /** Token raw units (U token: 10^18). */
    readonly priceRaw: bigint;
    /** Token contract address. */
    readonly currency: string;
    /** Unix seconds; null = no expiry. */
    readonly quoteExpiresAt: number | null;
    readonly estimatedCompletionSeconds: number | null;
    /** Full server response, for downstream anchoring. */
    readonly responseEnvelope: Record<string, unknown>;
}
interface NegotiateOpts {
    /** Minimal terms baseline. Currently generic strings — a future version
     * lets the user customise. */
    deliverables?: string;
    qualityStandards?: string;
    /** Explicit Buyer-selected token address. */
    currency?: string;
    /** Injectable fetch for tests (the stand-in for Python's http_client). */
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}
/**
 * POST `{endpoint}/negotiate` with a minimal request envelope.
 *
 * The `endpoint` is the **base URL** the seller advertises in its ERC-8004
 * `services[].endpoint` field (already includes any mount prefix like
 * `/apex`); we append `/negotiate` directly.
 *
 * @throws {NegotiationError} if the seller rejects, returns non-2xx, or
 *   returns a malformed envelope.
 */
declare function negotiateWithSeller(endpoint: string, task: string, opts?: NegotiateOpts): Promise<NegotiatedTerms>;

/**
 * Decode raw 4-byte revert selectors into contract custom-error names —
 * port of `bnbagent_studio_core/erc8183/revert.py`.
 *
 * The SDK's pre-flight check surfaces reverts as
 * `RuntimeError("Transaction would revert: ('0x17be5b7b', '0x17be5b7b')")` —
 * a raw selector the user must reverse-engineer against the contract ABI
 * (BUG-09). Python built the selector map from the ABIs the `bnbagent`
 * package ships; the TS SDK does not export its ABI modules (no `./abis`
 * subpath — recorded gap), so the error-signature list is vendored here
 * verbatim (extracted from `@bnbagent/sdk` src/abis/*.ts) and selectors are
 * computed once at first use.
 */
/**
 * Translate the first known revert selector inside `err`, else null.
 *
 * Returns e.g. `"NotDecided() [0x17be5b7b] — the verdict is not decided
 * yet…"`. Null means no recognizable selector — callers should fall back
 * to the original error.
 */
declare function decodeRevert(err: unknown): string | null;

/**
 * Verify a funded job against the seller's originally-signed quote.
 *
 * The SDK anchors the signed quote in `job.description` (a Schema-v1
 * `JobDescription` carrying `negotiation_hash` + `provider_sig`) and ships
 * the reference verifier `verifyQuoteSignature` (EIP-191 ecrecover fast
 * path + ERC-1271 `isValidSignature` fallback for account providers such
 * as altana session wallets, whose 98-byte envelopes are not recoverable
 * ECDSA). This module wires that verifier into studio's job flow:
 *
 * - {@link verifySignedJob} — fetch the on-chain job and decide whether
 *   this provider should work it: FUNDED, ours, not expired, funded inside
 *   the signed quote window, carries a quote WE signed (SDK
 *   `verifyQuoteSignature` anchored at the funded block, mirroring the
 *   SDK's own `ERC8183JobOps.verifyJob`), funded at >= the agreed price.
 *   Returns a {@link Verdict}.
 * - {@link recoverQuoteSigner} — legacy EOA-only recovery (recompute
 *   `negotiation_hash`, ecrecover the EIP-191 `provider_sig`). Kept for
 *   quotes without a valid `negotiated_at`/`quote_expires_at` window and
 *   for backward compatibility; cannot verify ERC-1271 account signatures.
 *
 * Used by the Agent before doing work and by the buyer before funding
 * (`buyWorkflow` pre-fund check). Canonicalization MUST match the SDK
 * exactly (Python `json.dumps(sort_keys=True, separators=(",", ":"))` /
 * the SDK's `canonicalJson`) + keccak over the text, or the recomputed
 * hash won't match.
 */
/**
 * Outcome of {@link verifySignedJob}.
 *
 * `permanent` distinguishes a job that should NEVER be worked (record +
 * skip; tell the client why) from a transient failure (retry on the next
 * scan).
 */
interface Verdict {
    readonly ok: boolean;
    readonly reason: string;
    readonly permanent: boolean;
}
declare function makeVerdict(ok: boolean, reason?: string, permanent?: boolean): Verdict;
interface VerifySignedJobOptions {
    readonly network?: string | null;
    /** Work + upload budget that must fit before the contract submit cutoff. */
    readonly minimumRemainingSeconds?: number;
}
/**
 * Return the EOA address that signed the quote anchored in `description`.
 *
 * EOA-only: a 65-byte ECDSA `provider_sig` is required; ERC-1271 account
 * envelopes (e.g. altana session signatures) are NOT recoverable and
 * return null — use the SDK's `verifyQuoteSignature` for those (as
 * {@link verifySignedJob} does).
 *
 * Reconstructs the signed digest from the on-chain description and
 * recovers the EIP-191 signer:
 *
 * 1. Parse the Schema-v1 `JobDescription` (null for plain text).
 * 2. Recompute `negotiation_hash` = keccak over the canonical JSON of the
 *    description content (every key EXCEPT `negotiation_hash` /
 *    `provider_sig`) and require it to equal the embedded value — proves
 *    the terms/price were not tampered after signing.
 * 3. `ecrecover` the `provider_sig` over that hash (EIP-191 personal-sign
 *    over the hash STRING, mirroring the SDK's `sign_message`).
 *
 * Returns the recovered checksum address, or null if the description is
 * unstructured, missing the hash/sig, tampered (hash mismatch), or the
 * signature is invalid.
 */
declare function recoverQuoteSigner(description: string): Promise<string | null>;
/**
 * Decide whether `expectedSigner` should work funded `jobId`.
 *
 * Fetches the on-chain job and checks, in order: it is FUNDED, assigned to
 * us, not expired (job-level chain `expiredAt`), carries a structured quote
 * WE signed (`recoverQuoteSigner` == `expectedSigner`), and the funded
 * budget is at least the agreed price. The negotiation quote's
 * `quote_expires_at` TTL is intentionally NOT enforced here — see the note
 * in the body. `permanent` failures should be recorded + skipped (and
 * surfaced to the client); chain-read failures are transient.
 */
declare function verifySignedJob(jobId: number, expectedSigner: string, opts?: VerifySignedJobOptions): Promise<Verdict>;

/**
 * High-level ERC-8183 workflows: buy / submit / fetch / settle — port of
 * `bnbagent_studio_core/erc8183/workflows.py`.
 *
 * The SDK exposes the buyer side as 4 independent primitives (createJobWithToken →
 * registerJob → setBudget → fund). studio composes them into a single
 * {@link buyWorkflow} and applies Policy guards (budget cap, token
 * allow-list) at the orchestration boundary.
 *
 * Buyer budgets keep stable-USD semantics and are converted into the
 * explicitly selected catalog asset's atomic precision.
 */

declare const U_DECIMALS = 18;
interface BuyResult {
    readonly jobId: number;
    readonly createTx: string;
    readonly registerTx: string;
    readonly setBudgetTx: string;
    readonly fundTx: string;
    /** Compatibility alias: U amount, or null for USDC/USDT. */
    readonly budgetU: string | null;
    readonly budgetUsd: string;
    readonly budgetAtomic: string;
    readonly assetId: AssetId;
    readonly symbol: string;
    readonly tokenAddress: `0x${string}`;
    readonly decimals: number;
    readonly provider: string;
    /** Unix seconds. */
    readonly expiresAt: number;
    /** Null when buyWorkflow is called with an on-chain-only path
     * (positional `provider` + `negotiate=false`). */
    readonly agentId: number | null;
    readonly sellerEndpoint: string | null;
    readonly negotiatedPriceU: string | null;
    readonly negotiatedPriceUsd: string | null;
    /** Anchored signed-quote evidence (when the on-chain description carries
     * the seller's NegotiationResult); null for unanchored/legacy jobs. */
    readonly negotiationHash: string | null;
    readonly providerSig: string | null;
}
interface SubmitResult {
    readonly jobId: number;
    readonly submitTx: string;
    readonly deliverableUrl: string | null;
}
interface FetchResult {
    readonly jobId: number;
    readonly response: string;
    readonly metadata: Record<string, unknown>;
}
/**
 * Extract a transaction hash from an SDK response object.
 *
 * SDK client ops return `{transactionHash}`; `ERC8183JobOps` ops (e.g.
 * `submitResult`) return `txHash` inside a `{success: ..., ...}` envelope.
 * A failure envelope (`success: false`) throws {@link SdkCallFailedError}
 * instead of being stringified, so a `*Tx` field never carries an error
 * dict that looks like a failed call to hash-shape validators downstream.
 */
declare function _txHash(result: unknown): string;
interface BuyWorkflowOpts {
    /** ERC-8004 agent id. If set, resolves provider address + seller
     * endpoint via 8004; mutually exclusive with `provider`. */
    agentId?: number | null;
    /** Max U to spend (decimal string/number). Null → use the negotiated
     * price (if `negotiate=true` and we have an endpoint) or
     * `policy.defaultBudgetU`. */
    budgetU?: string | number | null;
    /** Protocol-neutral stable USD budget. Mutually exclusive with budgetU. */
    budgetUsd?: string | null;
    /** Canonical AssetId or UI symbol resolved in the exact selected network. */
    asset?: AssetId | string | null;
    /** Deadline relative to now (default 30 min). */
    deadlineMinutes?: number;
    /** bsc-testnet | bsc-mainnet. Null → studio.toml default. */
    network?: string | null;
    /** When true (default) AND we have a seller endpoint (i.e. `agentId`
     * was provided), POST `{endpoint}/negotiate` to agree on price before
     * the on-chain steps. */
    negotiate?: boolean;
    /** services[].name to look up when resolving `agentId`. Default
     * `"ERC8183"`. Note studio's seller now registers as `A2A` by default,
     * so resolving a default seller with `ERC8183` raises a friendly error
     * pointing at `bag erc8183 buy --provider <addr>` (the v0.0.1 path that
     * skips resolve+negotiate). */
    protocol?: string;
    /** A previously-obtained seller `NegotiationResult` envelope (the
     * `/negotiate` response body) to anchor on-chain when this call does not
     * negotiate itself (e.g. a split negotiate→fund client flow). When
     * present (or produced by `negotiate=true`), the on-chain `description`
     * is `buildJobDescription(envelope)` so the seller's signed quote is
     * anchored and verifiable; otherwise the plain `task` string is used
     * (legacy/unanchored). */
    negotiationEnvelope?: Record<string, unknown> | null;
}
/**
 * Drive the buyer flow: (optional 8004 resolve) → (optional negotiate) →
 * create → register → set_budget → fund.
 *
 * @param provider provider wallet address. Required unless `agentId` is
 *   set in opts.
 * @param task free-form description string written to the job's
 *   `description`.
 *
 * @throws {Error} if neither (or both) of `provider` / `agentId` is set.
 * @throws {BudgetCapExceededError} if budget exceeds `policy.budgetCapU`.
 * @throws {TokenNotAllowedError} if the selected payment asset is not in
 *   `payments.allowed_payment_tokens`.
 */
declare function buyWorkflow(provider: string | null, task?: string, opts?: BuyWorkflowOpts): Promise<BuyResult>;
/** The narrow `ERC8183JobOps` surface submitWorkflow consumes. */
interface JobOpsLike {
    submitResult(jobId: number, responseContent: string, metadata?: Record<string, unknown>): Promise<unknown>;
}
type JobOpsFactory = (network: string) => Promise<JobOpsLike>;
/** Test seam: replace the ERC8183JobOps factory. Pass null to restore. */
declare function _setJobOpsFactory(factory: JobOpsFactory | null): void;
/**
 * Seller: submit a deliverable for `jobId`.
 *
 * Wraps the SDK `ERC8183JobOps.submitResult`, which auto-builds a
 * `DeliverableManifest`, uploads it via the configured storage provider,
 * and calls on-chain `submit`. The on-chain deliverable URL is published
 * as `{ERC8183_AGENT_URL}/job/{id}/response` (file:// storage) — so both
 * env vars must be set for the deliverable to be fetchable (`bag init`
 * scaffolds local-dev defaults).
 */
declare function submitWorkflow(jobId: number, response: string, opts?: {
    metadata?: Record<string, unknown> | null;
    network?: string | null;
}): Promise<SubmitResult>;
/**
 * Buyer: fetch the deliverable URL for a submitted/completed job.
 *
 * Returns the raw URL plus a best-effort materialised response body.
 */
declare function fetchWorkflow(jobId: number, opts?: {
    network?: string | null;
}): Promise<FetchResult>;
/**
 * Buyer: settle a submitted job. `action` ∈ {approve, reject, dispute}.
 *
 * Returns the transaction hash.
 */
declare function settleWorkflow(jobId: number, opts?: {
    action?: string;
    network?: string | null;
}): Promise<string>;
/**
 * Read-only summary: status / budget / deliverable_url etc.
 *
 * Returns a JSON-serialisable object suitable for CLI output (snake_case
 * keys, mirroring the Python dict).
 */
declare function getJobSummary(jobId: number, opts?: {
    network?: string | null;
}): Promise<Record<string, unknown>>;

export { BudgetCapExceededError, type BuyResult, type BuyWorkflowOpts, DeliverableIntegrityError, DeliverableUnavailableError, ERC8183Error, type Erc8183ClientFactory, type Erc8183ClientLike, type FetchResult, InsufficientPaymentAssetBalanceError, type JobLike, JobNotFoundError, type JobOpsFactory, type JobOpsLike, JobStateError, type NegotiateOpts, type NegotiatedTerms, NegotiationError, NegotiationRejectedError, type PaymentAssetAlternative, PaymentAssetUnavailableError, PolicyNotWhitelistedError, SdkCallFailedError, SubmitPermanentlyUnsupportedError, type SubmitResult, TokenNotAllowedError, U_DECIMALS, type Verdict, type VerifySignedJobOptions, _reset8183ClientCache, _setClientFactory, _setJobOpsFactory, _setWalletOverride, _txHash, buyWorkflow, decodeRevert, erc8183Network, fetchWorkflow, get8183Client, getJobSummary, makeVerdict, negotiateWithSeller, recoverQuoteSigner, resolveWallet, settleWorkflow, submitWorkflow, verifySignedJob };
