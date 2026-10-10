import { X402Payer } from '@bnbagent/sdk/x402';

/**
 * x402 exception hierarchy — port of `bnbagent_studio_core/x402/errors.py`.
 *
 * Independent from `../pieverse` exception types — Pieverse may adapt its
 * own, but the x402 buyer must be usable from agents that don't depend on
 * Pieverse at all.
 */
/** Base class for all generic x402 buyer errors. */
declare class X402Error extends Error {
    constructor(message?: string, opts?: ErrorOptions);
}
/** Auth-related failure (e.g. bad bearer, expired session) on the protected resource. */
declare class X402AuthError extends X402Error {
    constructor(message?: string);
}
/** Refusal to pay because the per-request or per-day cap would be exceeded. */
declare class X402BudgetExhaustedError extends X402Error {
    constructor(message?: string, opts?: ErrorOptions);
}
/** Endpoint returned a non-402 status when the protocol required 402. */
declare class X402PaymentRequiredError extends X402Error {
    constructor(message?: string, opts?: ErrorOptions);
}
/** The 402 challenge advertised an asset/chain that doesn't match our expectation. */
declare class X402AssetMismatchError extends X402Error {
    constructor(message?: string, opts?: ErrorOptions);
}
/** URL host is not in the caller-provided allowlist; refused before any network call. */
declare class X402HostNotAllowedError extends X402Error {
    constructor(message?: string);
}
/**
 * No trusted `expected_to` recipient was supplied, so signing is refused.
 *
 * The X402Signer migration removed studio's habit of trusting the `payTo`
 * from the 402 response. A trusted recipient (e.g.
 * `[payments.x402].expected_recipient`) is now REQUIRED before any payment
 * is signed — there is deliberately no fall-back to the response's `payTo`.
 */
declare class X402RecipientRequiredError extends X402Error {
    constructor(message?: string);
}
/**
 * The wallet cannot serve this x402 code path.
 *
 * Thrown when (a) a wallet exposes neither `sign.typed_data` (local
 * EIP-3009 signing) nor `x402.pay` (delegated payment), or (b) the
 * requested call shape needs a capability the delegated path lacks —
 * custom HTTP headers or a caller-owned X-PAYMENT envelope
 * (`payChallenge`), which the twak CLI does not expose. The message always
 * names the working alternative.
 */
declare class X402UnsupportedWalletError extends X402Error {
    constructor(message?: string);
}
interface X402PaymentAssetFacts {
    readonly assetId: string;
    readonly symbol: string;
    /** null means the catalog symbol is an address-pending placeholder. */
    readonly tokenAddress: string | null;
    readonly addressPending?: boolean;
    readonly decimals: number;
    readonly retryHint: string;
}
interface PaymentAssetErrorOptions extends ErrorOptions {
    readonly asset: X402PaymentAssetFacts;
    readonly alternatives?: readonly X402PaymentAssetFacts[];
    /**
     * Assets the trusted merchant entry pins, when that pin — rather than the
     * merchant's own 402 — is what refused the selection. "Unavailable" then
     * points at the endpoint, while the fix is in the caller's own config.
     */
    readonly merchantPin?: readonly string[];
}
/** Trusted, pre-dispatch refusal for an unavailable selected asset. */
declare class X402PaymentAssetUnavailableError extends X402AssetMismatchError {
    readonly paymentDispatched = false;
    readonly assetId: string;
    readonly symbol: string;
    readonly tokenAddress: string | null;
    readonly addressPending: boolean;
    readonly decimals: number;
    readonly retryHint: string;
    readonly alternatives: readonly X402PaymentAssetFacts[];
    /** Non-empty when a merchant asset pin, not the endpoint, refused. */
    readonly merchantPin: readonly string[];
    constructor(message: string, options: PaymentAssetErrorOptions);
}
/**
 * Which buyer branch refused the route, and what it had to work with.
 *
 * Both branches raise `X402UnsupportedWalletRouteError`, so without this the
 * only way to explain a failure is to guess from the asset's methods — which
 * blames "this wallet cannot sign Permit2" for delegated-payer failures on a
 * wallet that signs Permit2 perfectly well.
 */
