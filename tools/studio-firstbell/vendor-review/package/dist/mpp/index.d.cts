import { TomlTable } from '../config.cjs';

declare const DEFAULT_MPP_MAX_PER_REQUEST_USD = 1;
declare const DEFAULT_MPP_MAX_SETTLEMENT_SECONDS = 300;
interface MppMerchant {
    readonly name: string;
    readonly domain: string;
    readonly realm: string;
    readonly payTo: `0x${string}`;
    readonly network?: string;
    readonly asset?: `0x${string}`;
    readonly perCallCapUsd?: number;
    readonly verified: boolean;
}
interface MppBuyerPolicyFields {
    readonly maxPerRequestUsd?: number;
    readonly maxSettlementSeconds?: number;
    readonly allowedHosts?: readonly string[];
    readonly expectedRecipient?: `0x${string}` | null;
    readonly expectedRealm?: string | null;
    readonly merchants?: readonly MppMerchant[];
}
/** Buyer-owned trust and spend policy for native MPP+B402 requests. */
declare class MppBuyerPolicy {
    readonly maxPerRequestUsd: number;
    readonly maxSettlementSeconds: number;
    readonly allowedHosts: readonly string[];
    readonly expectedRecipient: `0x${string}` | null;
    readonly expectedRealm: string | null;
    readonly merchants: readonly MppMerchant[];
    constructor(fields?: MppBuyerPolicyFields);
    get effectiveAllowedHosts(): readonly string[];
    merchantForUrl(url: string): MppMerchant | null;
    static fromToml(cfg: TomlTable | Record<string, unknown> | null | undefined): MppBuyerPolicy;
}

interface MppWalletLike {
    readonly address: string;
    supports?(capability: string): boolean;
    signTypedData?(domain: Record<string, unknown>, types: Record<string, {
        name: string;
        type: string;
    }[]>, message: Record<string, unknown>): Promise<unknown>;
    readTokenBalance?(request: MppPaymentAssetReadRequest): Promise<bigint>;
}
interface MppPaymentAssetReadRequest {
    readonly networkName: string;
    readonly owner: `0x${string}`;
    readonly tokenAddress: `0x${string}`;
}
interface MppPaymentAssetReader {
    balanceOf(request: MppPaymentAssetReadRequest): Promise<bigint>;
    allowance?(request: MppPaymentAssetReadRequest & {
        spender: `0x${string}`;
    }): Promise<bigint>;
}
interface MppB402Offer {
    readonly challengeId: string;
    readonly realm: string;
    readonly expires?: string;
    readonly network: `eip155:${number}`;
    readonly asset: `0x${string}`;
    readonly assetId: string;
    readonly symbol: string;
    readonly recipient: `0x${string}`;
    readonly transferMethod: "eip3009" | "permit2-exact";
    readonly amountAtomic: string;
    readonly amountUsd: number;
    readonly decimals: number;
    readonly maxTimeoutSeconds: number;
}
interface MppQuoteResult {
    readonly url: string;
    readonly statusCode: number;
    readonly challenge: MppB402Offer | null;
    readonly challenges: readonly Record<string, unknown>[];
    /** Catalog-verified routes executable by this local EIP-3009 buyer. */
    readonly verifiedAlternatives: readonly MppB402Offer[];
    readonly content: Buffer;
    readonly json: Record<string, unknown> | null;
}
interface MppPaymentReceipt {
    readonly method: string;
    readonly status: "success";
    readonly reference: string;
    readonly timestamp: string;
    readonly [key: string]: unknown;
}
interface MppFetchResult {
    readonly url: string;
    readonly statusCode: number;
    readonly content: Buffer;
    readonly json: Record<string, unknown> | null;
    readonly paidUsd: number | null;
    readonly paymentOutcome: "not-required" | "confirmed" | "unknown";
    readonly receipt: MppPaymentReceipt | null;
    readonly challenge: MppB402Offer | null;
    readonly assetId: string | null;
    readonly symbol: string | null;
    readonly tokenAddress: string | null;
    readonly decimals: number | null;
    readonly amountAtomic: string | null;
}
interface MppRequestOptions {
    readonly method?: string;
    readonly jsonBody?: Record<string, unknown> | null;
    readonly headers?: Record<string, string> | null;
    readonly allowedHosts?: readonly string[] | null;
    readonly allowInsecureLoopback?: boolean;
    readonly fetchImpl?: typeof globalThis.fetch;
    readonly timeoutMs?: number;
    readonly policy?: MppBuyerPolicy | null;
    readonly asset?: string;
}
interface FetchMppWithPaymentOptions extends MppRequestOptions {
    readonly wallet: MppWalletLike;
    readonly maxUsd: number;
    readonly networkName?: string;
    readonly expectedRecipient?: string | null;
    readonly expectedRealm?: string | null;
    readonly countDailyBudget?: boolean;
    readonly assetReader?: MppPaymentAssetReader;
}
/** Read a native MPP challenge without ever creating a payment credential. */
declare function quoteMppUrl(url: string, options?: MppRequestOptions & {
    networkName?: string;
}): Promise<MppQuoteResult>;
/**
 * Fetch a native MPP+B402 endpoint with at most one paid dispatch.
 *
 * No protocol fallback is attempted: x402, Tempo, sessions, and Permit2 are
 * not payable by this surface. The caller must explicitly use its matching
 * protocol client instead.
 */
