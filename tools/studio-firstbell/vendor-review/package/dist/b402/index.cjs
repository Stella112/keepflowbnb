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

// src/b402/index.ts
var b402_exports = {};
__export(b402_exports, {
  B402Seller: () => B402Seller,
  B402SellerPolicy: () => B402SellerPolicy,
  B402_PAYMENT_PROTOCOLS: () => B402_PAYMENT_PROTOCOLS,
  B402_SELL_PATHS: () => B402_SELL_PATHS,
  MPP_SELL_PATH: () => MPP_SELL_PATH,
  MppSeller: () => MppSeller,
  _resetB402ReplayStore: () => _resetB402ReplayStore,
  _setB402ReplayStore: () => _setB402ReplayStore,
  b402SellPath: () => b402SellPath,
  createEnvelopeMiddleware: () => createEnvelopeMiddleware,
  resolveB402PaymentProtocol: () => resolveB402PaymentProtocol,
  resolveB402ReplayStore: () => resolveB402ReplayStore
});
module.exports = __toCommonJS(b402_exports);

// src/b402/mppSeller.ts
var import_node_async_hooks = require("async_hooks");
var import_b4022 = require("@bnb-chain/b402");
var import_server3 = require("@bnb-chain/b402/server");
var import_server4 = require("@bnb-chain/mpp-b402/server");
var import_mppx = require("mppx");
var import_server5 = require("mppx/server");
var import_viem3 = require("viem");

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
var CANONICAL_USD_PRICE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
function usdPriceToAtomic(networkName, assetId, priceUsd) {
  return priceToAtomic(
    getNetwork(networkName).asset(assetId).decimals,
    priceUsd
  );
}
function b402UsdPriceToAtomic(networkName, assetId, priceUsd) {
  return priceToAtomic(
    getNetwork(networkName).b402Asset(assetId).decimals,
    priceUsd
  );
}
function priceToAtomic(decimals, priceUsd) {
  if (typeof priceUsd !== "string") {
    throw new TypeError("USD price must be a decimal string");
  }
  if (!CANONICAL_USD_PRICE.test(priceUsd)) {
    throw new Error(`Invalid canonical USD price: '${priceUsd}'`);
  }
  const [whole, rawFraction = ""] = priceUsd.split(".");
  const discarded = rawFraction.slice(decimals);
  if (/[1-9]/.test(discarded)) {
    throw new Error(
      `USD price '${priceUsd}' cannot be represented with ${decimals} decimals`
    );
  }
  const fraction = rawFraction.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction || "0");
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
var X402SellerConfigError = class extends X402Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "X402SellerConfigError";
  }
};

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

// src/payments/capabilities.ts
var DEFAULT_REFRESH_INTERVAL_MS = 3e4;
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
var SellerCapabilityManager = class {
  #options;
  #assets;
  #b402Assets;
  #current = null;
  #refreshing = null;
  #starting = null;
  #lifecycleGeneration = 0;
  #started = false;
  #timer = null;
  constructor(options) {
    const network = getNetwork(options.network);
    if (options.assets.length === 0) {
      throw new Error("seller capability assets must not be empty");
    }
    if (new Set(options.assets).size !== options.assets.length) {
      throw new Error("seller capability assets must not contain duplicates");
    }
    this.#assets = Object.freeze(
      options.assets.map((assetId) => network.asset(assetId))
    );
    this.#b402Assets = Object.freeze(
      options.assets.map((assetId) => network.b402Asset(assetId))
    );
    this.#options = options;
  }
  async start() {
    if (this.#started && this.#starting?.generation === this.#lifecycleGeneration) {
      return this.#starting.promise;
    }
    if (this.#started && this.#current !== null) return this.#current;
    const milliseconds = this.#validatedRefreshInterval();
    const generation = ++this.#lifecycleGeneration;
    this.#started = true;
    const promise = this.#startOnce(generation, milliseconds);
    const starting = Object.freeze({ generation, promise });
    this.#starting = starting;
    try {
      return await promise;
    } finally {
      if (this.#starting === starting) this.#starting = null;
    }
  }
  async #startOnce(generation, milliseconds) {
    try {
      const snapshot = await this.refresh();
      if (this.#isCurrentStart(generation)) {
        this.#schedulePeriodicRefresh(milliseconds);
      }
      return snapshot;
    } catch (error) {
      if (this.#isCurrentStart(generation)) {
        this.#started = false;
        this.#lifecycleGeneration += 1;
        if (this.#timer !== null) {
          (this.#options.timers ?? DEFAULT_TIMERS).clearInterval(this.#timer);
          this.#timer = null;
        }
        this.#current = null;
      }
      throw error;
    }
  }
  #isCurrentStart(generation) {
    return this.#started && this.#lifecycleGeneration === generation;
  }
  refresh() {
    if (this.#refreshing !== null) return this.#refreshing;
    const refreshing = this.#performRefresh().finally(() => {
      if (this.#refreshing === refreshing) this.#refreshing = null;
    });
    this.#refreshing = refreshing;
    return refreshing;
  }
  async #performRefresh() {
    const [erc8183, b4022] = await Promise.all([
      this.#resolveErc8183(),
      this.#resolveB402()
    ]);
    const rails = Object.freeze({ erc8183, b402: b4022 });
    const snapshot = Object.freeze({
      network: this.#options.network,
      generatedAt: toTimestamp(this.#options.clock?.() ?? /* @__PURE__ */ new Date()),
      rails,
      overall: aggregateSellerCapabilities([erc8183, b4022])
    });
    this.#current = snapshot;
    return snapshot;
  }
  currentSnapshot() {
    return this.#current;
  }
  async freshSnapshot() {
    return this.refresh();
  }
  stop() {
    this.#started = false;
    this.#lifecycleGeneration += 1;
    if (this.#timer !== null) {
      (this.#options.timers ?? DEFAULT_TIMERS).clearInterval(this.#timer);
      this.#timer = null;
    }
  }
  #validatedRefreshInterval() {
    const milliseconds = this.#options.refreshIntervalMs === void 0 ? DEFAULT_REFRESH_INTERVAL_MS : this.#options.refreshIntervalMs;
    if (milliseconds === null) return null;
    if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
      throw new Error("capability refresh interval must be a positive integer");
    }
    return milliseconds;
  }
  #schedulePeriodicRefresh(milliseconds) {
    if (this.#timer !== null) return;
    if (milliseconds === null) return;
    this.#timer = (this.#options.timers ?? DEFAULT_TIMERS).setInterval(() => {
      void this.refresh();
    }, milliseconds);
  }
  async #resolveErc8183() {
    const config = this.#options.erc8183;
    if (!config.enabled) {
      return makeDisabledRail("erc8183", this.#assets);
    }
    const assets = await Promise.all(
      this.#assets.map(async (asset) => {
        try {
          const supported = await config.isPaymentTokenSupported(
            asset.address,
            asset.assetId
          );
          return makeAsset(
            asset,
            supported === true ? ["erc8183"] : [],
            supported === true ? [] : [{ code: "commerce-unsupported", method: "erc8183" }],
            null
          );
        } catch {
          return makeAsset(
            asset,
            [],
            [{ code: "commerce-probe-failed", method: "erc8183" }],
            "Commerce payment-token capability probe failed"
          );
        }
      })
    );
    return makeRail("erc8183", true, false, assets);
  }
  async #resolveB402() {
    const config = this.#options.b402;
    if (!config.enabled) return makeDisabledRail("b402", this.#b402Assets);
    if (isZeroUsd(this.#options.priceUsd)) {
      return makeRail(
        "b402",
        true,
        true,
        this.#b402Assets.map(
          (asset) => makeAsset(asset, [], [{ code: "free-route", method: null }], null)
        )
      );
    }
    let kinds;
    try {
      kinds = await config.loadSupportedKinds();
      if (!Array.isArray(kinds)) {
        throw new TypeError("B402 supported capability must be an array");
      }
    } catch {
      const assets2 = this.#b402Assets.map(
        (asset) => makeAsset(
          asset,
          [],
          asset.b402Methods.map((method) => ({
            code: "b402-supported-probe-failed",
            method
          })),
          "B402 supported-capability probe failed"
        )
      );
      return makeRail("b402", true, false, assets2);
    }
    const network = `eip155:${getNetwork(this.#options.network).chainId}`;
    const assets = this.#b402Assets.map((asset) => {
      const routes = asset.b402Methods.flatMap((method) => {
        const kind = kinds.find(
          (candidate) => kindMatches(candidate, asset, network, method)
        );
        return kind === void 0 ? [] : [makeB402Route(asset, kind, method)];
      });
      const activeMethods = routes.map((route) => route.method);
      const missing = asset.b402Methods.filter((method) => !activeMethods.includes(method)).map((method) => ({
        code: "b402-method-unsupported",
        method
      }));
      return makeAsset(asset, activeMethods, missing, null, routes);
    });
    return makeRail("b402", true, false, assets);
  }
};
function aggregateSellerCapabilities(rails) {
  const enabledRails = rails.filter((rail) => rail.enabled).map((rail) => rail.rail);
  const servingRails = rails.filter((rail) => rail.status === "active" || rail.status === "degraded").map((rail) => rail.rail);
  return Object.freeze({
    available: servingRails.length > 0,
    enabledRails: Object.freeze(enabledRails),
    servingRails: Object.freeze(servingRails)
  });
}
function kindMatches(kind, asset, network, method) {
  if (kind === null || typeof kind !== "object" || kind.trusted !== true || kind.x402Version !== 2 || kind.scheme !== "exact" || kind.network !== network || kind.assetId !== asset.assetId || kind.method !== method || typeof kind.version !== "string" || kind.version.length === 0 || !isEvmAddress(kind.signerAddress) || method === "permit2-exact" && !isEvmAddress(kind.spenderAddress)) {
    return false;
  }
  return asset.b402Kinds.some(
    (catalogKind) => catalogKind.method === method && catalogKind.name === kind.name && catalogKind.version === kind.version
  );
}
function makeB402Route(asset, kind, method) {
  const signerAddress = kind.signerAddress;
  const spenderAddress = method === "permit2-exact" ? kind.spenderAddress ?? null : null;
  const challengeExtra = Object.freeze({
    assetTransferMethod: method,
    name: kind.name,
    version: kind.version,
    signerAddress,
    ...spenderAddress === null ? {} : { spenderAddress }
  });
  return Object.freeze({
    assetId: asset.assetId,
    x402Version: 2,
    scheme: "exact",
    network: kind.network,
    method,
    name: kind.name,
    version: kind.version,
    signerAddress,
    spenderAddress,
    challengeExtra
  });
}
function isEvmAddress(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/i.test(value);
}
function makeAsset(asset, activeMethods, inactiveReasons, lastError, b402Routes = []) {
  return Object.freeze({
    assetId: asset.assetId,
    symbol: asset.symbol,
    address: asset.address,
    decimals: asset.decimals,
    isDefault: asset.isDefault,
    active: activeMethods.length > 0,
    activeMethods: Object.freeze([...activeMethods]),
    b402Routes: Object.freeze([...b402Routes]),
    inactiveReasons: Object.freeze(
      inactiveReasons.map((reason) => Object.freeze({ ...reason }))
    ),
    lastError
  });
}
function makeRail(rail, enabled, free, assets) {
  const active = assets.filter((asset) => asset.active).length;
  const partiallyAvailable = assets.some(
    (asset) => asset.active && asset.inactiveReasons.length > 0
  );
  const status = !enabled ? "disabled" : free ? "active" : active === 0 ? "dormant" : active < assets.length || partiallyAvailable ? "degraded" : "active";
  return Object.freeze({
    rail,
    enabled,
    free,
    status,
    assets: Object.freeze([...assets])
  });
}
function makeDisabledRail(rail, assets) {
  return makeRail(
    rail,
    false,
    false,
    assets.map(
      (asset) => makeAsset(asset, [], [{ code: "rail-disabled", method: null }], null)
    )
  );
}
function toTimestamp(value) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}
function isZeroUsd(value) {
  return /^0(?:\.0+)?$/.test(value);
}

