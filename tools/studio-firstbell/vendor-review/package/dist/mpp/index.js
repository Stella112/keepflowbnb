import {
  _isDailyCapCountedElsewhere,
  caip2,
  usdToAtomic
} from "../chunk-ZWCUOUCH.js";
import {
  X402BudgetExhaustedError,
  getSharedBudgetTracker,
  resolveDailyCapUsd
} from "../chunk-JOGM5MYC.js";
import {
  getNetwork
} from "../chunk-YQUACLG3.js";
import {
  STUDIO_TOML,
  StudioTomlNotFoundError,
  findProjectRoot,
  loadStudioToml
} from "../chunk-AHE5Y6SQ.js";

// src/mpp/buyer.ts
import { join } from "path";
import { charge } from "@bnb-chain/mpp-b402/client";
import { Receipt } from "mppx";
import { Mppx, Transport } from "mppx/client";
import {
  http,
  createPublicClient,
  erc20Abi,
  formatUnits,
  getAddress as getAddress2,
  isAddress as isAddress2
} from "viem";

// src/mpp/errors.ts
var MppError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = new.target.name;
  }
};
var MppHostNotAllowedError = class extends MppError {
};
var MppInsecureTransportError = class extends MppError {
};
var MppPaymentRequiredError = class extends MppError {
  paymentDispatched = false;
};
var MppPolicyError = class extends MppError {
};
var MppRecipientRequiredError = class extends MppPolicyError {
};
var MppRecipientMismatchError = class extends MppPolicyError {
};
var MppRealmMismatchError = class extends MppPolicyError {
};
var MppBudgetExceededError = class extends MppPolicyError {
};
var MppUnsupportedWalletError = class extends MppError {
};
var MppPaymentAssetUnavailableError = class extends MppError {
  paymentDispatched = false;
  assetId;
  symbol;
  tokenAddress;
  addressPending;
  decimals;
  retryHint;
  alternatives;
  constructor(message, options) {
    super(message, options);
    this.assetId = options.asset.assetId;
    this.symbol = options.asset.symbol;
    this.tokenAddress = options.asset.tokenAddress;
    this.addressPending = options.asset.addressPending === true;
    this.decimals = options.asset.decimals;
    this.retryHint = options.asset.retryHint;
    this.alternatives = Object.freeze([...options.alternatives ?? []]);
  }
};
var MppUnsupportedWalletRouteError = class extends MppPaymentAssetUnavailableError {
};
var MppPaymentAssetBalanceUnavailableError = class extends MppPaymentAssetUnavailableError {
};
var MppInsufficientPaymentAssetBalanceError = class extends MppPaymentAssetUnavailableError {
  requiredAtomic;
  currentAtomic;
  requiredHuman;
  currentHuman;
  constructor(message, options) {
    super(message, options);
    this.requiredAtomic = options.requiredAtomic;
    this.currentAtomic = options.currentAtomic;
    this.requiredHuman = options.requiredHuman;
    this.currentHuman = options.currentHuman;
  }
};
var MppPaymentOutcomeUnknownError = class extends MppError {
  paymentDispatched = true;
  amountUsd;
  constructor(message, options = {}) {
    super(message, options);
    this.amountUsd = options.amountUsd ?? null;
  }
};

