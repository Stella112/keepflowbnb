import {
  attachGasContext,
  auditedOp
} from "./chunk-7LTTKMY5.js";
import {
  PAYMASTER_URL_ENV_VAR,
  getNetwork,
  sdkNetwork,
  tbnbFaucetHint
} from "./chunk-YQUACLG3.js";

// src/erc8004/index.ts
import {
  AgentEndpoint,
  ERC8004Agent,
  ERC8004PartialRegistrationError as SdkERC8004PartialRegistrationError,
  TransactionPendingError as SdkTransactionPendingError,
  TWAKProvider
} from "@bnbagent/sdk";
var ERC8004Error = class extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "ERC8004Error";
  }
};
var AlreadyRegisteredError = class extends ERC8004Error {
  agentId;
  constructor(message, opts = {}) {
    super(message);
    this.name = "AlreadyRegisteredError";
    this.agentId = opts.agentId ?? null;
  }
};
var NotRegisteredError = class extends ERC8004Error {
  constructor(message) {
    super(message);
    this.name = "NotRegisteredError";
  }
};
var ERC8004TransactionPendingError = class extends ERC8004Error {
  txHash;
  timeoutSeconds;
  agentId;
  constructor(message, opts) {
    super(message);
    this.name = "ERC8004TransactionPendingError";
    this.txHash = opts.txHash;
    this.timeoutSeconds = opts.timeoutSeconds ?? null;
    this.agentId = opts.agentId ?? null;
  }
};
var ERC8004PartialRegistrationError = class extends ERC8004Error {
  agentId;
  agentUri;
  cause;
  txHash;
  retryable;
  constructor(message, opts) {
    super(message);
    this.name = "ERC8004PartialRegistrationError";
    this.agentId = opts.agentId;
    this.agentUri = opts.agentUri;
    this.cause = opts.cause;
    this.txHash = opts.txHash ?? null;
    this.retryable = opts.retryable ?? true;
  }
};
function erc8004SdkNetwork(wallet, network, opts = {}) {
  const nc = sdkNetwork(network);
  if (opts.noPaymaster) {
    return { ...nc, usePaymaster: false };
  }
  if (wallet instanceof TWAKProvider && network === "bsc-mainnet") {
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
var defaultSdkFactory = (wallet, network, opts) => ERC8004Agent.create({
  walletProvider: wallet,
  network: erc8004SdkNetwork(wallet, network, opts)
});
var sdkFactory = defaultSdkFactory;
function _setSdkFactory(factory) {
  sdkFactory = factory ?? defaultSdkFactory;
}
function makeSdk(wallet, network, opts) {
  getNetwork(network);
  return sdkFactory(wallet, network, opts);
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function isSdkPending(exc) {
  return exc instanceof SdkTransactionPendingError || exc instanceof Error && exc.name === "TransactionPendingError";
}
function isSdkPartial(exc) {
  return exc instanceof SdkERC8004PartialRegistrationError || exc instanceof Error && exc.name === "ERC8004PartialRegistrationError";
}
function pendingError(exc, opts) {
  const agent = opts.agentId != null ? ` agent_id=${opts.agentId}` : "";
  return new ERC8004TransactionPendingError(
    `ERC-8004 ${opts.action} transaction broadcast but not confirmed yet${agent}: tx_hash=${exc.txHash}. Check the transaction before retrying.`,
    {
      txHash: exc.txHash,
      timeoutSeconds: exc.timeoutSeconds ?? null,
      agentId: opts.agentId ?? null
    }
  );
}
function partialRegistrationError(exc) {
  const txHash = exc.txHash ?? null;
  const remediation = txHash ? ` Pending tx_hash=${txHash}. Check whether it confirmed before retrying \`bag erc8004 update-endpoint --endpoint <url>\`.` : " Run `bag erc8004 update-endpoint --endpoint <url>` to complete the advertised endpoint.";
  return new ERC8004PartialRegistrationError(
    `ERC-8004 register created agent_id=${exc.agentId}, but setAgentURI did not complete.${remediation}`,
    {
      agentId: Number(exc.agentId),
      agentUri: exc.agentUri ?? null,
      cause: exc.cause ?? exc,
      txHash,
      retryable: exc.retryable ?? true
    }
  );
}
var FOUNDRY_CARD_RE = /\/agentCard\/v[0-9][0-9.]*$/i;
function isAlreadyCard(path) {
  return path.endsWith(AgentEndpoint.A2A_WELL_KNOWN_PATH) || FOUNDRY_CARD_RE.test(path);
}
function stripTrailingSlashes(s) {
  return s.replace(/\/+$/, "");
}
function a2aAgentCardEndpoint(endpoint) {
  const wellKnown = AgentEndpoint.A2A_WELL_KNOWN_PATH;
  const raw = String(endpoint ?? "").trim();
  let parts;
  try {
    parts = new URL(raw);
  } catch {
    const url = stripTrailingSlashes(raw);
    return isAlreadyCard(url) ? url : `${url}${wellKnown}`;
  }
  if (!parts.protocol || !parts.host) {
    const url = stripTrailingSlashes(raw);
    return isAlreadyCard(url) ? url : `${url}${wellKnown}`;
  }
  let path = stripTrailingSlashes(parts.pathname);
  if (!isAlreadyCard(path)) {
    path = path ? `${path}${wellKnown}` : wellKnown;
  }
  return `${parts.protocol}//${parts.host}${path}${parts.search}${parts.hash}`;
}
var MCP_PROTOCOL_VERSION = "2025-06-18";
var MCP_PATH = "/mcp";
function mcpStreamableEndpoint(endpoint) {
  const raw = String(endpoint ?? "").trim();
  let parts;
  try {
    parts = new URL(raw);
  } catch {
    const url = stripTrailingSlashes(raw);
    return url.endsWith(MCP_PATH) ? url : `${url}${MCP_PATH}`;
  }
  if (!parts.protocol || !parts.host) {
    const url = stripTrailingSlashes(raw);
    return url.endsWith(MCP_PATH) ? url : `${url}${MCP_PATH}`;
  }
  let path = stripTrailingSlashes(parts.pathname);
  if (!path.endsWith(MCP_PATH)) {
    path = path ? `${path}${MCP_PATH}` : MCP_PATH;
  }
  return `${parts.protocol}//${parts.host}${path}${parts.search}${parts.hash}`;
}
function _extractTokenId(agentRecord) {
  const tokenId = agentRecord.token_id;
  if (tokenId !== void 0 && tokenId !== null) return Number(tokenId);
  const raw = agentRecord.agent_id ?? agentRecord.agentId;
  if (raw === void 0 || raw === null) {
    throw new ERC8004Error(
      `Agent record missing agent_id/token_id: ${JSON.stringify(agentRecord)}`
    );
  }
  if (typeof raw === "number") return raw;
  const s = String(raw);
  if (/^\d+$/.test(s)) return Number(s);
  const parts = s.split(":");
  const last = parts[parts.length - 1];
  const n = Number(last);
  if (!Number.isFinite(n)) {
    throw new ERC8004Error(
      `Agent record missing agent_id/token_id: ${JSON.stringify(agentRecord)}`
    );
  }
  return n;
}
async function findOwnedAgent(sdk) {
  const myAddress = sdk.walletAddress.toLowerCase();
  let offset = 0;
  const pageSize = 100;
  for (let page = 0; page < 10; page++) {
    const result = asRecord(await sdk.getAllAgents(pageSize, offset));
    const items = Array.isArray(result?.items) ? result.items : [];
    for (const agent of items) {
      const rec = asRecord(agent);
      if (rec === null) continue;
      const owner = String(rec.owner_address ?? rec.owner ?? "").toLowerCase();
      if (owner === myAddress) return rec;
    }
    if (items.length < pageSize) return null;
    offset += pageSize;
  }
  return null;
}
function _buildEndpoint(protocol, endpoint, version) {
  if (protocol === "A2A") {
    return new AgentEndpoint({
      name: "A2A",
      endpoint: a2aAgentCardEndpoint(endpoint),
      version
    });
  }
  if (protocol === "MCP") {
    return AgentEndpoint.mcp(mcpStreamableEndpoint(endpoint), {
      version: MCP_PROTOCOL_VERSION
    });
  }
  return new AgentEndpoint({ name: protocol, endpoint });
}
function mergeAccessDescription(description, accessDescription) {
  if (!accessDescription) return description;
  let base = String(description ?? "").trim();
  const access = accessDescription.trim();
  for (const marker of ["\n\nAccess:", " Access:", "Access:"]) {
    const idx = base.indexOf(marker);
    if (idx >= 0) {
      base = base.slice(0, idx).trimEnd();
      break;
    }
  }
  return base ? `${base} ${access}`.trim() : access;
}
async function register(wallet, endpoint, opts = {}) {
  const {
    network = "bsc-testnet",
    name = "studio-agent",
    description = "bnbagent-studio agent",
    protocol = "A2A",
    version = "0.3.0",
    accessDescription = null
  } = opts;
  const sdk = await makeSdk(wallet, network, { noPaymaster: opts.noPaymaster });
  const existing = await findOwnedAgent(sdk);
  if (existing !== null) {
    const existingId = existing.agent_id ?? existing.agentId;
    let tokenId;
    try {
      tokenId = _extractTokenId(existing);
    } catch (e) {
      if (!(e instanceof ERC8004Error)) throw e;
      tokenId = null;
    }
    throw new AlreadyRegisteredError(
      `Wallet ${sdk.walletAddress} already owns agent_id=${existingId}; use update_service_endpoint() (CLI: \`bag erc8004 update-endpoint --endpoint <new-url>\`) to change its endpoint.`,
      { agentId: tokenId }
    );
  }
  let agentUri = opts.agentUri ?? null;
  if (agentUri === null) {
    agentUri = sdk.generateAgentUri({
      name,
      description: mergeAccessDescription(description, accessDescription),
      endpoints: [_buildEndpoint(protocol, endpoint, version)]
    });
  }
  let result;
  try {
    result = await sdk.registerAgent(agentUri);
  } catch (e) {
    if (isSdkPartial(e)) throw partialRegistrationError(e);
    if (isSdkPending(e)) throw pendingError(e, { action: "register" });
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
    if (msg.includes("insufficient funds") || msg.includes("insufficient balance")) {
      throw new ERC8004Error(
        `ERC-8004 register needs gas on bsc-testnet (twak does not sponsor testnet \u2014 REQ-2). Fund a little tBNB (~0.001) to ${sdk.walletAddress} and retry \u2014 ${tbnbFaucetHint(sdk.walletAddress)}`,
        { cause: e }
      );
    }
    throw e;
  }
  const rec = asRecord(result);
  if (rec === null) {
    throw new ERC8004Error(
      `SDK register_agent returned non-dict: ${JSON.stringify(result)}`
    );
  }
  const agentId = rec.agentId ?? rec.agent_id;
  if (agentId === void 0 || agentId === null) {
    throw new ERC8004Error(
      `SDK register_agent did not return an agent_id: ${JSON.stringify(rec)}`
    );
  }
  return Number(agentId);
}
async function updateEndpoint(wallet, newUri, opts = {}) {
  const network = opts.network ?? "bsc-testnet";
  const sdk = await makeSdk(wallet, network);
  const existing = await findOwnedAgent(sdk);
  if (existing === null) {
    throw new NotRegisteredError(
      `Wallet ${sdk.walletAddress} has no registered agent; call register() first.`
    );
  }
  const tokenId = _extractTokenId(existing);
  return setAgentUriAudited(sdk, tokenId, newUri, network);
}
function txHashFrom(result) {
  const rec = asRecord(result);
  if (rec !== null) {
    const extracted = rec.transactionHash ?? rec.tx_hash;
    return extracted ? String(extracted) : String(result);
  }
  return String(result);
}
async function setAgentUriAudited(sdk, tokenId, newUri, network) {
  return auditedOp(
    "8004_update_endpoint",
    {
      chainId: getNetwork(network).chainId,
      asset: null,
      amount: null,
      agentAddr: sdk.walletAddress,
      context: { agent_id: tokenId, new_uri: newUri.slice(0, 120) }
    },
    async (auditH) => {
      let result;
      try {
        result = await sdk.setAgentUri(tokenId, newUri);
      } catch (e) {
        if (isSdkPending(e)) {
          auditH.txHash = e.txHash;
          throw pendingError(e, {
            action: "update-endpoint",
            agentId: tokenId
          });
        }
        throw e;
      }
      const txHash = txHashFrom(result);
      auditH.txHash = txHash;
      await attachGasContext(auditH, network, "8004_update_endpoint");
      return txHash;
    }
  );
}
async function setMetadata(wallet, key, value, opts = {}) {
  const network = opts.network ?? "bsc-testnet";
  const sdk = await makeSdk(wallet, network, { noPaymaster: opts.noPaymaster });
  const existing = await findOwnedAgent(sdk);
  if (existing === null) {
    throw new NotRegisteredError(
      `Wallet ${sdk.walletAddress} has no registered agent; call register() first.`
    );
  }
  const tokenId = _extractTokenId(existing);
  return setMetadataAudited(sdk, tokenId, key, value, network);
}
async function setMetadataAudited(sdk, tokenId, key, value, network) {
  return auditedOp(
    "8004_set_metadata",
    {
      chainId: getNetwork(network).chainId,
      asset: null,
      amount: null,
      agentAddr: sdk.walletAddress,
      context: {
        agent_id: tokenId,
        metadata_key: key,
        metadata_value: value.slice(0, 120)
      }
    },
    async (auditH) => {
      let result;
      try {
        result = await sdk.setMetadata(tokenId, key, value);
      } catch (e) {
        throw new ERC8004Error(
          `set_metadata failed: ${e instanceof Error ? e.message : e}`,
          { cause: e }
        );
      }
      const txHash = txHashFrom(result);
      auditH.txHash = txHash;
      await attachGasContext(auditH, network, "8004_set_metadata");
      return txHash;
    }
  );
}
async function getMetadata(wallet, key, opts = {}) {
  const network = opts.network ?? "bsc-testnet";
  const sdk = await makeSdk(wallet, network);
  const existing = await findOwnedAgent(sdk);
  if (existing === null) {
    throw new NotRegisteredError(
      `Wallet ${sdk.walletAddress} has no registered agent.`
    );
  }
  const tokenId = _extractTokenId(existing);
  try {
    return String(await sdk.getMetadata(tokenId, key));
  } catch (e) {
    throw new ERC8004Error(
      `get_metadata failed: ${e instanceof Error ? e.message : e}`,
      { cause: e }
    );
  }
}
async function updateServiceEndpoint(wallet, endpoint, opts = {}) {
  const {
    network = "bsc-testnet",
    protocol = "A2A",
    name = "studio-agent",
    description = "bnbagent-studio agent",
    version = "0.3.0",
    accessDescription = null
  } = opts;
  const sdk = await makeSdk(wallet, network, { noPaymaster: opts.noPaymaster });
  const existing = await findOwnedAgent(sdk);
  if (existing === null) {
    throw new NotRegisteredError(
      `Wallet ${sdk.walletAddress} has no registered agent; call register() first.`
    );
  }
  const tokenId = _extractTokenId(existing);
  const info = asRecord(await sdk.getAgentInfo(tokenId));
  const currentUri = String(info?.agentURI ?? info?.agent_uri ?? "");
  const serviceEndpoint = _buildEndpoint(protocol, endpoint, version).endpoint;
  let newUri;
  try {
    const body = decodeAgentUri(currentUri);
    const services = Array.isArray(body.services) ? body.services : [];
    let patched = false;
    for (const entry of services) {
      const rec = asRecord(entry);
      if (rec !== null && rec.name === protocol) {
        rec.endpoint = serviceEndpoint;
        patched = true;
        break;
      }
    }
    if (!patched) {
      services.push({ name: protocol, endpoint: serviceEndpoint });
    }
    body.services = services;
    if (accessDescription) {
      body.description = mergeAccessDescription(
        String(body.description ?? description),
        accessDescription
      );
    }
    const payload = Buffer.from(JSON.stringify(body)).toString("base64");
    newUri = `data:application/json;base64,${payload}`;
  } catch (e) {
    if (!(e instanceof ERC8004Error)) throw e;
    newUri = sdk.generateAgentUri({
      name,
      description: mergeAccessDescription(description, accessDescription),
      endpoints: [_buildEndpoint(protocol, endpoint, version)]
    });
  }
  const txHash = await setAgentUriAudited(sdk, tokenId, newUri, network);
  return { txHash, agentId: tokenId };
}
async function show(wallet, opts = {}) {
  const network = opts.network ?? "bsc-testnet";
  const sdk = await makeSdk(wallet, network);
  const existing = await findOwnedAgent(sdk);
  if (existing === null) {
    throw new NotRegisteredError(
      `Wallet ${sdk.walletAddress} has no registered agent.`
    );
  }
  const tokenId = _extractTokenId(existing);
  const raw = await sdk.getAgentInfo(tokenId);
  const info = asRecord(raw);
  if (info === null) {
    throw new ERC8004Error(
      `SDK get_agent_info returned non-dict: ${JSON.stringify(raw)}`
    );
  }
  return {
    agentId: Number(info.agentId ?? info.agent_id ?? tokenId),
    address: String(info.agentAddress ?? info.agent_address ?? ""),
    agentUri: String(info.agentURI ?? info.agent_uri ?? ""),
    metadata: { ...asRecord(info.metadata) ?? {} }
  };
}
async function resolve(agentId, opts = {}) {
  const wallet = opts.wallet ?? null;
  if (wallet === null) {
    throw new Error(
      "resolve() requires a wallet (SDK needs a provider to construct)"
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
  const uri = info.agentURI ?? info.agent_uri;
  if (!uri) {
    throw new NotRegisteredError(`agent_id=${agentId} has no agentURI`);
  }
  return String(uri);
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

export {
  ERC8004Error,
  AlreadyRegisteredError,
  NotRegisteredError,
  ERC8004TransactionPendingError,
  ERC8004PartialRegistrationError,
  erc8004SdkNetwork,
  _setSdkFactory,
  a2aAgentCardEndpoint,
  MCP_PROTOCOL_VERSION,
  mcpStreamableEndpoint,
  _extractTokenId,
  _buildEndpoint,
  register,
  updateEndpoint,
  setMetadata,
  getMetadata,
  updateServiceEndpoint,
  show,
  resolve,
  resolveService
};
