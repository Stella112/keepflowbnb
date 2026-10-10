import { AssetId, B402TransferMethod } from '@bnbagent/sdk/networks';

type SellerCapabilityRail = "erc8183" | "b402";
type SellerCapabilityRailStatus = "active" | "degraded" | "dormant" | "disabled";
type SellerCapabilityMethod = "erc8183" | B402TransferMethod;
type SellerCapabilityInactiveReasonCode = "rail-disabled" | "commerce-unsupported" | "commerce-probe-failed" | "b402-method-unsupported" | "b402-supported-probe-failed" | "free-route";
interface SellerCapabilityInactiveReason {
    readonly code: SellerCapabilityInactiveReasonCode;
    readonly method: SellerCapabilityMethod | null;
}
interface SellerB402ChallengeExtra {
    readonly assetTransferMethod: B402TransferMethod;
    readonly name: string;
    readonly version: string;
    readonly signerAddress: `0x${string}`;
    readonly spenderAddress?: `0x${string}`;
}
/** Trusted, normalized metadata for one active B402 asset × method route. */
interface SellerB402RouteCapability {
    readonly assetId: AssetId;
    readonly x402Version: 2;
    readonly scheme: "exact";
    readonly network: `eip155:${number}`;
    readonly method: B402TransferMethod;
    readonly name: string;
    readonly version: string;
    readonly signerAddress: `0x${string}`;
    readonly spenderAddress: `0x${string}` | null;
    /** Safe, whitelisted enrichment for building this route's challenge. */
    readonly challengeExtra: SellerB402ChallengeExtra;
}
interface SellerAssetCapability {
    readonly assetId: AssetId;
    readonly symbol: string;
    readonly address: `0x${string}`;
    readonly decimals: number;
    readonly isDefault: boolean;
    readonly active: boolean;
    readonly activeMethods: readonly SellerCapabilityMethod[];
    readonly b402Routes: readonly SellerB402RouteCapability[];
    readonly inactiveReasons: readonly SellerCapabilityInactiveReason[];
    readonly lastError: string | null;
}
interface SellerRailCapabilitySnapshot {
    readonly rail: SellerCapabilityRail;
    readonly enabled: boolean;
    readonly free: boolean;
    readonly status: SellerCapabilityRailStatus;
    readonly assets: readonly SellerAssetCapability[];
}
interface SellerCapabilityAggregate {
    readonly available: boolean;
    readonly enabledRails: readonly SellerCapabilityRail[];
    readonly servingRails: readonly SellerCapabilityRail[];
}
interface SellerCapabilitySnapshot {
    readonly network: string;
    readonly generatedAt: string;
    readonly rails: Readonly<{
        erc8183: SellerRailCapabilitySnapshot;
        b402: SellerRailCapabilitySnapshot;
    }>;
    readonly overall: SellerCapabilityAggregate;
}
interface CapabilityTimerScheduler {
    readonly setInterval: (callback: () => void, milliseconds: number) => unknown;
    readonly clearInterval: (handle: unknown) => void;
}
declare function aggregateSellerCapabilities(rails: readonly SellerRailCapabilitySnapshot[]): SellerCapabilityAggregate;

export { type CapabilityTimerScheduler as C, type SellerCapabilitySnapshot as S, type SellerAssetCapability as a, type SellerB402ChallengeExtra as b, type SellerB402RouteCapability as c, type SellerCapabilityAggregate as d, type SellerCapabilityInactiveReason as e, type SellerCapabilityInactiveReasonCode as f, type SellerCapabilityMethod as g, type SellerCapabilityRail as h, type SellerCapabilityRailStatus as i, type SellerRailCapabilitySnapshot as j, aggregateSellerCapabilities as k };
