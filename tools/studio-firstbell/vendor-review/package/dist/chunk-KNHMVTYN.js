import {
  auditedOp
} from "./chunk-7LTTKMY5.js";
import {
  PIEVERSE_BASE_URL,
  PIEVERSE_TOPUP_PATH,
  PieverseAccountBalanceExhaustedError,
  PieverseAuthError,
  PieverseBudgetNotAcknowledgedError,
  PieverseColdStartTopupBlockedError,
  PieverseError,
  PieverseKeyNotFoundError,
  PieverseTopupCapExceededError,
  PieverseTopupWalletPasswordMissingError,
  _fetchPieverseTopup,
  _parseAccepted,
  _raiseForStatus,
  dailyCapCountedElsewhere,
  makeClient,
  payChallenge,
  quoteUrl,
  request
} from "./chunk-ZWCUOUCH.js";
import {
  parseBoolean,
  parseIntegerAtLeast,
  parseNonNegativeNumber
} from "./chunk-JOGM5MYC.js";
import {
  getNetwork
} from "./chunk-YQUACLG3.js";
import {
  loadStudioToml
} from "./chunk-AHE5Y6SQ.js";

// src/pieverse/keys.ts
var ALLOCATION_NOT_READY_MARKER = "InvalidAllocationError";
var BALANCE_FIELD_CANDIDATES = [
  "balance_usd",
  "remaining_usd",
  "remaining",
  "balance"
];
function extractBalance(raw) {
  for (const field of BALANCE_FIELD_CANDIDATES) {
    if (field in raw) {
      const v = Number(raw[field]);
      if (!Number.isNaN(v)) return v;
    }
  }
  return null;
}
function jsonOrThrow(resp, what) {
  try {
    return resp.json();
  } catch (e) {
    throw new PieverseError(
      `Pieverse ${what} returned non-JSON: ${resp.text.slice(0, 200)}`,
      { cause: e }
    );
  }
}
async function createKey(sessionToken, name, opts = {}) {
  const {
    initialAllocationUsd = 0,
    wallet = null,
    networkName = null,
    httpClient = null
  } = opts;
  const client = makeClient(httpClient);
  const body = { name, initial_allocation_usd: initialAllocationUsd };
  const initial = await request(client, "POST", "/v1/me/keys", {
    sessionToken,
    json: body,
    raiseOnError: false
  });
  let resp;
  if (initial.statusCode === 402) {
    let challenge;
    try {
      challenge = initial.json();
    } catch (e) {
      throw new PieverseError(
        `Pieverse 402 had non-JSON body: ${initial.text.slice(0, 200)}`,
        { cause: e }
      );
    }
    if (wallet === null) {
      throw new PieverseError(
        "Pieverse create-key requires payment (402) but no wallet was supplied."
      );
    }
    const { header } = await payChallenge(challenge, {
      wallet,
      ...networkName !== null ? { networkName } : {},
      maxUsd: Number(initialAllocationUsd),
      resourceUrl: `${PIEVERSE_BASE_URL}/v1/me/keys`
    });
    resp = await request(client, "POST", "/v1/me/keys", {
      sessionToken,
      json: body,
      headers: { "X-PAYMENT": header }
    });
  } else {
    _raiseForStatus(initial);
    resp = initial;
  }
  const payload = jsonOrThrow(resp, "create-key");
  if (!("key" in payload) || !("hash" in payload)) {
    throw new PieverseError(
      `Pieverse create-key missing 'key' or 'hash': ${JSON.stringify(payload)}`
    );
  }
  return payload;
}
async function inspectKey(sessionToken, keyHash, opts = {}) {
  const client = makeClient(opts.httpClient);
  const listResp = await request(client, "GET", "/v1/me/keys", {
    sessionToken
  });
  let listing;
  try {
    listing = listResp.json();
  } catch (e) {
    throw new PieverseError(
      `Pieverse list-keys returned non-JSON: ${listResp.text.slice(0, 200)}`,
      { cause: e }
    );
  }
  let items;
  if (typeof listing === "object" && listing !== null && !Array.isArray(listing)) {
    const rec = listing;
    items = rec.keys ?? rec.data;
  } else {
    items = listing;
  }
  if (!Array.isArray(items)) {
    throw new PieverseError(
      `Pieverse list-keys had unexpected shape: ${JSON.stringify(listing)}`
    );
  }
  const match = items.find(
    (e) => typeof e === "object" && e !== null && e.hash === keyHash
  );
  if (match === void 0) {
    throw new PieverseKeyNotFoundError(keyHash);
  }
  return {
    hash: match.hash ?? keyHash,
    remaining_usd: extractBalance(match),
    raw: match
  };
}
async function allocate(sessionToken, keyHash, amountUsd, opts = {}) {
  const client = makeClient(opts.httpClient);
  const resp = await request(
    client,
    "POST",
    `/v1/me/keys/${keyHash}/allocate`,
    {
      sessionToken,
      json: { amount_usd: amountUsd }
    }
  );
  return jsonOrThrow(resp, "allocate");
}
var defaultRetrySleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
async function allocateWithSettleRetry(sessionToken, keyHash, amountUsd, opts = {}) {
  const {
    httpClient = null,
    attempts = 6,
    baseDelaySeconds = 1,
    maxDelaySeconds = 8,
    sleep = defaultRetrySleep
  } = opts;
  let lastExc = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await allocate(sessionToken, keyHash, amountUsd, { httpClient });
    } catch (exc) {
      if (!(exc instanceof PieverseError) || !String(exc.message).includes(ALLOCATION_NOT_READY_MARKER)) {
        throw exc;
      }
      lastExc = exc;
      if (attempt === attempts - 1) break;
      const delay = Math.min(
        baseDelaySeconds * 1.5 ** attempt,
        maxDelaySeconds
      );
      console.log(
        `allocate not ready (deposit scanner lag); retry ${attempt + 1}/${attempts - 1} in ${delay.toFixed(1)}s`
      );
      await sleep(delay);
    }
  }
  throw new PieverseError(
    `allocate still failing after ${attempts} attempts \u2014 the topup may not have settled on-chain yet. Retry shortly with \`bag llm allocate --amount ${amountUsd}\`. Last error: ${lastExc?.message}`,
    { cause: lastExc }
  );
}
async function getAccountUsage(sessionToken, opts = {}) {
  const { days = 7, httpClient = null } = opts;
  const client = makeClient(httpClient);
  const resp = await request(
    client,
    "GET",
    `/v1/me/usage?days=${Math.trunc(days)}`,
    { sessionToken }
  );
  let raw;
  try {
    raw = resp.json();
  } catch (e) {
    throw new PieverseError(
      `Pieverse /v1/me/usage returned non-JSON: ${resp.text.slice(0, 200)}`,
      { cause: e }
    );
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new PieverseError(
      `Pieverse /v1/me/usage had unexpected shape: ${JSON.stringify(raw)}`
    );
  }
  const rec = raw;
  const maybeFloat = (v) => {
    if (v === null || v === void 0) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const maybeInt = (v) => {
    const n = maybeFloat(v);
    return n === null ? null : Math.trunc(n);
  };
  return {
    total_cost_usd: maybeFloat(rec.total_cost_usd),
    prompt_tokens: maybeInt(rec.prompt_tokens),
    completion_tokens: maybeInt(rec.completion_tokens)
  };
}

// src/pieverse/policy.ts
var COLD_START_ENV_VAR = "PIEVERSE_BUDGET_COLD_START_SECONDS";
var PieversePolicy = class _PieversePolicy {
  enabled;
  minBalanceUsd;
  topupChunkUsd;
  maxTopupPerDayUsd;
  checkIntervalSeconds;
  constructor(fields = {}) {
    this.enabled = fields.enabled ?? true;
    this.minBalanceUsd = parseNonNegativeNumber(
      fields.minBalanceUsd ?? 0.2,
      "minBalanceUsd"
    );
    this.topupChunkUsd = parseNonNegativeNumber(
      fields.topupChunkUsd ?? 1,
      "topupChunkUsd"
    );
    this.maxTopupPerDayUsd = parseNonNegativeNumber(
      fields.maxTopupPerDayUsd ?? 3,
      "maxTopupPerDayUsd"
    );
    this.checkIntervalSeconds = parseIntegerAtLeast(
      fields.checkIntervalSeconds ?? 60,
      "checkIntervalSeconds",
      1
    );
    Object.freeze(this);
  }
  /**
   * Build a policy from a `[llm.auto_renew]` table (or null).
   *
   * Missing fields fall back to the defaults. Unknown keys are silently
   * ignored so future versions can add fields without breaking older
   * installs.
   */
  static fromToml(cfg) {
    if (!cfg || Object.keys(cfg).length === 0) return new _PieversePolicy();
    return new _PieversePolicy({
      ...cfg.enabled !== void 0 ? { enabled: parseBoolean(cfg.enabled, "llm.auto_renew.enabled") } : {},
      ...cfg.min_balance_usd !== void 0 ? {
        minBalanceUsd: parseNonNegativeNumber(
          cfg.min_balance_usd,
          "llm.auto_renew.min_balance_usd"
        )
      } : {},
      ...cfg.topup_chunk_usd !== void 0 ? {
        topupChunkUsd: parseNonNegativeNumber(
          cfg.topup_chunk_usd,
          "llm.auto_renew.topup_chunk_usd"
        )
      } : {},
      ...cfg.max_topup_per_day_usd !== void 0 ? {
        maxTopupPerDayUsd: parseNonNegativeNumber(
          cfg.max_topup_per_day_usd,
          "llm.auto_renew.max_topup_per_day_usd"
        )
      } : {},
      ...cfg.check_interval_seconds !== void 0 ? {
        checkIntervalSeconds: parseIntegerAtLeast(
          cfg.check_interval_seconds,
          "llm.auto_renew.check_interval_seconds",
          1
        )
      } : {}
    });
  }
};
function readColdStartOverride(defaultSeconds) {
  const raw = process.env[COLD_START_ENV_VAR];
  if (raw === void 0) return defaultSeconds;
  const v = Number(raw);
  if (!Number.isInteger(v) || v < 0) return defaultSeconds;
  return v;
}
var DEFAULT_COLD_START_SECONDS = 60;
var BudgetPolicy = class _BudgetPolicy {
  enabled;
  maxPerTopupUsd;
  maxPerDayUsd;
  maxPerMonthUsd;
  minBalanceUsd;
  coldStartSeconds;
  /**
   * T37.7: ISO-8601 UTC timestamp marking when the user explicitly
   * acknowledged auto-topup terms. Required when enabled=true — the gate
   * refuses to topup if enabled but unacknowledged (defensive default
   * against someone hand-editing studio.toml to set enabled=true).
   */
  acknowledgedAt;
  constructor(fields = {}) {
    this.enabled = fields.enabled ?? false;
    this.maxPerTopupUsd = parseNonNegativeNumber(
      fields.maxPerTopupUsd ?? 1,
      "maxPerTopupUsd"
    );
    this.maxPerDayUsd = parseNonNegativeNumber(
      fields.maxPerDayUsd ?? 3,
      "maxPerDayUsd"
    );
    this.maxPerMonthUsd = parseNonNegativeNumber(
      fields.maxPerMonthUsd ?? 15,
      "maxPerMonthUsd"
    );
    this.minBalanceUsd = parseNonNegativeNumber(
      fields.minBalanceUsd ?? 0.2,
      "minBalanceUsd"
    );
    this.coldStartSeconds = parseIntegerAtLeast(
      fields.coldStartSeconds ?? DEFAULT_COLD_START_SECONDS,
      "coldStartSeconds",
      0
    );
    this.acknowledgedAt = fields.acknowledgedAt ?? null;
    Object.freeze(this);
  }
  /**
   * Build a policy from a `[budget]` table (or null → defaults).
   *
   * `coldStartSeconds` honours the `PIEVERSE_BUDGET_COLD_START_SECONDS`
   * env override even when the toml supplies an explicit value — the env
   * wins. This is intentional: CI must be able to disable the gate without
   * editing the project's toml.
   */
  static fromToml(cfg) {
    if (!cfg || Object.keys(cfg).length === 0) {
      return new _BudgetPolicy({
        coldStartSeconds: readColdStartOverride(DEFAULT_COLD_START_SECONDS)
      });
    }
    const baseCold = cfg.cold_start_seconds !== void 0 ? parseIntegerAtLeast(
      cfg.cold_start_seconds,
      "budget.cold_start_seconds",
      0
    ) : DEFAULT_COLD_START_SECONDS;
    const ack = cfg.acknowledged_at;
    return new _BudgetPolicy({
      ...cfg.enabled !== void 0 ? { enabled: parseBoolean(cfg.enabled, "budget.enabled") } : {},
      ...cfg.max_per_topup_usd !== void 0 ? {
        maxPerTopupUsd: parseNonNegativeNumber(
          cfg.max_per_topup_usd,
          "budget.max_per_topup_usd"
        )
      } : {},
      ...cfg.max_per_day_usd !== void 0 ? {
        maxPerDayUsd: parseNonNegativeNumber(
          cfg.max_per_day_usd,
          "budget.max_per_day_usd"
        )
      } : {},
      ...cfg.max_per_month_usd !== void 0 ? {
        maxPerMonthUsd: parseNonNegativeNumber(
          cfg.max_per_month_usd,
          "budget.max_per_month_usd"
        )
      } : {},
      ...cfg.min_balance_usd !== void 0 ? {
        minBalanceUsd: parseNonNegativeNumber(
          cfg.min_balance_usd,
          "budget.min_balance_usd"
        )
      } : {},
      coldStartSeconds: readColdStartOverride(baseCold),
      acknowledgedAt: ack ? String(ack) : null
    });
  }
};
function monotonicSeconds() {
  return performance.now() / 1e3;
}
function utcDay(now) {
  return now.toISOString().slice(0, 10);
}
function utcMonth(now) {
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
}
var BudgetGate = class {
  policy;
  /** Monotonic seconds at construction. Public so tests can rewind the
   * cold-start window (mirrors the Python tests' `_process_start_monotonic`
   * rewind). */
  _processStartMonotonic;
  _currentDay = null;
  _spentTodayUsd = 0;
  _currentMonth = null;
  _spentThisMonthUsd = 0;
  constructor(opts) {
    this.policy = opts.policy;
    this._processStartMonotonic = monotonicSeconds();
  }
  #maybeReset(now) {
    const today = utcDay(now);
    if (this._currentDay !== today) {
      this._currentDay = today;
      this._spentTodayUsd = 0;
    }
    const month = utcMonth(now);
    if (this._currentMonth !== month) {
      this._currentMonth = month;
      this._spentThisMonthUsd = 0;
    }
  }
  #secondsIntoProcess() {
    return monotonicSeconds() - this._processStartMonotonic;
  }
  /**
   * Run gates 1-5; throw the matching error on first failure.
   *
   * Does NOT reserve. Pair with {@link reserve} after the upstream
   * topupX402 call returns success.
   */
  checkCanTopup(amountUsd, opts) {
    if (!this.policy.enabled) {
      throw new PieverseTopupCapExceededError(
        "auto-topup is disabled; run `bag budget enable` to opt in"
      );
    }
    if (this.policy.acknowledgedAt === null) {
      throw new PieverseBudgetNotAcknowledgedError(
        "auto-topup is enabled but never explicitly acknowledged. Run `bag budget enable` to record an acknowledged_at timestamp, or set enabled=false in studio.toml. This defends against hand-edits to enabled=true."
      );
    }
    if (!opts.hasWalletPassword) {
      throw new PieverseTopupWalletPasswordMissingError(
        "WALLET_PASSWORD env is missing; auto-topup needs an unlocked keystore to sign EIP-3009. Set it in .env.local and reload the shell, or topup manually with `bag llm topup --amount N`."
      );
    }
    let amt;
    try {
      amt = parseNonNegativeNumber(amountUsd, "topup amount");
    } catch (error) {
      throw new PieverseTopupCapExceededError(String(error));
    }
    if (amt > this.policy.maxPerTopupUsd) {
      throw new PieverseTopupCapExceededError(
        `$${amt.toFixed(2)} exceeds per-topup cap $${this.policy.maxPerTopupUsd.toFixed(2)}`
      );
    }
    const elapsed = this.#secondsIntoProcess();
    if (elapsed < this.policy.coldStartSeconds) {
      const remaining = Math.trunc(this.policy.coldStartSeconds - elapsed) + 1;
      throw new PieverseColdStartTopupBlockedError(
        `auto-topup blocked during cold-start window (${elapsed.toFixed(0)}s / ${this.policy.coldStartSeconds}s); retry in ~${remaining}s`
      );
    }
    const ts = opts.now ?? /* @__PURE__ */ new Date();
    this.#maybeReset(ts);
    if (this._spentTodayUsd + amt > this.policy.maxPerDayUsd) {
      throw new PieverseTopupCapExceededError(
        `$${amt.toFixed(2)} would exceed daily cap (spent $${this._spentTodayUsd.toFixed(2)} / cap $${this.policy.maxPerDayUsd.toFixed(2)})`
      );
    }
    if (this._spentThisMonthUsd + amt > this.policy.maxPerMonthUsd) {
      throw new PieverseTopupCapExceededError(
        `$${amt.toFixed(2)} would exceed monthly cap (spent $${this._spentThisMonthUsd.toFixed(2)} / cap $${this.policy.maxPerMonthUsd.toFixed(2)})`
      );
    }
  }
  /**
   * Atomic check-and-commit. Use instead of {@link checkCanTopup} when the
   * caller wants the cap accounting to happen before the downstream spend;
   * pair with {@link rollback} on failure.
   */
  reserve(amountUsd, opts = {}) {
    let amt;
    try {
      amt = parseNonNegativeNumber(amountUsd, "topup amount");
    } catch (error) {
      throw new PieverseTopupCapExceededError(String(error));
    }
    const ts = opts.now ?? /* @__PURE__ */ new Date();
    const elapsed = this.#secondsIntoProcess();
    if (elapsed < this.policy.coldStartSeconds) {
      const remaining = Math.trunc(this.policy.coldStartSeconds - elapsed) + 1;
      throw new PieverseColdStartTopupBlockedError(
        `auto-topup blocked during cold-start window; retry in ~${remaining}s`
      );
    }
    this.#maybeReset(ts);
    if (this._spentTodayUsd + amt > this.policy.maxPerDayUsd) {
      throw new PieverseTopupCapExceededError(
        `$${amt.toFixed(2)} would exceed daily cap`
      );
    }
    if (this._spentThisMonthUsd + amt > this.policy.maxPerMonthUsd) {
      throw new PieverseTopupCapExceededError(
        `$${amt.toFixed(2)} would exceed monthly cap`
      );
    }
    this._spentTodayUsd += amt;
    this._spentThisMonthUsd += amt;
  }
  /** Release a reservation. Floors at zero. Invalid amounts fail closed. */
  rollback(amountUsd) {
    let amt;
    try {
      amt = parseNonNegativeNumber(amountUsd, "topup amount");
    } catch (error) {
      throw new PieverseTopupCapExceededError(String(error));
    }
    this._spentTodayUsd = Math.max(0, this._spentTodayUsd - amt);
    this._spentThisMonthUsd = Math.max(0, this._spentThisMonthUsd - amt);
  }
};

