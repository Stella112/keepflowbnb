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

// src/erc8183/index.ts
var erc8183_exports = {};
__export(erc8183_exports, {
  BudgetCapExceededError: () => BudgetCapExceededError,
  DeliverableIntegrityError: () => DeliverableIntegrityError,
  DeliverableUnavailableError: () => DeliverableUnavailableError,
  ERC8183Error: () => ERC8183Error,
  InsufficientPaymentAssetBalanceError: () => InsufficientPaymentAssetBalanceError,
  JobNotFoundError: () => JobNotFoundError,
  JobStateError: () => JobStateError,
  NegotiationError: () => NegotiationError,
  NegotiationRejectedError: () => NegotiationRejectedError,
  PaymentAssetUnavailableError: () => PaymentAssetUnavailableError2,
  PolicyNotWhitelistedError: () => PolicyNotWhitelistedError,
  SdkCallFailedError: () => SdkCallFailedError,
  SubmitPermanentlyUnsupportedError: () => SubmitPermanentlyUnsupportedError,
  TokenNotAllowedError: () => TokenNotAllowedError,
  U_DECIMALS: () => U_DECIMALS,
  _reset8183ClientCache: () => _reset8183ClientCache,
  _setClientFactory: () => _setClientFactory,
  _setJobOpsFactory: () => _setJobOpsFactory,
  _setWalletOverride: () => _setWalletOverride,
  _txHash: () => _txHash,
  buyWorkflow: () => buyWorkflow,
  decodeRevert: () => decodeRevert,
  erc8183Network: () => erc8183Network,
  fetchWorkflow: () => fetchWorkflow,
  get8183Client: () => get8183Client,
  getJobSummary: () => getJobSummary,
  makeVerdict: () => makeVerdict,
  negotiateWithSeller: () => negotiateWithSeller,
  recoverQuoteSigner: () => recoverQuoteSigner,
  resolveWallet: () => resolveWallet,
  settleWorkflow: () => settleWorkflow,
  submitWorkflow: () => submitWorkflow,
  verifySignedJob: () => verifySignedJob
});
module.exports = __toCommonJS(erc8183_exports);

// src/erc8183/client.ts
var import_sdk3 = require("@bnbagent/sdk");

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
var BSC_TESTNET_FAUCET_DOCS_URL = "https://docs.bnbchain.org/bnb-smart-chain/developers/faucet/";
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
function formatUsdAtomic(networkName, assetId, atomic) {
  if (typeof atomic !== "bigint") {
    throw new TypeError("Atomic amount must be a bigint");
  }
  if (atomic < 0n) {
    throw new Error("Atomic USD amount must be non-negative");
  }
  return fromRaw(atomic, getNetwork(networkName).asset(assetId).decimals);
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
    const record2 = value;
    for (const condition of ["import", "node", "default"]) {
      const found = esmExportTarget(record2[condition]);
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

// src/erc8183/client.ts
async function jobUsesConfiguredPolicy(client, jobId) {
  if (client.router?.jobPolicy === void 0 || client.policy.address === void 0) {
    throw new Error("ERC-8183 policy binding reads are unavailable");
  }
  const boundPolicy = await client.router.jobPolicy(jobId);
  return boundPolicy.toLowerCase() === client.policy.address.toLowerCase();
}
var walletOverride = null;
function _setWalletOverride(wallet) {
  walletOverride = wallet;
}
function resolveWallet() {
  return walletOverride ?? getWallet();
}
function erc8183Network(name) {
  const nc = sdkNetwork(name);
  const keys = [
    "COMMERCE_ADDRESS",
    "ROUTER_ADDRESS",
    "POLICY_ADDRESS"
  ];
  const overrides = keys.map(
    (key) => process.env[`ERC8183_${key}`]?.trim() || void 0
  );
  const configured = overrides.filter((value) => value !== void 0).length;
  if (configured > 0 && configured < keys.length) {
    throw new Error(
      "partial ERC-8183 contract override: set COMMERCE, ROUTER, and POLICY addresses together"
    );
  }
  return {
    ...nc,
    commerceContract: overrides[0] ?? nc.commerceContract,
    routerContract: overrides[1] ?? nc.routerContract,
    policyContract: overrides[2] ?? nc.policyContract
  };
}
var defaultClientFactory = (network) => import_sdk3.ERC8183Client.create({
  walletProvider: resolveWallet(),
  network: erc8183Network(network)
});
var clientFactory = defaultClientFactory;
function _setClientFactory(factory) {
  clientFactory = factory ?? defaultClientFactory;
  clientCache.clear();
}
var clientCache = /* @__PURE__ */ new Map();
function get8183Client(network) {
  let resolved = network ?? null;
  if (resolved === null) {
    let cfg;
    try {
      cfg = loadStudioToml();
    } catch (e) {
      const code = e.code;
      const notFound = code === "ENOENT" || e instanceof Error && e.message.startsWith("No studio.toml");
      if (!notFound) throw e;
      cfg = {};
    }
    resolved = String(
      (cfg.network ?? {}).default ?? "bsc-testnet"
    );
  }
  let client = clientCache.get(resolved);
  if (client === void 0) {
    const networkName = resolved;
    client = Promise.resolve().then(() => clientFactory(networkName));
    clientCache.set(resolved, client);
    void client.catch(() => {
      if (clientCache.get(networkName) === client) {
        clientCache.delete(networkName);
      }
    });
  }
  return client;
}
function _reset8183ClientCache() {
  clientCache.clear();
}

// src/erc8183/errors.ts
var ERC8183Error = class extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "ERC8183Error";
  }
};
var BudgetCapExceededError = class extends ERC8183Error {
  constructor(message) {
    super(message);
    this.name = "BudgetCapExceededError";
  }
};
var TokenNotAllowedError = class extends ERC8183Error {
  constructor(message) {
    super(message);
    this.name = "TokenNotAllowedError";
  }
};
var PaymentAssetUnavailableError2 = class extends ERC8183Error {
  network;
  assetId;
  symbol;
  tokenAddress;
  decimals;
  alternatives;
  retryHint;
  fundingHint;
  constructor(opts) {
    const alternatives = Object.freeze([...opts.alternatives]);
    const alternativeText = alternatives.length === 0 ? "No validated alternative is currently available." : `Validated alternatives: ${alternatives.map(
      (asset) => `${asset.symbol} (${asset.assetId}, ${asset.retryHint})`
    ).join(", ")}.`;
    super(
      `Payment asset ${opts.symbol} (${opts.assetId}) is unavailable on ${opts.network}. ${alternativeText} Studio will not switch assets automatically.`
    );
    this.name = "PaymentAssetUnavailableError";
    this.network = opts.network;
    this.assetId = opts.assetId;
    this.symbol = opts.symbol;
    this.tokenAddress = opts.tokenAddress;
    this.decimals = opts.decimals;
    this.alternatives = alternatives;
    this.retryHint = null;
    this.fundingHint = opts.fundingHint ?? null;
  }
};
var InsufficientPaymentAssetBalanceError = class extends ERC8183Error {
  network;
  assetId;
  symbol;
  tokenAddress;
  decimals;
  requiredAtomic;
  currentAtomic;
  requiredHuman;
  currentHuman;
  alternatives;
  retryHint;
  fundingHint;
  constructor(opts) {
    const retryHint = `--asset ${opts.symbol}`;
    super(
      `Insufficient ${opts.symbol} balance on ${opts.network}: need ${opts.requiredHuman} (${opts.requiredAtomic} atomic), have ${opts.currentHuman} (${opts.currentAtomic} atomic). Fund the selected token or retry explicitly with ${retryHint}; Studio will not switch assets automatically.`
    );
    this.name = "InsufficientPaymentAssetBalanceError";
    this.network = opts.network;
    this.assetId = opts.assetId;
    this.symbol = opts.symbol;
    this.tokenAddress = opts.tokenAddress;
    this.decimals = opts.decimals;
    this.requiredAtomic = opts.requiredAtomic.toString();
    this.currentAtomic = opts.currentAtomic.toString();
    this.requiredHuman = opts.requiredHuman;
    this.currentHuman = opts.currentHuman;
    this.alternatives = Object.freeze([...opts.alternatives]);
    this.retryHint = retryHint;
    this.fundingHint = opts.fundingHint ?? null;
  }
};
var PolicyNotWhitelistedError = class extends ERC8183Error {
  constructor(message) {
    super(message);
    this.name = "PolicyNotWhitelistedError";
  }
};
var JobNotFoundError = class extends ERC8183Error {
  constructor(message) {
    super(message);
    this.name = "JobNotFoundError";
  }
};
var JobStateError = class extends ERC8183Error {
  jobId;
  expected;
  actual;
  constructor(opts) {
    const expStr = Array.isArray(opts.expected) ? opts.expected.join(" or ") : opts.expected;
    super(`Job ${opts.jobId}: expected status ${expStr}, got ${opts.actual}`);
    this.name = "JobStateError";
    this.jobId = opts.jobId;
    this.expected = opts.expected;
    this.actual = opts.actual;
  }
};
var DeliverableUnavailableError = class extends ERC8183Error {
  constructor(message) {
    super(message);
    this.name = "DeliverableUnavailableError";
  }
};
var DeliverableIntegrityError = class extends ERC8183Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "DeliverableIntegrityError";
  }
};
var SubmitPermanentlyUnsupportedError = class extends ERC8183Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "SubmitPermanentlyUnsupportedError";
  }
};
var SdkCallFailedError = class extends ERC8183Error {
  code;
  txHash;
  retryable;
  constructor(message, opts = {}) {
    super(message, { cause: opts.cause });
    this.name = "SdkCallFailedError";
    this.code = opts.code ?? null;
    this.txHash = opts.txHash ?? null;
    this.retryable = opts.retryable ?? null;
  }
};

