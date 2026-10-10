import { NetworkConfig } from '@bnbagent/sdk';
import { AssetId, B402PaymentAsset, B402TransferMethod, CatalogPaymentAsset, PaymentAssetUnavailableError } from '@bnbagent/sdk/networks';

/**
 * Chain + token registry — port of `bnbagent_studio_core/networks.py`.
 *
 * BSC-only with the SDK's U / USDC / USDT payment-asset catalog.
 *
 * The on-chain facts (chain IDs, token addresses/decimals/methods/default,
 * and EIP-712 domains) are sourced from `@bnbagent/sdk/networks` so they
 * have a single upstream source of truth and can never drift from the SDK.
 * This module keeps only studio's own opinions on top: public RPC defaults
 * (env-overridable), `bag doctor` balance thresholds, testnet faucet URLs,
 * the raw<->human amount converters, and the `NetworkInfo`/`TokenInfo`/
 * `getNetwork` facade that the studio CLI + tools query.
 */

declare const DEFAULT_RPC: Readonly<Record<string, string>>;
/** Per-network RPC override env var names, honored by getNetwork(). */
declare const RPC_ENV_VAR: Readonly<Record<string, string>>;
/** Per-network paymaster URL overrides used by every SDK-backed write path. */
declare const PAYMASTER_URL_ENV_VAR: Readonly<Record<string, string>>;
declare const DEFAULT_CHAIN_ID: Readonly<Record<string, number>>;
interface TokenInfo extends CatalogPaymentAsset {
    readonly symbol: string;
    readonly name: string;
    readonly decimals: number;
    /** Checksum address. */
    readonly address: `0x${string}`;
    readonly b402Methods: readonly B402TransferMethod[];
}
interface B402TokenInfo extends B402PaymentAsset {
    readonly symbol: string;
    readonly name: string;
    readonly decimals: number;
    readonly address: `0x${string}`;
    readonly b402Methods: readonly B402TransferMethod[];
}
type AssetReference = {
    readonly assetId: AssetId | string;
} | {
    readonly symbol: string;
} | {
    readonly address: string;
};
/** A UI payment symbol resolved to SDK placeholder metadata, not an asset. */
declare class PaymentSymbolUnavailableError extends Error {
    readonly network: string;
    readonly assetId: AssetId;
    readonly symbol: string;
    /** The catalog entry is a placeholder, so no token contract is usable. */
    readonly tokenAddress: null;
    readonly addressPending = true;
    readonly decimals: number;
    readonly retryHint: string;
    readonly paymentDispatched = false;
    constructor(network: string, metadata: CatalogPaymentAsset, cause: PaymentAssetUnavailableError);
}
declare class NetworkInfo {
    #private;
    readonly name: string;
    readonly chainId: number;
    readonly rpcUrl: string;
    readonly tokens: Readonly<Record<string, TokenInfo>>;
    constructor(name: string, chainId: number, rpcUrl: string, assets: readonly TokenInfo[]);
    token(symbol: string): TokenInfo;
    /**
     * Resolve a user-facing alias (or canonical AssetId) through the SDK's
     * active catalog. Placeholder aliases retain the SDK typed cause so callers
     * can stop before any payment dispatch.
     */
    resolvePaymentSymbol(symbol: string): TokenInfo;
    /** Resolve a UI symbol or canonical ID to B402 execution metadata. */
    resolveB402PaymentSymbol(symbol: string): B402TokenInfo;
    /** Immutable payment assets in SDK catalog order. */
    assets(): readonly TokenInfo[];
    /** Immutable payment assets projected to B402 execution facts. */
    b402Assets(): readonly B402TokenInfo[];
    /** Resolve a canonical AssetId to its B402 execution metadata. */
    b402Asset(assetId: AssetId | string): B402TokenInfo;
    /** Resolve a checksummed B402 token address on this network. */
    b402TokenByAddress(address: string): B402TokenInfo;
    /** Resolve a canonical AssetId on this network. */
    asset(assetId: AssetId | string): TokenInfo;
    /** Resolve a checksummed token address on this network. */
    tokenByAddress(address: string): TokenInfo;
    /**
     * Resolve an explicitly-typed reference. The discriminant prevents the
     * canonical mainnet AssetId `U` from being confused with testnet's UI
     * symbol `U`, which resolves to `TEST_U` through token().
     */
    resolveAsset(reference: AssetReference): TokenInfo;
}
declare const U_TOKEN_BSC_MAINNET: TokenInfo;
declare const U_TOKEN_BSC_TESTNET: TokenInfo;
declare const ERC8183_SUBMIT_GAS_RESERVE_BNB = 0.006;
declare const BSC_MAINNET_MIN_BNB = 0.02;
declare const BSC_TESTNET_MIN_BNB = 0.02;
declare const BSC_MAINNET_MIN_U = 1;
declare const BSC_TESTNET_MIN_U = 1;
declare const BSC_TESTNET_TBNB_TELEGRAM_FAUCET = "https://t.me/bnbchain_official_bot";
declare const BSC_TESTNET_U_TELEGRAM_FAUCET = "https://t.me/bnbchain_official_bot";
declare const BSC_TESTNET_FAUCET_DOCS_URL = "https://docs.bnbchain.org/bnb-smart-chain/developers/faucet/";
declare const BSC_TESTNET_U_FAUCET_URL = "https://united-coin-u.github.io/u-faucet/";
/** One-line tBNB funding hint: Telegram bot first, docs page for the rest. */
declare function tbnbFaucetHint(address?: string): string;
/** One-line U funding hint: Telegram bot first, web faucet for the fallback. */
declare function uFaucetHint(address?: string): string;
/**
 * Return network info for `name` ("bsc-mainnet" / "bsc-testnet").
 *
 * RPC resolution: explicit `rpcOverride` arg → the per-network env var
 * (STUDIO_BSC_RPC / STUDIO_BSC_TESTNET_RPC) → the public default.
 */