interface X402WalletRouteDiagnosis {
    /**
     * `"local"` — the wallet signs EIP-3009 in this process. `"delegated"` —
     * the wallet pays through its own x402 client (Altana session / twak CLI).
     */
    readonly branch: "local" | "delegated";
    /**
     * Exact-route transfer methods the delegated payer advertised, or null when
     * it exposed no exact-route capability at all (no `requestExact` /
     * `exactTransferMethods`). Always null on the local branch.
     */
    readonly payerExactMethods: readonly string[] | null;
}
interface UnsupportedWalletRouteOptions extends PaymentAssetErrorOptions {
    /** Required: every throw site must state which branch it speaks for. */
    readonly walletRoute: X402WalletRouteDiagnosis;
}
/** The selected catalog asset has no route this wallet can safely execute. */
declare class X402UnsupportedWalletRouteError extends X402PaymentAssetUnavailableError {
    readonly walletRoute: X402WalletRouteDiagnosis;
    constructor(message: string, options: UnsupportedWalletRouteOptions);
}
/** Balance lookup failed before any payment credential was created. */
declare class X402PaymentAssetBalanceUnavailableError extends X402PaymentAssetUnavailableError {
    constructor(message: string, options: PaymentAssetErrorOptions);
}
/** Selected token balance is insufficient; Studio did not switch assets. */
declare class X402InsufficientPaymentAssetBalanceError extends X402PaymentAssetUnavailableError {
    readonly requiredAtomic: string;
    readonly currentAtomic: string;
    readonly requiredHuman: string;
    readonly currentHuman: string;
    constructor(message: string, options: PaymentAssetErrorOptions & {
        readonly requiredAtomic: string;
        readonly currentAtomic: string;
        readonly requiredHuman: string;
        readonly currentHuman: string;
    });
}
declare class X402InsufficientPaymentAssetAllowanceError extends X402InsufficientPaymentAssetBalanceError {
    constructor(message: string, options: ConstructorParameters<typeof X402InsufficientPaymentAssetBalanceError>[1]);
}
type X402PaidTransferMethod = "eip3009" | "permit2-exact";
/** Runtime-validated payment identity safe to attach to an unknown outcome. */
interface X402TrustedPaymentFacts {
    readonly network: string;
    readonly assetId: string;
    readonly symbol: string;
    readonly tokenAddress: string;
    readonly decimals: number;
    readonly amountAtomic: string;
    readonly paidUsd: number;
    readonly paymentProtocol: "x402";
    readonly paymentMethod: X402PaidTransferMethod;
}
interface X402PaymentOutcomeUnknownOptions extends ErrorOptions {
    readonly paymentFacts?: X402TrustedPaymentFacts;
}
/** A payment may have been dispatched, but its settlement is not proven. */
declare class X402PaymentOutcomeUnknownError extends X402Error {
    readonly paymentDispatched = true;
    readonly paymentFacts: Readonly<X402TrustedPaymentFacts> | null;
    constructor(message?: string, opts?: X402PaymentOutcomeUnknownOptions);
}
/**
 * Server kept returning 402 after the configured number of paid retries.
 *
 * Distinct from {@link X402PaymentRequiredError}: the payment envelope was
 * accepted and the chain tx was signed, but the server still claims the
 * resource is unpaid on every retry. Usually indicates a facilitator
 * indexing delay or a bug on the seller side.
 */
declare class X402RetryExhaustedError extends X402PaymentOutcomeUnknownError {
    constructor(message?: string, opts?: X402PaymentOutcomeUnknownOptions);
}
/** Invalid `[payments.x402_seller]` configuration. */
declare class X402SellerConfigError extends X402Error {
    constructor(message?: string, opts?: ErrorOptions);
}

/**
 * Generic x402 v2 buyer for protected URLs — port of
 * `bnbagent_studio_core/x402/buyer.py`.
 *
 * Generic callers pass the target URL and optional injectable transport.
 * The internal Pieverse recharge entry point shares this protocol exchange
 * but uses an explicitly authorized deposit amount at its fixed endpoint.
 *
 * Public surface:
 *   - `fetchWithPayment(url, opts) -> FetchResult`
 *   - `quoteUrl(url, opts) -> object` — probe without paying
 *   - `payChallenge(challenge, opts) -> { header, amountUsd }` — sign a 402
 *     body the caller already received elsewhere
 *   - `dailyCapCountedElsewhere(fn)` — L4 double-count guard
 */