// src/payments/capabilityAdapters.ts
function createSellerCapabilityManager(options) {
  const erc8183 = options.erc8183.enabled ? (() => {
    const commerceClient = options.erc8183.commerceClient;
    return {
      enabled: true,
      isPaymentTokenSupported: async (address, _assetId) => commerceClient.isPaymentTokenSupported(address)
    };
  })() : { enabled: false };
  const b4022 = options.b402.enabled ? (() => {
    const transport = options.b402.transport;
    return {
      enabled: true,
      loadSupportedKinds: async () => {
        const raw = await transport.supported();
        return normalizeB402SupportedKinds(options.network, raw);
      }
    };
  })() : { enabled: false };
  return new SellerCapabilityManager({
    network: options.network,
    assets: options.assets,
    priceUsd: options.priceUsd,
    erc8183,
    b402: b4022,
    ...options.clock === void 0 ? {} : { clock: options.clock },
    ...options.refreshIntervalMs === void 0 ? {} : { refreshIntervalMs: options.refreshIntervalMs },
    ...options.timers === void 0 ? {} : { timers: options.timers }
  });
}
function normalizeB402SupportedKinds(networkName, rawResponse) {
  if (!isRecord(rawResponse) || !Array.isArray(rawResponse.kinds)) {
    throw new TypeError("B402 /supported response must contain a kinds array");
  }
  const network = getNetwork(networkName);
  const normalized = rawResponse.kinds.flatMap((rawKind) => {
    const parsed = normalizeKind(network, rawKind);
    return parsed === null ? [] : [parsed];
  });
  const routeCounts = /* @__PURE__ */ new Map();
  for (const kind of normalized) {
    const key = `${kind.network}:${kind.assetId}:${kind.method}`;
    routeCounts.set(key, (routeCounts.get(key) ?? 0) + 1);
  }
  return Object.freeze(
    normalized.filter(
      (kind) => routeCounts.get(`${kind.network}:${kind.assetId}:${kind.method}`) === 1
    )
  );
}
function normalizeKind(network, rawKind) {
  if (!isRecord(rawKind) || !isRecord(rawKind.extra)) return null;
  const expectedNetwork = `eip155:${network.chainId}`;
  const extra = rawKind.extra;
  const method = extra.assetTransferMethod;
  if (rawKind.x402Version !== 2 || rawKind.scheme !== "exact" || rawKind.network !== expectedNetwork || !isB402Method(method) || typeof extra.name !== "string" || typeof extra.version !== "string" || !isEvmAddress2(extra.signerAddress)) {
    return null;
  }
  if (method === "permit2-exact" && !isEvmAddress2(extra.spenderAddress)) {
    return null;
  }
  const name = extra.name;
  const version = extra.version;
  const signerAddress = extra.signerAddress;
  const candidates = network.assets().filter(
    (asset2) => asset2.b402Kinds.some(
      (kind) => kind.method === method && kind.name === name && kind.version === version
    )
  );
  const asset = candidates[0];
  if (candidates.length !== 1 || asset === void 0) return null;
  return Object.freeze({
    trusted: true,
    x402Version: 2,
    scheme: "exact",
    network: expectedNetwork,
    assetId: asset.assetId,
    method,
    name,
    version,
    signerAddress,
    ...method === "permit2-exact" ? { spenderAddress: extra.spenderAddress } : {}
  });
}
function isB402Method(value) {
  return value === "eip3009" || value === "permit2-exact";
}
function isEvmAddress2(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/i.test(value);
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// src/payments/sellerPolicy.ts
var SELLER_POLICY_AMBIGUOUS_ERROR = "ambiguous seller configuration: [payments.seller] cannot be combined with legacy seller price or asset fields; use payments.seller.price_usd and payments.seller.assets only (explicit legacy migration is required)";
var SellerPolicyConfigError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "SellerPolicyConfigError";
  }
};
var CANONICAL_KEYS = /* @__PURE__ */ new Set(["price_usd", "assets"]);
var LEGACY_ERC8183_KEYS = ["price", "min_price", "max_price", "currency"];
var LEGACY_B402_KEYS = ["price_usd", "assets"];
var PRICE_USD_RE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
function resolveSellerPolicy(cfg, rail, options = {}) {
  const root = asTable(cfg);
  const payments = asTable(root.payments);
  const network = resolveNetworkName(root, options.network);
  const canonicalPresent = Object.hasOwn(payments, "seller");
  if (canonicalPresent && hasLegacySellerFields(payments)) {
    throw new SellerPolicyConfigError(SELLER_POLICY_AMBIGUOUS_ERROR);
  }
  if (canonicalPresent) {
    return freezeResolution(
      "canonical",
      parseCanonicalPolicy(payments.seller, network)
    );
  }
  return freezeResolution(
    "legacy",
    rail === "erc8183" ? parseLegacyErc8183Policy(payments, network) : parseLegacyB402Policy(payments, network)
  );
}
function hasCanonicalSellerPolicy(cfg) {
  return Object.hasOwn(asTable(asTable(cfg).payments), "seller");
}
function parseCanonicalPolicy(value, networkName) {
  const seller = requireTable(value, "[payments.seller]");
  const unknownKeys = Object.keys(seller).filter(
    (key) => !CANONICAL_KEYS.has(key)
  );
  if (unknownKeys.length > 0) {
    throw new SellerPolicyConfigError(
      `[payments.seller] accepts only price_usd and assets; unknown field(s): ${unknownKeys.join(", ")}`
    );
  }
  const priceUsd = seller.price_usd;
  if (typeof priceUsd !== "string" || !PRICE_USD_RE.test(priceUsd)) {
    throw new SellerPolicyConfigError(
      "[payments.seller].price_usd must be a canonical non-negative decimal string"
    );
  }
  if (!Array.isArray(seller.assets) || seller.assets.length === 0) {
    throw new SellerPolicyConfigError(
      "[payments.seller].assets must be a non-empty canonical AssetId list"
    );
  }
  const network = getNetwork(networkName);
  const assets = [];
  const seen = /* @__PURE__ */ new Set();
  for (const rawAsset of seller.assets) {
    if (typeof rawAsset !== "string") {
      throw new SellerPolicyConfigError(
        "[payments.seller].assets must contain canonical AssetId strings"
      );
    }
    let assetId;
    try {
      assetId = network.asset(rawAsset).assetId;
    } catch (cause) {
      throw new SellerPolicyConfigError(
        `[payments.seller].assets contains unknown, UI-only, or cross-network AssetId ${JSON.stringify(rawAsset)} for ${networkName}`,
        { cause }
      );
    }
    if (seen.has(assetId)) {
      throw new SellerPolicyConfigError(
        `[payments.seller].assets contains duplicate AssetId ${assetId}`
      );
    }
    seen.add(assetId);
    assets.push(assetId);
  }
  for (const assetId of assets) {
    requireExactUsdPrice(networkName, assetId, priceUsd);
  }
  return freezePolicy(networkName, assets, { kind: "usd", value: priceUsd });
}
function requireExactUsdPrice(networkName, assetId, priceUsd) {
  const network = getNetwork(networkName);
  try {
    usdPriceToAtomic(networkName, assetId, priceUsd);
  } catch (cause) {
    throw new SellerPolicyConfigError(
      `[payments.seller].price_usd ${JSON.stringify(priceUsd)} is not exactly representable by ${assetId} (ERC-8183, ${network.asset(assetId).decimals} decimals)`,
      { cause }
    );
  }
  try {
    b402UsdPriceToAtomic(networkName, assetId, priceUsd);
  } catch (cause) {
    throw new SellerPolicyConfigError(
      `[payments.seller].price_usd ${JSON.stringify(priceUsd)} is not exactly representable at B402 ${network.b402Asset(assetId).decimals}-decimal precision (asset ${assetId})`,
      { cause }
    );
  }
}
function parseLegacyErc8183Policy(payments, networkName) {
  const seller = asTable(payments.erc8183);
  return freezePolicy(networkName, [defaultU(networkName)], {
    kind: "atomic",
    value: optionalString(seller.price),
    min: optionalString(seller.min_price),
    max: optionalString(seller.max_price)
  });
}
function parseLegacyB402Policy(payments, networkName) {
  const canonicalAlias = asTable(payments.b402_seller);
  const oldAlias = asTable(payments.x402_seller);
  if (Object.keys(canonicalAlias).length > 0 && Object.keys(oldAlias).length > 0) {
    throw new SellerPolicyConfigError(
      "configure only one of [payments.b402_seller] or legacy [payments.x402_seller]"
    );
  }
  const seller = Object.keys(canonicalAlias).length > 0 ? canonicalAlias : oldAlias;
  const rawAssets = seller.assets ?? ["U"];
  if (!Array.isArray(rawAssets) || rawAssets.length !== 1 || rawAssets[0] !== "U") {
    throw new SellerPolicyConfigError(
      'legacy B402 seller assets must remain exactly ["U"]'
    );
  }
  const priceUsd = seller.price_usd ?? "0.01";
  if (typeof priceUsd !== "string" || !PRICE_USD_RE.test(priceUsd)) {
    throw new SellerPolicyConfigError(
      "legacy B402 seller price_usd must be a non-negative decimal string"
    );
  }
  return freezePolicy(networkName, [defaultU(networkName)], {
    kind: "usd",
    value: priceUsd
  });
}
function hasLegacySellerFields(payments) {
  return hasAnyOwn(asTable(payments.erc8183), LEGACY_ERC8183_KEYS) || hasAnyOwn(asTable(payments.b402_seller), LEGACY_B402_KEYS) || hasAnyOwn(asTable(payments.x402_seller), LEGACY_B402_KEYS);
}
function hasAnyOwn(table, keys) {
  return keys.some((key) => Object.hasOwn(table, key));
}
function resolveNetworkName(root, override) {
  const configured = asTable(root.network).default;
  const network = String(override ?? configured ?? "bsc-testnet");
  try {
    getNetwork(network);
  } catch (cause) {
    throw new SellerPolicyConfigError(
      `seller policy network ${JSON.stringify(network)} is not supported`,
      { cause }
    );
  }
  return network;
}
function defaultU(networkName) {
  const defaults = getNetwork(networkName).assets().filter((asset2) => asset2.isDefault && asset2.symbol === "U");
  const asset = defaults[0];
  if (defaults.length !== 1 || asset === void 0) {
    throw new SellerPolicyConfigError(
      `network ${networkName} must have exactly one default U asset`
    );
  }
  return asset.assetId;
}
function optionalString(value) {
  return value === void 0 ? null : String(value);
}
function freezePolicy(network, assets, price) {
  return Object.freeze({
    network,
    assets: Object.freeze([...assets]),
    price: Object.freeze({ ...price })
  });
}
function freezeResolution(source, policy) {
  return Object.freeze({ source, policy });
}
function requireTable(value, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new SellerPolicyConfigError(`${field} must be a TOML table`);
  }
  return value;
}
function asTable(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

// src/x402/sellerB402.ts
var import_node_crypto = require("crypto");
var import_b402 = require("@bnb-chain/b402");
var import_server = require("@bnb-chain/b402/server");
var import_server2 = require("@x402/core/server");

// src/b402/replayStore.ts
var replayStoreOverride = null;
var MPP_MAX_TIMEOUT_SECONDS = 300;
var REJECTED_TTL_MS = (MPP_MAX_TIMEOUT_SECONDS + 60) * 1e3;
function _setB402ReplayStore(store) {
  replayStoreOverride = store;
}
function _resetB402ReplayStore() {
  replayStoreOverride = null;
}
function resolveB402ReplayStore(options = {}) {
  const provided = options.replayStore ?? replayStoreOverride;
  if (provided) return provided;
  const env = options.env ?? process.env;
  if (options.requireDurableInProduction !== false && env.NODE_ENV?.trim().toLowerCase() === "production" && env.B402_REPLAY_STORE_MODE?.trim().toLowerCase() !== "memory") {
    throw new X402SellerConfigError(
      "MPP+B402 production requires an injected durable atomic replayStore shared by all instances"
    );
  }
  return boundedMemoryReplayStore();
}
function boundedMemoryReplayStore(maxEntries = 1e5) {
  const entries = /* @__PURE__ */ new Map();
  let nextRejectedExpiry = Number.POSITIVE_INFINITY;
  function expireRejected(now) {
    if (now < nextRejectedExpiry) return;
    nextRejectedExpiry = Number.POSITIVE_INFINITY;
    for (const [key, slot] of entries) {
      if (slot.state !== "rejected") continue;
      const expires = slot.ts + REJECTED_TTL_MS;
      if (now >= expires) entries.delete(key);
      else nextRejectedExpiry = Math.min(nextRejectedExpiry, expires);
    }
  }
  return {
    async get(key) {
      expireRejected(Date.now());
      return entries.get(key);
    },
    async update(key, change) {
      expireRejected(Date.now());
      const next = change(entries.get(key));
      if (next.op === "set") {
        if (!entries.has(key) && entries.size >= maxEntries) {
          throw new Error(
            "B402 memory replay store capacity reached; configure a durable shared replayStore"
          );
        }
        entries.set(key, next.value);
        if (next.value.state === "rejected") {
          nextRejectedExpiry = Math.min(
            nextRejectedExpiry,
            next.value.ts + REJECTED_TTL_MS
          );
        }
      } else if (next.op === "delete") {
        entries.delete(key);
      }
      return next.result;
    }
  };
}

// src/x402/sellerRoutes.ts
function x402SellerState(enabled, snapshot) {
  if (!enabled) return "disabled";
  if (snapshot === null) return "dormant";
  return snapshot.rails.b402.status;
}
function buildX402SellerAccepts(snapshot, priceUsd, payTo) {
  const rail = snapshot.rails.b402;
  if (!rail.enabled || rail.free || rail.status === "dormant") return [];
  const network = getNetwork(snapshot.network);
  const expectedNetwork = `eip155:${network.chainId}`;
  const accepts = rail.assets.flatMap((asset) => {
    if (!asset.active) return [];
    const catalogAsset = network.b402Asset(asset.assetId);
    if (asset.address !== catalogAsset.address || asset.decimals !== catalogAsset.decimals) {
      throw new Error(`B402 capability metadata drift for ${asset.assetId}`);
    }
    const amount = b402UsdPriceToAtomic(
      snapshot.network,
      asset.assetId,
      priceUsd
    ).toString();
    if (!/^[1-9]\d*$/.test(amount)) {
      throw new Error(
        "paid x402 route amount must be a positive atomic integer"
      );
    }
    return asset.b402Routes.map((route) => {
      if (route.assetId !== asset.assetId || route.network !== expectedNetwork || !asset.activeMethods.includes(route.method)) {
        throw new Error(`B402 capability route drift for ${asset.assetId}`);
      }
      return Object.freeze({
        assetId: asset.assetId,
        scheme: "exact",
        network: expectedNetwork,
        payTo,
        price: Object.freeze({ asset: asset.address, amount }),
        maxTimeoutSeconds: 600,
        extra: route.challengeExtra
      });
    });
  });
  return Object.freeze(accepts);
}
function resolveX402SettlementAsset(networkName, requirements) {
  const network = getNetwork(networkName);
  const expectedNetwork = `eip155:${network.chainId}`;
  if (requirements.network !== expectedNetwork) {
    throw new Error(
      `x402 settlement network ${requirements.network} does not match ${expectedNetwork}`
    );
  }
  if (!/^[1-9]\d*$/.test(requirements.amount)) {
    throw new Error("x402 settlement amount must be a positive atomic integer");
  }
  const asset = network.b402Assets().find(
    (candidate) => candidate.address.toLowerCase() === requirements.asset.toLowerCase()
  );
  if (asset === void 0) {
    throw new Error(
      `x402 settlement asset ${requirements.asset} is not configured for ${networkName}`
    );
  }
  return Object.freeze({
    assetId: asset.assetId,
    symbol: asset.symbol,
    tokenAddress: asset.address,
    amountAtomic: requirements.amount
  });
}

// src/x402/sellerB402.ts
var transportOverride = null;
var RedactingReplayStore = class {
  #inner;
  constructor(inner) {
    this.#inner = inner;
  }
  async get(key) {
    try {
      return await this.#inner.get(key);
    } catch {
      throw new Error("replay store unavailable");
    }
  }
  async update(key, change) {
    try {
      return await this.#inner.update(key, change);
    } catch {
      throw new Error("replay store unavailable");
    }
  }
};
var X402_SELL_PATH = "/x402";
function resolveB402Transport(env = process.env) {
  if (transportOverride) return transportOverride;
  try {
    return import_server.B402Client.fromEnv(env) ?? null;
  } catch (cause) {
    if (!(cause instanceof import_server.B402Error)) throw cause;
    throw new X402SellerConfigError("Invalid or partial B402 configuration", {
      cause
    });
  }
}
async function createSellerB402(options) {
  const transport = options.transport ?? resolveB402Transport(options.env ?? process.env);
  if (!transport) return null;
  const rawFacilitator = new import_server.B402FacilitatorClient({
    client: transport,
    store: new RedactingReplayStore(
      resolveB402ReplayStore({
        env: options.env ?? process.env,
        ...options.replayStore ? { replayStore: options.replayStore } : {},
        // Keep legacy x402 deployments compatible while still adding a
        // single-process replay guard. New MPP production is fail-closed.
        requireDurableInProduction: false
      })
    ),
    ...options.policy.bazaar ? { bazaar: options.policy.bazaar } : {},
    onSettlementUnknown: createB402SettlementUnknownHandler({
      protocol: "x402",
      networkName: options.networkName,
      chainId: options.chainId,
      payTo: options.payTo,
      projectRoot: options.projectRoot
    })
  });
  const facilitator = new PropagatingB402Facilitator(rawFacilitator);
  return Object.freeze({
    async createHttp(snapshot, accepts) {
      if (snapshot.rails.b402.free || accepts.length === 0) {
        throw new Error("paid x402 request requires active capability routes");
      }
      const network = `eip155:${options.chainId}`;
      if (snapshot.network !== options.networkName) {
        throw new Error("x402 capability snapshot network mismatch");
      }
      const requestFacilitator = new SnapshotBackedFacilitator(
        facilitator,
        accepts
      );
      const server = new import_server2.x402ResourceServer(requestFacilitator).register(
        network,
        new import_server.B402ExactServerScheme({ facilitator: requestFacilitator })
      );
      const http2 = new import_server2.x402HTTPResourceServer(server, {
        [X402_SELL_PATH]: {
          accepts: accepts.map(({ assetId: _assetId, ...accept }) => ({
            ...accept,
            extra: { ...accept.extra }
          })),
          resource: options.resourceUrl
        }
      });
      try {
        await http2.initialize();
      } catch (error) {
        throw unwrapB402Error(error) ?? error;
      }
      return http2;
    }
  });
}
var SnapshotBackedFacilitator = class {
  #inner;
  #supported;
  constructor(inner, accepts) {
    this.#inner = inner;
    const signers = /* @__PURE__ */ new Map();
    for (const accept of accepts) {
      const entries = signers.get(accept.network) ?? /* @__PURE__ */ new Set();
      entries.add(accept.extra.signerAddress);
      signers.set(accept.network, entries);
    }
    this.#supported = {
      extensions: [],
      kinds: accepts.map((accept) => ({
        x402Version: 2,
        scheme: "exact",
        network: accept.network,
        extra: { ...accept.extra }
      })),
      signers: Object.fromEntries(
        [...signers].map(([network, values]) => [network, [...values]])
      )
    };
  }
  async getSupported() {
    return {
      extensions: [...this.#supported.extensions],
      kinds: this.#supported.kinds.map((kind) => ({
        ...kind,
        ...kind.extra === void 0 ? {} : { extra: { ...kind.extra } }
      })),
      signers: Object.fromEntries(
        Object.entries(this.#supported.signers).map(([network, values]) => [
          network,
          [...values]
        ])
      )
    };
  }
  verify(payload, requirements) {
    return this.#inner.verify(payload, requirements);
  }
  settle(payload, requirements) {
    return this.#inner.settle(payload, requirements);
  }
};
var PropagatingB402Facilitator = class {
  #inner;
  constructor(inner) {
    this.#inner = inner;
  }
  async getSupported() {
    try {
      return await this.#inner.getSupported();
    } catch (error) {
      throwCoreVisible(error);
    }
  }
  async verify(payload, requirements) {
    try {
      return await this.#inner.verify(payload, requirements);
    } catch (error) {
      throwCoreVisible(error);
    }
  }
  async settle(payload, requirements) {
    try {
      return await this.#inner.settle(payload, requirements);
    } catch (error) {
      throwCoreVisible(error);
    }
  }
};
function throwCoreVisible(error) {
  if (error instanceof import_server.B402Error || error instanceof import_server.B402SettlementUnknownError) {
    const wrapped = new import_server2.FacilitatorResponseError(error.message);
    Object.defineProperty(wrapped, "cause", {
      configurable: true,
      value: error
    });
    throw wrapped;
  }
  throw error;
}
function unwrapB402Error(error) {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof import_server.B402Error || current instanceof import_server.B402SettlementUnknownError) {
      return current;
    }
    current = current.cause;
  }
  return null;
}
function createB402SettlementUnknownHandler(audit) {
  return (event) => handleSettlementUnknown(event, audit);
}
function handleSettlementUnknown(event, audit) {
  const payload = event.request.paymentPayload;
  const nonce = (0, import_b402.isEip3009PaymentPayload)(payload) ? payload.payload.authorization.nonce : (0, import_b402.isPermit2PaymentPayload)(payload) ? payload.payload.permit2Authorization.nonce : null;
  const payloadMethod = (0, import_b402.isEip3009PaymentPayload)(payload) ? "eip3009" : (0, import_b402.isPermit2PaymentPayload)(payload) ? "permit2-exact" : null;
  if (nonce === null || payloadMethod === null || event.expectation.transferMethod !== payloadMethod) {
    return;
  }
  const transferMethod = payloadMethod;
  let requestSha256;
  try {
    requestSha256 = b402SettlementRequestDigest(event.request, {
      payer: event.expectation.payer,
      nonce,
      transferMethod
    });
  } catch {
    return;
  }
  try {
    console.log(
      `${audit.protocol.toUpperCase()}_SETTLE_UNKNOWN nonce=${nonce} network=${event.expectation.requirements.network} payer=${event.expectation.payer} request_sha256=${requestSha256}`
    );
  } catch {
  }
  try {
    const selected = resolveX402SettlementAsset(
      audit.networkName,
      event.request.paymentRequirements
    );
    const decimals = getNetwork(audit.networkName).b402Asset(
      selected.assetId
    ).decimals;
    const reconciliationKey = b402ReconciliationKey({
      protocol: audit.protocol,
      network: event.request.paymentRequirements.network,
      tokenAddress: selected.tokenAddress,
      payer: event.expectation.payer,
      nonce,
      transferMethod,
      requestDigest: requestSha256
    });
    recordChainOp(`${audit.protocol}_sell_unknown`, {
      actor: "agent",
      chainId: audit.chainId,
      asset: selected.assetId,
      amount: selected.amountAtomic,
      txHash: null,
      status: "unknown",
      agentAddr: audit.payTo,
      counterparty: event.expectation.payer,
      context: {
        nonce,
        network: event.request.paymentRequirements.network,
        payer: event.expectation.payer,
        transfer_method: transferMethod,
        asset_symbol: selected.symbol,
        token_address: selected.tokenAddress,
        decimals,
        amount_atomic: selected.amountAtomic,
        reconciliation_key: reconciliationKey,
        request_sha256: requestSha256,
        request_ref: `sha256:${requestSha256}`
      },
      projectRoot: audit.projectRoot
    });
  } catch {
  }
}
function b402SettlementRequestDigest(request, identity) {
  const canonical = canonicalJson({
    x402Version: request.x402Version,
    paymentRequirements: request.paymentRequirements,
    payment: {
      payer: identity.payer.toLowerCase(),
      nonce: identity.nonce.toLowerCase(),
      transferMethod: identity.transferMethod
    }
  });
  return (0, import_node_crypto.createHash)("sha256").update(canonical).digest("hex");
}
function b402ReconciliationKey(input) {
  return [
    input.protocol,
    input.network,
    input.tokenAddress.toLowerCase(),
    input.payer.toLowerCase(),
    input.nonce.toLowerCase(),
    input.transferMethod,
    input.requestDigest
  ].join(":");
}
function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}
function canonicalValue(value) {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== void 0).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, entry]) => [key, canonicalValue(entry)])
    );
  }
  return String(value);
}

