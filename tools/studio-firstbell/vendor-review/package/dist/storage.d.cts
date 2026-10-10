import { StorageProvider, IPFSStorageProvider, LocalStorageProvider } from '@bnbagent/sdk/storage';
import { TomlTable } from './config.cjs';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { StorageError } from '@bnbagent/sdk';

type JsonRecord = Record<string, unknown>;
interface S3Sender {
    send(command: PutObjectCommand): Promise<unknown>;
}
interface BlockBlobLike {
    uploadData(data: Uint8Array, options: {
        conditions: {
            ifNoneMatch: string;
        };
        blobHTTPHeaders: {
            blobContentType: string;
        };
        metadata: Record<string, string>;
    }): Promise<unknown>;
}
interface ContainerLike {
    getBlockBlobClient(name: string): BlockBlobLike;
}
interface S3DeliverableStorageOptions {
    bucket: string;
    region: string;
    keyPrefix?: string;
    publicBaseUrl?: string;
    endpoint?: string;
    credentialMode?: "env" | "ambient";
}
interface AzureBlobDeliverableStorageOptions {
    accountUrl: string;
    container: string;
    keyPrefix?: string;
    publicBaseUrl?: string;
    credentialMode?: "env" | "ambient";
}
interface PlatformDeliverableStorageOptions {
    apiUrl: string;
    token: string;
}
/** Stable bytes used for both the object body and its content-addressed key. */
declare function serialiseDeliverable(data: JsonRecord): string;
declare function sha256Hex(content: string): string;
/** Reject URLs that cannot be a durable public reference on-chain. */
declare function assertStablePublicUrl(value: string): URL;
/** Download-only resolver for stable HTTPS deliverable references. */
declare class HttpDeliverableStorageProvider extends StorageProvider {
    readonly usesFileUrl = false;
    upload(): Promise<string>;
    download(url: string): Promise<JsonRecord>;
    exists(url: string): Promise<boolean>;
}
/** Platform-managed storage: the runtime gets only a scoped upload token, never cloud credentials. */
declare class PlatformDeliverableStorageProvider extends StorageProvider {
    readonly usesFileUrl = false;
    readonly options: Readonly<PlatformDeliverableStorageOptions>;
    constructor(options: PlatformDeliverableStorageOptions);
    upload(data: JsonRecord): Promise<string>;
    download(url: string): Promise<JsonRecord>;
    exists(url: string): Promise<boolean>;
}
/** ERC-8183 deliverables stored in a user-owned S3 bucket. */
declare class S3DeliverableStorageProvider extends StorageProvider {
    readonly usesFileUrl = false;
    readonly options: Readonly<S3DeliverableStorageOptions>;
    private sender?;
    private readonly credentials?;
    constructor(options: S3DeliverableStorageOptions, sender?: S3Sender);
    private urlFor;
    upload(data: JsonRecord): Promise<string>;
    download(url: string): Promise<JsonRecord>;
    exists(url: string): Promise<boolean>;
}
/** ERC-8183 deliverables stored in a user-owned Azure Blob container. */
declare class AzureBlobDeliverableStorageProvider extends StorageProvider {
    readonly usesFileUrl = false;
    readonly options: Readonly<AzureBlobDeliverableStorageOptions>;
    private containerClient?;
    private readonly credential?;
    constructor(options: AzureBlobDeliverableStorageOptions, containerClient?: ContainerLike);
    private getContainerClient;
    private urlFor;
    upload(data: JsonRecord): Promise<string>;
    download(url: string): Promise<JsonRecord>;
    exists(url: string): Promise<boolean>;
}

/** A reachable storage object whose returned bytes are not valid content. */
declare class DeliverableContentError extends StorageError {
}

