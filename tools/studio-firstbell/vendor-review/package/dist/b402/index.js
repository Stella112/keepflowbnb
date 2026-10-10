import {
  B402SellerPolicy,
  MPP_MAX_TIMEOUT_SECONDS,
  X402Seller,
  _resetB402ReplayStore,
  _setB402ReplayStore,
  b402ReconciliationKey,
  b402SettlementRequestDigest,
  createB402SettlementUnknownHandler,
  createEnvelopeMiddleware,
  resolveB402ReplayStore,
  resolveB402Transport,
  resolveX402SettlementAsset,
  workFailureSummary,
  x402SellerState
} from "../chunk-NODAFSUU.js";
import {
  auditedOp
} from "../chunk-7LTTKMY5.js";
import {
  X402SellerConfigError
} from "../chunk-JOGM5MYC.js";
import {
  createSellerCapabilityManager
} from "../chunk-J3PCEUK6.js";
import {
  resolveSellerPolicy
} from "../chunk-NX5R2NBY.js";
import {
  b402UsdPriceToAtomic,
  getNetwork
} from "../chunk-YQUACLG3.js";
import {
  findProjectRoot,
  loadStudioToml
} from "../chunk-AHE5Y6SQ.js";

// src/b402/mppSeller.ts
import { AsyncLocalStorage } from "async_hooks";
import {
  isEip3009PaymentPayload,
  isPermit2PaymentPayload,
  parseSettleResult,
  recoverEip3009Payer
} from "@bnb-chain/b402";
import {
  B402Error,
  B402SettlementUnknownError
} from "@bnb-chain/b402/server";
import { b402 } from "@bnb-chain/mpp-b402/server";
import { Credential, Receipt } from "mppx";
import { Mppx } from "mppx/server";
import { getAddress } from "viem";
var MPP_SELL_PATH = "/mpp";
var settlementAttempt = new AsyncLocalStorage();
var MPP_CHALLENGE_TTL_MS = 5 * 6e4;
var MPP_HANDLER_RETENTION_MS = MPP_CHALLENGE_TTL_MS + 6e4;
var MPP_HANDLER_CACHE_MAX = 256;
var UNAVAILABLE_SUPPORTED_TRANSPORT = Object.freeze({
  async supported() {
    throw new Error("B402 supported-capability transport unavailable");
  }
});
var MppSeller = class _MppSeller {
  #policy;
  #capabilities;
  #runtime;
  #resourceUrl;
  #runWork;
  #routeCache = /* @__PURE__ */ new Map();
  constructor(options) {
    this.#policy = options.policy;
    this.#capabilities = options.capabilities;
    this.#runtime = options.runtime;
    this.#resourceUrl = options.resourceUrl;
    this.#runWork = options.runWork;
  }
  get state() {
    return x402SellerState(
      this.#policy.enabled,
      this.#capabilities.currentSnapshot()
    );
  }
  capabilitySnapshot() {
    return this.#capabilities.currentSnapshot();
  }
  capabilityStatus() {
    return this.state;
  }
  refreshCapabilities() {
    return this.#capabilities.freshSnapshot();
  }
  stop() {
    this.#capabilities.stop();
    this.#routeCache.clear();
  }
  static async create(options) {
    const cfg = options.cfg ?? loadStudioToml();
    const policy = B402SellerPolicy.fromToml(cfg);
    const networkTable = asTable(cfg.network);
    const networkName = String(
      options.networkName ?? networkTable.default ?? "bsc-testnet"
    );
    const network = getNetwork(networkName);
    const payTo = getAddress(policy.payTo ?? options.walletAddress);
    const projectRoot = findProjectRoot() ?? process.cwd();
    const resolved = resolveSellerPolicy(cfg, "b402", {
      network: networkName
    });
    if (resolved.policy.price.kind !== "usd" || resolved.policy.price.value !== policy.priceUsd) {
      throw new Error("MPP+B402 seller policy price resolution mismatch");
    }
    const env = options.env ?? process.env;
    let transport = null;
    let runtime = null;
    if (policy.enabled && !isZeroPrice(policy.priceUsd)) {
      try {
        transport = resolveB402Transport(env);
        const secretKey = env.MPP_SECRET_KEY?.trim();
        const realm = env.MPP_REALM?.trim();
        if (transport && secretKey && Buffer.byteLength(secretKey, "utf8") >= 32 && realm) {
          runtime = Object.freeze({
            transport,
            replayStore: resolveB402ReplayStore({
              env,
              ...options.replayStore ? { replayStore: options.replayStore } : {}
            }),
            secretKey,
            realm,
            payTo,
            projectRoot,
            networkName,
            chainId: network.chainId
          });
        }
      } catch (error) {
        if (!isDormantConfigurationError(error)) throw error;
        console.warn(
          `[mpp] ${error instanceof Error ? error.message : String(error)}; paid MPP rail will remain dormant.`
        );
        transport = null;
        runtime = null;
      }
    }
    const capabilities = createSellerCapabilityManager({
      network: networkName,
      assets: resolved.policy.assets,
      priceUsd: policy.priceUsd,
      erc8183: { enabled: false },
      b402: policy.enabled && (isZeroPrice(policy.priceUsd) || runtime !== null) ? {
        enabled: true,
        transport: transport ?? UNAVAILABLE_SUPPORTED_TRANSPORT
      } : policy.enabled ? {
        enabled: true,
        transport: UNAVAILABLE_SUPPORTED_TRANSPORT
      } : { enabled: false }
    });
    await capabilities.start();
    return new _MppSeller({
      policy,
      capabilities,
      runtime,
      resourceUrl: options.resourceUrl,
      runWork: options.runWork
    });
  }
  async handle(request) {
    if (this.state === "disabled") {
      return jsonResponse(404, { error: "MPP seller disabled" });
    }
    const prompt = promptFrom(request).trim();
    if (isZeroPrice(this.#policy.priceUsd)) {
      if (!prompt) return missingPromptResponse();
      return runFreeWork(
        this.#runWork,
        prompt,
        this.#policy.workTimeoutSeconds
      );
    }
    if (hasPaymentCredential(request.headers) && !prompt) {
      return missingPromptResponse();
    }
    const runtime = this.#runtime;
    const snapshot = await this.#capabilities.freshSnapshot();
    const current = runtime === null ? [] : await this.#handlersForSnapshot(snapshot, runtime);
    const input = toRequest(request, this.#resourceUrl);
    const hasCredential = hasPaymentCredential(request.headers);
    const selectedRoute = hasCredential ? this.#routeForCredential(input) : null;
    const selected = hasCredential ? selectedRoute?.handler ?? null : current.length > 0 ? Mppx.compose(...current.map((route) => route.handler)) : null;
    if (selected === null) {
      return hasCredential ? jsonResponse(402, {
        error: "MPP credential does not match an issued active route"
      }) : jsonResponse(503, {
        error: "MPP rail dormant: no active B402 payment route"
      });
    }
    let payment;
    const attempt = { unknown: false };
    try {
      payment = await settlementAttempt.run(attempt, () => selected(input));
    } catch (error) {
      if (error instanceof B402SettlementUnknownError) {
        return jsonResponse(500, {
          error: "settlement outcome unknown; reconciliation required"
        });
      }
      if (error instanceof B402Error) {
        return jsonResponse(502, { error: "B402 facilitator unavailable" });
      }
      return jsonResponse(500, { error: "MPP seller failed" });
    }
    if (attempt.unknown) {
      return jsonResponse(500, {
        error: "settlement outcome unknown; reconciliation required"
      });
    }
    if (payment.status === 402) return fromResponse(payment.challenge);
    if (selectedRoute === null) {
      return jsonResponse(500, { error: "MPP paid route binding unavailable" });
    }
    if (!prompt) return missingPromptResponse();
    const receiptProbe = payment.withReceipt(new Response(null));
    const receipt = Receipt.fromResponse(receiptProbe);
    try {
      const result = await withTimeout(
        this.#runWork({
          prompt,
          ...receipt.payer ? { payer: getAddress(receipt.payer) } : {}
        }),
        this.#policy.workTimeoutSeconds
      );
      return fromResponse(
        withTrustedAssetReceipt(
          payment,
          new Response(JSON.stringify({ result }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }),
          selectedRoute.binding
        )
      );
    } catch (error) {
      console.error(
        "MPP seller work failed after settlement",
        workFailureSummary(error)
      );
      return fromResponse(
        withTrustedAssetReceipt(
          payment,
          new Response(
            JSON.stringify({
              error: "work failed after settlement; payment retained",
              transaction: receipt.reference
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" }
            }
          ),
          selectedRoute.binding
        )
      );
    }
  }
  async #handlersForSnapshot(snapshot, runtime) {
    if (snapshot.network !== runtime.networkName || snapshot.rails.b402.free || snapshot.rails.b402.status === "dormant" || !snapshot.rails.b402.enabled) {
      this.#pruneRouteCache(/* @__PURE__ */ new Set());
      return [];
    }
    const network = getNetwork(runtime.networkName);
    const bindings = snapshot.rails.b402.assets.flatMap((asset) => {
      if (!asset.active) return [];
      const catalogAsset = network.b402Asset(asset.assetId);
      if (asset.address !== catalogAsset.address || asset.decimals !== catalogAsset.decimals) {
        throw new Error(`MPP capability metadata drift for ${asset.assetId}`);
      }
      const amount = b402UsdPriceToAtomic(
        runtime.networkName,
        asset.assetId,
        this.#policy.priceUsd
      ).toString();
      return asset.b402Routes.map((route) => {
        if (route.assetId !== asset.assetId || route.network !== `eip155:${runtime.chainId}` || !asset.activeMethods.includes(route.method)) {
          throw new Error(`MPP capability route drift for ${asset.assetId}`);
        }
        return Object.freeze({
          assetId: catalogAsset.assetId,
          symbol: catalogAsset.symbol,
          amount,
          priceUsd: this.#policy.priceUsd,
          currency: catalogAsset.address,
          recipient: runtime.payTo,
          method: route.method,
          decimals: catalogAsset.decimals,
          name: route.name,
          version: route.version,
          network: route.network,
          signerAddress: route.signerAddress,
          spenderAddress: route.spenderAddress
        });
      });
    });
    const currentFingerprints = new Set(bindings.map(routeFingerprint));
    this.#pruneRouteCache(currentFingerprints);
    const routes = [];
    for (const binding of bindings) {
      const fingerprint = routeFingerprint(binding);
      let route = this.#routeCache.get(fingerprint);
      if (route === void 0) {
        route = await this.#createRoute(runtime, fingerprint, binding);
        this.#routeCache.set(fingerprint, route);
      }
      route.retainUntil = Math.max(
        route.retainUntil,
        Date.now() + MPP_HANDLER_RETENTION_MS
      );
      routes.push(route);
    }
    this.#enforceCacheBound(currentFingerprints);
    return Object.freeze(routes);
  }
  async #createRoute(runtime, fingerprint, binding) {
    const audited = new AuditedB402Transport(runtime.transport, {
      chainId: runtime.chainId,
      networkName: runtime.networkName,
      payTo: runtime.payTo,
      priceUsd: this.#policy.priceUsd,
      projectRoot: runtime.projectRoot,
      resourceUrl: this.#resourceUrl
    });
    const client = new SnapshotMppTransport(audited, binding);
    const recordSettlementUnknown = createB402SettlementUnknownHandler({
      protocol: "mpp",
      networkName: runtime.networkName,
      chainId: runtime.chainId,
      payTo: runtime.payTo,
      projectRoot: runtime.projectRoot
    });
    const method = await b402.charge({
      client,
      network: binding.network,
      currency: {
        address: binding.currency,
        decimals: binding.decimals,
        name: binding.name,
        version: binding.version
      },
      recipient: binding.recipient,
      store: runtime.replayStore,
      maxTimeoutSeconds: MPP_MAX_TIMEOUT_SECONDS,
      transferMethods: [binding.method],
      ...this.#policy.bazaar ? { bazaar: this.#policy.bazaar } : {},
      onSettlementUnknown: (event) => {
        recordSettlementUnknown(event);
        const attempt = settlementAttempt.getStore();
        if (attempt) attempt.unknown = true;
      }
    });
    const payments = Mppx.create({
      methods: [method],
      secretKey: runtime.secretKey,
      realm: runtime.realm
    });
    return {
      fingerprint,
      binding,
      handler: payments.b402.charge({
        amount: this.#policy.priceUsd,
        transferMethod: binding.method
      }),
      createdAt: Date.now(),
      retainUntil: Date.now() + MPP_HANDLER_RETENTION_MS
    };
  }
  #routeForCredential(request) {
    const authorization = request.headers.get("authorization");
    const serialized = authorization ? Credential.extractPaymentScheme(authorization) : null;
    if (serialized === null) return null;
    let challengeRequest;
    try {
      challengeRequest = Credential.deserialize(serialized).challenge.request;
    } catch {
      return null;
    }
    const now = Date.now();
    const matches = [...this.#routeCache.values()].filter(
      (route) => route.retainUntil >= now && routeBindingMatches(route.binding, challengeRequest)
    );
    return matches.length === 1 ? matches[0] ?? null : null;
  }
  #pruneRouteCache(current) {
    const now = Date.now();
    for (const [fingerprint, route] of this.#routeCache) {
      if (!current.has(fingerprint) && route.retainUntil < now) {
        this.#routeCache.delete(fingerprint);
      }
    }
  }
  #enforceCacheBound(current) {
    if (this.#routeCache.size <= MPP_HANDLER_CACHE_MAX) return;
    const removable = [...this.#routeCache.values()].filter((route) => !current.has(route.fingerprint)).sort((a, b) => a.createdAt - b.createdAt);
    for (const route of removable) {
      if (this.#routeCache.size <= MPP_HANDLER_CACHE_MAX) break;
      this.#routeCache.delete(route.fingerprint);
    }
  }
};
function routeFingerprint(binding) {
  return JSON.stringify([
    binding.assetId,
    binding.network,
    binding.currency.toLowerCase(),
    binding.amount,
    binding.recipient.toLowerCase(),
    binding.method,
    binding.decimals,
    binding.name,
    binding.version,
    binding.signerAddress.toLowerCase(),
    binding.spenderAddress?.toLowerCase() ?? null
  ]);
}
function withTrustedAssetReceipt(payment, response, binding) {
  const wrapped = payment.withReceipt(response);
  const upstream = Receipt.fromResponse(wrapped);
  const receipt = Receipt.from({
    ...upstream,
    assetId: binding.assetId,
    symbol: binding.symbol,
    tokenAddress: binding.currency,
    decimals: binding.decimals,
    amountAtomic: binding.amount,
    priceUsd: binding.priceUsd
  });
  const headers = new Headers(wrapped.headers);
  headers.set("Payment-Receipt", Receipt.serialize(receipt));
  return new Response(wrapped.body, {
    status: wrapped.status,
    statusText: wrapped.statusText,
    headers
  });
}
function routeBindingMatches(binding, candidate) {
  if (!isRecord(candidate) || !isRecord(candidate.methodDetails)) return false;
  const details = candidate.methodDetails;
  const eip712 = details.eip712;
  if (!isRecord(eip712)) return false;
  return candidate.amount === binding.amount && sameAddress(candidate.currency, binding.currency) && sameAddress(candidate.recipient, binding.recipient) && details.assetTransferMethod === binding.method && details.decimals === binding.decimals && eip712.name === binding.name && eip712.version === binding.version && details.maxTimeoutSeconds === MPP_MAX_TIMEOUT_SECONDS && details.network === binding.network && details.protocolVersion === 1 && sameAddress(details.signerAddress, binding.signerAddress) && (binding.spenderAddress === null ? details.spenderAddress === void 0 : sameAddress(details.spenderAddress, binding.spenderAddress));
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function sameAddress(value, expected) {
  return typeof value === "string" && value.toLowerCase() === expected.toLowerCase();
}
var SnapshotMppTransport = class {
  #inner;
  #binding;
  constructor(inner, binding) {
    this.#inner = inner;
    this.#binding = binding;
  }
  async supported() {
    return {
      extensions: [],
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: this.#binding.network,
          extra: {
            assetTransferMethod: this.#binding.method,
            name: this.#binding.name,
            version: this.#binding.version,
            signerAddress: this.#binding.signerAddress,
            ...this.#binding.spenderAddress === null ? {} : { spenderAddress: this.#binding.spenderAddress }
          }
        }
      ],
      signers: {
        [this.#binding.network]: [this.#binding.signerAddress]
      }
    };
  }
  verify(request) {
    return this.#inner.verify(request);
  }
  settle(request) {
    return this.#inner.settle(request);
  }
};
var AuditedB402Transport = class {
  #inner;
  #audit;
  constructor(inner, audit) {
    this.#inner = inner;
    this.#audit = audit;
  }
  supported() {
    return this.#inner.supported();
  }
  verify(request) {
    return this.#inner.verify(request);
  }
  async settle(request) {
    const payload = request.paymentPayload;
    const payer = isEip3009PaymentPayload(payload) ? getAddress(await recoverEip3009Payer(payload)) : isPermit2PaymentPayload(payload) ? getAddress(payload.payload.permit2Authorization.from) : null;
    const nonce = isEip3009PaymentPayload(payload) ? payload.payload.authorization.nonce : isPermit2PaymentPayload(payload) ? payload.payload.permit2Authorization.nonce : "unknown";
    const transferMethod = isEip3009PaymentPayload(payload) ? "eip3009" : isPermit2PaymentPayload(payload) ? "permit2-exact" : "unknown";
    const selected = resolveX402SettlementAsset(
      this.#audit.networkName,
      request.paymentRequirements
    );
    const decimals = getNetwork(this.#audit.networkName).b402Asset(
      selected.assetId
    ).decimals;
    const requestDigest = b402SettlementRequestDigest(request, {
      payer: payer ?? "unknown",
      nonce,
      transferMethod
    });
    const reconciliationKey = b402ReconciliationKey({
      protocol: "mpp",
      network: request.paymentRequirements.network,
      tokenAddress: selected.tokenAddress,
      payer: payer ?? "unknown",
      nonce,
      transferMethod,
      requestDigest
    });
    try {
      return await auditedOp(
        "mpp_sell",
        {
          actor: "agent",
          chainId: this.#audit.chainId,
          asset: selected.assetId,
          amount: selected.amountAtomic,
          agentAddr: this.#audit.payTo,
          counterparty: payer,
          context: {
            resource: this.#audit.resourceUrl,
            nonce,
            network: request.paymentRequirements.network,
            transfer_method: transferMethod,
            price_usd: this.#audit.priceUsd,
            asset_symbol: selected.symbol,
            token_address: selected.tokenAddress,
            decimals,
            amount_atomic: selected.amountAtomic,
            reconciliation_key: reconciliationKey,
            request_sha256: requestDigest,
            request_ref: `sha256:${requestDigest}`
          },
          projectRoot: this.#audit.projectRoot
        },
        async (handle) => {
          const result = parseSettleResult(await this.#inner.settle(request));
          if (!result.success) throw new RejectedSettlementResult(result);
          assertSettlementMatches(result, request, payer);
          handle.txHash = result.transaction;
          return result;
        }
      );
    } catch (error) {
      if (error instanceof RejectedSettlementResult) return error.result;
      throw error;
    }
  }
};
var RejectedSettlementResult = class extends Error {
  result;
  constructor(result) {
    super(
      result.errorMessage ?? result.errorReason ?? "B402 settlement rejected"
    );
    this.name = "RejectedSettlementResult";
    this.result = result;
  }
};
function assertSettlementMatches(result, request, payer) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(result.transaction)) {
    throw new Error("B402 settlement returned an invalid transaction hash");
  }
  if (result.amount !== request.paymentRequirements.amount) {
    throw new Error("B402 settlement returned an unexpected amount");
  }
  if (result.network !== request.paymentRequirements.network) {
    throw new Error("B402 settlement returned an unexpected network");
  }
  if (!payer || result.payer.toLowerCase() !== payer.toLowerCase()) {
    throw new Error("B402 settlement returned an unexpected payer");
  }
}
function isDormantConfigurationError(error) {
  return error instanceof X402SellerConfigError;
}
function toRequest(request, resourceUrl) {
  const url = new URL(resourceUrl);
  for (const [key, value] of Object.entries(request.query ?? {})) {
    url.searchParams.set(key, value);
  }
  const init = {
    method: request.method,
    headers: request.headers
  };
  if (request.body !== void 0 && request.method.toUpperCase() !== "GET" && request.method.toUpperCase() !== "HEAD") {
    init.body = request.body;
  }
  return new Request(url, init);
}
async function fromResponse(response) {
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text()
  };
}
function hasPaymentCredential(headers) {
  const authorization = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === "authorization"
  )?.[1];
  return /^\s*Payment\s+/i.test(authorization ?? "");
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
    error: "MPP request requires a non-empty prompt"
  });
}
async function runFreeWork(runWork, prompt, timeoutSeconds) {
  try {
    return jsonResponse(200, {
      result: await withTimeout(runWork({ prompt }), timeoutSeconds)
    });
  } catch (error) {
    console.warn(`[mpp] free work failed: ${workFailureSummary(error)}`);
    return jsonResponse(500, { error: "work failed" });
  }
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
function asTable(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

// src/b402/protocol.ts
var B402_PAYMENT_PROTOCOLS = ["x402", "mpp"];
var B402_SELL_PATHS = Object.freeze({
  x402: "/x402",
  mpp: "/mpp"
});
function resolveB402PaymentProtocol(cfg) {
  const stack = asTable2(cfg?.stack);
  const raw = stack.protocols;
  if (raw !== void 0 && !Array.isArray(raw)) {
    throw new X402SellerConfigError("[stack].protocols must be an array");
  }
  const faces = Array.isArray(raw) ? raw.map((face) => String(face).trim().toUpperCase()) : [];
  const hasX402 = faces.includes("X402");
  const hasMpp = faces.includes("MPP");
  if (hasX402 && hasMpp) {
    throw new X402SellerConfigError(
      "X402 and MPP are alternative B402 payment protocols; select exactly one"
    );
  }
  return hasMpp ? "mpp" : "x402";
}
function b402SellPath(cfg) {
  return B402_SELL_PATHS[resolveB402PaymentProtocol(cfg)];
}
function asTable2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

// src/b402/seller.ts
var B402Seller = class _B402Seller {
  protocol;
  path;
  #adapter;
  constructor(protocol, adapter) {
    this.protocol = protocol;
    this.path = B402_SELL_PATHS[protocol];
    this.#adapter = adapter;
  }
  /** Always reflects the selected adapter's current state. */
  get state() {
    return this.#adapter.state;
  }
  capabilitySnapshot() {
    return this.#adapter.capabilitySnapshot();
  }
  capabilityStatus() {
    return this.#adapter.capabilityStatus();
  }
  refreshCapabilities() {
    return this.#adapter.refreshCapabilities();
  }
  stop() {
    this.#adapter.stop();
  }
  static async create(options) {
    const protocol = resolveB402PaymentProtocol(options.cfg);
    const adapter = protocol === "mpp" ? await MppSeller.create(options) : await X402Seller.create(options);
    return new _B402Seller(protocol, adapter);
  }
  handle(request) {
    if (request.path !== this.path) {
      return Promise.resolve({
        status: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "B402 route not found" })
      });
    }
    return this.#adapter.handle(request);
  }
};
export {
  B402Seller,
  B402SellerPolicy,
  B402_PAYMENT_PROTOCOLS,
  B402_SELL_PATHS,
  MPP_SELL_PATH,
  MppSeller,
  _resetB402ReplayStore,
  _setB402ReplayStore,
  b402SellPath,
  createEnvelopeMiddleware,
  resolveB402PaymentProtocol,
  resolveB402ReplayStore
};
