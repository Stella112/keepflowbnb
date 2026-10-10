import {
  findProjectRoot,
  loadStudioToml
} from "./chunk-AHE5Y6SQ.js";

// src/x402/errors.ts
var X402Error = class extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "X402Error";
  }
};
var X402AuthError = class extends X402Error {
  constructor(message) {
    super(message);
    this.name = "X402AuthError";
  }
};
var X402BudgetExhaustedError = class extends X402Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "X402BudgetExhaustedError";
  }
};
var X402PaymentRequiredError = class extends X402Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "X402PaymentRequiredError";
  }
};
var X402AssetMismatchError = class extends X402Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "X402AssetMismatchError";
  }
};
var X402HostNotAllowedError = class extends X402Error {
  constructor(message) {
    super(message);
    this.name = "X402HostNotAllowedError";
  }
};
var X402RecipientRequiredError = class extends X402Error {
  constructor(message) {
    super(message);
    this.name = "X402RecipientRequiredError";
  }
};
var X402UnsupportedWalletError = class extends X402Error {
  constructor(message) {
    super(message);
    this.name = "X402UnsupportedWalletError";
  }
};
var X402PaymentAssetUnavailableError = class extends X402AssetMismatchError {
  paymentDispatched = false;
  assetId;
  symbol;
  tokenAddress;
  addressPending;
  decimals;
  retryHint;
  alternatives;
  /** Non-empty when a merchant asset pin, not the endpoint, refused. */
  merchantPin;
  constructor(message, options) {
    super(message, options);
    this.name = "X402PaymentAssetUnavailableError";
    this.merchantPin = Object.freeze([...options.merchantPin ?? []]);
    this.assetId = options.asset.assetId;
    this.symbol = options.asset.symbol;
    this.tokenAddress = options.asset.tokenAddress;
    this.addressPending = options.asset.addressPending === true;
    this.decimals = options.asset.decimals;
    this.retryHint = options.asset.retryHint;
    this.alternatives = Object.freeze([...options.alternatives ?? []]);
  }
};
var X402UnsupportedWalletRouteError = class extends X402PaymentAssetUnavailableError {
  walletRoute;
  constructor(message, options) {
    super(message, options);
    this.name = "X402UnsupportedWalletRouteError";
    this.walletRoute = Object.freeze({
      branch: options.walletRoute.branch,
      payerExactMethods: options.walletRoute.payerExactMethods === null ? null : Object.freeze([...options.walletRoute.payerExactMethods])
    });
  }
};
var X402PaymentAssetBalanceUnavailableError = class extends X402PaymentAssetUnavailableError {
  constructor(message, options) {
    super(message, options);
    this.name = "X402PaymentAssetBalanceUnavailableError";
  }
};
var X402InsufficientPaymentAssetBalanceError = class extends X402PaymentAssetUnavailableError {
  requiredAtomic;
  currentAtomic;
  requiredHuman;
  currentHuman;
  constructor(message, options) {
    super(message, options);
    this.name = "X402InsufficientPaymentAssetBalanceError";
    this.requiredAtomic = options.requiredAtomic;
    this.currentAtomic = options.currentAtomic;
    this.requiredHuman = options.requiredHuman;
    this.currentHuman = options.currentHuman;
  }
};
var X402InsufficientPaymentAssetAllowanceError = class extends X402InsufficientPaymentAssetBalanceError {
  constructor(message, options) {
    super(message, options);
    this.name = "X402InsufficientPaymentAssetAllowanceError";
  }
};
var X402PaymentOutcomeUnknownError = class extends X402Error {
  paymentDispatched = true;
  paymentFacts;
  constructor(message, opts) {
    super(message, opts);
    this.name = "X402PaymentOutcomeUnknownError";
    this.paymentFacts = opts?.paymentFacts ? Object.freeze({ ...opts.paymentFacts }) : null;
  }
};
var X402RetryExhaustedError = class extends X402PaymentOutcomeUnknownError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "X402RetryExhaustedError";
  }
};
var X402SellerConfigError = class extends X402Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "X402SellerConfigError";
  }
};

