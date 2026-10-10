import { TomlTable } from '../config.js';
import { X as X402WalletLike, _ as _fetchPieverseTopup, q as quoteUrl } from '../policy-BzCvMIrB.js';
export { B as TopupBudgetTracker } from '../policy-BzCvMIrB.js';
import '@bnbagent/sdk/x402';

/**
 * Thin HTTP wrapper + exception taxonomy — port of
 * `bnbagent_studio_core/pieverse/client.py`.
 *
 * A minimal fetch wrapper around the Pieverse LLM gateway
 * (`https://llm.pieverse.io`). Centralises:
 *
 * - Base URL + default 30s timeout
 * - Bearer auth header injection for session-token endpoints
 * - Exception mapping (401 → `PieverseAuthError`, 4xx/5xx → `PieverseError`)
 * - Cookie-session reuse for the SIWE challenge → verify two-step
 * - Opt-in transient-failure retry, scoped via {@link retrying} (off by
 *   default)
 *
 * Tests inject a custom {@link PieverseHttpClient} (the httpx.MockTransport
 * stand-in) via the `httpClient` option on the public API.
 */
declare const PIEVERSE_BASE_URL = "https://llm.pieverse.io";
declare const PIEVERSE_TOPUP_PATH = "/v1/topup/x402";
declare const DEFAULT_TIMEOUT_SECONDS = 30;
/** Base class for all Pieverse gateway errors. */
declare class PieverseError extends Error {
    constructor(message?: string, opts?: ErrorOptions);
}
/** Auth failure — bad signature, expired session, missing token, etc. */
declare class PieverseAuthError extends PieverseError {
    constructor(message?: string, opts?: ErrorOptions);
}
/**
 * The requested key hash is not owned by the SIWE-authenticated wallet.
 *
 * Pieverse's `GET /v1/me/keys` only lists keys owned by the signing wallet,
 * so a key created by a different wallet never appears — the common BYOK case
 * where the agent's signing wallet is not the Pieverse key owner. Carries the
 * `keyHash` so the credit-ensure hook can explain the mismatch. The default
 * message is unchanged from the original bare `PieverseError` for callers that
 * match on message text.
 */
declare class PieverseKeyNotFoundError extends PieverseError {
    readonly keyHash: string;
    constructor(keyHash: string, message?: string, opts?: ErrorOptions);
}
/**
 * Auto-renew refused to top up because the per-day cap would be exceeded.
 *
 * @deprecated Kept for backwards compatibility. As of the LLM auto-renew
 * decision, the auto-renew hook no longer triggers `topupX402` (wallet
 * spend) and therefore no longer enforces a daily cap.
 * `max_topup_per_day_usd` is parsed but currently unused; a future version
 * may restore auto-spend behaviour.
 */
declare class PieverseBudgetExhaustedError extends PieverseError {
    constructor(message?: string, opts?: ErrorOptions);
}
/**
 * Pieverse Account Balance cannot cover the requested allocation.
 *
 * Thrown by `PieverseCreditEnsurer` when
 * `POST /v1/me/keys/{hash}/allocate` returns 400 `InvalidAllocationError`.
 * v0.0.1 does NOT auto-spend the user's wallet; the user must run
 * `bag llm topup --amount N` to refill the account.
 */
declare class PieverseAccountBalanceExhaustedError extends PieverseError {
    constructor(message?: string, opts?: ErrorOptions);
}
/** Endpoint returned a non-402 status when the protocol required 402. */
declare class PieversePaymentRequiredError extends PieverseError {
    constructor(message?: string, opts?: ErrorOptions);
}
/**
 * Auto-topup refused because the process is within the cold-start window
 * (gate 5) — defends against boot-loop scenarios that would otherwise
 * drain the user's monthly cap.
 */
declare class PieverseColdStartTopupBlockedError extends PieverseError {
    constructor(message?: string, opts?: ErrorOptions);
}
/**
 * Auto-topup refused because a per-topup / per-day / per-month cap was hit
 * (gates 2-4).
 */
declare class PieverseTopupCapExceededError extends PieverseError {
    constructor(message?: string, opts?: ErrorOptions);
}
/**
 * Auto-topup refused because `WALLET_PASSWORD` env is not set (gate 1) —
 * without an unlocked keystore the hook degrades safely to allocate-only
 * mode.
 */
