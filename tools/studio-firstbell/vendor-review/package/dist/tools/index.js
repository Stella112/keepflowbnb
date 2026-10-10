import {
  get8183Client,
  getJobSummary
} from "../chunk-POKVLCEK.js";
import "../chunk-7XNIIBIN.js";
import {
  getAccountUsage,
  siweLogin
} from "../chunk-KNHMVTYN.js";
import "../chunk-G24BQIQ3.js";
import "../chunk-NODAFSUU.js";
import "../chunk-7LTTKMY5.js";
import {
  PieverseAuthError
} from "../chunk-ZWCUOUCH.js";
import "../chunk-JOGM5MYC.js";
import "../chunk-J3PCEUK6.js";
import "../chunk-GLMSXNZT.js";
import "../chunk-NX5R2NBY.js";
import "../chunk-QBWUZ63F.js";
import {
  getWallet
} from "../chunk-VVNTBRAE.js";
import {
  fromRaw,
  getNetwork,
  sdkNetwork
} from "../chunk-YQUACLG3.js";
import "../chunk-KTZSXJL6.js";
import {
  STUDIO_TOML,
  findProjectRoot,
  loadStudioToml
} from "../chunk-AHE5Y6SQ.js";

// src/tools/index.ts
import { readFileSync, readdirSync, statSync } from "fs";
import { isAbsolute, join } from "path";
import { ERC8004Agent, JobStatus } from "@bnbagent/sdk";
import {
  http,
  createPublicClient,
  decodeAbiParameters,
  encodeAbiParameters,
  parseAbiParameters,
  getAddress as toChecksumAddress,
  toFunctionSelector
} from "viem";
var defaultWalletGetter = () => getWallet();
var walletGetter = defaultWalletGetter;
function _setWalletGetter(getter) {
  walletGetter = getter ?? defaultWalletGetter;
}
var defaultTransportFactory = (rpcUrl) => http(rpcUrl);
var transportFactory = defaultTransportFactory;
function _setTransportFactory(factory) {
  transportFactory = factory ?? defaultTransportFactory;
}
function makeClient(rpcUrl) {
  return createPublicClient({ transport: transportFactory(rpcUrl) });
}
var defaultErc8004Factory = (wallet, network) => (
  // USABILITY-11: per-network RPC override (also validates the name).
  ERC8004Agent.create({
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
  const cfg = loadStudioToml(join(root, STUDIO_TOML));
  const walletCfg = cfg.wallet ?? {};
  const keystoreDir = String(walletCfg.keystore_dir ?? ".studio/wallets");
  return isAbsolute(keystoreDir) ? keystoreDir : join(root, keystoreDir);
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
    if (!statSync(keystoreDir).isDirectory()) return { addresses: [] };
  } catch {
    return { addresses: [] };
  }
  const addresses = [];
  for (const name of readdirSync(keystoreDir).sort()) {
    if (!name.endsWith(".json")) continue;
    let data;
    try {
      data = JSON.parse(readFileSync(join(keystoreDir, name), "utf-8"));
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
  const addrCs = toChecksumAddress(addr);
  const client = makeClient(net.rpcUrl);
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
  const addrCs = toChecksumAddress(addr);
  const client = makeClient(net.rpcUrl);
  const tokenCs = toChecksumAddress(token.address);
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
  const cfg = loadStudioToml(join(root, STUDIO_TOML));
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
        status = JobStatus[await client.getJobStatus(jid)] ?? "?";
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
    const client = makeClient(net.rpcUrl);
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
    const client = makeClient(net.rpcUrl);
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
    const client = makeClient(net.rpcUrl);
    const inputTypes = _parseInputTypes(functionSignature);
    const callArgs = [...args ?? []];
    if (callArgs.length !== inputTypes.length) {
      throw new Error(
        `arg count mismatch: signature expects ${inputTypes.length}, got ${callArgs.length}`
      );
    }
    const selector = toFunctionSelector(`function ${functionSignature}`);
    const encodedArgs = inputTypes.length > 0 ? encodeAbiParameters(
      parseAbiParameters(inputTypes.join(", ")),
      callArgs
    ) : "0x";
    const calldata = `${selector}${encodedArgs.slice(2)}`;
    const addressCs = toChecksumAddress(address);
    const { data } = await client.call({ to: addressCs, data: calldata });
    const rawHex = data ?? "0x";
    let decoded = null;
    if (outputTypes && outputTypes.length > 0) {
      const values = decodeAbiParameters(
        parseAbiParameters(outputTypes.join(", ")),
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
export {
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
};
