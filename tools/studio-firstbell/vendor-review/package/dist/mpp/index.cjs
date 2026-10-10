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

// src/mpp/index.ts
var mpp_exports = {};
__export(mpp_exports, {
  DEFAULT_MPP_MAX_PER_REQUEST_USD: () => DEFAULT_MPP_MAX_PER_REQUEST_USD,
  DEFAULT_MPP_MAX_SETTLEMENT_SECONDS: () => DEFAULT_MPP_MAX_SETTLEMENT_SECONDS,
  MppBudgetExceededError: () => MppBudgetExceededError,
  MppBuyerPolicy: () => MppBuyerPolicy,
  MppError: () => MppError,
  MppHostNotAllowedError: () => MppHostNotAllowedError,
  MppInsecureTransportError: () => MppInsecureTransportError,
  MppInsufficientPaymentAssetBalanceError: () => MppInsufficientPaymentAssetBalanceError,
  MppPaymentAssetBalanceUnavailableError: () => MppPaymentAssetBalanceUnavailableError,
  MppPaymentAssetUnavailableError: () => MppPaymentAssetUnavailableError,
  MppPaymentOutcomeUnknownError: () => MppPaymentOutcomeUnknownError,
  MppPaymentRequiredError: () => MppPaymentRequiredError,
  MppPolicyError: () => MppPolicyError,
  MppRealmMismatchError: () => MppRealmMismatchError,
  MppRecipientMismatchError: () => MppRecipientMismatchError,
  MppRecipientRequiredError: () => MppRecipientRequiredError,
  MppUnsupportedWalletError: () => MppUnsupportedWalletError,
  MppUnsupportedWalletRouteError: () => MppUnsupportedWalletRouteError,
  fetchMppWithPayment: () => fetchMppWithPayment,
  quoteMppUrl: () => quoteMppUrl
});
module.exports = __toCommonJS(mpp_exports);

// src/mpp/buyer.ts
var import_node_path4 = require("path");
var import_client2 = require("@bnb-chain/mpp-b402/client");
var import_mppx = require("mppx");
var import_client3 = require("mppx/client");
var import_viem3 = require("viem");

// src/config.ts
var import_node_fs = require("fs");
var import_node_os = require("os");
var import_node_path = require("path");
var import_smol_toml = require("smol-toml");
var STUDIO_TOML = "studio.toml";
var GLOBAL_REGISTRY_PATH = (0, import_node_path.join)(
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
    linkStat = (0, import_node_fs.lstatSync)(path);
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
    targetStat = (0, import_node_fs.statSync)(path);
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
    return (0, import_node_fs.statSync)(path).isDirectory();
  } catch {
    return false;
  }
}
function selfAndParents(start) {
  const out = [];
  let current = (0, import_node_path.resolve)(start);
  for (; ; ) {
    out.push(current);
    const parent = (0, import_node_path.dirname)(current);
    if (parent === current) return out;
    current = parent;
  }
}
function workspaceBase(root) {
  for (const base of [(0, import_node_path.join)(root, APP_DIR), root]) {
    if (isRegularStudioToml((0, import_node_path.join)(base, "agent", STUDIO_TOML))) return base;
  }
  return null;
}
function findProjectRoot(start) {
  const current = start !== void 0 ? (0, import_node_path.resolve)(start) : process.cwd();
  for (const candidate of selfAndParents(current)) {
    if (isRegularStudioToml((0, import_node_path.join)(candidate, STUDIO_TOML))) return candidate;
  }
  for (const candidate of selfAndParents(current)) {
    const base = workspaceBase(candidate);
    if (base !== null) return (0, import_node_path.join)(base, "agent");
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
    tomlPath = (0, import_node_path.join)(root, STUDIO_TOML);
  } else {
    tomlPath = isDir(path) ? (0, import_node_path.join)(path, STUDIO_TOML) : path;
  }
  isRegularStudioToml(tomlPath);
  return (0, import_smol_toml.parse)((0, import_node_fs.readFileSync)(tomlPath, "utf-8"));
}

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

// src/x402/buyer.ts
var import_node_async_hooks2 = require("async_hooks");
var import_node_crypto = require("crypto");
var import_node_path3 = require("path");
var import_b402 = require("@bnb-chain/b402");
var import_sdk2 = require("@bnbagent/sdk");
var import_x402 = require("@bnbagent/sdk/x402");
var import_http = require("@x402/core/http");
var import_viem = require("viem");

// src/pieverse/client.ts
var import_node_async_hooks = require("async_hooks");
var retryPolicyStore = new import_node_async_hooks.AsyncLocalStorage();

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

// src/x402/policy.ts
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");
var import_proper_lockfile = __toESM(require("proper-lockfile"), 1);

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
        JSON.parse((0, import_node_fs2.readFileSync)(this.ledgerPath, "utf-8"))
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
      (0, import_node_fs2.mkdirSync)((0, import_node_path2.dirname)(this.ledgerPath), { recursive: true });
      const tmp = `${this.ledgerPath}.tmp`;
      (0, import_node_fs2.writeFileSync)(
        tmp,
        JSON.stringify({
          day: this.#currentDay,
          spent_usd: this.#spentTodayUsd,
          entries: this.#entries.slice(-MAX_LEDGER_ENTRIES)
        }),
        "utf-8"
      );
      (0, import_node_fs2.renameSync)(tmp, this.ledgerPath);
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
      (0, import_node_fs2.mkdirSync)((0, import_node_path2.dirname)(this.ledgerPath), { recursive: true });
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
  const lexicalRoot = (0, import_node_path2.resolve)(projectRoot);
  const absentSuffix = [];
  let existingCandidate = lexicalRoot;
  while (true) {
    try {
      (0, import_node_fs2.lstatSync)(existingCandidate);
      break;
    } catch (cause) {
      if (cause.code !== "ENOENT") {
        throw cause;
      }
      const parent = (0, import_node_path2.dirname)(existingCandidate);
      if (parent === existingCandidate) {
        throw cause;
      }
      absentSuffix.unshift((0, import_node_path2.basename)(existingCandidate));
      existingCandidate = parent;
    }
  }
  const physicalCandidate = import_node_fs2.realpathSync.native(existingCandidate);
  if (!(0, import_node_fs2.statSync)(physicalCandidate).isDirectory()) {
    throw new TypeError(
      `projectRoot must resolve to a directory: ${lexicalRoot}`
    );
  }
  return (0, import_node_path2.join)(physicalCandidate, ...absentSuffix);
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
  const ledger = canonical.projectRoot !== null ? (0, import_node_path2.join)(canonical.projectRoot, ".studio", "spend-ledger.json") : null;
  const tracker = new BudgetTracker({
    dailyCapUsd: canonical.dailyCapUsd,
    ledgerPath: ledger
  });
  sharedTrackers.set(canonical.key, tracker);
  return tracker;
}