// src/mpp/policy.ts
import { isIP } from "net";
import { getAddress, isAddress } from "viem";
var DEFAULT_MPP_MAX_PER_REQUEST_USD = 1;
var DEFAULT_MPP_MAX_SETTLEMENT_SECONDS = 300;
var MAX_MPP_SETTLEMENT_SECONDS = 3600;
var MPP_NETWORK_NAMES = ["bsc-mainnet", "bsc-testnet"];
var MppBuyerPolicy = class _MppBuyerPolicy {
  maxPerRequestUsd;
  maxSettlementSeconds;
  allowedHosts;
  expectedRecipient;
  expectedRealm;
  merchants;
  constructor(fields = {}) {
    if (!isRecord(fields)) {
      throw new MppPolicyError("MppBuyerPolicy fields must be an object");
    }
    this.maxPerRequestUsd = fields.maxPerRequestUsd === void 0 ? DEFAULT_MPP_MAX_PER_REQUEST_USD : requiredNonNegativeNumber(
      fields.maxPerRequestUsd,
      "maxPerRequestUsd"
    );
    this.maxSettlementSeconds = fields.maxSettlementSeconds === void 0 ? DEFAULT_MPP_MAX_SETTLEMENT_SECONDS : requiredSettlementSeconds(
      fields.maxSettlementSeconds,
      "maxSettlementSeconds"
    );
    this.allowedHosts = Object.freeze(
      uniqueHosts(
        fields.allowedHosts === void 0 ? [] : requireStringArray(fields.allowedHosts, "allowedHosts"),
        "allowedHosts"
      )
    );
    this.expectedRecipient = fields.expectedRecipient === void 0 || fields.expectedRecipient === null ? null : requiredAddress(fields.expectedRecipient, "expectedRecipient");
    this.expectedRealm = fields.expectedRealm === void 0 || fields.expectedRealm === null ? null : requiredRealm(fields.expectedRealm, "expectedRealm");
    const merchants = fields.merchants === void 0 ? [] : requireMerchantArray(fields.merchants, "merchants");
    this.merchants = Object.freeze(
      merchants.map(
        (merchant, index) => normalizeMerchant(merchant, `merchants[${index}]`)
      )
    );
    Object.freeze(this);
  }
  get effectiveAllowedHosts() {
    return Object.freeze(
      uniqueHosts(
        [
          ...this.allowedHosts,
          ...this.merchants.map((merchant) => merchant.domain)
        ],
        "effectiveAllowedHosts"
      )
    );
  }
  merchantForUrl(url) {
    let host;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return null;
    }
    return this.merchants.find(
      (merchant) => merchant.domain.toLowerCase() === host
    ) ?? null;
  }
  static fromToml(cfg) {
    if (cfg === null || cfg === void 0) return new _MppBuyerPolicy();
    const root = requireTable(cfg, "studio.toml");
    if (!hasOwn(root, "payments")) return new _MppBuyerPolicy();
    const payments = requireTable(root.payments, "payments");
    if (!hasOwn(payments, "mpp")) return new _MppBuyerPolicy();
    const mpp = requireTable(payments.mpp, "payments.mpp");
    const merchants = parseMerchants(mpp);
    return new _MppBuyerPolicy({
      ...hasOwn(mpp, "max_per_request_usd") ? {
        maxPerRequestUsd: requiredNonNegativeNumber(
          mpp.max_per_request_usd,
          "payments.mpp.max_per_request_usd"
        )
      } : {},
      ...hasOwn(mpp, "max_settlement_seconds") ? {
        maxSettlementSeconds: requiredSettlementSeconds(
          mpp.max_settlement_seconds,
          "payments.mpp.max_settlement_seconds"
        )
      } : {},
      allowedHosts: parseAllowedHosts(mpp),
      expectedRecipient: hasOwn(mpp, "expected_recipient") ? requiredAddress(
        mpp.expected_recipient,
        "payments.mpp.expected_recipient"
      ) : null,
      expectedRealm: hasOwn(mpp, "expected_realm") ? requiredRealm(mpp.expected_realm, "payments.mpp.expected_realm") : null,
      merchants
    });
  }
};
function parseMerchants(mpp) {
  if (!hasOwn(mpp, "merchants")) return [];
  const table = requireTable(mpp.merchants, "payments.mpp.merchants");
  const merchants = [];
  for (const [name, raw] of Object.entries(table)) {
    const field = `payments.mpp.merchants.${name}`;
    const merchant = requireTable(raw, field);
    const domain = requiredHost(merchant.domain, `${field}.domain`);
    const realm = requiredRealm(merchant.realm, `${field}.realm`);
    const payTo = requiredAddress(merchant.pay_to, `${field}.pay_to`);
    const network = hasOwn(merchant, "network") ? requiredMerchantNetwork(merchant.network, `${field}.network`) : void 0;
    const asset = hasOwn(merchant, "asset") ? requiredAddress(merchant.asset, `${field}.asset`) : void 0;
    const perCallCapUsd = hasOwn(merchant, "per_call_cap_usd") ? requiredNonNegativeNumber(
      merchant.per_call_cap_usd,
      `${field}.per_call_cap_usd`
    ) : void 0;
    const verified = hasOwn(merchant, "verified") ? requiredBoolean(merchant.verified, `${field}.verified`) : false;
    merchants.push(
      Object.freeze({
        name,
        domain,
        realm,
        payTo,
        ...network !== void 0 ? { network } : {},
        ...asset !== void 0 ? { asset } : {},
        ...perCallCapUsd !== void 0 ? { perCallCapUsd } : {},
        verified
      })
    );
  }
  return merchants;
}
function parseAllowedHosts(mpp) {
  if (!hasOwn(mpp, "allowed_hosts")) return [];
  const raw = mpp.allowed_hosts;
  if (!Array.isArray(raw)) {
    throw new MppPolicyError(
      "payments.mpp.allowed_hosts must be an array of non-empty host strings"
    );
  }
  return raw.map(
    (host, index) => requiredHost(host, `payments.mpp.allowed_hosts[${index}]`)
  );
}
function requiredAddress(value, field) {
  if (typeof value !== "string" || value.trim() === "" || !isAddress(value)) {
    throw new MppPolicyError(`${field} must be a valid EVM address`);
  }
  return getAddress(value);
}
function requiredHost(value, field) {
  if (typeof value !== "string" || value === "" || value !== value.trim()) {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
  if (/\s/u.test(value)) {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
  return normalizeHost(value, field);
}
function requiredRealm(value, field) {
  return requiredString(value, field).toLowerCase();
}
function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new MppPolicyError(`${field} must be a non-empty string`);
  }
  return value.trim();
}
function requiredBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new MppPolicyError(`${field} must be a boolean`);
  }
  return value;
}
function requiredNonNegativeNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new MppPolicyError(`${field} must be a finite non-negative number`);
  }
  return value;
}
function requiredSettlementSeconds(value, field) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > MAX_MPP_SETTLEMENT_SECONDS) {
    throw new MppPolicyError(
      `${field} must be a safe integer between 1 and ${MAX_MPP_SETTLEMENT_SECONDS}`
    );
  }
  return value;
}
function requireTable(value, field) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MppPolicyError(`${field} must be a table`);
  }
  return value;
}
function hasOwn(table, key) {
  return Object.hasOwn(table, key);
}
function requireStringArray(value, field) {
  if (!Array.isArray(value)) {
    throw new MppPolicyError(`${field} must be an array of bare hostnames`);
  }
  return value;
}
function requireMerchantArray(value, field) {
  if (!Array.isArray(value)) {
    throw new MppPolicyError(`${field} must be an array of merchant objects`);
  }
  return value;
}
function uniqueHosts(values, field) {
  return [
    ...new Set(
      values.map((value, index) => requiredHost(value, `${field}[${index}]`))
    )
  ];
}
function normalizeHost(value, field) {
  if (value.startsWith("[") || value.endsWith("]")) {
    const inner = value.slice(1, -1);
    if (!value.startsWith("[") || !value.endsWith("]") || inner === "" || isIP(inner) !== 6) {
      throw new MppPolicyError(`${field} must be a bare normalized hostname`);
    }
    return canonicalUrlHost(value, field);
  }
  if (isIP(value) === 4) return canonicalUrlHost(value, field);
  if (value.includes(":") || /[/?#@*\\[\]]/u.test(value) || value.length > 253) {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
  const labels = value.split(".");
  if (labels.some(
    (label) => label.length === 0 || label.length > 63 || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/u.test(label)
  )) {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
  const canonical = canonicalUrlHost(value, field);
  if (canonical !== value.toLowerCase()) {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
  return canonical;
}
function canonicalUrlHost(value, field) {
  try {
    return new URL(`https://${value}`).hostname.toLowerCase();
  } catch {
    throw new MppPolicyError(`${field} must be a bare normalized hostname`);
  }
}
function normalizeMerchant(value, field) {
  if (!isRecord(value)) {
    throw new MppPolicyError(`${field} must be a merchant object`);
  }
  const name = requiredString(value.name, `${field}.name`);
  const domain = requiredHost(value.domain, `${field}.domain`);
  const realm = requiredRealm(value.realm, `${field}.realm`);
  const payTo = requiredAddress(value.payTo, `${field}.payTo`);
  const network = value.network === void 0 ? void 0 : requiredMerchantNetwork(value.network, `${field}.network`);
  const asset = value.asset === void 0 ? void 0 : requiredAddress(value.asset, `${field}.asset`);
  const perCallCapUsd = value.perCallCapUsd === void 0 ? void 0 : requiredNonNegativeNumber(
    value.perCallCapUsd,
    `${field}.perCallCapUsd`
  );
  const verified = requiredBoolean(value.verified, `${field}.verified`);
  return Object.freeze({
    name,
    domain,
    realm,
    payTo,
    ...network !== void 0 ? { network } : {},
    ...asset !== void 0 ? { asset } : {},
    ...perCallCapUsd !== void 0 ? { perCallCapUsd } : {},
    verified
  });
}
function requiredMerchantNetwork(value, field) {
  if (typeof value !== "string" || value === "" || value !== value.trim()) {
    throw new MppPolicyError(
      `${field} must be a supported canonical eip155 CAIP-2 network`
    );
  }
  const raw = value;
  const match = /^eip155:([1-9]\d*)$/u.exec(raw);
  if (match === null) {
    throw new MppPolicyError(
      `${field} must be a supported canonical eip155 CAIP-2 network`
    );
  }
  const chainId = Number(match[1]);
  if (!Number.isSafeInteger(chainId)) {
    throw new MppPolicyError(
      `${field} must be a supported canonical eip155 CAIP-2 network`
    );
  }
  const networkName = MPP_NETWORK_NAMES.find(
    (name) => getNetwork(name).chainId === chainId
  );
  if (networkName === void 0) {
    throw new MppPolicyError(
      `${field} must be a supported canonical eip155 CAIP-2 network`
    );
  }
  return `eip155:${getNetwork(networkName).chainId}`;
}
function mppNetworkNameFromCaip2(network) {
  const canonical = requiredMerchantNetwork(network, "merchant network");
  const chainId = Number(canonical.slice("eip155:".length));
  const networkName = MPP_NETWORK_NAMES.find(
    (name) => getNetwork(name).chainId === chainId
  );
  if (networkName === void 0) {
    throw new MppPolicyError("merchant network is not supported by Studio");
  }
  return networkName;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/mpp/buyer.ts
async function quoteMppUrl(url, options = {}) {
  const policy = resolvePolicy(options.policy);
  const allowedHosts = options.allowedHosts === void 0 ? policy.effectiveAllowedHosts : options.allowedHosts;
  assertTarget(url, allowedHosts, options.allowInsecureLoopback ?? false);
  assertRequestHeaders(options.headers);
  const networkName = options.networkName ?? "bsc-mainnet";
  const asset = resolveMppAsset(networkName, options.asset);
  const response = await requestOnce(url, options);
  const challenges = await nativeChallenges(response.clone());
  const selected = selectOffer(challenges, networkName, asset);
  if (response.status === 402 && selected === null) {
    throw mppUnavailableAssetError(challenges, networkName, asset);
  }
  const body = await readBody(response);
  return {
    url,
    statusCode: response.status,
    challenge: selected,
    challenges: challenges.map((challenge) => ({ ...challenge })),
    verifiedAlternatives: mppVerifiedAlternatives(
      challenges,
      networkName,
      asset
    ),
    content: body.content,
    json: body.json
  };
}
async function fetchMppWithPayment(url, options) {
  const paymentAttempt = mppPaymentAttempt(options.policy);
  const { policy, budgetTracker } = paymentAttempt;
  const allowedHosts = options.allowedHosts === void 0 ? policy.effectiveAllowedHosts : options.allowedHosts;
  assertTarget(url, allowedHosts, options.allowInsecureLoopback ?? false);
  assertRequestHeaders(options.headers);
  if (!Number.isFinite(options.maxUsd) || options.maxUsd <= 0) {
    throw new MppBudgetExceededError("maxUsd must be a positive number");
  }
  const merchant = policy.merchantForUrl(url);
  const maxUsd = Math.min(
    options.maxUsd,
    policy.maxPerRequestUsd,
    merchant?.perCallCapUsd ?? Number.POSITIVE_INFINITY
  );
  const networkName = options.networkName ?? networkNameFromMerchant(merchant);
  const network = getNetwork(networkName);
  const networkId = caip2(network.chainId);
  const token = resolveMppAsset(networkName, options.asset);
  if (!token.b402Methods.includes("eip3009")) {
    throw new MppUnsupportedWalletRouteError(
      `${token.symbol} is Permit2-only; the native MPP buyer does not enable Permit2 in this release`,
      { asset: mppAssetFacts(token) }
    );
  }
  assertWallet(options.wallet);
  const expectedRecipient = resolveExpectedRecipient(
    options.expectedRecipient,
    merchant,
    policy
  );
  const expectedRealm = resolveExpectedRealm(
    url,
    options.expectedRealm,
    merchant,
    policy
  );
  if (merchant?.network && merchant.network !== networkId) {
    throw new MppPaymentRequiredError(
      `trusted merchant network ${merchant.network} does not match ${networkId}`
    );
  }
  if (merchant?.asset && getAddress2(merchant.asset) !== getAddress2(token.address)) {
    throw new MppPaymentRequiredError(
      `trusted merchant asset ${merchant.asset} does not match selected ${token.address}`
    );
  }
  const maxAtomic = BigInt(
    usdToAtomic(decimalText(maxUsd, token.decimals), token.decimals)
  );
  const method = charge({
    account: walletAccount(options.wallet),
    methods: ["eip3009"],
    allowedNetworks: [networkId],
    allowedCurrencies: [
      {
        network: networkId,
        address: token.address,
        decimals: token.decimals
      }
    ],
    maxAtomicAmount: maxAtomic,
    maxSettlementSeconds: policy.maxSettlementSeconds
  });
  const paymentState = {
    selected: null,
    dispatched: false,
    reservedAmountUsd: null,
    budgetTracker: null,
    challenges: []
  };
  const baseFetch = options.fetchImpl ?? globalThis.fetch;
  const trackedFetch = async (input, init) => {
    const outgoing = new Request(input, init);
    if (/^Payment\s+/i.test(outgoing.headers.get("authorization") ?? "")) {
      paymentState.dispatched = true;
    }
    const signal = init?.signal ?? AbortSignal.timeout(options.timeoutMs ?? 3e4);
    const response2 = await baseFetch(input, { ...init, signal });
    if (response2.status === 402 && !paymentState.dispatched) {
      paymentState.challenges = await nativeChallenges(response2.clone());
    }
    return response2;
  };
  const client = Mppx.create({
    methods: [method],
    orderChallenges: method.prefer(["eip3009"]),
    maxPaymentRetries: 1,
    polyfill: false,
    fetch: trackedFetch,
    onChallenge: async (challenge, { createCredential }) => {
      try {
        paymentState.selected = offerFromChallenge(
          challenge,
          networkName,
          token
        );
      } catch (cause) {
        throw mppUnavailableAssetError([challenge], networkName, token, cause);
      }
      enforceTrust(
        paymentState.selected,
        expectedRecipient,
        expectedRealm,
        token,
        maxAtomic
      );
      const required = BigInt(paymentState.selected.amountAtomic);
      const current = await readMppBalance(
        options.wallet,
        options.assetReader,
        networkName,
        token
      );
      if (current < required) {
        const alternatives = await mppFundedAlternatives(
          paymentState.challenges,
          options.wallet,
          options.assetReader,
          networkName,
          token,
          expectedRecipient,
          expectedRealm,
          maxAtomic
        );
        throwMppInsufficientBalance(token, required, current, alternatives);
      }
      if (options.countDailyBudget !== false && !_isDailyCapCountedElsewhere()) {
        await budgetTracker.reserveUsd(
          paymentState.selected.amountUsd,
          null,
          "mpp_buy"
        );
        paymentState.reservedAmountUsd = paymentState.selected.amountUsd;
        paymentState.budgetTracker = budgetTracker;
      }
      return createCredential();
    }
  });
  let response;
  try {
    response = await client.fetch(url, requestInit(options));
  } catch (cause) {
    if (paymentState.dispatched) {
      throw new MppPaymentOutcomeUnknownError(
        "MPP payment credential was dispatched but no reliable response was received; do not retry automatically",
        { cause, amountUsd: paymentState.selected?.amountUsd ?? null }
      );
    }
    await rollbackUnsentBudget(paymentState);
    if (cause instanceof X402BudgetExhaustedError && cause.cause !== void 0) {
      throw new MppPaymentRequiredError(
        "MPP buyer refusing to sign because the spend ledger could not be safely reserved",
        { cause }
      );
    }
    if (cause instanceof Error && cause.message.startsWith("No method found for challenges")) {
      throw new MppPaymentRequiredError(
        "server returned 402 without a supported native MPP b402.charge challenge",
        { cause }
      );
    }
    throw cause;
  }
  let body;
  try {
    body = await readBody(response);
  } catch (cause) {
    if (paymentState.dispatched) {
      throw new MppPaymentOutcomeUnknownError(
        "MPP payment credential was dispatched but response body could not be read; do not retry automatically",
        { cause, amountUsd: paymentState.selected?.amountUsd ?? null }
      );
    }
    await rollbackUnsentBudget(paymentState);
    throw cause;
  }
  if (!paymentState.dispatched) {
    await rollbackUnsentBudget(paymentState);
    return {
      url,
      statusCode: response.status,
      content: body.content,
      json: body.json,
      paidUsd: null,
      paymentOutcome: "not-required",
      receipt: null,
      challenge: null,
      assetId: null,
      symbol: null,
      tokenAddress: null,
      decimals: null,
      amountAtomic: null
    };
  }
  const receipt = receiptFromResponse(response);
  const confirmed = receipt?.method === "b402" && receipt.status === "success";
  if (!confirmed) {
    throw new MppPaymentOutcomeUnknownError(
      "MPP payment credential was dispatched without a confirmed success receipt; do not retry automatically",
      { amountUsd: paymentState.selected?.amountUsd ?? null }
    );
  }
  return {
    url,
    statusCode: response.status,
    content: body.content,
    json: body.json,
    paidUsd: paymentState.selected?.amountUsd ?? null,
    paymentOutcome: "confirmed",
    receipt,
    challenge: paymentState.selected,
    assetId: paymentState.selected?.assetId ?? null,
    symbol: paymentState.selected?.symbol ?? null,
    tokenAddress: paymentState.selected?.asset ?? null,
    decimals: paymentState.selected?.decimals ?? null,
    amountAtomic: paymentState.selected?.amountAtomic ?? null
  };
}
async function rollbackUnsentBudget(state) {
  if (state.reservedAmountUsd === null || state.budgetTracker === null) return;
  await state.budgetTracker.rollbackUsd(state.reservedAmountUsd);
  state.reservedAmountUsd = null;
  state.budgetTracker = null;
}
function resolveMppAsset(networkName, reference) {
  const network = getNetwork(networkName);
  try {
    return network.resolveB402PaymentSymbol(reference?.trim() || "U");
  } catch (cause) {
    const raw = reference?.trim() || "U";
    throw new MppPaymentAssetUnavailableError(
      `payment asset ${raw} is not available on ${networkName}`,
      {
        cause,
        asset: {
          assetId: raw,
          symbol: raw,
          tokenAddress: null,
          addressPending: false,
          decimals: 0,
          retryHint: `--asset ${raw}`
        }
      }
    );
  }
}
function mppAssetFacts(asset) {
  return Object.freeze({
    assetId: asset.assetId,
    symbol: asset.symbol,
    tokenAddress: asset.address,
    addressPending: false,
    decimals: asset.decimals,
    retryHint: `--asset ${asset.symbol}`
  });
}
function mppUnavailableAssetError(challenges, networkName, selected, cause) {
  const network = getNetwork(networkName);
  const alternatives = network.b402Assets().filter(
    (asset) => asset.assetId !== selected.assetId && asset.b402Methods.includes("eip3009") && selectOffer(challenges, networkName, asset) !== null
  ).map(mppAssetFacts);
  return new MppPaymentAssetUnavailableError(
    `the endpoint does not offer ${selected.symbol} on ${networkName}`,
    { cause, asset: mppAssetFacts(selected), alternatives }
  );
}
function mppVerifiedAlternatives(challenges, networkName, selected) {
  return Object.freeze(
    getNetwork(networkName).b402Assets().filter(
      (asset) => asset.assetId !== selected.assetId && asset.b402Methods.includes("eip3009")
    ).map((asset) => selectOffer(challenges, networkName, asset)).filter((offer) => offer !== null)
  );
}
async function readMppBalance(wallet, reader, networkName, asset) {
  const request = {
    networkName,
    owner: getAddress2(wallet.address),
    tokenAddress: asset.address
  };
  let current;
  try {
    if (reader) current = await reader.balanceOf(request);
    else if (wallet.readTokenBalance)
      current = await wallet.readTokenBalance(request);
    else {
      const network = getNetwork(networkName);
      const client = createPublicClient({ transport: http(network.rpcUrl) });
      current = await client.readContract({
        address: asset.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [request.owner]
      });
    }
  } catch (cause) {
    throw new MppPaymentAssetBalanceUnavailableError(
      `could not verify ${asset.symbol} balance before payment`,
      { cause, asset: mppAssetFacts(asset) }
    );
  }
  return current;
}
function throwMppInsufficientBalance(asset, required, current, alternatives) {
  throw new MppInsufficientPaymentAssetBalanceError(
    `insufficient ${asset.symbol} balance; Studio did not switch assets or pay`,
    {
      asset: mppAssetFacts(asset),
      requiredAtomic: required.toString(),
      currentAtomic: current.toString(),
      requiredHuman: formatUnits(required, asset.decimals),
      currentHuman: formatUnits(current, asset.decimals),
      alternatives
    }
  );
}
async function mppFundedAlternatives(challenges, wallet, reader, networkName, selected, expectedRecipient, expectedRealm, maxAtomic) {
  const alternatives = [];
  for (const asset of getNetwork(networkName).b402Assets()) {
    if (asset.assetId === selected.assetId || !asset.b402Methods.includes("eip3009")) {
      continue;
    }
    const offer = selectOffer(challenges, networkName, asset);
    if (offer === null) continue;
    try {
      enforceTrust(offer, expectedRecipient, expectedRealm, asset, maxAtomic);
      const current = await readMppBalance(wallet, reader, networkName, asset);
      if (current < BigInt(offer.amountAtomic)) continue;
    } catch {
      continue;
    }
    alternatives.push(mppAssetFacts(asset));
  }
  return Object.freeze(alternatives);
}
function selectOffer(challenges, networkName, asset) {
  for (const challenge of challenges) {
    if (challenge.method !== "b402" || challenge.intent !== "charge") continue;
    try {
      return offerFromChallenge(challenge, networkName, asset);
    } catch {
    }
  }
  return null;
}
function offerFromChallenge(challenge, networkName, token) {
  if (challenge.method !== "b402" || challenge.intent !== "charge") {
    throw new MppPaymentRequiredError(
      `expected native MPP b402.charge challenge, got ${String(challenge.method)}.${String(challenge.intent)}`
    );
  }
  const request = asRecord(challenge.request);
  const details = asRecord(request.methodDetails);
  const network = String(details.network ?? "");
  const expectedNetwork = caip2(getNetwork(networkName).chainId);
  if (network !== expectedNetwork) {
    throw new MppPaymentRequiredError(
      `MPP challenge network ${network || "(missing)"} does not match ${expectedNetwork}`
    );
  }
  const amount = String(request.amount ?? "");
  if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) {
    throw new MppPaymentRequiredError(
      "MPP challenge amount must be positive atomic units"
    );
  }
  const currency = String(request.currency ?? "");
  const recipient = String(request.recipient ?? "");
  if (!isAddress2(currency) || getAddress2(currency) !== getAddress2(token.address)) {
    throw new MppPaymentRequiredError(
      `MPP challenge currency ${currency || "(missing)"} does not match selected ${token.symbol} on ${network}`
    );
  }
  if (!isAddress2(recipient)) {
    throw new MppPaymentRequiredError(
      "MPP challenge recipient is not an EVM address"
    );
  }
  const method = String(details.assetTransferMethod ?? "");
  if (method === "permit2-upto" || !token.b402Methods.includes(method) || method !== "eip3009" && method !== "permit2-exact") {
    throw new MppPaymentRequiredError(
      `MPP challenge transfer method ${method || "(missing)"} is not catalog-approved for ${token.symbol}`
    );
  }
  if (details.decimals !== token.decimals) {
    throw new MppPaymentRequiredError(
      `MPP challenge decimals ${String(details.decimals)} do not match buyer-owned token facts (${token.decimals})`
    );
  }
  if (method === "eip3009") {
    const eip712 = asRecord(details.eip712);
    if (eip712.name !== token.eip3009Domain?.name || eip712.version !== token.eip3009Domain?.version) {
      throw new MppPaymentRequiredError(
        "MPP challenge EIP-712 token domain does not match buyer-owned token facts"
      );
    }
  }
  if (!isAddress2(String(details.signerAddress ?? ""))) {
    throw new MppPaymentRequiredError("MPP challenge signerAddress is invalid");
  }
  const maxTimeoutSeconds = Number(details.maxTimeoutSeconds);
  if (!Number.isSafeInteger(maxTimeoutSeconds) || maxTimeoutSeconds <= 0) {
    throw new MppPaymentRequiredError(
      "MPP challenge maxTimeoutSeconds is invalid"
    );
  }
  const realm = String(challenge.realm ?? "").trim().toLowerCase();
  if (!realm)
    throw new MppPaymentRequiredError("MPP challenge realm is missing");
  return Object.freeze({
    challengeId: String(challenge.id ?? ""),
    realm,
    ...challenge.expires ? { expires: String(challenge.expires) } : {},
    network,
    asset: getAddress2(currency),
    assetId: token.assetId,
    symbol: token.symbol,
    recipient: getAddress2(recipient),
    transferMethod: method,
    amountAtomic: amount,
    amountUsd: Number(formatUnits(BigInt(amount), token.decimals)),
    decimals: token.decimals,
    maxTimeoutSeconds
  });
}
function enforceTrust(offer, expectedRecipient, expectedRealm, token, maxAtomic) {
  if (getAddress2(offer.recipient) !== expectedRecipient) {
    throw new MppRecipientMismatchError(
      `MPP recipient ${offer.recipient} does not match trusted recipient ${expectedRecipient}`
    );
  }
  if (offer.realm.toLowerCase() !== expectedRealm.toLowerCase()) {
    throw new MppRealmMismatchError(
      `MPP realm ${offer.realm} does not match trusted realm ${expectedRealm}`
    );
  }
  if (getAddress2(offer.asset) !== getAddress2(token.address)) {
    throw new MppPaymentRequiredError(
      "MPP asset changed after policy selection"
    );
  }
  if (BigInt(offer.amountAtomic) > maxAtomic) {
    throw new MppBudgetExceededError(
      `MPP charge demands $${offer.amountUsd.toFixed(6)} above the effective per-call cap`
    );
  }
}
function resolveExpectedRecipient(explicit, merchant, policy) {
  const raw = explicit || merchant?.payTo || policy.expectedRecipient;
  if (!raw || !isAddress2(raw)) {
    throw new MppRecipientRequiredError(
      "MPP buyer refusing to sign without a trusted recipient; use bag mpp trust or set [payments.mpp].expected_recipient"
    );
  }
  return getAddress2(raw);
}
function resolveExpectedRealm(url, explicit, merchant, policy) {
  return String(
    explicit || merchant?.realm || policy.expectedRealm || new URL(url).host
  ).trim().toLowerCase();
}
function networkNameFromMerchant(merchant) {
  if (!merchant?.network) return "bsc-mainnet";
  return mppNetworkNameFromCaip2(merchant.network);
}
function walletAccount(wallet) {
  return {
    address: getAddress2(wallet.address),
    type: "local",
    source: "custom",
    async signTypedData(parameters) {
      const signature = await wallet.signTypedData?.(
        asRecord(parameters.domain),
        parameters.types,
        asRecord(parameters.message)
      );
      const raw = typeof signature === "string" ? signature : String(asRecord(signature).signature ?? "");
      if (!/^0x[0-9a-fA-F]+$/.test(raw)) {
        throw new MppUnsupportedWalletError(
          "wallet returned an invalid EIP-712 signature"
        );
      }
      return raw;
    }
  };
}
function assertWallet(wallet) {
  if (!isAddress2(wallet.address)) {
    throw new MppUnsupportedWalletError("wallet address is invalid");
  }
  if (typeof wallet.signTypedData !== "function" || typeof wallet.supports === "function" && !wallet.supports("sign.typed_data")) {
    throw new MppUnsupportedWalletError(
      "MPP+B402 buying requires a wallet with sign.typed_data; delegated x402-only wallets such as twak are unsupported"
    );
  }
}
function assertTarget(url, allowedHosts, allowInsecureLoopback) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new MppHostNotAllowedError("MPP target must be an absolute URL");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    parsed.hostname.toLowerCase()
  );
  if (parsed.protocol !== "https:" && !(allowInsecureLoopback && loopback)) {
    throw new MppInsecureTransportError(
      "MPP target must use https; plain http is allowed only for explicit loopback development"
    );
  }
  if (allowedHosts !== null && !allowedHosts.map((host) => host.toLowerCase()).includes(parsed.hostname.toLowerCase())) {
    throw new MppHostNotAllowedError(
      `MPP buyer refusing '${parsed.hostname}' \u2014 not in allowed_hosts=${JSON.stringify(allowedHosts)}`
    );
  }
}
function assertRequestHeaders(headers) {
  const reserved = /* @__PURE__ */ new Set([
    "authorization",
    "accept-payment",
    "www-authenticate",
    "payment-receipt"
  ]);
  for (const name of Object.keys(headers ?? {})) {
    if (reserved.has(name.toLowerCase())) {
      throw new MppPaymentRequiredError(
        `caller may not set reserved MPP header ${name}`
      );
    }
  }
}
async function requestOnce(url, options) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  return fetchImpl(url, {
    ...requestInit(options),
    signal: AbortSignal.timeout(options.timeoutMs ?? 3e4)
  });
}
function requestInit(options) {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  let body;
  if (options.jsonBody !== void 0 && options.jsonBody !== null) {
    body = JSON.stringify(options.jsonBody);
    headers.set("Content-Type", "application/json");
  }
  return {
    method,
    headers,
    ...body !== void 0 ? { body } : {}
  };
}
async function nativeChallenges(response) {
  const transport = Transport.http();
  const all = transport.getChallenges ? await transport.getChallenges(response) : [await transport.getChallenge(response)];
  return all.filter(
    (challenge) => challenge.method === "b402" && challenge.intent === "charge"
  );
}
async function readBody(response) {
  const content = Buffer.from(await response.arrayBuffer());
  try {
    const parsed = JSON.parse(content.toString("utf8"));
    return {
      content,
      json: typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null
    };
  } catch {
    return { content, json: null };
  }
}
function receiptFromResponse(response) {
  try {
    return Receipt.fromResponse(response);
  } catch {
    return null;
  }
}
function decimalText(value, decimals) {
  return value.toFixed(decimals).replace(/(?:\.0+|(?:(\.\d*?)0+))$/, "$1");
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function mppPaymentConfigSource() {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) {
    return Object.freeze({ raw: null, projectRoot: null });
  }
  return Object.freeze({
    raw: loadStudioToml(join(projectRoot, STUDIO_TOML)),
    projectRoot
  });
}
function mppPaymentPolicySnapshot(explicit) {
  let source;
  try {
    source = mppPaymentConfigSource();
  } catch (cause) {
    throw new MppPaymentRequiredError(
      "MPP buyer refusing to pay because studio.toml could not be safely loaded",
      { cause }
    );
  }
  try {
    const policy = explicit === void 0 ? MppBuyerPolicy.fromToml(source.raw) : explicit ?? new MppBuyerPolicy();
    return Object.freeze({
      policy,
      budgetTrackerSnapshot: Object.freeze({
        dailyCapUsd: resolveDailyCapUsd(source.raw),
        projectRoot: source.projectRoot
      })
    });
  } catch (cause) {
    throw new MppPaymentRequiredError(
      "MPP buyer refusing to pay because studio.toml payment policy is invalid",
      { cause }
    );
  }
}
function mppPaymentAttempt(explicit) {
  const snapshot = mppPaymentPolicySnapshot(explicit);
  try {
    const budgetTracker = getSharedBudgetTracker(
      snapshot.budgetTrackerSnapshot
    );
    budgetTracker.preflightLedger();
    return Object.freeze({
      ...snapshot,
      budgetTracker
    });
  } catch (cause) {
    throw new MppPaymentRequiredError(
      "MPP buyer refusing to pay because studio.toml spend ledger could not be safely initialized",
      { cause }
    );
  }
}
function resolvePolicy(explicit) {
  if (explicit !== void 0) return explicit ?? new MppBuyerPolicy();
  let loaded;
  try {
    loaded = loadStudioToml();
  } catch (cause) {
    if (cause instanceof StudioTomlNotFoundError) {
      return new MppBuyerPolicy();
    }
    throw new MppPaymentRequiredError(
      "MPP buyer refusing to pay because studio.toml could not be safely loaded",
      { cause }
    );
  }
  try {
    return MppBuyerPolicy.fromToml(loaded);
  } catch (cause) {
    throw new MppPaymentRequiredError(
      "MPP buyer refusing to pay because studio.toml payment policy is invalid",
      { cause }
    );
  }
}
export {
  DEFAULT_MPP_MAX_PER_REQUEST_USD,
  DEFAULT_MPP_MAX_SETTLEMENT_SECONDS,
  MppBudgetExceededError,
  MppBuyerPolicy,
  MppError,
  MppHostNotAllowedError,
  MppInsecureTransportError,
  MppInsufficientPaymentAssetBalanceError,
  MppPaymentAssetBalanceUnavailableError,
  MppPaymentAssetUnavailableError,
  MppPaymentOutcomeUnknownError,
  MppPaymentRequiredError,
  MppPolicyError,
  MppRealmMismatchError,
  MppRecipientMismatchError,
  MppRecipientRequiredError,
  MppUnsupportedWalletError,
  MppUnsupportedWalletRouteError,
  fetchMppWithPayment,
  quoteMppUrl
};
