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

// src/wallet.ts
var wallet_exports = {};
__export(wallet_exports, {
  ALTANA_NETWORK_BY_STUDIO: () => ALTANA_NETWORK_BY_STUDIO,
  ALTANA_SDK_TESTED_VERSION: () => ALTANA_SDK_TESTED_VERSION,
  ALTANA_SESSION_ENV: () => ALTANA_SESSION_ENV,
  ALTANA_SESSION_FILE_ENV: () => ALTANA_SESSION_FILE_ENV,
  KEYSTORE_DIR_ENV: () => KEYSTORE_DIR_ENV,
  KEYSTORE_JSON_ENV: () => KEYSTORE_JSON_ENV,
  PASSWORD_ENV: () => PASSWORD_ENV,
  TURNKEY_CHAIN_ID_BY_NETWORK: () => TURNKEY_CHAIN_ID_BY_NETWORK,
  TURNKEY_SDK_INSTALL_COMMAND: () => TURNKEY_SDK_INSTALL_COMMAND,
  TURNKEY_TESTED_SDK_COMBINATIONS: () => TURNKEY_TESTED_SDK_COMBINATIONS,
  TWAK_CREDENTIALS_JSON_ENV: () => TWAK_CREDENTIALS_JSON_ENV,
  TWAK_HOME_ENV: () => TWAK_HOME_ENV,
  TWAK_LOCAL_HOME_ENV: () => TWAK_LOCAL_HOME_ENV,
  TWAK_WALLET_JSON_ENV: () => TWAK_WALLET_JSON_ENV,
  _resetCache: () => _resetCache,
  _setAltanaSessionForTests: () => _setAltanaSessionForTests,
  applyTxTuning: () => applyTxTuning,
  buildLocalAdminWallet: () => buildLocalAdminWallet,
  buildPolicy: () => buildPolicy,
  buildWallet: () => buildWallet,
  ensureAltanaSessionLoaded: () => ensureAltanaSessionLoaded,
  ensureKeystoreMaterialized: () => ensureKeystoreMaterialized,
  ensureTwakKeychain: () => ensureTwakKeychain,
  ensureTwakMaterialized: () => ensureTwakMaterialized,
  getWallet: () => getWallet,
  inspectAltanaSessionPermissions: () => inspectAltanaSessionPermissions,
  resolveProjectAltanaSdkEntry: () => resolveProjectAltanaSdkEntry,
  resolveProjectTurnkeySdkEntry: () => resolveProjectTurnkeySdkEntry,
  resolveTwakHome: () => resolveTwakHome,
  twakProviderOptions: () => twakProviderOptions
});
module.exports = __toCommonJS(wallet_exports);
var import_node_child_process = require("child_process");
var import_node_fs3 = require("fs");
var import_node_os2 = require("os");
var import_node_path2 = require("path");
var import_node_url = require("url");
var import_sdk2 = require("@bnbagent/sdk");
var import_wallets = require("@bnbagent/sdk/wallets");
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

// src/secretWrite.ts
var import_node_fs2 = require("fs");
function writePrivate(path, content) {
  const fd = (0, import_node_fs2.openSync)(path, "w", 384);
  try {
    (0, import_node_fs2.fchmodSync)(fd, 384);
    (0, import_node_fs2.writeSync)(fd, content);
  } finally {
    (0, import_node_fs2.closeSync)(fd);
  }
}

