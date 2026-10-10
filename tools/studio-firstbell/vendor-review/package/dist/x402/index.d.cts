export { X402AmountExceededError, X402PolicyError, X402RecipientMismatchError } from '@bnbagent/sdk/x402';
export { A as ALLOWED_HOSTS_CMC_PROFILE, a as ALLOWED_HOSTS_PIEVERSE_PROFILE, B as BudgetTracker, b as BudgetTrackerOpts, F as FetchResult, c as FetchWithPaymentOpts, L as LedgerEntry, P as PayChallengeOpts, d as PayChallengeResult, Q as QuoteUrlOpts, e as X402AssetMismatchError, f as X402AuthError, g as X402BudgetExhaustedError, h as X402BuyerPolicy, i as X402BuyerPolicyFields, j as X402Error, k as X402HostNotAllowedError, l as X402InsufficientPaymentAssetAllowanceError, m as X402InsufficientPaymentAssetBalanceError, n as X402Merchant, o as X402PaidTransferMethod, p as X402PaymentAssetBalanceUnavailableError, r as X402PaymentAssetFacts, s as X402PaymentAssetReader, t as X402PaymentAssetUnavailableError, u as X402PaymentOutcomeUnknownError, v as X402PaymentOutcomeUnknownOptions, w as X402PaymentRequiredError, x as X402RecipientRequiredError, y as X402RetryExhaustedError, z as X402SellerConfigError, C as X402TrustedPaymentFacts, D as X402UnsupportedWalletError, E as X402UnsupportedWalletRouteError, X as X402WalletLike, G as X402WalletRouteDiagnosis, H as _checkHost, I as _isDailyCapCountedElsewhere, J as _parseAccepted, K as _parseAcceptedExactRoute, M as _resetSharedBudgetTracker, N as _setConfigLoader, O as _setSleep, R as dailyCapCountedElsewhere, S as fetchWithPayment, T as getSharedBudgetTracker, U as merchantPinnedAssets, V as payChallenge, q as quoteUrl, W as resolveDailyCapUsd } from '../policy-BzCvMIrB.cjs';
import { MoneyParser, Network } from '@x402/core/types';
import { B as B402SellerPolicy, d as B402SellerPolicyFields } from '../envelope-BBTGjPOn.cjs';
export { E as EnvelopeMiddleware, b as X402HttpRequest, c as X402HttpResponse, X as X402RunWork, f as X402Seller, g as X402SellerCreateOptions, a as X402SellerState, e as createEnvelopeMiddleware } from '../envelope-BBTGjPOn.cjs';
import { TomlTable } from '../config.cjs';
import { SupportedResponse, VerifyResult, SettleResult } from '@bnb-chain/b402';
import { B402Transport, FacilitatorRequest } from '@bnb-chain/b402/server';
export { B402ReplayStore } from '@bnb-chain/b402/server';
import '../capabilities-Z0oNaR0S.cjs';
import '@bnbagent/sdk/networks';

declare const X402_SELL_PATH = "/x402";
declare function _setB402Transport(transport: B402Transport | null): void;
declare function _resetX402Seller(): void;
declare function _probeB402Supported(env?: NodeJS.ProcessEnv): Promise<Awaited<ReturnType<B402Transport["supported"]>> | null>;

/**
 * EIP-3009 typed-data builder + X-PAYMENT envelope — port of
 * `bnbagent_studio_core/x402/signing.py`.
 *
 * The actual signing does not live here. As of the X402Signer migration,
 * `./buyer` delegates the sign+validate step to the bnbagent-sdk's hardened
 * `X402Signer` (recipient check / per-call cap / session budget /
 * SigningPolicy). This module retains only protocol-shape helpers that have
 * no security-relevant logic:
 *
 * - `EIP3009_TYPES` — the EIP-712 type definition for
 *   `TransferWithAuthorization` (consumed by the buyer when building the
 *   payload it hands to `X402Signer.signPayment`). NOTE: distinct from the
 *   SDK's `EIP3009_TYPES` (a Set of primary-type NAMES for its
 *   SigningPolicy) — this is the full types dict.
 * - `buildXPaymentHeader` — encodes the x402 v2 envelope as a base64 header.
 */