/**
 * Storage-provider selection for ERC-8183 deliverables — port of
 * `bnbagent_studio_core/storage.py`.
 *
 * The bnbagent SDK ships two `StorageProvider` implementations
 * (`LocalStorageProvider` / `IPFSStorageProvider`) but no selector — the
 * caller must choose. This module is studio's single selection point: it
 * reads `[storage].kind` from studio.toml and returns the matching provider
 * for the Agent's write path (`submit` workflow).
 *
 * Provider matrix:
 *
 *     kind    write path (readOnly=false)          read path (readOnly=true)
 *     -----   -----------------------------------  ---------------------------
 *     local   LocalStorageProvider.fromEnv         LocalStorageProvider.fromEnv
 *     ipfs    GenericIPFSStorageProvider.fromEnv   GenericIPFSStorageProvider
 *             (needs STORAGE_API_URL; key per the  (gateway only, no key)
 *             service's auth requirements)
 *     s3      S3DeliverableStorageProvider          HTTPS resolver
 *     azure-  AzureBlobDeliverableStorageProvider   HTTPS resolver
 *     blob
 */

declare const DEFAULT_IPFS_GATEWAY = "https://ipfs.io/ipfs/";
declare const DEFAULT_MAX_IPFS_UPLOAD_BYTES: number;
/** SDK local storage with content failures separated from read failures. */
declare class StudioLocalStorageProvider extends LocalStorageProvider {
    static fromEnv(): StudioLocalStorageProvider;
    download(url: string): Promise<Record<string, unknown>>;
}
/**
 * Vendor-neutral IPFS upload over the common pinning-service API shapes.
 *
 * There is no single standard for *uploading* content to IPFS, but in
 * practice every service is "an endpoint + a bearer key" in one of three
 * shapes, auto-detected from `STORAGE_API_URL`:
 *
 * - path contains `/api/v0/add` -> IPFS node RPC: multipart file upload
 *   (self-hosted Kubo nodes usually need no key)
 * - path contains `/pinning/pin` -> legacy JSON-pin API: the JSON body
 *   wrapped in a pin envelope
 * - anything else -> plain POST of the JSON body with a Bearer key
 *
 * The CID is read from whichever of `IpfsHash` / `Hash` / `cid` /
 * `value.cid` the response carries. Download/exists/gateway handling is
 * inherited from the SDK provider unchanged.
 */
declare class GenericIPFSStorageProvider extends IPFSStorageProvider {
    readonly pinningApiUrl: string;
    readonly pinningApiKey: string;
    readonly gatewayUrl: string;
    readonly studioMaxUploadBytes: number;
    constructor(pinningApiUrl: string, pinningApiKey: string, gatewayUrl?: string, maxUploadBytes?: number);
    static fromEnv(): GenericIPFSStorageProvider;
    download(url: string): Promise<Record<string, unknown>>;
    upload(data: Record<string, unknown>, filename?: string): Promise<string>;
    private assertUploadSize;
}
/** Validate storage ownership before accepting jobs, without constructing clients or contacting storage. */
declare function resolveStorageMode(cfg: TomlTable): "platform" | "byos";
/**
 * Return a `StorageProvider` chosen by `[storage].kind` in studio.toml.
 *
 * @param cfg - Parsed studio.toml. If omitted, loads it via
 *   `loadStudioToml()` (falls back to local if absent).
 * @param readOnly - When true and kind is IPFS, build a gateway-only
 *   provider with no upload endpoint or key (download-only path). When
 *   false, the IPFS provider is built from env and requires
 *   `STORAGE_API_URL` (the Agent's write path).
 */
declare function storageProviderFromConfig(cfg?: TomlTable | null, readOnly?: boolean): StorageProvider;
/** Resolve the reader from the actual on-chain URL, never the buyer's writer config. */
declare function storageProviderForUrl(url: string): StorageProvider;

export { AzureBlobDeliverableStorageProvider, DEFAULT_IPFS_GATEWAY, DEFAULT_MAX_IPFS_UPLOAD_BYTES, DeliverableContentError, GenericIPFSStorageProvider, HttpDeliverableStorageProvider, PlatformDeliverableStorageProvider, S3DeliverableStorageProvider, StudioLocalStorageProvider, assertStablePublicUrl, resolveStorageMode, serialiseDeliverable, sha256Hex, storageProviderForUrl, storageProviderFromConfig };