// src/b402/policy.ts
var import_viem2 = require("viem");
var B402SellerPolicy = class _B402SellerPolicy {
  enabled;
  priceUsd;
  assets;
  payTo;
  workTimeoutSeconds;
  bazaar;
  constructor(fields = {}) {
    this.enabled = fields.enabled ?? false;
    this.priceUsd = fields.priceUsd ?? "0.01";
    this.assets = Object.freeze([...fields.assets ?? ["U"]]);
    this.payTo = fields.payTo ?? null;
    this.workTimeoutSeconds = fields.workTimeoutSeconds ?? 60;
    this.bazaar = fields.bazaar ?? null;
    Object.freeze(this);
  }
  static fromToml(cfg) {
    if (!cfg) return new _B402SellerPolicy();
    const payments = asTable2(cfg.payments);
    const canonical = asTable2(payments.b402_seller);
    const legacy = asTable2(payments.x402_seller);
    if (Object.keys(canonical).length > 0 && Object.keys(legacy).length > 0) {
      throw new X402SellerConfigError(
        "configure only one of [payments.b402_seller] or legacy [payments.x402_seller]"
      );
    }
    const seller = Object.keys(canonical).length > 0 ? canonical : legacy;
    const shared = hasCanonicalSellerPolicy(cfg) ? resolveSellerPolicy(cfg, "b402") : null;
    if (Object.keys(seller).length === 0 && shared === null) {
      return new _B402SellerPolicy();
    }
    const assets = shared ? [...shared.policy.assets] : seller.assets === void 0 ? ["U"] : Array.isArray(seller.assets) ? seller.assets.map(String) : [];
    if (!shared && (assets.length !== 1 || assets[0] !== "U")) {
      throw new X402SellerConfigError(
        'assets other than ["U"] arrive in a later version'
      );
    }
    const sharedPrice = shared?.policy.price;
    const priceUsd = sharedPrice ? sharedPrice.kind === "usd" ? sharedPrice.value : "" : seller.price_usd === void 0 ? "0.01" : typeof seller.price_usd === "string" ? seller.price_usd : "";
    if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(priceUsd)) {
      throw new X402SellerConfigError(
        "price_usd must be a non-negative decimal string"
      );
    }
    const payToRaw = seller.pay_to !== void 0 ? String(seller.pay_to).trim() : "";
    if (payToRaw !== "" && !(0, import_viem2.isAddress)(payToRaw)) {
      throw new X402SellerConfigError("pay_to must be an EVM address");
    }
    const workTimeoutSeconds = seller.work_timeout_seconds !== void 0 ? Number(seller.work_timeout_seconds) : 60;
    if (!Number.isSafeInteger(workTimeoutSeconds) || workTimeoutSeconds <= 0) {
      throw new X402SellerConfigError(
        "work_timeout_seconds must be a positive integer"
      );
    }
    return new _B402SellerPolicy({
      ...seller.enabled !== void 0 ? {
        enabled: parseBoolean(
          seller.enabled,
          "payments.b402_seller.enabled"
        )
      } : {},
      priceUsd,
      assets,
      payTo: payToRaw === "" ? null : (0, import_viem2.getAddress)(payToRaw),
      workTimeoutSeconds,
      bazaar: seller.bazaar !== void 0 ? parseBazaar(asTable2(seller.bazaar)) : null
    });
  }
};
function parseBazaar(table) {
  const info = parseJsonObject(table.info_json, "bazaar.info_json");
  const schema = parseJsonObject(table.schema_json, "bazaar.schema_json");
  return {
    info,
    schema,
    ...table.description !== void 0 ? { description: String(table.description) } : {},
    ...table.route_template !== void 0 ? { routeTemplate: String(table.route_template) } : {}
  };
}
function parseJsonObject(value, field) {
  let parsed;
  try {
    parsed = JSON.parse(typeof value === "string" ? value : "");
  } catch (cause) {
    throw new X402SellerConfigError(`${field} must be a JSON object`, {
      cause
    });
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new X402SellerConfigError(`${field} must be a JSON object`);
  }
  return parsed;
}
function asTable2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