// src/x402/buyer.ts
var PERMIT2_ADDRESS = (0, import_viem.getAddress)(import_b402.B402_PERMIT2_ADDRESS);
var dailyCapMarker = new import_node_async_hooks2.AsyncLocalStorage();
function _isDailyCapCountedElsewhere() {
  return dailyCapMarker.getStore() === true;
}
var LOCAL_EXACT_METHODS = Object.freeze(["eip3009"]);
var SETTLABLE_EXACT_METHODS = Object.freeze(["eip3009", "permit2-exact"]);
var LOCAL_ROUTE_DIAGNOSIS = Object.freeze({
  branch: "local",
  payerExactMethods: null
});

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
function caip2(chainId) {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error(`invalid EIP-155 chain id: ${chainId}`);
  }
  return `eip155:${chainId}`;
}
function usdToAtomic(usd, decimals) {
  if (!Number.isSafeInteger(decimals) || decimals < 0) {
    throw new Error(`invalid token decimals: ${decimals}`);
  }
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(usd));
  if (!match) throw new Error(`invalid USD amount: ${String(usd)}`);
  const fractional = match[2] ?? "";
  if (fractional.length > decimals && /[1-9]/.test(fractional.slice(decimals))) {
    throw new Error(
      `USD amount ${String(usd)} exceeds token precision (${decimals})`
    );
  }
  const atomic = BigInt(match[1]) * 10n ** BigInt(decimals) + BigInt((fractional.slice(0, decimals) || "0").padEnd(decimals, "0"));
  return atomic.toString();
}

// src/mpp/errors.ts
var MppError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = new.target.name;
  }
};
var MppHostNotAllowedError = class extends MppError {
};
var MppInsecureTransportError = class extends MppError {
};
var MppPaymentRequiredError = class extends MppError {
  paymentDispatched = false;
};
var MppPolicyError = class extends MppError {
};
var MppRecipientRequiredError = class extends MppPolicyError {
};
var MppRecipientMismatchError = class extends MppPolicyError {
};
var MppRealmMismatchError = class extends MppPolicyError {
};
var MppBudgetExceededError = class extends MppPolicyError {
};
var MppUnsupportedWalletError = class extends MppError {
};
var MppPaymentAssetUnavailableError = class extends MppError {
  paymentDispatched = false;
  assetId;
  symbol;
  tokenAddress;
  addressPending;
  decimals;
  retryHint;
  alternatives;
  constructor(message, options) {
    super(message, options);
    this.assetId = options.asset.assetId;
    this.symbol = options.asset.symbol;
    this.tokenAddress = options.asset.tokenAddress;
    this.addressPending = options.asset.addressPending === true;
    this.decimals = options.asset.decimals;
    this.retryHint = options.asset.retryHint;
    this.alternatives = Object.freeze([...options.alternatives ?? []]);
  }
};
var MppUnsupportedWalletRouteError = class extends MppPaymentAssetUnavailableError {
};
var MppPaymentAssetBalanceUnavailableError = class extends MppPaymentAssetUnavailableError {
};
var MppInsufficientPaymentAssetBalanceError = class extends MppPaymentAssetUnavailableError {
  requiredAtomic;
  currentAtomic;
  requiredHuman;
  currentHuman;
  constructor(message, options) {
    super(message, options);
    this.requiredAtomic = options.requiredAtomic;
    this.currentAtomic = options.currentAtomic;
    this.requiredHuman = options.requiredHuman;
    this.currentHuman = options.currentHuman;
  }
};
var MppPaymentOutcomeUnknownError = class extends MppError {
  paymentDispatched = true;
  amountUsd;
  constructor(message, options = {}) {
    super(message, options);
    this.amountUsd = options.amountUsd ?? null;
  }
};

