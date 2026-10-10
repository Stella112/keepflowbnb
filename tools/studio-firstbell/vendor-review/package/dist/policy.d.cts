import { TomlTable as TomlTable$1 } from './config.cjs';
import { AssetId } from '@bnbagent/sdk/networks';

type TomlTable = Record<string, unknown>;
type SellerRail = "erc8183" | "b402";
type SellerPolicySource = "canonical" | "legacy";
declare const SELLER_POLICY_AMBIGUOUS_ERROR = "ambiguous seller configuration: [payments.seller] cannot be combined with legacy seller price or asset fields; use payments.seller.price_usd and payments.seller.assets only (explicit legacy migration is required)";
declare class SellerPolicyConfigError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
type SellerPrice = Readonly<{
    kind: "usd";
    value: string;
}> | Readonly<{
    kind: "atomic";
    value: string | null;
    min: string | null;
    max: string | null;
}>;
/** Immutable, rail-consumable seller price and canonical asset selection. */
interface SellerPolicy {
    readonly network: string;
    readonly assets: readonly AssetId[];
    readonly price: SellerPrice;
}
interface ResolvedSellerPolicy {
    readonly source: SellerPolicySource;
    readonly policy: SellerPolicy;
}
interface ResolveSellerPolicyOptions {
    /** Explicit request/deployment network; takes precedence over studio.toml. */
    readonly network?: string;
}
/**
 * Resolve the shared seller policy without conflating legacy rail semantics.
 *
 * Canonical `[payments.seller]` is common to both rails. Without it, ERC-8183
 * keeps atomic U pricing while B402 keeps decimal-USD U pricing. Callers must
 * inspect `source` and `price.kind`; an atomic value is never exposed as USD.
 */
declare function resolveSellerPolicy(cfg: TomlTable | null | undefined, rail: SellerRail, options?: ResolveSellerPolicyOptions): ResolvedSellerPolicy;
/** True when canonical configuration exists, even if its table is malformed. */
declare function hasCanonicalSellerPolicy(cfg: TomlTable | null | undefined): boolean;

/**
 * Frozen Policy built from studio.toml — port of
 * `bnbagent_studio_core/policy.py`.
 *
 * v0.0.1 settlement model: single-chain (BSC). Buyer spending defaults to
 * every catalog payment symbol (U / USDC / USDT / USD1); an explicit
 * `allowed_payment_tokens` list is an opt-in lock-down:
 *
 *     [payments]
 *     budget_cap_u = "100"
 *     default_budget_u = "10"
 *     max_per_request_u = "5"
 *     allowed_payment_tokens = ["U", "USDC", "USDT", "USD1"]
 *
 * Amount fields are decimal STRINGS (never floats) to preserve precision
 * for token amounts — the TS stand-in for Python's Decimal.
 */

interface PolicyFields {
    budgetCapU?: string;
    defaultBudgetU?: string;
    maxPerRequestU?: string;
    allowedPaymentTokens?: readonly string[];
    erc8183?: Record<string, unknown>;
    x402?: Record<string, unknown>;
}
/**
 * Spending and behavior policy for the agent. Frozen so accidental
 * mutation post-construction throws.
 */
declare class Policy {
    readonly budgetCapU: string;
    readonly defaultBudgetU: string;
    readonly maxPerRequestU: string;
    readonly allowedPaymentTokens: readonly string[];
    readonly erc8183: Record<string, unknown>;
    readonly x402: Record<string, unknown>;
    constructor(fields?: PolicyFields);
    static fromToml(data: TomlTable$1): Policy;
    /** True if `symbol` is on the spending allow-list. */
    isTokenAllowed(symbol: string): boolean;
}
/**
 * Build a Policy from the project's studio.toml. Not cached — config can be
 * reloaded by callers if needed.
 */
declare function getPolicy(): Policy;

export { Policy, type PolicyFields, type ResolveSellerPolicyOptions, type ResolvedSellerPolicy, SELLER_POLICY_AMBIGUOUS_ERROR, type SellerPolicy, SellerPolicyConfigError, type SellerPolicySource, type SellerPrice, type SellerRail, getPolicy, hasCanonicalSellerPolicy, resolveSellerPolicy };