declare class PieverseTopupWalletPasswordMissingError extends PieverseError {
    constructor(message?: string, opts?: ErrorOptions);
}
/**
 * Auto-topup refused because the user has not acknowledged the policy
 * (T37.7): `[budget].enabled = true` alone is not enough — there must also
 * be a `[budget].acknowledged_at` timestamp marking explicit consent.
 * Defends against someone hand-editing `studio.toml`.
 */
declare class PieverseBudgetNotAcknowledgedError extends PieverseError {
    constructor(message?: string, opts?: ErrorOptions);
}
/**
 * The response surface the Pieverse layer consumes — the httpx.Response
 * stand-in. `json()` throws on non-JSON bodies (like `httpx.Response.json`).
 */
interface PieverseResponse {
    readonly statusCode: number;
    readonly reasonPhrase: string;
    readonly text: string;
    json(): unknown;
}
/** Options for a single {@link PieverseHttpClient.request} call. */
interface PieverseRequestOpts {
    json?: unknown;
    headers?: Record<string, string>;
}
/**
 * The injected-client seam (httpx.Client stand-in). Implementations MUST
 * retain cookies across requests (SIWE challenge → verify relies on it) and
 * throw on transport-level failures (timeouts, connection errors).
 */
interface PieverseHttpClient {
    request(method: string, path: string, opts?: PieverseRequestOpts): Promise<PieverseResponse>;
}
/**
 * Return a configured client if the caller didn't supply one.
 *
 * If the caller injected a client (tests do this), return it unchanged.
 */
declare function makeClient(httpClient?: PieverseHttpClient | null): PieverseHttpClient;
/**
 * Map HTTP status to the appropriate `PieverseError` subclass.
 *
 * 402 is **not** raised here — callers handle x402 handshakes themselves.
 */
declare function _raiseForStatus(resp: PieverseResponse): void;
/**
 * Transient-failure retry policy for Pieverse requests.
 *
 * Active only inside a {@link retrying} block — by default Pieverse
 * requests do NOT retry. Retries cover server-side 5xx (e.g. a Cloudflare
 * `521`) and network/timeout errors; client errors (4xx, incl. 401 auth)
 * are never retried. `attempts` records how many retries were actually
 * performed and can be read after the block to annotate an error message.
 */
declare class RetryPolicy {
    maxRetries: number;
    delaySeconds: number;
    onRetry: ((attempt: number, maxRetries: number, reason: string) => void) | null;
    attempts: number;
    constructor(opts?: {
        maxRetries?: number;
        delaySeconds?: number;
        onRetry?: (attempt: number, maxRetries: number, reason: string) => void;
    });
}
/**
 * Scope `policy` to Pieverse calls made inside `fn` — the async-function
 * replacement for Python's `with retrying(policy):` block.
 */
declare function retrying<T>(policy: RetryPolicy, fn: () => T | Promise<T>): Promise<T>;
/** Options for {@link request}. */
interface RequestOpts {
    sessionToken?: string | null;
    json?: unknown;
    headers?: Record<string, string> | null;
    raiseOnError?: boolean;
}
/**
 * Issue a request, attach Bearer auth, optionally raise on non-2xx.
 *
 * Returns the raw {@link PieverseResponse} so callers can introspect 402
 * bodies for x402 handshakes. Transient 5xx/network failures are retried
 * only when the caller is inside a {@link retrying} block.
 */
declare function request(client: PieverseHttpClient, method: string, path: string, opts?: RequestOpts): Promise<PieverseResponse>;

/**
 * API key CRUD against Pieverse — port of
 * `bnbagent_studio_core/pieverse/keys.py`.
 *
 * Endpoints documented in `docs/guides/pieverse-integration.md` §1.
 */

interface CreateKeyOpts {
    initialAllocationUsd?: number;
    wallet?: X402WalletLike | null;
    networkName?: string | null;
    httpClient?: PieverseHttpClient | null;
}
/**
 * Create a new Pieverse API key.
 *
 * If Pieverse responds 402, run the x402 handshake to pay the initial
 * allocation, then retry the create.
 *
 * Returns an object with at least `{key, hash}`.
 */