/**
 * The structural wallet surface the buyer consumes. A full SDK
 * `WalletProvider` satisfies it; so do narrow test doubles.
 */
interface X402WalletLike {
    readonly address: string;
    readonly signingPolicy?: {
        readonly maxValidityWindowSeconds: number;
    };
    supports?(capability: string): boolean;
    signTypedData?(domain: Record<string, unknown>, types: Record<string, {
        name: string;
        type: string;
    }[]>, message: Record<string, unknown>): Promise<unknown>;
    makeX402Payer?(payerKwargs?: Record<string, unknown>): X402Payer;
    readTokenBalance?(request: PaymentAssetReadRequest): Promise<bigint>;
    readTokenAllowance?(request: PaymentAssetAllowanceRequest): Promise<bigint>;
}
interface PaymentAssetReadRequest {
    readonly networkName: string;
    readonly owner: `0x${string}`;
    readonly tokenAddress: `0x${string}`;
}
interface PaymentAssetAllowanceRequest extends PaymentAssetReadRequest {
    readonly spender: `0x${string}`;
}
interface X402PaymentAssetReader {
    balanceOf(request: PaymentAssetReadRequest): Promise<bigint>;
    allowance?(request: PaymentAssetAllowanceRequest): Promise<bigint>;
}
/**
 * Run `fn` with the enclosed `fetchWithPayment` calls marked as already
 * day-capped.
 *
 * The Pieverse auto-topup path reserves the spend against the BudgetGate's
 * own `max_per_day_usd` before it reaches `fetchWithPayment`; without this
 * marker the unified shared tracker would reserve the same dollar a second
 * time (L4 double-count). The marker is scoped to the async context of
 * `fn` — it is restored even if `fn` throws.
 */
declare function dailyCapCountedElsewhere<T>(fn: () => T | Promise<T>): Promise<T>;
/** Test/introspection: is the current async context inside the marker? */
declare function _isDailyCapCountedElsewhere(): boolean;
/** Outcome of a {@link fetchWithPayment} call. */
interface FetchResult {
    readonly url: string;
    readonly statusCode: number;
    readonly content: Buffer;
    readonly json: Record<string, unknown> | null;
    readonly paidUsd: number | null;
    readonly txPaymentEnvelope: string | null;
    readonly assetId: string | null;
    readonly symbol: string | null;
    readonly tokenAddress: string | null;
    readonly decimals: number | null;
    readonly amountAtomic: string | null;
    readonly paymentProtocol: "x402" | null;
    readonly paymentMethod: X402PaidTransferMethod | null;
    readonly paymentNetwork: string | null;
    readonly settlement?: {
        readonly transaction: string;
        readonly network: string;
    };
}
/**
 * Select exactly one local EIP-3009 route from a v2 `accepts` list.
 *
 * Local signing is only defined for `scheme: "exact"`. A conflicting
 * top-level and `extra.assetTransferMethod` is malformed rather than an
 * alternative that may be skipped: accepting a later option must never let
 * the signer reinterpret an earlier poisoned option. The returned object is
 * passed unchanged through route verification and signing, so the preflight
 * and signer bind the same selected route.
 */
declare function _parseAccepted(challenge: Record<string, unknown>, networkChainId: number, expectedAssetAddr: string): [Record<string, unknown>, unknown];
/**
 * Select one exact route that b402 can settle, whichever wallet signs it.
 *
 * `bag x402 trust` pins a merchant before any wallet signs, so it must see
 * `permit2-exact` routes that {@link _parseAccepted} deliberately skips —
 * otherwise a USDC-only merchant cannot be trusted at all. Selection runs
 * through the same option validation, so a trusted pin cannot be built from
 * an option the paying path would reject as malformed.
 *
 * `preferredMethods` is tried in order and decides which route is returned
 * when a merchant offers the same asset through several. Callers pass the
 * methods their wallet can actually sign first: merchants really do list
 * permit2-exact ahead of eip3009, so first-entry-wins would hand a local
 * signer a route it cannot pay while an EIP-3009 one sits further down.
 */
