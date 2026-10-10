import { randomUUID } from "node:crypto";
import { z } from "zod";
import { buildReadUrl, signRequest } from "./auth.ts";

export const envelopeSchema = z.object({
  code: z.number().int(),
  msg: z.string(),
  data: z.unknown().optional(),
  timestamp: z.number().int().optional(),
  success: z.boolean().optional(),
});

export type ErrorCode = "CONFIGURATION" | "NETWORK" | "INVALID_RESPONSE" |
  "AUTHENTICATION_FAILED" | "PERMISSION_DENIED" | "COMPLIANCE_RESTRICTED" |
  "RATE_LIMITED" | "SERVICE_UNAVAILABLE" | "API_ERROR" | "HTTP_ERROR";

export class BinanceApiError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number | null;
  readonly businessCode: number | null;
  constructor(code: ErrorCode, httpStatus: number | null = null, businessCode: number | null = null) {
    const messages: Record<ErrorCode, string> = {
      CONFIGURATION: "Stock data is not configured yet.",
      NETWORK: "Stock data could not be reached. Please try again later.",
      INVALID_RESPONSE: "Stock data could not be verified. Nothing was submitted.",
      AUTHENTICATION_FAILED: "Stock data access could not be authenticated.",
      PERMISSION_DENIED: "Stock data access is unavailable for this application.",
      COMPLIANCE_RESTRICTED: "This service is unavailable for this account or connection.",
      RATE_LIMITED: "Stock data is busy. Please try again later.",
      SERVICE_UNAVAILABLE: "Stock data is temporarily unavailable.",
      API_ERROR: "Stock data is temporarily unavailable.",
      HTTP_ERROR: "Stock data is temporarily unavailable.",
    };
    super(messages[code]);
    this.name = "BinanceApiError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.businessCode = businessCode;
  }
}

export type RequestMetric = {
  timestamp: string;
  module: "binance-read";
  endpoint: string;
  httpStatus: number | null;
  businessCode: number | null;
  latencyMs: number;
  retryCount: number;
  schemaValidation: "VALID" | "API_ERROR" | "ENVELOPE_INVALID" | "DATA_INVALID" | "NO_RESPONSE";
};

type Dependencies = {
  fetch?: typeof fetch;
  now?: () => number;
  nonce?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
  log?: (metric: RequestMetric) => Promise<void> | void;
};

const MAX_RESPONSE_BYTES = 2_000_000;
class ResponseTooLarge extends Error {}

async function boundedResponseText(response: Response): Promise<string> {
  const contentLength = response.headers.get("Content-Length");
  if (contentLength !== null && /^\d+$/.test(contentLength) && BigInt(contentLength) > BigInt(MAX_RESPONSE_BYTES)) {
    try { await response.body?.cancel(); } catch { /* preserve safe size error */ }
    throw new ResponseTooLarge();
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        try { await reader.cancel(); } catch { /* preserve safe size error */ }
        throw new ResponseTooLarge();
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("");
  } finally {
    reader.releaseLock();
  }
}

function classify(status: number, code: number): ErrorCode {
  if (code === 40304) return "COMPLIANCE_RESTRICTED";
  if ([40101, 40102, 40103].includes(code)) return "AUTHENTICATION_FAILED";
  if (code === 40104) return "PERMISSION_DENIED";
  if (status === 429 || code === 42900) return "RATE_LIMITED";
  if ([50000, 50001].includes(code)) return "SERVICE_UNAVAILABLE";
  return status >= 200 && status < 300 ? "API_ERROR" : "HTTP_ERROR";
}