declare function createKey(sessionToken: string, name: string, opts?: CreateKeyOpts): Promise<Record<string, unknown>>;
/**
 * Fetch info for a single key by listing all keys and filtering.
 *
 * Pieverse's `GET /v1/me/keys/{hash}` returns 404 in production (despite
 * an earlier audit claim — see §1 update). We go straight to the list
 * endpoint and filter client-side. Returns a normalised object:
 *
 *     {"hash": ..., "remaining_usd": number | null, "raw": <full entry>}
 */
declare function inspectKey(sessionToken: string, keyHash: string, opts?: {
    httpClient?: PieverseHttpClient | null;
}): Promise<Record<string, unknown>>;
/**
 * Add credit to an existing key.
 *
 * Verified: the allocate path is `POST /v1/me/keys/{hash}/allocate` with
 * body `{"amount_usd": N}`. `PATCH /v1/me/keys/{hash}` is rename/disable
 * only — not allocate.
 *
 * Returns the parsed JSON body on success. Pieverse-side errors (e.g.
 * `400 InvalidAllocationError` when account balance is insufficient)
 * propagate as `PieverseError`; per the user-locked design (audit §8) we
 * do **not** optimistically attempt the allocate then trigger a topup —
 * callers must confirm balance via {@link inspectKey} and run a topup
 * first if needed.
 */
declare function allocate(sessionToken: string, keyHash: string, amountUsd: number, opts?: {
    httpClient?: PieverseHttpClient | null;
}): Promise<Record<string, unknown>>;
interface AllocateWithSettleRetryOpts {
    httpClient?: PieverseHttpClient | null;
    attempts?: number;
    baseDelaySeconds?: number;
    maxDelaySeconds?: number;
    sleep?: (seconds: number) => void | Promise<void>;
}
/**
 * {@link allocate} with bounded backoff retry on the post-topup settle race.
 *
 * Pieverse credits the Account Balance only once its **deposit scanner**
 * observes the settled on-chain transfer (per the API docs). An `allocate`
 * fired immediately after a successful topup can therefore lose the race
 * and return `400 InvalidAllocationError` ("Allocation exceeds available
 * user balance") even though the funds are in flight. We retry that
 * specific error with exponential backoff (capped); any other error
 * propagates immediately.
 *
 * The total wait is bounded (~20s for the defaults) so a genuinely
 * underfunded account still surfaces the same error after the final
 * attempt.
 */
declare function allocateWithSettleRetry(sessionToken: string, keyHash: string, amountUsd: number, opts?: AllocateWithSettleRetryOpts): Promise<Record<string, unknown>>;
/**
 * Fetch aggregate spend over the last `days` days.
 *
 * Wraps `GET /v1/me/usage?days=N`. Returns a normalised object:
 *
 *     {"total_cost_usd": number | null,
 *      "prompt_tokens": number | null,
 *      "completion_tokens": number | null}
 *
 * NOTE: This is USAGE (what was spent), **not** remaining balance.
 * Pieverse does not expose an account-level balance endpoint via API
 * (verified — see `docs/guides/pieverse-integration.md` §8). For balance,
 * use {@link inspectKey} per individual API key.
 */
declare function getAccountUsage(sessionToken: string, opts?: {
    days?: number;
    httpClient?: PieverseHttpClient | null;
}): Promise<Record<string, unknown>>;

/**
 * Auto-renew policy + budget gate — port of
 * `bnbagent_studio_core/pieverse/policy.py`.
 *
 * The hot-path topup hook reads a {@link PieversePolicy} from
 * `studio.toml [llm.auto_renew]`; the opt-in {@link BudgetPolicy} /
 * {@link BudgetGate} pair guards autonomous wallet spend.
 *
 * Stage B: `TopupBudgetTracker` is an alias for the x402 `BudgetTracker` —
 * the two were behaviourally identical, so we dedup to one implementation.
 * `PieversePolicy` stays Pieverse-specific because it encodes the
 * `[llm.auto_renew]` schema.
 */

declare const COLD_START_ENV_VAR = "PIEVERSE_BUDGET_COLD_START_SECONDS";
/**
 * User-tunable auto-renew settings.
 *
 * Defaults track the zero-deposit auto/free default: enabled by default,
 * $0.2 floor, $1 chunks, $3/day opt-in cap, polled every minute.
 *
 * **v0.0.1 semantics**:
 * - `topupChunkUsd` is the allocation chunk pulled from the user's
 *   Pieverse Account Balance into the API key when Key Credit drops below
 *   `minBalanceUsd`. It is NO LONGER a wallet spend amount.
 * - `maxTopupPerDayUsd` is parsed for forwards-compatibility and enforced
 *   ONLY when the user opts in via `bag budget enable`.
 */