// src/b402/workFailure.ts
var INLINE_SECRET_PATTERNS = [
  /\b(?:sk-pv|sess-pv)-[a-zA-Z0-9_-]{6,}\b/g,
  /\bBearer\s+[^\s,;]+/gi,
  /\b0x[0-9a-fA-F]{120,}\b/g
];
function workFailureSummary(error) {
  const name = error instanceof Error ? error.name || error.constructor.name : "NonErrorThrown";
  let message = error instanceof Error ? error.message : String(error);
  message = maskUrlSecrets(message);
  for (const pattern of INLINE_SECRET_PATTERNS) {
    message = message.replace(pattern, "<redacted>");
  }
  const summary = message ? `${name}: ${message}` : name;
  return summary.length <= 1e3 ? summary : `${summary.slice(0, 997)}...`;
}

// src/b402/mppSeller.ts
var MPP_SELL_PATH = "/mpp";
var settlementAttempt = new import_node_async_hooks.AsyncLocalStorage();
var MPP_CHALLENGE_TTL_MS = 5 * 6e4;
var MPP_HANDLER_RETENTION_MS = MPP_CHALLENGE_TTL_MS + 6e4;
var MPP_HANDLER_CACHE_MAX = 256;
var UNAVAILABLE_SUPPORTED_TRANSPORT = Object.freeze({
  async supported() {
    throw new Error("B402 supported-capability transport unavailable");
  }
});
var MppSeller = class _MppSeller {
  #policy;
  #capabilities;
  #runtime;
  #resourceUrl;
  #runWork;
  #routeCache = /* @__PURE__ */ new Map();
  constructor(options) {
    this.#policy = options.policy;
    this.#capabilities = options.capabilities;
    this.#runtime = options.runtime;
    this.#resourceUrl = options.resourceUrl;
    this.#runWork = options.runWork;
  }
  get state() {
    return x402SellerState(
      this.#policy.enabled,
      this.#capabilities.currentSnapshot()
    );
  }
  capabilitySnapshot() {
    return this.#capabilities.currentSnapshot();
  }
  capabilityStatus() {
    return this.state;
  }
  refreshCapabilities() {
    return this.#capabilities.freshSnapshot();
  }
  stop() {
    this.#capabilities.stop();
    this.#routeCache.clear();
  }
  static async create(options) {
    const cfg = options.cfg ?? loadStudioToml();
    const policy = B402SellerPolicy.fromToml(cfg);
    const networkTable = asTable3(cfg.network);
    const networkName = String(
      options.networkName ?? networkTable.default ?? "bsc-testnet"
    );
    const network = getNetwork(networkName);
    const payTo = (0, import_viem3.getAddress)(policy.payTo ?? options.walletAddress);
    const projectRoot = findProjectRoot() ?? process.cwd();
    const resolved = resolveSellerPolicy(cfg, "b402", {
      network: networkName
    });
    if (resolved.policy.price.kind !== "usd" || resolved.policy.price.value !== policy.priceUsd) {
      throw new Error("MPP+B402 seller policy price resolution mismatch");
    }
    const env = options.env ?? process.env;
    let transport = null;
    let runtime = null;
    if (policy.enabled && !isZeroPrice(policy.priceUsd)) {
      try {
        transport = resolveB402Transport(env);
        const secretKey = env.MPP_SECRET_KEY?.trim();
        const realm = env.MPP_REALM?.trim();
        if (transport && secretKey && Buffer.byteLength(secretKey, "utf8") >= 32 && realm) {
          runtime = Object.freeze({
            transport,
            replayStore: resolveB402ReplayStore({
              env,
              ...options.replayStore ? { replayStore: options.replayStore } : {}
            }),
            secretKey,
            realm,
            payTo,
            projectRoot,
            networkName,
            chainId: network.chainId
          });
        }
      } catch (error) {
        if (!isDormantConfigurationError(error)) throw error;
        console.warn(
          `[mpp] ${error instanceof Error ? error.message : String(error)}; paid MPP rail will remain dormant.`
        );
        transport = null;
        runtime = null;
      }
    }
    const capabilities = createSellerCapabilityManager({
      network: networkName,
      assets: resolved.policy.assets,
      priceUsd: policy.priceUsd,
      erc8183: { enabled: false },
      b402: policy.enabled && (isZeroPrice(policy.priceUsd) || runtime !== null) ? {
        enabled: true,
        transport: transport ?? UNAVAILABLE_SUPPORTED_TRANSPORT
      } : policy.enabled ? {
        enabled: true,
        transport: UNAVAILABLE_SUPPORTED_TRANSPORT
      } : { enabled: false }
    });
    await capabilities.start();
    return new _MppSeller({
      policy,
      capabilities,
      runtime,
      resourceUrl: options.resourceUrl,
      runWork: options.runWork
    });
  }
  async handle(request) {
    if (this.state === "disabled") {
      return jsonResponse(404, { error: "MPP seller disabled" });
    }
    const prompt = promptFrom(request).trim();
    if (isZeroPrice(this.#policy.priceUsd)) {
      if (!prompt) return missingPromptResponse();
      return runFreeWork(
        this.#runWork,
        prompt,
        this.#policy.workTimeoutSeconds
      );
    }
    if (hasPaymentCredential(request.headers) && !prompt) {
      return missingPromptResponse();
    }
    const runtime = this.#runtime;
    const snapshot = await this.#capabilities.freshSnapshot();
    const current = runtime === null ? [] : await this.#handlersForSnapshot(snapshot, runtime);
    const input = toRequest(request, this.#resourceUrl);
    const hasCredential = hasPaymentCredential(request.headers);
    const selectedRoute = hasCredential ? this.#routeForCredential(input) : null;
    const selected = hasCredential ? selectedRoute?.handler ?? null : current.length > 0 ? import_server5.Mppx.compose(...current.map((route) => route.handler)) : null;
    if (selected === null) {
      return hasCredential ? jsonResponse(402, {
        error: "MPP credential does not match an issued active route"
      }) : jsonResponse(503, {
        error: "MPP rail dormant: no active B402 payment route"
      });
    }
    let payment;
    const attempt = { unknown: false };
    try {
      payment = await settlementAttempt.run(attempt, () => selected(input));
    } catch (error) {
      if (error instanceof import_server3.B402SettlementUnknownError) {
        return jsonResponse(500, {
          error: "settlement outcome unknown; reconciliation required"
        });
      }
      if (error instanceof import_server3.B402Error) {
        return jsonResponse(502, { error: "B402 facilitator unavailable" });
      }
      return jsonResponse(500, { error: "MPP seller failed" });
    }
    if (attempt.unknown) {
      return jsonResponse(500, {
        error: "settlement outcome unknown; reconciliation required"
      });
    }
    if (payment.status === 402) return fromResponse(payment.challenge);
    if (selectedRoute === null) {
      return jsonResponse(500, { error: "MPP paid route binding unavailable" });
    }
    if (!prompt) return missingPromptResponse();
    const receiptProbe = payment.withReceipt(new Response(null));
    const receipt = import_mppx.Receipt.fromResponse(receiptProbe);
    try {
      const result = await withTimeout(
        this.#runWork({
          prompt,
          ...receipt.payer ? { payer: (0, import_viem3.getAddress)(receipt.payer) } : {}
        }),
        this.#policy.workTimeoutSeconds
      );
      return fromResponse(
        withTrustedAssetReceipt(
          payment,
          new Response(JSON.stringify({ result }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }),
          selectedRoute.binding
        )
      );
    } catch (error) {
      console.error(
        "MPP seller work failed after settlement",
        workFailureSummary(error)
      );
      return fromResponse(
        withTrustedAssetReceipt(
          payment,
          new Response(
            JSON.stringify({
              error: "work failed after settlement; payment retained",
              transaction: receipt.reference
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" }
            }
          ),
          selectedRoute.binding
        )
      );
    }
  }
  async #handlersForSnapshot(snapshot, runtime) {
    if (snapshot.network !== runtime.networkName || snapshot.rails.b402.free || snapshot.rails.b402.status === "dormant" || !snapshot.rails.b402.enabled) {
      this.#pruneRouteCache(/* @__PURE__ */ new Set());
      return [];
    }
    const network = getNetwork(runtime.networkName);
    const bindings = snapshot.rails.b402.assets.flatMap((asset) => {
      if (!asset.active) return [];
      const catalogAsset = network.b402Asset(asset.assetId);
      if (asset.address !== catalogAsset.address || asset.decimals !== catalogAsset.decimals) {
        throw new Error(`MPP capability metadata drift for ${asset.assetId}`);
      }
      const amount = b402UsdPriceToAtomic(
        runtime.networkName,
        asset.assetId,
        this.#policy.priceUsd
      ).toString();
      return asset.b402Routes.map((route) => {
        if (route.assetId !== asset.assetId || route.network !== `eip155:${runtime.chainId}` || !asset.activeMethods.includes(route.method)) {
          throw new Error(`MPP capability route drift for ${asset.assetId}`);
        }
        return Object.freeze({
          assetId: catalogAsset.assetId,
          symbol: catalogAsset.symbol,
          amount,
          priceUsd: this.#policy.priceUsd,
          currency: catalogAsset.address,
          recipient: runtime.payTo,
          method: route.method,
          decimals: catalogAsset.decimals,
          name: route.name,
          version: route.version,
          network: route.network,
          signerAddress: route.signerAddress,
          spenderAddress: route.spenderAddress
        });
      });
    });
    const currentFingerprints = new Set(bindings.map(routeFingerprint));
    this.#pruneRouteCache(currentFingerprints);
    const routes = [];
    for (const binding of bindings) {
      const fingerprint = routeFingerprint(binding);
      let route = this.#routeCache.get(fingerprint);
      if (route === void 0) {
        route = await this.#createRoute(runtime, fingerprint, binding);
        this.#routeCache.set(fingerprint, route);
      }
      route.retainUntil = Math.max(
        route.retainUntil,
        Date.now() + MPP_HANDLER_RETENTION_MS
      );
      routes.push(route);
    }
    this.#enforceCacheBound(currentFingerprints);
    return Object.freeze(routes);
  }
  async #createRoute(runtime, fingerprint, binding) {
    const audited = new AuditedB402Transport(runtime.transport, {
      chainId: runtime.chainId,
      networkName: runtime.networkName,
      payTo: runtime.payTo,
      priceUsd: this.#policy.priceUsd,
      projectRoot: runtime.projectRoot,
      resourceUrl: this.#resourceUrl
    });
    const client = new SnapshotMppTransport(audited, binding);
    const recordSettlementUnknown = createB402SettlementUnknownHandler({
      protocol: "mpp",
      networkName: runtime.networkName,
      chainId: runtime.chainId,
      payTo: runtime.payTo,
      projectRoot: runtime.projectRoot
    });
    const method = await import_server4.b402.charge({
      client,
      network: binding.network,
      currency: {
        address: binding.currency,
        decimals: binding.decimals,
        name: binding.name,
        version: binding.version
      },
      recipient: binding.recipient,
      store: runtime.replayStore,
      maxTimeoutSeconds: MPP_MAX_TIMEOUT_SECONDS,
      transferMethods: [binding.method],
      ...this.#policy.bazaar ? { bazaar: this.#policy.bazaar } : {},
      onSettlementUnknown: (event) => {
        recordSettlementUnknown(event);
        const attempt = settlementAttempt.getStore();
        if (attempt) attempt.unknown = true;
      }
    });
    const payments = import_server5.Mppx.create({
      methods: [method],
      secretKey: runtime.secretKey,
      realm: runtime.realm
    });
    return {
      fingerprint,
      binding,
      handler: payments.b402.charge({
        amount: this.#policy.priceUsd,
        transferMethod: binding.method
      }),
      createdAt: Date.now(),
      retainUntil: Date.now() + MPP_HANDLER_RETENTION_MS
    };
  }
  #routeForCredential(request) {
    const authorization = request.headers.get("authorization");
    const serialized = authorization ? import_mppx.Credential.extractPaymentScheme(authorization) : null;
    if (serialized === null) return null;
    let challengeRequest;
    try {
      challengeRequest = import_mppx.Credential.deserialize(serialized).challenge.request;
    } catch {
      return null;
    }
    const now = Date.now();
    const matches = [...this.#routeCache.values()].filter(
      (route) => route.retainUntil >= now && routeBindingMatches(route.binding, challengeRequest)
    );
    return matches.length === 1 ? matches[0] ?? null : null;
  }
  #pruneRouteCache(current) {
    const now = Date.now();
    for (const [fingerprint, route] of this.#routeCache) {
      if (!current.has(fingerprint) && route.retainUntil < now) {
        this.#routeCache.delete(fingerprint);
      }
    }
  }
  #enforceCacheBound(current) {
    if (this.#routeCache.size <= MPP_HANDLER_CACHE_MAX) return;
    const removable = [...this.#routeCache.values()].filter((route) => !current.has(route.fingerprint)).sort((a, b) => a.createdAt - b.createdAt);
    for (const route of removable) {
      if (this.#routeCache.size <= MPP_HANDLER_CACHE_MAX) break;
      this.#routeCache.delete(route.fingerprint);
    }
  }
};
function routeFingerprint(binding) {
  return JSON.stringify([
    binding.assetId,
    binding.network,
    binding.currency.toLowerCase(),
    binding.amount,
    binding.recipient.toLowerCase(),
    binding.method,
    binding.decimals,
    binding.name,
    binding.version,
    binding.signerAddress.toLowerCase(),
    binding.spenderAddress?.toLowerCase() ?? null
  ]);
}
function withTrustedAssetReceipt(payment, response, binding) {
  const wrapped = payment.withReceipt(response);
  const upstream = import_mppx.Receipt.fromResponse(wrapped);
  const receipt = import_mppx.Receipt.from({
    ...upstream,
    assetId: binding.assetId,
    symbol: binding.symbol,
    tokenAddress: binding.currency,
    decimals: binding.decimals,
    amountAtomic: binding.amount,
    priceUsd: binding.priceUsd
  });
  const headers = new Headers(wrapped.headers);
  headers.set("Payment-Receipt", import_mppx.Receipt.serialize(receipt));
  return new Response(wrapped.body, {
    status: wrapped.status,
    statusText: wrapped.statusText,
    headers
  });
}
function routeBindingMatches(binding, candidate) {
  if (!isRecord2(candidate) || !isRecord2(candidate.methodDetails)) return false;
  const details = candidate.methodDetails;
  const eip712 = details.eip712;
  if (!isRecord2(eip712)) return false;
  return candidate.amount === binding.amount && sameAddress(candidate.currency, binding.currency) && sameAddress(candidate.recipient, binding.recipient) && details.assetTransferMethod === binding.method && details.decimals === binding.decimals && eip712.name === binding.name && eip712.version === binding.version && details.maxTimeoutSeconds === MPP_MAX_TIMEOUT_SECONDS && details.network === binding.network && details.protocolVersion === 1 && sameAddress(details.signerAddress, binding.signerAddress) && (binding.spenderAddress === null ? details.spenderAddress === void 0 : sameAddress(details.spenderAddress, binding.spenderAddress));
}
function isRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function sameAddress(value, expected) {
  return typeof value === "string" && value.toLowerCase() === expected.toLowerCase();
}
var SnapshotMppTransport = class {
  #inner;
  #binding;
  constructor(inner, binding) {
    this.#inner = inner;
    this.#binding = binding;
  }
  async supported() {
    return {
      extensions: [],
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: this.#binding.network,
          extra: {
            assetTransferMethod: this.#binding.method,
            name: this.#binding.name,
            version: this.#binding.version,
            signerAddress: this.#binding.signerAddress,
            ...this.#binding.spenderAddress === null ? {} : { spenderAddress: this.#binding.spenderAddress }
          }
        }
      ],
      signers: {
        [this.#binding.network]: [this.#binding.signerAddress]
      }
    };
  }
  verify(request) {
    return this.#inner.verify(request);
  }
  settle(request) {
    return this.#inner.settle(request);
  }
};
var AuditedB402Transport = class {
  #inner;
  #audit;
  constructor(inner, audit) {
    this.#inner = inner;
    this.#audit = audit;
  }
  supported() {
    return this.#inner.supported();
  }
  verify(request) {
    return this.#inner.verify(request);
  }
  async settle(request) {
    const payload = request.paymentPayload;
    const payer = (0, import_b4022.isEip3009PaymentPayload)(payload) ? (0, import_viem3.getAddress)(await (0, import_b4022.recoverEip3009Payer)(payload)) : (0, import_b4022.isPermit2PaymentPayload)(payload) ? (0, import_viem3.getAddress)(payload.payload.permit2Authorization.from) : null;
    const nonce = (0, import_b4022.isEip3009PaymentPayload)(payload) ? payload.payload.authorization.nonce : (0, import_b4022.isPermit2PaymentPayload)(payload) ? payload.payload.permit2Authorization.nonce : "unknown";
    const transferMethod = (0, import_b4022.isEip3009PaymentPayload)(payload) ? "eip3009" : (0, import_b4022.isPermit2PaymentPayload)(payload) ? "permit2-exact" : "unknown";
    const selected = resolveX402SettlementAsset(
      this.#audit.networkName,
      request.paymentRequirements
    );
    const decimals = getNetwork(this.#audit.networkName).b402Asset(
      selected.assetId
    ).decimals;
    const requestDigest = b402SettlementRequestDigest(request, {
      payer: payer ?? "unknown",
      nonce,
      transferMethod
    });
    const reconciliationKey = b402ReconciliationKey({
      protocol: "mpp",
      network: request.paymentRequirements.network,
      tokenAddress: selected.tokenAddress,
      payer: payer ?? "unknown",
      nonce,
      transferMethod,
      requestDigest
    });
    try {
      return await auditedOp(
        "mpp_sell",
        {
          actor: "agent",
          chainId: this.#audit.chainId,
          asset: selected.assetId,
          amount: selected.amountAtomic,
          agentAddr: this.#audit.payTo,
          counterparty: payer,
          context: {
            resource: this.#audit.resourceUrl,
            nonce,
            network: request.paymentRequirements.network,
            transfer_method: transferMethod,
            price_usd: this.#audit.priceUsd,
            asset_symbol: selected.symbol,
            token_address: selected.tokenAddress,
            decimals,
            amount_atomic: selected.amountAtomic,
            reconciliation_key: reconciliationKey,
            request_sha256: requestDigest,
            request_ref: `sha256:${requestDigest}`
          },
          projectRoot: this.#audit.projectRoot
        },
        async (handle) => {
          const result = (0, import_b4022.parseSettleResult)(await this.#inner.settle(request));
          if (!result.success) throw new RejectedSettlementResult(result);
          assertSettlementMatches(result, request, payer);
          handle.txHash = result.transaction;
          return result;
        }
      );
    } catch (error) {
      if (error instanceof RejectedSettlementResult) return error.result;
      throw error;
    }
  }
};
var RejectedSettlementResult = class extends Error {
  result;
  constructor(result) {
    super(
      result.errorMessage ?? result.errorReason ?? "B402 settlement rejected"
    );
    this.name = "RejectedSettlementResult";
    this.result = result;
  }
};
function assertSettlementMatches(result, request, payer) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(result.transaction)) {
    throw new Error("B402 settlement returned an invalid transaction hash");
  }
  if (result.amount !== request.paymentRequirements.amount) {
    throw new Error("B402 settlement returned an unexpected amount");
  }
  if (result.network !== request.paymentRequirements.network) {
    throw new Error("B402 settlement returned an unexpected network");
  }
  if (!payer || result.payer.toLowerCase() !== payer.toLowerCase()) {
    throw new Error("B402 settlement returned an unexpected payer");
  }
}
function isDormantConfigurationError(error) {
  return error instanceof X402SellerConfigError;
}
function toRequest(request, resourceUrl) {
  const url = new URL(resourceUrl);
  for (const [key, value] of Object.entries(request.query ?? {})) {
    url.searchParams.set(key, value);
  }
  const init = {
    method: request.method,
    headers: request.headers
  };
  if (request.body !== void 0 && request.method.toUpperCase() !== "GET" && request.method.toUpperCase() !== "HEAD") {
    init.body = request.body;
  }
  return new Request(url, init);
}
async function fromResponse(response) {
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text()
  };
}
function hasPaymentCredential(headers) {
  const authorization = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === "authorization"
  )?.[1];
  return /^\s*Payment\s+/i.test(authorization ?? "");
}
function promptFrom(request) {
  const queryPrompt = request.query?.prompt;
  if (queryPrompt !== void 0) return queryPrompt;
  if (!request.body) return "";
  try {
    const parsed = JSON.parse(request.body);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && typeof parsed.prompt === "string") {
      return parsed.prompt;
    }
  } catch {
    return request.body;
  }
  return "";
}
function isZeroPrice(priceUsd) {
  return /^0(?:\.0+)?$/.test(priceUsd);
}
function jsonResponse(status, body) {
  return {
    status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
function missingPromptResponse() {
  return jsonResponse(400, {
    error: "MPP request requires a non-empty prompt"
  });
}
async function runFreeWork(runWork, prompt, timeoutSeconds) {
  try {
    return jsonResponse(200, {
      result: await withTimeout(runWork({ prompt }), timeoutSeconds)
    });
  } catch (error) {
    console.warn(`[mpp] free work failed: ${workFailureSummary(error)}`);
    return jsonResponse(500, { error: "work failed" });
  }
}
async function withTimeout(promise, timeoutSeconds) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("work timed out")),
          timeoutSeconds * 1e3
        );
      })
    ]);
  } finally {
    if (timer !== void 0) clearTimeout(timer);
  }
}
function asTable3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

