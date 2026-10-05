import { createHmac } from "node:crypto";
export function signRequest(secret: string, timestamp: string, method: string, path: string, body = ""): string {
  if (!path.startsWith("/build/api/")) throw new Error("Missing /build prefix");
  return createHmac("sha256", secret).update(timestamp + method.toUpperCase() + path + body, "utf8").digest("base64");
}
export function buildReadUrl(base: string, path: string, query: Record<string, string> = {}): URL {
  if (base !== "https://web3.binance.com/build") throw new Error("Unsupported API host");
  if (!/^\/api\/v1\/[a-z0-9/-]+$/.test(path)) throw new Error("Invalid API path");
  const encoded = Object.entries(query).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return new URL(base + path + (encoded ? `?${encoded}` : ""));
}