declare class PieversePolicy {
    readonly enabled: boolean;
    readonly minBalanceUsd: number;
    readonly topupChunkUsd: number;
    readonly maxTopupPerDayUsd: number;
    readonly checkIntervalSeconds: number;
    constructor(fields?: {
        enabled?: boolean;
        minBalanceUsd?: number;
        topupChunkUsd?: number;
        maxTopupPerDayUsd?: number;
        checkIntervalSeconds?: number;
    });
    /**
     * Build a policy from a `[llm.auto_renew]` table (or null).
     *
     * Missing fields fall back to the defaults. Unknown keys are silently
     * ignored so future versions can add fields without breaking older
     * installs.
     */
    static fromToml(cfg: TomlTable | null | undefined): PieversePolicy;
}
/**
 * Opt-in auto-topup caps.
 *
 * Default is **disabled**. The user must run `bag budget enable` (which
 * writes `[budget].enabled = true` to `studio.toml`) before the in-process
 * managed-model hook will auto-spend the wallet via x402 to refill the API
 * key. Until then, the auto-renew hook stays in allocate-only mode.
 *
 * Six gates protect against runaway spend:
 * 1. `WALLET_PASSWORD` env present (enforced in {@link BudgetGate})
 * 2. `maxPerTopupUsd` — single topup cap (default $1)
 * 3. `maxPerDayUsd` — UTC-day rolling cap (default $3)
 * 4. `maxPerMonthUsd` — UTC-month rolling cap (default $15)
 * 5. `coldStartSeconds` — process-start grace window (default 60s)
 * 6. Failure backoff — failures do not immediately retry (caller policy)
 */
declare class BudgetPolicy {
    readonly enabled: boolean;
    readonly maxPerTopupUsd: number;
    readonly maxPerDayUsd: number;
    readonly maxPerMonthUsd: number;
    readonly minBalanceUsd: number;
    readonly coldStartSeconds: number;
    /**
     * T37.7: ISO-8601 UTC timestamp marking when the user explicitly
     * acknowledged auto-topup terms. Required when enabled=true — the gate
     * refuses to topup if enabled but unacknowledged (defensive default
     * against someone hand-editing studio.toml to set enabled=true).
     */
    readonly acknowledgedAt: string | null;
    constructor(fields?: {
        enabled?: boolean;
        maxPerTopupUsd?: number;
        maxPerDayUsd?: number;
        maxPerMonthUsd?: number;
        minBalanceUsd?: number;
        coldStartSeconds?: number;
        acknowledgedAt?: string | null;
    });
    /**
     * Build a policy from a `[budget]` table (or null → defaults).
     *
     * `coldStartSeconds` honours the `PIEVERSE_BUDGET_COLD_START_SECONDS`
     * env override even when the toml supplies an explicit value — the env
     * wins. This is intentional: CI must be able to disable the gate without
     * editing the project's toml.
     */
    static fromToml(cfg: TomlTable | null | undefined): BudgetPolicy;
}
/**
 * Stateful enforcer of {@link BudgetPolicy}'s pre-topup gates.
 *
 * Construct once per managed-model instance; the gate tracks daily and
 * monthly spend in-process. Restarting the process resets the counters —
 * consistent with `BudgetTracker` and acceptable because the caps are soft
 * guardrails, not hard accounting boundaries.
 *
 * Use {@link checkCanTopup} to validate an upcoming topup amount, then
 * {@link reserve} on success, or {@link rollback} if the downstream spend
 * fails. This mirrors the reservation pattern in the x402 `BudgetTracker`
 * so caps stay accurate across concurrent calls.
 */