/** EIP-712 types for the EIP-3009 `TransferWithAuthorization` payload. */
declare const EIP3009_TYPES: Record<string, {
    name: string;
    type: string;
}[]>;
/** Encode the x402 v2 envelope as a base64 ASCII header value. */
declare function buildXPaymentHeader(resource: unknown, accepted: Record<string, unknown>, signature: string, authorization: Record<string, unknown>): string;

type SellerTransferMethod = "eip3009" | "permit2-exact";
interface SellerTokenEntry {
    readonly symbol: "U";
    readonly address: `0x${string}`;
    readonly decimals: number;
    readonly eip712Name: string;
    readonly eip712Version: string;
    /**
     * Transfer methods advertised in the 402 challenge, challenge order.
     * eip3009 first: EOA buyers pay it pre-authorization-free; permit2-exact
     * is the rail the facilitator verifies ERC-1271 smart-account signatures
     * on (Altana sessions, ERC-4337), and needs a prior buyer-side
     * U→Permit2 allowance. The permit2 `spenderAddress` is NOT configured
     * here — `B402ExactServerScheme` copies it from the facilitator's
     * matching `/supported` kind.
     */
    readonly methods: readonly SellerTransferMethod[];
}
type SellerNetwork = `eip155:${number}`;
/**
 * Legacy U-only projection retained for MPP/Buyer compatibility.
 *
 * Seller request publication no longer reads this table; its active routes
 * come from a fresh capability snapshot. Keeping this projection catalog-
 * backed prevents the compatibility paths from drifting to stale addresses.
 */
declare const SELLER_TOKENS: Readonly<Record<"eip155:56" | "eip155:97", SellerTokenEntry>>;
declare function caip2(chainId: number): SellerNetwork;
declare function usdToAtomic(usd: string | number, decimals: number): string;
declare function sellerMoneyParser(): MoneyParser;
/**
 * One challenge `extra` per advertised transfer method, challenge order.
 * Null when the network has no pinned seller token.
 */
declare function sellerTokenExtras(network: Network): Record<string, unknown>[] | null;

/** @deprecated Use `B402SellerPolicy`; retained for source compatibility. */
type X402SellerPolicyFields = B402SellerPolicyFields;
/** @deprecated Use `B402SellerPolicy`; retained for source compatibility. */
declare class X402SellerPolicy extends B402SellerPolicy {
    static fromToml(cfg: TomlTable | null | undefined): X402SellerPolicy;
}

interface MockB402FacilitatorOptions {
    readonly failVerify?: string;
    readonly failSettle?: string;
    readonly settleUnknown?: boolean;
}
/**
 * Test-only B402 transport with real EIP-3009 recovery and no network I/O.
 */
declare class MockB402Facilitator implements B402Transport {
    #private;
    readonly calls: {
        supported: number;
        verify: FacilitatorRequest[];
        settle: FacilitatorRequest[];
    };
    constructor(options?: MockB402FacilitatorOptions);
    supported(): Promise<SupportedResponse>;
    verify(request: FacilitatorRequest): Promise<VerifyResult>;
    settle(request: FacilitatorRequest): Promise<SettleResult>;
}

export { EIP3009_TYPES, MockB402Facilitator, type MockB402FacilitatorOptions, SELLER_TOKENS, type SellerNetwork, type SellerTokenEntry, type SellerTransferMethod, X402SellerPolicy, type X402SellerPolicyFields, X402_SELL_PATH, _probeB402Supported, _resetX402Seller, _setB402Transport, buildXPaymentHeader, caip2, sellerMoneyParser, sellerTokenExtras, usdToAtomic };