// src/pieverse/siwe.ts
var SIWE_DOMAIN = "llm.pieverse.io";
var SIWE_URI = "https://llm.pieverse.io";
var SIWE_STATEMENT = "Sign in to Pieverse AI Gateway";
var SIWE_CHAIN_ID = 56;
var SIWE_NONCE = /^[A-Za-z0-9]+$/u;
var ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;
function requireIsoTimestamp(field, value) {
  if (!ISO_TIMESTAMP.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new PieverseAuthError(
      `SIWE message safety check failed: ${field} must be an ISO timestamp`
    );
  }
}
function _buildSiweMessage(address, nonce, expiresAt, issuedAt) {
  const issued = issuedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  if (!SIWE_NONCE.test(nonce)) {
    throw new PieverseAuthError(
      "SIWE message safety check failed: nonce must be alphanumeric"
    );
  }
  requireIsoTimestamp("expiresAt", expiresAt);
  requireIsoTimestamp("issuedAt", issued);
  const message = `${SIWE_DOMAIN} wants you to sign in with your Ethereum account:
${address}

${SIWE_STATEMENT}

URI: ${SIWE_URI}
Version: 1
Chain ID: ${SIWE_CHAIN_ID}
Nonce: ${nonce}
Issued At: ${issued}
Expiration Time: ${expiresAt}`;
  if (message.includes("\nResources:") || message.startsWith("Resources:")) {
    throw new PieverseAuthError(
      "SIWE message safety check failed: 'Resources:' line forbidden (ReCap-scoped SIWE not permitted under the read-only signing boundary)"
    );
  }
  return message;
}
function signatureToHex(sig) {
  let s;
  if (typeof sig === "string") {
    s = sig;
  } else if (typeof sig === "object" && sig !== null && typeof sig.hex === "function") {
    s = String(sig.hex());
  } else {
    throw new PieverseAuthError(
      `Unexpected signature type from wallet: ${typeof sig}`
    );
  }
  return s.startsWith("0x") ? s : `0x${s}`;
}
async function siweLogin(wallet, opts = {}) {
  const client = makeClient(opts.httpClient);
  const challengeResp = await request(client, "POST", "/v1/auth/challenge");
  let challenge;
  try {
    challenge = challengeResp.json();
  } catch (e) {
    throw new PieverseAuthError(
      `Pieverse challenge returned non-JSON: ${challengeResp.text.slice(0, 200)}`,
      { cause: e }
    );
  }
  const nonce = challenge?.nonce;
  const expiresAt = challenge?.expires_at;
  if (nonce === void 0 || expiresAt === void 0) {
    const missing = nonce === void 0 ? "'nonce'" : "'expires_at'";
    throw new PieverseAuthError(
      `Pieverse challenge missing field ${missing}: ${JSON.stringify(challenge)}`
    );
  }
  const message = _buildSiweMessage(
    wallet.address,
    String(nonce),
    String(expiresAt)
  );
  const signed = await wallet.signMessage(message);
  if (typeof signed !== "object" || signed === null || !("signature" in signed)) {
    throw new PieverseAuthError(
      `wallet.sign_message must return a dict with a 'signature' key (got ${typeof signed})`
    );
  }
  const signatureHex = signatureToHex(
    signed.signature
  );
  const verifyResp = await request(client, "POST", "/v1/auth/verify", {
    json: { message, signature: signatureHex }
  });
  let body;
  try {
    body = verifyResp.json();
  } catch (e) {
    throw new PieverseAuthError(
      `Pieverse verify returned non-JSON: ${verifyResp.text.slice(0, 200)}`,
      { cause: e }
    );
  }
  const token = body?.session_token;
  if (!token) {
    throw new PieverseAuthError(
      `Pieverse verify did not return session_token: ${JSON.stringify(body)}`
    );
  }
  return String(token);
}