// src/b402/protocol.ts
var B402_PAYMENT_PROTOCOLS = ["x402", "mpp"];
var B402_SELL_PATHS = Object.freeze({
  x402: "/x402",
  mpp: "/mpp"
});
function resolveB402PaymentProtocol(cfg) {
  const stack = asTable4(cfg?.stack);
  const raw = stack.protocols;
  if (raw !== void 0 && !Array.isArray(raw)) {
    throw new X402SellerConfigError("[stack].protocols must be an array");
  }
  const faces = Array.isArray(raw) ? raw.map((face) => String(face).trim().toUpperCase()) : [];
  const hasX402 = faces.includes("X402");
  const hasMpp = faces.includes("MPP");
  if (hasX402 && hasMpp) {
    throw new X402SellerConfigError(
      "X402 and MPP are alternative B402 payment protocols; select exactly one"
    );
  }
  return hasMpp ? "mpp" : "x402";
}
function b402SellPath(cfg) {
  return B402_SELL_PATHS[resolveB402PaymentProtocol(cfg)];
}
function asTable4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

// src/x402/seller.ts
var import_b4023 = require("@bnb-chain/b402");
var import_server6 = require("@bnb-chain/b402/server");
var import_http = require("@x402/core/http");
var import_viem4 = require("viem");