// src/wallet.ts
var ALTANA_SDK_TESTED_VERSION = "0.7.1";
var TURNKEY_TESTED_SDK_COMBINATIONS = Object.freeze([
  Object.freeze({
    [import_wallets.TURNKEY_SDK_SERVER_PACKAGE]: "8.1.0",
    [import_wallets.TURNKEY_VIEM_PACKAGE]: "0.14.34"
  })
]);
var TURNKEY_SDK_INSTALL_COMMAND = `pnpm add ${import_wallets.TURNKEY_SDK_SERVER_PACKAGE}@${TURNKEY_TESTED_SDK_COMBINATIONS[0][import_wallets.TURNKEY_SDK_SERVER_PACKAGE]} ${import_wallets.TURNKEY_VIEM_PACKAGE}@${TURNKEY_TESTED_SDK_COMBINATIONS[0][import_wallets.TURNKEY_VIEM_PACKAGE]}`;
var PASSWORD_ENV = "WALLET_PASSWORD";
var KEYSTORE_JSON_ENV = "WALLET_KEYSTORE_JSON";
var KEYSTORE_DIR_ENV = "BNBAGENT_KEYSTORE_DIR";
var TWAK_HOME_ENV = "TWAK_HOME_DIR";
var TWAK_LOCAL_HOME_ENV = "TWAK_HOME";
var TWAK_WALLET_JSON_ENV = "TWAK_WALLET_JSON";
var TWAK_CREDENTIALS_JSON_ENV = "TWAK_CREDENTIALS_JSON";
var TWAK_CHAIN_BY_NETWORK = {
  "bsc-testnet": "bsctestnet",
  "bsc-mainnet": "bsc"
};
var ALTANA_SESSION_ENV = "ALTANA_SESSION";
var ALTANA_SESSION_FILE_ENV = "ALTANA_SESSION_FILE";
var ALTANA_NETWORK_BY_STUDIO = {
  "bsc-testnet": "bnb-testnet",
  "bsc-mainnet": "bnb-mainnet"
};
function recordOf(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function altanaCallKey(value) {
  const call = recordOf(value);
  const to = String(call.to ?? "").toLowerCase();
  const signature = String(call.signature ?? "");
  return to && signature ? `${to}:${signature}` : null;
}
function inspectAltanaSessionPermissions(permissions, chainId) {
  const expected = ((0, import_wallets.defaultAgentPermissions)({ chainId, tokenSpend: { limit: 1n } }).calls ?? []).map(altanaCallKey);
  const rawSpend = recordOf(permissions).spend;
  const expectedSpend = (0, import_wallets.defaultAgentPermissions)({ chainId, tokenSpend: { limit: 1n } }).spend ?? [];
  const spendValid = Array.isArray(rawSpend) && rawSpend.length > 0 && rawSpend.length <= expectedSpend.length && expectedSpend.filter((cap) => cap.token !== void 0).every(
    (expectedCap) => rawSpend.some(
      (value) => String(recordOf(value).token).toLowerCase() === String(expectedCap.token).toLowerCase()
    )
  ) && rawSpend.every((value, index) => {
    const cap = recordOf(value);
    const rawLimit = typeof cap.limit === "object" ? recordOf(cap.limit).$bigint : cap.limit;
    const token = String(cap.token ?? "").toLowerCase();
    return rawSpend.findIndex(
      (entry) => String(recordOf(entry).token ?? "").toLowerCase() === token
    ) === index && expectedSpend.some(
      (expectedCap) => String(expectedCap.token ?? "").toLowerCase() === token && cap.period === expectedCap.period
    ) && (typeof rawLimit === "bigint" || typeof rawLimit === "string") && /^[0-9]+$/.test(String(rawLimit)) && BigInt(String(rawLimit)) > 0n && BigInt(String(rawLimit)) < 1n << 256n;
  });
  const rawCalls = recordOf(permissions).calls;
  const actual = Array.isArray(rawCalls) ? rawCalls.map(altanaCallKey) : [];
  const actualSet = new Set(actual);
  return {
    current: spendValid && actual.length === expected.length && actualSet.size === expected.length && !actual.includes(null) && !expected.includes(null) && expected.every((call) => actualSet.has(call)),
    expectedCallCount: expected.length,
    actualCallCount: actual.length
  };
}
var cachedAltanaSession = null;
var cachedAltanaError = null;
var altanaLoadPromise = null;
var TURNKEY_CHAIN_ID_BY_NETWORK = {
  "bsc-testnet": 97,
  "bsc-mainnet": 56
};
function asError(error) {
  return error instanceof Error ? error : new Error(String(error));
}
function altanaStartupError(error) {
  const cause = asError(error);
  const guidance = "After correcting the Altana session source, restart the command or Agent; the failed startup snapshot is intentionally retained for this process.";
  if (cause.message.includes(guidance)) return cause;
  return new Error(`${cause.message} ${guidance}`, { cause });
}
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
function resolveProjectAltanaSdkEntry(projectRoot) {
  return resolveProjectPackage(
    projectRoot,
    "@altananetwork/sdk",
    "install @altananetwork/sdk@0.7.1 in the agent project.",
    ALTANA_SDK_TESTED_VERSION
  )?.entry ?? null;
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
function readAltanaSessionFile(file) {
  if (process.platform !== "win32") {
    const mode = (0, import_node_fs3.statSync)(file).mode & 511;
    if ((mode & 63) !== 0) {
      console.warn(
        `[AltanaWalletProvider] ${file} is group/other-readable (mode ${mode.toString(8)}) but contains the session private key \u2014 chmod 600 it.`
      );
    }
  }
  return (0, import_node_fs3.readFileSync)(file, "utf8");
}
async function ensureAltanaSessionLoaded() {
  if (cachedAltanaSession !== null) return;
  if (cachedAltanaError !== null) throw cachedAltanaError;
  if (altanaLoadPromise !== null) return altanaLoadPromise;
  altanaLoadPromise = (async () => {
    try {
      const projectRoot = findProjectRoot();
      if (projectRoot === null) return;
      const cfg = loadStudioToml((0, import_node_path2.join)(projectRoot, STUDIO_TOML));
      const walletCfg = cfg.wallet ?? {};
      if (String(walletCfg.kind ?? "evm-local") !== "altana") return;
      const localEntry = resolveProjectAltanaSdkEntry(projectRoot);
      (0, import_wallets.setAltanaSdkImporter)(
        localEntry === null ? null : () => import((0, import_node_url.pathToFileURL)(localEntry).href)
      );
      let serialized;
      const inline = process.env[ALTANA_SESSION_ENV];
      const envFile = process.env[ALTANA_SESSION_FILE_ENV];
      if (inline) {
        serialized = inline;
      } else {
        const configured = envFile || String(walletCfg.session_file ?? "");
        if (!configured) {
          throw new Error(
            "no Altana session configured \u2014 run `bag wallet session grant`, or set ALTANA_SESSION / ALTANA_SESSION_FILE."
          );
        }
        const sessionFile = (0, import_node_path2.isAbsolute)(configured) || projectRoot === null ? configured : (0, import_node_path2.join)(projectRoot, configured);
        serialized = readAltanaSessionFile(sessionFile);
      }
      const session = await (0, import_wallets.deserializeSession)(serialized);
      const networkName = String(
        (cfg.network ?? {}).default ?? "bsc-testnet"
      );
      const permissionInspection = inspectAltanaSessionPermissions(
        session.permissions,
        getNetwork(networkName).chainId
      );
      if (!permissionInspection.current) {
        throw new Error(
          "Altana session does not match the selector-bound @bnbagent/sdk@0.5.4 permission set and bounded token spend policy; run `bag wallet session grant --force`."
        );
      }
      if (session.expiry <= Math.floor(Date.now() / 1e3)) {
        throw new Error(
          `Altana session ${session.publicKey} expired at ${session.expiry}; run \`bag wallet session grant --force\`.`
        );
      }
      cachedAltanaSession = session;
    } catch (error) {
      cachedAltanaError = altanaStartupError(error);
      throw cachedAltanaError;
    } finally {
      altanaLoadPromise = null;
    }
  })();
  return altanaLoadPromise;
}
function ensureKeystoreMaterialized() {
  const raw = process.env[KEYSTORE_JSON_ENV];
  if (!raw) return null;
  const keystore = JSON.parse(raw);
  const address = keystore.address;
  if (!address) {
    throw new Error(
      `${KEYSTORE_JSON_ENV} is set but its JSON has no 'address' field; cannot derive the keystore filename.`
    );
  }
  const prefixed = address.startsWith("0x") ? address : `0x${address}`;
  const fname = `${(0, import_viem.getAddress)(prefixed)}.json`;
  const root = findProjectRoot();
  const cfg = loadStudioToml(
    root !== null ? (0, import_node_path2.join)(root, "studio.toml") : void 0
  );
  const walletCfg = cfg.wallet ?? {};
  let keystoreDir = String(walletCfg.keystore_dir ?? ".studio/wallets");
  if (!(0, import_node_path2.isAbsolute)(keystoreDir) && root !== null) {
    keystoreDir = (0, import_node_path2.join)(root, keystoreDir);
  }
  let dst = (0, import_node_path2.join)(keystoreDir, fname);
  if ((0, import_node_fs3.existsSync)(dst)) {
    delete process.env[KEYSTORE_JSON_ENV];
    return dst;
  }
  try {
    (0, import_node_fs3.mkdirSync)(keystoreDir, { recursive: true });
    (0, import_node_fs3.chmodSync)(keystoreDir, 448);
    writePrivate(dst, raw);
  } catch {
    const fallbackDir = (0, import_node_path2.join)((0, import_node_os2.tmpdir)(), "bnbagent-keystore", "wallets");
    (0, import_node_fs3.mkdirSync)(fallbackDir, { recursive: true });
    (0, import_node_fs3.chmodSync)(fallbackDir, 448);
    dst = (0, import_node_path2.join)(fallbackDir, fname);
    writePrivate(dst, raw);
    process.env[KEYSTORE_DIR_ENV] = fallbackDir;
  }
  delete process.env[KEYSTORE_JSON_ENV];
  return dst;
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
function ensureTwakMaterialized() {
  const raw = process.env[TWAK_WALLET_JSON_ENV];
  if (!raw) return null;
  const home = (0, import_node_path2.join)((0, import_node_os2.tmpdir)(), "twak-home");
  (0, import_wallets.materializeTwakHome)({
    walletJson: raw,
    credentialsJson: process.env[TWAK_CREDENTIALS_JSON_ENV] || void 0,
    home
  });
  process.env[TWAK_HOME_ENV] = home;
  delete process.env[TWAK_WALLET_JSON_ENV];
  delete process.env[TWAK_CREDENTIALS_JSON_ENV];
  return home;
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
function _setAltanaSessionForTests(session) {
  cachedAltanaSession = session;
  cachedAltanaError = null;
  cachedWallet = null;
}
function _resetCache() {
  cachedWallet = null;
  cachedAltanaSession = null;
  cachedAltanaError = null;
  altanaLoadPromise = null;
  (0, import_wallets.setAltanaSdkImporter)(null);
  (0, import_wallets.setTurnkeySdkImporter)(null);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ALTANA_NETWORK_BY_STUDIO,
  ALTANA_SDK_TESTED_VERSION,
  ALTANA_SESSION_ENV,
  ALTANA_SESSION_FILE_ENV,
  KEYSTORE_DIR_ENV,
  KEYSTORE_JSON_ENV,
  PASSWORD_ENV,
  TURNKEY_CHAIN_ID_BY_NETWORK,
  TURNKEY_SDK_INSTALL_COMMAND,
  TURNKEY_TESTED_SDK_COMBINATIONS,
  TWAK_CREDENTIALS_JSON_ENV,
  TWAK_HOME_ENV,
  TWAK_LOCAL_HOME_ENV,
  TWAK_WALLET_JSON_ENV,
  _resetCache,
  _setAltanaSessionForTests,
  applyTxTuning,
  buildLocalAdminWallet,
  buildPolicy,
  buildWallet,
  ensureAltanaSessionLoaded,
  ensureKeystoreMaterialized,
  ensureTwakKeychain,
  ensureTwakMaterialized,
  getWallet,
  inspectAltanaSessionPermissions,
  resolveProjectAltanaSdkEntry,
  resolveProjectTurnkeySdkEntry,
  resolveTwakHome,
  twakProviderOptions
});