declare function _parseAcceptedExactRoute(challenge: Record<string, unknown>, networkChainId: number, expectedAssetAddr: string, preferredMethods?: readonly string[]): [Record<string, unknown>, unknown, X402PaidTransferMethod];
declare function _checkHost(url: string, allowedHosts: readonly string[] | null | undefined): void;
type ConfigLoader = () => Record<string, unknown> | null;
/** Test seam: replace the lazy studio.toml read. Pass null to restore. */
declare function _setConfigLoader(loader: ConfigLoader | null): void;
type SleepFn = (seconds: number) => Promise<void>;
/** Test seam: replace the backoff sleep. Pass null to restore. */
declare function _setSleep(fn: SleepFn | null): void;
interface FetchWithPaymentOpts {
    /** Hard per-request cap. If the 402 challenge demands more than this,
     * throws `X402BudgetExhaustedError` before signing. */
    maxUsd: number;
    /** Wallet — must implement `signTypedData` (or expose a delegated
     * `x402.pay` capability). */
    wallet: X402WalletLike;
    /**
     * Trusted payee address. Byte-compared against the 402 response's
     * `payTo` by the SDK `X402Signer`; any drift throws
     * `X402RecipientMismatchError`. When unset it is resolved from
     * `[payments.x402].expected_recipient`; if still empty →
     * `X402RecipientRequiredError` (studio never trusts the 402 response's
     * `payTo`).
     */
    expectedTo?: string | null;
    /** studio network name (`bsc-mainnet` / `bsc-testnet`). */
    networkName?: string;
    /** Explicit UI symbol or canonical AssetId. Omitted means network U. */
    asset?: string;
    /** Trusted balance/allowance reader; primarily used by hosts and tests. */
    assetReader?: X402PaymentAssetReader;
    /** HTTP verb. GET is the default — Bazaar merchants (CMC) are REST-style;
     * RPC-style endpoints (Pieverse) pass POST explicitly. */
    method?: string;
    jsonBody?: Record<string, unknown> | null;
    /** Extra headers (applied to both initial + retry). */
    headers?: Record<string, string> | null;
    /** Defaults to the configured policy allowlist (empty means deny all).
     * A disallowed host throws before HTTP/signing. Explicit null is a trusted
     * caller override that disables only this host check. */
    allowedHosts?: readonly string[] | null;
    /** Injectable fetch (tests stub this) — stand-in for Python's http_client. */
    fetchImpl?: typeof fetch;
    timeout?: number;
    maxRetries?: number;
    baseDelaySeconds?: number;
}
/**
 * Fetch an x402-protected URL, paying via EIP-3009 if the server returns
 * 402. Returns a {@link FetchResult} with the post-payment response (or the
 * direct non-402 response if the server didn't require payment).
 */
declare function fetchWithPayment(url: string, opts: FetchWithPaymentOpts): Promise<FetchResult>;
/** Internal recharge path; never exposed as a generic buyer option or tool. */
declare function _fetchPieverseTopup(url: string, opts: FetchWithPaymentOpts): Promise<FetchResult>;
interface PayChallengeOpts {
    /** Wallet — must implement `signTypedData`. */
    wallet: X402WalletLike;
    /** Trusted payee address (see {@link fetchWithPayment}). When unset it is
     * resolved from `[payments.x402].expected_recipient`; if still empty →
     * `X402RecipientRequiredError`. */
    expectedTo?: string | null;
    /** studio network name (`bsc-mainnet` / `bsc-testnet`). */
    networkName?: string;
    /** Optional caller cap. The effective cap is the minimum of this value,
     * `[payments.x402].max_per_request_usd`, and a trusted merchant cap; an
     * overage throws `X402BudgetExhaustedError` before signing. */
    maxUsd?: number | null;
    asset?: string;
    assetReader?: X402PaymentAssetReader;
    /** Caller-owned URL for the request that produced this challenge. The
     * challenge's resource is accepted only when it is an exact match. */
    resourceUrl: string;
}
/** Result of {@link payChallenge} — `(x_payment_header, amount_usd)` in Python. */
interface PayChallengeResult {
    /** Base64 X-PAYMENT header value. Caller issues the retry request. */
    readonly header: string;
    readonly amountUsd: number;
    readonly assetId: string;
    readonly symbol: string;
    readonly tokenAddress: string;
    readonly decimals: number;
    readonly amountAtomic: string;
}
/**
 * Sign an already-received 402 challenge body and return the X-PAYMENT
 * header + USD paid.
 *
 * Use this when the caller owns the HTTP session (cookies, custom auth) and
 * received a 402 through a separate path — e.g. Pieverse's `createKey`
 * flow, which already issued the initial request and just needs the signed
 * envelope for the retry.
 */