declare function getNetwork(name: string, rpcOverride?: string): NetworkInfo;
/**
 * Buyer spending allow-list: UI symbols from the SDK catalog, in catalog
 * order. Pass a network name for that chain only; omit it for the union of
 * every supported network (the Policy default when studio.toml omits
 * `allowed_payment_tokens`).
 */
declare function catalogPaymentAllowlist(networkName?: string): readonly string[];
/** Resolve an explicitly-typed asset reference and return its canonical ID. */
declare function resolveAssetId(networkName: string, reference: AssetReference): AssetId;
/**
 * Convert a non-negative USD stable price to the selected token's atomic
 * units without floating point or silent precision loss.
 */
declare function usdPriceToAtomic(networkName: string, assetId: AssetId | string, priceUsd: string): bigint;
/** Convert a USD price using the decimals of the B402 execution token. */
declare function b402UsdPriceToAtomic(networkName: string, assetId: AssetId | string, priceUsd: string): bigint;
/** Format non-negative atomic units using the selected token's decimals. */
declare function formatUsdAtomic(networkName: string, assetId: AssetId | string, atomic: bigint): string;
/**
 * SDK `NetworkConfig` for `name` with studio's per-network RPC applied
 * (USABILITY-11): the SDK's own resolution (RPC_URL et al.) is preserved,
 * but an explicitly-set per-network STUDIO_BSC_* override wins, so
 * studio-mediated SDK calls hit the same RPC as studio's reads.
 *
 * RPC precedence: STUDIO_BSC_<net> > RPC_URL (SDK) > preset default.
 * Paymaster precedence: disabled > per-network URL override > SDK preset.
 */
declare function sdkNetwork(name: string): NetworkConfig;
/**
 * Convert a human-readable amount (e.g. "1.5") to raw on-chain units.
 * Excess fractional digits are truncated toward zero (Decimal -> int parity).
 */
declare function toRaw(amount: string | number | bigint, decimals: number): bigint;
/** Convert raw on-chain units to a human-readable decimal string. */
declare function fromRaw(raw: bigint | number, decimals: number): string;

export { type AssetReference, type B402TokenInfo, BSC_MAINNET_MIN_BNB, BSC_MAINNET_MIN_U, BSC_TESTNET_FAUCET_DOCS_URL, BSC_TESTNET_MIN_BNB, BSC_TESTNET_MIN_U, BSC_TESTNET_TBNB_TELEGRAM_FAUCET, BSC_TESTNET_U_FAUCET_URL, BSC_TESTNET_U_TELEGRAM_FAUCET, DEFAULT_CHAIN_ID, DEFAULT_RPC, ERC8183_SUBMIT_GAS_RESERVE_BNB, NetworkInfo, PAYMASTER_URL_ENV_VAR, PaymentSymbolUnavailableError, RPC_ENV_VAR, type TokenInfo, U_TOKEN_BSC_MAINNET, U_TOKEN_BSC_TESTNET, b402UsdPriceToAtomic, catalogPaymentAllowlist, formatUsdAtomic, fromRaw, getNetwork, resolveAssetId, sdkNetwork, tbnbFaucetHint, toRaw, uFaucetHint, usdPriceToAtomic };