// src/x402/policy.ts
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync
} from "fs";
import { basename, dirname, join, resolve } from "path";
import lockfile from "proper-lockfile";

// src/configValues.ts
function renderConfigValue(raw) {
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}
function parseNonNegativeNumber(raw, field) {
  const numeric = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN;
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(
      `${field} must be a finite non-negative number, got ${renderConfigValue(raw)}`
    );
  }
  return numeric;
}
function parseIntegerAtLeast(raw, field, minimum) {
  const numeric = parseNonNegativeNumber(raw, field);
  if (!Number.isInteger(numeric) || numeric < minimum) {
    throw new Error(
      `${field} must be an integer >= ${minimum}, got ${renderConfigValue(raw)}`
    );
  }
  return numeric;
}
function parseBoolean(raw, field) {
  if (typeof raw !== "boolean") {
    throw new Error(
      `${field} must be a boolean, got ${renderConfigValue(raw)}`
    );
  }
  return raw;
}

// src/x402/policy.ts
var DEFAULT_BUYER_DAILY_CAP_USD = 20;
function todayUtc(now) {
  const d = now ?? /* @__PURE__ */ new Date();
  return d.toISOString().slice(0, 10);
}
var MAX_LEDGER_ENTRIES = 1e3;
function parseLedgerData(raw) {
  if (!isRecord(raw)) {
    throw new TypeError("spend ledger must be an object");
  }
  if (typeof raw.day !== "string" || !isUtcDay(raw.day)) {
    throw new TypeError("ledger.day must be a valid UTC YYYY-MM-DD string");
  }
  if (typeof raw.spent_usd !== "number" || !Number.isFinite(raw.spent_usd) || raw.spent_usd < 0) {
    throw new TypeError(
      "ledger.spent_usd must be a finite non-negative number"
    );
  }
  if (!Object.hasOwn(raw, "entries")) {
    return { day: raw.day, spent_usd: raw.spent_usd };
  }
  if (!Array.isArray(raw.entries)) {
    throw new TypeError("ledger.entries must be an array when present");
  }
  return {
    day: raw.day,
    spent_usd: raw.spent_usd,
    entries: raw.entries.map(
      (entry, index) => parseLedgerEntry(entry, `ledger.entries[${index}]`)
    )
  };
}
function parseLedgerEntry(raw, field) {
  if (!isRecord(raw)) {
    throw new TypeError(`${field} must be an object`);
  }
  if (typeof raw.ts !== "string" || !isCanonicalTimestamp(raw.ts)) {
    throw new TypeError(`${field}.ts must be a canonical ISO-8601 timestamp`);
  }
  if (typeof raw.op !== "string" || raw.op.trim() === "") {
    throw new TypeError(`${field}.op must be a non-empty string`);
  }
  if (raw.amount_usd !== void 0 && (typeof raw.amount_usd !== "number" || !Number.isFinite(raw.amount_usd) || raw.amount_usd < 0)) {
    throw new TypeError(
      `${field}.amount_usd must be a finite non-negative number`
    );
  }
  if (raw.tx_hash !== void 0 && (typeof raw.tx_hash !== "string" || !/^0x[0-9a-fA-F]{64}$/u.test(raw.tx_hash))) {
    throw new TypeError(
      `${field}.tx_hash must be a canonical transaction hash`
    );
  }
  for (const key of ["gas_used", "wallet_paid_wei"]) {
    if (raw[key] !== void 0 && (typeof raw[key] !== "string" || !isCanonicalUnsignedInteger(raw[key]))) {
      throw new TypeError(`${field}.${key} must be an unsigned integer string`);
    }
  }
  if (raw.sponsored !== void 0 && typeof raw.sponsored !== "boolean") {
    throw new TypeError(`${field}.sponsored must be a boolean when present`);
  }
  return raw;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isUtcDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function isCanonicalTimestamp(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.toISOString() === value;
}
function isCanonicalUnsignedInteger(value) {
  return /^(?:0|[1-9]\d*)$/u.test(value);
}
var BudgetTracker = class {
  dailyCapUsd;
  /** Mutable on purpose: set to null when persistence degrades to memory. */
  ledgerPath;
  #currentDay = null;
  #spentTodayUsd = 0;
  #entries = [];
  constructor(opts) {
    this.dailyCapUsd = parseNonNegativeNumber(opts.dailyCapUsd, "dailyCapUsd");
    this.ledgerPath = opts.ledgerPath ?? null;
  }
  /**
   * Validate a selected persisted ledger without reserving spend, taking a
   * lock, or writing state. Payment paths use this before their first HTTP
   * request so malformed accounting cannot be discovered after a challenge.
   */
  preflightLedger() {
    this.#readLedger();
  }
  /**
   * UTC day-bucket reset (+ ledger load).
   *
   * `reload=true` (used under the interprocess lock in the mutating paths)
   * re-reads the on-disk ledger every call, so a peer process's spend is
   * observed before the cap check — without it the first-touch-only load
   * leaves each process checking against its own stale in-memory total.
   */
  #maybeReset(now, reload = false) {
    const today = todayUtc(now);
    if ((this.#currentDay === null || reload) && this.ledgerPath !== null) {
      this.#currentDay = null;
      this.#spentTodayUsd = 0;
      this.#entries = [];
      this.#loadLedger(today);
    }
    if (this.#currentDay !== today) {
      this.#currentDay = today;
      this.#spentTodayUsd = 0;
    }
  }
  /** Adopt the persisted spend iff the ledger is for `today` (UTC). */
  #loadLedger(today) {
    if (this.ledgerPath === null) return;
    const data = this.#readLedger(today);
    if (data === null) return;
    this.#entries = data.entries ?? [];
    if (data.day === today) {
      this.#currentDay = today;
      this.#spentTodayUsd = data.spent_usd;
    }
  }
  /** Read and schema-validate the ledger while retaining its root cause. */
  #readLedger(today = todayUtc()) {
    if (this.ledgerPath === null) return null;
    try {
      const data = parseLedgerData(
        JSON.parse(readFileSync(this.ledgerPath, "utf-8"))
      );
      if (data.day > today) {
        throw new TypeError("ledger.day must not be in the future");
      }
      return data;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      const message = error instanceof Error ? error.message : String(error);
      throw new X402BudgetExhaustedError(
        `cannot safely load spend ledger: ${message}`,
        { cause: error }
      );
    }
  }
  /** Best-effort ledger write (atomic tmp + rename). */
  #persist() {
    if (this.ledgerPath === null || this.#currentDay === null) return;
    try {
      mkdirSync(dirname(this.ledgerPath), { recursive: true });
      const tmp = `${this.ledgerPath}.tmp`;
      writeFileSync(
        tmp,
        JSON.stringify({
          day: this.#currentDay,
          spent_usd: this.#spentTodayUsd,
          entries: this.#entries.slice(-MAX_LEDGER_ENTRIES)
        }),
        "utf-8"
      );
      renameSync(tmp, this.ledgerPath);
    } catch {
      this.ledgerPath = null;
    }
  }
  /**
   * Interprocess exclusive lock around ledger load→check→update→persist.
   *
   * An in-process lock alone is not process-safe: two CLI/agent processes
   * can each load the same ledger, both pass the cap check, both pay, and
   * both write back — overshooting the daily cap. A `proper-lockfile`
   * sidecar (`<ledger>.lock`) serialises the whole critical section across
   * processes; paired with `reload=true` so the post-lock total is the
   * authoritative on-disk one.
   *
   * Returns a release function. No-op when there is no on-disk ledger (the
   * deployed runtime degrades to in-memory — a single process where JS's
   * run-to-completion suffices). Best effort: an uncreatable lockfile
   * degrades to in-process only, mirroring `#persist`'s degrade.
   */
  async #ledgerLock() {
    if (this.ledgerPath === null) return async () => {
    };
    try {
      mkdirSync(dirname(this.ledgerPath), { recursive: true });
      return await lockfile.lock(this.ledgerPath, {
        realpath: false,
        // the ledger may not exist yet
        retries: { retries: 30, factor: 1.5, minTimeout: 20, maxTimeout: 500 },
        stale: 3e4
      });
    } catch {
      return async () => {
      };
    }
  }
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
  async reserveUsd(amountUsd, now, recordOp) {
    let amt;
    try {
      amt = parseNonNegativeNumber(amountUsd, "payment amount");
    } catch (error) {
      throw new X402BudgetExhaustedError(String(error));
    }
    const release = await this.#ledgerLock();
    try {
      this.#maybeReset(now, true);
      if (this.#spentTodayUsd + amt > this.dailyCapUsd) {
        throw new X402BudgetExhaustedError(
          `$${amt.toFixed(2)} would exceed daily cap (spent $${this.#spentTodayUsd.toFixed(2)} / cap $${this.dailyCapUsd.toFixed(2)})`
        );
      }
      this.#spentTodayUsd += amt;
      if (recordOp !== void 0) {
        this.#pushEntry({
          ts: (now ?? /* @__PURE__ */ new Date()).toISOString(),
          op: recordOp,
          amount_usd: amt
        });
      }
      this.#persist();
    } finally {
      await release();
    }
  }
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
  async recordEntry(entry) {
    const release = await this.#ledgerLock();
    try {
      this.#maybeReset(null, true);
      this.#pushEntry(entry);
      this.#persist();
    } finally {
      await release();
    }
  }
  /** Fresh snapshot of the persisted entries (reloaded when on-disk). */
  async listEntries() {
    const release = await this.#ledgerLock();
    try {
      this.#maybeReset(null, true);
      return [...this.#entries];
    } finally {
      await release();
    }
  }
  #pushEntry(entry) {
    this.#entries.push(parseLedgerEntry(entry, "ledger entry"));
    if (this.#entries.length > MAX_LEDGER_ENTRIES) {
      this.#entries = this.#entries.slice(-MAX_LEDGER_ENTRIES);
    }
  }
  /**
   * Release a reservation. Floors at zero. Never throws (past the lock).
   *
   * Day bucket is not reset here on purpose — rolling back after a UTC
   * rollover would otherwise zero a fresh bucket spuriously.
   */
  async rollbackUsd(amountUsd, now) {
    let amt;
    try {
      amt = parseNonNegativeNumber(amountUsd, "payment amount");
    } catch (error) {
      throw new X402BudgetExhaustedError(String(error));
    }
    const release = await this.#ledgerLock();
    try {
      this.#maybeReset(now, true);
      this.#spentTodayUsd = Math.max(0, this.#spentTodayUsd - amt);
      this.#persist();
    } finally {
      await release();
    }
  }
  // ── Legacy non-atomic API (kept for back-compat) ──────────────────
  totalTodayUsd(now) {
    this.#maybeReset(now);
    return this.#spentTodayUsd;
  }
  /**
   * Race-unsafe when paired with a separate `recordTopup`. Use
   * {@link reserveUsd} for atomic check + increment in concurrent code.
   */
  wouldExceed(amountUsd, now) {
    const amt = parseNonNegativeNumber(amountUsd, "payment amount");
    this.#maybeReset(now);
    return this.#spentTodayUsd + amt > this.dailyCapUsd;
  }
  /**
   * Race-unsafe when paired with a separate `wouldExceed`. Use
   * {@link reserveUsd} for atomic check + increment in concurrent code.
   */
  recordTopup(amountUsd, now) {
    const amt = parseNonNegativeNumber(amountUsd, "payment amount");
    this.#maybeReset(now);
    this.#spentTodayUsd += amt;
    this.#pushEntry({
      ts: (now ?? /* @__PURE__ */ new Date()).toISOString(),
      op: "topup",
      amount_usd: amt
    });
    this.#persist();
  }
};
var ALLOWED_HOSTS_PIEVERSE_PROFILE = /* @__PURE__ */ new Set([
  "llm.pieverse.io"
]);
var ALLOWED_HOSTS_CMC_PROFILE = /* @__PURE__ */ new Set([
  "pro-api.coinmarketcap.com"
]);
function merchantPinnedAssets(merchant) {
  if (merchant === null) return null;
  if (merchant.assetPinUnreadable === true) return [];
  const legacy = merchant.asset?.trim();
  const set = merchant.assets?.filter((entry) => entry.trim().length > 0) ?? [];
  if (set.length === 0) return legacy ? [legacy] : null;
  if (legacy) {
    console.warn(
      `[payments.x402.merchants.${merchant.name}] has both asset and assets; using assets and ignoring asset \u2014 delete the asset line`
    );
  }
  return set;
}
function canonicalMerchantDomain(value) {
  const domain = value.trim().toLowerCase();
  return domain.endsWith(".") ? domain.slice(0, -1) : domain;
}
function parseMerchantAssetPin(rec, name) {
  const unreadable = (key, why) => {
    console.warn(
      `[payments.x402.merchants.${name}].${key} is unreadable (${why}); this merchant is refused until it is fixed or removed`
    );
    return { assetPinUnreadable: true };
  };
  const usable = (value) => typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  const pin = {};
  if (rec.asset !== void 0 && rec.asset !== null) {
    const asset = usable(rec.asset);
    if (asset === null) {
      return unreadable("asset", "expected a non-empty token address");
    }
    pin.asset = asset;
  }
  if (rec.assets !== void 0 && rec.assets !== null) {
    if (!Array.isArray(rec.assets)) {
      return unreadable("assets", "expected a list of token addresses");
    }
    if (rec.assets.length === 0) {
      return unreadable("assets", "the list is empty, so it permits nothing");
    }
    const assets = [];
    for (const entry of rec.assets) {
      const address = usable(entry);
      if (address === null) {
        return unreadable(
          "assets",
          "one entry is not a non-empty token address"
        );
      }
      assets.push(address);
    }
    pin.assets = Object.freeze(assets);
  }
  return pin;
}
function parseMerchants(x402Cfg) {
  const raw = x402Cfg.merchants;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return [];
  const merchants = [];
  for (const [name, entry] of Object.entries(raw)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }
    const rec = entry;
    const domain = canonicalMerchantDomain(String(rec.domain ?? ""));
    const payTo = String(rec.pay_to ?? "").trim();
    if (!domain || !payTo) {
      console.warn(
        `[payments.x402.merchants.${name}] ignored: needs both domain and pay_to`
      );
      continue;
    }
    const cap = rec.per_call_cap_usd;
    merchants.push(
      Object.freeze({
        name: String(name),
        domain,
        payTo,
        perCallCapUsd: cap !== void 0 && cap !== null ? parseNonNegativeNumber(
          cap,
          `payments.x402.merchants.${name}.per_call_cap_usd`
        ) : null,
        verified: Boolean(rec.verified ?? false),
        ...parseMerchantAssetPin(rec, name)
      })
    );
  }
  return merchants;
}
var X402BuyerPolicy = class _X402BuyerPolicy {
  maxPerRequestUsd;
  dailyCapUsd;
  allowedHosts;
  /**
   * Paid-retry budget. After signing X-PAYMENT, the buyer may need to retry
   * the same request a few times because the facilitator hasn't indexed the
   * tx yet. Exponential backoff: attempt `n` sleeps
   * `baseDelaySeconds * 2**n` before the next try.
   */
  maxRetries;
  baseDelaySeconds;
  /** Trusted merchants from `[payments.x402.merchants.*]` (bag x402 trust). */
  merchants;
  constructor(fields = {}) {
    this.maxPerRequestUsd = parseNonNegativeNumber(
      fields.maxPerRequestUsd ?? 1,
      "maxPerRequestUsd"
    );
    this.dailyCapUsd = parseNonNegativeNumber(
      fields.dailyCapUsd ?? 20,
      "dailyCapUsd"
    );
    this.allowedHosts = Object.freeze([...fields.allowedHosts ?? []]);
    this.maxRetries = parseIntegerAtLeast(
      fields.maxRetries ?? 3,
      "maxRetries",
      1
    );
    this.baseDelaySeconds = parseNonNegativeNumber(
      fields.baseDelaySeconds ?? 1,
      "baseDelaySeconds"
    );
    this.merchants = Object.freeze([...fields.merchants ?? []]);
    Object.freeze(this);
  }
  /**
   * `allowedHosts` plus every trusted merchant's domain (deduped).
   *
   * Trusting a merchant implies allowing its host — callers that gate on
   * the host allowlist (CLI, the x402-buyer recipe tool) should use this
   * instead of `allowedHosts` so users don't have to list a domain twice.
   */
  get effectiveAllowedHosts() {
    const seen = new Set(this.allowedHosts.map((h) => h.toLowerCase()));
    const extra = this.merchants.filter((m) => !seen.has(m.domain)).map((m) => m.domain);
    return [...this.allowedHosts, ...extra];
  }
  /** Look up a trusted merchant by URL host (case-insensitive). */
  merchantForHost(host) {
    if (!host) return null;
    const needle = canonicalMerchantDomain(host);
    return this.merchants.find((m) => m.domain === needle) ?? null;
  }
  // ── Named profiles ─────────────────────────────
  /** Policy scoped to `llm.pieverse.io` only. */
  static pieverseDefault() {
    return new _X402BuyerPolicy({
      allowedHosts: [...ALLOWED_HOSTS_PIEVERSE_PROFILE]
    });
  }
  /** Policy scoped to CoinMarketCap's x402 host only. */
  static cmcDefault() {
    return new _X402BuyerPolicy({
      allowedHosts: [...ALLOWED_HOSTS_CMC_PROFILE]
    });
  }
  /** Combine multiple host profiles into one allowlist. */
  static combined(...profiles) {
    const hosts = /* @__PURE__ */ new Set();
    for (const p of profiles) {
      for (const h of p) hosts.add(h);
    }
    return new _X402BuyerPolicy({ allowedHosts: [...hosts].sort() });
  }
  /**
   * Build a policy from a parsed `studio.toml` object (or null).
   *
   * Reads `cfg.payments.x402`. Missing fields fall back to the defaults.
   * Unknown keys are silently ignored so future versions can add fields
   * without breaking older installs.
   */
  static fromToml(cfg) {
    if (!cfg) return new _X402BuyerPolicy();
    const payments = cfg.payments ?? {};
    const x402Cfg = payments.x402 ?? {};
    if (Object.keys(x402Cfg).length === 0) return new _X402BuyerPolicy();
    const allowed = x402Cfg.allowed_hosts;
    const allowedHosts = Array.isArray(allowed) ? allowed.map((h) => String(h).toLowerCase()) : void 0;
    return new _X402BuyerPolicy({
      ...x402Cfg.max_per_request_usd !== void 0 ? {
        maxPerRequestUsd: parseNonNegativeNumber(
          x402Cfg.max_per_request_usd,
          "payments.x402.max_per_request_usd"
        )
      } : {},
      ...x402Cfg.daily_cap_usd !== void 0 ? {
        dailyCapUsd: parseNonNegativeNumber(
          x402Cfg.daily_cap_usd,
          "payments.x402.daily_cap_usd"
        )
      } : {},
      ...allowedHosts !== void 0 ? { allowedHosts } : {},
      ...x402Cfg.max_retries !== void 0 ? {
        maxRetries: parseIntegerAtLeast(
          x402Cfg.max_retries,
          "payments.x402.max_retries",
          1
        )
      } : {},
      ...x402Cfg.base_delay_seconds !== void 0 ? {
        baseDelaySeconds: parseNonNegativeNumber(
          x402Cfg.base_delay_seconds,
          "payments.x402.base_delay_seconds"
        )
      } : {},
      merchants: parseMerchants(x402Cfg)
    });
  }
};
function resolveDailyCapUsd(cfg) {
  if (typeof cfg === "object" && cfg !== null) {
    const budgetCfg = cfg.budget ?? {};
    const unified = budgetCfg.max_per_day_usd;
    if (unified !== void 0 && unified !== null) {
      return parseNonNegativeNumber(unified, "budget.max_per_day_usd");
    }
    const payments = cfg.payments ?? {};
    const x402Cfg = payments.x402 ?? {};
    const legacy = x402Cfg.daily_cap_usd;
    if (legacy !== void 0 && legacy !== null) {
      console.warn(
        "[payments.x402].daily_cap_usd is deprecated \u2014 move the value to [budget].max_per_day_usd (the unified daily cap shared with the Pieverse auto-topup gate)."
      );
      return parseNonNegativeNumber(legacy, "payments.x402.daily_cap_usd");
    }
  }
  return DEFAULT_BUYER_DAILY_CAP_USD;
}
var sharedTrackers = /* @__PURE__ */ new Map();
function canonicalProjectRoot(projectRoot) {
  if (projectRoot === null) return null;
  const lexicalRoot = resolve(projectRoot);
  const absentSuffix = [];
  let existingCandidate = lexicalRoot;
  while (true) {
    try {
      lstatSync(existingCandidate);
      break;
    } catch (cause) {
      if (cause.code !== "ENOENT") {
        throw cause;
      }
      const parent = dirname(existingCandidate);
      if (parent === existingCandidate) {
        throw cause;
      }
      absentSuffix.unshift(basename(existingCandidate));
      existingCandidate = parent;
    }
  }
  const physicalCandidate = realpathSync.native(existingCandidate);
  if (!statSync(physicalCandidate).isDirectory()) {
    throw new TypeError(
      `projectRoot must resolve to a directory: ${lexicalRoot}`
    );
  }
  return join(physicalCandidate, ...absentSuffix);
}
function canonicalTrackerSnapshot(snapshot) {
  const dailyCapUsd = parseNonNegativeNumber(
    snapshot.dailyCapUsd,
    "dailyCapUsd"
  );
  const projectRoot = canonicalProjectRoot(snapshot.projectRoot);
  return Object.freeze({
    dailyCapUsd,
    projectRoot,
    // JSON array encoding is unambiguous for null/string roots and preserves
    // numeric cap semantics (for example, 1 and 1.0 share intentionally).
    key: JSON.stringify([projectRoot, dailyCapUsd])
  });
}
function getSharedBudgetTracker(snapshot) {
  let source = snapshot;
  if (source === void 0) {
    let cfg;
    let projectRoot;
    try {
      cfg = loadStudioToml();
      projectRoot = findProjectRoot();
    } catch {
      cfg = null;
      projectRoot = null;
    }
    source = {
      dailyCapUsd: resolveDailyCapUsd(cfg),
      projectRoot
    };
  }
  const canonical = canonicalTrackerSnapshot(source);
  const existing = sharedTrackers.get(canonical.key);
  if (existing !== void 0) return existing;
  const ledger = canonical.projectRoot !== null ? join(canonical.projectRoot, ".studio", "spend-ledger.json") : null;
  const tracker = new BudgetTracker({
    dailyCapUsd: canonical.dailyCapUsd,
    ledgerPath: ledger
  });
  sharedTrackers.set(canonical.key, tracker);
  return tracker;
}
function _resetSharedBudgetTracker() {
  sharedTrackers.clear();
}

export {
  parseNonNegativeNumber,
  parseIntegerAtLeast,
  parseBoolean,
  X402Error,
  X402AuthError,
  X402BudgetExhaustedError,
  X402PaymentRequiredError,
  X402AssetMismatchError,
  X402HostNotAllowedError,
  X402RecipientRequiredError,
  X402UnsupportedWalletError,
  X402PaymentAssetUnavailableError,
  X402UnsupportedWalletRouteError,
  X402PaymentAssetBalanceUnavailableError,
  X402InsufficientPaymentAssetBalanceError,
  X402InsufficientPaymentAssetAllowanceError,
  X402PaymentOutcomeUnknownError,
  X402RetryExhaustedError,
  X402SellerConfigError,
  BudgetTracker,
  ALLOWED_HOSTS_PIEVERSE_PROFILE,
  ALLOWED_HOSTS_CMC_PROFILE,
  merchantPinnedAssets,
  X402BuyerPolicy,
  resolveDailyCapUsd,
  getSharedBudgetTracker,
  _resetSharedBudgetTracker
};