declare function payChallenge(challenge: Record<string, unknown>, opts: PayChallengeOpts): Promise<PayChallengeResult>;
interface QuoteUrlOpts {
    method?: string;
    jsonBody?: Record<string, unknown> | null;
    headers?: Record<string, string> | null;
    allowedHosts?: readonly string[] | null;
    fetchImpl?: typeof fetch;
    timeout?: number;
    networkName?: string;
    asset?: string;
}
/**
 * Probe an x402 endpoint without paying.
 *
 * Issues the request and expects a 402 response; returns the parsed JSON
 * body of that challenge. If the server responds with anything other than
 * 402, throws `X402PaymentRequiredError`.
 */
declare function quoteUrl(url: string, opts?: QuoteUrlOpts): Promise<Record<string, unknown>>;

/**
 * Buyer policy + per-day budget tracker — port of
 * `bnbagent_studio_core/x402/policy.py`.
 *
 * The daily cap value lives in `[budget].max_per_day_usd` and is enforced
 * for the `fetchWithPayment` buyer path — EVM and twak alike — through
 * {@link getSharedBudgetTracker}. The Pieverse auto-topup gate
 * (`BudgetGate`) reads the SAME key but is an independent counter for its
 * own path (it also enforces a monthly cap + cold-start); the auto-topup
 * spend is counted once, by the gate, not double-counted here (see L4).
 * `[payments.x402].daily_cap_usd` is deprecated but honored as a fallback.
 */
/**
 * One persisted spend/gas event (BUG-015). `amount_usd` is the $U side; the
 * gas fields come from the confirmed receipt. `sponsored` marks a
 * paymaster-covered tx (receipt `effectiveGasPrice === 0`) — the sponsor's
 * true wei cost is not observable on-chain, so only the flag plus
 * `gas_used` are recorded, never a fabricated sponsored-wei figure.
 */
interface LedgerEntry {
    ts: string;
    op: string;
    amount_usd?: number;
    tx_hash?: string;
    gas_used?: string;
    wallet_paid_wei?: string;
    sponsored?: boolean;
}
interface BudgetTrackerOpts {
    dailyCapUsd: number;
    /**
     * Optional on-disk ledger (CLI path): each `bag` command is a fresh
     * process, so without persistence the daily cap would only ever bound a
     * single invocation. When set, today's spend is loaded on first touch and
     * re-written after every mutation. Write failures (read-only mounts — the
     * deployed AgentCore runtime) silently degrade to in-memory, which is
     * exactly the intended deployed-side behavior.
     */
    ledgerPath?: string | null;
}
/**
 * Per-process counter of USD paid today (UTC day-bucketed).
 *
 * Resets automatically when the UTC date rolls over. Without a ledger it is
 * not persisted — if the agent process restarts the counter resets too;
 * that's acceptable for v0.0.x since the budget is a soft guardrail, not a
 * hard accounting boundary.
 *
 * The mutating paths (`reserveUsd` / `rollbackUsd`) are async: they take an
 * interprocess lock (a `proper-lockfile` sidecar next to the ledger — the
 * flock equivalent) around the whole load→check→update→persist critical
 * section, so two CLI/agent processes can never both pass the cap check and
 * overshoot the daily cap. The read-only legacy API (`totalTodayUsd` /
 * `wouldExceed` / `recordTopup`) stays synchronous like Python's.
 */