// src/pieverse/topup.ts
var PIEVERSE_ALLOWED_HOSTS = ["llm.pieverse.io"];
var defaultDeps = {
  fetchWithPayment: _fetchPieverseTopup,
  quoteUrl
};
var deps = defaultDeps;
function _setTopupDeps(overrides) {
  deps = overrides === null ? defaultDeps : { ...defaultDeps, ...overrides };
}
function supports(wallet, capability) {
  const fn = wallet?.supports;
  if (typeof fn !== "function") return true;
  return Boolean(fn.call(wallet, capability));
}
function topupBody(amountUsd, networkName) {
  const network = getNetwork(networkName);
  return {
    chainId: network.chainId,
    tokenAddress: network.token("U").address,
    amountUsd
  };
}
async function discoverTopupRecipient(sessionToken, amountUsd, networkName, opts = {}) {
  const network = getNetwork(networkName);
  const challenge = await deps.quoteUrl(
    `${PIEVERSE_BASE_URL}${PIEVERSE_TOPUP_PATH}`,
    {
      method: "POST",
      jsonBody: topupBody(amountUsd, networkName),
      headers: { Authorization: `Bearer ${sessionToken}` },
      allowedHosts: PIEVERSE_ALLOWED_HOSTS,
      ...opts.fetchImpl !== void 0 ? { fetchImpl: opts.fetchImpl } : {}
    }
  );
  const [accepted] = _parseAccepted(
    challenge,
    network.chainId,
    network.token("U").address
  );
  return String(accepted.payTo);
}
async function topupX402(sessionToken, amountUsd, wallet, networkName, opts = {}) {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new PieverseError("Topup amount must be a finite positive number.");
  }
  let recipient = (opts.expectedRecipient ?? "").trim();
  if (!recipient) {
    recipient = await discoverTopupRecipient(
      sessionToken,
      amountUsd,
      networkName,
      {
        ...opts.fetchImpl !== void 0 ? { fetchImpl: opts.fetchImpl } : {}
      }
    );
  }
  const paidHeaders = supports(wallet, "sign.typed_data") ? { Authorization: `Bearer ${sessionToken}` } : null;
  const result = await deps.fetchWithPayment(
    `${PIEVERSE_BASE_URL}${PIEVERSE_TOPUP_PATH}`,
    {
      maxUsd: amountUsd,
      wallet,
      expectedTo: recipient,
      networkName,
      method: "POST",
      jsonBody: topupBody(amountUsd, networkName),
      headers: paidHeaders,
      allowedHosts: PIEVERSE_ALLOWED_HOSTS,
      ...opts.fetchImpl !== void 0 ? { fetchImpl: opts.fetchImpl } : {}
    }
  );
  if (!(result.statusCode >= 200 && result.statusCode < 300)) {
    const body = result.json ?? result.content.toString("utf-8").slice(0, 200);
    throw new PieverseError(
      `Pieverse topup failed (status ${result.statusCode}): ${JSON.stringify(body)}`
    );
  }
  if (result.json === null) {
    throw new PieverseError(
      `Pieverse topup returned non-JSON (status ${result.statusCode}): ${JSON.stringify(result.content.toString("utf-8").slice(0, 200))}`
    );
  }
  return result.json;
}

