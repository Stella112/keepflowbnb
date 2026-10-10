import {
  getSharedBudgetTracker
} from "./chunk-JOGM5MYC.js";
import {
  getNetwork
} from "./chunk-YQUACLG3.js";

// src/audit/redact.ts
var AuditRedactionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "AuditRedactionError";
  }
};
var SECRET_KEY_PATTERN = /(password|passphrase|api[_-]?key|apikey|secret|session(?:[_-]?token)?|signature|private[_-]?key|mnemonic|seed[_-]?phrase|bearer)/i;
var VALUE_PATTERNS = [
  /^sk-pv-[a-zA-Z0-9_-]{6,}/,
  /^sess-pv-[a-zA-Z0-9_-]{6,}/,
  /^0x[0-9a-fA-F]{120,}$/
];
function checkValue(value, path) {
  if (typeof value === "string") {
    for (const pat of VALUE_PATTERNS) {
      if (pat.test(value)) {
        throw new AuditRedactionError(
          `audit redaction: value at ${path} matches secret pattern ${pat.source}; refusing to write. If this is a false positive, change the caller \u2014 do not bypass.`
        );
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => checkValue(v, `${path}[${i}]`));
  } else if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      checkPair(k, v, `${path}.${k}`);
    }
  }
}
function checkPair(key, value, path) {
  if (SECRET_KEY_PATTERN.test(key)) {
    throw new AuditRedactionError(
      `audit redaction: key '${key}' at ${path} matches secret pattern; refusing to write. Audit context must not carry secrets \u2014 use tx_hash / addresses / public amounts only.`
    );
  }
  checkValue(value, path);
}
function validateNoSecrets(event) {
  for (const [k, v] of Object.entries(event.context)) {
    checkPair(k, v, `context.${k}`);
  }
}
var URL_RE = /https?:\/\/(?:[^\s'"<>)\[\]}]|\[[^\s'"<>)\[\]}]*\])+/gi;
var QUERY_SECRET_PARAM_RE = /(?:^|[_.\[\]-])(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passphrase|secret|token|auth|key)(?:$|[_.\[\]-])/i;
function decodedUrlPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function shannonEntropy(value) {
  const counts = /* @__PURE__ */ new Map();
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}
function looksLikeSecretValue(raw) {
  const value = decodedUrlPart(raw).trim();
  if (value.length < 16) return false;
  if (/^[a-zA-Z0-9_-]{8,}(?:\.[a-zA-Z0-9_-]{8,}){2,}$/.test(value)) {
    return true;
  }
  const core = value.replace(/=+$/, "");
  return core.length >= 20 && /^[a-zA-Z0-9+/_-]+$/.test(core) && shannonEntropy(core) >= 3.5;
}
function looksLikeKeySegment(seg) {
  return looksLikeSecretValue(seg);
}
function maskOneUrl(url) {
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/.exec(
    url
  );
  if (m === null) return url;
  const scheme = m[1];
  let netloc = m[2];
  const rawPath = m[3] ?? "";
  const rawQuery = m[4];
  const fragment = m[5];
  if (!scheme || !netloc) return url;
  const at = netloc.lastIndexOf("@");
  if (at !== -1) netloc = netloc.slice(at + 1);
  const path = rawPath.split("/").map((s) => looksLikeKeySegment(s) ? "<redacted>" : s).join("/");
  let query2 = rawQuery;
  if (rawQuery !== void 0 && rawQuery !== "") {
    query2 = rawQuery.split("&").map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) {
        return looksLikeSecretValue(pair) ? "<redacted>" : pair;
      }
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      return QUERY_SECRET_PARAM_RE.test(decodedUrlPart(name)) || looksLikeSecretValue(value) ? `${name}=<redacted>` : pair;
    }).join("&");
  }
  let out = `${scheme}://${netloc}${path}`;
  if (query2 !== void 0 && query2 !== "") out += `?${query2}`;
  if (fragment !== void 0 && fragment !== "") out += "#<redacted>";
  return out;
}
function maskUrlSecrets(text) {
  return text.replace(URL_RE, (u) => maskOneUrl(u));
}

