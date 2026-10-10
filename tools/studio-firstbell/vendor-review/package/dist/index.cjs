"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Policy: () => Policy,
  SellerPolicyConfigError: () => SellerPolicyConfigError,
  aggregateSellerCapabilities: () => aggregateSellerCapabilities,
  createSellerCapabilityManager: () => createSellerCapabilityManager,
  emit: () => emit,
  findProjectRoot: () => findProjectRoot,
  getPolicy: () => getPolicy,
  getWallet: () => getWallet,
  loadStudioToml: () => loadStudioToml,
  resolveSellerPolicy: () => resolveSellerPolicy
});
module.exports = __toCommonJS(index_exports);

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
function catalogPaymentAllowlist(networkName) {
  const names = networkName ? [networkName] : ["bsc-testnet", "bsc-mainnet"];
  const tokens = [];
  const seen = /* @__PURE__ */ new Set();
  for (const name of names) {
    for (const asset of getNetwork(name).assets()) {
      if (seen.has(asset.symbol)) continue;
      seen.add(asset.symbol);
      tokens.push(asset.symbol);
    }
  }
  return Object.freeze(tokens);
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

// src/policy.ts
var Policy = class _Policy {
  budgetCapU;
  defaultBudgetU;
  maxPerRequestU;
  allowedPaymentTokens;
  erc8183;
  x402;
  constructor(fields = {}) {
    this.budgetCapU = fields.budgetCapU ?? "100";
    this.defaultBudgetU = fields.defaultBudgetU ?? "10";
    this.maxPerRequestU = fields.maxPerRequestU ?? "5";
    this.allowedPaymentTokens = Object.freeze([
      ...fields.allowedPaymentTokens ?? catalogPaymentAllowlist()
    ]);
    this.erc8183 = fields.erc8183 ?? {};
    this.x402 = fields.x402 ?? {};
    Object.freeze(this);
  }
  static fromToml(data) {
    const payments = data.payments ?? {};
    return new _Policy({
      budgetCapU: String(payments.budget_cap_u ?? "100"),
      defaultBudgetU: String(payments.default_budget_u ?? "10"),
      maxPerRequestU: String(payments.max_per_request_u ?? "5"),
      allowedPaymentTokens: payments.allowed_payment_tokens ?? catalogPaymentAllowlist(),
      erc8183: { ...payments.erc8183 ?? {} },
      x402: { ...payments.x402 ?? {} }
    });
  }
  /** True if `symbol` is on the spending allow-list. */
  isTokenAllowed(symbol) {
    return this.allowedPaymentTokens.includes(symbol);
  }
};
function getPolicy() {
  return Policy.fromToml(loadStudioToml());
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
    const [erc8183, b402] = await Promise.all([
      this.#resolveErc8183(),
      this.#resolveB402()
    ]);
    const rails = Object.freeze({ erc8183, b402 });
    const snapshot = Object.freeze({
      network: this.#options.network,
      generatedAt: toTimestamp(this.#options.clock?.() ?? /* @__PURE__ */ new Date()),
      rails,
      overall: aggregateSellerCapabilities([erc8183, b402])
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
  const b402 = options.b402.enabled ? (() => {
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
    b402,
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

// src/telemetry.ts
function emit(_event, _fields = {}) {
}

// src/wallet.ts
var import_node_child_process = require("child_process");
var import_node_fs3 = require("fs");
var import_node_os2 = require("os");
var import_node_path2 = require("path");
var import_node_url = require("url");
var import_sdk2 = require("@bnbagent/sdk");
var import_wallets = require("@bnbagent/sdk/wallets");
var import_viem = require("viem");

// src/secretWrite.ts
var import_node_fs2 = require("fs");

// src/wallet.ts
var TURNKEY_TESTED_SDK_COMBINATIONS = Object.freeze([
  Object.freeze({
    [import_wallets.TURNKEY_SDK_SERVER_PACKAGE]: "8.1.0",
    [import_wallets.TURNKEY_VIEM_PACKAGE]: "0.14.34"
  })
]);
var TURNKEY_SDK_INSTALL_COMMAND = `pnpm add ${import_wallets.TURNKEY_SDK_SERVER_PACKAGE}@${TURNKEY_TESTED_SDK_COMBINATIONS[0][import_wallets.TURNKEY_SDK_SERVER_PACKAGE]} ${import_wallets.TURNKEY_VIEM_PACKAGE}@${TURNKEY_TESTED_SDK_COMBINATIONS[0][import_wallets.TURNKEY_VIEM_PACKAGE]}`;
var PASSWORD_ENV = "WALLET_PASSWORD";
var KEYSTORE_DIR_ENV = "BNBAGENT_KEYSTORE_DIR";
var TWAK_HOME_ENV = "TWAK_HOME_DIR";
var TWAK_LOCAL_HOME_ENV = "TWAK_HOME";
var TWAK_CHAIN_BY_NETWORK = {
  "bsc-testnet": "bsctestnet",
  "bsc-mainnet": "bsc"
};
var ALTANA_NETWORK_BY_STUDIO = {
  "bsc-testnet": "bnb-testnet",
  "bsc-mainnet": "bnb-mainnet"
};
var cachedAltanaSession = null;
var cachedAltanaError = null;
var TURNKEY_CHAIN_ID_BY_NETWORK = {
  "bsc-testnet": 97,
  "bsc-mainnet": 56
};
function esmExportTarget(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const found = esmExportTarget(candidate);
      if (found !== null) return found;
    }
    return null;
  }
  if (value !== null && typeof value === "object") {
    const record = value;
    for (const condition of ["import", "node", "default"]) {
      const found = esmExportTarget(record[condition]);
      if (found !== null) return found;
    }
  }
  return null;
}
function resolveProjectPackage(projectRoot, packageName, installHint, expectedVersion) {
  let cursor = (0, import_node_path2.resolve)(projectRoot);
  for (; ; ) {
    const packageDir = (0, import_node_path2.join)(cursor, "node_modules", ...packageName.split("/"));
    const packageJson = (0, import_node_path2.join)(packageDir, "package.json");
    if ((0, import_node_fs3.existsSync)(packageJson)) {
      const metadata = JSON.parse((0, import_node_fs3.readFileSync)(packageJson, "utf8"));
      if (expectedVersion !== void 0 && metadata.version !== expectedVersion) {
        throw new Error(
          `${packageJson} has ${packageName} version ${JSON.stringify(metadata.version)}; install the tested ${packageName}@${expectedVersion}.`
        );
      }
      const exportsField = metadata.exports;
      const rootExport = exportsField !== null && typeof exportsField === "object" && !Array.isArray(exportsField) && "." in exportsField ? exportsField["."] : exportsField;
      const target = esmExportTarget(rootExport) ?? (typeof metadata.module === "string" ? metadata.module : null) ?? (typeof metadata.main === "string" ? metadata.main : null);
      if (target === null) {
        throw new Error(
          `${packageJson} has no importable ESM entry; ${installHint}`
        );
      }
      const entry = (0, import_node_path2.resolve)(packageDir, target);
      const withinPackage = (0, import_node_path2.relative)(packageDir, entry);
      if (withinPackage === "" || withinPackage.startsWith("..") || (0, import_node_path2.isAbsolute)(withinPackage) || !(0, import_node_fs3.existsSync)(entry)) {
        throw new Error(
          `invalid ${packageName} ESM entry ${JSON.stringify(target)} in ${packageJson}`
        );
      }
      return { entry, version: metadata.version };
    }
    if ((0, import_node_fs3.existsSync)((0, import_node_path2.join)(cursor, "pnpm-workspace.yaml"))) return null;
    const parent = (0, import_node_path2.dirname)(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}
function resolveProjectTurnkeySdkEntry(projectRoot, packageName) {
  const hint = `install both Turnkey packages: ${TURNKEY_SDK_INSTALL_COMMAND}`;
  const packages = {
    [import_wallets.TURNKEY_SDK_SERVER_PACKAGE]: resolveProjectPackage(
      projectRoot,
      import_wallets.TURNKEY_SDK_SERVER_PACKAGE,
      hint
    ),
    [import_wallets.TURNKEY_VIEM_PACKAGE]: resolveProjectPackage(
      projectRoot,
      import_wallets.TURNKEY_VIEM_PACKAGE,
      hint
    )
  };
  const names = [
    import_wallets.TURNKEY_SDK_SERVER_PACKAGE,
    import_wallets.TURNKEY_VIEM_PACKAGE
  ];
  if (!TURNKEY_TESTED_SDK_COMBINATIONS.some(
    (pair) => names.every(
      (name) => packages[name] === null || packages[name].version === pair[name]
    )
  )) {
    throw new Error(`Unvalidated Turnkey SDK combination; ${hint}.`);
  }
  return packages[packageName]?.entry ?? null;
}
function armTurnkeyImporter(projectRoot) {
  const packages = [
    import_wallets.TURNKEY_SDK_SERVER_PACKAGE,
    import_wallets.TURNKEY_VIEM_PACKAGE
  ];
  const entries = /* @__PURE__ */ new Map();
  for (const packageName of packages) {
    const entry = resolveProjectTurnkeySdkEntry(projectRoot, packageName);
    if (entry !== null) entries.set(packageName, entry);
  }
  if (entries.size === 0) {
    (0, import_wallets.setTurnkeySdkImporter)(null);
    return;
  }
  if (entries.size !== packages.length) {
    const missing = packages.filter((name) => !entries.has(name));
    throw new Error(
      `wallet.kind='turnkey' needs both Turnkey packages in the agent project; missing ${missing.join(", ")} \u2014 install both: pnpm add ${import_wallets.TURNKEY_SDK_SERVER_PACKAGE} ${import_wallets.TURNKEY_VIEM_PACKAGE}`
    );
  }
  (0, import_wallets.setTurnkeySdkImporter)((packageName) => {
    const entry = entries.get(packageName);
    if (entry === void 0) {
      return Promise.reject(
        new Error(`no resolved entry for ${packageName} (importer bug)`)
      );
    }
    return import((0, import_node_url.pathToFileURL)(entry).href);
  });
}
function resolveTwakHome(walletCfg, projectRoot) {
  const envHome = process.env[TWAK_HOME_ENV];
  if (envHome) return envHome;
  const cfgHome = walletCfg?.twak_home;
  if (cfgHome) {
    const p = String(cfgHome);
    if (!(0, import_node_path2.isAbsolute)(p) && projectRoot != null) return (0, import_node_path2.join)(projectRoot, p);
    return p;
  }
  const local = process.env[TWAK_LOCAL_HOME_ENV];
  if (local) return local;
  return null;
}
function whichSecurity() {
  for (const dir of (process.env.PATH ?? "").split(import_node_path2.delimiter)) {
    if (dir && (0, import_node_fs3.existsSync)((0, import_node_path2.join)(dir, "security"))) return (0, import_node_path2.join)(dir, "security");
  }
  return null;
}
function ensureTwakKeychain(twakHome, hooks = {}) {
  const platform = hooks.platform ?? process.platform;
  const securityPath = hooks.securityPath !== void 0 ? hooks.securityPath : whichSecurity();
  if (platform !== "darwin" || securityPath === null) return false;
  if ((0, import_node_path2.resolve)(twakHome) === (0, import_node_path2.resolve)((0, import_node_os2.homedir)())) {
    return false;
  }
  const kc = (0, import_node_path2.join)(twakHome, "Library", "Keychains", "login.keychain-db");
  if ((0, import_node_fs3.existsSync)(kc)) return true;
  const env = { ...process.env, HOME: twakHome };
  const run = hooks.run ?? ((args, e) => {
    (0, import_node_child_process.execFileSync)(args[0], args.slice(1), {
      env: e,
      timeout: 3e4,
      stdio: "pipe"
    });
  });
  try {
    (0, import_node_fs3.mkdirSync)((0, import_node_path2.dirname)(kc), { recursive: true, mode: 448 });
    (0, import_node_fs3.chmodSync)((0, import_node_path2.dirname)(kc), 448);
    for (const args of [
      ["security", "create-keychain", "-p", "", kc],
      ["security", "default-keychain", "-s", kc],
      ["security", "unlock-keychain", "-p", "", kc]
    ]) {
      run(args, env);
    }
  } catch {
    return (0, import_node_fs3.existsSync)(kc);
  }
  return (0, import_node_fs3.existsSync)(kc);
}
function buildPolicy(walletCfg) {
  const signingCfg = walletCfg.signing ?? {};
  if (Object.keys(signingCfg).length === 0) return null;
  const extraDomains = signingCfg.extra_domains ?? [];
  const extraPrimaryTypes = signingCfg.extra_primary_types ?? [];
  const maxWindow = signingCfg.max_validity_window_seconds;
  const maxFuture = signingCfg.max_future_validity_seconds;
  if (extraDomains.length === 0 && extraPrimaryTypes.length === 0 && maxWindow == null && maxFuture == null) {
    return null;
  }
  const domainPairs = [];
  extraDomains.forEach((entry, i) => {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new Error(
        `[wallet.signing].extra_domains[${i}] must be a [chain_id, address] pair, got ${JSON.stringify(entry)}`
      );
    }
    const [chainId, addr] = entry;
    let checksummed;
    try {
      checksummed = (0, import_viem.getAddress)(String(addr));
    } catch (e) {
      throw new Error(
        `[wallet.signing].extra_domains[${i}] has invalid address ${JSON.stringify(addr)}: ${e instanceof Error ? e.message : e}`
      );
    }
    domainPairs.push([Number(chainId), checksummed]);
  });
  const primaryTypes = [];
  extraPrimaryTypes.forEach((entry, i) => {
    if (typeof entry !== "string" || entry === "") {
      throw new Error(
        `[wallet.signing].extra_primary_types[${i}] must be a non-empty string, got ${JSON.stringify(entry)}`
      );
    }
    primaryTypes.push(entry);
  });
  return import_sdk2.SigningPolicy.strictDefault().extend({
    ...domainPairs.length > 0 ? { domainAllowlist: domainPairs } : {},
    ...primaryTypes.length > 0 ? { primaryTypeAllowlist: primaryTypes } : {},
    ...maxWindow != null ? { maxValidityWindowSeconds: Number(maxWindow) } : {},
    ...maxFuture != null ? { maxFutureValiditySeconds: Number(maxFuture) } : {}
  });
}
function applyTxTuning(walletCfg) {
  const txCfg = walletCfg.tx ?? {};
  if (Object.keys(txCfg).length === 0) return;
  const exportIfUnset = (envKey, value) => {
    if (!process.env[envKey]) {
      process.env[envKey] = value;
    }
  };
  const intField = (key, minimum) => {
    const raw = txCfg[key];
    if (raw == null) return null;
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < minimum) {
      throw new Error(
        `[wallet.tx].${key} must be an integer >= ${minimum}, got ${JSON.stringify(raw)}`
      );
    }
    return n;
  };
  const relayUnseen = intField("relay_unseen_timeout_seconds", 0);
  if (relayUnseen !== null) {
    exportIfUnset("BNBAGENT_RELAY_UNSEEN_TIMEOUT", String(relayUnseen));
  }
  const receiptTimeout = intField("receipt_timeout_seconds", 1);
  if (receiptTimeout !== null) {
    exportIfUnset("BNBAGENT_RECEIPT_TIMEOUT", String(receiptTimeout));
  }
  const fallbackUrls = txCfg.fallback_rpc_urls;
  if (fallbackUrls != null) {
    if (!Array.isArray(fallbackUrls) || fallbackUrls.some((u) => typeof u !== "string" || u.trim() === "")) {
      throw new Error(
        `[wallet.tx].fallback_rpc_urls must be an array of non-empty URL strings, got ${JSON.stringify(fallbackUrls)}`
      );
    }
    if (fallbackUrls.length > 0) {
      exportIfUnset("BNBAGENT_FALLBACK_RPC_URLS", fallbackUrls.join(","));
    }
  }
}
function anchorKeystoreDir(keystoreDir, projectRoot) {
  if (keystoreDir === void 0) return void 0;
  if (!(0, import_node_path2.isAbsolute)(keystoreDir) && projectRoot != null) {
    return (0, import_node_path2.join)(projectRoot, keystoreDir);
  }
  return keystoreDir;
}
function twakProviderOptions(walletCfg, projectRoot, network) {
  const chain = TWAK_CHAIN_BY_NETWORK[network ?? "bsc-testnet"];
  if (chain === void 0) {
    throw new Error(
      `wallet.kind='twak' supports networks ${JSON.stringify(Object.keys(TWAK_CHAIN_BY_NETWORK).sort())}, got '${network}'`
    );
  }
  const home = resolveTwakHome(walletCfg, projectRoot);
  return {
    chain,
    // Generated twak projects pin the CLI in app/agent/node_modules. Passing
    // the project root keeps runtime calls on that validated binary even when
    // the process was launched from another working directory.
    twakBin: (0, import_wallets.resolveTwakBin)(projectRoot ?? process.cwd()),
    ...home !== null ? { home } : {},
    // Anti-drift anchor: a wallet reporting a different address throws
    // WalletIdentityMismatch before any operation.
    ...walletCfg.address ? { expectedAddress: String(walletCfg.address) } : {},
    // autoCreate=false ALWAYS (local and deployed): wallet creation is an
    // explicit, Studio-managed step. Implicit runtime creation would mint an
    // unanchored identity and break the address anti-drift guarantee — a
    // missing wallet must fail loudly.
    autoCreate: false
  };
}
function buildLocalAdminWallet(walletCfg, projectRoot) {
  const walletsDir = process.env[KEYSTORE_DIR_ENV] || anchorKeystoreDir(
    walletCfg.keystore_dir !== void 0 ? String(walletCfg.keystore_dir) : void 0,
    projectRoot
  );
  const signingPolicy = buildPolicy(walletCfg);
  const anchoredAddress = walletCfg.address ? (0, import_viem.getAddress)(String(walletCfg.address)) : null;
  if (anchoredAddress === null) {
    throw new Error(
      "no [wallet].address is anchored; run `bag wallet new` to create the keystore explicitly before starting the Agent."
    );
  }
  const password = process.env[PASSWORD_ENV];
  if (!password) {
    throw new Error(
      `${PASSWORD_ENV} env var is required to unlock the local administrator keystore. Set it in the project's .env.local (.studio/.env.local in a workspace) \u2014 \`bag\` auto-loads that file. If it's still unset, the line is missing or you're running outside the project tree: \`cd\` into the project (or agent/) and retry, or export WALLET_PASSWORD=\u2026 in your shell.`
    );
  }
  let provider;
  try {
    provider = new import_sdk2.EVMWalletProvider({
      password,
      address: anchoredAddress,
      ...walletsDir ? { walletsDir } : {},
      ...signingPolicy !== null ? { signingPolicy } : {}
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith("Keystore not found:")) {
      throw new Error(
        "The encrypted keystore for this project's wallet address is missing. Restore the correct keystore and check studio.toml; do not create a replacement identity to recover an existing wallet.",
        { cause }
      );
    }
    throw cause;
  }
  const decryptedAddress = (0, import_viem.getAddress)(provider.address);
  if (decryptedAddress !== anchoredAddress) {
    throw new Error(
      `wallet identity mismatch: [wallet].address ${anchoredAddress} does not match decrypted keystore address ${decryptedAddress}. Restore the correct keystore before signing or requesting faucet funds.`
    );
  }
  return provider;
}
function buildWallet(walletCfg, projectRoot, opts = {}) {
  const kind = String(walletCfg.kind ?? "evm-local");
  if (kind === "evm-local") {
    return buildLocalAdminWallet(walletCfg, projectRoot);
  }
  if (kind === "twak") {
    if (walletCfg.signing) {
      console.warn(
        "[wallet.signing] is ignored for wallet.kind='twak' \u2014 the twak CLI exposes no generic EIP-712 surface (upstream P0); x402 payments go through the delegated payer's own prechecks."
      );
    }
    const providerOpts = twakProviderOptions(
      walletCfg,
      projectRoot,
      opts.network
    );
    if (providerOpts.home !== void 0) {
      ensureTwakKeychain(providerOpts.home);
    }
    return new import_sdk2.TWAKProvider(providerOpts);
  }
  if (kind === "altana") {
    if (walletCfg.signing) {
      console.warn(
        "[wallet.signing] is ignored for wallet.kind='altana' \u2014 generic EIP-712/message signing is not exposed; ERC-8183 quotes use the bounded session quote signer."
      );
    }
    const networkName = opts.network ?? "bsc-testnet";
    const network = ALTANA_NETWORK_BY_STUDIO[networkName];
    if (network === void 0) {
      throw new Error(
        `wallet.kind='altana' supports networks ${JSON.stringify(Object.keys(ALTANA_NETWORK_BY_STUDIO).sort())}, got '${networkName}'`
      );
    }
    if (cachedAltanaError !== null) throw cachedAltanaError;
    if (cachedAltanaSession === null) {
      throw new Error(
        "no Altana session loaded \u2014 run `bag wallet session grant`, then restart the command or Agent."
      );
    }
    if (walletCfg.address) {
      const anchored = (0, import_viem.getAddress)(
        String(walletCfg.address)
      );
      const sessionAddress = (0, import_viem.getAddress)(
        cachedAltanaSession.walletAddress
      );
      if (anchored !== sessionAddress) {
        throw new Error(
          `[wallet].address ${anchored} does not match Altana session walletAddress ${sessionAddress} (stale session_file? re-grant with --force).`
        );
      }
    }
    return new import_sdk2.AltanaWalletProvider({
      session: cachedAltanaSession,
      network
    });
  }
  if (kind === "turnkey") {
    const signingPolicy = buildPolicy(walletCfg);
    const networkName = opts.network ?? "bsc-testnet";
    const expectedChainId = TURNKEY_CHAIN_ID_BY_NETWORK[networkName];
    if (expectedChainId === void 0) {
      throw new Error(
        `wallet.kind='turnkey' supports networks ${JSON.stringify(Object.keys(TURNKEY_CHAIN_ID_BY_NETWORK).sort())}, got '${networkName}'`
      );
    }
    if (projectRoot != null) {
      armTurnkeyImporter(projectRoot);
    }
    const provider = import_sdk2.TurnkeyWalletProvider.fromEnv({
      expectedChainId,
      ...signingPolicy !== null ? { signingPolicy } : {}
    });
    if (walletCfg.address) {
      const anchored = (0, import_viem.getAddress)(
        String(walletCfg.address)
      );
      if (anchored !== provider.address) {
        throw new Error(
          `[wallet].address ${anchored} does not match TURNKEY_SIGN_WITH ${provider.address} (stale anchor or different Turnkey credentials? fix .studio/.env.local, then re-run \`bag wallet new\`).`
        );
      }
    }
    return provider;
  }
  if (["pieverse", "trust", "binance", "mpc"].includes(kind)) {
    throw new Error(
      `wallet.kind='${kind}' is not implemented in v0.0.2 (planned for a later milestone).`
    );
  }
  throw new Error(`Unknown wallet.kind: '${kind}'`);
}
var cachedWallet = null;
function getWallet() {
  if (cachedWallet === null) {
    const cfg = loadStudioToml();
    const walletCfg = cfg.wallet ?? {};
    applyTxTuning(walletCfg);
    const network = String(
      (cfg.network ?? {}).default ?? "bsc-testnet"
    );
    cachedWallet = buildWallet(walletCfg, findProjectRoot(), {
      network
    });
  }
  return cachedWallet;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Policy,
  SellerPolicyConfigError,
  aggregateSellerCapabilities,
  createSellerCapabilityManager,
  emit,
  findProjectRoot,
  getPolicy,
  getWallet,
  loadStudioToml,
  resolveSellerPolicy
});
