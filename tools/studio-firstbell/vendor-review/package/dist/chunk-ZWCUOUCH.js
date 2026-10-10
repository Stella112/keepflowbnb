import {
  X402AssetMismatchError,
  X402BudgetExhaustedError,
  X402BuyerPolicy,
  X402HostNotAllowedError,
  X402InsufficientPaymentAssetAllowanceError,
  X402InsufficientPaymentAssetBalanceError,
  X402PaymentAssetBalanceUnavailableError,
  X402PaymentAssetUnavailableError,
  X402PaymentOutcomeUnknownError,
  X402PaymentRequiredError,
  X402RecipientRequiredError,
  X402RetryExhaustedError,
  X402UnsupportedWalletError,
  X402UnsupportedWalletRouteError,
  getSharedBudgetTracker,
  merchantPinnedAssets,
  resolveDailyCapUsd
} from "./chunk-JOGM5MYC.js";
import {
  fromRaw,
  getNetwork,
  toRaw
} from "./chunk-YQUACLG3.js";
import {
  STUDIO_TOML,
  StudioTomlNotFoundError,
  findProjectRoot,
  loadStudioToml
} from "./chunk-AHE5Y6SQ.js";

// src/pieverse/client.ts
import { AsyncLocalStorage } from "async_hooks";
var PIEVERSE_BASE_URL = "https://llm.pieverse.io";
var PIEVERSE_TOPUP_PATH = "/v1/topup/x402";
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
var PieverseKeyNotFoundError = class extends PieverseError {
  constructor(keyHash, message, opts) {
    super(message ?? `Pieverse key not found: ${keyHash}`, opts);
    this.keyHash = keyHash;
    this.name = "PieverseKeyNotFoundError";
  }
  keyHash;
};
var PieverseBudgetExhaustedError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseBudgetExhaustedError";
  }
};
var PieverseAccountBalanceExhaustedError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseAccountBalanceExhaustedError";
  }
};
var PieversePaymentRequiredError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieversePaymentRequiredError";
  }
};
var PieverseColdStartTopupBlockedError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseColdStartTopupBlockedError";
  }
};
var PieverseTopupCapExceededError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseTopupCapExceededError";
  }
};
var PieverseTopupWalletPasswordMissingError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseTopupWalletPasswordMissingError";
  }
};
var PieverseBudgetNotAcknowledgedError = class extends PieverseError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "PieverseBudgetNotAcknowledgedError";
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
var RetryPolicy = class {
  maxRetries;
  delaySeconds;
  onRetry;
  attempts = 0;
  constructor(opts = {}) {
    this.maxRetries = opts.maxRetries ?? 3;
    this.delaySeconds = opts.delaySeconds ?? 5;
    this.onRetry = opts.onRetry ?? null;
  }
};
var retryPolicyStore = new AsyncLocalStorage();
function retrying(policy, fn) {
  return Promise.resolve(retryPolicyStore.run(policy, fn));
}
function isRetryableStatus(statusCode) {
  return statusCode >= 500;
}
function sleepSeconds(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
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
async function request(client, method, path, opts = {}) {
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
import { AsyncLocalStorage as AsyncLocalStorage2 } from "async_hooks";
import { randomBytes } from "crypto";
import { join } from "path";
import { B402_PERMIT2_ADDRESS, CURATED_B402_SPENDERS } from "@bnb-chain/b402";
import { X402Signer } from "@bnbagent/sdk";
import {
  X402RecipientMismatchError,
  resolveExpectedEip3009Route
} from "@bnbagent/sdk/x402";
import {
  decodePaymentRequiredHeader,
  decodePaymentResponseHeader
} from "@x402/core/http";
import {
  http,
  createPublicClient,
  erc20Abi,
  formatUnits,
  getAddress,
  isAddress
} from "viem";
var PERMIT2_ADDRESS = getAddress(B402_PERMIT2_ADDRESS);
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
var dailyCapMarker = new AsyncLocalStorage2();
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
    raw: loadStudioToml(join(projectRoot, STUDIO_TOML)),
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
      normalizedMerchant = getAddress(merchantPayTo);
    } catch {
      throw new X402RecipientMismatchError(
        "trusted merchant recipient is not a valid EVM address"
      );
    }
    if (expectedTo?.trim()) {
      let normalizedExpected;
      try {
        normalizedExpected = getAddress(expectedTo.trim());
      } catch {
        throw new X402RecipientMismatchError(
          "explicit x402 recipient is not a valid EVM address"
        );
      }
      if (normalizedExpected !== normalizedMerchant) {
        throw new X402RecipientMismatchError(
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
    pinned = configured.map((entry) => getAddress(entry));
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
  const request2 = {
    networkName,
    owner: getAddress(wallet.address),
    tokenAddress: asset.address
  };
  try {
    if (reader) return await reader.balanceOf(request2);
    if (wallet.readTokenBalance) return await wallet.readTokenBalance(request2);
    const network = getNetwork(networkName);
    const client = createPublicClient({ transport: http(network.rpcUrl) });
    return await client.readContract({
      address: asset.address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [request2.owner]
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
      requiredHuman: formatUnits(required, asset.decimals),
      currentHuman: formatUnits(current, asset.decimals),
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
      requiredHuman: formatUnits(required, asset.decimals),
      currentHuman: formatUnits(current, asset.decimals),
      alternatives: verifiedAlternatives
    }
  );
}
async function resolveAlternatives(alternatives) {
  if (typeof alternatives === "function") return alternatives();
  return alternatives ?? [];
}
async function readAssetAllowance(wallet, reader, networkName, asset) {
  const request2 = {
    networkName,
    owner: getAddress(wallet.address),
    tokenAddress: asset.address,
    spender: PERMIT2_ADDRESS
  };
  let current;
  try {
    if (reader?.allowance) current = await reader.allowance(request2);
    else if (wallet.readTokenAllowance)
      current = await wallet.readTokenAllowance(request2);
    else {
      const network = getNetwork(networkName);
      const client = createPublicClient({ transport: http(network.rpcUrl) });
      current = await client.readContract({
        address: asset.address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [request2.owner, request2.spender]
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
  const record = cloned;
  if (typeof record.url !== "string" || record.url.trim() === "" || record.url !== requestedUrl || record.description !== void 0 && typeof record.description !== "string" || record.mimeType !== void 0 && typeof record.mimeType !== "string") {
    return null;
  }
  return record;
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
    trustedPayTo = getAddress(expectedTo);
    assertMerchantAsset(merchant ?? null, asset);
  } catch {
    return null;
  }
  const amountUsd = Number.parseFloat(fromRaw(option.amount, asset.decimals));
  if (resource === null || quote.raw.x402Version !== 2 || option.network !== networkId || option.scheme !== "exact" || option.asset.toLowerCase() !== asset.address.toLowerCase() || option.amount <= 0n || !Number.isFinite(amountUsd) || amountUsd <= 0 || !isAddress(option.payTo) || getAddress(option.payTo) !== trustedPayTo || !Number.isSafeInteger(option.maxTimeoutSeconds) || option.maxTimeoutSeconds === null || option.maxTimeoutSeconds <= 0 || option.maxTimeoutSeconds > 3600 || method === "permit2-upto" || !asset.b402Methods.includes(method) || !payerSupportsExactMethod(capability, method)) {
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
    payTo: getAddress(option.payTo),
    maxTimeoutSeconds: option.maxTimeoutSeconds,
    resource
  };
  if (method === "eip3009") {
    if (!eip3009DomainMatchesCatalog(raw, asset)) return null;
    const expected = resolveExpectedEip3009Route(
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
  const trustedSpender = CURATED_B402_SPENDERS[networkId]?.exact;
  if (extra === null || kind === void 0 || trustedSpender === void 0 || extra.assetTransferMethod !== "permit2-exact" || extra.name !== kind.name || extra.version !== kind.version || typeof extra.signerAddress !== "string" || !isAddress(extra.signerAddress) || typeof extra.spenderAddress !== "string" || !isAddress(extra.spenderAddress) || getAddress(extra.spenderAddress) !== getAddress(trustedSpender)) {
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
      spenderAddress: getAddress(trustedSpender),
      trustedSpenders: [getAddress(trustedSpender)]
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
    payTo = getAddress(String(accepted.payTo));
    normalizedExpectedTo = getAddress(expectedTo);
  } catch {
    throw new X402RecipientMismatchError(
      "x402 accepted payTo or trusted recipient is not a valid EVM address"
    );
  }
  if (payTo !== normalizedExpectedTo) {
    throw new X402RecipientMismatchError(
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
    expectedRoute: resolveExpectedEip3009Route(network.chainId, token.assetId),
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
  const nonceHex = `0x${randomBytes(32).toString("hex")}`;
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
  const signer = new X402Signer(
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
      return decodePaymentRequiredHeader(encoded);
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
    const settlement = decodePaymentResponseHeader(encoded);
    return {
      transaction: settlement.transaction,
      network: settlement.network
    };
  }
  return void 0;
}
var defaultSleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
var sleep = defaultSleep;
function _setSleep(fn) {
  sleep = fn ?? defaultSleep;
}
async function fetchWithPayment(url, opts) {
  return fetchWithPaymentInternal(url, opts, false);
}
async function _fetchPieverseTopup(url, opts) {
  if (url !== `${PIEVERSE_BASE_URL}${PIEVERSE_TOPUP_PATH}` || opts.method !== "POST" || !Number.isFinite(opts.maxUsd) || opts.maxUsd <= 0 || opts.jsonBody?.amountUsd !== opts.maxUsd || !opts.expectedTo?.trim()) {
    throw new X402PaymentRequiredError("Invalid authorized Pieverse recharge.");
  }
  return fetchWithPaymentInternal(
    url,
    { ...opts, allowedHosts: [new URL(PIEVERSE_BASE_URL).hostname] },
    true
  );
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

export {
  PIEVERSE_BASE_URL,
  PIEVERSE_TOPUP_PATH,
  DEFAULT_TIMEOUT_SECONDS,
  PieverseError,
  PieverseAuthError,
  PieverseKeyNotFoundError,
  PieverseBudgetExhaustedError,
  PieverseAccountBalanceExhaustedError,
  PieversePaymentRequiredError,
  PieverseColdStartTopupBlockedError,
  PieverseTopupCapExceededError,
  PieverseTopupWalletPasswordMissingError,
  PieverseBudgetNotAcknowledgedError,
  makeClient,
  _raiseForStatus,
  RetryPolicy,
  retrying,
  request,
  EIP3009_TYPES,
  buildXPaymentHeader,
  dailyCapCountedElsewhere,
  _isDailyCapCountedElsewhere,
  _parseAccepted,
  _parseAcceptedExactRoute,
  _checkHost,
  _setConfigLoader,
  _setSleep,
  fetchWithPayment,
  _fetchPieverseTopup,
  payChallenge,
  quoteUrl,
  SELLER_TOKENS,
  caip2,
  usdToAtomic,
  sellerMoneyParser,
  sellerTokenExtras
};