// src/x402/sellerPolicy.ts
var X402SellerPolicy = class _X402SellerPolicy extends B402SellerPolicy {
  static fromToml(cfg) {
    return new _X402SellerPolicy(B402SellerPolicy.fromToml(cfg));
  }
};

// src/x402/seller.ts
var X402Seller = class _X402Seller {
  #policy;
  #capabilities;
  #b402;
  #resourceUrl;
  #runWork;
  #projectRoot;
  #networkName;
  #chainId;
  #payTo;
  constructor(options) {
    this.#policy = options.policy;
    this.#capabilities = options.capabilities;
    this.#b402 = options.b402;
    this.#resourceUrl = options.resourceUrl;
    this.#runWork = options.runWork;
    this.#projectRoot = options.projectRoot;
    this.#networkName = options.networkName;
    this.#chainId = options.chainId;
    this.#payTo = options.payTo;
  }
  /** Dynamic state from the same immutable capability snapshot as requests. */
  get state() {
    return x402SellerState(
      this.#policy.enabled,
      this.#capabilities.currentSnapshot()
    );
  }
  /** Read-only capability status entrypoint for status/health consumers. */
  capabilitySnapshot() {
    return this.#capabilities.currentSnapshot();
  }
  capabilityStatus() {
    return this.state;
  }
  async refreshCapabilities() {
    return this.#capabilities.freshSnapshot();
  }
  stop() {
    this.#capabilities.stop();
  }
  static async create(options) {
    const cfg = options.cfg ?? loadStudioToml();
    const policy = X402SellerPolicy.fromToml(cfg);
    const projectRoot = findProjectRoot() ?? process.cwd();
    const networkTable = typeof cfg.network === "object" && cfg.network !== null && !Array.isArray(cfg.network) ? cfg.network : {};
    const networkName = String(
      options.networkName ?? networkTable.default ?? "bsc-testnet"
    );
    const network = getNetwork(networkName);
    const payTo = (0, import_viem4.getAddress)(policy.payTo ?? options.walletAddress);
    const resolved = resolveSellerPolicy(cfg, "b402", { network: networkName });
    if (resolved.policy.price.kind !== "usd") {
      throw new Error("B402 Seller requires a USD seller price");
    }
    if (resolved.policy.price.value !== policy.priceUsd) {
      throw new Error("B402 Seller policy price resolution mismatch");
    }
    let transport = null;
    if (policy.enabled && !isZeroPrice2(policy.priceUsd)) {
      try {
        transport = resolveB402Transport(options.env ?? process.env);
      } catch (error) {
        if (!isPartialB402ConfigError(error)) throw error;
        console.warn(
          "[x402] partial B402 configuration; paid x402 rail will remain dormant until all merchant credentials are configured."
        );
      }
    }
    const capabilities = createSellerCapabilityManager({
      network: networkName,
      assets: resolved.policy.assets,
      priceUsd: policy.priceUsd,
      erc8183: { enabled: false },
      b402: policy.enabled ? {
        enabled: true,
        transport: transport ?? UNAVAILABLE_SUPPORTED_TRANSPORT2
      } : { enabled: false }
    });
    await capabilities.start();
    const b4022 = transport === null || isZeroPrice2(policy.priceUsd) ? null : await createSellerB402({
      policy,
      networkName,
      chainId: network.chainId,
      payTo,
      resourceUrl: options.resourceUrl,
      projectRoot,
      transport,
      ...options.env !== void 0 ? { env: options.env } : {},
      ...options.replayStore !== void 0 ? { replayStore: options.replayStore } : {}
    });
    return new _X402Seller({
      policy,
      capabilities,
      b402: b4022,
      resourceUrl: options.resourceUrl,
      runWork: options.runWork,
      projectRoot,
      networkName,
      chainId: network.chainId,
      payTo
    });
  }
  async handle(request) {
    if (!this.#policy.enabled) {
      return jsonResponse2(404, { error: "x402 seller disabled" });
    }
    const prompt = promptFrom2(request).trim();
    if (isZeroPrice2(this.#policy.priceUsd)) {
      if (!prompt) return missingPromptResponse2();
      try {
        const result = await withTimeout2(
          this.#runWork({ prompt }),
          this.#policy.workTimeoutSeconds
        );
        return jsonResponse2(200, { result });
      } catch (error) {
        console.warn(`[x402] free work failed: ${workFailureSummary(error)}`);
        return jsonResponse2(500, { error: "work failed" });
      }
    }
    const snapshot = await this.#capabilities.freshSnapshot();
    const state = x402SellerState(this.#policy.enabled, snapshot);
    if (state === "dormant" || this.#b402 === null) {
      return jsonResponse2(503, {
        error: "x402 rail dormant: no active B402 payment route"
      });
    }
    let http2;
    try {
      const accepts = buildX402SellerAccepts(
        snapshot,
        this.#policy.priceUsd,
        this.#payTo
      );
      if (accepts.length === 0) {
        return jsonResponse2(503, {
          error: "x402 rail dormant: no active B402 payment route"
        });
      }
      http2 = await this.#b402.createHttp(snapshot, accepts);
    } catch (error) {
      return facilitatorFailureResponse(error);
    }
    const adapter = new SellerHTTPAdapter(request, this.#resourceUrl);
    const context = {
      adapter,
      path: request.path,
      method: request.method
    };
    let processed;
    try {
      processed = await http2.processHTTPRequest(context);
    } catch (error) {
      return facilitatorFailureResponse(error);
    }
    if (processed.type === "payment-error") {
      return paymentErrorResponse(processed.response);
    }
    if (processed.type === "no-payment-required") {
      return jsonResponse2(404, { error: "x402 route not found" });
    }
    let selected;
    try {
      selected = resolveX402SettlementAsset(
        this.#networkName,
        processed.paymentRequirements
      );
    } catch {
      return jsonResponse2(500, { error: "x402 settlement asset rejected" });
    }
    let payer;
    let nonce;
    let transferMethod;
    if ((0, import_b4023.isEip3009PaymentPayload)(processed.paymentPayload)) {
      if (!prompt) return missingPromptResponse2();
      payer = (0, import_viem4.getAddress)(await (0, import_b4023.recoverEip3009Payer)(processed.paymentPayload));
      nonce = processed.paymentPayload.payload.authorization.nonce;
      transferMethod = "eip3009";
    } else if ((0, import_b4023.isPermit2PaymentPayload)(processed.paymentPayload)) {
      if (!prompt) return missingPromptResponse2();
      payer = (0, import_viem4.getAddress)(
        processed.paymentPayload.payload.permit2Authorization.from
      );
      nonce = processed.paymentPayload.payload.permit2Authorization.nonce;
      transferMethod = "permit2-exact";
    } else {
      return paymentErrorResponse({
        status: 402,
        headers: {},
        body: { error: "invalid payment payload (eip3009 or permit2-exact)" }
      });
    }
    const requestDigest = b402SettlementRequestDigest(
      {
        x402Version: 2,
        paymentRequirements: processed.paymentRequirements
      },
      { payer, nonce, transferMethod }
    );
    const reconciliationKey = b402ReconciliationKey({
      protocol: "x402",
      network: processed.paymentRequirements.network,
      tokenAddress: selected.tokenAddress,
      payer,
      nonce,
      transferMethod,
      requestDigest
    });
    let settlement;
    try {
      settlement = await auditedOp(
        "x402_sell",
        {
          actor: "agent",
          chainId: this.#chainId,
          asset: selected.assetId,
          amount: selected.amountAtomic,
          agentAddr: this.#payTo,
          counterparty: payer,
          context: {
            resource: this.#resourceUrl,
            nonce,
            network: processed.paymentRequirements.network,
            transfer_method: transferMethod,
            asset_symbol: selected.symbol,
            token_address: selected.tokenAddress,
            amount_atomic: selected.amountAtomic,
            reconciliation_key: reconciliationKey,
            request_sha256: requestDigest,
            request_ref: `sha256:${requestDigest}`
          },
          projectRoot: this.#projectRoot
        },
        async (handle) => {
          const result = await http2.processSettlement(
            processed.paymentPayload,
            processed.paymentRequirements,
            processed.declaredExtensions,
            { request: context }
          );
          if (!result.success) throw new SettlementRejectedError(result);
          handle.txHash = result.transaction;
          if (!result.payer || result.payer.toLowerCase() !== payer.toLowerCase()) {
            throw new Error(
              "B402 settlement returned an unexpected payer; reconciliation required"
            );
          }
          payer = (0, import_viem4.getAddress)(result.payer);
          return result;
        }
      );
    } catch (error) {
      if (error instanceof SettlementRejectedError) {
        return paymentErrorResponse(error.result.response);
      }
      return facilitatorFailureResponse(error);
    }
    const receiptHeaders = withReceiptAliases(settlement.headers);
    try {
      const result = await withTimeout2(
        this.#runWork({ prompt, payer }),
        this.#policy.workTimeoutSeconds
      );
      return {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...receiptHeaders
        },
        body: JSON.stringify({ result })
      };
    } catch (error) {
      console.error(
        "x402 seller work failed after settlement",
        workFailureSummary(error)
      );
      return {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...receiptHeaders
        },
        body: JSON.stringify({
          error: "work failed after settlement; payment retained",
          transaction: settlement.transaction
        })
      };
    }
  }
};
var UNAVAILABLE_SUPPORTED_TRANSPORT2 = Object.freeze({
  async supported() {
    throw new Error("B402 supported-capability transport unavailable");
  }
});
function isPartialB402ConfigError(error) {
  return error instanceof X402SellerConfigError;
}
var SettlementRejectedError = class extends Error {
  result;
  constructor(result) {
    super(result.errorReason);
    this.name = "SettlementRejectedError";
    this.result = result;
  }
};
var SellerHTTPAdapter = class {
  #request;
  #resourceUrl;
  #headers;
  constructor(request, resourceUrl) {
    this.#request = request;
    this.#resourceUrl = resourceUrl;
    this.#headers = Object.fromEntries(
      Object.entries(request.headers).map(([key, value]) => [
        key.toLowerCase(),
        value
      ])
    );
  }
  getHeader(name) {
    const normalized = name.toLowerCase();
    if (normalized === "payment-signature") {
      return this.#headers["payment-signature"] ?? this.#headers["x-payment"];
    }
    return this.#headers[normalized];
  }
  getMethod() {
    return this.#request.method;
  }
  getPath() {
    return this.#request.path;
  }
  getUrl() {
    return this.#resourceUrl;
  }
  getAcceptHeader() {
    return this.#headers.accept ?? "";
  }
  getUserAgent() {
    return this.#headers["user-agent"] ?? "";
  }
  getQueryParams() {
    return { ...this.#request.query ?? {} };
  }
  getQueryParam(name) {
    return this.#request.query?.[name];
  }
  getBody() {
    if (this.#request.body === void 0) return void 0;
    try {
      return JSON.parse(this.#request.body);
    } catch {
      return this.#request.body;
    }
  }
};
function paymentErrorResponse(response) {
  if (response.status === 402) {
    const required = headerValue(response.headers, "PAYMENT-REQUIRED");
    if (required) {
      const body = (0, import_http.decodePaymentRequiredHeader)(required);
      return {
        status: 402,
        headers: {
          ...response.headers,
          "Content-Type": "application/json",
          "X-PAYMENT-REQUIREMENTS": required
        },
        body: JSON.stringify(body)
      };
    }
  }
  return {
    status: response.status,
    headers: { ...response.headers },
    body: JSON.stringify(response.body ?? {})
  };
}
function headerValue(headers, name) {
  const needle = name.toLowerCase();
  return Object.entries(headers).find(
    ([key]) => key.toLowerCase() === needle
  )?.[1];
}
function withReceiptAliases(headers) {
  const receipt = headerValue(headers, "PAYMENT-RESPONSE");
  return receipt ? {
    ...headers,
    "X-PAYMENT-RESPONSE": receipt
  } : { ...headers };
}
function facilitatorFailureResponse(error) {
  const b4022 = unwrapB402Error(error);
  if (b4022 instanceof import_server6.B402SettlementUnknownError) {
    return jsonResponse2(500, {
      error: "settlement outcome unknown; reconciliation required"
    });
  }
  if (b4022 instanceof import_server6.B402Error) {
    return jsonResponse2(502, { error: "B402 facilitator unavailable" });
  }
  return jsonResponse2(500, { error: "x402 seller failed" });
}
async function withTimeout2(promise, timeoutSeconds) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("work timed out")),
          timeoutSeconds * 1e3
        );
      })
    ]);
  } finally {
    if (timer !== void 0) clearTimeout(timer);
  }
}
function promptFrom2(request) {
  const queryPrompt = request.query?.prompt;
  if (queryPrompt !== void 0) return queryPrompt;
  if (!request.body) return "";
  try {
    const parsed = JSON.parse(request.body);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && typeof parsed.prompt === "string") {
      return parsed.prompt;
    }
  } catch {
    return request.body;
  }
  return "";
}
function isZeroPrice2(priceUsd) {
  return /^0(?:\.0+)?$/.test(priceUsd);
}
function jsonResponse2(status, body) {
  return {
    status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
function missingPromptResponse2() {
  return jsonResponse2(400, {
    error: "x402 request requires a non-empty prompt"
  });
}

// src/b402/seller.ts
var B402Seller = class _B402Seller {
  protocol;
  path;
  #adapter;
  constructor(protocol, adapter) {
    this.protocol = protocol;
    this.path = B402_SELL_PATHS[protocol];
    this.#adapter = adapter;
  }
  /** Always reflects the selected adapter's current state. */
  get state() {
    return this.#adapter.state;
  }
  capabilitySnapshot() {
    return this.#adapter.capabilitySnapshot();
  }
  capabilityStatus() {
    return this.#adapter.capabilityStatus();
  }
  refreshCapabilities() {
    return this.#adapter.refreshCapabilities();
  }
  stop() {
    this.#adapter.stop();
  }
  static async create(options) {
    const protocol = resolveB402PaymentProtocol(options.cfg);
    const adapter = protocol === "mpp" ? await MppSeller.create(options) : await X402Seller.create(options);
    return new _B402Seller(protocol, adapter);
  }
  handle(request) {
    if (request.path !== this.path) {
      return Promise.resolve({
        status: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "B402 route not found" })
      });
    }
    return this.#adapter.handle(request);
  }
};

