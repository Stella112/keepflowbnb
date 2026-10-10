import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import { createReadClient } from "./client-core";

export function getBinanceClient() {
  return createReadClient({
    baseUrl: process.env.BINANCE_WEB3_BASE_URL ?? "",
    apiKey: process.env.BINANCE_WEB3_API_KEY ?? "",
    apiSecret: process.env.BINANCE_WEB3_API_SECRET ?? "",
  }, {
    log: async (metric) => {
      await mkdir("logs", { recursive: true });
      await appendFile("logs/dx.jsonl", JSON.stringify(metric) + "\n");
    },
  });
}
