"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/pieverse/index.ts
var pieverse_exports = {};
__export(pieverse_exports, {
  BudgetGate: () => BudgetGate,
  BudgetPolicy: () => BudgetPolicy,
  COLD_START_ENV_VAR: () => COLD_START_ENV_VAR,
  DEFAULT_TIMEOUT_SECONDS: () => DEFAULT_TIMEOUT_SECONDS,
  PIEVERSE_ALLOWED_HOSTS: () => PIEVERSE_ALLOWED_HOSTS,
  PIEVERSE_BASE_URL: () => PIEVERSE_BASE_URL,
  PIEVERSE_TOPUP_PATH: () => PIEVERSE_TOPUP_PATH,
  PieverseAccountBalanceExhaustedError: () => PieverseAccountBalanceExhaustedError,
  PieverseAuthError: () => PieverseAuthError,
  PieverseBudgetExhaustedError: () => PieverseBudgetExhaustedError,
  PieverseBudgetNotAcknowledgedError: () => PieverseBudgetNotAcknowledgedError,
  PieverseColdStartTopupBlockedError: () => PieverseColdStartTopupBlockedError,
  PieverseCreditEnsurer: () => PieverseCreditEnsurer,
  PieverseError: () => PieverseError,
  PieverseKeyNotFoundError: () => PieverseKeyNotFoundError,
  PieversePaymentRequiredError: () => PieversePaymentRequiredError,
  PieversePolicy: () => PieversePolicy,
  PieverseTopupCapExceededError: () => PieverseTopupCapExceededError,
  PieverseTopupWalletPasswordMissingError: () => PieverseTopupWalletPasswordMissingError,
  RetryPolicy: () => RetryPolicy,
  SIWE_CHAIN_ID: () => SIWE_CHAIN_ID,
  SIWE_DOMAIN: () => SIWE_DOMAIN,
  SIWE_STATEMENT: () => SIWE_STATEMENT,
  SIWE_URI: () => SIWE_URI,
  TopupBudgetTracker: () => BudgetTracker,
  _buildSiweMessage: () => _buildSiweMessage,
  _raiseForStatus: () => _raiseForStatus,
  _setEnsurerDeps: () => _setEnsurerDeps,
  _setTopupDeps: () => _setTopupDeps,
  allocate: () => allocate,
  allocateWithSettleRetry: () => allocateWithSettleRetry,
  createKey: () => createKey,
  discoverTopupRecipient: () => discoverTopupRecipient,
  getAccountUsage: () => getAccountUsage,
  inspectKey: () => inspectKey,
  listModels: () => listModels,
  makeClient: () => makeClient,
  request: () => request,
  retrying: () => retrying,
  siweLogin: () => siweLogin,
  topupX402: () => topupX402
});
module.exports = __toCommonJS(pieverse_exports);

// src/pieverse/client.ts
var import_node_async_hooks = require("async_hooks");
var PIEVERSE_BASE_URL = "https://llm.pieverse.io";
var PIEVERSE_TOPUP_PATH = "/v1/topup/x402";
var DEFAULT_TIMEOUT_SECONDS = 30;
var PieverseError = class extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseError";
  }
};
var PieverseAuthError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseAuthError";
  }
};
var PieverseKeyNotFoundError = class extends PieverseError {
  constructor(keyHash, message, opts) {
    super(message ?? `Pieverse key not found: ${keyHash}`, opts);
    this.keyHash = keyHash;
    this.name = "PieverseKeyNotFoundError";
  }
  keyHash;
};
var PieverseBudgetExhaustedError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseBudgetExhaustedError";
  }
};
var PieverseAccountBalanceExhaustedError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseAccountBalanceExhaustedError";
  }
};
var PieversePaymentRequiredError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieversePaymentRequiredError";
  }
};
var PieverseColdStartTopupBlockedError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseColdStartTopupBlockedError";
  }
};
var PieverseTopupCapExceededError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseTopupCapExceededError";
  }
};
var PieverseTopupWalletPasswordMissingError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseTopupWalletPasswordMissingError";
  }
};
var PieverseBudgetNotAcknowledgedError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseBudgetNotAcknowledgedError";
  }
};
var FetchPieverseClient = class {
  #cookies = /* @__PURE__ */ new Map();
  #baseUrl;
  #timeoutSeconds;
  constructor(baseUrl = PIEVERSE_BASE_URL, timeoutSeconds = DEFAULT_TIMEOUT_SECONDS) {
    this.#baseUrl = baseUrl;
    this.#timeoutSeconds = timeoutSeconds;
  }
  async request(method, path, opts = {}) {
    const headers = { ...opts.headers ?? {} };
    if (opts.json !== void 0 && opts.json !== null) {
      headers["content-type"] = "application/json";
    }
    if (this.#cookies.size > 0) {
      headers.cookie = [...this.#cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    }
    const resp = await fetch(`${this.#baseUrl}${path}`, {
      method,
      headers,
      ...opts.json !== void 0 && opts.json !== null ? { body: JSON.stringify(opts.json) } : {},
      signal: AbortSignal.timeout(this.#timeoutSeconds * 1e3)
    });
    for (const raw of resp.headers.getSetCookie?.() ?? []) {
      const pair = raw.split(";", 1)[0] ?? "";
      const eq = pair.indexOf("=");
      if (eq > 0) {
        this.#cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    }
    const text = await resp.text();
    return {
      statusCode: resp.status,
      reasonPhrase: resp.statusText,
      text,
      json: () => JSON.parse(text)
    };
  }
};
function makeClient(httpClient) {
  if (httpClient !== void 0 && httpClient !== null) return httpClient;
  return new FetchPieverseClient();
}
function _raiseForStatus(resp) {
  if (resp.statusCode === 402) return;
  if (resp.statusCode >= 200 && resp.statusCode < 300) return;
  if (resp.statusCode === 401) {
    throw new PieverseAuthError(
      `Pieverse auth failed (${resp.statusCode}): ${resp.text.slice(0, 200)}`
    );
  }
  throw new PieverseError(
    `Pieverse request failed (${resp.statusCode} ${resp.reasonPhrase}): ${resp.text.slice(0, 200)}`
  );
}
var RetryPolicy = class {
  maxRetries;
  delaySeconds;
  onRetry;
  attempts = 0;
  constructor(opts = {}) {
    this.maxRetries = opts.maxRetries ?? 3;
    this.delaySeconds = opts.delaySeconds ?? 5;
    this.onRetry = opts.onRetry ?? null;
  }
};
var retryPolicyStore = new import_node_async_hooks.AsyncLocalStorage();
function retrying(policy, fn) {
  return Promise.resolve(retryPolicyStore.run(policy, fn));
}
function isRetryableStatus(statusCode) {
  return statusCode >= 500;
}
function sleepSeconds(seconds) {
  return new Promise((resolve3) => setTimeout(resolve3, seconds * 1e3));
}
function notifyRetry(policy, attempt, reason) {
  if (policy.onRetry !== null) {
    policy.onRetry(attempt, policy.maxRetries, reason);
  }
}
async function send(client, method, path, json, headers, policy) {
  if (policy === null) {
    return client.request(method, path, { json, headers });
  }
  let attempt = 0;
  for (; ; ) {
    let resp;
    try {
      resp = await client.request(method, path, { json, headers });
    } catch (exc) {
      if (attempt >= policy.maxRetries) throw exc;
      attempt += 1;
      policy.attempts = attempt;
      notifyRetry(
        policy,
        attempt,
        exc instanceof Error ? exc.constructor.name : String(exc)
      );
      await sleepSeconds(policy.delaySeconds);
      continue;
    }
    if (isRetryableStatus(resp.statusCode) && attempt < policy.maxRetries) {
      attempt += 1;
      policy.attempts = attempt;
      notifyRetry(policy, attempt, `${resp.statusCode} ${resp.reasonPhrase}`);
      await sleepSeconds(policy.delaySeconds);
      continue;
    }
    return resp;
  }
}
async function request(client, method, path, opts = {}) {
  const {
    sessionToken = null,
    json = null,
    headers = null,
    raiseOnError = true
  } = opts;
  const finalHeaders = {};
  if (sessionToken !== null) {
    finalHeaders.Authorization = `Bearer ${sessionToken}`;
  }
  if (headers) Object.assign(finalHeaders, headers);
  const resp = await send(
    client,
    method,
    path,
    json,
    finalHeaders,
    retryPolicyStore.getStore() ?? null
  );
  if (raiseOnError) _raiseForStatus(resp);
  return resp;
}

// src/audit/redact.ts
var AuditRedactionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "AuditRedactionError";
  }
};
var SECRET_KEY_PATTERN = /(password|passphrase|api[_-]?key|apikey|secret|session(?:[_-]?token)?|signature|private[_-]?key|mnemonic|seed[_-]?phrase|bearer)/i;
var VALUE_PATTERNS = [
  /^sk-pv-[a-zA-Z0-9_-]{6,}/,
  /^sess-pv-[a-zA-Z0-9_-]{6,}/,
  /^0x[0-9a-fA-F]{120,}$/
];
function checkValue(value, path) {
  if (typeof value === "string") {
    for (const pat of VALUE_PATTERNS) {
      if (pat.test(value)) {
        throw new AuditRedactionError(
          `audit redaction: value at ${path} matches secret pattern ${pat.source}; refusing to write. If this is a false positive, change the caller \u2014 do not bypass.`
        );
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => checkValue(v, `${path}[${i}]`));
  } else if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      checkPair(k, v, `${path}.${k}`);
    }
  }
}
function checkPair(key, value, path) {
  if (SECRET_KEY_PATTERN.test(key)) {
    throw new AuditRedactionError(
      `audit redaction: key '${key}' at ${path} matches secret pattern; refusing to write. Audit context must not carry secrets \u2014 use tx_hash / addresses / public amounts only.`
    );
  }
  checkValue(value, path);
}
function validateNoSecrets(event) {
  for (const [k, v] of Object.entries(event.context)) {
    checkPair(k, v, `context.${k}`);
  }
}
var URL_RE = /https?:\/\/(?:[^\s'"<>)\[\]}]|\[[^\s'"<>)\[\]}]*\])+/gi;
var QUERY_SECRET_PARAM_RE = /(?:^|[_.\[\]-])(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passphrase|secret|token|auth|key)(?:$|[_.\[\]-])/i;
function decodedUrlPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function shannonEntropy(value) {
  const counts = /* @__PURE__ */ new Map();
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}
function looksLikeSecretValue(raw) {
  const value = decodedUrlPart(raw).trim();
  if (value.length < 16) return false;
  if (/^[a-zA-Z0-9_-]{8,}(?:\.[a-zA-Z0-9_-]{8,}){2,}$/.test(value)) {
    return true;
  }
  const core = value.replace(/=+$/, "");
  return core.length >= 20 && /^[a-zA-Z0-9+/_-]+$/.test(core) && shannonEntropy(core) >= 3.5;
}
function looksLikeKeySegment(seg) {
  return looksLikeSecretValue(seg);
}
function maskOneUrl(url) {
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/.exec(
    url
  );
  if (m === null) return url;
  const scheme = m[1];
  let netloc = m[2];
  const rawPath = m[3] ?? "";
  const rawQuery = m[4];
  const fragment = m[5];
  if (!scheme || !netloc) return url;
  const at = netloc.lastIndexOf("@");
  if (at !== -1) netloc = netloc.slice(at + 1);
  const path = rawPath.split("/").map((s) => looksLikeKeySegment(s) ? "<redacted>" : s).join("/");
  let query = rawQuery;
  if (rawQuery !== void 0 && rawQuery !== "") {
    query = rawQuery.split("&").map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) {
        return looksLikeSecretValue(pair) ? "<redacted>" : pair;
      }
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      return QUERY_SECRET_PARAM_RE.test(decodedUrlPart(name)) || looksLikeSecretValue(value) ? `${name}=<redacted>` : pair;
    }).join("&");
  }
  let out = `${scheme}://${netloc}${path}`;
  if (query !== void 0 && query !== "") out += `?${query}`;
  if (fragment !== void 0 && fragment !== "") out += "#<redacted>";
  return out;
}
function maskUrlSecrets(text) {
  return text.replace(URL_RE, (u) => maskOneUrl(u));
}

// src/audit/schema.ts
var MONEY_OPS = /* @__PURE__ */ new Set([
  "auto_topup",
  // PieverseCreditEnsurer auto-renew (LLM credits low -> x402 topup)
  "cli_topup",
  // bag llm topup (manual)
  "llm_activate",
  // bag llm activate --initial-usd N
  "x402_buy",
  // bag x402 buy
  "x402_sell",
  // x402 seller settlement
  "x402_sell_unknown",
  // ambiguous x402 seller settlement requiring reconciliation
  "mpp_sell",
  // MPP seller settlement through B402
  "mpp_sell_unknown",
  // ambiguous MPP+B402 settlement requiring reconciliation
  "mpp_buy",
  // bag mpp buy / external Studio MPP buyer
  "8183_fund",
  // ERC-8183 set_budget (escrow $U into job)
  "8183_settle"
  // ERC-8183 settle (release escrow to seller)
]);
var GAS_ONLY_OPS = /* @__PURE__ */ new Set([
  "8004_register",
  // ERC-8004 register agent identity
  "8004_update_endpoint",
  // ERC-8004 update endpoint URL
  "8004_set_metadata",
  // ERC-8004 set agent metadata key/value
  "8183_submit_work",
  // ERC-8183 seller submit deliverable
  "8183_dispute",
  // ERC-8183 buyer dispute window action
  "session_grant",
  // Altana bounded session grant / quote-checker approval
  "session_revoke",
  // Altana session revoke
  "session_x402_setup"
  // Altana x402 checker + bounded Permit2 allowance
]);
var ALL_OPS = /* @__PURE__ */ new Set([
  ...MONEY_OPS,
  ...GAS_ONLY_OPS
]);
var SCHEMA_VERSION = 1;
function makeEvent(fields) {
  return Object.freeze({
    ...fields,
    context: fields.context ?? {},
    schemaVersion: fields.schemaVersion ?? SCHEMA_VERSION
  });
}
function eventToJsonLine(ev) {
  return JSON.stringify({
    ts: ev.ts,
    op: ev.op,
    actor: ev.actor,
    chain_id: ev.chainId,
    asset: ev.asset,
    amount: ev.amount,
    tx_hash: ev.txHash,
    status: ev.status,
    agent_addr: ev.agentAddr,
    counterparty: ev.counterparty,
    context: ev.context,
    schema_version: ev.schemaVersion
  });
}
var REQUIRED_KEYS = [
  "ts",
  "op",
  "actor",
  "chain_id",
  "asset",
  "amount",
  "tx_hash",
  "status",
  "agent_addr",
  "counterparty"
];
var KNOWN_KEYS = /* @__PURE__ */ new Set([
  ...REQUIRED_KEYS,
  "context",
  "schema_version"
]);
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}