// src/erc8183/negotiate.ts
var import_promises = require("dns/promises");
var import_node_net = require("net");
var import_erc8183 = require("@bnbagent/sdk/erc8183");
var import_networks4 = require("@bnbagent/sdk/networks");
var NegotiationError = class extends ERC8183Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "NegotiationError";
  }
};
var NegotiationRejectedError = class extends NegotiationError {
  supportedAssets;
  constructor(message, supportedAssets = []) {
    super(message);
    this.name = "NegotiationRejectedError";
    this.supportedAssets = Object.freeze([...new Set(supportedAssets)]);
  }
};
function supportedAssetsFromRejection(response) {
  const details = response.details;
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }
  const entries = details.supported_assets;
  if (!Array.isArray(entries)) return [];
  const supported = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    if (typeof entry !== "string") continue;
    try {
      supported.add((0, import_networks4.parseAssetId)(entry));
    } catch {
    }
  }
  return Object.freeze([...supported]);
}
var NEGOTIATE_PATH = "/negotiate";
var DEFAULT_TIMEOUT_MS = 3e4;
var MAX_NEGOTIATION_RESPONSE_BYTES = 1024 * 1024;
async function readBoundedResponse(resp) {
  const advertised = resp.headers.get("content-length");
  if (advertised !== null) {
    if (!/^\d+$/u.test(advertised)) {
      await resp.body?.cancel().catch(() => void 0);
      throw new NegotiationError(
        "seller negotiation response has an invalid content-length"
      );
    }
    if (BigInt(advertised) > BigInt(MAX_NEGOTIATION_RESPONSE_BYTES)) {
      await resp.body?.cancel().catch(() => void 0);
      throw new NegotiationError(
        `seller negotiation response exceeds ${MAX_NEGOTIATION_RESPONSE_BYTES} bytes`
      );
    }
  }
  if (resp.body === null) return "";
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === void 0) continue;
      received += value.byteLength;
      if (received > MAX_NEGOTIATION_RESPONSE_BYTES) {
        await reader.cancel().catch(() => void 0);
        throw new NegotiationError(
          `seller negotiation response exceeds ${MAX_NEGOTIATION_RESPONSE_BYTES} bytes`
        );
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } finally {
    reader.releaseLock();
  }
}
function privateIp(address) {
  const normalized = address.replace(/^\[|\]$/gu, "").split("%", 1)[0] ?? "";
  if ((0, import_node_net.isIP)(normalized) === 4) {
    const [a = 0, b = 0] = normalized.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 198 && (b === 18 || b === 19) || a >= 224;
  }
  if ((0, import_node_net.isIP)(normalized) === 6) {
    const lower = normalized.toLowerCase();
    let mappedPrivate = false;
    if (lower.startsWith("::ffff:")) {
      const suffix = lower.slice("::ffff:".length);
      if ((0, import_node_net.isIP)(suffix) === 4) {
        mappedPrivate = privateIp(suffix);
      } else {
        const words = suffix.split(":");
        if (words.length === 2 && words.every((word) => /^[0-9a-f]{1,4}$/u.test(word))) {
          const high = Number.parseInt(words[0], 16);
          const low = Number.parseInt(words[1], 16);
          mappedPrivate = privateIp(
            `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`
          );
        }
      }
    }
    return lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || /^fe[89ab]/u.test(lower) || lower.startsWith("ff") || mappedPrivate;
  }
  return false;
}
async function safeNegotiationUrl(raw, resolveDns) {
  let url;
  try {
    url = new URL(raw);
  } catch (cause) {
    throw new NegotiationError(`invalid seller endpoint: ${raw}`, { cause });
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new NegotiationError(`invalid seller endpoint: ${raw}`);
  }
  const hostname = url.hostname.replace(/^\[|\]$/gu, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || privateIp(hostname)) {
    throw new NegotiationError(
      `seller endpoint resolves to a private or loopback address: ${hostname}`
    );
  }
  if (!resolveDns) return url;
  if (url.protocol !== "https:") {
    throw new NegotiationError("seller endpoint must use HTTPS");
  }
  let addresses;
  try {
    addresses = await (0, import_promises.lookup)(hostname, { all: true, verbatim: true });
  } catch (cause) {
    throw new NegotiationError(`cannot resolve seller endpoint: ${hostname}`, {
      cause
    });
  }
  if (addresses.length === 0 || addresses.some(({ address }) => privateIp(address))) {
    throw new NegotiationError(
      `seller endpoint resolves to a private or loopback address: ${hostname}`
    );
  }
  return url;
}
var UINT256_MAX = (1n << 256n) - 1n;
function priceToBigInt(price) {
  if (typeof price !== "string" || !/^(?:0|[1-9]\d*)$/u.test(price)) {
    throw new Error("price must be a canonical non-negative integer string");
  }
  const value = BigInt(price);
  if (value > UINT256_MAX) throw new Error("price exceeds uint256");
  return value;
}
async function negotiateWithSeller(endpoint, task, opts = {}) {
  const {
    deliverables = "Plain text response addressing the task.",
    qualityStandards = "Response must address the task and be non-empty.",
    currency,
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = opts;
  const request2 = new import_erc8183.NegotiationRequest({
    taskDescription: task,
    terms: new import_erc8183.TermSpecification({
      deliverables,
      qualityStandards,
      currency: currency ?? null
    })
  });
  const endpointUrl = await safeNegotiationUrl(endpoint, fetchImpl === fetch);
  endpointUrl.pathname = `${endpointUrl.pathname.replace(/\/+$/, "")}${NEGOTIATE_PATH}`;
  const url = endpointUrl.toString();
  let resp;
  let text;
  try {
    resp = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request2.toEnvelope()),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual"
    });
    text = await readBoundedResponse(resp);
  } catch (e) {
    if (e instanceof NegotiationError) throw e;
    throw new NegotiationError(`cannot reach or read seller at ${url}: ${e}`, {
      cause: e
    });
  }
  if (resp.status !== 200) {
    throw new NegotiationError(
      `seller ${url} returned ${resp.status}: ${text.slice(0, 300)}`
    );
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    throw new NegotiationError(
      `seller ${url} returned non-JSON: ${text.slice(0, 300)}`,
      { cause: e }
    );
  }
  const responseBlock = typeof body === "object" && body !== null && !Array.isArray(body) ? body.response : null;
  if (typeof responseBlock !== "object" || responseBlock === null || Array.isArray(responseBlock)) {
    throw new NegotiationError(
      `seller ${url} response missing 'response' block: ${JSON.stringify(body)}`
    );
  }
  const response = responseBlock;
  if (!response.accepted) {
    const reason = response.reason || response.reason_code || "unknown";
    throw new NegotiationRejectedError(
      `seller ${url} rejected negotiation: ${reason}`,
      supportedAssetsFromRejection(response)
    );
  }
  const terms = response.terms ?? {};
  const price = terms.price;
  const responseCurrency = terms.currency;
  if (price == null || price === "" || !responseCurrency) {
    throw new NegotiationError(
      `seller ${url} accepted but did not return price/currency: terms=${JSON.stringify(terms)}`
    );
  }
  let priceRaw;
  try {
    priceRaw = priceToBigInt(price);
  } catch (e) {
    throw new NegotiationError(
      `seller ${url} returned unparseable price=${JSON.stringify(price)}`,
      { cause: e }
    );
  }
  const qe = response.quote_expires_at;
  const est = response.estimated_completion_seconds;
  return {
    priceRaw,
    currency: String(responseCurrency),
    quoteExpiresAt: qe ? Number(qe) : null,
    estimatedCompletionSeconds: est === void 0 || est === null ? null : Number(est),
    responseEnvelope: body
  };
}