declare class BudgetTracker {
    #private;
    readonly dailyCapUsd: number;
    /** Mutable on purpose: set to null when persistence degrades to memory. */
    ledgerPath: string | null;
    constructor(opts: BudgetTrackerOpts);
    /**
     * Validate a selected persisted ledger without reserving spend, taking a
     * lock, or writing state. Payment paths use this before their first HTTP
     * request so malformed accounting cannot be discovered after a challenge.
     */
    preflightLedger(): void;
    /**
     * Atomic check + add. Mirrors SDK `SessionBudgetTracker.reserve`.
     *
     * Pair with {@link rollbackUsd} on downstream failure so rejected
     * payments never consume daily budget.
     *
     * `recordOp` (BUG-015) also appends a ledger entry for the reserved spend
     * inside the same critical section — used by the buyer paths where the
     * reservation IS the accounting (S-7: no rollback once sent).
     *
     * @throws {X402BudgetExhaustedError} on cap overflow.
     */
    reserveUsd(amountUsd: number, now?: Date | null, recordOp?: string): Promise<void>;
    /**
     * Append a spend/gas entry to the persistent ledger (BUG-015).
     *
     * Entries are an append-log INDEPENDENT of the daily-cap bucket: they
     * survive day rollover so `bag budget show` can answer "what did my
     * wallet actually pay" without an explorer crawl. Locked and reloaded
     * like the reserve path so concurrent processes merge instead of
     * clobbering; capped at the newest {@link MAX_LEDGER_ENTRIES}.
     * Best-effort: with no on-disk ledger (deployed runtime) entries stay
     * in-memory for the life of the process.
     */
    recordEntry(entry: LedgerEntry): Promise<void>;
    /** Fresh snapshot of the persisted entries (reloaded when on-disk). */
    listEntries(): Promise<LedgerEntry[]>;
    /**
     * Release a reservation. Floors at zero. Never throws (past the lock).
     *
     * Day bucket is not reset here on purpose — rolling back after a UTC
     * rollover would otherwise zero a fresh bucket spuriously.
     */
    rollbackUsd(amountUsd: number, now?: Date | null): Promise<void>;
    totalTodayUsd(now?: Date | null): number;
    /**
     * Race-unsafe when paired with a separate `recordTopup`. Use
     * {@link reserveUsd} for atomic check + increment in concurrent code.
     */
    wouldExceed(amountUsd: number, now?: Date | null): boolean;
    /**
     * Race-unsafe when paired with a separate `wouldExceed`. Use
     * {@link reserveUsd} for atomic check + increment in concurrent code.
     */
    recordTopup(amountUsd: number, now?: Date | null): void;
}
/**
 * Hosts pre-cleared for Pieverse-style LLM gateway flows
 * (`bag llm activate` / `PieverseCreditEnsurer` auto-renew + agent tool
 * paths that buy LLM credits).
 */
declare const ALLOWED_HOSTS_PIEVERSE_PROFILE: ReadonlySet<string>;
/**
 * Hosts pre-cleared for CoinMarketCap's x402 endpoints. The live endpoints
 * serve from `pro-api.coinmarketcap.com` (verified against the real 402
 * challenge, 2026-07-02).
 */
declare const ALLOWED_HOSTS_CMC_PROFILE: ReadonlySet<string>;
/**
 * One trusted x402 merchant from `[payments.x402.merchants.<name>]`.
 *
 * Written by `bag x402 trust` (the Bazaar / paid-capability flow) and
 * consumed by the buyer: `payTo` is the pinned recipient byte-compared
 * against the 402 response's `payTo` for URLs on `domain`, and
 * `perCallCapUsd` (when set) caps every single payment to that merchant
 * regardless of the caller's `maxUsd`. Neither value is ever an
 * LLM-supplied parameter — they come from this user-confirmed config.
 */
