import { B402Transport, B402ReplayStore } from '@bnb-chain/b402/server';
import { TomlTable } from '../config.cjs';
import { S as SellerCapabilitySnapshot } from '../capabilities-Z0oNaR0S.cjs';
import { S as SellerCapabilityController } from '../capabilityAdapters-edPpZIHX.cjs';
import { B as B402SellerPolicy, X as X402RunWork, a as X402SellerState, b as X402HttpRequest, c as X402HttpResponse } from '../envelope-BBTGjPOn.cjs';
export { d as B402SellerPolicyFields, e as createEnvelopeMiddleware } from '../envelope-BBTGjPOn.cjs';
import '@bnbagent/sdk/networks';
import '@bnb-chain/b402';

declare const B402_PAYMENT_PROTOCOLS: readonly ["x402", "mpp"];
type B402PaymentProtocol = (typeof B402_PAYMENT_PROTOCOLS)[number];
declare const B402_SELL_PATHS: Readonly<Record<B402PaymentProtocol, string>>;
/**
 * Resolve the one public HTTP payment protocol used by the B402 seller.
 *
 * `[stack].protocols` is authoritative for new projects. Older projects did
 * not have a payment-protocol choice, so `[payments.x402_seller]` keeps its
 * historical x402 meaning. A canonical `[payments.b402_seller]` without an
 * explicit face also defaults to x402 for a non-breaking migration.
 */
declare function resolveB402PaymentProtocol(cfg: TomlTable | null | undefined): B402PaymentProtocol;
declare function b402SellPath(cfg: TomlTable | null | undefined): string;

declare const MPP_SELL_PATH = "/mpp";
interface MppSellerCreateOptions {
    readonly cfg?: TomlTable;
    readonly networkName?: string;
    readonly walletAddress: `0x${string}`;
    readonly resourceUrl: string;
    readonly runWork: X402RunWork;
    readonly env?: NodeJS.ProcessEnv;
    readonly replayStore?: B402ReplayStore;
}
interface MppChallengeRuntime {
    readonly transport: B402Transport;
    readonly replayStore: B402ReplayStore;
    readonly secretKey: string;
    readonly realm: string;
    readonly payTo: `0x${string}`;
    readonly projectRoot: string;
    readonly networkName: string;
    readonly chainId: number;
}
/** MPP HTTP adapter for the shared B402 seller policy/provider. */
declare class MppSeller {
    #private;
    constructor(options: {
        policy: B402SellerPolicy;
        capabilities: SellerCapabilityController;
        runtime: MppChallengeRuntime | null;
        resourceUrl: string;
        runWork: X402RunWork;
    });
    get state(): X402SellerState;
    capabilitySnapshot(): SellerCapabilitySnapshot | null;
    capabilityStatus(): X402SellerState;
    refreshCapabilities(): Promise<SellerCapabilitySnapshot>;
    stop(): void;
    static create(options: MppSellerCreateOptions): Promise<MppSeller>;
    handle(request: X402HttpRequest): Promise<X402HttpResponse>;
}

declare function _setB402ReplayStore(store: B402ReplayStore | null): void;
declare function _resetB402ReplayStore(): void;
/**
 * Resolve the replay guard required by MPP `b402/charge`.
 *
 * Memory is safe for local development and tests. Production callers must
 * inject a durable atomic store shared by every instance. Managed trial
 * sandboxes may explicitly opt into their single-process memory boundary.
 */
declare function resolveB402ReplayStore(options?: {
    readonly env?: NodeJS.ProcessEnv;
    readonly replayStore?: B402ReplayStore;
    readonly requireDurableInProduction?: boolean;
}): B402ReplayStore;

interface B402SellerCreateOptions {
    readonly cfg?: TomlTable;
    readonly networkName?: string;
    readonly walletAddress: `0x${string}`;
    readonly resourceUrl: string;
    readonly runWork: X402RunWork;
    readonly env?: NodeJS.ProcessEnv;
    readonly replayStore?: B402ReplayStore;
}
/** Selects exactly one public protocol adapter over the common B402 seller. */
declare class B402Seller {
    #private;
    readonly protocol: B402PaymentProtocol;
    readonly path: string;
    private constructor();
    /** Always reflects the selected adapter's current state. */
    get state(): X402SellerState;
    capabilitySnapshot(): SellerCapabilitySnapshot | null;
    capabilityStatus(): X402SellerState;
    refreshCapabilities(): Promise<SellerCapabilitySnapshot | null>;
    stop(): void;
    static create(options: B402SellerCreateOptions): Promise<B402Seller>;
    handle(request: X402HttpRequest): Promise<X402HttpResponse>;
}

export { X402HttpRequest as B402HttpRequest, X402HttpResponse as B402HttpResponse, type B402PaymentProtocol, X402RunWork as B402RunWork, B402Seller, type B402SellerCreateOptions, B402SellerPolicy, X402SellerState as B402SellerState, B402_PAYMENT_PROTOCOLS, B402_SELL_PATHS, MPP_SELL_PATH, MppSeller, type MppSellerCreateOptions, _resetB402ReplayStore, _setB402ReplayStore, b402SellPath, resolveB402PaymentProtocol, resolveB402ReplayStore };