// src/erc8183/revert.ts
var import_viem2 = require("viem");
var REVERT_DATA_RE = /\brevert(?:ed)?(?:\s+with\s+(?:reason|data))?\s*:\s*[('"]*(0x[0-9a-fA-F]+)\b/giu;
var HINTS = {
  "NotDecided()": "the verdict is not decided yet \u2014 the dispute/evaluation window is likely still open; retry after it elapses",
  "OutsideDisputeWindow()": "the dispute window has closed",
  "WrongStatus()": "the job is not in the status this action requires",
  "Unauthorized()": "the caller is not authorized for this action \u2014 check that the sender wallet matches the job's provider/client and that the transaction targets the same contract stack the job was created on",
  // twak CLI >= 0.19.0 funds with --expected-budget: the contract pins the
  // amount atomically and reverts with this when the on-chain budget moved
  // between quote and fund (replaces the old client-side pre-check, whose
  // check-then-fund race is now closed contract-side).
  "BudgetMismatch()": "the on-chain budget no longer matches the expected amount \u2014 it changed between quote and fund; re-read the job and retry with the current budget"
};
var ERROR_SIGNATURES = [
  "AddressEmptyCode(address)",
  "AlreadyDisputed()",
  "AlreadyInitialised()",
  "AlreadyVoted()",
  "BudgetMismatch()",
  "ECDSAInvalidSignature()",
  "ECDSAInvalidSignatureLength(uint256)",
  "ECDSAInvalidSignatureS(bytes32)",
  "ERC1967InvalidImplementation(address)",
  "ERC1967NonPayable()",
  "ERC721IncorrectOwner(address,uint256,address)",
  "ERC721InsufficientApproval(address,uint256)",
  "ERC721InvalidApprover(address)",
  "ERC721InvalidOperator(address)",
  "ERC721InvalidOwner(address)",
  "ERC721InvalidReceiver(address)",
  "ERC721InvalidSender(address)",
  "ERC721NonexistentToken(uint256)",
  "EnforcedPause()",
  "ExpectedPause()",
  "ExpiryTooLong()",
  "ExpiryTooShort()",
  "FailedCall()",
  "FeeTooHigh()",
  "HasInflightJobs()",
  "HookCallFailed()",
  "HookMissingInterface()",
  "HookRequired()",
  "InvalidInitialization()",
  "InvalidJob()",
  "JobNotOpen()",
  "NotAdmin()",
  "NotClient()",
  "NotCommerce()",
  "NotDecided()",
  "NotDisputed()",
  "NotExpired()",
  "NotInitializing()",
  "NotJobClient()",
  "NotPaused()",
  "NotPendingAdmin()",
  "NotRouter()",
  "NotSubmitted()",
  "NotVoter()",
  "OutsideDisputeWindow()",
  "OwnableInvalidOwner(address)",
  "OwnableUnauthorizedAccount(address)",
  "PolicyAlreadySet()",
  "PolicyNotSet()",
  "PolicyNotWhitelisted()",
  "ProviderAlreadySet()",
  "ProviderNotSet()",
  "QuorumOutOfRange()",
  "QuorumZero()",
  "ReentrancyGuardReentrantCall()",
  "RouterNotEvaluator()",
  "RouterNotHook()",
  "SafeERC20FailedOperation(address)",
  "SubmissionTooLate()",
  "TokenHasNoCode()",
  "UUPSUnauthorizedCallContext()",
  "UUPSUnsupportedProxiableUUID(bytes32)",
  "Unauthorized()",
  "UnknownVerdict(uint8)",
  "UnknownVoter()",
  "UnsupportedPaymentToken()",
  "VoterAlreadyExists()",
  "WouldBreakQuorum()",
  "WrongJobStatus()",
  "WrongStatus()",
  "ZeroAddress()",
  "ZeroBudget()"
];
var selectorMapCache = null;
function selectorMap() {
  if (selectorMapCache === null) {
    selectorMapCache = new Map(
      ERROR_SIGNATURES.map((sig) => [
        (0, import_viem2.keccak256)((0, import_viem2.toBytes)(sig)).slice(0, 10).toLowerCase(),
        sig
      ])
    );
  }
  return selectorMapCache;
}
function decodeRevert(err) {
  const seen = /* @__PURE__ */ new Set();
  function decode(data) {
    if (!/^0x[0-9a-f]+$/iu.test(data) || (data.length - 10) % 64 !== 0)
      return null;
    const selector = data.slice(0, 10).toLowerCase();
    const signature = selectorMap().get(selector);
    if (!signature) return null;
    const hint = HINTS[signature];
    return `${signature} [${selector}]${hint ? ` \u2014 ${hint}` : ""}`;
  }
  function visit(value) {
    if (value !== null && typeof value === "object") {
      if (seen.has(value)) return null;
      seen.add(value);
      const error = value;
      if (typeof error.data === "string") {
        const decoded = decode(error.data);
        if (decoded) return decoded;
      }
      for (const nested of [error.cause, error.error]) {
        const decoded = visit(nested);
        if (decoded) return decoded;
      }
      return visit(error.message);
    }
    if (typeof value !== "string") return null;
    for (const match of value.matchAll(REVERT_DATA_RE)) {
      const decoded = decode(match[1]);
      if (decoded) return decoded;
    }
    return null;
  }
  return visit(err);
}

// src/erc8183/verify.ts
var import_sdk4 = require("@bnbagent/sdk");
var import_erc81832 = require("@bnbagent/sdk/erc8183");
var import_viem3 = require("viem");
var MAX_UINT256 = (1n << 256n) - 1n;
function makeVerdict(ok, reason = "", permanent = false) {
  return Object.freeze({ ok, reason, permanent });
}
function canonicalJson(value) {
  const sortValue = (v) => {
    if (Array.isArray(v)) return v.map(sortValue);
    if (typeof v === "object" && v !== null) {
      const rec = v;
      const out = {};
      for (const k of Object.keys(rec).sort()) {
        out[k] = sortValue(rec[k]);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(sortValue(value)).replace(
    /[\u007f-\uffff]/g,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}
async function recoverQuoteSigner(description) {
  let jd;
  try {
    jd = import_erc81832.JobDescription.fromStr(description);
  } catch {
    return null;
  }
  if (jd === null || !jd.negotiationHash || !jd.providerSig) {
    return null;
  }
  const parsed = JSON.parse(description);
  const content = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (k !== "negotiation_hash" && k !== "provider_sig") {
      content[k] = v;
    }
  }
  let recomputed = (0, import_viem3.keccak256)((0, import_viem3.toBytes)(canonicalJson(content)));
  recomputed = recomputed.startsWith("0x") ? recomputed : `0x${recomputed}`;
  if (recomputed.toLowerCase() !== jd.negotiationHash.toLowerCase()) {
    return null;
  }
  try {
    return await (0, import_viem3.recoverMessageAddress)({
      message: jd.negotiationHash,
      signature: jd.providerSig
    });
  } catch {
    return null;
  }
}
async function verifySignedJob(jobId, expectedSigner, opts = {}) {
  let job;
  let client;
  try {
    client = await get8183Client(opts.network ?? null);
    job = await client.getJob(BigInt(jobId));
  } catch (exc) {
    return makeVerdict(
      false,
      `chain read failed: ${exc instanceof Error ? exc.message : exc}`,
      false
    );
  }
  if (job.status !== import_sdk4.JobStatus.FUNDED) {
    return makeVerdict(
      false,
      `job status ${import_sdk4.JobStatus[job.status]}, expected FUNDED`
    );
  }
  if (String(job.provider).toLowerCase() !== String(expectedSigner).toLowerCase()) {
    return makeVerdict(false, "job is not assigned to this provider", true);
  }
  const now = Math.floor(Date.now() / 1e3);
  if (job.expiredAt && Number(job.expiredAt) <= now) {
    return makeVerdict(false, "job has expired", true);
  }
  const minimumRemainingSeconds = Math.max(
    0,
    Math.ceil(opts.minimumRemainingSeconds ?? 0)
  );
  if (minimumRemainingSeconds > 0) {
    let disputeWindowSeconds;
    try {
      if (!await jobUsesConfiguredPolicy(client, BigInt(jobId))) {
        return makeVerdict(
          false,
          "job is not bound to the configured optimistic policy",
          true
        );
      }
      disputeWindowSeconds = Number(await client.policy.disputeWindow());
    } catch (exc) {
      return makeVerdict(
        false,
        `chain read failed: ${exc instanceof Error ? exc.message : exc}`,
        false
      );
    }
    const submitDeadline = Number(job.expiredAt) - disputeWindowSeconds;
    const remainingSeconds = Math.max(0, submitDeadline - now);
    if (remainingSeconds < minimumRemainingSeconds) {
      return makeVerdict(
        false,
        `job submit window has ${remainingSeconds}s remaining; ${minimumRemainingSeconds}s required for work and upload`,
        true
      );
    }
  }
  let jd;
  try {
    jd = import_erc81832.JobDescription.fromStr(job.description);
  } catch {
    jd = null;
  }
  if (jd === null) {
    return makeVerdict(
      false,
      "no signed quote anchored in job description",
      true
    );
  }
  let rawJobToken;
  try {
    rawJobToken = await client.jobPaymentToken(BigInt(jobId));
  } catch (exc) {
    return makeVerdict(
      false,
      `chain read failed: ${exc instanceof Error ? exc.message : exc}`,
      false
    );
  }
  let jobToken;
  try {
    jobToken = (0, import_viem3.getAddress)(rawJobToken);
  } catch {
    return makeVerdict(
      false,
      `job payment token '${rawJobToken}' is not a valid token address`,
      true
    );
  }
  const networkName = opts.network ?? client.network.name;
  let registry;
  try {
    registry = getNetwork(networkName);
  } catch {
    return makeVerdict(
      false,
      `job verification network '${networkName}' is not supported`,
      true
    );
  }
  if (registry.chainId !== client.network.chainId) {
    return makeVerdict(
      false,
      `job verification network ${networkName} does not match client chain ${client.network.chainId}`,
      true
    );
  }
  try {
    registry.resolveAsset({ address: jobToken });
  } catch {
    return makeVerdict(
      false,
      `job payment token ${jobToken} is not in the ${networkName} payment catalog`,
      true
    );
  }
  let quoteToken;
  try {
    quoteToken = (0, import_viem3.getAddress)(jd.currency);
  } catch {
    return makeVerdict(
      false,
      `signed quote currency '${jd.currency}' is not a valid token address`,
      true
    );
  }
  if (quoteToken !== jobToken) {
    return makeVerdict(
      false,
      `signed quote currency ${quoteToken} does not match job payment token ${jobToken}`,
      true
    );
  }
  if (typeof jd.price !== "string" || !/^(?:0|[1-9]\d*)$/.test(jd.price)) {
    return makeVerdict(false, `unparseable agreed price '${jd.price}'`, true);
  }
  const quotePrice = BigInt(jd.price);
  if (quotePrice > MAX_UINT256) {
    return makeVerdict(false, `unparseable agreed price '${jd.price}'`, true);
  }
  const envelope = JSON.parse(job.description);
  const negotiatedAt = envelope.negotiated_at;
  const quoteExpiresAt = envelope.quote_expires_at;
  const hasWindow = typeof negotiatedAt === "number" && Number.isSafeInteger(negotiatedAt) && negotiatedAt >= 0 && typeof quoteExpiresAt === "number" && Number.isSafeInteger(quoteExpiresAt) && quoteExpiresAt > negotiatedAt;
  const declaredChainId = envelope.chain_id;
  if (hasWindow && declaredChainId === void 0) {
    return makeVerdict(
      false,
      "modern signed quote is not bound to a chain_id",
      true
    );
  }
  if (declaredChainId !== void 0 && (typeof declaredChainId !== "number" || !Number.isSafeInteger(declaredChainId) || declaredChainId !== registry.chainId)) {
    return makeVerdict(
      false,
      `signed quote chain_id ${String(declaredChainId)} does not match ${registry.chainId}`,
      true
    );
  }
  const declaredCommerce = envelope.verifying_contract;
  if (hasWindow && (declaredCommerce === void 0 || declaredCommerce === null)) {
    return makeVerdict(
      false,
      "modern signed quote is not bound to a verifying_contract",
      true
    );
  }
  if (declaredCommerce !== void 0) {
    let quoteCommerce;
    let clientCommerce;
    try {
      quoteCommerce = (0, import_viem3.getAddress)(String(declaredCommerce));
      clientCommerce = (0, import_viem3.getAddress)(client.network.commerceContract);
    } catch {
      return makeVerdict(
        false,
        "signed quote verifying_contract is not a valid address",
        true
      );
    }
    if (quoteCommerce !== clientCommerce) {
      return makeVerdict(
        false,
        `signed quote verifying_contract mismatch: ${quoteCommerce} does not match ${clientCommerce}`,
        true
      );
    }
  }
  const publicClient = client.publicClient;
  if (hasWindow && publicClient && client.getJobFundedBlock) {
    let fundedBlock;
    try {
      fundedBlock = await client.getJobFundedBlock(BigInt(jobId), {
        negotiatedAt,
        quoteExpiresAt
      });
    } catch (exc) {
      return makeVerdict(
        false,
        `chain read failed: ${exc instanceof Error ? exc.message : exc}`,
        false
      );
    }
    if (fundedBlock === null) {
      return makeVerdict(
        false,
        "job was not funded inside the signed quote window",
        true
      );
    }
    let verdict;
    try {
      verdict = await (0, import_erc81832.verifyQuoteSignature)({
        envelope,
        provider: expectedSigner,
        publicClient,
        blockNumber: fundedBlock,
        expectedVerifyingContract: client.network.commerceContract
      });
    } catch (exc) {
      return makeVerdict(
        false,
        `chain read failed: ${exc instanceof Error ? exc.message : exc}`,
        false
      );
    }
    if (!verdict.valid) {
      return makeVerdict(
        false,
        `quote signature does not match this provider (or terms were tampered): ${verdict.reason}`,
        true
      );
    }
  } else {
    const signer = await recoverQuoteSigner(job.description);
    if (signer === null || signer.toLowerCase() !== String(expectedSigner).toLowerCase()) {
      return makeVerdict(
        false,
        "quote signature does not match this provider (or terms were tampered)",
        true
      );
    }
  }
  try {
    if (BigInt(job.budget) < quotePrice) {
      return makeVerdict(
        false,
        `funded budget ${job.budget} is below the agreed price ${jd.price}`,
        true
      );
    }
  } catch {
    return makeVerdict(false, `unparseable agreed price '${jd.price}'`, true);
  }
  return makeVerdict(true);
}

// src/erc8183/workflows.ts
var import_sdk10 = require("@bnbagent/sdk");
var import_erc81833 = require("@bnbagent/sdk/erc8183");
var import_wallets2 = require("@bnbagent/sdk/wallets");

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
var import_node_fs4 = require("fs");
var import_node_path3 = require("path");
var DEFAULT_LOG_NAME = "audit-log.jsonl";
var DEFAULT_LOG_DIR = ".studio";
var FILE_MODE = 384;
var STUDIO_AUDIT_LOG_PATH_ENV = "STUDIO_AUDIT_LOG_PATH";
function resolveAuditLogPath(projectRoot) {
  const override = process.env[STUDIO_AUDIT_LOG_PATH_ENV];
  if (override) return override;
  const root = projectRoot ?? process.cwd();
  return (0, import_node_path3.join)(root, DEFAULT_LOG_DIR, DEFAULT_LOG_NAME);
}
function appendEvent(event, opts = {}) {
  const path = resolveAuditLogPath(opts.projectRoot);
  (0, import_node_fs4.mkdirSync)((0, import_node_path3.dirname)(path), { recursive: true });
  const isNew = !(0, import_node_fs4.existsSync)(path);
  const fd = (0, import_node_fs4.openSync)(path, "a");
  try {
    (0, import_node_fs4.writeSync)(fd, `${eventToJsonLine(event)}
`);
    (0, import_node_fs4.fsyncSync)(fd);
  } finally {
    (0, import_node_fs4.closeSync)(fd);
  }
  if (isNew) {
    (0, import_node_fs4.chmodSync)(path, FILE_MODE);
  }
  return path;
}

// src/audit/gas.ts
var import_viem4 = require("viem");

// src/x402/policy.ts
var import_node_fs5 = require("fs");
var import_node_path4 = require("path");
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
        JSON.parse((0, import_node_fs5.readFileSync)(this.ledgerPath, "utf-8"))
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
      (0, import_node_fs5.mkdirSync)((0, import_node_path4.dirname)(this.ledgerPath), { recursive: true });
      const tmp = `${this.ledgerPath}.tmp`;
      (0, import_node_fs5.writeFileSync)(
        tmp,
        JSON.stringify({
          day: this.#currentDay,
          spent_usd: this.#spentTodayUsd,
          entries: this.#entries.slice(-MAX_LEDGER_ENTRIES)
        }),
        "utf-8"
      );
      (0, import_node_fs5.renameSync)(tmp, this.ledgerPath);
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
      (0, import_node_fs5.mkdirSync)((0, import_node_path4.dirname)(this.ledgerPath), { recursive: true });
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
  const lexicalRoot = (0, import_node_path4.resolve)(projectRoot);
  const absentSuffix = [];
  let existingCandidate = lexicalRoot;
  while (true) {
    try {
      (0, import_node_fs5.lstatSync)(existingCandidate);
      break;
    } catch (cause) {
      if (cause.code !== "ENOENT") {
        throw cause;
      }
      const parent = (0, import_node_path4.dirname)(existingCandidate);
      if (parent === existingCandidate) {
        throw cause;
      }
      absentSuffix.unshift((0, import_node_path4.basename)(existingCandidate));
      existingCandidate = parent;
    }
  }
  const physicalCandidate = import_node_fs5.realpathSync.native(existingCandidate);
  if (!(0, import_node_fs5.statSync)(physicalCandidate).isDirectory()) {
    throw new TypeError(
      `projectRoot must resolve to a directory: ${lexicalRoot}`
    );
  }
  return (0, import_node_path4.join)(physicalCandidate, ...absentSuffix);
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
  const ledger = canonical.projectRoot !== null ? (0, import_node_path4.join)(canonical.projectRoot, ".studio", "spend-ledger.json") : null;
  const tracker = new BudgetTracker({
    dailyCapUsd: canonical.dailyCapUsd,
    ledgerPath: ledger
  });
  sharedTrackers.set(canonical.key, tracker);
  return tracker;
}

// src/audit/gas.ts
var defaultReceiptFetcher = async (txHash, network) => {
  const client = (0, import_viem4.createPublicClient)({
    transport: (0, import_viem4.http)(getNetwork(network).rpcUrl)
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
var import_sdk5 = require("@bnbagent/sdk");
var ERC8004Error = class extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "ERC8004Error";
  }
};
var NotRegisteredError = class extends ERC8004Error {
  constructor(message) {
    super(message);
    this.name = "NotRegisteredError";
  }
};
function erc8004SdkNetwork(wallet, network, opts = {}) {
  const nc = sdkNetwork(network);
  if (opts.noPaymaster) {
    return { ...nc, usePaymaster: false };
  }
  if (wallet instanceof import_sdk5.TWAKProvider && network === "bsc-mainnet") {
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
var defaultSdkFactory = (wallet, network, opts) => import_sdk5.ERC8004Agent.create({
  walletProvider: wallet,
  network: erc8004SdkNetwork(wallet, network, opts)
});
var sdkFactory = defaultSdkFactory;
function makeSdk(wallet, network, opts) {
  getNetwork(network);
  return sdkFactory(wallet, network, opts);
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
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

// src/storage.ts
var import_sdk9 = require("@bnbagent/sdk");
var import_storage2 = require("@bnbagent/sdk/storage");

// src/objectStorage.ts
var import_node_crypto = require("crypto");
var import_sdk8 = require("@bnbagent/sdk");
var import_storage = require("@bnbagent/sdk/storage");

// src/publicDestination.ts
var import_promises2 = require("dns/promises");
var import_node_https = require("https");
var import_node_net2 = require("net");
var import_node_stream = require("stream");
var import_sdk6 = require("@bnbagent/sdk");
var reserved = new import_node_net2.BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3]
])
  reserved.addSubnet(address, prefix, "ipv4");
var globalV6 = new import_node_net2.BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
reserved.addSubnet("2001::", 23, "ipv6");
reserved.addSubnet("2001:db8::", 32, "ipv6");
reserved.addSubnet("2002::", 16, "ipv6");
function unsafeAddress(address) {
  const family = (0, import_node_net2.isIP)(address);
  if (family === 4) return reserved.check(address, "ipv4");
  if (family === 6) {
    return !globalV6.check(address, "ipv6") || reserved.check(address, "ipv6");
  }
  return true;
}
function assertPublicHostname(url) {
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || (0, import_node_net2.isIP)(host) !== 0 && unsafeAddress(host)) {
    throw new import_sdk6.StorageError(
      "Deliverable destination must not be private, loopback, or reserved."
    );
  }
}
async function publicAddresses(url, signal) {
  assertPublicHostname(url);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let onAbort = () => {
  };
  try {
    signal.throwIfAborted();
    const addresses = await Promise.race([
      (0, import_promises2.lookup)(host, { all: true, verbatim: true }),
      new Promise((_resolve, reject) => {
        onAbort = () => reject(signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
      })
    ]);
    if (addresses.length === 0 || addresses.some(({ address }) => unsafeAddress(address))) {
      throw new import_sdk6.StorageError(
        "Deliverable destination resolves to a private or reserved address."
      );
    }
    return addresses;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
var readTransportOverride = null;
async function fetchPublicDestination(url, method, signal) {
  const addresses = await publicAddresses(url, signal);
  const init = {
    method,
    signal,
    redirect: "error",
    headers: { Accept: "application/json", "Accept-Encoding": "identity" }
  };
  if (readTransportOverride) return readTransportOverride(url, init, addresses);
  const pinnedLookup = (_hostname, options, callback) => {
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0]?.address ?? "", addresses[0]?.family ?? 4);
  };
  return new Promise((resolve4, reject) => {
    const req = (0, import_node_https.request)(
      url,
      {
        method,
        signal,
        lookup: pinnedLookup,
        agent: false,
        rejectUnauthorized: true,
        headers: { Accept: "application/json", "Accept-Encoding": "identity" }
      },
      (res) => {
        try {
          const status = res.statusCode ?? 502;
          if (status < 200 || status > 599) {
            throw new import_sdk6.StorageError(
              `Unsupported deliverable HTTP status: ${status}.`
            );
          }
          const headers = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value !== void 0)
              headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          }
          const noBody = method === "HEAD" || [204, 205, 304].includes(status);
          if (noBody) res.resume();
          resolve4(
            new Response(
              noBody ? null : import_node_stream.Readable.toWeb(res),
              { status, headers }
            )
          );
        } catch (error) {
          res.destroy();
          reject(error);
        }
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// src/storageErrors.ts
var import_sdk7 = require("@bnbagent/sdk");
var DeliverableContentError = class extends import_sdk7.StorageError {
};

// src/objectStorage.ts
var DEFAULT_KEY_PREFIX = "deliverables";
var MAX_DELIVERABLE_BYTES = 10 * 1024 * 1024;
var SHA256_PATH = /(?:^|\/)sha256\/([0-9a-f]{64})\.json$/i;
function canonicalise(value) {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const entry = value[key];
      if (entry !== void 0) out[key] = canonicalise(entry);
    }
    return out;
  }
  return value;
}
function serialiseDeliverable(data) {
  return JSON.stringify(canonicalise(data));
}
function sha256Hex(content) {
  return (0, import_node_crypto.createHash)("sha256").update(content, "utf8").digest("hex");
}
function cleanSegment(value, label) {
  const clean = value.trim().replace(/^\/+|\/+$/g, "");
  if (!clean || clean === "." || clean === ".." || clean.includes("\\")) {
    throw new import_sdk8.StorageError(`${label} must be a non-empty object-key segment.`);
  }
  return clean;
}
function objectKey(prefix, digest) {
  const cleanPrefix = cleanSegment(
    prefix ?? DEFAULT_KEY_PREFIX,
    "storage.key_prefix"
  );
  return `${cleanPrefix}/sha256/${digest}.json`;
}
function encodedObjectKey(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}
function assertUploadWithinLimit(body) {
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > MAX_DELIVERABLE_BYTES) {
    throw new import_sdk8.StorageError(
      `Deliverable exceeds the ${MAX_DELIVERABLE_BYTES}-byte upload limit.`
    );
  }
}
function assertStablePublicUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new import_sdk8.StorageError(`Invalid deliverable public URL: ${value}`);
  }
  if (url.protocol !== "https:") {
    throw new import_sdk8.StorageError(
      `Deliverable public URL must use https (received ${url.protocol || "no scheme"}).`
    );
  }
  if (url.username || url.password) {
    throw new import_sdk8.StorageError(
      "Deliverable public URL must not contain credentials."
    );
  }
  if (url.search) {
    throw new import_sdk8.StorageError(
      "Deliverable public URLs must not contain query parameters; temporary S3 presigned, Azure SAS, and CDN signed URLs cannot be published on-chain."
    );
  }
  assertPublicHostname(url);
  return url;
}
function publicUrl(base, key) {
  const parsed = assertStablePublicUrl(base);
  if (parsed.search || parsed.hash) {
    throw new import_sdk8.StorageError(
      "storage.public_base_url must not contain a query or fragment."
    );
  }
  const root = parsed.toString().replace(/\/+$/, "");
  return `${root}/${encodedObjectKey(key)}`;
}
function errorStatus(error) {
  if (typeof error !== "object" || error === null) return void 0;
  const record2 = error;
  const metadata = record2.$metadata;
  if (typeof metadata === "object" && metadata !== null) {
    const status = metadata.httpStatusCode;
    if (typeof status === "number") return status;
  }
  for (const key of ["statusCode", "status"]) {
    if (typeof record2[key] === "number") return record2[key];
  }
  return void 0;
}
function alreadyExists(error) {
  if (errorStatus(error) === 409 || errorStatus(error) === 412) return true;
  if (typeof error !== "object" || error === null) return false;
  const name = String(error.name ?? "");
  const code = String(error.code ?? "");
  return [name, code].some(
    (value) => ["PreconditionFailed", "BlobAlreadyExists"].includes(value)
  );
}
async function responseTextWithinLimit(response) {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_DELIVERABLE_BYTES) {
    await response.body?.cancel();
    throw new DeliverableContentError(
      `Deliverable exceeds the ${MAX_DELIVERABLE_BYTES}-byte download limit.`
    );
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_DELIVERABLE_BYTES) {
        await reader.cancel();
        throw new DeliverableContentError(
          `Deliverable exceeds the ${MAX_DELIVERABLE_BYTES}-byte download limit.`
        );
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}
async function fetchPublicJson(value, expectedDigest) {
  const url = assertStablePublicUrl(value);
  const signal = AbortSignal.timeout(3e4);
  const response = await fetchPublicDestination(url, "GET", signal);
  if (!response.ok) {
    throw new import_sdk8.StorageError(
      `Public deliverable read failed: HTTP ${response.status} from ${url.origin}`
    );
  }
  const body = await responseTextWithinLimit(response);
  const pathDigest = url.pathname.match(SHA256_PATH)?.[1]?.toLowerCase();
  const digest = expectedDigest?.toLowerCase() ?? pathDigest;
  if (!digest) {
    console.warn(
      "[storage] Legacy HTTPS deliverable has no content hash; reading for compatibility without integrity verification. New deliverables should use /sha256/<digest>.json URLs."
    );
  }
  if (digest && sha256Hex(body) !== digest) {
    throw new DeliverableContentError(
      "Deliverable SHA-256 does not match its content-addressed URL."
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new DeliverableContentError("Public deliverable is not valid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new DeliverableContentError(
      "Public deliverable JSON must be an object."
    );
  }
  return { data: parsed, body };
}
var HttpDeliverableStorageProvider = class extends import_storage.StorageProvider {
  usesFileUrl = false;
  async upload() {
    throw new import_sdk8.StorageError("HTTPS deliverable resolver is read-only.");
  }
  async download(url) {
    return (await fetchPublicJson(url)).data;
  }
  async exists(url) {
    try {
      const stable = assertStablePublicUrl(url);
      const signal = AbortSignal.timeout(3e4);
      const response = await fetchPublicDestination(stable, "HEAD", signal);
      return response.ok;
    } catch {
      return false;
    }
  }
};
var PlatformDeliverableStorageProvider = class extends import_storage.StorageProvider {
  usesFileUrl = false;
  options;
  constructor(options) {
    super();
    const api = assertStablePublicUrl(options.apiUrl);
    if (api.search || api.hash) {
      throw new import_sdk8.StorageError(
        "BNBAGENT_DELIVERABLE_API_URL must not contain a query or fragment."
      );
    }
    const token = options.token.trim();
    if (!token) {
      throw new import_sdk8.StorageError("BNBAGENT_DELIVERABLE_TOKEN must not be empty.");
    }
    this.options = Object.freeze({
      apiUrl: api.toString().replace(/\/+$/, ""),
      token
    });
  }
  async upload(data) {
    const body = serialiseDeliverable(data);
    assertUploadWithinLimit(body);
    const digest = sha256Hex(body);
    const response = await fetch(this.options.apiUrl, {
      method: "POST",
      signal: AbortSignal.timeout(3e4),
      redirect: "error",
      body,
      headers: {
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new import_sdk8.StorageError(
        `Platform deliverable upload failed: HTTP ${response.status}.`
      );
    }
    const result = await response.json().catch(() => null);
    if (result?.content_hash !== digest || typeof result.url !== "string") {
      throw new import_sdk8.StorageError(
        "Platform deliverable response did not match the uploaded content hash."
      );
    }
    const url = assertStablePublicUrl(result.url).toString();
    if (new URL(url).pathname.match(SHA256_PATH)?.[1]?.toLowerCase() !== digest) {
      throw new import_sdk8.StorageError(
        "Platform deliverable must return a content-addressed URL matching the uploaded SHA-256 digest."
      );
    }
    await fetchPublicJson(url, digest);
    return url;
  }
  async download(url) {
    return (await fetchPublicJson(url)).data;
  }
  async exists(url) {
    return new HttpDeliverableStorageProvider().exists(url);
  }
};
var S3DeliverableStorageProvider = class extends import_storage.StorageProvider {
  usesFileUrl = false;
  options;
  sender;
  credentials;
  constructor(options, sender) {
    super();
    const bucket = cleanSegment(options.bucket, "storage.bucket");
    const region = cleanSegment(options.region, "storage.region");
    const credentialMode = options.credentialMode ?? "env";
    this.options = Object.freeze({
      ...options,
      bucket,
      region,
      credentialMode
    });
    if (options.endpoint && !options.publicBaseUrl) {
      throw new import_sdk8.StorageError(
        "S3-compatible storage.endpoint requires storage.public_base_url for durable public reads."
      );
    }
    if (options.endpoint) {
      const endpoint = assertStablePublicUrl(options.endpoint);
      if (endpoint.hash)
        throw new import_sdk8.StorageError("storage.endpoint must not contain a fragment.");
    }
    if (sender) {
      this.sender = sender;
      return;
    }
    if (credentialMode === "env") {
      const accessKeyId = process.env.DELIVERABLE_S3_ACCESS_KEY_ID?.trim();
      const secretAccessKey = process.env.DELIVERABLE_S3_SECRET_ACCESS_KEY?.trim();
      if (!accessKeyId || !secretAccessKey) {
        throw new import_sdk8.StorageError(
          "S3 deliverable storage requires DELIVERABLE_S3_ACCESS_KEY_ID and DELIVERABLE_S3_SECRET_ACCESS_KEY (or storage.credential_mode='ambient')."
        );
      }
      this.credentials = {
        accessKeyId,
        secretAccessKey,
        ...process.env.DELIVERABLE_S3_SESSION_TOKEN ? { sessionToken: process.env.DELIVERABLE_S3_SESSION_TOKEN } : {}
      };
    }
  }
  urlFor(key) {
    if (this.options.publicBaseUrl) {
      return publicUrl(this.options.publicBaseUrl, key);
    }
    return publicUrl(
      `https://${this.options.bucket}.s3.${this.options.region}.amazonaws.com`,
      key
    );
  }
  async upload(data) {
    const body = serialiseDeliverable(data);
    assertUploadWithinLimit(body);
    const digest = sha256Hex(body);
    const key = objectKey(this.options.keyPrefix, digest);
    const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
    let sender = this.sender;
    if (!sender) {
      sender = new S3Client({
        region: this.options.region,
        ...this.credentials ? { credentials: this.credentials } : {},
        ...this.options.endpoint ? { endpoint: this.options.endpoint, forcePathStyle: true } : {}
      });
      this.sender = sender;
    }
    try {
      await sender.send(
        new PutObjectCommand({
          Bucket: this.options.bucket,
          Key: key,
          Body: body,
          ContentType: "application/json",
          Metadata: { sha256: digest },
          IfNoneMatch: "*"
        })
      );
    } catch (error) {
      if (!alreadyExists(error)) {
        throw new import_sdk8.StorageError(
          `S3 deliverable upload failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    const url = this.urlFor(key);
    await fetchPublicJson(url, digest);
    return url;
  }
  async download(url) {
    return (await fetchPublicJson(url)).data;
  }
  async exists(url) {
    return new HttpDeliverableStorageProvider().exists(url);
  }
};
var AzureBlobDeliverableStorageProvider = class extends import_storage.StorageProvider {
  usesFileUrl = false;
  options;
  containerClient;
  credential;
  constructor(options, containerClient) {
    super();
    const account = assertStablePublicUrl(options.accountUrl);
    if (account.search || account.hash) {
      throw new import_sdk8.StorageError(
        "storage.account_url must not contain a query or fragment."
      );
    }
    const accountUrl = account.toString().replace(/\/+$/, "");
    const container = cleanSegment(options.container, "storage.container");
    const credentialMode = options.credentialMode ?? "env";
    this.options = Object.freeze({
      ...options,
      accountUrl,
      container,
      credentialMode
    });
    if (containerClient) {
      this.containerClient = containerClient;
      return;
    }
    if (credentialMode === "ambient") {
      this.credential = { kind: "ambient" };
    } else {
      const sas = process.env.DELIVERABLE_AZURE_SAS_TOKEN?.trim().replace(
        /^\?/,
        ""
      );
      if (sas) {
        this.credential = { kind: "sas", sas };
      } else {
        const tenantId = process.env.DELIVERABLE_AZURE_TENANT_ID?.trim();
        const clientId = process.env.DELIVERABLE_AZURE_CLIENT_ID?.trim();
        const clientSecret = process.env.DELIVERABLE_AZURE_CLIENT_SECRET?.trim();
        if (!tenantId || !clientId || !clientSecret) {
          throw new import_sdk8.StorageError(
            "Azure Blob deliverable storage requires DELIVERABLE_AZURE_SAS_TOKEN, a complete DELIVERABLE_AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET set, or storage.credential_mode='ambient'."
          );
        }
        this.credential = {
          kind: "client-secret",
          tenantId,
          clientId,
          clientSecret
        };
      }
    }
  }
  async getContainerClient() {
    if (this.containerClient) return this.containerClient;
    const { BlobServiceClient } = await import("@azure/storage-blob");
    let service;
    if (this.credential?.kind === "ambient") {
      const { DefaultAzureCredential } = await import("@azure/identity");
      service = new BlobServiceClient(
        this.options.accountUrl,
        new DefaultAzureCredential()
      );
    } else if (this.credential?.kind === "sas") {
      service = new BlobServiceClient(
        `${this.options.accountUrl}?${this.credential.sas}`
      );
    } else if (this.credential?.kind === "client-secret") {
      const { ClientSecretCredential } = await import("@azure/identity");
      service = new BlobServiceClient(
        this.options.accountUrl,
        new ClientSecretCredential(
          this.credential.tenantId,
          this.credential.clientId,
          this.credential.clientSecret
        )
      );
    } else {
      throw new import_sdk8.StorageError("Azure Blob credential configuration is missing.");
    }
    this.containerClient = service.getContainerClient(this.options.container);
    return this.containerClient;
  }
  urlFor(key) {
    const base = this.options.publicBaseUrl ?? `${this.options.accountUrl}/${encodeURIComponent(this.options.container)}`;
    return publicUrl(base, key);
  }
  async upload(data) {
    const body = serialiseDeliverable(data);
    assertUploadWithinLimit(body);
    const digest = sha256Hex(body);
    const key = objectKey(this.options.keyPrefix, digest);
    const containerClient = await this.getContainerClient();
    try {
      await containerClient.getBlockBlobClient(key).uploadData(new TextEncoder().encode(body), {
        conditions: { ifNoneMatch: "*" },
        blobHTTPHeaders: { blobContentType: "application/json" },
        metadata: { sha256: digest }
      });
    } catch (error) {
      if (!alreadyExists(error)) {
        throw new import_sdk8.StorageError(
          `Azure Blob deliverable upload failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    const url = this.urlFor(key);
    await fetchPublicJson(url, digest);
    return url;
  }
  async download(url) {
    return (await fetchPublicJson(url)).data;
  }
  async exists(url) {
    return new HttpDeliverableStorageProvider().exists(url);
  }
};

// src/storage.ts
var DEFAULT_IPFS_GATEWAY = "https://ipfs.io/ipfs/";
var DEFAULT_MAX_IPFS_UPLOAD_BYTES = 8 * 1024 * 1024;
function assertDeliverableRecord(value, source) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new DeliverableContentError(
      `${source} returned JSON that is not an object.`
    );
  }
  return value;
}
var StudioLocalStorageProvider = class _StudioLocalStorageProvider extends import_storage2.LocalStorageProvider {
  static fromEnv() {
    return new _StudioLocalStorageProvider(
      process.env.STORAGE_LOCAL_PATH || ".agent-data"
    );
  }
  async download(url) {
    try {
      return assertDeliverableRecord(
        await super.download(url),
        "Local storage"
      );
    } catch (cause) {
      if (cause instanceof import_sdk9.StorageError && cause.message.startsWith("Invalid JSON in file")) {
        throw new DeliverableContentError(cause.message);
      }
      throw cause;
    }
  }
};
function maxIpfsUploadBytesFromEnv() {
  const value = Number(process.env.STORAGE_MAX_UPLOAD_BYTES);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_MAX_IPFS_UPLOAD_BYTES;
}
var GenericIPFSStorageProvider = class _GenericIPFSStorageProvider extends import_storage2.IPFSStorageProvider {
  // The SDK provider keeps its endpoint/key/gateway TS-private, so keep our
  // own copies for the overridden upload() (and for diagnostics/tests).
  pinningApiUrl;
  pinningApiKey;
  gatewayUrl;
  studioMaxUploadBytes;
  constructor(pinningApiUrl, pinningApiKey, gatewayUrl = DEFAULT_IPFS_GATEWAY, maxUploadBytes = maxIpfsUploadBytesFromEnv()) {
    super(pinningApiUrl, pinningApiKey, gatewayUrl, maxUploadBytes);
    if (!Number.isInteger(maxUploadBytes) || maxUploadBytes <= 0) {
      throw new Error("maxUploadBytes must be a positive integer");
    }
    this.pinningApiUrl = pinningApiUrl;
    this.pinningApiKey = pinningApiKey;
    this.gatewayUrl = gatewayUrl;
    this.studioMaxUploadBytes = maxUploadBytes;
  }
  static fromEnv() {
    const apiUrl = process.env.STORAGE_API_URL;
    if (!apiUrl) {
      throw new Error(
        "STORAGE_API_URL required for [storage].kind=ipfs \u2014 set it to your pinning service's upload endpoint (or a self-hosted node's /api/v0/add)."
      );
    }
    return new _GenericIPFSStorageProvider(
      apiUrl,
      // Optional: hosted pinning services need a write key/JWT; a
      // self-hosted node typically doesn't.
      process.env.STORAGE_API_KEY ?? "",
      process.env.STORAGE_GATEWAY_URL || DEFAULT_IPFS_GATEWAY
    );
  }
  async download(url) {
    try {
      return assertDeliverableRecord(await super.download(url), "IPFS gateway");
    } catch (cause) {
      if (cause instanceof SyntaxError) {
        throw new DeliverableContentError(
          "IPFS gateway returned invalid JSON."
        );
      }
      throw cause;
    }
  }
  async upload(data, filename) {
    if (!this.pinningApiUrl) {
      throw new import_sdk9.StorageError(
        "This IPFS provider is read-only (no STORAGE_API_URL) \u2014 upload() is only available on the Agent's write path."
      );
    }
    let pinName;
    if (filename) {
      pinName = filename.replaceAll(".json", "");
    } else {
      const job = data.job;
      const jobId = typeof job === "object" && job !== null ? job.id : void 0;
      pinName = jobId ? `erc8183-job-${jobId}` : "deliverable";
    }
    const headers = {};
    if (this.pinningApiKey) {
      headers.Authorization = `Bearer ${this.pinningApiKey}`;
    }
    const path = this.pinningApiUrl.toLowerCase();
    const dataBody = JSON.stringify(data);
    let resp;
    if (path.includes("/api/v0/add")) {
      this.assertUploadSize(dataBody);
      const form = new FormData();
      form.append(
        "file",
        new Blob([dataBody], { type: "application/json" }),
        `${pinName}.json`
      );
      resp = await fetch(this.pinningApiUrl, {
        method: "POST",
        body: form,
        headers
      });
    } else if (path.includes("/pinning/pin")) {
      const body = JSON.stringify({
        pinataContent: data,
        pinataMetadata: { name: pinName }
      });
      this.assertUploadSize(body);
      resp = await fetch(this.pinningApiUrl, {
        method: "POST",
        body,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } else {
      this.assertUploadSize(dataBody);
      resp = await fetch(this.pinningApiUrl, {
        method: "POST",
        body: dataBody,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    if (!resp.ok) {
      throw new import_sdk9.StorageError(
        `IPFS upload failed: HTTP ${resp.status} from ${this.pinningApiUrl}`
      );
    }
    const result = await resp.json();
    const cid = extractCidFromResponse(result);
    if (!cid) {
      throw new import_sdk9.StorageError(
        `Unexpected pinning response: ${JSON.stringify(result)}`
      );
    }
    return `ipfs://${cid}`;
  }
  assertUploadSize(body) {
    const bytes = Buffer.byteLength(body);
    if (bytes > this.studioMaxUploadBytes) {
      throw new import_sdk9.StorageError(
        `IPFS upload payload is ${bytes} bytes; limit is ${this.studioMaxUploadBytes} bytes`
      );
    }
  }
};
function extractCidFromResponse(result) {
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    return null;
  }
  const r = result;
  for (const key of ["IpfsHash", "Hash", "cid"]) {
    const val = r[key];
    if (typeof val === "string" && val) return val;
  }
  const value = r.value;
  if (typeof value === "object" && value !== null) {
    const cid = value.cid;
    if (typeof cid === "string" && cid) return cid;
  }
  return null;
}
function resolveStorageMode(cfg) {
  const storageCfg = cfg.storage ?? {};
  const mode = process.env.BNBAGENT_DELIVERABLE_STORAGE_MODE?.trim().toLowerCase();
  const platformApiUrl = process.env.BNBAGENT_DELIVERABLE_API_URL?.trim();
  const platformToken = process.env.BNBAGENT_DELIVERABLE_TOKEN?.trim();
  if (mode && mode !== "platform" && mode !== "byos") {
    throw new import_sdk9.StorageError(
      "BNBAGENT_DELIVERABLE_STORAGE_MODE must be 'platform' or 'byos'."
    );
  }
  if (mode === "byos" || !mode && !platformApiUrl && !platformToken)
    return "byos";
  if (!mode && String(storageCfg.kind ?? "").trim()) {
    throw new import_sdk9.StorageError(
      "Platform deliverable credentials conflict with [storage].kind. Set BNBAGENT_DELIVERABLE_STORAGE_MODE=platform or byos to select the intended writer."
    );
  }
  if (!platformApiUrl || !platformToken) {
    throw new import_sdk9.StorageError(
      "Platform deliverable storage requires both BNBAGENT_DELIVERABLE_API_URL and BNBAGENT_DELIVERABLE_TOKEN."
    );
  }
  if (!mode) {
    console.warn(
      "[storage] Legacy platform-only configuration: set BNBAGENT_DELIVERABLE_STORAGE_MODE=platform on the next deployment."
    );
  }
  return "platform";
}
function storageProviderFromConfig(cfg, readOnly = false) {
  let resolved = cfg;
  if (resolved == null) {
    try {
      resolved = loadStudioToml();
    } catch (e) {
      const code = e.code;
      const notFound = code === "ENOENT" || e instanceof Error && e.message.startsWith("No studio.toml");
      if (!notFound) throw e;
      resolved = {};
    }
  }
  const storageCfg = resolved.storage ?? {};
  const kind = String(storageCfg.kind ?? "local").toLowerCase();
  if (!readOnly && resolveStorageMode(resolved) === "platform") {
    return new PlatformDeliverableStorageProvider({
      apiUrl: process.env.BNBAGENT_DELIVERABLE_API_URL ?? "",
      token: process.env.BNBAGENT_DELIVERABLE_TOKEN ?? ""
    });
  }
  if (kind === "ipfs") {
    if (readOnly) {
      return new GenericIPFSStorageProvider(
        "",
        "",
        process.env.STORAGE_GATEWAY_URL || DEFAULT_IPFS_GATEWAY
      );
    }
    return GenericIPFSStorageProvider.fromEnv();
  }
  if (kind === "s3") {
    if (readOnly) return new HttpDeliverableStorageProvider();
    const credentialMode = storageCredentialMode(storageCfg);
    return new S3DeliverableStorageProvider({
      bucket: requiredStorageString(storageCfg, "bucket", kind),
      region: requiredStorageString(storageCfg, "region", kind),
      keyPrefix: optionalStorageString(storageCfg, "key_prefix"),
      publicBaseUrl: optionalStorageString(storageCfg, "public_base_url"),
      endpoint: optionalStorageString(storageCfg, "endpoint"),
      credentialMode
    });
  }
  if (kind === "azure-blob") {
    if (readOnly) return new HttpDeliverableStorageProvider();
    const credentialMode = storageCredentialMode(storageCfg);
    return new AzureBlobDeliverableStorageProvider({
      accountUrl: requiredStorageString(storageCfg, "account_url", kind),
      container: requiredStorageString(storageCfg, "container", kind),
      keyPrefix: optionalStorageString(storageCfg, "key_prefix"),
      publicBaseUrl: optionalStorageString(storageCfg, "public_base_url"),
      credentialMode
    });
  }
  return StudioLocalStorageProvider.fromEnv();
}
function optionalStorageString(storageCfg, key) {
  const value = storageCfg[key];
  if (typeof value !== "string") return void 0;
  const clean = value.trim();
  return clean || void 0;
}
function requiredStorageString(storageCfg, key, kind) {
  const value = optionalStorageString(storageCfg, key);
  if (!value) {
    throw new import_sdk9.StorageError(`[storage].${key} is required for kind='${kind}'.`);
  }
  return value;
}
function storageCredentialMode(storageCfg) {
  const mode = String(storageCfg.credential_mode ?? "env").toLowerCase();
  if (mode !== "env" && mode !== "ambient") {
    throw new import_sdk9.StorageError(
      `[storage].credential_mode must be 'env' or 'ambient' (received '${mode}').`
    );
  }
  return mode;
}
function storageProviderForUrl(url) {
  if (url.startsWith("ipfs://")) {
    return new GenericIPFSStorageProvider(
      "",
      "",
      process.env.STORAGE_GATEWAY_URL || DEFAULT_IPFS_GATEWAY
    );
  }
  if (url.startsWith("file://")) return StudioLocalStorageProvider.fromEnv();
  if (url.startsWith("https://")) return new HttpDeliverableStorageProvider();
  throw new import_sdk9.StorageError(
    `Unsupported deliverable URL scheme; expected file://, ipfs://, or https:// (${url}).`
  );
}

// src/erc8183/workflows.ts
var U_DECIMALS = 18;
function asRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function _txHash(result) {
  const rec = asRecord2(result);
  if (rec !== null) {
    if (rec.success === false) {
      const err = rec.error;
      const message = typeof err === "string" ? err : JSON.stringify(err !== void 0 && err !== null ? err : rec);
      const code = rec.error_code;
      const tx2 = rec.tx_hash || rec.txHash || rec.transactionHash;
      throw new SdkCallFailedError(`SDK call failed: ${message}`, {
        cause: err,
        // 0.4.0: error_code is a transport-neutral semantic string
        // (e.g. "chain_unavailable", "budget_too_low"), not an int.
        code: typeof code === "string" ? code : null,
        txHash: tx2 !== void 0 && tx2 !== null ? String(tx2) : null,
        retryable: typeof rec.retryable === "boolean" ? rec.retryable : null
      });
    }
    const tx = rec.transactionHash || rec.txHash || rec.tx_hash;
    if (tx !== void 0 && tx !== null) {
      return String(tx);
    }
  }
  return String(result);
}
function decimalGt(a, b) {
  return toRaw(a, U_DECIMALS) > toRaw(b, U_DECIMALS);
}
function resolveBuyerAsset(networkName, reference) {
  const network = getNetwork(networkName);
  return network.resolvePaymentSymbol(reference?.trim() || "U");
}
function policyAllowsAsset(policy, asset) {
  return policy.allowedPaymentTokens.includes(asset.symbol) || policy.allowedPaymentTokens.includes(asset.assetId);
}
function paymentAlternative(asset) {
  return Object.freeze({
    assetId: asset.assetId,
    symbol: asset.symbol,
    tokenAddress: asset.address,
    decimals: asset.decimals,
    retryHint: `--asset ${asset.symbol}`
  });
}
async function activeAlternatives(client, networkName, selected, policy, budgetUsd) {
  const candidates = getNetwork(networkName).assets().filter(
    (asset) => asset.assetId !== selected.assetId && policyAllowsAsset(policy, asset)
  );
  const alternatives = await Promise.all(
    candidates.map(async (asset) => {
      try {
        if (!await client.isPaymentTokenSupported(asset.assetId)) return null;
        if (budgetUsd !== void 0) {
          const required = usdPriceToAtomic(
            networkName,
            asset.assetId,
            budgetUsd
          );
          if (await client.tokenBalanceFor(asset.assetId) < required)
            return null;
        }
        return paymentAlternative(asset);
      } catch {
        return null;
      }
    })
  );
  return Object.freeze(
    alternatives.filter(
      (asset) => asset !== null
    )
  );
}
async function sellerSupportedAlternatives(client, networkName, selected, policy, supportedAssets) {
  const network = getNetwork(networkName);
  const candidates = /* @__PURE__ */ new Map();
  for (const assetId of supportedAssets) {
    try {
      const asset = network.asset(assetId);
      if (asset.assetId !== selected.assetId && policyAllowsAsset(policy, asset)) {
        candidates.set(asset.assetId, asset);
      }
    } catch {
    }
  }
  const alternatives = await Promise.all(
    [...candidates.values()].map(async (asset) => {
      try {
        return await client.isPaymentTokenSupported(asset.assetId) ? paymentAlternative(asset) : null;
      } catch {
        return null;
      }
    })
  );
  return Object.freeze(
    alternatives.filter(
      (asset) => asset !== null
    )
  );
}
async function verifyBuyerNegotiationEnvelope(client, envelope, provider, asset) {
  try {
    const verdict = await client.verifyNegotiationQuote(envelope, {
      expectedProvider: provider,
      expectedCurrency: asset.assetId
    });
    if (!verdict.valid) {
      throw new NegotiationError(
        `signed quote does not verify to provider ${provider} (${verdict.reason}); refusing to fund`
      );
    }
  } catch (cause) {
    if (cause instanceof NegotiationError) throw cause;
    throw new NegotiationError(
      `signed quote verification failed for provider ${provider}; refusing to fund`,
      { cause }
    );
  }
}
function testnetFundingHint(networkName, symbol) {
  if (networkName !== "bsc-testnet") return null;
  return `${symbol} testnet funding options: ${BSC_TESTNET_FAUCET_DOCS_URL}`;
}
async function buyWorkflow(provider, task = "", opts = {}) {
  const {
    agentId = null,
    budgetU = null,
    budgetUsd = null,
    asset: assetReference = null,
    deadlineMinutes = 30,
    network = null,
    negotiate = true,
    protocol = "ERC8183"
  } = opts;
  const networkName = resolveNetworkName(network);
  const selectedAsset = resolveBuyerAsset(networkName, assetReference);
  let negotiationEnvelope = opts.negotiationEnvelope ?? null;
  if (provider === null === (agentId === null)) {
    throw new Error(
      "buy_workflow requires exactly one of `provider` or `agent_id`"
    );
  }
  if (budgetU !== null && budgetUsd !== null) {
    throw new Error(
      "budgetUsd and compatibility budgetU are mutually exclusive"
    );
  }
  if (budgetUsd !== null && typeof budgetUsd !== "string") {
    throw new TypeError("budgetUsd must be a canonical decimal string");
  }
  const taskBytes = Buffer.byteLength(task, "utf-8");
  if (taskBytes > 4096) {
    throw new Error(
      `task description is ${taskBytes} bytes; the on-chain ERC-8183 job description cap is 4096 bytes (SDK MAX_DESCRIPTION_BYTES). Shorten the task description.`
    );
  }
  let resolvedProvider = provider;
  let sellerEndpoint = null;
  if (agentId !== null) {
    const resolved = await resolveService(agentId, {
      wallet: resolveWallet(),
      network: networkName,
      protocol
    });
    resolvedProvider = resolved.providerAddress;
    sellerEndpoint = resolved.endpoint;
  }
  const policy = getPolicy();
  if (!policyAllowsAsset(policy, selectedAsset)) {
    const current = [...policy.allowedPaymentTokens];
    const suggested = [.../* @__PURE__ */ new Set([...current, selectedAsset.symbol])];
    throw new TokenNotAllowedError(
      `payment asset '${selectedAsset.symbol}' (${selectedAsset.assetId}) not in payments.allowed_payment_tokens=${JSON.stringify(current)}. Add it in studio.toml [payments] or run: bag config set payments.allowed_payment_tokens '${JSON.stringify(suggested)}' --type list`
    );
  }
  const client = await get8183Client(networkName);
  if (!await client.isPaymentTokenSupported(selectedAsset.assetId)) {
    throw new PaymentAssetUnavailableError2({
      network: networkName,
      assetId: selectedAsset.assetId,
      symbol: selectedAsset.symbol,
      tokenAddress: selectedAsset.address,
      decimals: selectedAsset.decimals,
      alternatives: await activeAlternatives(
        client,
        networkName,
        selectedAsset,
        policy
      ),
      fundingHint: testnetFundingHint(networkName, selectedAsset.symbol)
    });
  }
  let negotiatedPriceAtomic = null;
  if (negotiate && sellerEndpoint !== null) {
    let terms;
    try {
      terms = await negotiateWithSeller(
        sellerEndpoint,
        task,
        { currency: selectedAsset.address }
      );
    } catch (cause) {
      if (cause instanceof NegotiationRejectedError && cause.supportedAssets.length > 0) {
        throw new PaymentAssetUnavailableError2({
          network: networkName,
          assetId: selectedAsset.assetId,
          symbol: selectedAsset.symbol,
          tokenAddress: selectedAsset.address,
          decimals: selectedAsset.decimals,
          alternatives: await sellerSupportedAlternatives(
            client,
            networkName,
            selectedAsset,
            policy,
            cause.supportedAssets
          ),
          fundingHint: testnetFundingHint(networkName, selectedAsset.symbol)
        });
      }
      throw cause;
    }
    negotiationEnvelope = terms.responseEnvelope;
    await verifyBuyerNegotiationEnvelope(
      client,
      negotiationEnvelope,
      String(resolvedProvider),
      selectedAsset
    );
    negotiatedPriceAtomic = terms.priceRaw;
  } else if (negotiationEnvelope !== null) {
    const resp = negotiationEnvelope.response ?? {};
    const terms = resp.terms ?? {};
    const quotedPrice = terms.price;
    if (typeof quotedPrice !== "string" || !/^(?:0|[1-9]\d*)$/u.test(quotedPrice)) {
      throw new NegotiationError(
        "signed quote price must be a canonical non-negative integer string"
      );
    }
    const quotedAtomic = BigInt(quotedPrice);
    if (quotedAtomic > (1n << 256n) - 1n) {
      throw new NegotiationError("signed quote price exceeds uint256");
    }
    await verifyBuyerNegotiationEnvelope(
      client,
      negotiationEnvelope,
      String(resolvedProvider),
      selectedAsset
    );
    negotiatedPriceAtomic = quotedAtomic;
  }
  const negotiatedPriceUsd = negotiatedPriceAtomic === null ? null : fromRaw(negotiatedPriceAtomic, selectedAsset.decimals);
  let budgetDec;
  if (budgetUsd !== null) {
    budgetDec = String(budgetUsd);
  } else if (budgetU !== null) {
    budgetDec = String(budgetU);
  } else {
    budgetDec = negotiatedPriceUsd ?? policy.defaultBudgetU;
  }
  if (decimalGt(budgetDec, policy.budgetCapU)) {
    throw new BudgetCapExceededError(
      `budget ${budgetDec} USD exceeds policy.budget_cap_u=${policy.budgetCapU} USD`
    );
  }
  const rawBudget = usdPriceToAtomic(
    networkName,
    selectedAsset.assetId,
    budgetDec
  );
  if (rawBudget > (1n << 256n) - 1n) {
    throw new Error("budget exceeds uint256");
  }
  if (client.router !== void 0) {
    const stack = erc8183Network(networkName);
    const whitelisted = await client.router.policyWhitelist(
      stack.policyContract
    );
    if (!whitelisted) {
      throw new PolicyNotWhitelistedError(
        `configured ERC-8183 policy ${stack.policyContract} is not whitelisted by router ${stack.routerContract}; refusing to create a job because registerJob would revert and leave an orphan OPEN job. Update @bnbagent/sdk, or set ERC8183_COMMERCE_ADDRESS, ERC8183_ROUTER_ADDRESS, and ERC8183_POLICY_ADDRESS together to one compatible stack, then retry.`
      );
    }
  }
  const selectedBalance = await client.tokenBalanceFor(selectedAsset.assetId);
  if (selectedBalance < rawBudget) {
    throw new InsufficientPaymentAssetBalanceError({
      network: networkName,
      assetId: selectedAsset.assetId,
      symbol: selectedAsset.symbol,
      tokenAddress: selectedAsset.address,
      decimals: selectedAsset.decimals,
      requiredAtomic: rawBudget,
      currentAtomic: selectedBalance,
      requiredHuman: formatUsdAtomic(
        networkName,
        selectedAsset.assetId,
        rawBudget
      ),
      currentHuman: fromRaw(selectedBalance, selectedAsset.decimals),
      alternatives: await activeAlternatives(
        client,
        networkName,
        selectedAsset,
        policy,
        budgetDec
      ),
      fundingHint: testnetFundingHint(networkName, selectedAsset.symbol)
    });
  }
  const disputeWindowSec = Number(await client.policy.disputeWindow());
  const expiredAt = Math.floor(Date.now() / 1e3) + disputeWindowSec + deadlineMinutes * 60;
  let description = task;
  if (negotiationEnvelope !== null) {
    description = (0, import_erc81833.buildJobDescription)(negotiationEnvelope);
    const jd = import_erc81833.JobDescription.fromStr(description);
    if (jd !== null && BigInt(jd.price) !== rawBudget) {
      throw new NegotiationError(
        `signed quote price ${jd.price} != budget ${rawBudget} being funded; refusing to fund a mismatched amount`
      );
    }
  }
  let step = "create";
  try {
    const createRes = asRecord2(
      await client.createJobWithToken({
        asset: selectedAsset.assetId,
        provider: resolvedProvider,
        expiredAt: BigInt(expiredAt),
        description
      })
    );
    if (createRes?.success === false) _txHash(createRes);
    if (createRes === null || createRes.jobId === void 0 || createRes.jobId === null) {
      throw new Error(
        `SDK create_job did not return jobId: ${JSON.stringify(createRes)}`
      );
    }
    const jobId = Number(createRes.jobId);
    const createTx = _txHash(createRes);
    step = "register";
    const registerTx = _txHash(await client.registerJob(BigInt(jobId)));
    step = "set_budget";
    const setBudgetTx = _txHash(
      await client.setBudget(BigInt(jobId), rawBudget)
    );
    const auditChainId = getNetwork(networkName).chainId;
    step = "fund";
    const fundTx = await auditedOp(
      "8183_fund",
      {
        chainId: auditChainId,
        asset: selectedAsset.assetId,
        amount: budgetDec,
        agentAddr: resolveWallet().address,
        counterparty: resolvedProvider,
        context: {
          job_id: jobId,
          approve_floor: budgetDec,
          asset_id: selectedAsset.assetId,
          asset_symbol: selectedAsset.symbol,
          token_address: selectedAsset.address,
          decimals: selectedAsset.decimals,
          amount_atomic: rawBudget.toString()
        }
      },
      async (auditH) => {
        const tx = _txHash(
          await client.fund(BigInt(jobId), rawBudget, {
            approveFloor: rawBudget,
            expectedToken: selectedAsset.assetId
          })
        );
        auditH.txHash = tx;
        await attachGasContext(auditH, networkName, "8183_fund");
        return tx;
      }
    );
    return Object.freeze({
      jobId,
      createTx,
      registerTx,
      setBudgetTx,
      fundTx,
      budgetU: selectedAsset.symbol === "U" ? budgetDec : null,
      budgetUsd: budgetDec,
      budgetAtomic: rawBudget.toString(),
      assetId: selectedAsset.assetId,
      symbol: selectedAsset.symbol,
      tokenAddress: selectedAsset.address,
      decimals: selectedAsset.decimals,
      provider: String(resolvedProvider),
      expiresAt: expiredAt,
      agentId,
      sellerEndpoint,
      negotiatedPriceU: selectedAsset.symbol === "U" ? negotiatedPriceUsd : null,
      negotiatedPriceUsd,
      negotiationHash: negotiationEnvelope?.negotiation_hash ?? null,
      providerSig: negotiationEnvelope?.provider_sig ?? null
    });
  } catch (error) {
    const decoded = decodeRevert(error);
    if (decoded)
      throw new ERC8183Error(`buy(${step}) reverted: ${decoded}`, {
        cause: error
      });
    throw error;
  }
}
var defaultJobOpsFactory = (network) => import_erc81833.ERC8183JobOps.create({
  walletProvider: resolveWallet(),
  // Pass an explicit config so the SDK's archive/log scanner cannot fall
  // back to its own rate-limited data-seed preset.
  network: erc8183Network(network),
  storageProvider: storageProviderFromConfig(),
  agentUrl: process.env.ERC8183_AGENT_URL ?? null,
  // The signed quote is the immutable price agreement for an already
  // funded job. Opt every known network asset into the SDK's multi-token
  // verifier with a zero floor so later seller-config price/asset changes
  // cannot strand historical jobs. The SDK still fails closed on unknown
  // tokens and independently checks quote currency, signature and budget.
  servicePrices: Object.fromEntries(
    getNetwork(network).assets().map((asset) => [asset.assetId, 0n])
  )
});
var jobOpsFactory = defaultJobOpsFactory;
function _setJobOpsFactory(factory) {
  jobOpsFactory = factory ?? defaultJobOpsFactory;
}
function resolveNetworkName(network) {
  if (network != null) return network;
  try {
    const cfg = loadStudioToml();
    return String(
      (cfg.network ?? {}).default ?? "bsc-testnet"
    );
  } catch (e) {
    const code = e.code;
    const notFound = code === "ENOENT" || e instanceof Error && e.message.startsWith("No studio.toml");
    if (!notFound) throw e;
    return "bsc-testnet";
  }
}
function isUnsupportedWalletOperation(exc) {
  return exc instanceof import_wallets2.UnsupportedWalletOperation || exc instanceof Error && exc.name === "UnsupportedWalletOperation";
}
async function resolveJobPaymentFacts(client, networkName, jobId, existingJob) {
  const [job, tokenAddress] = await Promise.all([
    existingJob ?? client.getJob(BigInt(jobId)),
    client.jobPaymentToken(BigInt(jobId))
  ]);
  const asset = getNetwork(networkName).tokenByAddress(tokenAddress);
  const budgetAtomic = BigInt(job.budget ?? 0);
  return {
    job,
    facts: Object.freeze({
      assetId: asset.assetId,
      symbol: asset.symbol,
      tokenAddress: asset.address,
      decimals: asset.decimals,
      budgetAtomic,
      budget: fromRaw(budgetAtomic, asset.decimals)
    })
  };
}
function paymentAuditContext(jobId, action, facts) {
  return {
    job_id: jobId,
    action,
    asset_id: facts.assetId,
    asset_symbol: facts.symbol,
    token_address: facts.tokenAddress,
    decimals: facts.decimals,
    amount_atomic: facts.budgetAtomic.toString()
  };
}
async function submitWorkflow(jobId, response, opts = {}) {
  const network = resolveNetworkName(opts.network);
  const jobOps = await jobOpsFactory(network);
  const auditChainId = getNetwork(network).chainId;
  let result;
  const submitTx = await auditedOp(
    "8183_submit_work",
    {
      actor: "agent",
      chainId: auditChainId,
      asset: null,
      amount: null,
      agentAddr: resolveWallet().address,
      context: { job_id: jobId }
    },
    async (auditH) => {
      let tx;
      try {
        result = await jobOps.submitResult(
          jobId,
          response,
          opts.metadata ?? void 0
        );
        tx = _txHash(result);
      } catch (e) {
        if (isUnsupportedWalletOperation(e)) {
          throw new SubmitPermanentlyUnsupportedError(
            `submit is permanently unavailable for this wallet kind: ${e.message} The job is skipped; use a wallet kind that supports submit (e.g. 'evm-local') to act as a seller.`,
            { cause: e }
          );
        }
        const decoded = decodeRevert(e);
        if (decoded !== null) {
          throw new ERC8183Error(`submit(${jobId}) reverted: ${decoded}`, {
            cause: e
          });
        }
        throw e;
      }
      auditH.txHash = tx;
      await attachGasContext(auditH, network, "8183_submit_work");
      return tx;
    }
  );
  let deliverableUrl = null;
  const rec = asRecord2(result);
  if (rec !== null) {
    const url = rec.deliverable_url || rec.deliverableUrl || rec.url;
    deliverableUrl = url !== void 0 && url !== null ? String(url) : null;
  }
  if (!deliverableUrl) {
    throw new SdkCallFailedError(
      "SDK submit_result succeeded but returned no deliverable_url; the on-chain submit result must include a public deliverable URL."
    );
  }
  return Object.freeze({ jobId, submitTx, deliverableUrl });
}
async function fetchWorkflow(jobId, opts = {}) {
  const client = await get8183Client(opts.network ?? null);
  const status = await client.getJobStatus(BigInt(jobId));
  if (status !== import_sdk10.JobStatus.SUBMITTED && status !== import_sdk10.JobStatus.COMPLETED) {
    throw new JobStateError({
      jobId,
      expected: ["SUBMITTED", "COMPLETED"],
      actual: import_sdk10.JobStatus[status] ?? String(status)
    });
  }
  const url = await client.getDeliverableUrl(BigInt(jobId));
  if (url === null || url === void 0) {
    throw new DeliverableUnavailableError(
      `Job ${jobId} has no deliverable URL on-chain (yet?).`
    );
  }
  let response = "";
  const metadata = { deliverable_url: url };
  let downloaded = null;
  try {
    downloaded = asRecord2(await storageProviderForUrl(url).download(url));
  } catch (cause) {
    if (cause instanceof DeliverableContentError) {
      throw new DeliverableIntegrityError(
        `Job ${jobId} deliverable content failed integrity validation.`,
        { cause }
      );
    }
  }
  if (downloaded !== null) {
    let manifest;
    try {
      manifest = import_erc81833.DeliverableManifest.fromDict(downloaded);
    } catch (cause) {
      throw new DeliverableIntegrityError(
        `Job ${jobId} deliverable is not a valid manifest.`,
        { cause }
      );
    }
    const job = await client.getJob(BigInt(jobId));
    const onChainHash = job.deliverable;
    if (typeof onChainHash !== "string" || !manifest.verify(onChainHash)) {
      throw new DeliverableIntegrityError(
        `Job ${jobId} deliverable hash does not match the on-chain commitment.`
      );
    }
    const manifestCommerce = asRecord2(manifest.contracts)?.commerce;
    const chainId = client.network.chainId ?? getNetwork(resolveNetworkName(opts.network)).chainId;
    if (manifest.jobId !== jobId || manifest.chainId !== chainId || typeof manifestCommerce !== "string" || manifestCommerce.toLowerCase() !== client.network.commerceContract.toLowerCase()) {
      throw new DeliverableIntegrityError(
        `Job ${jobId} deliverable manifest is bound to a different job or contract domain.`
      );
    }
    const respBlock = asRecord2(downloaded.response);
    response = String(respBlock?.content ?? downloaded.content ?? "");
    const meta = asRecord2(downloaded.metadata);
    if (meta !== null) {
      Object.assign(metadata, meta);
    }
    metadata.deliverable_verified = true;
    metadata.deliverable_hash = manifest.manifestHash();
  }
  return Object.freeze({ jobId, response, metadata });
}
async function settleWorkflow(jobId, opts = {}) {
  const action = opts.action ?? "approve";
  const network = opts.network ?? null;
  if (!["approve", "reject", "dispute"].includes(action)) {
    throw new Error(
      `settle action '${action}' not in {approve, reject, dispute}`
    );
  }
  const networkName = resolveNetworkName(network);
  const auditChainId = getNetwork(networkName).chainId;
  const isDispute = action === "dispute";
  const auditOpName = isDispute ? "8183_dispute" : "8183_settle";
  const client = await get8183Client(networkName);
  const { job, facts } = await resolveJobPaymentFacts(
    client,
    networkName,
    jobId
  );
  return auditedOp(
    auditOpName,
    {
      chainId: auditChainId,
      asset: isDispute ? null : facts.assetId,
      amount: isDispute ? null : facts.budget,
      agentAddr: resolveWallet().address,
      counterparty: job.provider ?? null,
      context: paymentAuditContext(jobId, action, facts)
    },
    async (auditH) => {
      let result;
      try {
        if (action === "approve") {
          result = await client.settle(BigInt(jobId));
        } else if (action === "reject") {
          result = await client.voteReject(BigInt(jobId));
        } else {
          result = await client.dispute(BigInt(jobId));
        }
      } catch (exc) {
        const decoded = decodeRevert(exc);
        if (decoded === null) {
          throw exc;
        }
        throw new ERC8183Error(`settle(${action}) reverted: ${decoded}`, {
          cause: exc
        });
      }
      const txHash = _txHash(result);
      auditH.txHash = txHash;
      await attachGasContext(auditH, networkName, auditOpName);
      return txHash;
    }
  );
}
async function getJobSummary(jobId, opts = {}) {
  const networkName = resolveNetworkName(opts.network);
  const client = await get8183Client(networkName);
  const job = await client.getJob(BigInt(jobId));
  const status = import_sdk10.JobStatus[await client.getJobStatus(BigInt(jobId))];
  const { facts } = await resolveJobPaymentFacts(
    client,
    networkName,
    jobId,
    job
  );
  let deliverableUrl;
  try {
    deliverableUrl = await client.getDeliverableUrl(BigInt(jobId));
  } catch {
    deliverableUrl = null;
  }
  const submittedAt = Number(job.submittedAt ?? 0);
  let settlementMode = "unknown";
  let settleAvailableAt = null;
  let settleRemainingSeconds = null;
  if (submittedAt > 0) {
    try {
      if (await jobUsesConfiguredPolicy(client, BigInt(jobId))) {
        settlementMode = "optimistic";
        const disputeWindow = Number(await client.policy.disputeWindow());
        settleAvailableAt = submittedAt + disputeWindow;
        settleRemainingSeconds = Math.max(
          0,
          settleAvailableAt - Math.floor(Date.now() / 1e3)
        );
      }
    } catch {
    }
  }
  return {
    job_id: jobId,
    client: job.client ?? "",
    provider: job.provider ?? "",
    evaluator: job.evaluator ?? "",
    description: job.description ?? "",
    status,
    asset_id: facts.assetId,
    asset: facts.symbol,
    token_address: facts.tokenAddress,
    decimals: facts.decimals,
    budget_atomic: facts.budgetAtomic.toString(),
    budget: facts.budget,
    // Compatibility alias for legacy consumers. It is deliberately null for
    // USDC/USDT so their amount is never mislabeled as U.
    budget_u: facts.symbol === "U" ? facts.budget : null,
    expired_at: Number(job.expiredAt ?? 0),
    submitted_at: submittedAt,
    deliverable: job.deliverable ?? null,
    deliverable_url: deliverableUrl,
    settlement_mode: settlementMode,
    settle_available_at: settleAvailableAt,
    settle_remaining_seconds: settleRemainingSeconds
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BudgetCapExceededError,
  DeliverableIntegrityError,
  DeliverableUnavailableError,
  ERC8183Error,
  InsufficientPaymentAssetBalanceError,
  JobNotFoundError,
  JobStateError,
  NegotiationError,
  NegotiationRejectedError,
  PaymentAssetUnavailableError,
  PolicyNotWhitelistedError,
  SdkCallFailedError,
  SubmitPermanentlyUnsupportedError,
  TokenNotAllowedError,
  U_DECIMALS,
  _reset8183ClientCache,
  _setClientFactory,
  _setJobOpsFactory,
  _setWalletOverride,
  _txHash,
  buyWorkflow,
  decodeRevert,
  erc8183Network,
  fetchWorkflow,
  get8183Client,
  getJobSummary,
  makeVerdict,
  negotiateWithSeller,
  recoverQuoteSigner,
  resolveWallet,
  settleWorkflow,
  submitWorkflow,
  verifySignedJob
});