interface X402Merchant {
    readonly name: string;
    readonly domain: string;
    readonly payTo: string;
    readonly perCallCapUsd: number | null;
    readonly verified: boolean;
    /**
     * Legacy single-asset pin. Superseded by {@link assets}, which a
     * multi-asset merchant needs, and kept so entries written before that
     * keep their guard.
     */
    readonly asset?: string;
    /**
     * Every payment asset the user reviewed when trusting this merchant. The
     * buyer refuses anything outside it, so a merchant cannot demand a token
     * the user never approved — while a merchant that genuinely sells in
     * several stablecoins stays payable in all of them.
     */
    readonly assets?: readonly string[];
    /**
     * An asset pin was configured but could not be read.
     *
     * Dropping such a key would turn a restriction the user wrote into no
     * restriction at all, letting a merchant be paid in assets that were never
     * reviewed. The buyer refuses this merchant outright until the entry is
     * fixed or removed.
     */
    readonly assetPinUnreadable?: boolean;
}
/**
 * The assets a merchant entry pins.
 *
 * `null` means no pin was configured. An empty list means one was, but
 * permits nothing — the reading of an unreadable pin, so that a caller which
 * only checks membership still refuses rather than falling open.
 *
 * `assets` is authoritative where present, because `bag x402 trust` writes
 * exactly one of the two keys and drops the other. Both together is a hand
 * edit, and honouring the scalar would re-narrow a merchant the list
 * deliberately widened, so the list wins and the leftover is called out.
 */
declare function merchantPinnedAssets(merchant: X402Merchant | null): readonly string[] | null;
interface X402BuyerPolicyFields {
    maxPerRequestUsd?: number;
    dailyCapUsd?: number;
    allowedHosts?: readonly string[];
    maxRetries?: number;
    baseDelaySeconds?: number;
    merchants?: readonly X402Merchant[];
}
/**
 * User-tunable x402 buyer settings from `[payments.x402]`.
 *
 * Defaults are deny-all: $1/request and $20/day caps are ready, but no host
 * is allowed until the user configures `allowed_hosts` or trusts a merchant.
 */
declare class X402BuyerPolicy {
    readonly maxPerRequestUsd: number;
    readonly dailyCapUsd: number;
    readonly allowedHosts: readonly string[];
    /**
     * Paid-retry budget. After signing X-PAYMENT, the buyer may need to retry
     * the same request a few times because the facilitator hasn't indexed the
     * tx yet. Exponential backoff: attempt `n` sleeps
     * `baseDelaySeconds * 2**n` before the next try.
     */
    readonly maxRetries: number;
    readonly baseDelaySeconds: number;
    /** Trusted merchants from `[payments.x402.merchants.*]` (bag x402 trust). */
    readonly merchants: readonly X402Merchant[];
    constructor(fields?: X402BuyerPolicyFields);
    /**
     * `allowedHosts` plus every trusted merchant's domain (deduped).
     *
     * Trusting a merchant implies allowing its host — callers that gate on
     * the host allowlist (CLI, the x402-buyer recipe tool) should use this
     * instead of `allowedHosts` so users don't have to list a domain twice.
     */
    get effectiveAllowedHosts(): readonly string[];
    /** Look up a trusted merchant by URL host (case-insensitive). */
    merchantForHost(host: string | null | undefined): X402Merchant | null;
    /** Policy scoped to `llm.pieverse.io` only. */
    static pieverseDefault(): X402BuyerPolicy;
    /** Policy scoped to CoinMarketCap's x402 host only. */
    static cmcDefault(): X402BuyerPolicy;
    /** Combine multiple host profiles into one allowlist. */
    static combined(...profiles: Iterable<string>[]): X402BuyerPolicy;
    /**
     * Build a policy from a parsed `studio.toml` object (or null).
     *
     * Reads `cfg.payments.x402`. Missing fields fall back to the defaults.
     * Unknown keys are silently ignored so future versions can add fields
     * without breaking older installs.
     */
    static fromToml(cfg: Record<string, unknown> | null | undefined): X402BuyerPolicy;
}
/**
 * Resolve the buyer-path daily cap from a parsed studio.toml object.
 *
 * Precedence:
 *   1. `[budget].max_per_day_usd` — the daily authority for the
 *      `fetchWithPayment` path; when set it governs both the EVM and twak
 *      buyer paths. The Pieverse `BudgetGate` reads the same key for its
 *      own (independent) auto-topup counter.
 *   2. `[payments.x402].daily_cap_usd` — DEPRECATED; honored as a fallback
 *      with a warning.
 *   3. `20.0` — the documented X402BuyerPolicy default.
 *
 * Note: when `[budget]` is absent the Pieverse `BudgetGate` keeps its own
 * $3/day default — the two counters only read the same value when the user
 * sets this key. That asymmetry is deliberate back-compat.
 */
