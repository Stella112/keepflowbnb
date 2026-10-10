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

// src/policy.ts
var policy_exports = {};
__export(policy_exports, {
  Policy: () => Policy,
  SELLER_POLICY_AMBIGUOUS_ERROR: () => SELLER_POLICY_AMBIGUOUS_ERROR,
  SellerPolicyConfigError: () => SellerPolicyConfigError,
  getPolicy: () => getPolicy,
  hasCanonicalSellerPolicy: () => hasCanonicalSellerPolicy,
  resolveSellerPolicy: () => resolveSellerPolicy
});
module.exports = __toCommonJS(policy_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Policy,
  SELLER_POLICY_AMBIGUOUS_ERROR,
  SellerPolicyConfigError,
  getPolicy,
  hasCanonicalSellerPolicy,
  resolveSellerPolicy
});