// src/pieverse/creditEnsurer.ts
var defaultDeps2 = {
  allocate,
  allocateWithSettleRetry,
  topupX402,
  siweLogin,
  loadStudioToml
};
var deps2 = defaultDeps2;
function _setEnsurerDeps(overrides) {
  deps2 = overrides === null ? defaultDeps2 : { ...defaultDeps2, ...overrides };
}
function isInvalidAllocation(exc) {
  const msg = String(exc.message);
  return msg.includes("400") && msg.includes("InvalidAllocationError");
}
var PieverseCreditEnsurer = class {
  #modelId;
  #wallet;
  #keyHash;
  #networkName;
  #policy;
  #budgetPolicy;
  #client;
  #clock;
  // Test-visible state (mirrors the Python underscore attributes).
  _sessionToken;
  _lastCheckAt = null;
  _lastKnownBalance = null;
  _balanceUnknownWarned = false;
  /** BYOK owner-mismatch (negative cache): once the key is found to be owned
   * by a different wallet than this signer, the whole hook is disabled for the
   * process after one warning — never repeat the SIWE + list-keys roundtrip. */
  _ownerMismatch = false;
  /** Built iff the user opted in via `bag budget enable`. Carries
   * process-start time + day/month counters, so it is constructed once per
   * process — not per call. */
  _budgetGate;
  /** T37.8: process-local flag — emit the "AUTO-TOPUP ENABLED" banner only
   * on the FIRST successful topup of this process. */
  _firstTopupEmitted = false;
  // Promise-chain mutex — the asyncio.Lock stand-in.
  #renewLock = Promise.resolve();
  constructor(opts) {
    this.#modelId = opts.modelId;
    this.#wallet = opts.wallet;
    this.#keyHash = opts.keyHash;
    this.#networkName = opts.networkName;
    this.#policy = opts.policy;
    this.#budgetPolicy = opts.budgetPolicy ?? null;
    this._budgetGate = this.#budgetPolicy?.enabled ? new BudgetGate({ policy: this.#budgetPolicy }) : null;
    this.#client = opts.httpClient ?? null;
    this._sessionToken = opts.sessionToken ?? null;
    this.#clock = opts.clock ?? (() => Date.now() / 1e3);
  }
  // ------------------------------------------------------------------
  // opt-in auto-topup helpers
  // ------------------------------------------------------------------
  /**
   * `auto/free` (and any future $0/token model) never consumes credit; we
   * skip the auto-renew hook for it entirely. The model string carries the
   * LiteLLM prefix (e.g. `openai/auto/free`); substring match is
   * sufficient and survives future renames as long as the upstream id
   * remains `auto/free`.
   */
  #isFreeModel() {
    return (this.#modelId ?? "").includes("auto/free");
  }
  /**
   * Trusted x402 pay-to address from `[payments.x402].expected_recipient`.
   *
   * Read lazily from `studio.toml` at topup time (the ensurer is built
   * without this field). Returns `""` when unset — the topup path then
   * auto-discovers from the pinned Pieverse endpoint.
   */
  #expectedRecipient() {
    let cfg;
    try {
      cfg = deps2.loadStudioToml();
    } catch {
      return "";
    }
    const payments = cfg.payments ?? {};
    const x402Cfg = payments.x402 ?? {};
    return String(x402Cfg.expected_recipient ?? "").trim();
  }
  /**
   * Opt-in: spend wallet U via x402 to refill Account Balance.
   *
   * Six gates apply (see {@link BudgetGate}). Gate failures bubble up
   * unchanged so the caller can surface the specific reason. Topup
   * failures (network, chain, Pieverse) trigger a rollback so the cap
   * accounting stays accurate, then re-throw.
   *
   * The BudgetGate `reserve` below is the SINGLE daily counter for the
   * auto-topup path (it also enforces the monthly cap + cold-start). The
   * downstream `fetchWithPayment` is wrapped in
   * {@link dailyCapCountedElsewhere} so the unified x402 tracker does not
   * reserve the same dollar a second time (L4).
   *
   * Caller MUST hold the renew lock so the cap reservation and the
   * downstream topup form a serialised pair.
   */
  async #autoTopupFromWallet(amountUsd) {
    const gate = this._budgetGate;
    if (gate === null) {
      throw new Error("caller must check budget policy before invoking");
    }
    const hasPw = Boolean(process.env.WALLET_PASSWORD);
    gate.checkCanTopup(amountUsd, { hasWalletPassword: hasPw });
    const expectedRecipient = this.#expectedRecipient();
    gate.reserve(amountUsd);
    let mayHaveSettled = false;
    try {
      await auditedOp(
        "auto_topup",
        {
          actor: "agent",
          chainId: getNetwork(this.#networkName).chainId,
          asset: "U",
          amount: amountUsd.toFixed(2),
          agentAddr: this.#wallet.address,
          context: {
            key_hash_prefix: this.#keyHash.slice(0, 12),
            reason: "credit_below_min"
          }
        },
        async () => {
          await dailyCapCountedElsewhere(
            () => this.#withSiweRetry((token) => {
              mayHaveSettled = true;
              return deps2.topupX402(
                token,
                amountUsd,
                this.#wallet,
                this.#networkName,
                {
                  expectedRecipient
                }
              );
            })
          );
        }
      );
      console.warn(
        `auto-topup: spent $${amountUsd.toFixed(2)} wallet U via x402 (key=${this.#keyHash.slice(0, 12)}..., network=${this.#networkName})`
      );
      if (!this._firstTopupEmitted) {
        console.warn(
          "AUTO-TOPUP ENABLED \u2014 your agent just autonomously spent wallet U to refill Pieverse credits. To disable: bag budget disable"
        );
        this._firstTopupEmitted = true;
      }
    } catch (exc) {
      if (!mayHaveSettled) gate.rollback(amountUsd);
      throw exc;
    }
  }
  // ------------------------------------------------------------------
  // SIWE retry — stores the token on `this` so we don't re-SIWE on every
  // call.
  // ------------------------------------------------------------------
  async #withSiweRetry(call) {
    let token = this._sessionToken ?? await deps2.siweLogin(this.#wallet, { httpClient: this.#client });
    this._sessionToken = token;
    try {
      return await call(token);
    } catch (exc) {
      if (!(exc instanceof PieverseAuthError)) throw exc;
      console.log("Pieverse session token rejected; re-running SIWE login.");
      token = await deps2.siweLogin(this.#wallet, { httpClient: this.#client });
      this._sessionToken = token;
      return await call(token);
    }
  }
  #withLock(fn) {
    const prev = this.#renewLock;
    let release = () => {
    };
    this.#renewLock = new Promise((resolve) => {
      release = resolve;
    });
    return prev.then(async () => {
      try {
        return await fn();
      } finally {
        release();
      }
    });
  }
  #inspect() {
    return this.#withSiweRetry(
      (token) => inspectKey(token, this.#keyHash, { httpClient: this.#client })
    );
  }
  /**
   * BYOK owner-mismatch handling: the Pieverse key is owned by a different
   * wallet than this agent's signing wallet, so `GET /v1/me/keys` never lists
   * it and auto-renew cannot inspect or allocate it. Rather than failing every
   * LLM call, disable the hook for this process (negative cache) after one
   * actionable warning; inference still runs on the key's existing Bearer
   * credit, and a genuinely empty key surfaces as Pieverse's own 402 upstream.
   */
  #handleOwnerMismatch(exc) {
    this._ownerMismatch = true;
    console.warn(
      `Pieverse credit-ensure hook: key_hash ${exc.keyHash} is not owned by this agent's signing wallet (SIWE signer ${this.#wallet.address}). auto_renew can only inspect/allocate keys the signing wallet owns, so it is DISABLED for this session \u2014 the agent runs inference on the key's existing Bearer credit only. This is expected for BYOK (you set [llm.pieverse].key_hash to a key created by another wallet). To silence this, disable auto-renew (\`bag llm auto-renew llm off\`) and top the key up yourself in the Pieverse portal.`
    );
  }
  // ------------------------------------------------------------------
  // The hook itself.
  // ------------------------------------------------------------------
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
  async ensureCredits() {
    if (this.#isFreeModel()) return;
    if (this._ownerMismatch) return;
    await this.#withLock(async () => {
      const now = this.#clock();
      if (this._lastCheckAt !== null && now - this._lastCheckAt < this.#policy.checkIntervalSeconds && this._lastKnownBalance !== null && this._lastKnownBalance >= this.#policy.minBalanceUsd) {
        return;
      }
      let info;
      try {
        info = await this.#inspect();
      } catch (exc) {
        if (exc instanceof PieverseKeyNotFoundError) {
          this.#handleOwnerMismatch(exc);
          return;
        }
        throw exc;
      }
      this._lastKnownBalance = info.remaining_usd ?? null;
      this._lastCheckAt = now;
      if (this._lastKnownBalance === null) {
        if (!this._balanceUnknownWarned) {
          console.warn(
            "Pieverse inspect_key did not return a balance field; auto-renew will rely on upstream 402 responses."
          );
          this._balanceUnknownWarned = true;
        }
        return;
      }
      if (this._lastKnownBalance >= this.#policy.minBalanceUsd) return;
      const confirm = await this.#inspect();
      const confirmedBalance = confirm.remaining_usd ?? null;
      if (confirmedBalance !== null && confirmedBalance >= this.#policy.minBalanceUsd) {
        console.log(
          `Pieverse balance recovered to ${confirmedBalance.toFixed(2)} USD before spend (external topup detected); skipping auto-renew.`
        );
        this._lastKnownBalance = confirmedBalance;
        this._lastCheckAt = this.#clock();
        return;
      }
      const chunk = this.#policy.topupChunkUsd;
      console.log(
        `Pieverse key balance ${(confirmedBalance ?? -1).toFixed(2)} USD < threshold ${this.#policy.minBalanceUsd.toFixed(2)} USD (confirmed); allocating ${chunk.toFixed(2)} USD from Account Balance.`
      );
      try {
        await this.#withSiweRetry(
          (token) => deps2.allocate(token, this.#keyHash, chunk, {
            httpClient: this.#client
          })
        );
      } catch (exc) {
        if (!(exc instanceof PieverseError)) throw exc;
        if (!isInvalidAllocation(exc)) throw exc;
        if (this._budgetGate !== null && this.#budgetPolicy !== null) {
          const topupAmount = Math.min(
            chunk,
            this.#budgetPolicy.maxPerTopupUsd
          );
          try {
            await this.#autoTopupFromWallet(topupAmount);
          } catch (topupExc) {
            if (topupExc instanceof PieverseColdStartTopupBlockedError || topupExc instanceof PieverseTopupCapExceededError || topupExc instanceof PieverseTopupWalletPasswordMissingError) {
              throw topupExc;
            }
            if (topupExc instanceof PieverseError) {
              throw new PieverseAccountBalanceExhaustedError(
                `LLM credit unavailable \u2014 the agent cannot fund this call, so it cannot produce a quote.
  Cause: Pieverse key ${this.#keyHash.slice(0, 12)}\u2026 is below $${this.#policy.minBalanceUsd.toFixed(2)} credit and your Pieverse Account Balance could not cover it, so the agent tried to auto-topup $${topupAmount.toFixed(2)} from your wallet \u2014 but the topup failed: ${topupExc.message}
  Fix:   Check the topup error above (common causes: wallet U balance too low, or a BSC-mainnet RPC/gas problem). Then retry the call, or topup manually \u2014
             bag llm topup --amount ${topupAmount.toFixed(2)}`,
                { cause: topupExc }
              );
            }
            throw topupExc;
          }
          await this.#withSiweRetry(
            (token) => deps2.allocateWithSettleRetry(token, this.#keyHash, chunk, {
              httpClient: this.#client
            })
          );
        } else {
          const suggested = Math.max(Math.trunc(chunk * 2), 5);
          throw new PieverseAccountBalanceExhaustedError(
            `LLM credit unavailable \u2014 the agent cannot fund this call, so it cannot produce a quote.
  Cause: Pieverse key ${this.#keyHash.slice(0, 12)}\u2026 has under $${this.#policy.minBalanceUsd.toFixed(2)} credit, and your Pieverse Account Balance cannot cover a $${chunk.toFixed(2)} refill allocation.
  Fix:   Refill your Account Balance, then retry \u2014
             bag llm topup --amount ${suggested}
         Or let the agent auto-refill from your wallet (opt-in, spends real U):
             bag budget enable`,
            { cause: exc }
          );
        }
      }
      const info2 = await this.#inspect();
      if (info2.remaining_usd !== null && info2.remaining_usd !== void 0) {
        this._lastKnownBalance = info2.remaining_usd;
      }
      this._lastCheckAt = this.#clock();
    });
  }
};

