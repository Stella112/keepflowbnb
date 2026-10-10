/**
 * Audit log Event schema (T37.9) — port of
 * `bnbagent_studio_core/audit/schema.py`.
 *
 * One Event per JSONL line in `<project>/.studio/audit-log.jsonl`. The
 * ON-DISK format keeps the Python snake_case field names and key order so
 * logs written by either implementation parse in both.
 *
 * Privacy contract (enforced by `./redact.js`): NEVER write private keys,
 * passwords, API keys, session tokens, signatures, mnemonics. DO write tx
 * hashes (public), addresses (public), amounts (user's own).
 *
 * Compatibility: `schemaVersion` is the on-disk format version; v0.0.1
 * ships 1. Future schema changes bump this; readers handle both.
 */
declare const MONEY_OPS: ReadonlySet<string>;
declare const GAS_ONLY_OPS: ReadonlySet<string>;
declare const ALL_OPS: ReadonlySet<string>;
declare const SCHEMA_VERSION = 1;
/** Audit-log event. Instances from {@link makeEvent} are frozen so
 * accidental mutation post-record throws. */
interface Event {
    readonly ts: string;
    readonly op: string;
    readonly actor: string;
    readonly chainId: number;
    readonly asset: string | null;
    readonly amount: string | null;
    readonly txHash: string | null;
    readonly status: string;
    readonly agentAddr: string;
    readonly counterparty: string | null;
    readonly context: Record<string, unknown>;
    readonly schemaVersion: number;
}
/** Fields for {@link makeEvent}; `context` and `schemaVersion` default. */
type EventFields = Omit<Event, "context" | "schemaVersion"> & Partial<Pick<Event, "context" | "schemaVersion">>;
/** Construct a frozen Event with schema defaults applied. */
declare function makeEvent(fields: EventFields): Event;
/**
 * Serialize to a single JSONL line (no trailing newline) — byte-identical
 * to the Python writer's `json.dumps(asdict(ev), separators=(",",":"),
 * ensure_ascii=False)`: snake_case keys in dataclass field order, no
 * spaces, non-ASCII unescaped.
 */
declare function eventToJsonLine(ev: Event): string;
/**
 * Parse a single JSONL line. Mirrors the strictness of the Python
 * `Event(**json.loads(line))`: throws on missing required keys and on
 * unknown keys (readers that want to be forgiving catch the throw).
 */
declare function eventFromJsonLine(line: string): Event;
/** Current UTC time as ISO-8601 with millisecond precision + 'Z' suffix. */
declare function nowIso(): string;

/**
 * Audit log redaction policy (T37.9) — port of
 * `bnbagent_studio_core/audit/redact.py`.
 *
 * **Hard fail, not silent mask** — if a caller hands the audit module
 * something that looks like a secret, we throw `AuditRedactionError` and
 * refuse to write. Silently masking would mean the offending caller never
 * gets fixed.
 *
 * Two checks:
 * 1. **Key-name pattern** — rejects any key whose name matches a secret-y
 *    vocabulary (password / api_key / token / signature / etc), case-insensitive.
 * 2. **Value heuristic** — rejects values that look like known secret
 *    formats (Pieverse API keys, session tokens, long hex signatures).
 *
 * Scope: applied to `Event.context` (arbitrary dict). Top-level Event
 * fields are *by design* safe (all public on-chain data or user-owned
 * amounts; the schema deliberately has no field for secrets).
 */

/** Raised when an event would leak a secret. Refuses to write. */
declare class AuditRedactionError extends Error {
    constructor(message: string);
}
/**
 * Hard-fail check on Event.context. Top-level fields are schema-safe.
 * Throws AuditRedactionError on any suspect key name or value pattern.
 */
declare function validateNoSecrets(event: Event): void;
/**
 * Redact credential-bearing parts of any URLs in free text. Keeps scheme +
 * host (so a failure stays auditable) but strips userinfo, redacts
 * fragments and query-param values whose name or value looks secret-y, and
 * redacts high-entropy path segments (the `/v1/<KEY>` key-in-URL case).
 * Non-URL text is returned unchanged.
 */
declare function maskUrlSecrets(text: string): string;

