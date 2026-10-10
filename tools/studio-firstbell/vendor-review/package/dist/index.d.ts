export { findProjectRoot, loadStudioToml } from './config.js';
export { Policy, ResolvedSellerPolicy, SellerPolicy, SellerPolicyConfigError, SellerPolicySource, SellerPrice, SellerRail, getPolicy, resolveSellerPolicy } from './policy.js';
export { C as CapabilityTimerScheduler, a as SellerAssetCapability, b as SellerB402ChallengeExtra, c as SellerB402RouteCapability, d as SellerCapabilityAggregate, e as SellerCapabilityInactiveReason, f as SellerCapabilityInactiveReasonCode, g as SellerCapabilityMethod, h as SellerCapabilityRail, i as SellerCapabilityRailStatus, S as SellerCapabilitySnapshot, j as SellerRailCapabilitySnapshot, k as aggregateSellerCapabilities } from './capabilities-Z0oNaR0S.js';
export { C as CreateSellerCapabilityManagerOptions, a as SellerB402CapabilityAdapterOptions, b as SellerB402SupportedTransport, S as SellerCapabilityController, c as SellerCommerceCapabilityClient, d as SellerErc8183CapabilityAdapterOptions, e as createSellerCapabilityManager } from './capabilityAdapters-9S3v6-K7.js';
export { getWallet } from './wallet.js';
import '@bnbagent/sdk/networks';
import '@bnbagent/sdk';
import '@bnbagent/sdk/wallets';

/**
 * No-op telemetry sink. Mirrors the Python `bnbagent_studio_core.telemetry`
 * contract: a stable seam emitted code can call, never a data channel.
 */
declare function emit(_event: string, _fields?: Record<string, unknown>): void;

export { emit };
