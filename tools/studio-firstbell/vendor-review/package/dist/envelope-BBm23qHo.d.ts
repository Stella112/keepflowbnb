import { BazaarMetadata } from '@bnb-chain/b402';
import { TomlTable } from './config.js';
import { B402ReplayStore } from '@bnb-chain/b402/server';
import { S as SellerCapabilitySnapshot } from './capabilities-Z0oNaR0S.js';

type X402SellerCapabilityState = "disabled" | "dormant" | "degraded" | "active";

interface B402SellerPolicyFields {
    readonly enabled?: boolean;
    readonly priceUsd?: string;
    readonly assets?: readonly string[];
    readonly payTo?: `0x${string}` | null;
    readonly workTimeoutSeconds?: number;
    readonly bazaar?: BazaarMetadata | null;
}
/** Protocol-neutral seller policy shared by the x402 and MPP adapters. */
declare class B402SellerPolicy {
    readonly enabled: boolean;
    readonly priceUsd: string;
    readonly assets: readonly string[];
    readonly payTo: `0x${string}` | null;
    readonly workTimeoutSeconds: number;
    readonly bazaar: BazaarMetadata | null;
    constructor(fields?: B402SellerPolicyFields);
    static fromToml(cfg: TomlTable | null | undefined): B402SellerPolicy;
}

type X402SellerState = X402SellerCapabilityState;
interface X402HttpRequest {
    readonly method: string;
    readonly path: string;
    readonly headers: Record<string, string>;
    readonly query?: Record<string, string>;
    readonly body?: string;
}
interface X402HttpResponse {
    readonly status: number;
    readonly headers: Record<string, string>;
    readonly body: string;
}
type X402RunWork = (input: {
    prompt: string;
    payer?: string;
}) => Promise<string>;
interface X402SellerCreateOptions {
    readonly cfg?: TomlTable;
    readonly networkName?: string;
    readonly walletAddress: `0x${string}`;
    readonly resourceUrl: string;
    readonly runWork: X402RunWork;
    readonly env?: NodeJS.ProcessEnv;
    readonly replayStore?: B402ReplayStore;
}
declare class X402Seller {
    #private;
    private constructor();
    /** Dynamic state from the same immutable capability snapshot as requests. */
    get state(): X402SellerState;
    /** Read-only capability status entrypoint for status/health consumers. */
    capabilitySnapshot(): SellerCapabilitySnapshot | null;
    capabilityStatus(): X402SellerState;
    refreshCapabilities(): Promise<SellerCapabilitySnapshot>;
    stop(): void;
    static create(options: X402SellerCreateOptions): Promise<X402Seller>;
    handle(request: X402HttpRequest): Promise<X402HttpResponse>;
}

interface MiddlewareRequest {
    body?: unknown;
}
interface MiddlewareResponse {
    status(code: number): MiddlewareResponse;
    json(body: unknown): unknown;
}
type EnvelopeMiddleware = (req: MiddlewareRequest, res: MiddlewareResponse, next: () => void) => void;
/**
 * Detect the platform HTTP envelope at the Express root and dispatch its
 * unpacked request over loopback. Ordinary A2A/MCP requests pass through.
 */
declare function createEnvelopeMiddleware(opts: {
    port: number;
}): EnvelopeMiddleware;

export { B402SellerPolicy as B, type EnvelopeMiddleware as E, type X402RunWork as X, type X402SellerState as a, type X402HttpRequest as b, type X402HttpResponse as c, type B402SellerPolicyFields as d, createEnvelopeMiddleware as e, X402Seller as f, type X402SellerCreateOptions as g };