declare class BudgetGate {
    #private;
    readonly policy: BudgetPolicy;
    /** Monotonic seconds at construction. Public so tests can rewind the
     * cold-start window (mirrors the Python tests' `_process_start_monotonic`
     * rewind). */
    _processStartMonotonic: number;
    _currentDay: string | null;
    _spentTodayUsd: number;
    _currentMonth: string | null;
    _spentThisMonthUsd: number;
    constructor(opts: {
        policy: BudgetPolicy;
    });
    /**
     * Run gates 1-5; throw the matching error on first failure.
     *
     * Does NOT reserve. Pair with {@link reserve} after the upstream
     * topupX402 call returns success.
     */
    checkCanTopup(amountUsd: number, opts: {
        hasWalletPassword: boolean;
        now?: Date | null;
    }): void;
    /**
     * Atomic check-and-commit. Use instead of {@link checkCanTopup} when the
     * caller wants the cap accounting to happen before the downstream spend;
     * pair with {@link rollback} on failure.
     */
    reserve(amountUsd: number, opts?: {
        now?: Date | null;
    }): void;
    /** Release a reservation. Floors at zero. Invalid amounts fail closed. */
    rollback(amountUsd: number): void;
}

/**
 * Sign-In With Ethereum for Pieverse — port of
 * `bnbagent_studio_core/pieverse/siwe.py`.
 *
 * Two-step:
 *
 * 1. `POST /v1/auth/challenge` → `{nonce, expires_at}` + a cookie
 *    (`ai_gateway_challenge`) bound to the requesting IP/session.
 * 2. Build the SIWE message in the **verbatim** format Pieverse expects,
 *    sign with the agent wallet (EIP-191 personal_sign), and
 *    `POST /v1/auth/verify` to exchange it for `session_token` (prefix
 *    `sess-pv-`). Chain ID is **always 56** — Pieverse's own auth chain,
 *    decoupled from the wallet's payment chain.
 *
 * **Safety invariants**: SIWE is EIP-191 personal_sign — it bypasses the
 * SDK `SigningPolicy` (which only gates EIP-712 typed-data). All SIWE
 * safety therefore lives in this module:
 *
 * - Domain and URI are compile-time constants for Pieverse. This function has
 *   no caller-supplied domain or URI surface.
 * - The constructed message MUST NOT contain a `Resources:` line. ReCap
 *   (Spruce's SIWE capability extension) lets `Resources:` lines encode
 *   transferable authority; that is structurally incompatible with the
 *   "off-chain signing produces no transferable authority" rule.
 */

declare const SIWE_DOMAIN = "llm.pieverse.io";
declare const SIWE_URI = "https://llm.pieverse.io";
declare const SIWE_STATEMENT = "Sign in to Pieverse AI Gateway";
declare const SIWE_CHAIN_ID = 56;
/**
 * Return the exact SIWE string Pieverse expects.
 *
 * The format is whitespace- and line-break-sensitive; do not reformat.
 */
declare function _buildSiweMessage(address: string, nonce: string, expiresAt: string, issuedAt?: string | null): string;
/** The narrow wallet surface SIWE needs — the SDK WalletProvider satisfies it. */
interface SiweWalletLike {
    readonly address: string;
    signMessage(message: string): Promise<unknown>;
}
/**
 * Run the SIWE challenge → verify round-trip and return the session token.
 *
 * The cookie set by the challenge endpoint is reused on the verify call —
 * if the caller passes their own client, it must retain cookies (the
 * default fetch-backed client does).
 */
declare function siweLogin(wallet: SiweWalletLike, opts?: {
    httpClient?: PieverseHttpClient | null;
}): Promise<string>;

/**
 * Thin wrapper over the x402 buyer — port of
 * `bnbagent_studio_core/pieverse/topup.py`.
 *
 * The protocol primitives (EIP-3009 signing, X-PAYMENT envelope, 402
 * handshake) live in `../x402`. This module is just the Pieverse-flavoured
 * caller — it knows the topup endpoint path and request body shape, and
 * delegates everything network/crypto to `fetchWithPayment`.
 */

declare const PIEVERSE_ALLOWED_HOSTS: readonly string[];
interface TopupDeps {
    fetchWithPayment: typeof _fetchPieverseTopup;
    quoteUrl: typeof quoteUrl;
}
/** Test seam: override the x402 buyer functions. Pass null to restore. */
declare function _setTopupDeps(overrides: Partial<TopupDeps> | null): void;
/**
 * Discover the trusted Pieverse merchant `payTo` via an unpaid 402 probe.
 *
 * Posts the topup request to the **hardcoded** Pieverse endpoint
 * (`PIEVERSE_BASE_URL` over HTTPS, authenticated with the caller's SIWE
 * Bearer token) WITHOUT an `X-PAYMENT` header, so the server answers 402
 * with its `accepts` list. `_parseAccepted` validates the advertised
 * chainId + U-token asset against `networkName` before we return the
 * `payTo` — so a tampered response with the wrong chain/asset is rejected,
 * not trusted.
 *
 * This is the basis for the topup path's self-service default: because the
 * endpoint host is studio-controlled and authenticated, its validated
 * `payTo` is trustworthy without a hand-set `expected_recipient`. The
 * generic `fetchWithPayment` buyer for arbitrary URLs does NOT get this
 * treatment — it still refuses an un-pinned `payTo`.
 */
