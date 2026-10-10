import {
  resolveService
} from "./chunk-7XNIIBIN.js";
import {
  attachGasContext,
  auditedOp
} from "./chunk-7LTTKMY5.js";
import {
  getPolicy
} from "./chunk-GLMSXNZT.js";
import {
  DeliverableContentError,
  storageProviderForUrl,
  storageProviderFromConfig
} from "./chunk-QBWUZ63F.js";
import {
  getWallet
} from "./chunk-VVNTBRAE.js";
import {
  BSC_TESTNET_FAUCET_DOCS_URL,
  formatUsdAtomic,
  fromRaw,
  getNetwork,
  sdkNetwork,
  toRaw,
  usdPriceToAtomic
} from "./chunk-YQUACLG3.js";
import {
  loadStudioToml
} from "./chunk-AHE5Y6SQ.js";

// src/erc8183/client.ts
import { ERC8183Client } from "@bnbagent/sdk";
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
var defaultClientFactory = (network) => ERC8183Client.create({
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
var PaymentAssetUnavailableError = class extends ERC8183Error {
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
import { lookup } from "dns/promises";
import { isIP } from "net";
import { NegotiationRequest, TermSpecification } from "@bnbagent/sdk/erc8183";
import { parseAssetId } from "@bnbagent/sdk/networks";
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
      supported.add(parseAssetId(entry));
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
  if (isIP(normalized) === 4) {
    const [a = 0, b = 0] = normalized.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 198 && (b === 18 || b === 19) || a >= 224;
  }
  if (isIP(normalized) === 6) {
    const lower = normalized.toLowerCase();
    let mappedPrivate = false;
    if (lower.startsWith("::ffff:")) {
      const suffix = lower.slice("::ffff:".length);
      if (isIP(suffix) === 4) {
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
    addresses = await lookup(hostname, { all: true, verbatim: true });
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
  const request = new NegotiationRequest({
    taskDescription: task,
    terms: new TermSpecification({
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
      body: JSON.stringify(request.toEnvelope()),
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
import { keccak256, toBytes } from "viem";
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
        keccak256(toBytes(sig)).slice(0, 10).toLowerCase(),
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
import { JobStatus } from "@bnbagent/sdk";
import { JobDescription, verifyQuoteSignature } from "@bnbagent/sdk/erc8183";
import { getAddress, keccak256 as keccak2562, recoverMessageAddress, toBytes as toBytes2 } from "viem";
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
    jd = JobDescription.fromStr(description);
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
  let recomputed = keccak2562(toBytes2(canonicalJson(content)));
  recomputed = recomputed.startsWith("0x") ? recomputed : `0x${recomputed}`;
  if (recomputed.toLowerCase() !== jd.negotiationHash.toLowerCase()) {
    return null;
  }
  try {
    return await recoverMessageAddress({
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
  if (job.status !== JobStatus.FUNDED) {
    return makeVerdict(
      false,
      `job status ${JobStatus[job.status]}, expected FUNDED`
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
    jd = JobDescription.fromStr(job.description);
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
    jobToken = getAddress(rawJobToken);
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
    quoteToken = getAddress(jd.currency);
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
      quoteCommerce = getAddress(String(declaredCommerce));
      clientCommerce = getAddress(client.network.commerceContract);
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
      verdict = await verifyQuoteSignature({
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
import { JobStatus as JobStatus2 } from "@bnbagent/sdk";
import {
  DeliverableManifest,
  ERC8183JobOps,
  JobDescription as JobDescription2,
  buildJobDescription
} from "@bnbagent/sdk/erc8183";
import { UnsupportedWalletOperation } from "@bnbagent/sdk/wallets";
var U_DECIMALS = 18;
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function _txHash(result) {
  const rec = asRecord(result);
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
    throw new PaymentAssetUnavailableError({
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
        throw new PaymentAssetUnavailableError({
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
    description = buildJobDescription(negotiationEnvelope);
    const jd = JobDescription2.fromStr(description);
    if (jd !== null && BigInt(jd.price) !== rawBudget) {
      throw new NegotiationError(
        `signed quote price ${jd.price} != budget ${rawBudget} being funded; refusing to fund a mismatched amount`
      );
    }
  }
  let step = "create";
  try {
    const createRes = asRecord(
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
var defaultJobOpsFactory = (network) => ERC8183JobOps.create({
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
  return exc instanceof UnsupportedWalletOperation || exc instanceof Error && exc.name === "UnsupportedWalletOperation";
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
  const rec = asRecord(result);
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
  if (status !== JobStatus2.SUBMITTED && status !== JobStatus2.COMPLETED) {
    throw new JobStateError({
      jobId,
      expected: ["SUBMITTED", "COMPLETED"],
      actual: JobStatus2[status] ?? String(status)
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
    downloaded = asRecord(await storageProviderForUrl(url).download(url));
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
      manifest = DeliverableManifest.fromDict(downloaded);
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
    const manifestCommerce = asRecord(manifest.contracts)?.commerce;
    const chainId = client.network.chainId ?? getNetwork(resolveNetworkName(opts.network)).chainId;
    if (manifest.jobId !== jobId || manifest.chainId !== chainId || typeof manifestCommerce !== "string" || manifestCommerce.toLowerCase() !== client.network.commerceContract.toLowerCase()) {
      throw new DeliverableIntegrityError(
        `Job ${jobId} deliverable manifest is bound to a different job or contract domain.`
      );
    }
    const respBlock = asRecord(downloaded.response);
    response = String(respBlock?.content ?? downloaded.content ?? "");
    const meta = asRecord(downloaded.metadata);
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
  const status = JobStatus2[await client.getJobStatus(BigInt(jobId))];
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

export {
  _setWalletOverride,
  resolveWallet,
  erc8183Network,
  _setClientFactory,
  get8183Client,
  _reset8183ClientCache,
  ERC8183Error,
  BudgetCapExceededError,
  TokenNotAllowedError,
  PaymentAssetUnavailableError,
  InsufficientPaymentAssetBalanceError,
  PolicyNotWhitelistedError,
  JobNotFoundError,
  JobStateError,
  DeliverableUnavailableError,
  DeliverableIntegrityError,
  SubmitPermanentlyUnsupportedError,
  SdkCallFailedError,
  NegotiationError,
  NegotiationRejectedError,
  negotiateWithSeller,
  decodeRevert,
  makeVerdict,
  recoverQuoteSigner,
  verifySignedJob,
  U_DECIMALS,
  _txHash,
  buyWorkflow,
  _setJobOpsFactory,
  submitWorkflow,
  fetchWorkflow,
  settleWorkflow,
  getJobSummary
};