// src/audit/writer.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
var DEFAULT_LOG_NAME = "audit-log.jsonl";
var DEFAULT_LOG_DIR = ".studio";
var FILE_MODE = 384;
var STUDIO_AUDIT_LOG_PATH_ENV = "STUDIO_AUDIT_LOG_PATH";
function resolveAuditLogPath(projectRoot) {
  const override = process.env[STUDIO_AUDIT_LOG_PATH_ENV];
  if (override) return override;
  const root = projectRoot ?? process.cwd();
  return (0, import_node_path.join)(root, DEFAULT_LOG_DIR, DEFAULT_LOG_NAME);
}
function appendEvent(event, opts = {}) {
  const path = resolveAuditLogPath(opts.projectRoot);
  (0, import_node_fs.mkdirSync)((0, import_node_path.dirname)(path), { recursive: true });
  const isNew = !(0, import_node_fs.existsSync)(path);
  const fd = (0, import_node_fs.openSync)(path, "a");
  try {
    (0, import_node_fs.writeSync)(fd, `${eventToJsonLine(event)}
`);
    (0, import_node_fs.fsyncSync)(fd);
  } finally {
    (0, import_node_fs.closeSync)(fd);
  }
  if (isNew) {
    (0, import_node_fs.chmodSync)(path, FILE_MODE);
  }
  return path;
}

// src/audit/gas.ts
var import_viem = require("viem");

// src/networks.ts
var import_sdk = require("@bnbagent/sdk");
var import_networks = require("@bnbagent/sdk/networks");
var DEFAULT_RPC = {
  "bsc-mainnet": "https://bsc-rpc.publicnode.com",
  "bsc-testnet": "https://bsc-testnet-rpc.publicnode.com"
};
var RPC_ENV_VAR = {
  "bsc-mainnet": "STUDIO_BSC_RPC",
  "bsc-testnet": "STUDIO_BSC_TESTNET_RPC"
};
function envRpc(name) {
  const raw = (process.env[RPC_ENV_VAR[name]] ?? "").trim();
  return raw || null;
}
var DEFAULT_CHAIN_ID = {
  "bsc-mainnet": import_networks.BSC_MAINNET_CHAIN_ID,
  "bsc-testnet": import_networks.BSC_TESTNET_CHAIN_ID
};
var PaymentSymbolUnavailableError = class extends Error {
  network;
  assetId;
  symbol;
  /** The catalog entry is a placeholder, so no token contract is usable. */
  tokenAddress = null;
  addressPending = true;
  decimals;
  retryHint;
  paymentDispatched = false;
  constructor(network, metadata, cause) {
    super(
      `Payment symbol '${metadata.symbol}' (${cause.assetId}) is unavailable on network '${network}': address pending`,
      { cause }
    );
    this.name = "PaymentSymbolUnavailableError";
    this.network = network;
    this.assetId = cause.assetId;
    this.symbol = metadata.symbol;
    this.decimals = metadata.decimals;
    this.retryHint = `--asset ${metadata.symbol}`;
  }
};
function projectToken(asset) {
  return Object.freeze({
    ...asset,
    name: asset.eip3009Domain?.name ?? asset.symbol
  });
}
function projectCatalog(chainId) {
  return Object.freeze((0, import_networks.listAssets)(chainId).map(projectToken));
}
function projectB402Token(asset) {
  return Object.freeze({
    ...asset,
    name: asset.eip3009Domain?.name ?? asset.symbol
  });
}
var NetworkInfo = class {
  name;
  chainId;
  rpcUrl;
  tokens;
  #assets;
  #assetsById;
  #assetsByAddress;
  #b402Assets;
  #b402AssetsById;
  #b402AssetsByAddress;
  constructor(name, chainId, rpcUrl, assets) {
    this.name = name;
    this.chainId = chainId;
    this.rpcUrl = rpcUrl;
    this.#assets = Object.freeze([...assets]);
    this.tokens = Object.freeze(
      Object.fromEntries(this.#assets.map((asset) => [asset.symbol, asset]))
    );
    this.#assetsById = new Map(
      this.#assets.map((asset) => [asset.assetId, asset])
    );
    this.#assetsByAddress = new Map(
      this.#assets.map((asset) => [asset.address, asset])
    );
    this.#b402Assets = Object.freeze(
      this.#assets.map(
        (asset) => projectB402Token((0, import_networks.getB402Asset)(this.chainId, asset.assetId))
      )
    );
    this.#b402AssetsById = new Map(
      this.#b402Assets.map((asset) => [asset.assetId, asset])
    );
    this.#b402AssetsByAddress = new Map(
      this.#b402Assets.map((asset) => [asset.address, asset])
    );
    const defaults = this.#assets.filter((asset) => asset.isDefault);
    if (defaults.length !== 1 || defaults[0]?.symbol !== "U") {
      throw new Error(
        `Network '${name}' must have exactly one default U payment asset`
      );
    }
    Object.freeze(this);
  }
  token(symbol) {
    const t = this.tokens[symbol];
    if (t === void 0) {
      throw new Error(
        `Token '${symbol}' not configured for network '${this.name}'`
      );
    }
    return t;
  }
  /**
   * Resolve a user-facing alias (or canonical AssetId) through the SDK's
   * active catalog. Placeholder aliases retain the SDK typed cause so callers
   * can stop before any payment dispatch.
   */
  resolvePaymentSymbol(symbol) {
    const reference = symbol.trim();
    let assetId;
    try {
      assetId = (0, import_networks.resolveAssetAlias)(this.chainId, reference.toUpperCase());
    } catch (aliasCause) {
      try {
        assetId = (0, import_networks.parseAssetId)(reference);
      } catch {
        throw aliasCause;
      }
    }
    try {
      (0, import_networks.getAsset)(this.chainId, assetId);
    } catch (cause) {
      if (cause instanceof import_networks.PaymentAssetUnavailableError) {
        throw new PaymentSymbolUnavailableError(
          this.name,
          (0, import_networks.getAssetMetadata)(this.chainId, cause.assetId),
          cause
        );
      }
      throw cause;
    }
    return this.asset(assetId);
  }
  /** Resolve a UI symbol or canonical ID to B402 execution metadata. */
  resolveB402PaymentSymbol(symbol) {
    const reference = symbol.trim();
    let assetId;
    try {
      assetId = (0, import_networks.resolveAssetAlias)(this.chainId, reference.toUpperCase());
    } catch (aliasCause) {
      try {
        assetId = (0, import_networks.parseAssetId)(reference);
      } catch {
        throw aliasCause;
      }
    }
    return this.b402Asset(assetId);
  }
  /** Immutable payment assets in SDK catalog order. */
  assets() {
    return this.#assets;
  }
  /** Immutable payment assets projected to B402 execution facts. */
  b402Assets() {
    return this.#b402Assets;
  }
  /** Resolve a canonical AssetId to its B402 execution metadata. */
  b402Asset(assetId) {
    const canonical = (0, import_networks.parseAssetId)(assetId);
    const asset = this.#b402AssetsById.get(canonical);
    if (asset === void 0) {
      throw new Error(
        `AssetId '${canonical}' not configured for B402 network '${this.name}'`
      );
    }
    return asset;
  }
  /** Resolve a checksummed B402 token address on this network. */
  b402TokenByAddress(address) {
    const catalogAsset = (0, import_networks.getB402AssetByAddress)(this.chainId, address);
    if (catalogAsset.address !== address) {
      throw new Error(
        `B402 asset address '${address}' must use checksum casing`
      );
    }
    const asset = this.#b402AssetsByAddress.get(catalogAsset.address);
    if (asset === void 0) {
      throw new Error(
        `B402 asset address '${address}' not configured for network '${this.name}'`
      );
    }
    return asset;
  }
  /** Resolve a canonical AssetId on this network. */
  asset(assetId) {
    const canonical = (0, import_networks.parseAssetId)(assetId);
    const asset = this.#assetsById.get(canonical);
    if (asset === void 0) {
      throw new Error(
        `AssetId '${canonical}' not configured for network '${this.name}'`
      );
    }
    return asset;
  }
  /** Resolve a checksummed token address on this network. */
  tokenByAddress(address) {
    const catalogAsset = (0, import_networks.getAssetByAddress)(this.chainId, address);
    if (catalogAsset.address !== address) {
      throw new Error(`Asset address '${address}' must use checksum casing`);
    }
    const asset = this.#assetsByAddress.get(catalogAsset.address);
    if (asset === void 0) {
      throw new Error(
        `Asset address '${address}' not configured for network '${this.name}'`
      );
    }
    return asset;
  }
  /**
   * Resolve an explicitly-typed reference. The discriminant prevents the
   * canonical mainnet AssetId `U` from being confused with testnet's UI
   * symbol `U`, which resolves to `TEST_U` through token().
   */
  resolveAsset(reference) {
    const keys = ["assetId", "symbol", "address"].filter(
      (key) => key in reference
    );
    if (keys.length !== 1) {
      throw new Error(
        "Asset reference must contain exactly one reference kind"
      );
    }
    if ("assetId" in reference) return this.asset(reference.assetId);
    if ("symbol" in reference) return this.token(reference.symbol);
    return this.tokenByAddress(reference.address);
  }
};
var BSC_MAINNET_ASSETS = projectCatalog(import_networks.BSC_MAINNET_CHAIN_ID);
var BSC_TESTNET_ASSETS = projectCatalog(import_networks.BSC_TESTNET_CHAIN_ID);
function requireDefaultU(assets) {
  const defaults = assets.filter(
    (asset2) => asset2.isDefault && asset2.symbol === "U"
  );
  const asset = defaults[0];
  if (defaults.length !== 1 || asset === void 0) {
    throw new Error("SDK catalog must contain exactly one default U asset");
  }
  return asset;
}
var U_TOKEN_BSC_MAINNET = requireDefaultU(BSC_MAINNET_ASSETS);
var U_TOKEN_BSC_TESTNET = requireDefaultU(BSC_TESTNET_ASSETS);
function getNetwork(name, rpcOverride) {
  if (name === "bsc-mainnet") {
    return new NetworkInfo(
      "bsc-mainnet",
      DEFAULT_CHAIN_ID["bsc-mainnet"],
      rpcOverride || envRpc(name) || DEFAULT_RPC["bsc-mainnet"],
      BSC_MAINNET_ASSETS
    );
  }
  if (name === "bsc-testnet") {
    return new NetworkInfo(
      "bsc-testnet",
      DEFAULT_CHAIN_ID["bsc-testnet"],
      rpcOverride || envRpc(name) || DEFAULT_RPC["bsc-testnet"],
      BSC_TESTNET_ASSETS
    );
  }
  throw new Error(
    `Unknown network: '${name}'. v0.0.1 supports bsc-mainnet, bsc-testnet.`
  );
}
function toRaw(amount, decimals) {
  if (typeof amount === "bigint") return amount * 10n ** BigInt(decimals);
  const s = String(amount);
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (m === null) {
    throw new Error(`Invalid decimal amount: '${s}'`);
  }
  const sign = m[1];
  const intPart = m[2];
  const frac = (m[3] ?? "").slice(0, decimals).padEnd(decimals, "0");
  const raw = BigInt(intPart + frac);
  return sign === "-" ? -raw : raw;
}
function fromRaw(raw, decimals) {
  const value = BigInt(raw);
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const base = 10n ** BigInt(decimals);
  const intPart = (abs / base).toString();
  const fracPart = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracPart ? `${sign}${intPart}.${fracPart}` : `${sign}${intPart}`;
}