declare function discoverTopupRecipient(sessionToken: string, amountUsd: number, networkName: string, opts?: {
    fetchImpl?: typeof fetch;
}): Promise<string>;
interface TopupX402Opts {
    /**
     * The trusted Pieverse pay-to address. A non-empty value (e.g. a pinned
     * `[payments.x402].expected_recipient`) wins and is byte-compared by the
     * SDK `X402Signer` against the 402's `payTo`. When empty, this
     * Pieverse-scoped path auto-discovers the recipient from the hardcoded,
     * SIWE-authenticated topup endpoint (see {@link discoverTopupRecipient})
     * rather than failing with `X402RecipientRequiredError` — so a freshly
     * scaffolded project funds itself without a hand-set address. The generic
     * x402 buyer for arbitrary URLs keeps refusing an un-pinned `payTo`.
     */
    expectedRecipient?: string;
    fetchImpl?: typeof fetch;
}
/**
 * Top up the active Pieverse session by `amountUsd` USD via x402.
 *
 * The caller authorizes this amount: manual commands pass the operator's
 * amount; automatic callers must first pass BudgetGate. The fixed recharge
 * endpoint does not use generic merchant purchase caps. Existing daily
 * accounting and the recipient, asset, and chain checks still apply.
 *
 * Builds the Pieverse-specific request body, delegates to the generic x402
 * buyer for the 402 handshake, and returns the parsed JSON body of the
 * post-payment response.
 */
declare function topupX402(sessionToken: string, amountUsd: number, wallet: X402WalletLike, networkName: string, opts?: TopupX402Opts): Promise<Record<string, unknown>>;

/**
 * Framework-neutral Pieverse credit hook — port of
 * `bnbagent_studio_core/pieverse/credit_ensurer.py`.
 *
 * The {@link PieverseCreditEnsurer} encapsulates everything the
 * "before-each-LLM-call, make sure the API key has credit" hook needs:
 *
 * 1. Cache the last known Pieverse Key Credit for `checkIntervalSeconds`
 * 2. Refresh via `inspectKey` when the cache is stale
 * 3. **Auto-allocate** `topupChunkUsd` from the user's existing Pieverse
 *    Account Balance to the API key when Key Credit dips below
 *    `minBalanceUsd`
 * 4. (opt-in) **Auto-topup** wallet U via x402 to refill Account Balance
 *    when the Account Balance cannot cover the allocation, gated by
 *    {@link BudgetGate}
 * 5. Throw {@link PieverseAccountBalanceExhaustedError} (with a
 *    `bag llm topup` hint) when the allocation cannot be covered and the
 *    budget gate is disabled
 *
 * This logic is **framework-neutral**: framework adapters construct one
 * ensurer per agent process and call `await ensureCredits()` before each
 * LLM call. The ensurer has no dependency on any agent framework.
 */

/** The wallet surface the ensurer needs: SIWE signing + x402 payment. */
type EnsurerWalletLike = SiweWalletLike & X402WalletLike;
interface EnsurerDeps {
    allocate: typeof allocate;
    allocateWithSettleRetry: typeof allocateWithSettleRetry;
    topupX402: typeof topupX402;
    siweLogin: typeof siweLogin;
    loadStudioToml: (path?: string) => TomlTable;
}
/** Test seam: override the ensurer's collaborators. Pass null to restore. */
declare function _setEnsurerDeps(overrides: Partial<EnsurerDeps> | null): void;
interface PieverseCreditEnsurerOpts {
    /**
     * The provider+model identifier (e.g. `openai/auto/free`,
     * `openai/anthropic/claude-sonnet-4-5`). Used to short-circuit the whole
     * hook for $0/token models (`auto/free` substring match).
     */
    modelId: string;
    wallet: EnsurerWalletLike;
    keyHash: string;
    networkName: string;
    policy: PieversePolicy;
    budgetPolicy?: BudgetPolicy | null;
    httpClient?: PieverseHttpClient | null;
    sessionToken?: string | null;
    /** Seconds clock (Python `time.time`) — injectable for tests. */
    clock?: (() => number) | null;
}
/**
 * Framework-neutral Pieverse credit refresh + budget-gated auto-topup.
 *
 * Construct one per agent process. The owning framework shell calls
 * `await ensureCredits()` before each LLM generate call.
 */
