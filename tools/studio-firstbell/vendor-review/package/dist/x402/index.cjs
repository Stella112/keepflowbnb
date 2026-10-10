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

// src/x402/index.ts
var x402_exports = {};
__export(x402_exports, {
  ALLOWED_HOSTS_CMC_PROFILE: () => ALLOWED_HOSTS_CMC_PROFILE,
  ALLOWED_HOSTS_PIEVERSE_PROFILE: () => ALLOWED_HOSTS_PIEVERSE_PROFILE,
  BudgetTracker: () => BudgetTracker,
  EIP3009_TYPES: () => EIP3009_TYPES,
  MockB402Facilitator: () => MockB402Facilitator,
  SELLER_TOKENS: () => SELLER_TOKENS,
  X402AmountExceededError: () => import_x4022.X402AmountExceededError,
  X402AssetMismatchError: () => X402AssetMismatchError,
  X402AuthError: () => X402AuthError,
  X402BudgetExhaustedError: () => X402BudgetExhaustedError,
  X402BuyerPolicy: () => X402BuyerPolicy,
  X402Error: () => X402Error,
  X402HostNotAllowedError: () => X402HostNotAllowedError,
  X402InsufficientPaymentAssetAllowanceError: () => X402InsufficientPaymentAssetAllowanceError,
  X402InsufficientPaymentAssetBalanceError: () => X402InsufficientPaymentAssetBalanceError,
  X402PaymentAssetBalanceUnavailableError: () => X402PaymentAssetBalanceUnavailableError,
  X402PaymentAssetUnavailableError: () => X402PaymentAssetUnavailableError,
  X402PaymentOutcomeUnknownError: () => X402PaymentOutcomeUnknownError,
  X402PaymentRequiredError: () => X402PaymentRequiredError,
  X402PolicyError: () => import_x4022.X402PolicyError,
  X402RecipientMismatchError: () => import_x4022.X402RecipientMismatchError,
  X402RecipientRequiredError: () => X402RecipientRequiredError,
  X402RetryExhaustedError: () => X402RetryExhaustedError,
  X402Seller: () => X402Seller,
  X402SellerConfigError: () => X402SellerConfigError,
  X402SellerPolicy: () => X402SellerPolicy,
  X402UnsupportedWalletError: () => X402UnsupportedWalletError,
  X402UnsupportedWalletRouteError: () => X402UnsupportedWalletRouteError,
  X402_SELL_PATH: () => X402_SELL_PATH,
  _checkHost: () => _checkHost,
  _isDailyCapCountedElsewhere: () => _isDailyCapCountedElsewhere,
  _parseAccepted: () => _parseAccepted,
  _parseAcceptedExactRoute: () => _parseAcceptedExactRoute,
  _probeB402Supported: () => _probeB402Supported,
  _resetSharedBudgetTracker: () => _resetSharedBudgetTracker,
  _resetX402Seller: () => _resetX402Seller,
  _setB402Transport: () => _setB402Transport,
  _setConfigLoader: () => _setConfigLoader,
  _setSleep: () => _setSleep,
  buildXPaymentHeader: () => buildXPaymentHeader,
  caip2: () => caip2,
  createEnvelopeMiddleware: () => createEnvelopeMiddleware,
  dailyCapCountedElsewhere: () => dailyCapCountedElsewhere,
  fetchWithPayment: () => fetchWithPayment,
  getSharedBudgetTracker: () => getSharedBudgetTracker,
  merchantPinnedAssets: () => merchantPinnedAssets,
  payChallenge: () => payChallenge,
  quoteUrl: () => quoteUrl,
  resolveDailyCapUsd: () => resolveDailyCapUsd,
  sellerMoneyParser: () => sellerMoneyParser,
  sellerTokenExtras: () => sellerTokenExtras,
  usdToAtomic: () => usdToAtomic
});
module.exports = __toCommonJS(x402_exports);
var import_x4022 = require("@bnbagent/sdk/x402");