/**
 * Audit log JSONL writer (T37.9) — port of
 * `bnbagent_studio_core/audit/writer.py`.
 *
 * POSIX append-only. File mode 0o600 (user-only read/write, matches
 * keystore permissions). Lives at `<project>/.studio/audit-log.jsonl`.
 * Each event is one O_APPEND write of a full line + fsync — atomic for
 * concurrent same-process appenders, so no lock is needed.
 *
 * Deployed-runtime caveat: the container filesystem is ephemeral (and the
 * code mount is read-only). The file path can be redirected with the
 * `STUDIO_AUDIT_LOG_PATH` env var; `record()` in `./index.js` ALSO mirrors
 * every event to stdout as an `AUDIT {json}` line — the persistent source
 * of truth behind a log collector (e.g. CloudWatch).
 */

declare const DEFAULT_LOG_NAME = "audit-log.jsonl";
declare const DEFAULT_LOG_DIR = ".studio";
declare const FILE_MODE = 384;
declare const STUDIO_AUDIT_LOG_PATH_ENV = "STUDIO_AUDIT_LOG_PATH";
/**
 * Absolute path to the project's audit-log.jsonl.
 *
 * `STUDIO_AUDIT_LOG_PATH` overrides everything else when set — the
 * deploy-time escape hatch for read-only filesystems. Otherwise defaults to
 * `<cwd>/.studio/audit-log.jsonl` when `projectRoot` is undefined. Does NOT
 * create the file or parent dir (that's appendEvent's job).
 */
declare function resolveAuditLogPath(projectRoot?: string | null): string;
/** Append a single Event as one JSONL line. Returns the file path written. */
declare function appendEvent(event: Event, opts?: {
    projectRoot?: string | null;
}): string;
/**
 * Read all events from the audit log. Returns an empty array if the file
 * is missing. Lines that fail to parse are skipped silently (audit log
 * readers should be forgiving; writers are the strict ones).
 */
declare function readEvents(opts?: {
    projectRoot?: string | null;
}): Event[];

/**
 * Gas accounting for confirmed chain-op audit events (BUG-015).
 *
 * ERC-8004 / ERC-8183 writes are gas-sponsored on some networks (MegaFuel)
 * and self-paid on others. Recording the receipt's gas into the confirmed
 * audit event lets a user see what their wallet actually paid versus what
 * the paymaster covered: a MegaFuel-sponsored tx has `effectiveGasPrice ===
 * 0`, so `wallet_paid_wei` is naturally "0" with no separate sponsored flag.
 *
 * Best-effort by design — a receipt fetch that fails (or a tx that never
 * confirmed) just leaves the event without a `gas` context. Accounting must
 * never break the business path, so this never throws.
 */
/** `context.gas` shape; bigints serialized as decimal strings for JSON. */
interface GasContext {
    gas_used: string;
    effective_gas_price_wei: string;
    wallet_paid_wei: string;
}
/**
 * Minimal structural view of an `AuditedOpHandle`. Declared locally (rather
 * than imported from `./index.js`) to avoid a circular import — the helper
 * only needs the txHash it should look up and the bag to write results into.
 */
interface GasHandle {
    txHash: string | null;
    extraContext: Record<string, unknown>;
}
/** Injectable seam: resolve a receipt's gas figures by hash + network. */
type ReceiptFetcher = (txHash: string, network: string) => Promise<{
    gasUsed: bigint;
    effectiveGasPrice: bigint;
}>;
/** Test seam: replace the receipt fetcher. Pass null to restore the default. */
declare function _setReceiptFetcher(fetcher: ReceiptFetcher | null): void;
/**
 * Attach a `gas` object to `handle.extraContext` so the confirmed audit
 * event records what the wallet paid. No-op (never throws) when there is no
 * confirmed tx hash, the hash is not a canonical 32-byte value, or the
 * receipt fetch fails.
 *
 * `ledgerOp` (BUG-015) additionally mirrors the gas figures into the
 * spend-ledger (`BudgetTracker.recordEntry`) so `bag budget show` can
 * aggregate wallet-paid vs sponsored gas without crawling the audit log.
 * Same best-effort contract: a ledger failure never breaks the business
 * path.
 */
declare function attachGasContext(handle: GasHandle, network: string, ledgerOp?: string): Promise<void>;

