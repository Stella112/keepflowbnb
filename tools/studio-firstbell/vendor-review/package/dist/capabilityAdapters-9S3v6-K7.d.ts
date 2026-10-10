import { AssetId } from '@bnbagent/sdk/networks';
import { S as SellerCapabilitySnapshot, C as CapabilityTimerScheduler } from './capabilities-Z0oNaR0S.js';

interface SellerCommerceCapabilityClient {
    isPaymentTokenSupported(address: `0x${string}`): Promise<boolean>;
}
/** Structural subset of B402Transport used by Seller capability discovery. */
interface SellerB402SupportedTransport {
    supported(): Promise<unknown>;
}
type SellerErc8183CapabilityAdapterOptions = Readonly<{
    enabled: true;
    commerceClient: SellerCommerceCapabilityClient;
}> | Readonly<{
    enabled: false;
}>;
type SellerB402CapabilityAdapterOptions = Readonly<{
    enabled: true;
    transport: SellerB402SupportedTransport;
}> | Readonly<{
    enabled: false;
}>;
interface CreateSellerCapabilityManagerOptions {
    readonly network: string;
    readonly assets: readonly AssetId[];
    readonly priceUsd: string;
    readonly erc8183: SellerErc8183CapabilityAdapterOptions;
    readonly b402: SellerB402CapabilityAdapterOptions;
    readonly clock?: () => Date | number | string;
    readonly refreshIntervalMs?: number | null;
    readonly timers?: CapabilityTimerScheduler;
}
/** Public lifecycle surface; construction remains provenance-safe. */
interface SellerCapabilityController {
    start(): Promise<SellerCapabilitySnapshot>;
    refresh(): Promise<SellerCapabilitySnapshot>;
    freshSnapshot(): Promise<SellerCapabilitySnapshot>;
    currentSnapshot(): SellerCapabilitySnapshot | null;
    stop(): void;
}
/**
 * Build Seller-only rail probes from authoritative runtime clients.
 *
 * Wallet capabilities deliberately do not enter this factory: they affect
 * Buyer route selection, never Seller availability.
 */
declare function createSellerCapabilityManager(options: CreateSellerCapabilityManagerOptions): SellerCapabilityController;

export { type CreateSellerCapabilityManagerOptions as C, type SellerCapabilityController as S, type SellerB402CapabilityAdapterOptions as a, type SellerB402SupportedTransport as b, type SellerCommerceCapabilityClient as c, type SellerErc8183CapabilityAdapterOptions as d, createSellerCapabilityManager as e };
