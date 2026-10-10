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

// src/tools/index.ts
var tools_exports = {};
__export(tools_exports, {
  _PIEVERSE_TOKEN_CACHE: () => _PIEVERSE_TOKEN_CACHE,
  _parseInputTypes: () => _parseInputTypes,
  _set8183ClientProvider: () => _set8183ClientProvider,
  _setErc8004Factory: () => _setErc8004Factory,
  _setPieverseHooks: () => _setPieverseHooks,
  _setTransportFactory: () => _setTransportFactory,
  _setWalletGetter: () => _setWalletGetter,
  agentByAddress: () => agentByAddress,
  agentInfo: () => agentInfo,
  balanceNative: () => balanceNative,
  balanceU: () => balanceU,
  blockInfo: () => blockInfo,
  contractCallView: () => contractCallView,
  jobCount: () => jobCount,
  jobList: () => jobList,
  jobStatus: () => jobStatus,
  networkInfo: () => networkInfo,
  pieverseUsage: () => pieverseUsage,
  txStatus: () => txStatus,
  walletAddress: () => walletAddress,
  walletInfo: () => walletInfo,
  walletList: () => walletList
});
module.exports = __toCommonJS(tools_exports);
var import_node_fs6 = require("fs");
var import_node_path6 = require("path");
var import_sdk12 = require("@bnbagent/sdk");
var import_viem9 = require("viem");

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

// src/erc8183/client.ts
var import_sdk3 = require("@bnbagent/sdk");

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

// src/erc8183/client.ts
async function jobUsesConfiguredPolicy(client, jobId) {
  if (client.router?.jobPolicy === void 0 || client.policy.address === void 0) {
    throw new Error("ERC-8183 policy binding reads are unavailable");
  }
  const boundPolicy = await client.router.jobPolicy(jobId);
  return boundPolicy.toLowerCase() === client.policy.address.toLowerCase();
}
var walletOverride = null;
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

// src/erc8183/negotiate.ts
var import_promises = require("dns/promises");
var import_node_net = require("net");
var import_erc8183 = require("@bnbagent/sdk/erc8183");
var import_networks4 = require("@bnbagent/sdk/networks");
var MAX_NEGOTIATION_RESPONSE_BYTES = 1024 * 1024;
var UINT256_MAX = (1n << 256n) - 1n;

// src/erc8183/revert.ts
var import_viem2 = require("viem");

// src/erc8183/verify.ts
var import_sdk4 = require("@bnbagent/sdk");
var import_erc81832 = require("@bnbagent/sdk/erc8183");
var import_viem3 = require("viem");
var MAX_UINT256 = (1n << 256n) - 1n;

// src/erc8183/workflows.ts
var import_sdk10 = require("@bnbagent/sdk");
var import_erc81833 = require("@bnbagent/sdk/erc8183");
var import_wallets2 = require("@bnbagent/sdk/wallets");

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

// src/audit/writer.ts
var import_node_fs4 = require("fs");
var import_node_path3 = require("path");

// src/audit/gas.ts
var import_viem4 = require("viem");

// src/x402/policy.ts
var import_node_fs5 = require("fs");
var import_node_path4 = require("path");
var import_proper_lockfile = __toESM(require("proper-lockfile"), 1);

// src/erc8004/index.ts
var import_sdk5 = require("@bnbagent/sdk");

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

// src/storageErrors.ts
var import_sdk7 = require("@bnbagent/sdk");

// src/objectStorage.ts
var MAX_DELIVERABLE_BYTES = 10 * 1024 * 1024;

// src/storage.ts
var DEFAULT_MAX_IPFS_UPLOAD_BYTES = 8 * 1024 * 1024;

// src/erc8183/workflows.ts
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

