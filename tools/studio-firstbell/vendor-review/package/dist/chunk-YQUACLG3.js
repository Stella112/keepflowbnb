// src/networks.ts
import { resolveNetwork } from "@bnbagent/sdk";
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
  PaymentAssetUnavailableError,
  getAsset,
  getAssetByAddress,
  getAssetMetadata,
  getB402Asset,
  getB402AssetByAddress,
  listAssets,
  parseAssetId,
  resolveAssetAlias
} from "@bnbagent/sdk/networks";
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
  "bsc-mainnet": BSC_MAINNET_CHAIN_ID,
  "bsc-testnet": BSC_TESTNET_CHAIN_ID
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
  return Object.freeze(listAssets(chainId).map(projectToken));
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
        (asset) => projectB402Token(getB402Asset(this.chainId, asset.assetId))
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
      assetId = resolveAssetAlias(this.chainId, reference.toUpperCase());
    } catch (aliasCause) {
      try {
        assetId = parseAssetId(reference);
      } catch {
        throw aliasCause;
      }
    }
    try {
      getAsset(this.chainId, assetId);
    } catch (cause) {
      if (cause instanceof PaymentAssetUnavailableError) {
        throw new PaymentSymbolUnavailableError(
          this.name,
          getAssetMetadata(this.chainId, cause.assetId),
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
      assetId = resolveAssetAlias(this.chainId, reference.toUpperCase());
    } catch (aliasCause) {
      try {
        assetId = parseAssetId(reference);
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
    const canonical = parseAssetId(assetId);
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
    const catalogAsset = getB402AssetByAddress(this.chainId, address);
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
    const canonical = parseAssetId(assetId);
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
    const catalogAsset = getAssetByAddress(this.chainId, address);
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
var BSC_MAINNET_ASSETS = projectCatalog(BSC_MAINNET_CHAIN_ID);
var BSC_TESTNET_ASSETS = projectCatalog(BSC_TESTNET_CHAIN_ID);
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
var ERC8183_SUBMIT_GAS_RESERVE_BNB = 6e-3;
var BSC_MAINNET_MIN_BNB = 0.02;
var BSC_TESTNET_MIN_BNB = 0.02;
var BSC_MAINNET_MIN_U = 1;
var BSC_TESTNET_MIN_U = 1;
var BSC_TESTNET_TBNB_TELEGRAM_FAUCET = "https://t.me/bnbchain_official_bot";
var BSC_TESTNET_U_TELEGRAM_FAUCET = BSC_TESTNET_TBNB_TELEGRAM_FAUCET;
var BSC_TESTNET_FAUCET_DOCS_URL = "https://docs.bnbchain.org/bnb-smart-chain/developers/faucet/";
var BSC_TESTNET_U_FAUCET_URL = "https://united-coin-u.github.io/u-faucet/";
function tbnbFaucetHint(address = "<your-wallet-address>") {
  return `get tBNB via Telegram ${BSC_TESTNET_TBNB_TELEGRAM_FAUCET} \u2014 send "I would like to get tBNB to my wallet ${address}" (more options: ${BSC_TESTNET_FAUCET_DOCS_URL})`;
}
function uFaucetHint(address = "<your-wallet-address>") {
  return `get U via Telegram ${BSC_TESTNET_U_TELEGRAM_FAUCET} \u2014 send "I would like to get U to my wallet ${address}" (more options: ${BSC_TESTNET_U_FAUCET_URL})`;
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
function resolveAssetId(networkName, reference) {
  return getNetwork(networkName).resolveAsset(reference).assetId;
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
  const nc = resolveNetwork(name);
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

export {
  DEFAULT_RPC,
  RPC_ENV_VAR,
  PAYMASTER_URL_ENV_VAR,
  DEFAULT_CHAIN_ID,
  PaymentSymbolUnavailableError,
  NetworkInfo,
  U_TOKEN_BSC_MAINNET,
  U_TOKEN_BSC_TESTNET,
  ERC8183_SUBMIT_GAS_RESERVE_BNB,
  BSC_MAINNET_MIN_BNB,
  BSC_TESTNET_MIN_BNB,
  BSC_MAINNET_MIN_U,
  BSC_TESTNET_MIN_U,
  BSC_TESTNET_TBNB_TELEGRAM_FAUCET,
  BSC_TESTNET_U_TELEGRAM_FAUCET,
  BSC_TESTNET_FAUCET_DOCS_URL,
  BSC_TESTNET_U_FAUCET_URL,
  tbnbFaucetHint,
  uFaucetHint,
  getNetwork,
  catalogPaymentAllowlist,
  resolveAssetId,
  usdPriceToAtomic,
  b402UsdPriceToAtomic,
  formatUsdAtomic,
  sdkNetwork,
  toRaw,
  fromRaw
};