/**
 * On-chain action audit log (T37.9) — port of
 * `bnbagent_studio_core/audit/__init__.py`.
 *
 * Per-project JSONL at `<project>/.studio/audit-log.jsonl` (mode 0o600).
 * Hookpoints across the codebase emit submitted/confirmed/failed events;
 * `bag audit ls/tail/show` reads them back.
 *
 * Privacy: NEVER writes private keys / passwords / API keys / session
 * tokens / signatures / mnemonics. Enforced by `validateNoSecrets` (hard
 * fail, not silent mask).
 *
 * Public API:
 * - `record(event)` — append an Event; throws AuditRedactionError on secrets.
 * - `recordChainOp(op, fields)` — convenience constructor + record.
 * - `auditedOp(op, meta, fn)` — submitted -> fn -> confirmed/failed wrapper.
 * - `findLast(op?)` / `tail(n)` / `query(...)` — readers.
 */

/**
 * Append an Event to the audit log.
 *
 * Validates against the redaction policy first. On secret-leak attempt:
 * throws `AuditRedactionError` and does NOT write (neither file nor
 * stdout). Otherwise mirrors the (redaction-cleared) event to stdout as an
 * `AUDIT {json}` line — the persistent sink on read-only/ephemeral
 * filesystems, where a log collector captures it. Then appends to the
 * local file; on any I/O error there it logs an error and swallows (the
 * event is already on stdout, and audit must never block the business
 * path).
 */
declare function record(event: Event, opts?: {
    projectRoot?: string | null;
}): void;
/** Fields for {@link recordChainOp} / {@link auditedOp}. */
interface ChainOpFields {
    actor?: string;
    chainId: number;
    asset: string | null;
    amount: string | null;
    txHash: string | null;
    status: string;
    agentAddr: string;
    counterparty?: string | null;
    context?: Record<string, unknown>;
    projectRoot?: string | null;
}
/** Construct + record an Event in one call. Returns the recorded Event. */
declare function recordChainOp(op: string, fields: ChainOpFields): Event;
/** Return the most recent Event matching `op` (or any op if omitted). */
declare function findLast(op?: string | null, opts?: {
    projectRoot?: string | null;
}): Event | null;
/** Return the last n events (oldest -> newest). */
declare function tail(n: number, opts?: {
    projectRoot?: string | null;
}): Event[];
/** Filter events by ISO timestamp lower bound + op. Oldest -> newest. */
declare function query(opts?: {
    since?: string | null;
    op?: string | null;
    limit?: number | null;
    projectRoot?: string | null;
}): Event[];
/** Passed to the {@link auditedOp} body; lets it record the resulting
 * tx hash + extra context for the confirmed/failed event. */
declare class AuditedOpHandle {
    txHash: string | null;
    extraContext: Record<string, unknown>;
}
/**
 * Wrap a tx call so the audit log gets `submitted` before and
 * `confirmed`/`failed` after — the async-function replacement for the
 * Python context manager:
 *
 *     await auditedOp("cli_topup", { chainId: 56, asset: "U", amount: "1.0",
 *                                    agentAddr: wallet.address }, async (h) => {
 *       const result = await doTx();
 *       h.txHash = result.txHash;
 *     });
 *
 * On a throw inside `fn`, records `failed` with the exception message
 * (URL secrets masked before truncating to 200 chars) and re-throws.
 */
declare function auditedOp<T>(op: string, meta: Omit<ChainOpFields, "txHash" | "status">, fn: (handle: AuditedOpHandle) => T | Promise<T>): Promise<T>;

export { ALL_OPS, AuditRedactionError, AuditedOpHandle, type ChainOpFields, DEFAULT_LOG_DIR, DEFAULT_LOG_NAME, type Event, type EventFields, FILE_MODE, GAS_ONLY_OPS, type GasContext, type GasHandle, MONEY_OPS, type ReceiptFetcher, SCHEMA_VERSION, STUDIO_AUDIT_LOG_PATH_ENV, _setReceiptFetcher, appendEvent, attachGasContext, auditedOp, eventFromJsonLine, eventToJsonLine, findLast, makeEvent, maskUrlSecrets, nowIso, query, readEvents, record, recordChainOp, resolveAuditLogPath, tail, validateNoSecrets };
