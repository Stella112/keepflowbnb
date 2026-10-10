import {
  auditedOp,
  maskUrlSecrets,
  recordChainOp
} from "./chunk-7LTTKMY5.js";
import {
  X402SellerConfigError,
  parseBoolean
} from "./chunk-JOGM5MYC.js";
import {
  createSellerCapabilityManager
} from "./chunk-J3PCEUK6.js";
import {
  hasCanonicalSellerPolicy,
  resolveSellerPolicy
} from "./chunk-NX5R2NBY.js";
import {
  b402UsdPriceToAtomic,
  getNetwork
} from "./chunk-YQUACLG3.js";
import {
  findProjectRoot,
  loadStudioToml
} from "./chunk-AHE5Y6SQ.js";

// src/b402/replayStore.ts
var replayStoreOverride = null;
var MPP_MAX_TIMEOUT_SECONDS = 300;
var REJECTED_TTL_MS = (MPP_MAX_TIMEOUT_SECONDS + 60) * 1e3;
function _setB402ReplayStore(store) {
  replayStoreOverride = store;
}
function _resetB402ReplayStore() {
  replayStoreOverride = null;
}
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

// src/x402/sellerB402.ts
import { createHash } from "crypto";
import {
  isEip3009PaymentPayload,
  isPermit2PaymentPayload
} from "@bnb-chain/b402";
import {
  B402Client,
  B402Error,
  B402ExactServerScheme,
  B402FacilitatorClient,
  B402SettlementUnknownError
} from "@bnb-chain/b402/server";
import {
  FacilitatorResponseError,
  x402HTTPResourceServer,
  x402ResourceServer
} from "@x402/core/server";

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
    return B402Client.fromEnv(env) ?? null;
  } catch (cause) {
    if (!(cause instanceof B402Error)) throw cause;
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
  const rawFacilitator = new B402FacilitatorClient({
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
      const server = new x402ResourceServer(requestFacilitator).register(
        network,
        new B402ExactServerScheme({ facilitator: requestFacilitator })
      );
      const http = new x402HTTPResourceServer(server, {
        [X402_SELL_PATH]: {
          accepts: accepts.map(({ assetId: _assetId, ...accept }) => ({
            ...accept,
            extra: { ...accept.extra }
          })),
          resource: options.resourceUrl
        }
      });
      try {
        await http.initialize();
      } catch (error) {
        throw unwrapB402Error(error) ?? error;
      }
      return http;
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
  if (error instanceof B402Error || error instanceof B402SettlementUnknownError) {
    const wrapped = new FacilitatorResponseError(error.message);
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
    if (current instanceof B402Error || current instanceof B402SettlementUnknownError) {
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
  const nonce = isEip3009PaymentPayload(payload) ? payload.payload.authorization.nonce : isPermit2PaymentPayload(payload) ? payload.payload.permit2Authorization.nonce : null;
  const payloadMethod = isEip3009PaymentPayload(payload) ? "eip3009" : isPermit2PaymentPayload(payload) ? "permit2-exact" : null;
  if (nonce === null || payloadMethod === null || event.expectation.transferMethod !== payloadMethod) {
    return;
  }
  const transferMethod = payloadMethod;
  let requestSha256;
  try {
    requestSha256 = b402SettlementRequestDigest(event.request, {
      payer: event.expectation.payer,
      nonce,
      transferMethod
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
      transferMethod,
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
        transfer_method: transferMethod,
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
  return createHash("sha256").update(canonical).digest("hex");
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

// src/b402/policy.ts
import { getAddress, isAddress } from "viem";
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
    const payments = asTable(cfg.payments);
    const canonical = asTable(payments.b402_seller);
    const legacy = asTable(payments.x402_seller);
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
    if (payToRaw !== "" && !isAddress(payToRaw)) {
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
      payTo: payToRaw === "" ? null : getAddress(payToRaw),
      workTimeoutSeconds,
      bazaar: seller.bazaar !== void 0 ? parseBazaar(asTable(seller.bazaar)) : null
    });
  }
};
function parseBazaar(table) {
  const info = parseJsonObject(table.info_json, "bazaar.info_json");
  const schema = parseJsonObject(table.schema_json, "bazaar.schema_json");
  return {
    info,
    schema,
    ...table.description !== void 0 ? { description: String(table.description) } : {},
    ...table.route_template !== void 0 ? { routeTemplate: String(table.route_template) } : {}
  };
}
function parseJsonObject(value, field) {
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
function asTable(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

// src/x402/sellerPolicy.ts
var X402SellerPolicy = class _X402SellerPolicy extends B402SellerPolicy {
  static fromToml(cfg) {
    return new _X402SellerPolicy(B402SellerPolicy.fromToml(cfg));
  }
};

// src/x402/seller.ts
import {
  isEip3009PaymentPayload as isEip3009PaymentPayload2,
  isPermit2PaymentPayload as isPermit2PaymentPayload2,
  recoverEip3009Payer
} from "@bnb-chain/b402";
import {
  B402Error as B402Error2,
  B402SettlementUnknownError as B402SettlementUnknownError2
} from "@bnb-chain/b402/server";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { getAddress as getAddress2 } from "viem";

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
    const payTo = getAddress2(policy.payTo ?? options.walletAddress);
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
    let http;
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
      http = await this.#b402.createHttp(snapshot, accepts);
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
      processed = await http.processHTTPRequest(context);
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
    let transferMethod;
    if (isEip3009PaymentPayload2(processed.paymentPayload)) {
      if (!prompt) return missingPromptResponse();
      payer = getAddress2(await recoverEip3009Payer(processed.paymentPayload));
      nonce = processed.paymentPayload.payload.authorization.nonce;
      transferMethod = "eip3009";
    } else if (isPermit2PaymentPayload2(processed.paymentPayload)) {
      if (!prompt) return missingPromptResponse();
      payer = getAddress2(
        processed.paymentPayload.payload.permit2Authorization.from
      );
      nonce = processed.paymentPayload.payload.permit2Authorization.nonce;
      transferMethod = "permit2-exact";
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
      { payer, nonce, transferMethod }
    );
    const reconciliationKey = b402ReconciliationKey({
      protocol: "x402",
      network: processed.paymentRequirements.network,
      tokenAddress: selected.tokenAddress,
      payer,
      nonce,
      transferMethod,
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
            transfer_method: transferMethod,
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
          const result = await http.processSettlement(
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
          payer = getAddress2(result.payer);
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
      const body = decodePaymentRequiredHeader(required);
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
  if (b402 instanceof B402SettlementUnknownError2) {
    return jsonResponse(500, {
      error: "settlement outcome unknown; reconciliation required"
    });
  }
  if (b402 instanceof B402Error2) {
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

export {
  MPP_MAX_TIMEOUT_SECONDS,
  _setB402ReplayStore,
  _resetB402ReplayStore,
  resolveB402ReplayStore,
  x402SellerState,
  resolveX402SettlementAsset,
  X402_SELL_PATH,
  _setB402Transport,
  resolveB402Transport,
  _resetX402Seller,
  _probeB402Supported,
  createB402SettlementUnknownHandler,
  b402SettlementRequestDigest,
  b402ReconciliationKey,
  B402SellerPolicy,
  workFailureSummary,
  X402SellerPolicy,
  X402Seller,
  createEnvelopeMiddleware
};