// src/mpp/policy.ts
var import_node_net = require("net");
var import_viem2 = require("viem");
var DEFAULT_MPP_MAX_PER_REQUEST_USD = 1;
var DEFAULT_MPP_MAX_SETTLEMENT_SECONDS = 300;
var MAX_MPP_SETTLEMENT_SECONDS = 3600;
var MPP_NETWORK_NAMES = ["bsc-mainnet", "bsc-testnet"];
var MppBuyerPolicy = class _MppBuyerPolicy {
  maxPerRequestUsd;
  maxSettlementSeconds;
  allowedHosts;
  expectedRecipient;
  expectedRealm;
  merchants;
  constructor(fields = {}) {
    if (!isRecord2(fields)) {
      throw new MppPolicyError("MppBuyerPolicy fields must be an object");
    }
    this.maxPerRequestUsd = fields.maxPerRequestUsd === void 0 ? DEFAULT_MPP_MAX_PER_REQUEST_USD : requiredNonNegativeNumber(
      fields.maxPerRequestUsd,
      "maxPerRequestUsd"
    );
    this.maxSettlementSeconds = fields.maxSettlementSeconds === void 0 ? DEFAULT_MPP_MAX_SETTLEMENT_SECONDS : requiredSettlementSeconds(
      fields.maxSettlementSeconds,
      "maxSettlementSeconds"
    );
    this.allowedHosts = Object.freeze(
      uniqueHosts(
        fields.allowedHosts === void 0 ? [] : requireStringArray(fields.allowedHosts, "allowedHosts"),
        "allowedHosts"
      )
    );
    this.expectedRecipient = fields.expectedRecipient === void 0 || fields.expectedRecipient === null ? null : requiredAddress(fields.expectedRecipient, "expectedRecipient");
    this.expectedRealm = fields.expectedRealm === void 0 || fields.expectedRealm === null ? null : requiredRealm(fields.expectedRealm, "expectedRealm");
    const merchants = fields.merchants === void 0 ? [] : requireMerchantArray(fields.merchants, "merchants");
    this.merchants = Object.freeze(
      merchants.map(
        (merchant, index) => normalizeMerchant(merchant, `merchants[${index}]`)
      )
    );
    Object.freeze(this);
  }
  get effectiveAllowedHosts() {
    return Object.freeze(
      uniqueHosts(
        [
          ...this.allowedHosts,
          ...this.merchants.map((merchant) => merchant.domain)
        ],
        "effectiveAllowedHosts"
      )
    );
  }
  merchantForUrl(url) {
    let host;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return null;
    }
    return this.merchants.find(
      (merchant) => merchant.domain.toLowerCase() === host
    ) ?? null;
  }
  static fromToml(cfg) {
    if (cfg === null || cfg === void 0) return new _MppBuyerPolicy();
    const root = requireTable(cfg, "studio.toml");
    if (!hasOwn(root, "payments")) return new _MppBuyerPolicy();
    const payments = requireTable(root.payments, "payments");
    if (!hasOwn(payments, "mpp")) return new _MppBuyerPolicy();
    const mpp = requireTable(payments.mpp, "payments.mpp");
    const merchants = parseMerchants(mpp);
    return new _MppBuyerPolicy({
      ...hasOwn(mpp, "max_per_request_usd") ? {
        maxPerRequestUsd: requiredNonNegativeNumber(
          mpp.max_per_request_usd,
          "payments.mpp.max_per_request_usd"
        )
      } : {},
      ...hasOwn(mpp, "max_settlement_seconds") ? {
        maxSettlementSeconds: requiredSettlementSeconds(
          mpp.max_settlement_seconds,
          "payments.mpp.max_settlement_seconds"
        )
      } : {},
      allowedHosts: parseAllowedHosts(mpp),
      expectedRecipient: hasOwn(mpp, "expected_recipient") ? requiredAddress(
        mpp.expected_recipient,
        "payments.mpp.expected_recipient"
      ) : null,
      expectedRealm: hasOwn(mpp, "expected_realm") ? requiredRealm(mpp.expected_realm, "payments.mpp.expected_realm") : null,
      merchants
    });
  }
};
function parseMerchants(mpp) {
  if (!hasOwn(mpp, "merchants")) return [];
  const table = requireTable(mpp.merchants, "payments.mpp.merchants");
  const merchants = [];
  for (const [name, raw] of Object.entries(table)) {
    const field = `payments.mpp.merchants.${name}`;
    const merchant = requireTable(raw, field);
    const domain = requiredHost(merchant.domain, `${field}.domain`);
    const realm = requiredRealm(merchant.realm, `${field}.realm`);
    const payTo = requiredAddress(merchant.pay_to, `${field}.pay_to`);
    const network = hasOwn(merchant, "network") ? requiredMerchantNetwork(merchant.network, `${field}.network`) : void 0;
    const asset = hasOwn(merchant, "asset") ? requiredAddress(merchant.asset, `${field}.asset`) : void 0;
    const perCallCapUsd = hasOwn(merchant, "per_call_cap_usd") ? requiredNonNegativeNumber(
      merchant.per_call_cap_usd,
      `${field}.per_call_cap_usd`
    ) : void 0;
    const verified = hasOwn(merchant, "verified") ? requiredBoolean(merchant.verified, `${field}.verified`) : false;
    merchants.push(
      Object.freeze({
        name,
        domain,
        realm,
        payTo,
        ...network !== void 0 ? { network } : {},
        ...asset !== void 0 ? { asset } : {},
        ...perCallCapUsd !== void 0 ? { perCallCapUsd } : {},
        verified
      })
    );
  }
  return merchants;
}
function parseAllowedHosts(mpp) {
  if (!hasOwn(mpp, "allowed_hosts")) return [];
  const raw = mpp.allowed_hosts;
  if (!Array.isArray(raw)) {
    throw new MppPolicyError(
      "payments.mpp.allowed_hosts must be an array of non-empty host strings"
    );
  }
  return raw.map(
    (host, index) => requiredHost(host, `payments.mpp.allowed_hosts[${index}]`)
  );
}
function requiredAddress(value, field) {
  if (typeof value !== "string" || value.trim() === "" || !(0, import_viem2.isAddress)(value)) {
    throw new MppPolicyError(`${field} must be a valid EVM address`);
  }
  return (0, import_viem2.getAddress)(value);
}
function requiredHost(value, field) {
  if (typeof value !== "string" || value === "" || value !== value.trim()) {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
  if (/\s/u.test(value)) {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
  return normalizeHost(value, field);
}
function requiredRealm(value, field) {
  return requiredString(value, field).toLowerCase();
}
function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new MppPolicyError(`${field} must be a non-empty string`);
  }
  return value.trim();
}
function requiredBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new MppPolicyError(`${field} must be a boolean`);
  }
  return value;
}
function requiredNonNegativeNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new MppPolicyError(`${field} must be a finite non-negative number`);
  }
  return value;
}
function requiredSettlementSeconds(value, field) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > MAX_MPP_SETTLEMENT_SECONDS) {
    throw new MppPolicyError(
      `${field} must be a safe integer between 1 and ${MAX_MPP_SETTLEMENT_SECONDS}`
    );
  }
  return value;
}
function requireTable(value, field) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MppPolicyError(`${field} must be a table`);
  }
  return value;
}
function hasOwn(table, key) {
  return Object.hasOwn(table, key);
}
function requireStringArray(value, field) {
  if (!Array.isArray(value)) {
    throw new MppPolicyError(`${field} must be an array of bare hostnames`);
  }
  return value;
}
function requireMerchantArray(value, field) {
  if (!Array.isArray(value)) {
    throw new MppPolicyError(`${field} must be an array of merchant objects`);
  }
  return value;
}
function uniqueHosts(values, field) {
  return [
    ...new Set(
      values.map((value, index) => requiredHost(value, `${field}[${index}]`))
    )
  ];
}
function normalizeHost(value, field) {
  if (value.startsWith("[") || value.endsWith("]")) {
    const inner = value.slice(1, -1);
    if (!value.startsWith("[") || !value.endsWith("]") || inner === "" || (0, import_node_net.isIP)(inner) !== 6) {
      throw new MppPolicyError(`${field} must be a bare normalized hostname`);
    }
    return canonicalUrlHost(value, field);
  }
  if ((0, import_node_net.isIP)(value) === 4) return canonicalUrlHost(value, field);
  if (value.includes(":") || /[/?#@*\\[\]]/u.test(value) || value.length > 253) {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
  const labels = value.split(".");
  if (labels.some(
    (label) => label.length === 0 || label.length > 63 || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/u.test(label)
  )) {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
  const canonical = canonicalUrlHost(value, field);
  if (canonical !== value.toLowerCase()) {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
  return canonical;
}
function canonicalUrlHost(value, field) {
  try {
    return new URL(`https://${value}`).hostname.toLowerCase();
  } catch {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
}
function normalizeMerchant(value, field) {
  if (!isRecord2(value)) {
    throw new MppPolicyError(`${field} must be a merchant object`);
  }
  const name = requiredString(value.name, `${field}.name`);
  const domain = requiredHost(value.domain, `${field}.domain`);
  const realm = requiredRealm(value.realm, `${field}.realm`);
  const payTo = requiredAddress(value.payTo, `${field}.payTo`);
  const network = value.network === void 0 ? void 0 : requiredMerchantNetwork(value.network, `${field}.network`);
  const asset = value.asset === void 0 ? void 0 : requiredAddress(value.asset, `${field}.asset`);
  const perCallCapUsd = value.perCallCapUsd === void 0 ? void 0 : requiredNonNegativeNumber(
    value.perCallCapUsd,
    `${field}.perCallCapUsd`
  );
  const verified = requiredBoolean(value.verified, `${field}.verified`);
  return Object.freeze({
    name,
    domain,
    realm,
    payTo,
    ...network !== void 0 ? { network } : {},
    ...asset !== void 0 ? { asset } : {},
    ...perCallCapUsd !== void 0 ? { perCallCapUsd } : {},
    verified
  });
}
function requiredMerchantNetwork(value, field) {
  if (typeof value !== "string" || value === "" || value !== value.trim()) {
    throw new MppPolicyError(
      `${field} must be a supported canonical eip155 CAIP-2 network`
    );
  }
  const raw = value;
  const match = /^eip155:([1-9]\d*)$/u.exec(raw);
  if (match === null) {
    throw new MppPolicyError(
      `${field} must be a supported canonical eip155 CAIP-2 network`
    );
  }
  const chainId = Number(match[1]);
  if (!Number.isSafeInteger(chainId)) {
    throw new MppPolicyError(
      `${field} must be a supported canonical eip155 CAIP-2 network`
    );
  }
  const networkName = MPP_NETWORK_NAMES.find(
    (name) => getNetwork(name).chainId === chainId
  );
  if (networkName === void 0) {
    throw new MppPolicyError(
      `${field} must be a supported canonical eip155 CAIP-2 network`
    );
  }
  return `eip155:${getNetwork(networkName).chainId}`;
}
function mppNetworkNameFromCaip2(network) {
  const canonical = requiredMerchantNetwork(network, "merchant network");
  const chainId = Number(canonical.slice("eip155:".length));
  const networkName = MPP_NETWORK_NAMES.find(
    (name) => getNetwork(name).chainId === chainId
  );
  if (networkName === void 0) {
    throw new MppPolicyError("merchant network is not supported by Studio");
  }
  return networkName;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/mpp/buyer.ts
async function quoteMppUrl(url, options = {}) {
  const policy = resolvePolicy(options.policy);
  const allowedHosts = options.allowedHosts === void 0 ? policy.effectiveAllowedHosts : options.allowedHosts;
  assertTarget(url, allowedHosts, options.allowInsecureLoopback ?? false);
  assertRequestHeaders(options.headers);
  const networkName = options.networkName ?? "bsc-mainnet";
  const asset = resolveMppAsset(networkName, options.asset);
  const response = await requestOnce(url, options);
  const challenges = await nativeChallenges(response.clone());
  const selected = selectOffer(challenges, networkName, asset);
  if (response.status === 402 && selected === null) {
    throw mppUnavailableAssetError(challenges, networkName, asset);
  }
  const body = await readBody(response);
  return {
    url,
    statusCode: response.status,
    challenge: selected,
    challenges: challenges.map((challenge) => ({ ...challenge })),
    verifiedAlternatives: mppVerifiedAlternatives(
      challenges,
      networkName,
      asset
    ),
    content: body.content,
    json: body.json
  };
}
async function fetchMppWithPayment(url, options) {
  const paymentAttempt = mppPaymentAttempt(options.policy);
  const { policy, budgetTracker } = paymentAttempt;
  const allowedHosts = options.allowedHosts === void 0 ? policy.effectiveAllowedHosts : options.allowedHosts;
  assertTarget(url, allowedHosts, options.allowInsecureLoopback ?? false);
  assertRequestHeaders(options.headers);
  if (!Number.isFinite(options.maxUsd) || options.maxUsd <= 0) {
    throw new MppBudgetExceededError("maxUsd must be a positive number");
  }
  const merchant = policy.merchantForUrl(url);
  const maxUsd = Math.min(
    options.maxUsd,
    policy.maxPerRequestUsd,
    merchant?.perCallCapUsd ?? Number.POSITIVE_INFINITY
  );
  const networkName = options.networkName ?? networkNameFromMerchant(merchant);
  const network = getNetwork(networkName);
  const networkId = caip2(network.chainId);
  const token = resolveMppAsset(networkName, options.asset);
  if (!token.b402Methods.includes("eip3009")) {
    throw new MppUnsupportedWalletRouteError(
      `${token.symbol} is Permit2-only; the native MPP buyer does not enable Permit2 in this release`,
      { asset: mppAssetFacts(token) }
    );
  }
  assertWallet(options.wallet);
  const expectedRecipient = resolveExpectedRecipient(
    options.expectedRecipient,
    merchant,
    policy
  );
  const expectedRealm = resolveExpectedRealm(
    url,
    options.expectedRealm,
    merchant,
    policy
  );
  if (merchant?.network && merchant.network !== networkId) {
    throw new MppPaymentRequiredError(
      `trusted merchant network ${merchant.network} does not match ${networkId}`
    );
  }
  if (merchant?.asset && (0, import_viem3.getAddress)(merchant.asset) !== (0, import_viem3.getAddress)(token.address)) {
    throw new MppPaymentRequiredError(
      `trusted merchant asset ${merchant.asset} does not match selected ${token.address}`
    );
  }
  const maxAtomic = BigInt(
    usdToAtomic(decimalText(maxUsd, token.decimals), token.decimals)
  );
  const method = (0, import_client2.charge)({
    account: walletAccount(options.wallet),
    methods: ["eip3009"],
    allowedNetworks: [networkId],
    allowedCurrencies: [
      {
        network: networkId,
        address: token.address,
        decimals: token.decimals
      }
    ],
    maxAtomicAmount: maxAtomic,
    maxSettlementSeconds: policy.maxSettlementSeconds
  });
  const paymentState = {
    selected: null,
    dispatched: false,
    reservedAmountUsd: null,
    budgetTracker: null,
    challenges: []
  };
  const baseFetch = options.fetchImpl ?? globalThis.fetch;
  const trackedFetch = async (input, init) => {
    const outgoing = new Request(input, init);
    if (/^Payment\s+/i.test(outgoing.headers.get("authorization") ?? "")) {
      paymentState.dispatched = true;
    }
    const signal = init?.signal ?? AbortSignal.timeout(options.timeoutMs ?? 3e4);
    const response2 = await baseFetch(input, { ...init, signal });
    if (response2.status === 402 && !paymentState.dispatched) {
      paymentState.challenges = await nativeChallenges(response2.clone());
    }
    return response2;
  };
  const client = import_client3.Mppx.create({
    methods: [method],
    orderChallenges: method.prefer(["eip3009"]),
    maxPaymentRetries: 1,
    polyfill: false,
    fetch: trackedFetch,
    onChallenge: async (challenge, { createCredential }) => {
      try {
        paymentState.selected = offerFromChallenge(
          challenge,
          networkName,
          token
        );
      } catch (cause) {
        throw mppUnavailableAssetError([challenge], networkName, token, cause);
      }
      enforceTrust(
        paymentState.selected,
        expectedRecipient,
        expectedRealm,
        token,
        maxAtomic
      );
      const required = BigInt(paymentState.selected.amountAtomic);
      const current = await readMppBalance(
        options.wallet,
        options.assetReader,
        networkName,
        token
      );
      if (current < required) {
        const alternatives = await mppFundedAlternatives(
          paymentState.challenges,
          options.wallet,
          options.assetReader,
          networkName,
          token,
          expectedRecipient,
          expectedRealm,
          maxAtomic
        );
        throwMppInsufficientBalance(token, required, current, alternatives);
      }
      if (options.countDailyBudget !== false && !_isDailyCapCountedElsewhere()) {
        await budgetTracker.reserveUsd(
          paymentState.selected.amountUsd,
          null,
          "mpp_buy"
        );
        paymentState.reservedAmountUsd = paymentState.selected.amountUsd;
        paymentState.budgetTracker = budgetTracker;
      }
      return createCredential();
    }
  });
  let response;
  try {
    response = await client.fetch(url, requestInit(options));
  } catch (cause) {
    if (paymentState.dispatched) {
      throw new MppPaymentOutcomeUnknownError(
        "MPP payment credential was dispatched but no reliable response was received; do not retry automatically",
        { cause, amountUsd: paymentState.selected?.amountUsd ?? null }
      );
    }
    await rollbackUnsentBudget(paymentState);
    if (cause instanceof X402BudgetExhaustedError && cause.cause !== void 0) {
      throw new MppPaymentRequiredError(
        "MPP buyer refusing to sign because the spend ledger could not be safely reserved",
        { cause }
      );
    }
    if (cause instanceof Error && cause.message.startsWith("No method found for challenges")) {
      throw new MppPaymentRequiredError(
        "server returned 402 without a supported native MPP b402.charge challenge",
        { cause }
      );
    }
    throw cause;
  }
  let body;
  try {
    body = await readBody(response);
  } catch (cause) {
    if (paymentState.dispatched) {
      throw new MppPaymentOutcomeUnknownError(
        "MPP payment credential was dispatched but response body could not be read; do not retry automatically",
        { cause, amountUsd: paymentState.selected?.amountUsd ?? null }
      );
    }
    await rollbackUnsentBudget(paymentState);
    throw cause;
  }
  if (!paymentState.dispatched) {
    await rollbackUnsentBudget(paymentState);
    return {
      url,
      statusCode: response.status,
      content: body.content,
      json: body.json,
      paidUsd: null,
      paymentOutcome: "not-required",
      receipt: null,
      challenge: null,
      assetId: null,
      symbol: null,
      tokenAddress: null,
      decimals: null,
      amountAtomic: null
    };
  }
  const receipt = receiptFromResponse(response);
  const confirmed = receipt?.method === "b402" && receipt.status === "success";
  if (!confirmed) {
    throw new MppPaymentOutcomeUnknownError(
      "MPP payment credential was dispatched without a confirmed success receipt; do not retry automatically",
      { amountUsd: paymentState.selected?.amountUsd ?? null }
    );
  }
  return {
    url,
    statusCode: response.status,
    content: body.content,
    json: body.json,
    paidUsd: paymentState.selected?.amountUsd ?? null,
    paymentOutcome: "confirmed",
    receipt,
    challenge: paymentState.selected,
    assetId: paymentState.selected?.assetId ?? null,
    symbol: paymentState.selected?.symbol ?? null,
    tokenAddress: paymentState.selected?.asset ?? null,
    decimals: paymentState.selected?.decimals ?? null,
    amountAtomic: paymentState.selected?.amountAtomic ?? null
  };
}
async function rollbackUnsentBudget(state) {
  if (state.reservedAmountUsd === null || state.budgetTracker === null) return;
  await state.budgetTracker.rollbackUsd(state.reservedAmountUsd);
  state.reservedAmountUsd = null;
  state.budgetTracker = null;
}
function resolveMppAsset(networkName, reference) {
  const network = getNetwork(networkName);
  try {
    return network.resolveB402PaymentSymbol(reference?.trim() || "U");
  } catch (cause) {
    const raw = reference?.trim() || "U";
    throw new MppPaymentAssetUnavailableError(
      `payment asset ${raw} is not available on ${networkName}`,
      {
        cause,
        asset: {
          assetId: raw,
          symbol: raw,
          tokenAddress: null,
          addressPending: false,
          decimals: 0,
          retryHint: `--asset ${raw}`
        }
      }
    );
  }
}
function mppAssetFacts(asset) {
  return Object.freeze({
    assetId: asset.assetId,
    symbol: asset.symbol,
    tokenAddress: asset.address,
    addressPending: false,
    decimals: asset.decimals,
    retryHint: `--asset ${asset.symbol}`
  });
}
function mppUnavailableAssetError(challenges, networkName, selected, cause) {
  const network = getNetwork(networkName);
  const alternatives = network.b402Assets().filter(
    (asset) => asset.assetId !== selected.assetId && asset.b402Methods.includes("eip3009") && selectOffer(challenges, networkName, asset) !== null
  ).map(mppAssetFacts);
  return new MppPaymentAssetUnavailableError(
    `the endpoint does not offer ${selected.symbol} on ${networkName}`,
    { cause, asset: mppAssetFacts(selected), alternatives }
  );
}
function mppVerifiedAlternatives(challenges, networkName, selected) {
  return Object.freeze(
    getNetwork(networkName).b402Assets().filter(
      (asset) => asset.assetId !== selected.assetId && asset.b402Methods.includes("eip3009")
    ).map((asset) => selectOffer(challenges, networkName, asset)).filter((offer) => offer !== null)
  );
}
async function readMppBalance(wallet, reader, networkName, asset) {
  const request = {
    networkName,
    owner: (0, import_viem3.getAddress)(wallet.address),
    tokenAddress: asset.address
  };
  let current;
  try {
    if (reader) current = await reader.balanceOf(request);
    else if (wallet.readTokenBalance)
      current = await wallet.readTokenBalance(request);
    else {
      const network = getNetwork(networkName);
      const client = (0, import_viem3.createPublicClient)({ transport: (0, import_viem3.http)(network.rpcUrl) });
      current = await client.readContract({
        address: asset.address,
        abi: import_viem3.erc20Abi,
        functionName: "balanceOf",
        args: [request.owner]
      });
    }
  } catch (cause) {
    throw new MppPaymentAssetBalanceUnavailableError(
      `could not verify ${asset.symbol} balance before payment`,
      { cause, asset: mppAssetFacts(asset) }
    );
  }
  return current;
}
function throwMppInsufficientBalance(asset, required, current, alternatives) {
  throw new MppInsufficientPaymentAssetBalanceError(
    `insufficient ${asset.symbol} balance; Studio did not switch assets or pay`,
    {
      asset: mppAssetFacts(asset),
      requiredAtomic: required.toString(),
      currentAtomic: current.toString(),
      requiredHuman: (0, import_viem3.formatUnits)(required, asset.decimals),
      currentHuman: (0, import_viem3.formatUnits)(current, asset.decimals),
      alternatives
    }
  );
}
async function mppFundedAlternatives(challenges, wallet, reader, networkName, selected, expectedRecipient, expectedRealm, maxAtomic) {
  const alternatives = [];
  for (const asset of getNetwork(networkName).b402Assets()) {
    if (asset.assetId === selected.assetId || !asset.b402Methods.includes("eip3009")) {
      continue;
    }
    const offer = selectOffer(challenges, networkName, asset);
    if (offer === null) continue;
    try {
      enforceTrust(offer, expectedRecipient, expectedRealm, asset, maxAtomic);
      const current = await readMppBalance(wallet, reader, networkName, asset);
      if (current < BigInt(offer.amountAtomic)) continue;
    } catch {
      continue;
    }
    alternatives.push(mppAssetFacts(asset));
  }
  return Object.freeze(alternatives);
}
function selectOffer(challenges, networkName, asset) {
  for (const challenge of challenges) {
    if (challenge.method !== "b402" || challenge.intent !== "charge") continue;
    try {
      return offerFromChallenge(challenge, networkName, asset);
    } catch {
    }
  }
  return null;
}
function offerFromChallenge(challenge, networkName, token) {
  if (challenge.method !== "b402" || challenge.intent !== "charge") {
    throw new MppPaymentRequiredError(
      `expected native MPP b402.charge challenge, got ${String(challenge.method)}.${String(challenge.intent)}`
    );
  }
  const request = asRecord(challenge.request);
  const details = asRecord(request.methodDetails);
  const network = String(details.network ?? "");
  const expectedNetwork = caip2(getNetwork(networkName).chainId);
  if (network !== expectedNetwork) {
    throw new MppPaymentRequiredError(
      `MPP challenge network ${network || "(missing)"} does not match ${expectedNetwork}`
    );
  }
  const amount = String(request.amount ?? "");
  if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) {
    throw new MppPaymentRequiredError(
      "MPP challenge amount must be positive atomic units"
    );
  }
  const currency = String(request.currency ?? "");
  const recipient = String(request.recipient ?? "");
  if (!(0, import_viem3.isAddress)(currency) || (0, import_viem3.getAddress)(currency) !== (0, import_viem3.getAddress)(token.address)) {
    throw new MppPaymentRequiredError(
      `MPP challenge currency ${currency || "(missing)"} does not match selected ${token.symbol} on ${network}`
    );
  }
  if (!(0, import_viem3.isAddress)(recipient)) {
    throw new MppPaymentRequiredError(
      "MPP challenge recipient is not an EVM address"
    );
  }
  const method = String(details.assetTransferMethod ?? "");
  if (method === "permit2-upto" || !token.b402Methods.includes(method) || method !== "eip3009" && method !== "permit2-exact") {
    throw new MppPaymentRequiredError(
      `MPP challenge transfer method ${method || "(missing)"} is not catalog-approved for ${token.symbol}`
    );
  }
  if (details.decimals !== token.decimals) {
    throw new MppPaymentRequiredError(
      `MPP challenge decimals ${String(details.decimals)} do not match buyer-owned token facts (${token.decimals})`
    );
  }
  if (method === "eip3009") {
    const eip712 = asRecord(details.eip712);
    if (eip712.name !== token.eip3009Domain?.name || eip712.version !== token.eip3009Domain?.version) {
      throw new MppPaymentRequiredError(
        "MPP challenge EIP-712 token domain does not match buyer-owned token facts"
      );
    }
  }
  if (!(0, import_viem3.isAddress)(String(details.signerAddress ?? ""))) {
    throw new MppPaymentRequiredError("MPP challenge signerAddress is invalid");
  }
  const maxTimeoutSeconds = Number(details.maxTimeoutSeconds);
  if (!Number.isSafeInteger(maxTimeoutSeconds) || maxTimeoutSeconds <= 0) {
    throw new MppPaymentRequiredError(
      "MPP challenge maxTimeoutSeconds is invalid"
    );
  }
  const realm = String(challenge.realm ?? "").trim().toLowerCase();
  if (!realm)
    throw new MppPaymentRequiredError("MPP challenge realm is missing");
  return Object.freeze({
    challengeId: String(challenge.id ?? ""),
    realm,
    ...challenge.expires ? { expires: String(challenge.expires) } : {},
    network,
    asset: (0, import_viem3.getAddress)(currency),
    assetId: token.assetId,
    symbol: token.symbol,
    recipient: (0, import_viem3.getAddress)(recipient),
    transferMethod: method,
    amountAtomic: amount,
    amountUsd: Number((0, import_viem3.formatUnits)(BigInt(amount), token.decimals)),
    decimals: token.decimals,
    maxTimeoutSeconds
  });
}
function enforceTrust(offer, expectedRecipient, expectedRealm, token, maxAtomic) {
  if ((0, import_viem3.getAddress)(offer.recipient) !== expectedRecipient) {
    throw new MppRecipientMismatchError(
      `MPP recipient ${offer.recipient} does not match trusted recipient ${expectedRecipient}`
    );
  }
  if (offer.realm.toLowerCase() !== expectedRealm.toLowerCase()) {
    throw new MppRealmMismatchError(
      `MPP realm ${offer.realm} does not match trusted realm ${expectedRealm}`
    );
  }
  if ((0, import_viem3.getAddress)(offer.asset) !== (0, import_viem3.getAddress)(token.address)) {
    throw new MppPaymentRequiredError(
      "MPP asset changed after policy selection"
    );
  }
  if (BigInt(offer.amountAtomic) > maxAtomic) {
    throw new MppBudgetExceededError(
      `MPP charge demands $${offer.amountUsd.toFixed(6)} above the effective per-call cap`
    );
  }
}
function resolveExpectedRecipient(explicit, merchant, policy) {
  const raw = explicit || merchant?.payTo || policy.expectedRecipient;
  if (!raw || !(0, import_viem3.isAddress)(raw)) {
    throw new MppRecipientRequiredError(
      "MPP buyer refusing to sign without a trusted recipient; use bag mpp trust or set [payments.mpp].expected_recipient"
    );
  }
  return (0, import_viem3.getAddress)(raw);
}
function resolveExpectedRealm(url, explicit, merchant, policy) {
  return String(
    explicit || merchant?.realm || policy.expectedRealm || new URL(url).host
  ).trim().toLowerCase();
}
function networkNameFromMerchant(merchant) {
  if (!merchant?.network) return "bsc-mainnet";
  return mppNetworkNameFromCaip2(merchant.network);
}
function walletAccount(wallet) {
  return {
    address: (0, import_viem3.getAddress)(wallet.address),
    type: "local",
    source: "custom",
    async signTypedData(parameters) {
      const signature = await wallet.signTypedData?.(
        asRecord(parameters.domain),
        parameters.types,
        asRecord(parameters.message)
      );
      const raw = typeof signature === "string" ? signature : String(asRecord(signature).signature ?? "");
      if (!/^0x[0-9a-fA-F]+$/.test(raw)) {
        throw new MppUnsupportedWalletError(
          "wallet returned an invalid EIP-712 signature"
        );
      }
      return raw;
    }
  };
}
function assertWallet(wallet) {
  if (!(0, import_viem3.isAddress)(wallet.address)) {
    throw new MppUnsupportedWalletError("wallet address is invalid");
  }
  if (typeof wallet.signTypedData !== "function" || typeof wallet.supports === "function" && !wallet.supports("sign.typed_data")) {
    throw new MppUnsupportedWalletError(
      "MPP+B402 buying requires a wallet with sign.typed_data; delegated x402-only wallets such as twak are unsupported"
    );
  }
}
function assertTarget(url, allowedHosts, allowInsecureLoopback) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new MppHostNotAllowedError("MPP target must be an absolute URL");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    parsed.hostname.toLowerCase()
  );
  if (parsed.protocol !== "https:" && !(allowInsecureLoopback && loopback)) {
    throw new MppInsecureTransportError(
      "MPP target must use https; plain http is allowed only for explicit loopback development"
    );
  }
  if (allowedHosts !== null && !allowedHosts.map((host) => host.toLowerCase()).includes(parsed.hostname.toLowerCase())) {
    throw new MppHostNotAllowedError(
      `MPP buyer refusing '${parsed.hostname}' \u2014 not in allowed_hosts=${JSON.stringify(allowedHosts)}`
    );
  }
}
function assertRequestHeaders(headers) {
  const reserved = /* @__PURE__ */ new Set([
    "authorization",
    "accept-payment",
    "www-authenticate",
    "payment-receipt"
  ]);
  for (const name of Object.keys(headers ?? {})) {
    if (reserved.has(name.toLowerCase())) {
      throw new MppPaymentRequiredError(
        `caller may not set reserved MPP header ${name}`
      );
    }
  }
}
async function requestOnce(url, options) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  return fetchImpl(url, {
    ...requestInit(options),
    signal: AbortSignal.timeout(options.timeoutMs ?? 3e4)
  });
}
function requestInit(options) {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  let body;
  if (options.jsonBody !== void 0 && options.jsonBody !== null) {
    body = JSON.stringify(options.jsonBody);
    headers.set("Content-Type", "application/json");
  }
  return {
    method,
    headers,
    ...body !== void 0 ? { body } : {}
  };
}
async function nativeChallenges(response) {
  const transport = import_client3.Transport.http();
  const all = transport.getChallenges ? await transport.getChallenges(response) : [await transport.getChallenge(response)];
  return all.filter(
    (challenge) => challenge.method === "b402" && challenge.intent === "charge"
  );
}
async function readBody(response) {
  const content = Buffer.from(await response.arrayBuffer());
  try {
    const parsed = JSON.parse(content.toString("utf8"));
    return {
      content,
      json: typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null
    };
  } catch {
    return { content, json: null };
  }
}
function receiptFromResponse(response) {
  try {
    return import_mppx.Receipt.fromResponse(response);
  } catch {
    return null;
  }
}
function decimalText(value, decimals) {
  return value.toFixed(decimals).replace(/(?:\.0+|(?:(\.\d*?)0+))$/, "$1");
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function mppPaymentConfigSource() {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) {
    return Object.freeze({ raw: null, projectRoot: null });
  }
  return Object.freeze({
    raw: loadStudioToml((0, import_node_path4.join)(projectRoot, STUDIO_TOML)),
    projectRoot
  });
}
function mppPaymentPolicySnapshot(explicit) {
  let source;
  try {
    source = mppPaymentConfigSource();
  } catch (cause) {
    throw new MppPaymentRequiredError(
      "MPP buyer refusing to pay because studio.toml could not be safely loaded",
      { cause }
    );
  }
  try {
    const policy = explicit === void 0 ? MppBuyerPolicy.fromToml(source.raw) : explicit ?? new MppBuyerPolicy();
    return Object.freeze({
      policy,
      budgetTrackerSnapshot: Object.freeze({
        dailyCapUsd: resolveDailyCapUsd(source.raw),
        projectRoot: source.projectRoot
      })
    });
  } catch (cause) {
    throw new MppPaymentRequiredError(
      "MPP buyer refusing to pay because studio.toml payment policy is invalid",
      { cause }
    );
  }
}
function mppPaymentAttempt(explicit) {
  const snapshot = mppPaymentPolicySnapshot(explicit);
  try {
    const budgetTracker = getSharedBudgetTracker(
      snapshot.budgetTrackerSnapshot
    );
    budgetTracker.preflightLedger();
    return Object.freeze({
      ...snapshot,
      budgetTracker
    });
  } catch (cause) {
    throw new MppPaymentRequiredError(
      "MPP buyer refusing to pay because studio.toml spend ledger could not be safely initialized",
      { cause }
    );
  }
}
function resolvePolicy(explicit) {
  if (explicit !== void 0) return explicit ?? new MppBuyerPolicy();
  let loaded;
  try {
    loaded = loadStudioToml();
  } catch (cause) {
    if (cause instanceof StudioTomlNotFoundError) {
      return new MppBuyerPolicy();
    }
    throw new MppPaymentRequiredError(
      "MPP buyer refusing to pay because studio.toml could not be safely loaded",
      { cause }
    );
  }
  try {
    return MppBuyerPolicy.fromToml(loaded);
  } catch (cause) {
    throw new MppPaymentRequiredError(
      "MPP buyer refusing to pay because studio.toml payment policy is invalid",
      { cause }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_MPP_MAX_PER_REQUEST_USD,
  DEFAULT_MPP_MAX_SETTLEMENT_SECONDS,
  MppBudgetExceededError,
  MppBuyerPolicy,
  MppError,
  MppHostNotAllowedError,
  MppInsecureTransportError,
  MppInsufficientPaymentAssetBalanceError,
  MppPaymentAssetBalanceUnavailableError,
  MppPaymentAssetUnavailableError,
  MppPaymentOutcomeUnknownError,
  MppPaymentRequiredError,
  MppPolicyError,
  MppRealmMismatchError,
  MppRecipientMismatchError,
  MppRecipientRequiredError,
  MppUnsupportedWalletError,
  MppUnsupportedWalletRouteError,
  fetchMppWithPayment,
  quoteMppUrl
});