declare function resolveDailyCapUsd(cfg: Record<string, unknown> | null | undefined): number;
/**
 * Immutable configuration facts captured by a payment attempt before it
 * starts I/O. Passing this to {@link getSharedBudgetTracker} prevents the
 * tracker from re-reading a potentially changed `studio.toml` after a 402.
 */
interface X402BudgetTrackerSnapshot {
    readonly dailyCapUsd: number;
    readonly projectRoot: string | null;
}
/**
 * Process-wide daily budget tracker for the `fetchWithPayment` path.
 *
 * Single choke point for `fetchWithPayment` (both the EVM and the twak
 * delegated branch): it reserves against this tracker before any payment is
 * issued, which transitively covers the x402-buyer recipe tool and
 * `bag x402 fetch`.
 *
 * Two buyer payments are deliberately NOT counted here:
 *
 * - `payChallenge` — the operator-initiated key-mint / initial-allocation
 *   path (`bag llm rotate --initial-usd N` → `createKey`). It makes a real
 *   on-chain payment but enforces only its own per-call `maxUsd`; counting
 *   an explicit operator deposit against the autonomous-spend daily cap
 *   could surprise an operator who set a low cap, so it is excluded.
 * - the Pieverse auto-topup — already reserved against the BudgetGate's own
 *   `max_per_day_usd` upstream, so `fetchWithPayment` skips its reserve via
 *   `dailyCapCountedElsewhere` (`./buyer`) to avoid double-counting the
 *   same dollar (L4). The two daily counters are independent: this tracker
 *   governs direct fetches, the BudgetGate governs auto-topup.
 *
 * Persists to `<project-root>/.studio/spend-ledger.json` so the cap
 * accumulates across CLI invocations; on read-only mounts (the deployed
 * runtime) persistence degrades to in-memory automatically.
 */
declare function getSharedBudgetTracker(snapshot?: X402BudgetTrackerSnapshot): BudgetTracker;
/** Test-only: drop every keyed process-local tracker. */
declare function _resetSharedBudgetTracker(): void;

export { ALLOWED_HOSTS_CMC_PROFILE as A, BudgetTracker as B, type X402TrustedPaymentFacts as C, X402UnsupportedWalletError as D, X402UnsupportedWalletRouteError as E, type FetchResult as F, type X402WalletRouteDiagnosis as G, _checkHost as H, _isDailyCapCountedElsewhere as I, _parseAccepted as J, _parseAcceptedExactRoute as K, type LedgerEntry as L, _resetSharedBudgetTracker as M, _setConfigLoader as N, _setSleep as O, type PayChallengeOpts as P, type QuoteUrlOpts as Q, dailyCapCountedElsewhere as R, fetchWithPayment as S, getSharedBudgetTracker as T, merchantPinnedAssets as U, payChallenge as V, resolveDailyCapUsd as W, type X402WalletLike as X, _fetchPieverseTopup as _, ALLOWED_HOSTS_PIEVERSE_PROFILE as a, type BudgetTrackerOpts as b, type FetchWithPaymentOpts as c, type PayChallengeResult as d, X402AssetMismatchError as e, X402AuthError as f, X402BudgetExhaustedError as g, X402BuyerPolicy as h, type X402BuyerPolicyFields as i, X402Error as j, X402HostNotAllowedError as k, X402InsufficientPaymentAssetAllowanceError as l, X402InsufficientPaymentAssetBalanceError as m, type X402Merchant as n, type X402PaidTransferMethod as o, X402PaymentAssetBalanceUnavailableError as p, quoteUrl as q, type X402PaymentAssetFacts as r, type X402PaymentAssetReader as s, X402PaymentAssetUnavailableError as t, X402PaymentOutcomeUnknownError as u, type X402PaymentOutcomeUnknownOptions as v, X402PaymentRequiredError as w, X402RecipientRequiredError as x, X402RetryExhaustedError as y, X402SellerConfigError as z };