// src/pieverse/models.ts
async function listModels(opts = {}) {
  const client = makeClient(opts.httpClient);
  const resp = await request(client, "GET", "/v1/models");
  let raw;
  try {
    raw = resp.json();
  } catch (e) {
    throw new PieverseError(
      `Pieverse /v1/models returned non-JSON: ${resp.text.slice(0, 200)}`,
      { cause: e }
    );
  }
  const data = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw.data : null;
  if (!Array.isArray(data)) {
    throw new PieverseError(
      `Pieverse /v1/models had unexpected shape: ${JSON.stringify(raw)}`
    );
  }
  const ids = [];
  for (const item of data) {
    if (typeof item === "object" && item !== null && typeof item.id === "string") {
      ids.push(item.id);
    }
  }
  return ids;
}

export {
  createKey,
  inspectKey,
  allocate,
  allocateWithSettleRetry,
  getAccountUsage,
  COLD_START_ENV_VAR,
  PieversePolicy,
  BudgetPolicy,
  BudgetGate,
  SIWE_DOMAIN,
  SIWE_URI,
  SIWE_STATEMENT,
  SIWE_CHAIN_ID,
  _buildSiweMessage,
  siweLogin,
  PIEVERSE_ALLOWED_HOSTS,
  _setTopupDeps,
  discoverTopupRecipient,
  topupX402,
  _setEnsurerDeps,
  PieverseCreditEnsurer,
  listModels
};
