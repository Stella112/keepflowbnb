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

// src/erc8004/index.ts
var erc8004_exports = {};
__export(erc8004_exports, {
  AlreadyRegisteredError: () => AlreadyRegisteredError,
  ERC8004Error: () => ERC8004Error,
  ERC8004PartialRegistrationError: () => ERC8004PartialRegistrationError,
  ERC8004TransactionPendingError: () => ERC8004TransactionPendingError,
  MCP_PROTOCOL_VERSION: () => MCP_PROTOCOL_VERSION,
  NotRegisteredError: () => NotRegisteredError,
  _buildEndpoint: () => _buildEndpoint,
  _extractTokenId: () => _extractTokenId,
  _setSdkFactory: () => _setSdkFactory,
  a2aAgentCardEndpoint: () => a2aAgentCardEndpoint,
  erc8004SdkNetwork: () => erc8004SdkNetwork,
  getMetadata: () => getMetadata,
  mcpStreamableEndpoint: () => mcpStreamableEndpoint,
  register: () => register,
  resolve: () => resolve3,
  resolveService: () => resolveService,
  setMetadata: () => setMetadata,
  show: () => show,
  updateEndpoint: () => updateEndpoint,
  updateServiceEndpoint: () => updateServiceEndpoint
});
module.exports = __toCommonJS(erc8004_exports);
var import_sdk2 = require("@bnbagent/sdk");

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
var PAYMASTER_URL_ENV_VAR = {
  "bsc-mainnet": "BNBAGENT_PAYMASTER_URL_BSC_MAINNET",
  "bsc-testnet": "BNBAGENT_PAYMASTER_URL_BSC_TESTNET"
};
function envRpc(name) {
  const raw = (process.env[RPC_ENV_VAR[name]] ?? "").trim();
  return raw || null;
}
function envPaymasterUrl(name) {
  const envVar = PAYMASTER_URL_ENV_VAR[name];
  const raw = (process.env[envVar] ?? "").trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${envVar} must be a valid http(s) URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${envVar} must use http or https.`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${envVar} must not contain embedded credentials.`);
  }
  return raw;
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
var BSC_TESTNET_TBNB_TELEGRAM_FAUCET = "https://t.me/bnbchain_official_bot";
var BSC_TESTNET_FAUCET_DOCS_URL = "https://docs.bnbchain.org/bnb-smart-chain/developers/faucet/";
function tbnbFaucetHint(address = "<your-wallet-address>") {
  return `get tBNB via Telegram ${BSC_TESTNET_TBNB_TELEGRAM_FAUCET} \u2014 send "I would like to get tBNB to my wallet ${address}" (more options: ${BSC_TESTNET_FAUCET_DOCS_URL})`;
}
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
function sdkNetwork(name) {
  getNetwork(name);
  const nc = (0, import_sdk.resolveNetwork)(name);
  const override = envRpc(name);
  const sdkEnvOverride = (process.env.RPC_URL ?? "").trim();
  const paymasterOverride = nc.usePaymaster ? envPaymasterUrl(name) : null;
  return {
    ...nc,
    rpcUrl: override || sdkEnvOverride || DEFAULT_RPC[name],
    ...paymasterOverride ? { paymasterUrl: paymasterOverride } : {}
  };
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

// src/audit/gas.ts
var defaultReceiptFetcher = async (txHash, network) => {
  const client = (0, import_viem.createPublicClient)({
    transport: (0, import_viem.http)(getNetwork(network).rpcUrl)
  });
  const receipt = await client.getTransactionReceipt({
    hash: txHash
  });
  return {
    gasUsed: receipt.gasUsed,
    effectiveGasPrice: receipt.effectiveGasPrice
  };
};
var receiptFetcher = defaultReceiptFetcher;
var TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
async function attachGasContext(handle, network, ledgerOp) {
  const txHash = handle.txHash;
  if (txHash === null || !TX_HASH_RE.test(txHash)) {
    return;
  }
  try {
    const { gasUsed, effectiveGasPrice } = await receiptFetcher(
      txHash,
      network
    );
    handle.extraContext.gas = {
      gas_used: gasUsed.toString(),
      effective_gas_price_wei: effectiveGasPrice.toString(),
      wallet_paid_wei: (gasUsed * effectiveGasPrice).toString()
    };
    if (ledgerOp !== void 0) {
      try {
        await getSharedBudgetTracker().recordEntry({
          ts: (/* @__PURE__ */ new Date()).toISOString(),
          op: ledgerOp,
          tx_hash: txHash,
          gas_used: gasUsed.toString(),
          wallet_paid_wei: (gasUsed * effectiveGasPrice).toString(),
          sponsored: effectiveGasPrice === 0n
        });
      } catch {
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`audit gas capture skipped: ${maskUrlSecrets(msg)}`);
  }
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

// src/erc8004/index.ts
var ERC8004Error = class extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "ERC8004Error";
  }
};
var AlreadyRegisteredError = class extends ERC8004Error {
  agentId;
  constructor(message, opts = {}) {
    super(message);
    this.name = "AlreadyRegisteredError";
    this.agentId = opts.agentId ?? null;
  }
};
var NotRegisteredError = class extends ERC8004Error {
  constructor(message) {
    super(message);
    this.name = "NotRegisteredError";
  }
};
var ERC8004TransactionPendingError = class extends ERC8004Error {
  txHash;
  timeoutSeconds;
  agentId;
  constructor(message, opts) {
    super(message);
    this.name = "ERC8004TransactionPendingError";
    this.txHash = opts.txHash;
    this.timeoutSeconds = opts.timeoutSeconds ?? null;
    this.agentId = opts.agentId ?? null;
  }
};
var ERC8004PartialRegistrationError = class extends ERC8004Error {
  agentId;
  agentUri;
  cause;
  txHash;
  retryable;
  constructor(message, opts) {
    super(message);
    this.name = "ERC8004PartialRegistrationError";
    this.agentId = opts.agentId;
    this.agentUri = opts.agentUri;
    this.cause = opts.cause;
    this.txHash = opts.txHash ?? null;
    this.retryable = opts.retryable ?? true;
  }
};
function erc8004SdkNetwork(wallet, network, opts = {}) {
  const nc = sdkNetwork(network);
  if (opts.noPaymaster) {
    return { ...nc, usePaymaster: false };
  }
  if (wallet instanceof import_sdk2.TWAKProvider && network === "bsc-mainnet") {
    const override = process.env[PAYMASTER_URL_ENV_VAR[network]]?.trim();
    if (override && nc.usePaymaster) {
      console.warn(
        `${PAYMASTER_URL_ENV_VAR[network]} is ignored for TWAK ERC-8004 writes on bsc-mainnet because Trust's gateway owns mainnet sponsorship.`
      );
    }
    return { ...nc, usePaymaster: false };
  }
  return nc;
}
var defaultSdkFactory = (wallet, network, opts) => import_sdk2.ERC8004Agent.create({
  walletProvider: wallet,
  network: erc8004SdkNetwork(wallet, network, opts)
});
var sdkFactory = defaultSdkFactory;
function _setSdkFactory(factory) {
  sdkFactory = factory ?? defaultSdkFactory;
}
function makeSdk(wallet, network, opts) {
  getNetwork(network);
  return sdkFactory(wallet, network, opts);
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function isSdkPending(exc) {
  return exc instanceof import_sdk2.TransactionPendingError || exc instanceof Error && exc.name === "TransactionPendingError";
}
function isSdkPartial(exc) {
  return exc instanceof import_sdk2.ERC8004PartialRegistrationError || exc instanceof Error && exc.name === "ERC8004PartialRegistrationError";
}
function pendingError(exc, opts) {
  const agent = opts.agentId != null ? ` agent_id=${opts.agentId}` : "";
  return new ERC8004TransactionPendingError(
    `ERC-8004 ${opts.action} transaction broadcast but not confirmed yet${agent}: tx_hash=${exc.txHash}. Check the transaction before retrying.`,
    {
      txHash: exc.txHash,
      timeoutSeconds: exc.timeoutSeconds ?? null,
      agentId: opts.agentId ?? null
    }
  );
}
function partialRegistrationError(exc) {
  const txHash = exc.txHash ?? null;
  const remediation = txHash ? ` Pending tx_hash=${txHash}. Check whether it confirmed before retrying \`bag erc8004 update-endpoint --endpoint <url>\`.` : " Run `bag erc8004 update-endpoint --endpoint <url>` to complete the advertised endpoint.";
  return new ERC8004PartialRegistrationError(
    `ERC-8004 register created agent_id=${exc.agentId}, but setAgentURI did not complete.${remediation}`,
    {
      agentId: Number(exc.agentId),
      agentUri: exc.agentUri ?? null,
      cause: exc.cause ?? exc,
      txHash,
      retryable: exc.retryable ?? true
    }
  );
}
var FOUNDRY_CARD_RE = /\/agentCard\/v[0-9][0-9.]*$/i;
function isAlreadyCard(path) {
  return path.endsWith(import_sdk2.AgentEndpoint.A2A_WELL_KNOWN_PATH) || FOUNDRY_CARD_RE.test(path);
}
function stripTrailingSlashes(s) {
  return s.replace(/\/+$/, "");
}
function a2aAgentCardEndpoint(endpoint) {
  const wellKnown = import_sdk2.AgentEndpoint.A2A_WELL_KNOWN_PATH;
  const raw = String(endpoint ?? "").trim();
  let parts;
  try {
    parts = new URL(raw);
  } catch {
    const url = stripTrailingSlashes(raw);
    return isAlreadyCard(url) ? url : `${url}${wellKnown}`;
  }
  if (!parts.protocol || !parts.host) {
    const url = stripTrailingSlashes(raw);
    return isAlreadyCard(url) ? url : `${url}${wellKnown}`;
  }
  let path = stripTrailingSlashes(parts.pathname);
  if (!isAlreadyCard(path)) {
    path = path ? `${path}${wellKnown}` : wellKnown;
  }
  return `${parts.protocol}//${parts.host}${path}${parts.search}${parts.hash}`;
}
var MCP_PROTOCOL_VERSION = "2025-06-18";
var MCP_PATH = "/mcp";
function mcpStreamableEndpoint(endpoint) {
  const raw = String(endpoint ?? "").trim();
  let parts;
  try {
    parts = new URL(raw);
  } catch {
    const url = stripTrailingSlashes(raw);
    return url.endsWith(MCP_PATH) ? url : `${url}${MCP_PATH}`;
  }
  if (!parts.protocol || !parts.host) {
    const url = stripTrailingSlashes(raw);
    return url.endsWith(MCP_PATH) ? url : `${url}${MCP_PATH}`;
  }
  let path = stripTrailingSlashes(parts.pathname);
  if (!path.endsWith(MCP_PATH)) {
    path = path ? `${path}${MCP_PATH}` : MCP_PATH;
  }
  return `${parts.protocol}//${parts.host}${path}${parts.search}${parts.hash}`;
}
function _extractTokenId(agentRecord) {
  const tokenId = agentRecord.token_id;
  if (tokenId !== void 0 && tokenId !== null) return Number(tokenId);
  const raw = agentRecord.agent_id ?? agentRecord.agentId;
  if (raw === void 0 || raw === null) {
    throw new ERC8004Error(
      `Agent record missing agent_id/token_id: ${JSON.stringify(agentRecord)}`
    );
  }
  if (typeof raw === "number") return raw;
  const s = String(raw);
  if (/^\d+$/.test(s)) return Number(s);
  const parts = s.split(":");
  const last = parts[parts.length - 1];
  const n = Number(last);
  if (!Number.isFinite(n)) {
    throw new ERC8004Error(
      `Agent record missing agent_id/token_id: ${JSON.stringify(agentRecord)}`
    );
  }
  return n;
}
async function findOwnedAgent(sdk) {
  const myAddress = sdk.walletAddress.toLowerCase();
  let offset = 0;
  const pageSize = 100;
  for (let page = 0; page < 10; page++) {
    const result = asRecord(await sdk.getAllAgents(pageSize, offset));
    const items = Array.isArray(result?.items) ? result.items : [];
    for (const agent of items) {
      const rec = asRecord(agent);
      if (rec === null) continue;
      const owner = String(rec.owner_address ?? rec.owner ?? "").toLowerCase();
      if (owner === myAddress) return rec;
    }
    if (items.length < pageSize) return null;
    offset += pageSize;
  }
  return null;
}
function _buildEndpoint(protocol, endpoint, version) {
  if (protocol === "A2A") {
    return new import_sdk2.AgentEndpoint({
      name: "A2A",
      endpoint: a2aAgentCardEndpoint(endpoint),
      version
    });
  }
  if (protocol === "MCP") {
    return import_sdk2.AgentEndpoint.mcp(mcpStreamableEndpoint(endpoint), {
      version: MCP_PROTOCOL_VERSION
    });
  }
  return new import_sdk2.AgentEndpoint({ name: protocol, endpoint });
}
function mergeAccessDescription(description, accessDescription) {
  if (!accessDescription) return description;
  let base = String(description ?? "").trim();
  const access = accessDescription.trim();
  for (const marker of ["\n\nAccess:", " Access:", "Access:"]) {
    const idx = base.indexOf(marker);
    if (idx >= 0) {
      base = base.slice(0, idx).trimEnd();
      break;
    }
  }
  return base ? `${base} ${access}`.trim() : access;
}
async function register(wallet, endpoint, opts = {}) {
  const {
    network = "bsc-testnet",
    name = "studio-agent",
    description = "bnbagent-studio agent",
    protocol = "A2A",
    version = "0.3.0",
    accessDescription = null
  } = opts;
  const sdk = await makeSdk(wallet, network, { noPaymaster: opts.noPaymaster });
  const existing = await findOwnedAgent(sdk);
  if (existing !== null) {
    const existingId = existing.agent_id ?? existing.agentId;
    let tokenId;
    try {
      tokenId = _extractTokenId(existing);
    } catch (e) {
      if (!(e instanceof ERC8004Error)) throw e;
      tokenId = null;
    }
    throw new AlreadyRegisteredError(
      `Wallet ${sdk.walletAddress} already owns agent_id=${existingId}; use update_service_endpoint() (CLI: \`bag erc8004 update-endpoint --endpoint <new-url>\`) to change its endpoint.`,
      { agentId: tokenId }
    );
  }
  let agentUri = opts.agentUri ?? null;
  if (agentUri === null) {
    agentUri = sdk.generateAgentUri({
      name,
      description: mergeAccessDescription(description, accessDescription),
      endpoints: [_buildEndpoint(protocol, endpoint, version)]
    });
  }
  let result;
  try {
    result = await sdk.registerAgent(agentUri);
  } catch (e) {
    if (isSdkPartial(e)) throw partialRegistrationError(e);
    if (isSdkPending(e)) throw pendingError(e, { action: "register" });
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
    if (msg.includes("insufficient funds") || msg.includes("insufficient balance")) {
      throw new ERC8004Error(
        `ERC-8004 register needs gas on bsc-testnet (twak does not sponsor testnet \u2014 REQ-2). Fund a little tBNB (~0.001) to ${sdk.walletAddress} and retry \u2014 ${tbnbFaucetHint(sdk.walletAddress)}`,
        { cause: e }
      );
    }
    throw e;
  }
  const rec = asRecord(result);
  if (rec === null) {
    throw new ERC8004Error(
      `SDK register_agent returned non-dict: ${JSON.stringify(result)}`
    );
  }
  const agentId = rec.agentId ?? rec.agent_id;
  if (agentId === void 0 || agentId === null) {
    throw new ERC8004Error(
      `SDK register_agent did not return an agent_id: ${JSON.stringify(rec)}`
    );
  }
  return Number(agentId);
}
async function updateEndpoint(wallet, newUri, opts = {}) {
  const network = opts.network ?? "bsc-testnet";
  const sdk = await makeSdk(wallet, network);
  const existing = await findOwnedAgent(sdk);
  if (existing === null) {
    throw new NotRegisteredError(
      `Wallet ${sdk.walletAddress} has no registered agent; call register() first.`
    );
  }
  const tokenId = _extractTokenId(existing);
  return setAgentUriAudited(sdk, tokenId, newUri, network);
}
function txHashFrom(result) {
  const rec = asRecord(result);
  if (rec !== null) {
    const extracted = rec.transactionHash ?? rec.tx_hash;
    return extracted ? String(extracted) : String(result);
  }
  return String(result);
}
async function setAgentUriAudited(sdk, tokenId, newUri, network) {
  return auditedOp(
    "8004_update_endpoint",
    {
      chainId: getNetwork(network).chainId,
      asset: null,
      amount: null,
      agentAddr: sdk.walletAddress,
      context: { agent_id: tokenId, new_uri: newUri.slice(0, 120) }
    },
    async (auditH) => {
      let result;
      try {
        result = await sdk.setAgentUri(tokenId, newUri);
      } catch (e) {
        if (isSdkPending(e)) {
          auditH.txHash = e.txHash;
          throw pendingError(e, {
            action: "update-endpoint",
            agentId: tokenId
          });
        }
        throw e;
      }
      const txHash = txHashFrom(result);
      auditH.txHash = txHash;
      await attachGasContext(auditH, network, "8004_update_endpoint");
      return txHash;
    }
  );
}
async function setMetadata(wallet, key, value, opts = {}) {
  const network = opts.network ?? "bsc-testnet";
  const sdk = await makeSdk(wallet, network, { noPaymaster: opts.noPaymaster });
  const existing = await findOwnedAgent(sdk);
  if (existing === null) {
    throw new NotRegisteredError(
      `Wallet ${sdk.walletAddress} has no registered agent; call register() first.`
    );
  }
  const tokenId = _extractTokenId(existing);
  return setMetadataAudited(sdk, tokenId, key, value, network);
}
async function setMetadataAudited(sdk, tokenId, key, value, network) {
  return auditedOp(
    "8004_set_metadata",
    {
      chainId: getNetwork(network).chainId,
      asset: null,
      amount: null,
      agentAddr: sdk.walletAddress,
      context: {
        agent_id: tokenId,
        metadata_key: key,
        metadata_value: value.slice(0, 120)
      }
    },
    async (auditH) => {
      let result;
      try {
        result = await sdk.setMetadata(tokenId, key, value);
      } catch (e) {
        throw new ERC8004Error(
          `set_metadata failed: ${e instanceof Error ? e.message : e}`,
          { cause: e }
        );
      }
      const txHash = txHashFrom(result);
      auditH.txHash = txHash;
      await attachGasContext(auditH, network, "8004_set_metadata");
      return txHash;
    }
  );
}
async function getMetadata(wallet, key, opts = {}) {
  const network = opts.network ?? "bsc-testnet";
  const sdk = await makeSdk(wallet, network);
  const existing = await findOwnedAgent(sdk);
  if (existing === null) {
    throw new NotRegisteredError(
      `Wallet ${sdk.walletAddress} has no registered agent.`
    );
  }
  const tokenId = _extractTokenId(existing);
  try {
    return String(await sdk.getMetadata(tokenId, key));
  } catch (e) {
    throw new ERC8004Error(
      `get_metadata failed: ${e instanceof Error ? e.message : e}`,
      { cause: e }
    );
  }
}
async function updateServiceEndpoint(wallet, endpoint, opts = {}) {
  const {
    network = "bsc-testnet",
    protocol = "A2A",
    name = "studio-agent",
    description = "bnbagent-studio agent",
    version = "0.3.0",
    accessDescription = null
  } = opts;
  const sdk = await makeSdk(wallet, network, { noPaymaster: opts.noPaymaster });
  const existing = await findOwnedAgent(sdk);
  if (existing === null) {
    throw new NotRegisteredError(
      `Wallet ${sdk.walletAddress} has no registered agent; call register() first.`
    );
  }
  const tokenId = _extractTokenId(existing);
  const info = asRecord(await sdk.getAgentInfo(tokenId));
  const currentUri = String(info?.agentURI ?? info?.agent_uri ?? "");
  const serviceEndpoint = _buildEndpoint(protocol, endpoint, version).endpoint;
  let newUri;
  try {
    const body = decodeAgentUri(currentUri);
    const services = Array.isArray(body.services) ? body.services : [];
    let patched = false;
    for (const entry of services) {
      const rec = asRecord(entry);
      if (rec !== null && rec.name === protocol) {
        rec.endpoint = serviceEndpoint;
        patched = true;
        break;
      }
    }
    if (!patched) {
      services.push({ name: protocol, endpoint: serviceEndpoint });
    }
    body.services = services;
    if (accessDescription) {
      body.description = mergeAccessDescription(
        String(body.description ?? description),
        accessDescription
      );
    }
    const payload = Buffer.from(JSON.stringify(body)).toString("base64");
    newUri = `data:application/json;base64,${payload}`;
  } catch (e) {
    if (!(e instanceof ERC8004Error)) throw e;
    newUri = sdk.generateAgentUri({
      name,
      description: mergeAccessDescription(description, accessDescription),
      endpoints: [_buildEndpoint(protocol, endpoint, version)]
    });
  }
  const txHash = await setAgentUriAudited(sdk, tokenId, newUri, network);
  return { txHash, agentId: tokenId };
}
async function show(wallet, opts = {}) {
  const network = opts.network ?? "bsc-testnet";
  const sdk = await makeSdk(wallet, network);
  const existing = await findOwnedAgent(sdk);
  if (existing === null) {
    throw new NotRegisteredError(
      `Wallet ${sdk.walletAddress} has no registered agent.`
    );
  }
  const tokenId = _extractTokenId(existing);
  const raw = await sdk.getAgentInfo(tokenId);
  const info = asRecord(raw);
  if (info === null) {
    throw new ERC8004Error(
      `SDK get_agent_info returned non-dict: ${JSON.stringify(raw)}`
    );
  }
  return {
    agentId: Number(info.agentId ?? info.agent_id ?? tokenId),
    address: String(info.agentAddress ?? info.agent_address ?? ""),
    agentUri: String(info.agentURI ?? info.agent_uri ?? ""),
    metadata: { ...asRecord(info.metadata) ?? {} }
  };
}
async function resolve3(agentId, opts = {}) {
  const wallet = opts.wallet ?? null;
  if (wallet === null) {
    throw new Error(
      "resolve() requires a wallet (SDK needs a provider to construct)"
    );
  }
  const sdk = await makeSdk(wallet, opts.network ?? "bsc-testnet");
  let info;
  try {
    info = asRecord(await sdk.getAgentInfo(Number(agentId)));
  } catch (e) {
    throw new NotRegisteredError(
      `agent_id=${agentId} not found: ${e instanceof Error ? e.message : e}`
    );
  }
  if (info === null) {
    throw new NotRegisteredError(`agent_id=${agentId} not found`);
  }
  const uri = info.agentURI ?? info.agent_uri;
  if (!uri) {
    throw new NotRegisteredError(`agent_id=${agentId} has no agentURI`);
  }
  return String(uri);
}
function decodeAgentUri(agentUri) {
  if (!agentUri.startsWith("data:")) {
    throw new ERC8004Error(
      `agent_uri is not a base64 data: URI: ${JSON.stringify(agentUri.slice(0, 80))}; off-chain (http/https) URIs are not auto-fetched by resolve_service.`
    );
  }
  try {
    const payload = agentUri.slice(agentUri.indexOf(",") + 1);
    const raw = Buffer.from(payload, "base64").toString("utf-8");
    const body = JSON.parse(raw);
    const rec = asRecord(body);
    if (rec === null) {
      throw new Error("decoded agent_uri is not a JSON object");
    }
    return rec;
  } catch (e) {
    throw new ERC8004Error(
      `could not decode agent_uri: ${e instanceof Error ? e.message : e}`,
      { cause: e }
    );
  }
}
async function resolveService(agentId, opts = {}) {
  const wallet = opts.wallet ?? null;
  const protocol = opts.protocol ?? "A2A";
  if (wallet === null) {
    throw new Error(
      "resolve_service() requires a wallet (SDK needs a provider)"
    );
  }
  const sdk = await makeSdk(wallet, opts.network ?? "bsc-testnet");
  let info;
  try {
    info = asRecord(await sdk.getAgentInfo(Number(agentId)));
  } catch (e) {
    throw new NotRegisteredError(
      `agent_id=${agentId} not found: ${e instanceof Error ? e.message : e}`
    );
  }
  if (info === null) {
    throw new NotRegisteredError(`agent_id=${agentId} not found`);
  }
  const providerAddress = String(info.agentAddress ?? info.agent_address ?? "");
  const agentUri = String(info.agentURI ?? info.agent_uri ?? "");
  if (!agentUri) {
    throw new NotRegisteredError(`agent_id=${agentId} has no agentURI`);
  }
  if (!providerAddress) {
    throw new ERC8004Error(`agent_id=${agentId} has no agentAddress on chain`);
  }
  const body = decodeAgentUri(agentUri);
  const services = body.services ?? [];
  if (!Array.isArray(services)) {
    throw new ERC8004Error(
      `agent_id=${agentId} agent URI services[] malformed`
    );
  }
  for (const entry of services) {
    const rec = asRecord(entry);
    if (rec !== null && rec.name === protocol) {
      const endpoint = String(rec.endpoint ?? "");
      if (!endpoint) {
        throw new ERC8004Error(
          `agent_id=${agentId} advertises ${protocol} but with empty endpoint`
        );
      }
      return { agentId: Number(agentId), protocol, providerAddress, endpoint };
    }
  }
  const advertised = services.map((e) => asRecord(e)).filter((e) => e !== null).map((e) => e.name);
  if (protocol === "ERC8183" && advertised.includes("A2A") && !advertised.includes("ERC8183")) {
    throw new ERC8004Error(
      `agent_id=${agentId} advertises A2A only (no ERC8183 service); this seller does not expose an ERC8183 endpoint to resolve. Buy directly against its address with 'bag erc8183 buy --provider ${providerAddress} ...' (skips resolve+negotiate). If the seller gates its A2A endpoint behind auth (e.g. an AgentCore deployment), first obtain its signed quote out-of-band (see docs/guides/agentcore-a2a-access.md), save the negotiate response JSON, then anchor it with 'bag erc8183 buy --provider ${providerAddress} --quote-json <file>'.`
    );
  }
  throw new ERC8004Error(
    `agent_id=${agentId} does not advertise protocol='${protocol}' (found: ${JSON.stringify(advertised)})`
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AlreadyRegisteredError,
  ERC8004Error,
  ERC8004PartialRegistrationError,
  ERC8004TransactionPendingError,
  MCP_PROTOCOL_VERSION,
  NotRegisteredError,
  _buildEndpoint,
  _extractTokenId,
  _setSdkFactory,
  a2aAgentCardEndpoint,
  erc8004SdkNetwork,
  getMetadata,
  mcpStreamableEndpoint,
  register,
  resolve,
  resolveService,
  setMetadata,
  show,
  updateEndpoint,
  updateServiceEndpoint
});