// src/x402/envelope.ts
var INPUT_LIMIT_BYTES = 1024 * 1024;
var OUTPUT_LIMIT_BYTES = 5 * 1024 * 1024;
function createEnvelopeMiddleware(opts) {
  return (req, res, next) => {
    const candidate = req.body;
    if (!isEnvelopeCandidate(candidate)) {
      next();
      return;
    }
    void dispatchEnvelope(candidate, opts.port).then((out) => {
      res.status(200).json(out);
    }).catch(() => {
      res.status(200).json(errorEnvelope(500, "envelope dispatch failed"));
    });
  };
}
async function dispatchEnvelope(candidate, port) {
  if (candidate.v !== 1) {
    return errorEnvelope(505, "unsupported envelope version");
  }
  if (typeof candidate.method !== "string" || typeof candidate.path !== "string" || !isPath(candidate.path)) {
    return errorEnvelope(400, "invalid envelope request");
  }
  const request = candidate;
  const encodedBody = request.body ?? "";
  if (typeof encodedBody !== "string" || !isBase64(encodedBody)) {
    return errorEnvelope(400, "invalid base64 request body");
  }
  const body = Buffer.from(encodedBody, "base64");
  if (body.byteLength > INPUT_LIMIT_BYTES) {
    return errorEnvelope(413, "envelope request body exceeds 1 MiB");
  }
  const base = new URL(`http://127.0.0.1:${port}`);
  const url = new URL(request.path, base);
  if (request.path.includes("\\") || url.origin !== base.origin) {
    return errorEnvelope(400, "invalid envelope request");
  }
  appendQuery(url, request.query);
  const method = request.method.toUpperCase();
  const response = await fetch(url, {
    method,
    headers: requestHeaders(request.headers),
    body: method === "GET" || method === "HEAD" ? void 0 : body,
    redirect: "manual"
  });
  const advertisedLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(advertisedLength) && advertisedLength > OUTPUT_LIMIT_BYTES) {
    return errorEnvelope(413, "envelope response body exceeds 5 MiB");
  }
  const responseBody = Buffer.from(await response.arrayBuffer());
  if (responseBody.byteLength > OUTPUT_LIMIT_BYTES) {
    return errorEnvelope(413, "envelope response body exceeds 5 MiB");
  }
  const headers = {};
  for (const [name, value] of response.headers.entries()) {
    const lower = name.toLowerCase();
    if (lower !== "set-cookie") {
      headers[lower] = value;
    }
  }
  return {
    v: 1,
    status: response.status,
    headers,
    body: responseBody.toString("base64")
  };
}
function isEnvelopeCandidate(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && "v" in value && "method" in value && "path" in value;
}
function isPath(value) {
  return value.startsWith("/") && !value.startsWith("//");
}
function isBase64(value) {
  return value === "" || value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value);
}
function appendQuery(url, query) {
  if (query === void 0) return;
  for (const [name, value] of Object.entries(query)) {
    if (typeof value === "string") {
      url.searchParams.append(name, value);
    }
  }
}
function requestHeaders(values) {
  const headers = {};
  if (values === void 0) return headers;
  for (const [name, value] of Object.entries(values)) {
    const lower = name.toLowerCase();
    if (typeof value === "string" && !["connection", "content-length", "host", "transfer-encoding"].includes(
      lower
    )) {
      headers[lower] = value;
    }
  }
  return headers;
}
function errorEnvelope(status, message) {
  return {
    v: 1,
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: Buffer.from(JSON.stringify({ error: message })).toString("base64")
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  B402Seller,
  B402SellerPolicy,
  B402_PAYMENT_PROTOCOLS,
  B402_SELL_PATHS,
  MPP_SELL_PATH,
  MppSeller,
  _resetB402ReplayStore,
  _setB402ReplayStore,
  b402SellPath,
  createEnvelopeMiddleware,
  resolveB402PaymentProtocol,
  resolveB402ReplayStore
});