declare class PieverseCreditEnsurer {
    #private;
    _sessionToken: string | null;
    _lastCheckAt: number | null;
    _lastKnownBalance: number | null;
    _balanceUnknownWarned: boolean;
    /** BYOK owner-mismatch (negative cache): once the key is found to be owned
     * by a different wallet than this signer, the whole hook is disabled for the
     * process after one warning — never repeat the SIWE + list-keys roundtrip. */
    _ownerMismatch: boolean;
    /** Built iff the user opted in via `bag budget enable`. Carries
     * process-start time + day/month counters, so it is constructed once per
     * process — not per call. */
    readonly _budgetGate: BudgetGate | null;
    /** T37.8: process-local flag — emit the "AUTO-TOPUP ENABLED" banner only
     * on the FIRST successful topup of this process. */
    _firstTopupEmitted: boolean;
    constructor(opts: PieverseCreditEnsurerOpts);
    /**
     * Refresh Key Credit and auto-allocate from Account Balance if low.
     *
     * Wrapped in a lock so concurrent LLM calls share a single refresh /
     * allocate roundtrip rather than racing.
     *
     * **v0.0.1**: the hook ONLY moves money the user has already parked in
     * the Pieverse Account Balance. It will never call `topupX402` (wallet
     * spend) unless the user opts in via `bag budget enable`. If `allocate`
     * returns 400 `InvalidAllocationError` (Account Balance < requested
     * chunk) and the budget gate is disabled, we throw
     * {@link PieverseAccountBalanceExhaustedError} with a `bag llm topup`
     * hint so the user can refill on demand.
     *
     * **Fresh-check invariant**: before allocating we re-run `inspectKey` to
     * confirm Key Credit is still below threshold. Guards against
     * stale-cache false positives and concurrent external allocates.
     */
    ensureCredits(): Promise<void>;
}

/**
 * Pieverse model catalogue (GET /v1/models) — port of
 * `bnbagent_studio_core/pieverse/models.py`.
 *
 * The `/v1/models` endpoint is **public** (no SIWE / no Bearer required),
 * so this module does not depend on a session token. It is used by
 * `bag llm list-models` and `bag doctor` (verify the configured
 * `[llm].model` is one Pieverse actually serves).
 */

/**
 * Return the list of model ids served by Pieverse.
 *
 * Throws `PieverseError` on non-2xx responses or malformed bodies.
 */
declare function listModels(opts?: {
    httpClient?: PieverseHttpClient | null;
}): Promise<string[]>;

export { type AllocateWithSettleRetryOpts, BudgetGate, BudgetPolicy, COLD_START_ENV_VAR, type CreateKeyOpts, DEFAULT_TIMEOUT_SECONDS, type EnsurerWalletLike, PIEVERSE_ALLOWED_HOSTS, PIEVERSE_BASE_URL, PIEVERSE_TOPUP_PATH, PieverseAccountBalanceExhaustedError, PieverseAuthError, PieverseBudgetExhaustedError, PieverseBudgetNotAcknowledgedError, PieverseColdStartTopupBlockedError, PieverseCreditEnsurer, type PieverseCreditEnsurerOpts, PieverseError, type PieverseHttpClient, PieverseKeyNotFoundError, PieversePaymentRequiredError, PieversePolicy, type PieverseRequestOpts, type PieverseResponse, PieverseTopupCapExceededError, PieverseTopupWalletPasswordMissingError, type RequestOpts, RetryPolicy, SIWE_CHAIN_ID, SIWE_DOMAIN, SIWE_STATEMENT, SIWE_URI, type SiweWalletLike, type TopupX402Opts, _buildSiweMessage, _raiseForStatus, _setEnsurerDeps, _setTopupDeps, allocate, allocateWithSettleRetry, createKey, discoverTopupRecipient, getAccountUsage, inspectKey, listModels, makeClient, request, retrying, siweLogin, topupX402 };
