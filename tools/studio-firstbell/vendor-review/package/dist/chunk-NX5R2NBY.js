import {
  b402UsdPriceToAtomic,
  getNetwork,
  usdPriceToAtomic
} from "./chunk-YQUACLG3.js";

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

export {
  SELLER_POLICY_AMBIGUOUS_ERROR,
  SellerPolicyConfigError,
  resolveSellerPolicy,
  hasCanonicalSellerPolicy
};