/** Read-only transport. No transaction construction, signing, or broadcast methods. */
export function createReadClient(
  config: { baseUrl: string; apiKey: string; apiSecret: string },
  dependencies: Dependencies = {},
) {
  const parsedConfig = z.object({
    baseUrl: z.literal("https://web3.binance.com/build"),
    apiKey: z.string().min(1), apiSecret: z.string().min(1),
  }).safeParse(config);
  if (!parsedConfig.success) throw new BinanceApiError("CONFIGURATION");
  const validatedConfig = parsedConfig.data;
  const transport = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;
  const nonce = dependencies.nonce ?? randomUUID;
  const sleep = dependencies.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const emit = async (metric: RequestMetric) => {
    // Logging failure must not change a response or trigger another API request.
    try { await dependencies.log?.(metric); } catch { /* best-effort diagnostics */ }
  };

    async function request<T>(method: "GET" | "POST", path: string, query: Record<string, string>, schema: z.ZodType<T>, body = ""): Promise<T> {
      let url: URL;
      try { url = buildReadUrl(validatedConfig.baseUrl, path, query); }
      catch { throw new BinanceApiError("CONFIGURATION"); }
      for (let attempt = 0; attempt < (method === "GET" ? 2 : 1); attempt++) {
        const started = now();
        const timestamp = new Date(started).toISOString();
        const metric: RequestMetric = {
          timestamp, module: "binance-read", endpoint: path,
          httpStatus: null, businessCode: null, latencyMs: 0,
          retryCount: attempt, schemaValidation: "NO_RESPONSE",
        };
        let response: Response;
        let raw: string;
        try {
          response = await transport(url, {
            method, redirect: "manual", cache: "no-store",
            ...(method === "POST" ? { body } : {}),
            signal: AbortSignal.timeout(15_000),
            headers: {
              "X-OC-APIKEY": validatedConfig.apiKey,
              "X-OC-TIMESTAMP": timestamp,
              "X-OC-SIGN": signRequest(validatedConfig.apiSecret, timestamp, method, url.pathname + url.search, body),
              "X-OC-NONCE": nonce(), Accept: "application/json",
              ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
            },
          });
          metric.httpStatus = response.status;
          raw = await boundedResponseText(response);
        } catch (error) {
          metric.latencyMs = Math.max(0, now() - started);
          if (error instanceof ResponseTooLarge) {
            metric.schemaValidation = "ENVELOPE_INVALID";
            await emit(metric);
            throw new BinanceApiError("INVALID_RESPONSE", metric.httpStatus);
          }
          await emit(metric);
          throw new BinanceApiError("NETWORK", metric.httpStatus);
        }
        metric.latencyMs = Math.max(0, now() - started);
        let payload: unknown;
        try { payload = JSON.parse(raw); }
        catch { payload = null; }
        const envelope = envelopeSchema.safeParse(payload);
        if (!envelope.success) {
          metric.schemaValidation = "ENVELOPE_INVALID";
          await emit(metric);
          throw new BinanceApiError("INVALID_RESPONSE", response.status);
        }
        metric.businessCode = envelope.data.code;
        if (!response.ok || envelope.data.code !== 0 || envelope.data.success === false) {
          metric.schemaValidation = "API_ERROR";
          await emit(metric);
          const code = classify(response.status, envelope.data.code);
          // Only documented retryable failures on safe GETs; never retry compliance/auth/schema errors.
          const retryable = code === "RATE_LIMITED" || code === "SERVICE_UNAVAILABLE";
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter === null ? 500 * (attempt + 1) : /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Infinity;
          if (method === "GET" && retryable && attempt === 0 && delay <= 2000) { await sleep(delay); continue; }
          throw new BinanceApiError(code, response.status, envelope.data.code);
        }
        const data = schema.safeParse(envelope.data.data);
        if (!data.success) {
          metric.schemaValidation = "DATA_INVALID";
          await emit(metric);
          throw new BinanceApiError("INVALID_RESPONSE", response.status, envelope.data.code);
        }
        metric.schemaValidation = "VALID";
        await emit(metric);
        return data.data;
      }
      throw new BinanceApiError("SERVICE_UNAVAILABLE");
    }
  return {
    get<T>(path: string, query: Record<string, string>, schema: z.ZodType<T>) { return request("GET", path, query, schema); },
    // This POST only simulates offchain. No general POST, broadcast or order-submission method exists.
    simulate<T>(transaction: { from: string; to: string; value: string; data: string }, schema: z.ZodType<T>) {
      const validated = z.object({ from: z.string().regex(/^0x[0-9a-fA-F]{40}$/), to: z.string().regex(/^0x[0-9a-fA-F]{40}$/), value: z.string().regex(/^\d+$/), data: z.string().regex(/^0x([0-9a-fA-F]{2})*$/) }).parse(transaction);
      return request("POST", "/api/v1/dex/pre-transaction/simulate", {}, schema, JSON.stringify({ binanceChainId: "56", evmTx: validated }));
    },
  };
}
