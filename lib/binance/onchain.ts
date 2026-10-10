import "server-only";
import { createPublicClient, http, erc20Abi, type Address } from "viem";
import { BinanceApiError } from "./client-core";
import { addressSchema } from "./rwa-schemas";

// Official trading reference + onchain verification required before quote use.
export const USDT_ADDRESS: Address = "0x55d398326f99059fF775485246999027B3197955";
export function publicClient() {
  const rpc = process.env.BSC_RPC_URL;
  if (!rpc || new URL(rpc).protocol !== "https:") throw new BinanceApiError("CONFIGURATION");
  return createPublicClient({ transport: http(rpc, { timeout: 15_000, retryCount: 0 }) });
}
export async function verifyToken(tokenAddress: string) {
  const address = addressSchema.parse(tokenAddress) as Address;
  const client = publicClient();
  if (await client.getChainId() !== 56) throw new BinanceApiError("INVALID_RESPONSE");
  const [code, decimals, symbol] = await Promise.all([
    client.getCode({ address }), client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
  ]);
  if (!code || code === "0x") throw new BinanceApiError("INVALID_RESPONSE");
  return { address, decimals, symbol };
}