// src/x402/policy.ts
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");
var import_proper_lockfile = __toESM(require("proper-lockfile"), 1);

// src/config.ts
var import_node_fs2 = require("fs");
var import_node_os = require("os");
var import_node_path2 = require("path");
var import_smol_toml = require("smol-toml");
var STUDIO_TOML = "studio.toml";
var GLOBAL_REGISTRY_PATH = (0, import_node_path2.join)(
  (0, import_node_os.homedir)(),
  ".bnbagent-studio",
  "projects.toml"
);
var APP_DIR = "app";
var StudioTomlNotFoundError = class extends Error {
  constructor() {
    super(`No ${STUDIO_TOML} found in cwd or any parent directory.`);
    this.name = "StudioTomlNotFoundError";
  }
};
var StudioTomlPathError = class extends Error {
  path;
  kind;
  constructor(path, kind, options) {
    const causeDetail = options?.cause instanceof Error ? `: ${options.cause.message}` : "";
    super(
      `Expected a regular ${STUDIO_TOML} at ${path}; found ${kind}${causeDetail}`,
      options
    );
    this.name = "StudioTomlPathError";
    this.path = path;
    this.kind = kind;
  }
};
function statKind(stat) {
  if (stat.isDirectory()) return "directory";
  if (stat.isFIFO()) return "fifo";
  if (stat.isSocket()) return "socket";
  if (stat.isCharacterDevice()) return "character-device";
  if (stat.isBlockDevice()) return "block-device";
  return "non-regular file";
}
function isRegularStudioToml(path) {
  let linkStat;
  try {
    linkStat = (0, import_node_fs2.lstatSync)(path);
  } catch (cause) {
    const code = cause.code;
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw new StudioTomlPathError(path, "unreadable path", { cause });
  }
  if (linkStat.isFile()) return true;
  if (!linkStat.isSymbolicLink()) {
    throw new StudioTomlPathError(path, statKind(linkStat));
  }
  let targetStat;
  try {
    targetStat = (0, import_node_fs2.statSync)(path);
  } catch (cause) {
    throw new StudioTomlPathError(path, "dangling symbolic link", { cause });
  }
  if (targetStat.isFile()) return true;
  throw new StudioTomlPathError(
    path,
    `symbolic link to ${statKind(targetStat)}`
  );
}
function isDir(path) {
  try {
    return (0, import_node_fs2.statSync)(path).isDirectory();
  } catch {
    return false;
  }
}
function selfAndParents(start) {
  const out = [];
  let current = (0, import_node_path2.resolve)(start);
  for (; ; ) {
    out.push(current);
    const parent = (0, import_node_path2.dirname)(current);
    if (parent === current) return out;
    current = parent;
  }
}
function workspaceBase(root) {
  for (const base of [(0, import_node_path2.join)(root, APP_DIR), root]) {
    if (isRegularStudioToml((0, import_node_path2.join)(base, "agent", STUDIO_TOML))) return base;
  }
  return null;
}
function findProjectRoot(start) {
  const current = start !== void 0 ? (0, import_node_path2.resolve)(start) : process.cwd();
  for (const candidate of selfAndParents(current)) {
    if (isRegularStudioToml((0, import_node_path2.join)(candidate, STUDIO_TOML))) return candidate;
  }
  for (const candidate of selfAndParents(current)) {
    const base = workspaceBase(candidate);
    if (base !== null) return (0, import_node_path2.join)(base, "agent");
  }
  return null;
}
function loadStudioToml(path) {
  let tomlPath;
  if (path === void 0) {
    const root = findProjectRoot();
    if (root === null) {
      throw new StudioTomlNotFoundError();
    }
    tomlPath = (0, import_node_path2.join)(root, STUDIO_TOML);
  } else {
    tomlPath = isDir(path) ? (0, import_node_path2.join)(path, STUDIO_TOML) : path;
  }
  isRegularStudioToml(tomlPath);
  return (0, import_smol_toml.parse)((0, import_node_fs2.readFileSync)(tomlPath, "utf-8"));
}

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

// src/x402/errors.ts
var X402Error = class extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "X402Error";
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
        JSON.parse((0, import_node_fs3.readFileSync)(this.ledgerPath, "utf-8"))
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
      (0, import_node_fs3.mkdirSync)((0, import_node_path3.dirname)(this.ledgerPath), { recursive: true });
      const tmp = `${this.ledgerPath}.tmp`;
      (0, import_node_fs3.writeFileSync)(
        tmp,
        JSON.stringify({
          day: this.#currentDay,
          spent_usd: this.#spentTodayUsd,
          entries: this.#entries.slice(-MAX_LEDGER_ENTRIES)
        }),
        "utf-8"
      );
      (0, import_node_fs3.renameSync)(tmp, this.ledgerPath);
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
      (0, import_node_fs3.mkdirSync)((0, import_node_path3.dirname)(this.ledgerPath), { recursive: true });
      return await import_proper_lockfile.default.lock(this.ledgerPath, {
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
  const lexicalRoot = (0, import_node_path3.resolve)(projectRoot);
  const absentSuffix = [];
  let existingCandidate = lexicalRoot;
  while (true) {
    try {
      (0, import_node_fs3.lstatSync)(existingCandidate);
      break;
    } catch (cause) {
      if (cause.code !== "ENOENT") {
        throw cause;
      }
      const parent = (0, import_node_path3.dirname)(existingCandidate);
      if (parent === existingCandidate) {
        throw cause;
      }
      absentSuffix.unshift((0, import_node_path3.basename)(existingCandidate));
      existingCandidate = parent;
    }
  }
  const physicalCandidate = import_node_fs3.realpathSync.native(existingCandidate);
  if (!(0, import_node_fs3.statSync)(physicalCandidate).isDirectory()) {
    throw new TypeError(
      `projectRoot must resolve to a directory: ${lexicalRoot}`
    );
  }
  return (0, import_node_path3.join)(physicalCandidate, ...absentSuffix);
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
  const ledger = canonical.projectRoot !== null ? (0, import_node_path3.join)(canonical.projectRoot, ".studio", "spend-ledger.json") : null;
  const tracker = new BudgetTracker({
    dailyCapUsd: canonical.dailyCapUsd,
    ledgerPath: ledger
  });
  sharedTrackers.set(canonical.key, tracker);
  return tracker;
}

// src/audit/index.ts
function record(event, opts = {}) {
  validateNoSecrets(event);
  try {
    console.log(`AUDIT ${eventToJsonLine(event)}`);
  } catch (exc) {
    console.error(
      `audit stdout mirror failed: ${exc} (op=${event.op} status=${event.status})`
    );
  }
  try {
    appendEvent(event, opts);
  } catch (exc) {
    console.error(
      `audit log file write failed (event still emitted to stdout): ${exc} (op=${event.op} status=${event.status})`
    );
  }
}
function recordChainOp(op, fields) {
  if (!ALL_OPS.has(op)) {
    throw new Error(
      `unknown audit op '${op}'; allowed: ${JSON.stringify([...ALL_OPS].sort())}`
    );
  }
  const ev = makeEvent({
    ts: nowIso(),
    op,
    actor: fields.actor ?? "cli",
    chainId: fields.chainId,
    asset: fields.asset,
    amount: fields.amount,
    txHash: fields.txHash,
    status: fields.status,
    agentAddr: fields.agentAddr,
    counterparty: fields.counterparty ?? null,
    context: { ...fields.context ?? {} }
  });
  record(ev, { projectRoot: fields.projectRoot });
  return ev;
}
var AuditedOpHandle = class {
  txHash = null;
  extraContext = {};
};
async function auditedOp(op, meta, fn) {
  const baseCtx = { ...meta.context ?? {} };
  const common = {
    actor: meta.actor ?? "cli",
    chainId: meta.chainId,
    asset: meta.asset,
    amount: meta.amount,
    agentAddr: meta.agentAddr,
    counterparty: meta.counterparty ?? null,
    projectRoot: meta.projectRoot
  };
  recordChainOp(op, {
    ...common,
    txHash: null,
    status: "submitted",
    context: baseCtx
  });
  const handle = new AuditedOpHandle();
  let result;
  try {
    result = await fn(handle);
  } catch (exc) {
    const message = exc instanceof Error ? exc.message : String(exc);
    recordChainOp(op, {
      ...common,
      txHash: handle.txHash,
      status: "failed",
      context: {
        ...baseCtx,
        ...handle.extraContext,
        error: maskUrlSecrets(message).slice(0, 200)
      }
    });
    throw exc;
  }
  recordChainOp(op, {
    ...common,
    txHash: handle.txHash,
    status: "confirmed",
    context: { ...baseCtx, ...handle.extraContext }
  });
  return result;
}

// src/x402/index.ts
var import_x4022 = require("@bnbagent/sdk/x402");

// src/x402/buyer.ts
var import_node_async_hooks2 = require("async_hooks");
var import_node_crypto = require("crypto");
var import_node_path4 = require("path");
var import_b402 = require("@bnb-chain/b402");
var import_sdk2 = require("@bnbagent/sdk");
var import_x402 = require("@bnbagent/sdk/x402");
var import_http = require("@x402/core/http");
var import_viem2 = require("viem");

// src/x402/signing.ts
var EIP3009_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" }
  ],
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
};
function buildXPaymentHeader(resource, accepted, signature, authorization) {
  const envelope = {
    x402Version: 2,
    resource,
    accepted,
    payload: {
      signature,
      authorization
    }
  };
  return Buffer.from(JSON.stringify(envelope), "utf-8").toString("base64");
}