// src/audit/schema.ts
var MONEY_OPS = /* @__PURE__ */ new Set([
  "auto_topup",
  // PieverseCreditEnsurer auto-renew (LLM credits low -> x402 topup)
  "cli_topup",
  // bag llm topup (manual)
  "llm_activate",
  // bag llm activate --initial-usd N
  "x402_buy",
  // bag x402 buy
  "x402_sell",
  // x402 seller settlement
  "x402_sell_unknown",
  // ambiguous x402 seller settlement requiring reconciliation
  "mpp_sell",
  // MPP seller settlement through B402
  "mpp_sell_unknown",
  // ambiguous MPP+B402 settlement requiring reconciliation
  "mpp_buy",
  // bag mpp buy / external Studio MPP buyer
  "8183_fund",
  // ERC-8183 set_budget (escrow $U into job)
  "8183_settle"
  // ERC-8183 settle (release escrow to seller)
]);
var GAS_ONLY_OPS = /* @__PURE__ */ new Set([
  "8004_register",
  // ERC-8004 register agent identity
  "8004_update_endpoint",
  // ERC-8004 update endpoint URL
  "8004_set_metadata",
  // ERC-8004 set agent metadata key/value
  "8183_submit_work",
  // ERC-8183 seller submit deliverable
  "8183_dispute",
  // ERC-8183 buyer dispute window action
  "session_grant",
  // Altana bounded session grant / quote-checker approval
  "session_revoke",
  // Altana session revoke
  "session_x402_setup"
  // Altana x402 checker + bounded Permit2 allowance
]);
var ALL_OPS = /* @__PURE__ */ new Set([
  ...MONEY_OPS,
  ...GAS_ONLY_OPS
]);
var SCHEMA_VERSION = 1;
function makeEvent(fields) {
  return Object.freeze({
    ...fields,
    context: fields.context ?? {},
    schemaVersion: fields.schemaVersion ?? SCHEMA_VERSION
  });
}
function eventToJsonLine(ev) {
  return JSON.stringify({
    ts: ev.ts,
    op: ev.op,
    actor: ev.actor,
    chain_id: ev.chainId,
    asset: ev.asset,
    amount: ev.amount,
    tx_hash: ev.txHash,
    status: ev.status,
    agent_addr: ev.agentAddr,
    counterparty: ev.counterparty,
    context: ev.context,
    schema_version: ev.schemaVersion
  });
}
var REQUIRED_KEYS = [
  "ts",
  "op",
  "actor",
  "chain_id",
  "asset",
  "amount",
  "tx_hash",
  "status",
  "agent_addr",
  "counterparty"
];
var KNOWN_KEYS = /* @__PURE__ */ new Set([
  ...REQUIRED_KEYS,
  "context",
  "schema_version"
]);
function eventFromJsonLine(line) {
  const d = JSON.parse(line);
  if (typeof d !== "object" || d === null || Array.isArray(d)) {
    throw new Error("audit line is not a JSON object");
  }
  for (const key of Object.keys(d)) {
    if (!KNOWN_KEYS.has(key)) {
      throw new Error(`unexpected audit field ${key}`);
    }
  }
  for (const key of REQUIRED_KEYS) {
    if (!(key in d)) throw new Error(`missing audit field ${key}`);
  }
  return makeEvent({
    ts: d.ts,
    op: d.op,
    actor: d.actor,
    chainId: d.chain_id,
    asset: d.asset,
    amount: d.amount,
    txHash: d.tx_hash,
    status: d.status,
    agentAddr: d.agent_addr,
    counterparty: d.counterparty,
    context: d.context ?? {},
    schemaVersion: d.schema_version ?? SCHEMA_VERSION
  });
}
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}