// src/pieverse/client.ts
var import_node_async_hooks = require("async_hooks");
var PIEVERSE_BASE_URL = "https://llm.pieverse.io";
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
var retryPolicyStore = new import_node_async_hooks.AsyncLocalStorage();
function isRetryableStatus(statusCode) {
  return statusCode >= 500;
}
function sleepSeconds(seconds) {
  return new Promise((resolve4) => setTimeout(resolve4, seconds * 1e3));
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
async function request2(client, method, path, opts = {}) {
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

// src/x402/index.ts
var import_x4022 = require("@bnbagent/sdk/x402");

// src/x402/buyer.ts
var import_node_async_hooks2 = require("async_hooks");
var import_node_crypto2 = require("crypto");
var import_node_path5 = require("path");
var import_b402 = require("@bnb-chain/b402");
var import_sdk11 = require("@bnbagent/sdk");
var import_x402 = require("@bnbagent/sdk/x402");
var import_http = require("@x402/core/http");
var import_viem5 = require("viem");
var PERMIT2_ADDRESS = (0, import_viem5.getAddress)(import_b402.B402_PERMIT2_ADDRESS);
var dailyCapMarker = new import_node_async_hooks2.AsyncLocalStorage();
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

// src/b402/policy.ts
var import_viem6 = require("viem");

// src/x402/sellerMock.ts
var import_node_crypto3 = require("crypto");
var import_b4022 = require("@bnb-chain/b402");
var import_viem7 = require("viem");

// src/x402/sellerB402.ts
var import_node_crypto4 = require("crypto");
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
var import_viem8 = require("viem");

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
async function getAccountUsage(sessionToken, opts = {}) {
  const { days = 7, httpClient = null } = opts;
  const client = makeClient(httpClient);
  const resp = await request2(
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
  const challengeResp = await request2(client, "POST", "/v1/auth/challenge");
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
  const verifyResp = await request2(client, "POST", "/v1/auth/verify", {
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

// src/tools/index.ts
var defaultWalletGetter = () => getWallet();
var walletGetter = defaultWalletGetter;
function _setWalletGetter(getter) {
  walletGetter = getter ?? defaultWalletGetter;
}
var defaultTransportFactory = (rpcUrl) => (0, import_viem9.http)(rpcUrl);
var transportFactory = defaultTransportFactory;
function _setTransportFactory(factory) {
  transportFactory = factory ?? defaultTransportFactory;
}
function makeClient2(rpcUrl) {
  return (0, import_viem9.createPublicClient)({ transport: transportFactory(rpcUrl) });
}
var defaultErc8004Factory = (wallet, network) => (
  // USABILITY-11: per-network RPC override (also validates the name).
  import_sdk12.ERC8004Agent.create({
    walletProvider: wallet,
    network: sdkNetwork(network)
  })
);
var erc8004Factory = defaultErc8004Factory;
function _setErc8004Factory(factory) {
  erc8004Factory = factory ?? defaultErc8004Factory;
}
var MAX_JOB_LIST_SCAN = 100;
var default8183Provider = (network) => get8183Client(network);
var erc8183Provider = default8183Provider;
function _set8183ClientProvider(provider) {
  erc8183Provider = provider ?? default8183Provider;
}
var defaultPieverseHooks = {
  siweLogin: (wallet) => siweLogin(wallet),
  getAccountUsage: (token, opts) => getAccountUsage(token, opts)
};
var pieverseHooks = defaultPieverseHooks;
function _setPieverseHooks(hooks) {
  pieverseHooks = hooks ?? defaultPieverseHooks;
}
function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}
function resolveKeystoreDir() {
  const root = findProjectRoot();
  if (root === null) {
    throw new Error("No studio.toml found in cwd or any parent directory.");
  }
  const cfg = loadStudioToml((0, import_node_path6.join)(root, STUDIO_TOML));
  const walletCfg = cfg.wallet ?? {};
  const keystoreDir = String(walletCfg.keystore_dir ?? ".studio/wallets");
  return (0, import_node_path6.isAbsolute)(keystoreDir) ? keystoreDir : (0, import_node_path6.join)(root, keystoreDir);
}
function activeWalletAddress() {
  return walletGetter().address;
}
function nativeSymbol(network) {
  return network === "bsc-testnet" ? "tBNB" : "BNB";
}
function walletKind() {
  let cfg;
  try {
    cfg = loadStudioToml();
  } catch {
    return "evm-local";
  }
  const walletCfg = cfg.wallet ?? {};
  return String(walletCfg.kind ?? "evm-local");
}
async function walletInfo() {
  const wallet = walletGetter();
  const kind = walletKind();
  return {
    address: wallet.address,
    source: kind
  };
}
async function walletList() {
  if (walletKind() === "twak") {
    return { addresses: [walletGetter().address] };
  }
  const keystoreDir = resolveKeystoreDir();
  try {
    if (!(0, import_node_fs6.statSync)(keystoreDir).isDirectory()) return { addresses: [] };
  } catch {
    return { addresses: [] };
  }
  const addresses = [];
  for (const name of (0, import_node_fs6.readdirSync)(keystoreDir).sort()) {
    if (!name.endsWith(".json")) continue;
    let data;
    try {
      data = JSON.parse((0, import_node_fs6.readFileSync)((0, import_node_path6.join)(keystoreDir, name), "utf-8"));
    } catch {
      continue;
    }
    const addr = data?.address;
    if (!addr) continue;
    const s = String(addr);
    addresses.push(s.startsWith("0x") ? s : `0x${s}`);
  }
  return { addresses };
}
async function walletAddress() {
  return activeWalletAddress();
}
async function balanceNative(address, network = "bsc-testnet") {
  const net = getNetwork(network);
  const addr = address ?? activeWalletAddress();
  const addrCs = (0, import_viem9.getAddress)(addr);
  const client = makeClient2(net.rpcUrl);
  const raw = await client.getBalance({ address: addrCs });
  return {
    address: addrCs,
    network,
    symbol: nativeSymbol(network),
    raw: raw.toString(),
    amount: fromRaw(raw, 18)
  };
}
var BALANCE_OF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
];
async function balanceU(address, network = "bsc-testnet") {
  const net = getNetwork(network);
  const token = net.token("U");
  const addr = address ?? activeWalletAddress();
  const addrCs = (0, import_viem9.getAddress)(addr);
  const client = makeClient2(net.rpcUrl);
  const tokenCs = (0, import_viem9.getAddress)(token.address);
  const raw = await client.readContract({
    address: tokenCs,
    abi: BALANCE_OF_ABI,
    functionName: "balanceOf",
    args: [addrCs]
  });
  return {
    address: addrCs,
    network,
    symbol: token.symbol,
    token_address: tokenCs,
    raw: raw.toString(),
    amount: fromRaw(raw, token.decimals)
  };
}
var _PIEVERSE_TOKEN_CACHE = /* @__PURE__ */ new Map();
async function getOrRefreshPieverseToken(wallet) {
  const cached = _PIEVERSE_TOKEN_CACHE.get(wallet.address);
  if (cached) return cached;
  const token = await pieverseHooks.siweLogin(wallet);
  _PIEVERSE_TOKEN_CACHE.set(wallet.address, token);
  return token;
}
async function pieverseUsage(days = 7) {
  const root = findProjectRoot();
  if (root === null) {
    throw new Error("No studio.toml found in cwd or any parent directory.");
  }
  const cfg = loadStudioToml((0, import_node_path6.join)(root, STUDIO_TOML));
  const provider = (cfg.llm ?? {}).provider;
  if (provider !== "pieverse-llm") {
    throw new Error(
      `pieverse_usage requires [llm].provider = 'pieverse-llm' (current: ${JSON.stringify(provider ?? null)})`
    );
  }
  const wallet = walletGetter();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = await getOrRefreshPieverseToken(wallet);
    try {
      return await pieverseHooks.getAccountUsage(token, { days });
    } catch (error) {
      if (!(error instanceof PieverseAuthError)) throw error;
      _PIEVERSE_TOKEN_CACHE.delete(wallet.address);
      if (attempt === 1) throw error;
    }
  }
  throw new Error("unreachable Pieverse usage retry state");
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function decodeAgentUriSafe(agentUri) {
  if (!agentUri || !agentUri.startsWith("data:")) return null;
  let body;
  try {
    const payload = agentUri.slice(agentUri.indexOf(",") + 1);
    body = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
  } catch {
    return null;
  }
  const services = asRecord(body)?.services;
  if (!Array.isArray(services)) return [];
  const out = [];
  for (const entry of services) {
    const rec = asRecord(entry);
    if (rec === null) continue;
    out.push({
      name: String(rec.name ?? ""),
      endpoint: String(rec.endpoint ?? ""),
      version: String(rec.version ?? "")
    });
  }
  return out;
}
async function agentInfo(agentId, network = "bsc-testnet") {
  try {
    const wallet = walletGetter();
    const sdk = await erc8004Factory(wallet, network);
    const info = asRecord(await sdk.getAgentInfo(Number(agentId)));
    if (info === null) {
      return { error: `agent_id=${agentId} not found` };
    }
    const agentUri = String(info.agentURI ?? info.agent_uri ?? "");
    const out = {
      agent_id: Number(info.agentId ?? info.agent_id ?? agentId),
      address: String(info.agentAddress ?? info.agent_address ?? ""),
      agent_uri: agentUri,
      metadata: { ...asRecord(info.metadata) ?? {} }
    };
    const services = decodeAgentUriSafe(agentUri);
    if (services !== null) out.services = services;
    return out;
  } catch (e) {
    return { error: `agent_id=${agentId} not found: ${errorMessage(e)}` };
  }
}
async function agentByAddress(address, network = "bsc-testnet") {
  try {
    const wallet = walletGetter();
    const sdk = await erc8004Factory(wallet, network);
    const target = address.toLowerCase();
    let offset = 0;
    const pageSize = 100;
    for (let page = 0; page < 10; page++) {
      const result = asRecord(await sdk.getAllAgents(pageSize, offset));
      const items = Array.isArray(result?.items) ? result.items : [];
      for (const agent of items) {
        const rec = asRecord(agent);
        if (rec === null) continue;
        const owner = String(
          rec.owner_address ?? rec.owner ?? ""
        ).toLowerCase();
        if (owner !== target) continue;
        let rawId = rec.token_id ?? rec.agent_id ?? rec.agentId;
        if (typeof rawId === "string" && rawId.includes(":")) {
          rawId = rawId.split(":").pop();
        }
        return {
          agent_id: rawId != null ? Number(rawId) : null,
          address: String(rec.agent_address ?? rec.agentAddress ?? ""),
          agent_uri: String(rec.agent_uri ?? rec.agentURI ?? "")
        };
      }
      if (items.length < pageSize) break;
      offset += pageSize;
    }
    return { found: false };
  } catch (e) {
    return { error: `lookup failed for ${address}: ${errorMessage(e)}` };
  }
}
async function jobStatus(jobId, network = "bsc-testnet") {
  try {
    return await getJobSummary(Number(jobId), { network });
  } catch (e) {
    return { error: `job_id=${jobId} not found: ${errorMessage(e)}` };
  }
}
async function jobList(opts = {}) {
  const {
    limit = 10,
    mine = false,
    provider = null,
    network = "bsc-testnet"
  } = opts;
  try {
    const client = await erc8183Provider(network);
    const [totalInflight, latestJobId] = await Promise.all([
      client.inflightJobCount(),
      client.commerce.jobCounter()
    ]);
    let myAddress = null;
    if (mine && provider === null) {
      myAddress = walletGetter().address;
    }
    const rows = [];
    let scanned = 0;
    for (let jid = latestJobId; jid >= 1n && scanned < MAX_JOB_LIST_SCAN; jid--, scanned++) {
      if (rows.length >= Number(limit)) break;
      let job;
      try {
        job = asRecord(await client.getJob(jid));
      } catch {
        continue;
      }
      const jobClient = String(job?.client ?? "");
      const jobProvider = String(job?.provider ?? "");
      if (myAddress !== null && jobClient.toLowerCase() !== myAddress.toLowerCase()) {
        continue;
      }
      if (provider !== null && jobProvider.toLowerCase() !== provider.toLowerCase()) {
        continue;
      }
      let status;
      try {
        status = import_sdk12.JobStatus[await client.getJobStatus(jid)] ?? "?";
      } catch {
        status = "?";
      }
      rows.push({
        job_id: Number(jid),
        client: jobClient,
        provider: jobProvider,
        status
      });
    }
    return { total_inflight: Number(totalInflight), jobs: rows };
  } catch (e) {
    return { error: `job_list failed: ${errorMessage(e)}` };
  }
}
async function jobCount(network = "bsc-testnet") {
  try {
    const client = await erc8183Provider(network);
    return { inflight: Number(await client.inflightJobCount()) };
  } catch (e) {
    return { error: `job_count failed: ${errorMessage(e)}` };
  }
}
async function txStatus(txHash, network = "bsc-testnet") {
  try {
    const net = getNetwork(network);
    const client = makeClient2(net.rpcUrl);
    let tx;
    try {
      tx = await client.getTransaction({
        hash: txHash
      });
    } catch (e) {
      if (errorMessage(e).toLowerCase().includes("not found") || e.name === "TransactionNotFoundError") {
        return { error: `transaction not found: ${txHash}` };
      }
      throw e;
    }
    let receipt;
    try {
      receipt = await client.getTransactionReceipt({
        hash: txHash
      });
    } catch {
      receipt = null;
    }
    if (receipt === null) {
      return {
        tx_hash: txHash,
        status: "pending",
        block_number: null,
        from: String(tx.from ?? ""),
        to: String(tx.to ?? ""),
        value_wei: String(tx.value ?? 0n),
        gas_used: null,
        effective_gas_price_wei: null,
        logs_count: null,
        revert_reason: null
      };
    }
    const status = receipt.status === "reverted" ? "reverted" : "success";
    let revertReason = null;
    if (status === "reverted") {
      try {
        await client.call({
          to: tx.to,
          data: tx.input ?? tx.data,
          value: BigInt(tx.value ?? 0n),
          account: tx.from,
          blockNumber: receipt.blockNumber
        });
      } catch (cle) {
        revertReason = errorMessage(cle);
      }
    }
    const effPrice = receipt.effectiveGasPrice;
    return {
      tx_hash: txHash,
      status,
      block_number: receipt.blockNumber != null ? Number(receipt.blockNumber) : null,
      from: String(receipt.from ?? tx.from ?? ""),
      to: String(receipt.to ?? tx.to ?? ""),
      value_wei: String(tx.value ?? 0n),
      gas_used: receipt.gasUsed != null ? Number(receipt.gasUsed) : null,
      effective_gas_price_wei: effPrice != null ? effPrice.toString() : null,
      logs_count: Array.isArray(receipt.logs) ? receipt.logs.length : 0,
      revert_reason: revertReason
    };
  } catch (e) {
    return { error: `tx_status failed: ${errorMessage(e)}` };
  }
}
async function blockInfo(block = "latest", network = "bsc-testnet") {
  try {
    const net = getNetwork(network);
    const client = makeClient2(net.rpcUrl);
    let blk;
    if (block === "latest" || block === "earliest" || block === "pending") {
      blk = await client.getBlock({
        blockTag: block
      });
    } else if (block.startsWith("0x") && block.length === 66) {
      blk = await client.getBlock({
        blockHash: block
      });
    } else if (block.startsWith("0x") && block.length > 2) {
      blk = await client.getBlock({
        blockNumber: BigInt(block)
      });
    } else {
      blk = await client.getBlock({
        blockNumber: BigInt(block)
      });
    }
    const baseFee = blk.baseFeePerGas;
    return {
      number: Number(blk.number),
      hash: String(blk.hash ?? ""),
      parent_hash: String(blk.parentHash ?? ""),
      timestamp: Number(blk.timestamp ?? 0),
      miner: String(blk.miner ?? ""),
      gas_limit: Number(blk.gasLimit ?? 0),
      gas_used: Number(blk.gasUsed ?? 0),
      size: Number(blk.size ?? 0),
      tx_count: Array.isArray(blk.transactions) ? blk.transactions.length : 0,
      base_fee_per_gas_wei: baseFee != null ? baseFee.toString() : null
    };
  } catch (e) {
    return { error: `block_info failed: ${errorMessage(e)}` };
  }
}
function _parseInputTypes(functionSignature) {
  if (!functionSignature.includes("(") || !functionSignature.endsWith(")")) {
    throw new Error(
      `invalid function signature: ${JSON.stringify(functionSignature)}`
    );
  }
  const inside = functionSignature.slice(functionSignature.indexOf("(") + 1, -1).trim();
  if (!inside) return [];
  return inside.split(",").map((t) => t.trim());
}
function jsonSafe(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  return value;
}
async function contractCallView(address, functionSignature, args, outputTypes, network = "bsc-testnet") {
  try {
    const net = getNetwork(network);
    const client = makeClient2(net.rpcUrl);
    const inputTypes = _parseInputTypes(functionSignature);
    const callArgs = [...args ?? []];
    if (callArgs.length !== inputTypes.length) {
      throw new Error(
        `arg count mismatch: signature expects ${inputTypes.length}, got ${callArgs.length}`
      );
    }
    const selector = (0, import_viem9.toFunctionSelector)(`function ${functionSignature}`);
    const encodedArgs = inputTypes.length > 0 ? (0, import_viem9.encodeAbiParameters)(
      (0, import_viem9.parseAbiParameters)(inputTypes.join(", ")),
      callArgs
    ) : "0x";
    const calldata = `${selector}${encodedArgs.slice(2)}`;
    const addressCs = (0, import_viem9.getAddress)(address);
    const { data } = await client.call({ to: addressCs, data: calldata });
    const rawHex = data ?? "0x";
    let decoded = null;
    if (outputTypes && outputTypes.length > 0) {
      const values = (0, import_viem9.decodeAbiParameters)(
        (0, import_viem9.parseAbiParameters)(outputTypes.join(", ")),
        rawHex
      );
      decoded = [...values].map(jsonSafe);
    }
    return {
      address: addressCs,
      function_signature: functionSignature,
      raw_hex: rawHex,
      decoded
    };
  } catch (e) {
    return { error: `contract_call_view failed: ${errorMessage(e)}` };
  }
}
async function networkInfo(network = "bsc-testnet") {
  try {
    const net = getNetwork(network);
    let host = "";
    try {
      host = new URL(net.rpcUrl).hostname;
    } catch {
      host = "";
    }
    const tokens = {};
    for (const [sym, tok] of Object.entries(net.tokens)) {
      tokens[sym] = tok.address;
    }
    return {
      name: net.name,
      chain_id: net.chainId,
      rpc_host: host,
      native_symbol: nativeSymbol(network),
      tokens
    };
  } catch (e) {
    return { error: `network_info failed: ${errorMessage(e)}` };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  _PIEVERSE_TOKEN_CACHE,
  _parseInputTypes,
  _set8183ClientProvider,
  _setErc8004Factory,
  _setPieverseHooks,
  _setTransportFactory,
  _setWalletGetter,
  agentByAddress,
  agentInfo,
  balanceNative,
  balanceU,
  blockInfo,
  contractCallView,
  jobCount,
  jobList,
  jobStatus,
  networkInfo,
  pieverseUsage,
  txStatus,
  walletAddress,
  walletInfo,
  walletList
});