// src/x402/buyer.ts
var PERMIT2_ADDRESS = (0, import_viem2.getAddress)(import_b402.B402_PERMIT2_ADDRESS);
function resolvePaymentAsset(networkName, reference) {
  const network = getNetwork(networkName);
  try {
    return network.resolveB402PaymentSymbol(reference?.trim() || "U");
  } catch (cause) {
    const raw = reference?.trim() || "U";
    throw new X402PaymentAssetUnavailableError(
      `payment asset ${raw} is not available on ${networkName}`,
      { cause, asset: unknownAssetFacts(raw) }
    );
  }
}
function assetFacts(asset) {
  return Object.freeze({
    assetId: asset.assetId,
    symbol: asset.symbol,
    tokenAddress: asset.address,
    addressPending: false,
    decimals: asset.decimals,
    retryHint: `--asset ${asset.symbol}`
  });
}
function unknownAssetFacts(reference) {
  return Object.freeze({
    assetId: reference,
    symbol: reference,
    tokenAddress: null,
    addressPending: false,
    decimals: 0,
    retryHint: `--asset ${reference}`
  });
}
function atomicUsdCap(maxUsd, asset) {
  if (!Number.isFinite(maxUsd) || maxUsd < 0) return null;
  try {
    return toRaw(maxUsd, asset.decimals);
  } catch {
    return null;
  }
}
function formatUsdCap(maxUsd) {
  return Number.isFinite(maxUsd) ? maxUsd.toFixed(6) : String(maxUsd);
}
function transferMethod(option) {
  const extra = typeof option.extra === "object" && option.extra !== null && !Array.isArray(option.extra) ? option.extra : {};
  const explicit = String(extra.assetTransferMethod ?? "").toLowerCase();
  const topLevel = String(option.transferMethod ?? "").toLowerCase();
  if (explicit && topLevel && explicit !== topLevel) return "";
  if (explicit) return explicit;
  if (topLevel) return topLevel;
  const scheme = String(option.scheme ?? "").toLowerCase();
  return scheme && scheme !== "exact" ? scheme : "eip3009";
}
function normalizedDelegatedMethod(method) {
  const value = String(method ?? "eip3009").toLowerCase();
  return value === "permit2" ? "permit2-exact" : value;
}
function exactAssetOptions(challenge, chainId, asset) {
  if (!Array.isArray(challenge.accepts)) return [];
  return challenge.accepts.filter((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      return false;
    const rec = entry;
    return chainIdMatches(rec, chainId) && rec.scheme === "exact" && typeof rec.asset === "string" && rec.asset.toLowerCase() === asset.address.toLowerCase() && transferMethod(rec) !== "" && asset.b402Methods.includes(transferMethod(rec)) && transferMethod(rec) !== "permit2-upto";
  });
}
function supports(wallet, capability) {
  const fn = wallet?.supports;
  if (typeof fn !== "function") return true;
  return Boolean(fn.call(wallet, capability));
}
function hasLocalEip3009SigningSurface(wallet) {
  return typeof wallet?.signTypedData === "function" && supports(wallet, "sign.typed_data");
}
function captureLocalSigningCapability(wallet) {
  const raw = wallet?.signTypedData;
  if (wallet === null || wallet === void 0 || typeof raw !== "function") {
    return null;
  }
  if (!supports(wallet, "sign.typed_data")) return null;
  const invoke = (...args) => Reflect.apply(raw, wallet, args);
  const signingWallet = Object.freeze({
    address: wallet.address,
    signingPolicy: wallet.signingPolicy,
    signTypedData: invoke
  });
  return Object.freeze({ raw, wallet: signingWallet });
}
function stillHasLocalSigningCapability(wallet, capability) {
  const current = wallet.signTypedData;
  return typeof current === "function" && current === capability.raw && supports(wallet, "sign.typed_data");
}
var dailyCapMarker = new import_node_async_hooks2.AsyncLocalStorage();
function dailyCapCountedElsewhere(fn) {
  return Promise.resolve(dailyCapMarker.run(true, fn));
}
function _isDailyCapCountedElsewhere() {
  return dailyCapMarker.getStore() === true;
}
var VALID_AFTER_BACKDATE_SECONDS = 120;
function trustedPaymentFacts(network, asset, amountAtomic, paidUsd, paymentMethod) {
  return Object.freeze({
    network,
    assetId: asset.assetId,
    symbol: asset.symbol,
    tokenAddress: asset.address,
    decimals: asset.decimals,
    amountAtomic: String(amountAtomic),
    paidUsd,
    paymentProtocol: "x402",
    paymentMethod
  });
}
function chainIdMatches(accepted, networkChainId) {
  return accepted.network === `eip155:${networkChainId}`;
}
var LocalRouteUnsupportedError = class extends X402PaymentRequiredError {
};
function _parseAccepted(challenge, networkChainId, expectedAssetAddr) {
  const [matched, resource] = parseAcceptedForMethods(
    challenge,
    networkChainId,
    expectedAssetAddr,
    LOCAL_EXACT_METHODS,
    () => new LocalRouteUnsupportedError(
      `x402 402 has no EIP-3009-payable option: entries matching chain_id=${networkChainId} + asset='${expectedAssetAddr}' all use other transfer methods (e.g. permit2-exact), which this local-signing buyer does not sign. Delegated wallets need an atomic exact-route client to pay supported Permit2 routes.`
    )
  );
  return [matched, resource];
}
var LOCAL_EXACT_METHODS = Object.freeze(["eip3009"]);
var SETTLABLE_EXACT_METHODS = Object.freeze(["eip3009", "permit2-exact"]);
function parseAcceptedForMethods(challenge, networkChainId, expectedAssetAddr, allowedMethods, unsupportedMethod) {
  const accepts = challenge.accepts;
  if (!Array.isArray(accepts) || accepts.length === 0) {
    throw new X402PaymentRequiredError(
      `x402 402 response missing 'accepts' list: ${JSON.stringify(challenge)}`
    );
  }
  let matched = null;
  let matchedMethod = "";
  let chainAssetHit = false;
  for (const entry of accepts) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }
    const rec = entry;
    if (!chainIdMatches(rec, networkChainId)) continue;
    const asset = rec.asset ?? "";
    if (typeof asset !== "string" || asset.toLowerCase() !== expectedAssetAddr.toLowerCase()) {
      continue;
    }
    chainAssetHit = true;
    if (rec.scheme !== "exact") {
      throw new X402PaymentRequiredError(
        "x402 local payment requires an exact route scheme"
      );
    }
    const method = transferMethod(rec);
    if (method === "") {
      throw new X402PaymentRequiredError(
        "x402 local payment has conflicting top-level and extra transfer methods"
      );
    }
    if (!allowedMethods.includes(method)) {
      continue;
    }
    matched = rec;
    matchedMethod = method;
    break;
  }
  if (matched === null) {
    if (chainAssetHit) {
      throw unsupportedMethod();
    }
    const first = typeof accepts[0] === "object" && accepts[0] !== null ? accepts[0] : {};
    throw new X402AssetMismatchError(
      `x402 402 chain/asset mismatch: no accepted option matches chain_id=${networkChainId} + asset='${expectedAssetAddr}' (first offered: network=${JSON.stringify(first.network)} asset=${JSON.stringify(first.asset)})`
    );
  }
  if (!("payTo" in matched) || !("amount" in matched)) {
    throw new X402PaymentRequiredError(
      `x402 402 'accepted' missing payTo/amount: ${JSON.stringify(matched)}`
    );
  }
  const resource = challenge.resource ?? challenge;
  return [matched, resource, matchedMethod];
}
function _checkHost(url, allowedHosts) {
  if (allowedHosts === null || allowedHosts === void 0) return;
  let host = "";
  try {
    host = new URL(url).hostname ?? "";
  } catch {
    host = "";
  }
  const allowed = new Set(allowedHosts.map((h) => h.toLowerCase()));
  if (!allowed.has(host.toLowerCase())) {
    throw new X402HostNotAllowedError(
      `x402 buyer refusing '${host}' \u2014 not in allowed_hosts=${JSON.stringify(allowedHosts)}`
    );
  }
}
var defaultConfigLoader = () => {
  try {
    return loadStudioToml();
  } catch (cause) {
    if (cause instanceof StudioTomlNotFoundError) {
      return null;
    }
    throw cause;
  }
};
var configLoader = defaultConfigLoader;
var usingDefaultConfigLoader = true;
function paymentConfigSource() {
  if (!usingDefaultConfigLoader) {
    return Object.freeze({ raw: configLoader(), projectRoot: null });
  }
  const projectRoot = findProjectRoot();
  if (projectRoot === null) {
    return Object.freeze({ raw: null, projectRoot: null });
  }
  return Object.freeze({
    raw: loadStudioToml((0, import_node_path4.join)(projectRoot, STUDIO_TOML)),
    projectRoot
  });
}
function configuredExpectedRecipient(loaded) {
  const payments = loaded?.payments ?? {};
  const x402Cfg = payments.x402 ?? {};
  const value = x402Cfg.expected_recipient;
  return value && String(value).trim() ? String(value).trim() : null;
}
function paymentPolicySnapshot() {
  let source;
  try {
    source = paymentConfigSource();
  } catch (cause) {
    throw new X402PaymentRequiredError(
      "x402 buyer refusing to pay because studio.toml could not be safely loaded",
      { cause }
    );
  }
  try {
    const loaded = source.raw;
    const policy = X402BuyerPolicy.fromToml(loaded);
    const dailyCapUsd = resolveDailyCapUsd(loaded);
    return Object.freeze({
      policy,
      configuredExpectedTo: configuredExpectedRecipient(loaded),
      budgetTrackerSnapshot: Object.freeze({
        dailyCapUsd,
        projectRoot: source.projectRoot
      })
    });
  } catch (cause) {
    throw new X402PaymentRequiredError(
      "x402 buyer refusing to pay because studio.toml payment policy is invalid",
      { cause }
    );
  }
}
function merchantForUrl(url, policy) {
  if (!url) return null;
  let host = "";
  try {
    host = (new URL(url).hostname ?? "").toLowerCase();
  } catch {
    return null;
  }
  if (!host) return null;
  return policy.merchantForHost(host);
}
function effectivePerCallCap(maxUsd, merchant, policy) {
  return Math.min(
    maxUsd ?? Number.POSITIVE_INFINITY,
    policy.maxPerRequestUsd,
    merchant?.perCallCapUsd ?? Number.POSITIVE_INFINITY
  );
}
function paymentTrustForUrl(url, callerMaxUsd) {
  const snapshot = paymentPolicySnapshot();
  const merchant = merchantForUrl(url, snapshot.policy);
  return Object.freeze({
    ...snapshot,
    merchant,
    maxUsd: effectivePerCallCap(callerMaxUsd, merchant, snapshot.policy)
  });
}
function resolveExpectedTo(expectedTo, merchant, configuredExpectedTo) {
  const merchantPayTo = merchant !== null ? String(merchant.payTo).trim() : "";
  if (merchantPayTo) {
    let normalizedMerchant;
    try {
      normalizedMerchant = (0, import_viem2.getAddress)(merchantPayTo);
    } catch {
      throw new import_x402.X402RecipientMismatchError(
        "trusted merchant recipient is not a valid EVM address"
      );
    }
    if (expectedTo?.trim()) {
      let normalizedExpected;
      try {
        normalizedExpected = (0, import_viem2.getAddress)(expectedTo.trim());
      } catch {
        throw new import_x402.X402RecipientMismatchError(
          "explicit x402 recipient is not a valid EVM address"
        );
      }
      if (normalizedExpected !== normalizedMerchant) {
        throw new import_x402.X402RecipientMismatchError(
          "explicit x402 recipient does not match the trusted merchant recipient"
        );
      }
    }
    return normalizedMerchant;
  }
  if (expectedTo?.trim()) return expectedTo.trim();
  if (configuredExpectedTo !== null) return configuredExpectedTo;
  throw new X402RecipientRequiredError(
    "x402 buyer refusing to sign: no trusted recipient supplied. Set [payments.x402].expected_recipient (the trusted pay-to address), trust the merchant via `bag x402 trust`, or pass expected_to \u2014 studio never trusts the payTo returned by the 402 response."
  );
}
function assertMerchantAsset(merchant, selected) {
  if (merchant?.assetPinUnreadable === true) {
    throw new X402PaymentRequiredError(
      "trusted merchant has an unreadable asset pin; fix or remove the asset/assets line before paying this merchant"
    );
  }
  const configured = merchantPinnedAssets(merchant);
  if (configured === null) return;
  let pinned;
  try {
    pinned = configured.map((entry) => (0, import_viem2.getAddress)(entry));
  } catch {
    throw new X402PaymentRequiredError(
      "trusted merchant has an invalid pinned asset"
    );
  }
  if (!pinned.includes(selected.address)) {
    throw new X402PaymentAssetUnavailableError(
      `selected ${selected.symbol} conflicts with the merchant's pinned asset`,
      { asset: assetFacts(selected), merchantPin: pinned }
    );
  }
}
function unavailableAssetError(_challenge, networkName, selected, verifiedAlternatives = []) {
  return new X402PaymentAssetUnavailableError(
    `x402 chain/asset mismatch: the endpoint does not offer ${selected.symbol} on ${networkName}`,
    { asset: assetFacts(selected), alternatives: verifiedAlternatives }
  );
}
async function readAssetBalance(wallet, reader, networkName, asset) {
  const request2 = {
    networkName,
    owner: (0, import_viem2.getAddress)(wallet.address),
    tokenAddress: asset.address
  };
  try {
    if (reader) return await reader.balanceOf(request2);
    if (wallet.readTokenBalance) return await wallet.readTokenBalance(request2);
    const network = getNetwork(networkName);
    const client = (0, import_viem2.createPublicClient)({ transport: (0, import_viem2.http)(network.rpcUrl) });
    return await client.readContract({
      address: asset.address,
      abi: import_viem2.erc20Abi,
      functionName: "balanceOf",
      args: [request2.owner]
    });
  } catch (cause) {
    throw new X402PaymentAssetBalanceUnavailableError(
      `could not verify ${asset.symbol} balance before payment`,
      { cause, asset: assetFacts(asset) }
    );
  }
}
async function assertSufficientBalance(wallet, reader, networkName, asset, required, alternatives = []) {
  const current = await readAssetBalance(wallet, reader, networkName, asset);
  if (current >= required) return;
  const verifiedAlternatives = await resolveAlternatives(alternatives);
  throw new X402InsufficientPaymentAssetBalanceError(
    `insufficient ${asset.symbol} balance; Studio did not switch assets or pay`,
    {
      asset: assetFacts(asset),
      requiredAtomic: required.toString(),
      currentAtomic: current.toString(),
      requiredHuman: (0, import_viem2.formatUnits)(required, asset.decimals),
      currentHuman: (0, import_viem2.formatUnits)(current, asset.decimals),
      alternatives: verifiedAlternatives
    }
  );
}
async function assertSufficientAllowance(wallet, reader, networkName, asset, required, alternatives = []) {
  const current = await readAssetAllowance(wallet, reader, networkName, asset);
  if (current >= required) return;
  const verifiedAlternatives = await resolveAlternatives(alternatives);
  throw new X402InsufficientPaymentAssetAllowanceError(
    `insufficient ${asset.symbol} Permit2 allowance; Studio did not switch assets or pay`,
    {
      asset: assetFacts(asset),
      requiredAtomic: required.toString(),
      currentAtomic: current.toString(),
      requiredHuman: (0, import_viem2.formatUnits)(required, asset.decimals),
      currentHuman: (0, import_viem2.formatUnits)(current, asset.decimals),
      alternatives: verifiedAlternatives
    }
  );
}
async function resolveAlternatives(alternatives) {
  if (typeof alternatives === "function") return alternatives();
  return alternatives ?? [];
}
async function readAssetAllowance(wallet, reader, networkName, asset) {
  const request2 = {
    networkName,
    owner: (0, import_viem2.getAddress)(wallet.address),
    tokenAddress: asset.address,
    spender: PERMIT2_ADDRESS
  };
  let current;
  try {
    if (reader?.allowance) current = await reader.allowance(request2);
    else if (wallet.readTokenAllowance)
      current = await wallet.readTokenAllowance(request2);
    else {
      const network = getNetwork(networkName);
      const client = (0, import_viem2.createPublicClient)({ transport: (0, import_viem2.http)(network.rpcUrl) });
      current = await client.readContract({
        address: asset.address,
        abi: import_viem2.erc20Abi,
        functionName: "allowance",
        args: [request2.owner, request2.spender]
      });
    }
  } catch (cause) {
    throw new X402PaymentAssetBalanceUnavailableError(
      `could not verify ${asset.symbol} Permit2 allowance before payment`,
      { cause, asset: assetFacts(asset) }
    );
  }
  return current;
}
async function fundedLocalAlternatives(challenge, wallet, reader, networkName, selected, expectedTo, merchant, configuredExpectedTo, maxUsd, requestedUrl) {
  const network = getNetwork(networkName);
  const alternatives = [];
  for (const asset of network.b402Assets()) {
    if (asset.assetId === selected.assetId) continue;
    try {
      const route = verifyLocalRoute({
        challenge,
        wallet,
        networkName,
        expectedTo,
        merchant,
        configuredExpectedTo,
        maxUsd,
        asset,
        requestedUrl
      });
      const current = await readAssetBalance(
        wallet,
        reader,
        networkName,
        asset
      );
      if (current < route.amountAtomic) continue;
      if (!stillHasLocalSigningCapability(wallet, route.signingCapability)) {
        continue;
      }
    } catch {
      continue;
    }
    alternatives.push(assetFacts(asset));
  }
  return Object.freeze(alternatives);
}
function rawQuoteAccepts(quote) {
  return Array.isArray(quote.raw.accepts) ? quote.raw.accepts.filter(
    (entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry)
  ) : [];
}
function rawRouteMatchesOption(raw, option) {
  const amount = raw.amount ?? raw.maxAmountRequired;
  if (raw.amount !== void 0 && raw.maxAmountRequired !== void 0 || typeof amount !== "string" || !/^[1-9]\d*$/.test(amount)) {
    return false;
  }
  return raw.network === option.network && raw.scheme === "exact" && option.scheme === "exact" && typeof raw.asset === "string" && raw.asset.toLowerCase() === option.asset.toLowerCase() && BigInt(amount) === option.amount && typeof raw.payTo === "string" && raw.payTo.toLowerCase() === option.payTo.toLowerCase() && raw.maxTimeoutSeconds === option.maxTimeoutSeconds && transferMethod(raw) === normalizedDelegatedMethod(option.transferMethod);
}
function cloneResourceValue(value, depth = 0) {
  if (depth > 16) return void 0;
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : void 0;
  }
  if (Array.isArray(value)) {
    if (value.length > 256) return void 0;
    const items = [];
    for (const item of value) {
      const cloned2 = cloneResourceValue(item, depth + 1);
      if (cloned2 === void 0) return void 0;
      items.push(cloned2);
    }
    return Object.freeze(items);
  }
  if (typeof value !== "object" || value === null) return void 0;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return void 0;
  const keys = Object.keys(value).sort();
  if (keys.length > 64) return void 0;
  const cloned = /* @__PURE__ */ Object.create(null);
  for (const key of keys) {
    const rawItem = value[key];
    if (rawItem === void 0) continue;
    const item = cloneResourceValue(rawItem, depth + 1);
    if (item === void 0) return void 0;
    cloned[key] = item;
  }
  return Object.freeze(cloned);
}
function exactResource(rawResource, requestedUrl) {
  const cloned = cloneResourceValue(rawResource);
  if (typeof cloned !== "object" || cloned === null || Array.isArray(cloned)) {
    return null;
  }
  const record2 = cloned;
  if (typeof record2.url !== "string" || record2.url.trim() === "" || record2.url !== requestedUrl || record2.description !== void 0 && typeof record2.description !== "string" || record2.mimeType !== void 0 && typeof record2.mimeType !== "string") {
    return null;
  }
  return record2;
}
function requireCallerResourceUrl(value) {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value || /\s/u.test(value) || value.includes("\\")) {
    throw new X402PaymentRequiredError(
      "pay_challenge requires a non-empty valid caller resource URL"
    );
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new X402PaymentRequiredError(
      "pay_challenge requires a non-empty valid caller resource URL"
    );
  }
  const rawAuthority = /^(?:https?):\/\/([^/?#\\\s]+)/iu.exec(value)?.[1];
  if (rawAuthority === void 0 || parsed.protocol !== "http:" && parsed.protocol !== "https:" || parsed.hostname === "" || parsed.username !== "" || parsed.password !== "" || parsed.hash !== "" || value.includes("#") || rawAuthority.includes("@")) {
    throw new X402PaymentRequiredError(
      "pay_challenge requires an HTTP(S) caller resource URL without credentials or fragments"
    );
  }
  return value;
}
function exactQuoteResource(quote, requestedUrl) {
  return exactResource(quote.raw.resource, requestedUrl);
}
function captureDelegatedExactCapability(payer) {
  try {
    const raw = payer.requestExact;
    const methods = payer.exactTransferMethods;
    if (typeof raw !== "function" || !Array.isArray(methods)) return null;
    const invoke = (...args) => Reflect.apply(raw, payer, args);
    return Object.freeze({
      raw,
      invoke,
      exactTransferMethods: Object.freeze([...methods])
    });
  } catch {
    return null;
  }
}
function stillHasDelegatedExactCapability(payer, capability, method) {
  try {
    return payer.requestExact === capability.raw && Array.isArray(payer.exactTransferMethods) && payer.exactTransferMethods.includes(method);
  } catch {
    return false;
  }
}
function payerSupportsExactMethod(capability, method) {
  return capability?.exactTransferMethods.includes(method) ?? false;
}
var LOCAL_ROUTE_DIAGNOSIS = Object.freeze({
  branch: "local",
  payerExactMethods: null
});
function delegatedRouteDiagnosis(capability) {
  return {
    branch: "delegated",
    payerExactMethods: capability?.exactTransferMethods ?? null
  };
}
function catalogVerifiedDelegatedRoute(quote, option, networkName, asset, capability, requestedUrl, expectedTo, merchant) {
  const method = normalizedDelegatedMethod(option.transferMethod);
  const network = getNetwork(networkName);
  const networkId = `eip155:${network.chainId}`;
  const resource = exactQuoteResource(quote, requestedUrl);
  let trustedPayTo;
  try {
    trustedPayTo = (0, import_viem2.getAddress)(expectedTo);
    assertMerchantAsset(merchant ?? null, asset);
  } catch {
    return null;
  }
  const amountUsd = Number.parseFloat(fromRaw(option.amount, asset.decimals));
  if (resource === null || quote.raw.x402Version !== 2 || option.network !== networkId || option.scheme !== "exact" || option.asset.toLowerCase() !== asset.address.toLowerCase() || option.amount <= 0n || !Number.isFinite(amountUsd) || amountUsd <= 0 || !(0, import_viem2.isAddress)(option.payTo) || (0, import_viem2.getAddress)(option.payTo) !== trustedPayTo || !Number.isSafeInteger(option.maxTimeoutSeconds) || option.maxTimeoutSeconds === null || option.maxTimeoutSeconds <= 0 || option.maxTimeoutSeconds > 3600 || method === "permit2-upto" || !asset.b402Methods.includes(method) || !payerSupportsExactMethod(capability, method)) {
    return null;
  }
  const raw = rawQuoteAccepts(quote).find(
    (entry) => rawRouteMatchesOption(entry, option)
  );
  if (raw === void 0) return null;
  const common = {
    x402Version: 2,
    scheme: "exact",
    network: networkId,
    asset: asset.address,
    amount: option.amount,
    payTo: (0, import_viem2.getAddress)(option.payTo),
    maxTimeoutSeconds: option.maxTimeoutSeconds,
    resource
  };
  if (method === "eip3009") {
    if (!eip3009DomainMatchesCatalog(raw, asset)) return null;
    const expected = (0, import_x402.resolveExpectedEip3009Route)(
      network.chainId,
      asset.assetId
    );
    return {
      option,
      amountUsd,
      expectedRoute: {
        ...common,
        transferMethod: "eip3009",
        name: expected.name,
        version: expected.version
      }
    };
  }
  if (method !== "permit2-exact") return null;
  const extra = typeof raw.extra === "object" && raw.extra !== null && !Array.isArray(raw.extra) ? raw.extra : null;
  const kind = asset.b402Kinds.find(
    (candidate) => candidate.method === "permit2-exact"
  );
  const trustedSpender = import_b402.CURATED_B402_SPENDERS[networkId]?.exact;
  if (extra === null || kind === void 0 || trustedSpender === void 0 || extra.assetTransferMethod !== "permit2-exact" || extra.name !== kind.name || extra.version !== kind.version || typeof extra.signerAddress !== "string" || !(0, import_viem2.isAddress)(extra.signerAddress) || typeof extra.spenderAddress !== "string" || !(0, import_viem2.isAddress)(extra.spenderAddress) || (0, import_viem2.getAddress)(extra.spenderAddress) !== (0, import_viem2.getAddress)(trustedSpender)) {
    return null;
  }
  return {
    option,
    amountUsd,
    expectedRoute: {
      ...common,
      transferMethod: "permit2-exact",
      name: kind.name,
      version: kind.version,
      spenderAddress: (0, import_viem2.getAddress)(trustedSpender),
      trustedSpenders: [(0, import_viem2.getAddress)(trustedSpender)]
    }
  };
}
function catalogVerifiedDelegatedRoutes(quote, networkName, asset, capability, requestedUrl, expectedTo, merchant) {
  return quote.accepts.map(
    (option) => catalogVerifiedDelegatedRoute(
      quote,
      option,
      networkName,
      asset,
      capability,
      requestedUrl,
      expectedTo,
      merchant
    )
  ).filter((route) => route !== null);
}
function selectDelegatedRoute(routes) {
  return routes.find((route) => route.option.preferred) ?? routes.find(
    (route) => route.expectedRoute.transferMethod === "permit2-exact"
  ) ?? routes[0];
}
async function fundedDelegatedAlternatives(quote, payer, capability, wallet, reader, networkName, selected, requestedUrl, expectedTo, merchant, maxUsd) {
  if (capability === null) return [];
  const alternatives = [];
  for (const asset of getNetwork(networkName).b402Assets()) {
    if (asset.assetId === selected.assetId) continue;
    const route = selectDelegatedRoute(
      catalogVerifiedDelegatedRoutes(
        quote,
        networkName,
        asset,
        capability,
        requestedUrl,
        expectedTo,
        merchant
      )
    );
    if (route === void 0) continue;
    const capAtomic = atomicUsdCap(maxUsd, asset);
    if (capAtomic === null || route.option.amount > capAtomic) {
      continue;
    }
    const { option } = route;
    try {
      if (await readAssetBalance(wallet, reader, networkName, asset) < option.amount) {
        continue;
      }
      if (normalizedDelegatedMethod(option.transferMethod) === "permit2-exact" && await readAssetAllowance(wallet, reader, networkName, asset) < option.amount) {
        continue;
      }
    } catch {
      continue;
    }
    if (!stillHasDelegatedExactCapability(
      payer,
      capability,
      normalizedDelegatedMethod(option.transferMethod)
    )) {
      continue;
    }
    alternatives.push(assetFacts(asset));
  }
  return Object.freeze(alternatives);
}
function verifyLocalRoute(opts) {
  const network = getNetwork(opts.networkName);
  const token = opts.asset;
  const expectedTo = resolveExpectedTo(
    opts.expectedTo,
    opts.merchant ?? null,
    opts.configuredExpectedTo
  );
  assertMerchantAsset(opts.merchant ?? null, token);
  const signingCapability = captureLocalSigningCapability(opts.wallet);
  if (signingCapability === null) {
    throw new X402UnsupportedWalletRouteError(
      `${token.symbol} needs local EIP-3009 signing (sign.typed_data)`,
      { asset: assetFacts(token), walletRoute: LOCAL_ROUTE_DIAGNOSIS }
    );
  }
  if (!token.b402Methods.includes("eip3009")) {
    throw new X402UnsupportedWalletRouteError(
      `${token.symbol} is Permit2-only on ${opts.networkName}; local and Turnkey wallets do not enable Permit2 in this release`,
      { asset: assetFacts(token), walletRoute: LOCAL_ROUTE_DIAGNOSIS }
    );
  }
  if (opts.challenge.x402Version !== 2) {
    throw new X402PaymentRequiredError(
      "x402 local payment requires x402Version=2"
    );
  }
  const accepted = opts.accepted ?? _parseAccepted(opts.challenge, network.chainId, token.address)[0];
  const resource = exactResource(opts.challenge.resource, opts.requestedUrl);
  if (resource === null) {
    throw new X402PaymentRequiredError(
      "x402 challenge resource does not exactly match the caller-requested URL"
    );
  }
  assertEip3009DomainBinding(accepted, token);
  const maxTimeoutSeconds = accepted.maxTimeoutSeconds;
  if (typeof maxTimeoutSeconds !== "number" || !Number.isSafeInteger(maxTimeoutSeconds) || maxTimeoutSeconds <= 0 || maxTimeoutSeconds > 3600) {
    throw new X402PaymentRequiredError(
      "x402 maxTimeoutSeconds must be a positive safe integer no greater than 3600"
    );
  }
  let payTo;
  let normalizedExpectedTo;
  try {
    payTo = (0, import_viem2.getAddress)(String(accepted.payTo));
    normalizedExpectedTo = (0, import_viem2.getAddress)(expectedTo);
  } catch {
    throw new import_x402.X402RecipientMismatchError(
      "x402 accepted payTo or trusted recipient is not a valid EVM address"
    );
  }
  if (payTo !== normalizedExpectedTo) {
    throw new import_x402.X402RecipientMismatchError(
      "x402 accepted payTo does not match the trusted recipient"
    );
  }
  const rawAmount = accepted.amount;
  if (typeof rawAmount !== "string" || !/^[1-9]\d*$/.test(rawAmount)) {
    throw new X402PaymentRequiredError(
      "x402 accepted amount must be a positive canonical atomic integer"
    );
  }
  const amountAtomic = BigInt(rawAmount);
  const amountUsd = Number.parseFloat(fromRaw(amountAtomic, token.decimals));
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new X402PaymentRequiredError(
      "x402 accepted amount is outside Studio's safe payment range"
    );
  }
  const maxPaymentAtomic = opts.maxUsd === null ? null : atomicUsdCap(opts.maxUsd, token);
  if (opts.maxUsd !== null && (maxPaymentAtomic === null || amountAtomic > maxPaymentAtomic)) {
    throw new X402BudgetExhaustedError(
      `x402 402 demands $${amountUsd.toFixed(6)} > max_usd=$${formatUsdCap(opts.maxUsd)}`
    );
  }
  return Object.freeze({
    accepted,
    resource,
    expectedTo: normalizedExpectedTo,
    expectedRoute: (0, import_x402.resolveExpectedEip3009Route)(network.chainId, token.assetId),
    amountAtomic,
    amountUsd,
    maxPaymentAtomic,
    maxTimeoutSeconds,
    signingCapability
  });
}
async function signAndBuildEnvelope(challenge, opts) {
  const network = getNetwork(opts.networkName);
  const token = opts.asset;
  const expectedAsset = token.address;
  const route = verifyLocalRoute({
    challenge,
    accepted: opts.accepted,
    wallet: opts.wallet,
    networkName: opts.networkName,
    expectedTo: opts.expectedTo,
    merchant: opts.merchant,
    configuredExpectedTo: opts.configuredExpectedTo,
    maxUsd: opts.maxUsd,
    asset: token,
    requestedUrl: opts.requestedUrl
  });
  const maxValidityWindowSeconds = route.signingCapability.wallet.signingPolicy?.maxValidityWindowSeconds ?? 600;
  if (maxValidityWindowSeconds <= VALID_AFTER_BACKDATE_SECONDS) {
    throw new X402PaymentRequiredError(
      `x402 wallet validity window ${maxValidityWindowSeconds}s cannot accommodate the ${VALID_AFTER_BACKDATE_SECONDS}s validAfter backdate.`
    );
  }
  const futureValiditySeconds = Math.min(
    route.maxTimeoutSeconds,
    maxValidityWindowSeconds - VALID_AFTER_BACKDATE_SECONDS
  );
  const now = Math.floor(Date.now() / 1e3);
  const validAfter = now - VALID_AFTER_BACKDATE_SECONDS;
  const validBefore = now + futureValiditySeconds;
  const nonceHex = `0x${(0, import_node_crypto.randomBytes)(32).toString("hex")}`;
  const fromAddr = route.signingCapability.wallet.address;
  const toAddr = route.expectedTo;
  const valueRaw = route.amountAtomic;
  const amountUsd = route.amountUsd;
  const { accepted, expectedRoute, resource } = route;
  const domain = {
    name: expectedRoute.name,
    version: expectedRoute.version,
    chainId: network.chainId,
    verifyingContract: expectedAsset
  };
  const message = {
    from: fromAddr,
    to: toAddr,
    value: valueRaw,
    validAfter: BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce: nonceHex
  };
  const sdkCap = route.maxPaymentAtomic === null ? void 0 : { [expectedAsset]: route.maxPaymentAtomic };
  await assertSufficientBalance(
    opts.wallet,
    opts.assetReader,
    opts.networkName,
    token,
    valueRaw,
    opts.alternatives
  );
  const signer = new import_sdk2.X402Signer(
    route.signingCapability.wallet,
    sdkCap === void 0 ? void 0 : {
      maxValuePerCall: sdkCap,
      // Request-scoped defense in depth. Studio's durable BudgetTracker
      // remains the authoritative cross-request UTC daily cap.
      sessionBudget: sdkCap
    }
  );
  const signed = await signer.signPayment({
    domain,
    types: EIP3009_TYPES,
    message,
    expectedRoute,
    expectedTo: route.expectedTo
  });
  let signature = String(signed.signature);
  if (!signature.startsWith("0x")) signature = `0x${signature}`;
  const authorization = {
    from: fromAddr,
    to: toAddr,
    value: String(valueRaw),
    validAfter: String(validAfter),
    validBefore: String(validBefore),
    nonce: nonceHex
  };
  const xPayment = buildXPaymentHeader(
    resource,
    accepted,
    signature,
    authorization
  );
  return [xPayment, accepted, amountUsd, valueRaw];
}
function assertEip3009DomainBinding(accepted, token) {
  if (eip3009DomainMatchesCatalog(accepted, token)) return;
  throw new X402PaymentRequiredError(
    `x402 EIP-3009 domain metadata does not match catalog asset ${token.symbol}`
  );
}
function eip3009DomainMatchesCatalog(route, token) {
  const extra = typeof route.extra === "object" && route.extra !== null && !Array.isArray(route.extra) ? route.extra : null;
  const domain = token.eip3009Domain;
  return extra !== null && domain !== null && domain !== void 0 && extra.assetTransferMethod === "eip3009" && extra.name === domain.name && extra.version === domain.version;
}
async function doRequest(fetchImpl, method, url, jsonBody, headers, timeoutSeconds) {
  const init = {
    method,
    headers: {
      ...jsonBody !== null && jsonBody !== void 0 ? { "content-type": "application/json" } : {},
      ...headers
    },
    ...jsonBody !== null && jsonBody !== void 0 ? { body: JSON.stringify(jsonBody) } : {},
    signal: AbortSignal.timeout(timeoutSeconds * 1e3),
    redirect: "manual"
  };
  const resp = await fetchImpl(url, init);
  const content = Buffer.from(await resp.arrayBuffer());
  return {
    status: resp.status,
    content,
    contentType: resp.headers.get("content-type") ?? "",
    headers: resp.headers,
    text: content.toString("utf-8")
  };
}
function maybeJson(resp) {
  if (!resp.contentType.toLowerCase().includes("json")) return null;
  try {
    const data = JSON.parse(resp.text);
    return typeof data === "object" && data !== null && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}
function parseJsonObject(resp) {
  try {
    const data = JSON.parse(resp.text);
    return typeof data === "object" && data !== null && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}
function _challengeFromResponse(resp, bodyJson) {
  if (bodyJson !== null && "accepts" in bodyJson) return bodyJson;
  for (const name of ["PAYMENT-REQUIRED", "X-PAYMENT-REQUIREMENTS"]) {
    const encoded = resp.headers.get(name);
    if (!encoded) continue;
    try {
      return (0, import_http.decodePaymentRequiredHeader)(encoded);
    } catch (cause) {
      throw new X402PaymentRequiredError(
        `x402 402 had invalid ${name} header`,
        { cause }
      );
    }
  }
  if (bodyJson !== null) return bodyJson;
  throw new X402PaymentRequiredError(
    `x402 402 had non-JSON body: ${resp.text.slice(0, 200)}`
  );
}
function settlementFromResponse(resp) {
  if (resp.status < 200 || resp.status >= 300) return void 0;
  for (const name of ["PAYMENT-RESPONSE", "X-PAYMENT-RESPONSE"]) {
    const encoded = resp.headers.get(name);
    if (!encoded) continue;
    const settlement = (0, import_http.decodePaymentResponseHeader)(encoded);
    return {
      transaction: settlement.transaction,
      network: settlement.network
    };
  }
  return void 0;
}
var defaultSleep = (seconds) => new Promise((resolve3) => setTimeout(resolve3, seconds * 1e3));
var sleep = defaultSleep;
async function _fetchPieverseTopup(url, opts) {
  if (url !== `${PIEVERSE_BASE_URL}${PIEVERSE_TOPUP_PATH}` || opts.method !== "POST" || !Number.isFinite(opts.maxUsd) || opts.maxUsd <= 0 || opts.jsonBody?.amountUsd !== opts.maxUsd || !opts.expectedTo?.trim()) {
    throw new X402PaymentRequiredError("Invalid authorized Pieverse recharge.");
  }
  return fetchWithPaymentInternal(
    url,
    { ...opts, allowedHosts: [new URL(PIEVERSE_BASE_URL).hostname] },
    true
  );
}
async function fetchWithPaymentInternal(url, opts, recharge) {
  const trust = paymentTrustForUrl(url, opts.maxUsd);
  const { policy, merchant, configuredExpectedTo } = trust;
  const {
    maxUsd: callerMaxUsd,
    wallet,
    expectedTo = null,
    networkName = "bsc-mainnet",
    asset: assetReference,
    assetReader,
    method = "GET",
    jsonBody = null,
    headers = null,
    allowedHosts = policy.effectiveAllowedHosts,
    fetchImpl = fetch,
    timeout = 30,
    maxRetries = 3,
    baseDelaySeconds = 1
  } = opts;
  _checkHost(url, allowedHosts);
  const maxUsd = recharge ? callerMaxUsd : trust.maxUsd;
  const selectedAsset = resolvePaymentAsset(networkName, assetReference);
  assertMerchantAsset(merchant, selectedAsset);
  if (wallet !== null && wallet !== void 0 && !hasLocalEip3009SigningSurface(wallet)) {
    if (supports(wallet, "x402.pay")) {
      return fetchWithPaymentDelegated(url, {
        maxUsd,
        wallet,
        expectedTo,
        networkName,
        method,
        jsonBody,
        headers,
        merchant,
        configuredExpectedTo,
        budgetTrackerSnapshot: trust.budgetTrackerSnapshot,
        asset: selectedAsset,
        assetReader,
        fetchImpl,
        timeout
      });
    }
    throw new X402UnsupportedWalletError(
      "wallet supports neither sign.typed_data (local EIP-3009 signing) nor x402.pay (delegated payment) \u2014 no x402 buyer path available."
    );
  }
  const extraHeaders = { ...headers ?? {} };
  const initial = await doRequest(
    fetchImpl,
    method,
    url,
    jsonBody,
    extraHeaders,
    timeout
  );
  if (initial.status !== 402) {
    return {
      url,
      statusCode: initial.status,
      content: initial.content,
      json: maybeJson(initial),
      paidUsd: null,
      txPaymentEnvelope: null,
      assetId: null,
      symbol: null,
      tokenAddress: null,
      decimals: null,
      amountAtomic: null,
      paymentProtocol: null,
      paymentMethod: null,
      paymentNetwork: null
    };
  }
  const challenge = _challengeFromResponse(initial, parseJsonObject(initial));
  const alternatives = () => fundedLocalAlternatives(
    challenge,
    wallet,
    assetReader,
    networkName,
    selectedAsset,
    expectedTo,
    merchant,
    configuredExpectedTo,
    maxUsd,
    url
  );
  let accepted;
  try {
    [accepted] = _parseAccepted(
      challenge,
      getNetwork(networkName).chainId,
      selectedAsset.address
    );
  } catch (cause) {
    if (cause instanceof X402AssetMismatchError) {
      throw unavailableAssetError(
        challenge,
        networkName,
        selectedAsset,
        await alternatives()
      );
    }
    if (cause instanceof LocalRouteUnsupportedError) {
      throw new X402UnsupportedWalletRouteError(
        `${selectedAsset.symbol} has no EIP-3009 route usable by this wallet`,
        {
          asset: assetFacts(selectedAsset),
          alternatives: await alternatives(),
          walletRoute: LOCAL_ROUTE_DIAGNOSIS,
          cause
        }
      );
    }
    throw cause;
  }
  const [xPayment, paidOption, amountUsd, amountAtomic] = await signAndBuildEnvelope(challenge, {
    wallet,
    networkName,
    expectedTo,
    merchant,
    configuredExpectedTo,
    maxUsd,
    asset: selectedAsset,
    assetReader,
    alternatives,
    requestedUrl: url,
    accepted
  });
  const paymentMethod = transferMethod(paidOption);
  if (paymentMethod !== "eip3009") {
    throw new X402UnsupportedWalletRouteError(
      `${selectedAsset.symbol} selected a non-EIP-3009 route for a local signer`,
      {
        asset: assetFacts(selectedAsset),
        alternatives: await alternatives(),
        walletRoute: LOCAL_ROUTE_DIAGNOSIS
      }
    );
  }
  const paymentFacts = trustedPaymentFacts(
    `eip155:${getNetwork(networkName).chainId}`,
    selectedAsset,
    amountAtomic,
    amountUsd,
    paymentMethod
  );
  const reservedAgainstDailyCap = !_isDailyCapCountedElsewhere();
  if (reservedAgainstDailyCap) {
    await getSharedBudgetTracker(trust.budgetTrackerSnapshot).reserveUsd(
      amountUsd,
      null,
      "x402_buy"
    );
  }
  const retryHeaders = { ...extraHeaders };
  retryHeaders["X-PAYMENT"] = xPayment;
  retryHeaders["PAYMENT-SIGNATURE"] = xPayment;
  let retry = null;
  let broke = false;
  const attempts = Math.max(1, maxRetries);
  try {
    for (let attempt = 0; attempt < attempts; attempt++) {
      retry = await doRequest(
        fetchImpl,
        method,
        url,
        jsonBody,
        retryHeaders,
        timeout
      );
      if (retry.status !== 402) {
        broke = true;
        break;
      }
      if (attempt < maxRetries - 1) {
        await sleep(baseDelaySeconds * 2 ** attempt);
      }
    }
  } catch (cause) {
    throw new X402PaymentOutcomeUnknownError(
      "x402 paid request failed after the payment envelope was dispatched; verify on-chain and do not retry automatically",
      { cause, paymentFacts }
    );
  }
  if (!broke || retry === null) {
    const ledgerNote = reservedAgainstDailyCap ? ` Note: $${amountUsd.toFixed(6)} was reserved in today's spend ledger (a deliberate over-count that is NOT rolled back); your on-chain balance was NOT necessarily debited \u2014 verify with \`bag wallet balance --network ${networkName}\` before assuming lost funds.` : "";
    throw new X402RetryExhaustedError(
      `x402 retry exhausted after ${maxRetries} attempts (server still returns 402 after payment \u2014 facilitator indexing delay, wrong payment header, or settlement failure).${ledgerNote}`,
      { paymentFacts }
    );
  }
  const settlement = settlementFromResponse(retry);
  return {
    url,
    statusCode: retry.status,
    content: retry.content,
    json: maybeJson(retry),
    paidUsd: amountUsd,
    txPaymentEnvelope: xPayment,
    assetId: selectedAsset.assetId,
    symbol: selectedAsset.symbol,
    tokenAddress: selectedAsset.address,
    decimals: selectedAsset.decimals,
    amountAtomic: amountAtomic.toString(),
    paymentProtocol: "x402",
    paymentMethod,
    paymentNetwork: paymentFacts.network,
    ...settlement !== void 0 ? { settlement } : {}
  };
}
async function fetchWithPaymentDelegated(url, opts) {
  const { maxUsd, wallet, networkName, method, jsonBody, headers } = opts;
  if (headers && Object.keys(headers).length > 0) {
    throw new X402UnsupportedWalletError(
      `this wallet pays through a delegated x402 client which sends the HTTP request itself and cannot attach custom headers (${JSON.stringify(Object.keys(headers).sort())}). Authenticated x402 endpoints need a wallet with sign.typed_data (e.g. kind='evm-local').`
    );
  }
  const expectedTo = resolveExpectedTo(
    opts.expectedTo,
    opts.merchant ?? null,
    opts.configuredExpectedTo
  );
  const network = getNetwork(networkName);
  const selectedAsset = opts.asset;
  const selectedCapAtomic = atomicUsdCap(maxUsd, selectedAsset);
  if (selectedCapAtomic === null) {
    throw new X402BudgetExhaustedError(
      "x402 max_usd must be a finite non-negative decimal number"
    );
  }
  const body = jsonBody !== null && jsonBody !== void 0 ? JSON.stringify(jsonBody) : void 0;
  if (typeof wallet.makeX402Payer !== "function") {
    throw new X402UnsupportedWalletError(
      "wallet advertises x402.pay but exposes no makeX402Payer()"
    );
  }
  const payer = wallet.makeX402Payer({
    expectedPayTo: expectedTo,
    expectedAsset: selectedAsset.address,
    // Pass a plain cap record so the payer creates its tracker inside its own
    // SDK entrypoint. A foreign SessionBudgetTracker can fail the SDK's
    // `instanceof` check in CJS or duplicated-package installations.
    sessionBudget: {
      [selectedAsset.address]: selectedCapAtomic
    }
  });
  const quoted = await payer.quote(url, {
    method,
    ...body !== void 0 ? { body } : {}
  });
  const exactCapability = captureDelegatedExactCapability(payer);
  const networkId = `eip155:${network.chainId}`;
  const catalogCandidates = (quoted.accepts ?? []).filter((option2) => {
    const routeMethod = normalizedDelegatedMethod(option2.transferMethod);
    return option2.network === networkId && option2.scheme === "exact" && option2.asset.toLowerCase() === selectedAsset.address.toLowerCase() && routeMethod !== "permit2-upto" && selectedAsset.b402Methods.includes(routeMethod);
  });
  const routes = catalogVerifiedDelegatedRoutes(
    quoted,
    networkName,
    selectedAsset,
    exactCapability,
    url,
    expectedTo,
    opts.merchant
  );
  const alternatives = () => fundedDelegatedAlternatives(
    quoted,
    payer,
    exactCapability,
    wallet,
    opts.assetReader,
    networkName,
    selectedAsset,
    url,
    expectedTo,
    opts.merchant,
    maxUsd
  );
  if (catalogCandidates.length === 0) {
    throw unavailableAssetError(
      { accepts: quoted.raw.accepts ?? quoted.accepts },
      networkName,
      selectedAsset,
      await alternatives()
    );
  }
  if (routes.length === 0) {
    throw new X402UnsupportedWalletRouteError(
      `${selectedAsset.symbol} has no exact-route payment method this delegated wallet can safely execute`,
      {
        asset: assetFacts(selectedAsset),
        alternatives: await alternatives(),
        walletRoute: delegatedRouteDiagnosis(exactCapability)
      }
    );
  }
  const selectedRoute = selectDelegatedRoute(routes);
  if (selectedRoute === void 0 || exactCapability === null) {
    throw new X402UnsupportedWalletRouteError(
      `${selectedAsset.symbol} has no exact-route payment method this delegated wallet can safely execute`,
      {
        asset: assetFacts(selectedAsset),
        alternatives: await alternatives(),
        walletRoute: delegatedRouteDiagnosis(exactCapability)
      }
    );
  }
  const { option, expectedRoute, amountUsd } = selectedRoute;
  if (option.amount > selectedCapAtomic) {
    throw new X402BudgetExhaustedError(
      `x402 quote demands $${amountUsd.toFixed(6)} > max_usd=$${maxUsd.toFixed(6)}`
    );
  }
  await assertSufficientBalance(
    wallet,
    opts.assetReader,
    networkName,
    selectedAsset,
    option.amount,
    alternatives
  );
  const selectedMethod = normalizedDelegatedMethod(option.transferMethod);
  if (selectedMethod !== "eip3009" && selectedMethod !== "permit2-exact") {
    throw new X402UnsupportedWalletRouteError(
      `${selectedAsset.symbol} selected an unsupported delegated payment method`,
      {
        asset: assetFacts(selectedAsset),
        alternatives: await alternatives(),
        walletRoute: delegatedRouteDiagnosis(exactCapability)
      }
    );
  }
  if (selectedMethod === "permit2-exact") {
    await assertSufficientAllowance(
      wallet,
      opts.assetReader,
      networkName,
      selectedAsset,
      option.amount,
      alternatives
    );
  }
  const paymentFacts = trustedPaymentFacts(
    option.network,
    selectedAsset,
    option.amount,
    amountUsd,
    selectedMethod
  );
  const exactRequestOptions = {
    expectedRoute,
    maxPayment: selectedCapAtomic,
    method,
    ...body !== void 0 ? { body } : {}
  };
  const budgetTracker = getSharedBudgetTracker(opts.budgetTrackerSnapshot);
  const reservedHere = !_isDailyCapCountedElsewhere();
  if (reservedHere) await budgetTracker.reserveUsd(amountUsd);
  const recordPossibleSpend = async () => {
    if (!reservedHere) return;
    await budgetTracker.recordEntry({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      op: "x402_buy",
      amount_usd: amountUsd
    });
  };
  let result;
  try {
    result = await exactCapability.invoke(url, exactRequestOptions);
  } catch (error) {
    await recordPossibleSpend();
    if (!(error instanceof X402BudgetExhaustedError) && error instanceof Error && (error.name === "X402BudgetExhaustedError" || error.name === "X402AmountExceededError")) {
      throw new X402BudgetExhaustedError(error.message);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new X402PaymentOutcomeUnknownError(
      `delegated x402 request failed after dispatch began: ${message}; verify on-chain and do not retry automatically`,
      { cause: error, paymentFacts }
    );
  }
  const resultIsObject = typeof result === "object" && result !== null;
  if (resultIsObject && result.paid === false && result.cacheHit === true) {
    if (reservedHere) await budgetTracker.rollbackUsd(amountUsd);
    const response2 = result.response;
    const isJsonObject = typeof response2 === "object" && response2 !== null && !Array.isArray(response2) && !(response2 instanceof Uint8Array);
    return {
      url,
      statusCode: 200,
      content: response2 instanceof Uint8Array ? Buffer.from(response2) : Buffer.from(
        typeof response2 === "object" && response2 !== null ? JSON.stringify(response2) : String(response2 ?? "")
      ),
      json: isJsonObject ? response2 : null,
      paidUsd: null,
      txPaymentEnvelope: null,
      assetId: null,
      symbol: null,
      tokenAddress: null,
      decimals: null,
      amountAtomic: null,
      paymentProtocol: null,
      paymentMethod: null,
      paymentNetwork: null
    };
  }
  if (!resultIsObject || result.paid !== true) {
    await recordPossibleSpend();
    throw new X402PaymentOutcomeUnknownError(
      "delegated x402 payer returned a malformed payment outcome; verify on-chain and do not retry automatically",
      { paymentFacts }
    );
  }
  await recordPossibleSpend();
  if (result.success !== true || result.amount !== option.amount || typeof result.asset !== "string" || result.asset.toLowerCase() !== selectedAsset.address.toLowerCase() || result.network !== option.network || typeof result.payTo !== "string" || result.payTo.toLowerCase() !== option.payTo.toLowerCase() || result.transferMethod !== selectedMethod || selectedMethod === "permit2-exact" && (typeof result.spenderAddress !== "string" || result.spenderAddress.toLowerCase() !== (expectedRoute.transferMethod === "permit2-exact" ? expectedRoute.spenderAddress.toLowerCase() : ""))) {
    throw new X402PaymentOutcomeUnknownError(
      "delegated x402 payer returned payment terms that do not match the selected route; verify on-chain and do not retry automatically",
      { paymentFacts }
    );
  }
  const response = result.response;
  let content;
  let jsonPayload = null;
  if (typeof response === "object" && response !== null || Array.isArray(response)) {
    if (response instanceof Uint8Array) {
      content = Buffer.from(response);
    } else {
      content = Buffer.from(JSON.stringify(response));
      jsonPayload = typeof response === "object" && response !== null && !Array.isArray(response) ? response : null;
    }
  } else {
    content = Buffer.from(String(response ?? ""));
  }
  const settlement = typeof result.transaction === "string" && result.transaction !== "" ? {
    transaction: result.transaction,
    network: result.network ?? option.network
  } : void 0;
  return {
    url,
    statusCode: 200,
    content,
    json: jsonPayload,
    paidUsd: amountUsd,
    // quoted amount — the CLI surfaces no receipt (S-7)
    txPaymentEnvelope: null,
    // the envelope never leaves the delegated client
    assetId: selectedAsset.assetId,
    symbol: selectedAsset.symbol,
    tokenAddress: selectedAsset.address,
    decimals: selectedAsset.decimals,
    amountAtomic: option.amount.toString(),
    paymentProtocol: "x402",
    paymentMethod: selectedMethod,
    paymentNetwork: option.network,
    ...settlement !== void 0 ? { settlement } : {}
  };
}
async function payChallenge(challenge, opts) {
  const resourceUrl = requireCallerResourceUrl(opts.resourceUrl);
  if (exactResource(challenge.resource, resourceUrl) === null) {
    throw new X402PaymentRequiredError(
      "x402 challenge resource does not exactly match the caller-requested URL"
    );
  }
  const { wallet, expectedTo = null, networkName = "bsc-mainnet" } = opts;
  const trust = paymentTrustForUrl(resourceUrl, opts.maxUsd ?? null);
  const { merchant, maxUsd, configuredExpectedTo } = trust;
  const selectedAsset = resolvePaymentAsset(networkName, opts.asset);
  assertMerchantAsset(merchant, selectedAsset);
  if (!hasLocalEip3009SigningSurface(wallet)) {
    throw new X402UnsupportedWalletError(
      "pay_challenge needs local EIP-3009 signing (sign.typed_data): it returns an X-PAYMENT header for a caller-owned HTTP session, which a delegated x402 client (twak CLI / Altana session payer) cannot produce. Alternative: drive the whole request through fetch_with_payment, or use a wallet kind with sign.typed_data (e.g. 'evm-local') for this flow."
    );
  }
  const alternatives = () => fundedLocalAlternatives(
    challenge,
    wallet,
    opts.assetReader,
    networkName,
    selectedAsset,
    expectedTo,
    merchant,
    configuredExpectedTo,
    maxUsd,
    resourceUrl
  );
  let accepted;
  try {
    [accepted] = _parseAccepted(
      challenge,
      getNetwork(networkName).chainId,
      selectedAsset.address
    );
  } catch (cause) {
    if (cause instanceof X402AssetMismatchError) {
      throw unavailableAssetError(
        challenge,
        networkName,
        selectedAsset,
        await alternatives()
      );
    }
    if (cause instanceof LocalRouteUnsupportedError) {
      throw new X402UnsupportedWalletRouteError(
        `${selectedAsset.symbol} has no EIP-3009 route usable by this wallet`,
        {
          asset: assetFacts(selectedAsset),
          alternatives: await alternatives(),
          walletRoute: LOCAL_ROUTE_DIAGNOSIS,
          cause
        }
      );
    }
    throw cause;
  }
  const [xPayment, , amountUsd, amountAtomic] = await signAndBuildEnvelope(
    challenge,
    {
      wallet,
      networkName,
      expectedTo,
      merchant,
      configuredExpectedTo,
      maxUsd,
      asset: selectedAsset,
      assetReader: opts.assetReader,
      alternatives,
      requestedUrl: resourceUrl,
      accepted
    }
  );
  return {
    header: xPayment,
    amountUsd,
    assetId: selectedAsset.assetId,
    symbol: selectedAsset.symbol,
    tokenAddress: selectedAsset.address,
    decimals: selectedAsset.decimals,
    amountAtomic: amountAtomic.toString()
  };
}
async function quoteUrl(url, opts = {}) {
  const {
    method = "GET",
    jsonBody = null,
    headers = null,
    allowedHosts = null,
    fetchImpl = fetch,
    timeout = 10,
    networkName = "bsc-mainnet",
    asset: assetReference
  } = opts;
  _checkHost(url, allowedHosts);
  const selectedAsset = resolvePaymentAsset(networkName, assetReference);
  const resp = await doRequest(
    fetchImpl,
    method,
    url,
    jsonBody,
    { ...headers ?? {} },
    timeout
  );
  if (resp.status !== 402) {
    throw new X402PaymentRequiredError(
      `Expected 402 from ${url}; got ${resp.status}: ${resp.text.slice(0, 200)}`
    );
  }
  const bodyJson = parseJsonObject(resp);
  if (bodyJson !== null || resp.headers.has("PAYMENT-REQUIRED") || resp.headers.has("X-PAYMENT-REQUIREMENTS")) {
    const challenge = _challengeFromResponse(resp, bodyJson);
    if (opts.networkName === void 0 && opts.asset === void 0) {
      return challenge;
    }
    const network = getNetwork(networkName);
    const accepts = exactAssetOptions(
      challenge,
      network.chainId,
      selectedAsset
    );
    if (accepts.length === 0) {
      throw unavailableAssetError(challenge, networkName, selectedAsset);
    }
    return {
      ...challenge,
      accepts,
      rawAccepts: Array.isArray(challenge.accepts) ? [...challenge.accepts] : [],
      verifiedAlternatives: network.b402Assets().filter(
        (asset) => asset.assetId !== selectedAsset.assetId && asset.b402Methods.includes("eip3009") && exactAssetOptions(challenge, network.chainId, asset).some(
          (entry) => transferMethod(entry) === "eip3009"
        )
      ).map(assetFacts),
      paymentAsset: {
        assetId: selectedAsset.assetId,
        symbol: selectedAsset.symbol,
        tokenAddress: selectedAsset.address,
        decimals: selectedAsset.decimals
      }
    };
  }
  let body;
  try {
    body = JSON.parse(resp.text);
  } catch (cause) {
    throw new X402PaymentRequiredError(
      `x402 402 had non-JSON body: ${resp.text.slice(0, 200)}`,
      { cause }
    );
  }
  throw new X402PaymentRequiredError(
    `x402 402 body was not a JSON object: ${JSON.stringify(body)}`
  );
}

// src/x402/sellerTokens.ts
function defaultUSellerToken(networkName) {
  const asset = getNetwork(networkName).resolveB402PaymentSymbol("U");
  const domain = asset.eip3009Domain;
  if (domain === null) {
    throw new Error(
      `${networkName} default U must have a verified EIP-3009 domain`
    );
  }
  return Object.freeze({
    symbol: "U",
    address: asset.address,
    decimals: asset.decimals,
    eip712Name: domain.name,
    eip712Version: domain.version,
    methods: Object.freeze([...asset.b402Methods])
  });
}
var SELLER_TOKENS = Object.freeze({
  "eip155:56": defaultUSellerToken("bsc-mainnet"),
  "eip155:97": defaultUSellerToken("bsc-testnet")
});

// src/b402/policy.ts
var import_viem3 = require("viem");

// src/x402/sellerMock.ts
var import_node_crypto2 = require("crypto");
var import_b4022 = require("@bnb-chain/b402");
var import_viem4 = require("viem");

// src/x402/sellerB402.ts
var import_node_crypto3 = require("crypto");
var import_b4023 = require("@bnb-chain/b402");
var import_server = require("@bnb-chain/b402/server");
var import_server2 = require("@x402/core/server");

// src/b402/replayStore.ts
var MPP_MAX_TIMEOUT_SECONDS = 300;
var REJECTED_TTL_MS = (MPP_MAX_TIMEOUT_SECONDS + 60) * 1e3;

// src/x402/seller.ts
var import_b4024 = require("@bnb-chain/b402");
var import_server3 = require("@bnb-chain/b402/server");
var import_http2 = require("@x402/core/http");
var import_viem5 = require("viem");

// src/payments/capabilities.ts
var DEFAULT_TIMERS = Object.freeze({
  setInterval(callback, milliseconds) {
    const handle = globalThis.setInterval(callback, milliseconds);
    if (typeof handle === "object" && "unref" in handle) {
      handle.unref();
    }
    return handle;
  },
  clearInterval(handle) {
    globalThis.clearInterval(
      handle
    );
  }
});

// src/x402/seller.ts
var UNAVAILABLE_SUPPORTED_TRANSPORT = Object.freeze({
  async supported() {
    throw new Error("B402 supported-capability transport unavailable");
  }
});

// src/x402/envelope.ts
var INPUT_LIMIT_BYTES = 1024 * 1024;
var OUTPUT_LIMIT_BYTES = 5 * 1024 * 1024;

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
var defaultRetrySleep = (seconds) => new Promise((resolve3) => setTimeout(resolve3, seconds * 1e3));
async function allocateWithSettleRetry(sessionToken, keyHash, amountUsd, opts = {}) {
  const {
    httpClient = null,
    attempts = 6,
    baseDelaySeconds = 1,
    maxDelaySeconds = 8,
    sleep: sleep2 = defaultRetrySleep
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
      await sleep2(delay);
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
function supports2(wallet, capability) {
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
  const paidHeaders = supports2(wallet, "sign.typed_data") ? { Authorization: `Bearer ${sessionToken}` } : null;
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
    this.#renewLock = new Promise((resolve3) => {
      release = resolve3;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BudgetGate,
  BudgetPolicy,
  COLD_START_ENV_VAR,
  DEFAULT_TIMEOUT_SECONDS,
  PIEVERSE_ALLOWED_HOSTS,
  PIEVERSE_BASE_URL,
  PIEVERSE_TOPUP_PATH,
  PieverseAccountBalanceExhaustedError,
  PieverseAuthError,
  PieverseBudgetExhaustedError,
  PieverseBudgetNotAcknowledgedError,
  PieverseColdStartTopupBlockedError,
  PieverseCreditEnsurer,
  PieverseError,
  PieverseKeyNotFoundError,
  PieversePaymentRequiredError,
  PieversePolicy,
  PieverseTopupCapExceededError,
  PieverseTopupWalletPasswordMissingError,
  RetryPolicy,
  SIWE_CHAIN_ID,
  SIWE_DOMAIN,
  SIWE_STATEMENT,
  SIWE_URI,
  TopupBudgetTracker,
  _buildSiweMessage,
  _raiseForStatus,
  _setEnsurerDeps,
  _setTopupDeps,
  allocate,
  allocateWithSettleRetry,
  createKey,
  discoverTopupRecipient,
  getAccountUsage,
  inspectKey,
  listModels,
  makeClient,
  request,
  retrying,
  siweLogin,
  topupX402
});