// src/audit/writer.ts
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeSync
} from "fs";
import { dirname, join } from "path";
var DEFAULT_LOG_NAME = "audit-log.jsonl";
var DEFAULT_LOG_DIR = ".studio";
var FILE_MODE = 384;
var STUDIO_AUDIT_LOG_PATH_ENV = "STUDIO_AUDIT_LOG_PATH";
function resolveAuditLogPath(projectRoot) {
  const override = process.env[STUDIO_AUDIT_LOG_PATH_ENV];
  if (override) return override;
  const root = projectRoot ?? process.cwd();
  return join(root, DEFAULT_LOG_DIR, DEFAULT_LOG_NAME);
}
function appendEvent(event, opts = {}) {
  const path = resolveAuditLogPath(opts.projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  const isNew = !existsSync(path);
  const fd = openSync(path, "a");
  try {
    writeSync(fd, `${eventToJsonLine(event)}
`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  if (isNew) {
    chmodSync(path, FILE_MODE);
  }
  return path;
}
function readEvents(opts = {}) {
  const path = resolveAuditLogPath(opts.projectRoot);
  if (!existsSync(path)) return [];
  const out = [];
  for (const raw of readFileSync(path, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    try {
      out.push(eventFromJsonLine(line));
    } catch {
    }
  }
  return out;
}

// src/audit/gas.ts
import { http, createPublicClient } from "viem";
var defaultReceiptFetcher = async (txHash, network) => {
  const client = createPublicClient({
    transport: http(getNetwork(network).rpcUrl)
  });
  const receipt = await client.getTransactionReceipt({
    hash: txHash
  });
  return {
    gasUsed: receipt.gasUsed,
    effectiveGasPrice: receipt.effectiveGasPrice
  };
};
var receiptFetcher = defaultReceiptFetcher;
function _setReceiptFetcher(fetcher) {
  receiptFetcher = fetcher ?? defaultReceiptFetcher;
}
var TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
async function attachGasContext(handle, network, ledgerOp) {
  const txHash = handle.txHash;
  if (txHash === null || !TX_HASH_RE.test(txHash)) {
    return;
  }
  try {
    const { gasUsed, effectiveGasPrice } = await receiptFetcher(
      txHash,
      network
    );
    handle.extraContext.gas = {
      gas_used: gasUsed.toString(),
      effective_gas_price_wei: effectiveGasPrice.toString(),
      wallet_paid_wei: (gasUsed * effectiveGasPrice).toString()
    };
    if (ledgerOp !== void 0) {
      try {
        await getSharedBudgetTracker().recordEntry({
          ts: (/* @__PURE__ */ new Date()).toISOString(),
          op: ledgerOp,
          tx_hash: txHash,
          gas_used: gasUsed.toString(),
          wallet_paid_wei: (gasUsed * effectiveGasPrice).toString(),
          sponsored: effectiveGasPrice === 0n
        });
      } catch {
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`audit gas capture skipped: ${maskUrlSecrets(msg)}`);
  }
}

// src/audit/index.ts
function record(event, opts = {}) {
  validateNoSecrets(event);
  try {
    console.log(`AUDIT ${eventToJsonLine(event)}`);
  } catch (exc) {
    console.error(
      `audit stdout mirror failed: ${exc} (op=${event.op} status=${event.status})`
    );
  }
  try {
    appendEvent(event, opts);
  } catch (exc) {
    console.error(
      `audit log file write failed (event still emitted to stdout): ${exc} (op=${event.op} status=${event.status})`
    );
  }
}
function recordChainOp(op, fields) {
  if (!ALL_OPS.has(op)) {
    throw new Error(
      `unknown audit op '${op}'; allowed: ${JSON.stringify([...ALL_OPS].sort())}`
    );
  }
  const ev = makeEvent({
    ts: nowIso(),
    op,
    actor: fields.actor ?? "cli",
    chainId: fields.chainId,
    asset: fields.asset,
    amount: fields.amount,
    txHash: fields.txHash,
    status: fields.status,
    agentAddr: fields.agentAddr,
    counterparty: fields.counterparty ?? null,
    context: { ...fields.context ?? {} }
  });
  record(ev, { projectRoot: fields.projectRoot });
  return ev;
}
function findLast(op, opts = {}) {
  const events = readEvents(opts);
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (op == null || ev.op === op) return ev;
  }
  return null;
}
function tail(n, opts = {}) {
  const events = readEvents(opts);
  return n > 0 ? events.slice(-n) : [];
}
function query(opts = {}) {
  let events = readEvents({ projectRoot: opts.projectRoot });
  if (opts.since != null) {
    const since = opts.since;
    events = events.filter((e) => e.ts >= since);
  }
  if (opts.op != null) {
    events = events.filter((e) => e.op === opts.op);
  }
  if (opts.limit != null && opts.limit > 0) {
    events = events.slice(-opts.limit);
  }
  return events;
}
var AuditedOpHandle = class {
  txHash = null;
  extraContext = {};
};
async function auditedOp(op, meta, fn) {
  const baseCtx = { ...meta.context ?? {} };
  const common = {
    actor: meta.actor ?? "cli",
    chainId: meta.chainId,
    asset: meta.asset,
    amount: meta.amount,
    agentAddr: meta.agentAddr,
    counterparty: meta.counterparty ?? null,
    projectRoot: meta.projectRoot
  };
  recordChainOp(op, {
    ...common,
    txHash: null,
    status: "submitted",
    context: baseCtx
  });
  const handle = new AuditedOpHandle();
  let result;
  try {
    result = await fn(handle);
  } catch (exc) {
    const message = exc instanceof Error ? exc.message : String(exc);
    recordChainOp(op, {
      ...common,
      txHash: handle.txHash,
      status: "failed",
      context: {
        ...baseCtx,
        ...handle.extraContext,
        error: maskUrlSecrets(message).slice(0, 200)
      }
    });
    throw exc;
  }
  recordChainOp(op, {
    ...common,
    txHash: handle.txHash,
    status: "confirmed",
    context: { ...baseCtx, ...handle.extraContext }
  });
  return result;
}

export {
  AuditRedactionError,
  validateNoSecrets,
  maskUrlSecrets,
  MONEY_OPS,
  GAS_ONLY_OPS,
  ALL_OPS,
  SCHEMA_VERSION,
  makeEvent,
  eventToJsonLine,
  eventFromJsonLine,
  nowIso,
  DEFAULT_LOG_NAME,
  DEFAULT_LOG_DIR,
  FILE_MODE,
  STUDIO_AUDIT_LOG_PATH_ENV,
  resolveAuditLogPath,
  appendEvent,
  readEvents,
  _setReceiptFetcher,
  attachGasContext,
  record,
  recordChainOp,
  findLast,
  tail,
  query,
  AuditedOpHandle,
  auditedOp
};