// src/x402/buyer.ts
var import_node_async_hooks2 = require("async_hooks");
var import_node_crypto = require("crypto");
var import_node_path3 = require("path");
var import_b402 = require("@bnb-chain/b402");
var import_sdk2 = require("@bnbagent/sdk");
var import_x402 = require("@bnbagent/sdk/x402");
var import_http = require("@x402/core/http");
var import_viem = require("viem");

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
function _resetSharedBudgetTracker() {
  sharedTrackers.clear();
}

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
var PERMIT2_ADDRESS = (0, import_viem.getAddress)(import_b402.B402_PERMIT2_ADDRESS);
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
function _parseAcceptedExactRoute(challenge, networkChainId, expectedAssetAddr, preferredMethods = SETTLABLE_EXACT_METHODS) {
  const ordered = [
    ...preferredMethods.filter(
      (method) => SETTLABLE_EXACT_METHODS.includes(method)
    ),
    ...SETTLABLE_EXACT_METHODS.filter(
      (method) => !preferredMethods.includes(method)
    )
  ];
  const unsupported = () => new ExactRouteMethodUnsupportedError(
    `x402 402 offers chain_id=${networkChainId} + asset='${expectedAssetAddr}' only through transfer methods b402 cannot settle (settlable: ${SETTLABLE_EXACT_METHODS.join(", ")})`
  );
  for (const method of ordered) {
    try {
      const [matched, resource, selected] = parseAcceptedForMethods(
        challenge,
        networkChainId,
        expectedAssetAddr,
        [method],
        unsupported
      );
      return [matched, resource, selected];
    } catch (cause) {
      if (cause instanceof ExactRouteMethodUnsupportedError) continue;
      throw cause;
    }
  }
  throw unsupported();
}
var ExactRouteMethodUnsupportedError = class extends X402PaymentRequiredError {
};
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
function _setConfigLoader(loader) {
  configLoader = loader ?? defaultConfigLoader;
  usingDefaultConfigLoader = loader === null;
}
function paymentConfigSource() {
  if (!usingDefaultConfigLoader) {
    return Object.freeze({ raw: configLoader(), projectRoot: null });
  }
  const projectRoot = findProjectRoot();
  if (projectRoot === null) {
    return Object.freeze({ raw: null, projectRoot: null });
  }
  return Object.freeze({
    raw: loadStudioToml((0, import_node_path3.join)(projectRoot, STUDIO_TOML)),
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
      normalizedMerchant = (0, import_viem.getAddress)(merchantPayTo);
    } catch {
      throw new import_x402.X402RecipientMismatchError(
        "trusted merchant recipient is not a valid EVM address"
      );
    }
    if (expectedTo?.trim()) {
      let normalizedExpected;
      try {
        normalizedExpected = (0, import_viem.getAddress)(expectedTo.trim());
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
    pinned = configured.map((entry) => (0, import_viem.getAddress)(entry));
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
  const request = {
    networkName,
    owner: (0, import_viem.getAddress)(wallet.address),
    tokenAddress: asset.address
  };
  try {
    if (reader) return await reader.balanceOf(request);
    if (wallet.readTokenBalance) return await wallet.readTokenBalance(request);
    const network = getNetwork(networkName);
    const client = (0, import_viem.createPublicClient)({ transport: (0, import_viem.http)(network.rpcUrl) });
    return await client.readContract({
      address: asset.address,
      abi: import_viem.erc20Abi,
      functionName: "balanceOf",
      args: [request.owner]
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
      requiredHuman: (0, import_viem.formatUnits)(required, asset.decimals),
      currentHuman: (0, import_viem.formatUnits)(current, asset.decimals),
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
      requiredHuman: (0, import_viem.formatUnits)(required, asset.decimals),
      currentHuman: (0, import_viem.formatUnits)(current, asset.decimals),
      alternatives: verifiedAlternatives
    }
  );
}
async function resolveAlternatives(alternatives) {
  if (typeof alternatives === "function") return alternatives();
  return alternatives ?? [];
}
async function readAssetAllowance(wallet, reader, networkName, asset) {
  const request = {
    networkName,
    owner: (0, import_viem.getAddress)(wallet.address),
    tokenAddress: asset.address,
    spender: PERMIT2_ADDRESS
  };
  let current;
  try {
    if (reader?.allowance) current = await reader.allowance(request);
    else if (wallet.readTokenAllowance)
      current = await wallet.readTokenAllowance(request);
    else {
      const network = getNetwork(networkName);
      const client = (0, import_viem.createPublicClient)({ transport: (0, import_viem.http)(network.rpcUrl) });
      current = await client.readContract({
        address: asset.address,
        abi: import_viem.erc20Abi,
        functionName: "allowance",
        args: [request.owner, request.spender]
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
    trustedPayTo = (0, import_viem.getAddress)(expectedTo);
    assertMerchantAsset(merchant ?? null, asset);
  } catch {
    return null;
  }
  const amountUsd = Number.parseFloat(fromRaw(option.amount, asset.decimals));
  if (resource === null || quote.raw.x402Version !== 2 || option.network !== networkId || option.scheme !== "exact" || option.asset.toLowerCase() !== asset.address.toLowerCase() || option.amount <= 0n || !Number.isFinite(amountUsd) || amountUsd <= 0 || !(0, import_viem.isAddress)(option.payTo) || (0, import_viem.getAddress)(option.payTo) !== trustedPayTo || !Number.isSafeInteger(option.maxTimeoutSeconds) || option.maxTimeoutSeconds === null || option.maxTimeoutSeconds <= 0 || option.maxTimeoutSeconds > 3600 || method === "permit2-upto" || !asset.b402Methods.includes(method) || !payerSupportsExactMethod(capability, method)) {
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
    payTo: (0, import_viem.getAddress)(option.payTo),
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
  if (extra === null || kind === void 0 || trustedSpender === void 0 || extra.assetTransferMethod !== "permit2-exact" || extra.name !== kind.name || extra.version !== kind.version || typeof extra.signerAddress !== "string" || !(0, import_viem.isAddress)(extra.signerAddress) || typeof extra.spenderAddress !== "string" || !(0, import_viem.isAddress)(extra.spenderAddress) || (0, import_viem.getAddress)(extra.spenderAddress) !== (0, import_viem.getAddress)(trustedSpender)) {
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
      spenderAddress: (0, import_viem.getAddress)(trustedSpender),
      trustedSpenders: [(0, import_viem.getAddress)(trustedSpender)]
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
    payTo = (0, import_viem.getAddress)(String(accepted.payTo));
    normalizedExpectedTo = (0, import_viem.getAddress)(expectedTo);
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
function _setSleep(fn) {
  sleep = fn ?? defaultSleep;
}
async function fetchWithPayment(url, opts) {
  return fetchWithPaymentInternal(url, opts, false);
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
function sellerMoneyParser() {
  return async (amount, network) => {
    const token = SELLER_TOKENS[network] ?? null;
    if (token === null) return null;
    return {
      asset: token.address,
      amount: usdToAtomic(amount, token.decimals)
    };
  };
}
function sellerTokenExtras(network) {
  const token = SELLER_TOKENS[network] ?? null;
  if (token === null) return null;
  return token.methods.map((method) => ({
    assetTransferMethod: method,
    name: token.eip712Name,
    version: token.eip712Version
  }));
}

// src/b402/policy.ts
var import_viem2 = require("viem");

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

// src/b402/policy.ts
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
  const info = parseJsonObject2(table.info_json, "bazaar.info_json");
  const schema = parseJsonObject2(table.schema_json, "bazaar.schema_json");
  return {
    info,
    schema,
    ...table.description !== void 0 ? { description: String(table.description) } : {},
    ...table.route_template !== void 0 ? { routeTemplate: String(table.route_template) } : {}
  };
}
function parseJsonObject2(value, field) {
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

// src/x402/sellerPolicy.ts
var X402SellerPolicy = class _X402SellerPolicy extends B402SellerPolicy {
  static fromToml(cfg) {
    return new _X402SellerPolicy(B402SellerPolicy.fromToml(cfg));
  }
};

// src/x402/sellerMock.ts
var import_node_crypto2 = require("crypto");
var import_b4022 = require("@bnb-chain/b402");
var import_viem3 = require("viem");
var MOCK_SIGNER = "0x1111111111111111111111111111111111111111";
var MOCK_PERMIT2_SPENDER = "0x2222222222222222222222222222222222222222";
var MockB402Facilitator = class {
  calls = {
    supported: 0,
    verify: [],
    settle: []
  };
  #options;
  #verifiedNonces = /* @__PURE__ */ new Set();
  #settlements = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    this.#options = options;
  }
  async supported() {
    this.calls.supported += 1;
    return {
      extensions: [],
      kinds: ["bsc-mainnet", "bsc-testnet"].flatMap(
        (networkName) => {
          const network = getNetwork(networkName);
          return network.b402Assets().flatMap(
            (asset) => asset.b402Kinds.map((kind) => ({
              x402Version: 2,
              scheme: "exact",
              network: `eip155:${network.chainId}`,
              extra: {
                assetTransferMethod: kind.method,
                name: kind.name,
                version: kind.version,
                signerAddress: MOCK_SIGNER,
                // The real facilitator advertises the Permit2 proxy per kind;
                // B402ExactServerScheme copies it into the 402 requirements.
                ...kind.method === "permit2-exact" ? { spenderAddress: MOCK_PERMIT2_SPENDER } : {}
              }
            }))
          );
        }
      ),
      signers: { "eip155:*": [MOCK_SIGNER] }
    };
  }
  async verify(request) {
    this.calls.verify.push(request);
    const recovered = await recoverRequest(request);
    if ("error" in recovered) return recovered.error;
    if (this.#options.failVerify) {
      return {
        isValid: false,
        payer: recovered.payer,
        invalidReason: this.#options.failVerify
      };
    }
    if (this.#verifiedNonces.has(recovered.key)) {
      return {
        isValid: false,
        payer: recovered.payer,
        invalidReason: "nonce_already_used"
      };
    }
    this.#verifiedNonces.add(recovered.key);
    return { isValid: true, payer: recovered.payer };
  }
  async settle(request) {
    this.calls.settle.push(request);
    const recovered = await recoverRequest(request);
    if ("error" in recovered) {
      return {
        success: false,
        transaction: "",
        payer: "",
        network: request.paymentRequirements.network,
        errorReason: recovered.error.invalidReason
      };
    }
    const existing = this.#settlements.get(recovered.key);
    if (existing) return existing;
    if (this.#options.settleUnknown) {
      throw new Error("mock ambiguous settlement");
    }
    if (this.#options.failSettle) {
      return {
        success: false,
        transaction: "",
        payer: recovered.payer,
        network: request.paymentRequirements.network,
        errorReason: this.#options.failSettle
      };
    }
    const result = {
      success: true,
      transaction: `0x${(0, import_node_crypto2.createHash)("sha256").update(recovered.key).digest("hex")}`,
      payer: recovered.payer,
      network: request.paymentRequirements.network,
      amount: request.paymentRequirements.amount
    };
    this.#settlements.set(recovered.key, result);
    return result;
  }
};
async function recoverRequest(request) {
  let recover;
  if ((0, import_b4022.isEip3009PaymentPayload)(request.paymentPayload)) {
    const payload = request.paymentPayload;
    recover = async () => ({
      payer: (0, import_viem3.getAddress)(await (0, import_b4022.recoverEip3009Payer)(payload)),
      from: payload.payload.authorization.from,
      nonce: payload.payload.authorization.nonce.toLowerCase()
    });
  } else if ((0, import_b4022.isPermit2PaymentPayload)(request.paymentPayload)) {
    const payload = request.paymentPayload;
    recover = async () => ({
      payer: (0, import_viem3.getAddress)(await (0, import_b4022.recoverPermit2ExactPayer)(payload)),
      from: payload.payload.permit2Authorization.from,
      nonce: payload.payload.permit2Authorization.nonce.toLowerCase()
    });
  } else {
    return {
      error: {
        isValid: false,
        invalidReason: "invalid_payload",
        payer: ""
      }
    };
  }
  try {
    const { payer, from, nonce } = await recover();
    if (payer.toLowerCase() !== from.toLowerCase()) {
      return {
        error: {
          isValid: false,
          invalidReason: "payer_mismatch",
          payer
        }
      };
    }
    return {
      payer,
      key: [
        request.paymentRequirements.network,
        payer.toLowerCase(),
        nonce
      ].join(":")
    };
  } catch {
    return {
      error: {
        isValid: false,
        invalidReason: "invalid_signature",
        payer: ""
      }
    };
  }
}

// src/x402/sellerB402.ts
var import_node_crypto3 = require("crypto");
var import_b4023 = require("@bnb-chain/b402");
var import_server = require("@bnb-chain/b402/server");
var import_server2 = require("@x402/core/server");

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
var import_node_fs3 = require("fs");
var import_node_path4 = require("path");
var DEFAULT_LOG_NAME = "audit-log.jsonl";
var DEFAULT_LOG_DIR = ".studio";
var FILE_MODE = 384;
var STUDIO_AUDIT_LOG_PATH_ENV = "STUDIO_AUDIT_LOG_PATH";
function resolveAuditLogPath(projectRoot) {
  const override = process.env[STUDIO_AUDIT_LOG_PATH_ENV];
  if (override) return override;
  const root = projectRoot ?? process.cwd();
  return (0, import_node_path4.join)(root, DEFAULT_LOG_DIR, DEFAULT_LOG_NAME);
}
function appendEvent(event, opts = {}) {
  const path = resolveAuditLogPath(opts.projectRoot);
  (0, import_node_fs3.mkdirSync)((0, import_node_path4.dirname)(path), { recursive: true });
  const isNew = !(0, import_node_fs3.existsSync)(path);
  const fd = (0, import_node_fs3.openSync)(path, "a");
  try {
    (0, import_node_fs3.writeSync)(fd, `${eventToJsonLine(event)}
`);
    (0, import_node_fs3.fsyncSync)(fd);
  } finally {
    (0, import_node_fs3.closeSync)(fd);
  }
  if (isNew) {
    (0, import_node_fs3.chmodSync)(path, FILE_MODE);
  }
  return path;
}

// src/audit/gas.ts
var import_viem4 = require("viem");

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

// src/b402/replayStore.ts
var replayStoreOverride = null;
var MPP_MAX_TIMEOUT_SECONDS = 300;
var REJECTED_TTL_MS = (MPP_MAX_TIMEOUT_SECONDS + 60) * 1e3;
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
function _setB402Transport(transport) {
  transportOverride = transport;
}
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
function _resetX402Seller() {
  transportOverride = null;
}
async function _probeB402Supported(env = process.env) {
  const transport = resolveB402Transport(env);
  return transport ? transport.supported() : null;
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
      const http3 = new import_server2.x402HTTPResourceServer(server, {
        [X402_SELL_PATH]: {
          accepts: accepts.map(({ assetId: _assetId, ...accept }) => ({
            ...accept,
            extra: { ...accept.extra }
          })),
          resource: options.resourceUrl
        }
      });
      try {
        await http3.initialize();
      } catch (error) {
        throw unwrapB402Error(error) ?? error;
      }
      return http3;
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
  const nonce = (0, import_b4023.isEip3009PaymentPayload)(payload) ? payload.payload.authorization.nonce : (0, import_b4023.isPermit2PaymentPayload)(payload) ? payload.payload.permit2Authorization.nonce : null;
  const payloadMethod = (0, import_b4023.isEip3009PaymentPayload)(payload) ? "eip3009" : (0, import_b4023.isPermit2PaymentPayload)(payload) ? "permit2-exact" : null;
  if (nonce === null || payloadMethod === null || event.expectation.transferMethod !== payloadMethod) {
    return;
  }
  const transferMethod2 = payloadMethod;
  let requestSha256;
  try {
    requestSha256 = b402SettlementRequestDigest(event.request, {
      payer: event.expectation.payer,
      nonce,
      transferMethod: transferMethod2
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
      transferMethod: transferMethod2,
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
        transfer_method: transferMethod2,
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
  return (0, import_node_crypto3.createHash)("sha256").update(canonical).digest("hex");
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

// src/x402/seller.ts
var import_b4024 = require("@bnb-chain/b402");
var import_server3 = require("@bnb-chain/b402/server");
var import_http2 = require("@x402/core/http");
var import_viem5 = require("viem");

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
  if (!isRecord2(rawResponse) || !Array.isArray(rawResponse.kinds)) {
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
  if (!isRecord2(rawKind) || !isRecord2(rawKind.extra)) return null;
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
function isRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

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
    const payTo = (0, import_viem5.getAddress)(policy.payTo ?? options.walletAddress);
    const resolved = resolveSellerPolicy(cfg, "b402", { network: networkName });
    if (resolved.policy.price.kind !== "usd") {
      throw new Error("B402 Seller requires a USD seller price");
    }
    if (resolved.policy.price.value !== policy.priceUsd) {
      throw new Error("B402 Seller policy price resolution mismatch");
    }
    let transport = null;
    if (policy.enabled && !isZeroPrice(policy.priceUsd)) {
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
        transport: transport ?? UNAVAILABLE_SUPPORTED_TRANSPORT
      } : { enabled: false }
    });
    await capabilities.start();
    const b402 = transport === null || isZeroPrice(policy.priceUsd) ? null : await createSellerB402({
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
      b402,
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
      return jsonResponse(404, { error: "x402 seller disabled" });
    }
    const prompt = promptFrom(request).trim();
    if (isZeroPrice(this.#policy.priceUsd)) {
      if (!prompt) return missingPromptResponse();
      try {
        const result = await withTimeout(
          this.#runWork({ prompt }),
          this.#policy.workTimeoutSeconds
        );
        return jsonResponse(200, { result });
      } catch (error) {
        console.warn(`[x402] free work failed: ${workFailureSummary(error)}`);
        return jsonResponse(500, { error: "work failed" });
      }
    }
    const snapshot = await this.#capabilities.freshSnapshot();
    const state = x402SellerState(this.#policy.enabled, snapshot);
    if (state === "dormant" || this.#b402 === null) {
      return jsonResponse(503, {
        error: "x402 rail dormant: no active B402 payment route"
      });
    }
    let http3;
    try {
      const accepts = buildX402SellerAccepts(
        snapshot,
        this.#policy.priceUsd,
        this.#payTo
      );
      if (accepts.length === 0) {
        return jsonResponse(503, {
          error: "x402 rail dormant: no active B402 payment route"
        });
      }
      http3 = await this.#b402.createHttp(snapshot, accepts);
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
      processed = await http3.processHTTPRequest(context);
    } catch (error) {
      return facilitatorFailureResponse(error);
    }
    if (processed.type === "payment-error") {
      return paymentErrorResponse(processed.response);
    }
    if (processed.type === "no-payment-required") {
      return jsonResponse(404, { error: "x402 route not found" });
    }
    let selected;
    try {
      selected = resolveX402SettlementAsset(
        this.#networkName,
        processed.paymentRequirements
      );
    } catch {
      return jsonResponse(500, { error: "x402 settlement asset rejected" });
    }
    let payer;
    let nonce;
    let transferMethod2;
    if ((0, import_b4024.isEip3009PaymentPayload)(processed.paymentPayload)) {
      if (!prompt) return missingPromptResponse();
      payer = (0, import_viem5.getAddress)(await (0, import_b4024.recoverEip3009Payer)(processed.paymentPayload));
      nonce = processed.paymentPayload.payload.authorization.nonce;
      transferMethod2 = "eip3009";
    } else if ((0, import_b4024.isPermit2PaymentPayload)(processed.paymentPayload)) {
      if (!prompt) return missingPromptResponse();
      payer = (0, import_viem5.getAddress)(
        processed.paymentPayload.payload.permit2Authorization.from
      );
      nonce = processed.paymentPayload.payload.permit2Authorization.nonce;
      transferMethod2 = "permit2-exact";
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
      { payer, nonce, transferMethod: transferMethod2 }
    );
    const reconciliationKey = b402ReconciliationKey({
      protocol: "x402",
      network: processed.paymentRequirements.network,
      tokenAddress: selected.tokenAddress,
      payer,
      nonce,
      transferMethod: transferMethod2,
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
            transfer_method: transferMethod2,
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
          const result = await http3.processSettlement(
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
          payer = (0, import_viem5.getAddress)(result.payer);
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
      const result = await withTimeout(
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
var UNAVAILABLE_SUPPORTED_TRANSPORT = Object.freeze({
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
      const body = (0, import_http2.decodePaymentRequiredHeader)(required);
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
  const b402 = unwrapB402Error(error);
  if (b402 instanceof import_server3.B402SettlementUnknownError) {
    return jsonResponse(500, {
      error: "settlement outcome unknown; reconciliation required"
    });
  }
  if (b402 instanceof import_server3.B402Error) {
    return jsonResponse(502, { error: "B402 facilitator unavailable" });
  }
  return jsonResponse(500, { error: "x402 seller failed" });
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
    error: "x402 request requires a non-empty prompt"
  });
}

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
  ALLOWED_HOSTS_CMC_PROFILE,
  ALLOWED_HOSTS_PIEVERSE_PROFILE,
  BudgetTracker,
  EIP3009_TYPES,
  MockB402Facilitator,
  SELLER_TOKENS,
  X402AmountExceededError,
  X402AssetMismatchError,
  X402AuthError,
  X402BudgetExhaustedError,
  X402BuyerPolicy,
  X402Error,
  X402HostNotAllowedError,
  X402InsufficientPaymentAssetAllowanceError,
  X402InsufficientPaymentAssetBalanceError,
  X402PaymentAssetBalanceUnavailableError,
  X402PaymentAssetUnavailableError,
  X402PaymentOutcomeUnknownError,
  X402PaymentRequiredError,
  X402PolicyError,
  X402RecipientMismatchError,
  X402RecipientRequiredError,
  X402RetryExhaustedError,
  X402Seller,
  X402SellerConfigError,
  X402SellerPolicy,
  X402UnsupportedWalletError,
  X402UnsupportedWalletRouteError,
  X402_SELL_PATH,
  _checkHost,
  _isDailyCapCountedElsewhere,
  _parseAccepted,
  _parseAcceptedExactRoute,
  _probeB402Supported,
  _resetSharedBudgetTracker,
  _resetX402Seller,
  _setB402Transport,
  _setConfigLoader,
  _setSleep,
  buildXPaymentHeader,
  caip2,
  createEnvelopeMiddleware,
  dailyCapCountedElsewhere,
  fetchWithPayment,
  getSharedBudgetTracker,
  merchantPinnedAssets,
  payChallenge,
  quoteUrl,
  resolveDailyCapUsd,
  sellerMoneyParser,
  sellerTokenExtras,
  usdToAtomic
});