declare function fetchMppWithPayment(url: string, options: FetchMppWithPaymentOptions): Promise<MppFetchResult>;

/** Base error for the Studio MPP buyer surface. */
declare class MppError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
declare class MppHostNotAllowedError extends MppError {
}
declare class MppInsecureTransportError extends MppError {
}
/** A payment was refused before a credential crossed the fetch boundary. */
declare class MppPaymentRequiredError extends MppError {
    readonly paymentDispatched = false;
}
declare class MppPolicyError extends MppError {
}
declare class MppRecipientRequiredError extends MppPolicyError {
}
declare class MppRecipientMismatchError extends MppPolicyError {
}
declare class MppRealmMismatchError extends MppPolicyError {
}
declare class MppBudgetExceededError extends MppPolicyError {
}
declare class MppUnsupportedWalletError extends MppError {
}
interface MppPaymentAssetFacts {
    readonly assetId: string;
    readonly symbol: string;
    /** null means the catalog symbol is an address-pending placeholder. */
    readonly tokenAddress: string | null;
    readonly addressPending?: boolean;
    readonly decimals: number;
    readonly retryHint: string;
}
interface PaymentAssetErrorOptions extends ErrorOptions {
    readonly asset: MppPaymentAssetFacts;
    readonly alternatives?: readonly MppPaymentAssetFacts[];
}
declare class MppPaymentAssetUnavailableError extends MppError {
    readonly paymentDispatched = false;
    readonly assetId: string;
    readonly symbol: string;
    readonly tokenAddress: string | null;
    readonly addressPending: boolean;
    readonly decimals: number;
    readonly retryHint: string;
    readonly alternatives: readonly MppPaymentAssetFacts[];
    constructor(message: string, options: PaymentAssetErrorOptions);
}
declare class MppUnsupportedWalletRouteError extends MppPaymentAssetUnavailableError {
}
declare class MppPaymentAssetBalanceUnavailableError extends MppPaymentAssetUnavailableError {
}
declare class MppInsufficientPaymentAssetBalanceError extends MppPaymentAssetUnavailableError {
    readonly requiredAtomic: string;
    readonly currentAtomic: string;
    readonly requiredHuman: string;
    readonly currentHuman: string;
    constructor(message: string, options: PaymentAssetErrorOptions & {
        readonly requiredAtomic: string;
        readonly currentAtomic: string;
        readonly requiredHuman: string;
        readonly currentHuman: string;
    });
}
/**
 * The Payment credential crossed the fetch boundary, but no trustworthy
 * response was received. Callers must not retry automatically.
 */
declare class MppPaymentOutcomeUnknownError extends MppError {
    readonly paymentDispatched = true;
    readonly amountUsd: number | null;
    constructor(message: string, options?: ErrorOptions & {
        amountUsd?: number | null;
    });
}

export { DEFAULT_MPP_MAX_PER_REQUEST_USD, DEFAULT_MPP_MAX_SETTLEMENT_SECONDS, type FetchMppWithPaymentOptions, type MppB402Offer, MppBudgetExceededError, MppBuyerPolicy, type MppBuyerPolicyFields, MppError, type MppFetchResult, MppHostNotAllowedError, MppInsecureTransportError, MppInsufficientPaymentAssetBalanceError, type MppMerchant, MppPaymentAssetBalanceUnavailableError, type MppPaymentAssetFacts, type MppPaymentAssetReader, MppPaymentAssetUnavailableError, MppPaymentOutcomeUnknownError, type MppPaymentReceipt, MppPaymentRequiredError, MppPolicyError, type MppQuoteResult, MppRealmMismatchError, MppRecipientMismatchError, MppRecipientRequiredError, type MppRequestOptions, MppUnsupportedWalletError, MppUnsupportedWalletRouteError, type MppWalletLike, fetchMppWithPayment, quoteMppUrl };
