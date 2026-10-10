"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/storage.ts
var storage_exports = {};
__export(storage_exports, {
  AzureBlobDeliverableStorageProvider: () => AzureBlobDeliverableStorageProvider,
  DEFAULT_IPFS_GATEWAY: () => DEFAULT_IPFS_GATEWAY,
  DEFAULT_MAX_IPFS_UPLOAD_BYTES: () => DEFAULT_MAX_IPFS_UPLOAD_BYTES,
  DeliverableContentError: () => DeliverableContentError,
  GenericIPFSStorageProvider: () => GenericIPFSStorageProvider,
  HttpDeliverableStorageProvider: () => HttpDeliverableStorageProvider,
  PlatformDeliverableStorageProvider: () => PlatformDeliverableStorageProvider,
  S3DeliverableStorageProvider: () => S3DeliverableStorageProvider,
  StudioLocalStorageProvider: () => StudioLocalStorageProvider,
  assertStablePublicUrl: () => assertStablePublicUrl,
  resolveStorageMode: () => resolveStorageMode,
  serialiseDeliverable: () => serialiseDeliverable,
  sha256Hex: () => sha256Hex,
  storageProviderForUrl: () => storageProviderForUrl,
  storageProviderFromConfig: () => storageProviderFromConfig
});
module.exports = __toCommonJS(storage_exports);
var import_sdk4 = require("@bnbagent/sdk");
var import_storage2 = require("@bnbagent/sdk/storage");

// src/config.ts
var import_node_fs = require("fs");
var import_node_os = require("os");
var import_node_path = require("path");
var import_smol_toml = require("smol-toml");
var STUDIO_TOML = "studio.toml";
var GLOBAL_REGISTRY_PATH = (0, import_node_path.join)(
  (0, import_node_os.homedir)(),
  ".bnbagent-studio",
  "projects.toml"
);
var APP_DIR = "app";
var StudioTomlNotFoundError = class extends Error {
  constructor() {
    super(`No ${STUDIO_TOML} found in cwd or any parent directory.`);
    this.name = "StudioTomlNotFoundError";
  }
};
var StudioTomlPathError = class extends Error {
  path;
  kind;
  constructor(path, kind, options) {
    const causeDetail = options?.cause instanceof Error ? `: ${options.cause.message}` : "";
    super(
      `Expected a regular ${STUDIO_TOML} at ${path}; found ${kind}${causeDetail}`,
      options
    );
    this.name = "StudioTomlPathError";
    this.path = path;
    this.kind = kind;
  }
};
function statKind(stat) {
  if (stat.isDirectory()) return "directory";
  if (stat.isFIFO()) return "fifo";
  if (stat.isSocket()) return "socket";
  if (stat.isCharacterDevice()) return "character-device";
  if (stat.isBlockDevice()) return "block-device";
  return "non-regular file";
}
function isRegularStudioToml(path) {
  let linkStat;
  try {
    linkStat = (0, import_node_fs.lstatSync)(path);
  } catch (cause) {
    const code = cause.code;
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw new StudioTomlPathError(path, "unreadable path", { cause });
  }
  if (linkStat.isFile()) return true;
  if (!linkStat.isSymbolicLink()) {
    throw new StudioTomlPathError(path, statKind(linkStat));
  }
  let targetStat;
  try {
    targetStat = (0, import_node_fs.statSync)(path);
  } catch (cause) {
    throw new StudioTomlPathError(path, "dangling symbolic link", { cause });
  }
  if (targetStat.isFile()) return true;
  throw new StudioTomlPathError(
    path,
    `symbolic link to ${statKind(targetStat)}`
  );
}
function isDir(path) {
  try {
    return (0, import_node_fs.statSync)(path).isDirectory();
  } catch {
    return false;
  }
}
function selfAndParents(start) {
  const out = [];
  let current = (0, import_node_path.resolve)(start);
  for (; ; ) {
    out.push(current);
    const parent = (0, import_node_path.dirname)(current);
    if (parent === current) return out;
    current = parent;
  }
}
function workspaceBase(root) {
  for (const base of [(0, import_node_path.join)(root, APP_DIR), root]) {
    if (isRegularStudioToml((0, import_node_path.join)(base, "agent", STUDIO_TOML))) return base;
  }
  return null;
}
function findProjectRoot(start) {
  const current = start !== void 0 ? (0, import_node_path.resolve)(start) : process.cwd();
  for (const candidate of selfAndParents(current)) {
    if (isRegularStudioToml((0, import_node_path.join)(candidate, STUDIO_TOML))) return candidate;
  }
  for (const candidate of selfAndParents(current)) {
    const base = workspaceBase(candidate);
    if (base !== null) return (0, import_node_path.join)(base, "agent");
  }
  return null;
}
function loadStudioToml(path) {
  let tomlPath;
  if (path === void 0) {
    const root = findProjectRoot();
    if (root === null) {
      throw new StudioTomlNotFoundError();
    }
    tomlPath = (0, import_node_path.join)(root, STUDIO_TOML);
  } else {
    tomlPath = isDir(path) ? (0, import_node_path.join)(path, STUDIO_TOML) : path;
  }
  isRegularStudioToml(tomlPath);
  return (0, import_smol_toml.parse)((0, import_node_fs.readFileSync)(tomlPath, "utf-8"));
}

// src/objectStorage.ts
var import_node_crypto = require("crypto");
var import_sdk3 = require("@bnbagent/sdk");
var import_storage = require("@bnbagent/sdk/storage");

// src/publicDestination.ts
var import_promises = require("dns/promises");
var import_node_https = require("https");
var import_node_net = require("net");
var import_node_stream = require("stream");
var import_sdk = require("@bnbagent/sdk");
var reserved = new import_node_net.BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3]
])
  reserved.addSubnet(address, prefix, "ipv4");
var globalV6 = new import_node_net.BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
reserved.addSubnet("2001::", 23, "ipv6");
reserved.addSubnet("2001:db8::", 32, "ipv6");
reserved.addSubnet("2002::", 16, "ipv6");
function unsafeAddress(address) {
  const family = (0, import_node_net.isIP)(address);
  if (family === 4) return reserved.check(address, "ipv4");
  if (family === 6) {
    return !globalV6.check(address, "ipv6") || reserved.check(address, "ipv6");
  }
  return true;
}
function assertPublicHostname(url) {
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || (0, import_node_net.isIP)(host) !== 0 && unsafeAddress(host)) {
    throw new import_sdk.StorageError(
      "Deliverable destination must not be private, loopback, or reserved."
    );
  }
}
async function publicAddresses(url, signal) {
  assertPublicHostname(url);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let onAbort = () => {
  };
  try {
    signal.throwIfAborted();
    const addresses = await Promise.race([
      (0, import_promises.lookup)(host, { all: true, verbatim: true }),
      new Promise((_resolve, reject) => {
        onAbort = () => reject(signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
      })
    ]);
    if (addresses.length === 0 || addresses.some(({ address }) => unsafeAddress(address))) {
      throw new import_sdk.StorageError(
        "Deliverable destination resolves to a private or reserved address."
      );
    }
    return addresses;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
var readTransportOverride = null;
async function fetchPublicDestination(url, method, signal) {
  const addresses = await publicAddresses(url, signal);
  const init = {
    method,
    signal,
    redirect: "error",
    headers: { Accept: "application/json", "Accept-Encoding": "identity" }
  };
  if (readTransportOverride) return readTransportOverride(url, init, addresses);
  const pinnedLookup = (_hostname, options, callback) => {
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0]?.address ?? "", addresses[0]?.family ?? 4);
  };
  return new Promise((resolve2, reject) => {
    const req = (0, import_node_https.request)(
      url,
      {
        method,
        signal,
        lookup: pinnedLookup,
        agent: false,
        rejectUnauthorized: true,
        headers: { Accept: "application/json", "Accept-Encoding": "identity" }
      },
      (res) => {
        try {
          const status = res.statusCode ?? 502;
          if (status < 200 || status > 599) {
            throw new import_sdk.StorageError(
              `Unsupported deliverable HTTP status: ${status}.`
            );
          }
          const headers = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value !== void 0)
              headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          }
          const noBody = method === "HEAD" || [204, 205, 304].includes(status);
          if (noBody) res.resume();
          resolve2(
            new Response(
              noBody ? null : import_node_stream.Readable.toWeb(res),
              { status, headers }
            )
          );
        } catch (error) {
          res.destroy();
          reject(error);
        }
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// src/storageErrors.ts
var import_sdk2 = require("@bnbagent/sdk");
var DeliverableContentError = class extends import_sdk2.StorageError {
};

// src/objectStorage.ts
var DEFAULT_KEY_PREFIX = "deliverables";
var MAX_DELIVERABLE_BYTES = 10 * 1024 * 1024;
var SHA256_PATH = /(?:^|\/)sha256\/([0-9a-f]{64})\.json$/i;
function canonicalise(value) {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const entry = value[key];
      if (entry !== void 0) out[key] = canonicalise(entry);
    }
    return out;
  }
  return value;
}
function serialiseDeliverable(data) {
  return JSON.stringify(canonicalise(data));
}
function sha256Hex(content) {
  return (0, import_node_crypto.createHash)("sha256").update(content, "utf8").digest("hex");
}
function cleanSegment(value, label) {
  const clean = value.trim().replace(/^\/+|\/+$/g, "");
  if (!clean || clean === "." || clean === ".." || clean.includes("\\")) {
    throw new import_sdk3.StorageError(`${label} must be a non-empty object-key segment.`);
  }
  return clean;
}
function objectKey(prefix, digest) {
  const cleanPrefix = cleanSegment(
    prefix ?? DEFAULT_KEY_PREFIX,
    "storage.key_prefix"
  );
  return `${cleanPrefix}/sha256/${digest}.json`;
}
function encodedObjectKey(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}
function assertUploadWithinLimit(body) {
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > MAX_DELIVERABLE_BYTES) {
    throw new import_sdk3.StorageError(
      `Deliverable exceeds the ${MAX_DELIVERABLE_BYTES}-byte upload limit.`
    );
  }
}
function assertStablePublicUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new import_sdk3.StorageError(`Invalid deliverable public URL: ${value}`);
  }
  if (url.protocol !== "https:") {
    throw new import_sdk3.StorageError(
      `Deliverable public URL must use https (received ${url.protocol || "no scheme"}).`
    );
  }
  if (url.username || url.password) {
    throw new import_sdk3.StorageError(
      "Deliverable public URL must not contain credentials."
    );
  }
  if (url.search) {
    throw new import_sdk3.StorageError(
      "Deliverable public URLs must not contain query parameters; temporary S3 presigned, Azure SAS, and CDN signed URLs cannot be published on-chain."
    );
  }
  assertPublicHostname(url);
  return url;
}
function publicUrl(base, key) {
  const parsed = assertStablePublicUrl(base);
  if (parsed.search || parsed.hash) {
    throw new import_sdk3.StorageError(
      "storage.public_base_url must not contain a query or fragment."
    );
  }
  const root = parsed.toString().replace(/\/+$/, "");
  return `${root}/${encodedObjectKey(key)}`;
}
function errorStatus(error) {
  if (typeof error !== "object" || error === null) return void 0;
  const record = error;
  const metadata = record.$metadata;
  if (typeof metadata === "object" && metadata !== null) {
    const status = metadata.httpStatusCode;
    if (typeof status === "number") return status;
  }
  for (const key of ["statusCode", "status"]) {
    if (typeof record[key] === "number") return record[key];
  }
  return void 0;
}
function alreadyExists(error) {
  if (errorStatus(error) === 409 || errorStatus(error) === 412) return true;
  if (typeof error !== "object" || error === null) return false;
  const name = String(error.name ?? "");
  const code = String(error.code ?? "");
  return [name, code].some(
    (value) => ["PreconditionFailed", "BlobAlreadyExists"].includes(value)
  );
}
async function responseTextWithinLimit(response) {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_DELIVERABLE_BYTES) {
    await response.body?.cancel();
    throw new DeliverableContentError(
      `Deliverable exceeds the ${MAX_DELIVERABLE_BYTES}-byte download limit.`
    );
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_DELIVERABLE_BYTES) {
        await reader.cancel();
        throw new DeliverableContentError(
          `Deliverable exceeds the ${MAX_DELIVERABLE_BYTES}-byte download limit.`
        );
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}
async function fetchPublicJson(value, expectedDigest) {
  const url = assertStablePublicUrl(value);
  const signal = AbortSignal.timeout(3e4);
  const response = await fetchPublicDestination(url, "GET", signal);
  if (!response.ok) {
    throw new import_sdk3.StorageError(
      `Public deliverable read failed: HTTP ${response.status} from ${url.origin}`
    );
  }
  const body = await responseTextWithinLimit(response);
  const pathDigest = url.pathname.match(SHA256_PATH)?.[1]?.toLowerCase();
  const digest = expectedDigest?.toLowerCase() ?? pathDigest;
  if (!digest) {
    console.warn(
      "[storage] Legacy HTTPS deliverable has no content hash; reading for compatibility without integrity verification. New deliverables should use /sha256/<digest>.json URLs."
    );
  }
  if (digest && sha256Hex(body) !== digest) {
    throw new DeliverableContentError(
      "Deliverable SHA-256 does not match its content-addressed URL."
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new DeliverableContentError("Public deliverable is not valid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new DeliverableContentError(
      "Public deliverable JSON must be an object."
    );
  }
  return { data: parsed, body };
}
var HttpDeliverableStorageProvider = class extends import_storage.StorageProvider {
  usesFileUrl = false;
  async upload() {
    throw new import_sdk3.StorageError("HTTPS deliverable resolver is read-only.");
  }
  async download(url) {
    return (await fetchPublicJson(url)).data;
  }
  async exists(url) {
    try {
      const stable = assertStablePublicUrl(url);
      const signal = AbortSignal.timeout(3e4);
      const response = await fetchPublicDestination(stable, "HEAD", signal);
      return response.ok;
    } catch {
      return false;
    }
  }
};
var PlatformDeliverableStorageProvider = class extends import_storage.StorageProvider {
  usesFileUrl = false;
  options;
  constructor(options) {
    super();
    const api = assertStablePublicUrl(options.apiUrl);
    if (api.search || api.hash) {
      throw new import_sdk3.StorageError(
        "BNBAGENT_DELIVERABLE_API_URL must not contain a query or fragment."
      );
    }
    const token = options.token.trim();
    if (!token) {
      throw new import_sdk3.StorageError("BNBAGENT_DELIVERABLE_TOKEN must not be empty.");
    }
    this.options = Object.freeze({
      apiUrl: api.toString().replace(/\/+$/, ""),
      token
    });
  }
  async upload(data) {
    const body = serialiseDeliverable(data);
    assertUploadWithinLimit(body);
    const digest = sha256Hex(body);
    const response = await fetch(this.options.apiUrl, {
      method: "POST",
      signal: AbortSignal.timeout(3e4),
      redirect: "error",
      body,
      headers: {
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new import_sdk3.StorageError(
        `Platform deliverable upload failed: HTTP ${response.status}.`
      );
    }
    const result = await response.json().catch(() => null);
    if (result?.content_hash !== digest || typeof result.url !== "string") {
      throw new import_sdk3.StorageError(
        "Platform deliverable response did not match the uploaded content hash."
      );
    }
    const url = assertStablePublicUrl(result.url).toString();
    if (new URL(url).pathname.match(SHA256_PATH)?.[1]?.toLowerCase() !== digest) {
      throw new import_sdk3.StorageError(
        "Platform deliverable must return a content-addressed URL matching the uploaded SHA-256 digest."
      );
    }
    await fetchPublicJson(url, digest);
    return url;
  }
  async download(url) {
    return (await fetchPublicJson(url)).data;
  }
  async exists(url) {
    return new HttpDeliverableStorageProvider().exists(url);
  }
};
var S3DeliverableStorageProvider = class extends import_storage.StorageProvider {
  usesFileUrl = false;
  options;
  sender;
  credentials;
  constructor(options, sender) {
    super();
    const bucket = cleanSegment(options.bucket, "storage.bucket");
    const region = cleanSegment(options.region, "storage.region");
    const credentialMode = options.credentialMode ?? "env";
    this.options = Object.freeze({
      ...options,
      bucket,
      region,
      credentialMode
    });
    if (options.endpoint && !options.publicBaseUrl) {
      throw new import_sdk3.StorageError(
        "S3-compatible storage.endpoint requires storage.public_base_url for durable public reads."
      );
    }
    if (options.endpoint) {
      const endpoint = assertStablePublicUrl(options.endpoint);
      if (endpoint.hash)
        throw new import_sdk3.StorageError("storage.endpoint must not contain a fragment.");
    }
    if (sender) {
      this.sender = sender;
      return;
    }
    if (credentialMode === "env") {
      const accessKeyId = process.env.DELIVERABLE_S3_ACCESS_KEY_ID?.trim();
      const secretAccessKey = process.env.DELIVERABLE_S3_SECRET_ACCESS_KEY?.trim();
      if (!accessKeyId || !secretAccessKey) {
        throw new import_sdk3.StorageError(
          "S3 deliverable storage requires DELIVERABLE_S3_ACCESS_KEY_ID and DELIVERABLE_S3_SECRET_ACCESS_KEY (or storage.credential_mode='ambient')."
        );
      }
      this.credentials = {
        accessKeyId,
        secretAccessKey,
        ...process.env.DELIVERABLE_S3_SESSION_TOKEN ? { sessionToken: process.env.DELIVERABLE_S3_SESSION_TOKEN } : {}
      };
    }
  }
  urlFor(key) {
    if (this.options.publicBaseUrl) {
      return publicUrl(this.options.publicBaseUrl, key);
    }
    return publicUrl(
      `https://${this.options.bucket}.s3.${this.options.region}.amazonaws.com`,
      key
    );
  }
  async upload(data) {
    const body = serialiseDeliverable(data);
    assertUploadWithinLimit(body);
    const digest = sha256Hex(body);
    const key = objectKey(this.options.keyPrefix, digest);
    const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
    let sender = this.sender;
    if (!sender) {
      sender = new S3Client({
        region: this.options.region,
        ...this.credentials ? { credentials: this.credentials } : {},
        ...this.options.endpoint ? { endpoint: this.options.endpoint, forcePathStyle: true } : {}
      });
      this.sender = sender;
    }
    try {
      await sender.send(
        new PutObjectCommand({
          Bucket: this.options.bucket,
          Key: key,
          Body: body,
          ContentType: "application/json",
          Metadata: { sha256: digest },
          IfNoneMatch: "*"
        })
      );
    } catch (error) {
      if (!alreadyExists(error)) {
        throw new import_sdk3.StorageError(
          `S3 deliverable upload failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    const url = this.urlFor(key);
    await fetchPublicJson(url, digest);
    return url;
  }
  async download(url) {
    return (await fetchPublicJson(url)).data;
  }
  async exists(url) {
    return new HttpDeliverableStorageProvider().exists(url);
  }
};
var AzureBlobDeliverableStorageProvider = class extends import_storage.StorageProvider {
  usesFileUrl = false;
  options;
  containerClient;
  credential;
  constructor(options, containerClient) {
    super();
    const account = assertStablePublicUrl(options.accountUrl);
    if (account.search || account.hash) {
      throw new import_sdk3.StorageError(
        "storage.account_url must not contain a query or fragment."
      );
    }
    const accountUrl = account.toString().replace(/\/+$/, "");
    const container = cleanSegment(options.container, "storage.container");
    const credentialMode = options.credentialMode ?? "env";
    this.options = Object.freeze({
      ...options,
      accountUrl,
      container,
      credentialMode
    });
    if (containerClient) {
      this.containerClient = containerClient;
      return;
    }
    if (credentialMode === "ambient") {
      this.credential = { kind: "ambient" };
    } else {
      const sas = process.env.DELIVERABLE_AZURE_SAS_TOKEN?.trim().replace(
        /^\?/,
        ""
      );
      if (sas) {
        this.credential = { kind: "sas", sas };
      } else {
        const tenantId = process.env.DELIVERABLE_AZURE_TENANT_ID?.trim();
        const clientId = process.env.DELIVERABLE_AZURE_CLIENT_ID?.trim();
        const clientSecret = process.env.DELIVERABLE_AZURE_CLIENT_SECRET?.trim();
        if (!tenantId || !clientId || !clientSecret) {
          throw new import_sdk3.StorageError(
            "Azure Blob deliverable storage requires DELIVERABLE_AZURE_SAS_TOKEN, a complete DELIVERABLE_AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET set, or storage.credential_mode='ambient'."
          );
        }
        this.credential = {
          kind: "client-secret",
          tenantId,
          clientId,
          clientSecret
        };
      }
    }
  }
  async getContainerClient() {
    if (this.containerClient) return this.containerClient;
    const { BlobServiceClient } = await import("@azure/storage-blob");
    let service;
    if (this.credential?.kind === "ambient") {
      const { DefaultAzureCredential } = await import("@azure/identity");
      service = new BlobServiceClient(
        this.options.accountUrl,
        new DefaultAzureCredential()
      );
    } else if (this.credential?.kind === "sas") {
      service = new BlobServiceClient(
        `${this.options.accountUrl}?${this.credential.sas}`
      );
    } else if (this.credential?.kind === "client-secret") {
      const { ClientSecretCredential } = await import("@azure/identity");
      service = new BlobServiceClient(
        this.options.accountUrl,
        new ClientSecretCredential(
          this.credential.tenantId,
          this.credential.clientId,
          this.credential.clientSecret
        )
      );
    } else {
      throw new import_sdk3.StorageError("Azure Blob credential configuration is missing.");
    }
    this.containerClient = service.getContainerClient(this.options.container);
    return this.containerClient;
  }
  urlFor(key) {
    const base = this.options.publicBaseUrl ?? `${this.options.accountUrl}/${encodeURIComponent(this.options.container)}`;
    return publicUrl(base, key);
  }
  async upload(data) {
    const body = serialiseDeliverable(data);
    assertUploadWithinLimit(body);
    const digest = sha256Hex(body);
    const key = objectKey(this.options.keyPrefix, digest);
    const containerClient = await this.getContainerClient();
    try {
      await containerClient.getBlockBlobClient(key).uploadData(new TextEncoder().encode(body), {
        conditions: { ifNoneMatch: "*" },
        blobHTTPHeaders: { blobContentType: "application/json" },
        metadata: { sha256: digest }
      });
    } catch (error) {
      if (!alreadyExists(error)) {
        throw new import_sdk3.StorageError(
          `Azure Blob deliverable upload failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    const url = this.urlFor(key);
    await fetchPublicJson(url, digest);
    return url;
  }
  async download(url) {
    return (await fetchPublicJson(url)).data;
  }
  async exists(url) {
    return new HttpDeliverableStorageProvider().exists(url);
  }
};

// src/storage.ts
var DEFAULT_IPFS_GATEWAY = "https://ipfs.io/ipfs/";
var DEFAULT_MAX_IPFS_UPLOAD_BYTES = 8 * 1024 * 1024;
function assertDeliverableRecord(value, source) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new DeliverableContentError(
      `${source} returned JSON that is not an object.`
    );
  }
  return value;
}
var StudioLocalStorageProvider = class _StudioLocalStorageProvider extends import_storage2.LocalStorageProvider {
  static fromEnv() {
    return new _StudioLocalStorageProvider(
      process.env.STORAGE_LOCAL_PATH || ".agent-data"
    );
  }
  async download(url) {
    try {
      return assertDeliverableRecord(
        await super.download(url),
        "Local storage"
      );
    } catch (cause) {
      if (cause instanceof import_sdk4.StorageError && cause.message.startsWith("Invalid JSON in file")) {
        throw new DeliverableContentError(cause.message);
      }
      throw cause;
    }
  }
};
function maxIpfsUploadBytesFromEnv() {
  const value = Number(process.env.STORAGE_MAX_UPLOAD_BYTES);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_MAX_IPFS_UPLOAD_BYTES;
}
var GenericIPFSStorageProvider = class _GenericIPFSStorageProvider extends import_storage2.IPFSStorageProvider {
  // The SDK provider keeps its endpoint/key/gateway TS-private, so keep our
  // own copies for the overridden upload() (and for diagnostics/tests).
  pinningApiUrl;
  pinningApiKey;
  gatewayUrl;
  studioMaxUploadBytes;
  constructor(pinningApiUrl, pinningApiKey, gatewayUrl = DEFAULT_IPFS_GATEWAY, maxUploadBytes = maxIpfsUploadBytesFromEnv()) {
    super(pinningApiUrl, pinningApiKey, gatewayUrl, maxUploadBytes);
    if (!Number.isInteger(maxUploadBytes) || maxUploadBytes <= 0) {
      throw new Error("maxUploadBytes must be a positive integer");
    }
    this.pinningApiUrl = pinningApiUrl;
    this.pinningApiKey = pinningApiKey;
    this.gatewayUrl = gatewayUrl;
    this.studioMaxUploadBytes = maxUploadBytes;
  }
  static fromEnv() {
    const apiUrl = process.env.STORAGE_API_URL;
    if (!apiUrl) {
      throw new Error(
        "STORAGE_API_URL required for [storage].kind=ipfs \u2014 set it to your pinning service's upload endpoint (or a self-hosted node's /api/v0/add)."
      );
    }
    return new _GenericIPFSStorageProvider(
      apiUrl,
      // Optional: hosted pinning services need a write key/JWT; a
      // self-hosted node typically doesn't.
      process.env.STORAGE_API_KEY ?? "",
      process.env.STORAGE_GATEWAY_URL || DEFAULT_IPFS_GATEWAY
    );
  }
  async download(url) {
    try {
      return assertDeliverableRecord(await super.download(url), "IPFS gateway");
    } catch (cause) {
      if (cause instanceof SyntaxError) {
        throw new DeliverableContentError(
          "IPFS gateway returned invalid JSON."
        );
      }
      throw cause;
    }
  }
  async upload(data, filename) {
    if (!this.pinningApiUrl) {
      throw new import_sdk4.StorageError(
        "This IPFS provider is read-only (no STORAGE_API_URL) \u2014 upload() is only available on the Agent's write path."
      );
    }
    let pinName;
    if (filename) {
      pinName = filename.replaceAll(".json", "");
    } else {
      const job = data.job;
      const jobId = typeof job === "object" && job !== null ? job.id : void 0;
      pinName = jobId ? `erc8183-job-${jobId}` : "deliverable";
    }
    const headers = {};
    if (this.pinningApiKey) {
      headers.Authorization = `Bearer ${this.pinningApiKey}`;
    }
    const path = this.pinningApiUrl.toLowerCase();
    const dataBody = JSON.stringify(data);
    let resp;
    if (path.includes("/api/v0/add")) {
      this.assertUploadSize(dataBody);
      const form = new FormData();
      form.append(
        "file",
        new Blob([dataBody], { type: "application/json" }),
        `${pinName}.json`
      );
      resp = await fetch(this.pinningApiUrl, {
        method: "POST",
        body: form,
        headers
      });
    } else if (path.includes("/pinning/pin")) {
      const body = JSON.stringify({
        pinataContent: data,
        pinataMetadata: { name: pinName }
      });
      this.assertUploadSize(body);
      resp = await fetch(this.pinningApiUrl, {
        method: "POST",
        body,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } else {
      this.assertUploadSize(dataBody);
      resp = await fetch(this.pinningApiUrl, {
        method: "POST",
        body: dataBody,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    if (!resp.ok) {
      throw new import_sdk4.StorageError(
        `IPFS upload failed: HTTP ${resp.status} from ${this.pinningApiUrl}`
      );
    }
    const result = await resp.json();
    const cid = extractCidFromResponse(result);
    if (!cid) {
      throw new import_sdk4.StorageError(
        `Unexpected pinning response: ${JSON.stringify(result)}`
      );
    }
    return `ipfs://${cid}`;
  }
  assertUploadSize(body) {
    const bytes = Buffer.byteLength(body);
    if (bytes > this.studioMaxUploadBytes) {
      throw new import_sdk4.StorageError(
        `IPFS upload payload is ${bytes} bytes; limit is ${this.studioMaxUploadBytes} bytes`
      );
    }
  }
};
function extractCidFromResponse(result) {
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    return null;
  }
  const r = result;
  for (const key of ["IpfsHash", "Hash", "cid"]) {
    const val = r[key];
    if (typeof val === "string" && val) return val;
  }
  const value = r.value;
  if (typeof value === "object" && value !== null) {
    const cid = value.cid;
    if (typeof cid === "string" && cid) return cid;
  }
  return null;
}
function resolveStorageMode(cfg) {
  const storageCfg = cfg.storage ?? {};
  const mode = process.env.BNBAGENT_DELIVERABLE_STORAGE_MODE?.trim().toLowerCase();
  const platformApiUrl = process.env.BNBAGENT_DELIVERABLE_API_URL?.trim();
  const platformToken = process.env.BNBAGENT_DELIVERABLE_TOKEN?.trim();
  if (mode && mode !== "platform" && mode !== "byos") {
    throw new import_sdk4.StorageError(
      "BNBAGENT_DELIVERABLE_STORAGE_MODE must be 'platform' or 'byos'."
    );
  }
  if (mode === "byos" || !mode && !platformApiUrl && !platformToken)
    return "byos";
  if (!mode && String(storageCfg.kind ?? "").trim()) {
    throw new import_sdk4.StorageError(
      "Platform deliverable credentials conflict with [storage].kind. Set BNBAGENT_DELIVERABLE_STORAGE_MODE=platform or byos to select the intended writer."
    );
  }
  if (!platformApiUrl || !platformToken) {
    throw new import_sdk4.StorageError(
      "Platform deliverable storage requires both BNBAGENT_DELIVERABLE_API_URL and BNBAGENT_DELIVERABLE_TOKEN."
    );
  }
  if (!mode) {
    console.warn(
      "[storage] Legacy platform-only configuration: set BNBAGENT_DELIVERABLE_STORAGE_MODE=platform on the next deployment."
    );
  }
  return "platform";
}
function storageProviderFromConfig(cfg, readOnly = false) {
  let resolved = cfg;
  if (resolved == null) {
    try {
      resolved = loadStudioToml();
    } catch (e) {
      const code = e.code;
      const notFound = code === "ENOENT" || e instanceof Error && e.message.startsWith("No studio.toml");
      if (!notFound) throw e;
      resolved = {};
    }
  }
  const storageCfg = resolved.storage ?? {};
  const kind = String(storageCfg.kind ?? "local").toLowerCase();
  if (!readOnly && resolveStorageMode(resolved) === "platform") {
    return new PlatformDeliverableStorageProvider({
      apiUrl: process.env.BNBAGENT_DELIVERABLE_API_URL ?? "",
      token: process.env.BNBAGENT_DELIVERABLE_TOKEN ?? ""
    });
  }
  if (kind === "ipfs") {
    if (readOnly) {
      return new GenericIPFSStorageProvider(
        "",
        "",
        process.env.STORAGE_GATEWAY_URL || DEFAULT_IPFS_GATEWAY
      );
    }
    return GenericIPFSStorageProvider.fromEnv();
  }
  if (kind === "s3") {
    if (readOnly) return new HttpDeliverableStorageProvider();
    const credentialMode = storageCredentialMode(storageCfg);
    return new S3DeliverableStorageProvider({
      bucket: requiredStorageString(storageCfg, "bucket", kind),
      region: requiredStorageString(storageCfg, "region", kind),
      keyPrefix: optionalStorageString(storageCfg, "key_prefix"),
      publicBaseUrl: optionalStorageString(storageCfg, "public_base_url"),
      endpoint: optionalStorageString(storageCfg, "endpoint"),
      credentialMode
    });
  }
  if (kind === "azure-blob") {
    if (readOnly) return new HttpDeliverableStorageProvider();
    const credentialMode = storageCredentialMode(storageCfg);
    return new AzureBlobDeliverableStorageProvider({
      accountUrl: requiredStorageString(storageCfg, "account_url", kind),
      container: requiredStorageString(storageCfg, "container", kind),
      keyPrefix: optionalStorageString(storageCfg, "key_prefix"),
      publicBaseUrl: optionalStorageString(storageCfg, "public_base_url"),
      credentialMode
    });
  }
  return StudioLocalStorageProvider.fromEnv();
}
function optionalStorageString(storageCfg, key) {
  const value = storageCfg[key];
  if (typeof value !== "string") return void 0;
  const clean = value.trim();
  return clean || void 0;
}
function requiredStorageString(storageCfg, key, kind) {
  const value = optionalStorageString(storageCfg, key);
  if (!value) {
    throw new import_sdk4.StorageError(`[storage].${key} is required for kind='${kind}'.`);
  }
  return value;
}
function storageCredentialMode(storageCfg) {
  const mode = String(storageCfg.credential_mode ?? "env").toLowerCase();
  if (mode !== "env" && mode !== "ambient") {
    throw new import_sdk4.StorageError(
      `[storage].credential_mode must be 'env' or 'ambient' (received '${mode}').`
    );
  }
  return mode;
}
function storageProviderForUrl(url) {
  if (url.startsWith("ipfs://")) {
    return new GenericIPFSStorageProvider(
      "",
      "",
      process.env.STORAGE_GATEWAY_URL || DEFAULT_IPFS_GATEWAY
    );
  }
  if (url.startsWith("file://")) return StudioLocalStorageProvider.fromEnv();
  if (url.startsWith("https://")) return new HttpDeliverableStorageProvider();
  throw new import_sdk4.StorageError(
    `Unsupported deliverable URL scheme; expected file://, ipfs://, or https:// (${url}).`
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AzureBlobDeliverableStorageProvider,
  DEFAULT_IPFS_GATEWAY,
  DEFAULT_MAX_IPFS_UPLOAD_BYTES,
  DeliverableContentError,
  GenericIPFSStorageProvider,
  HttpDeliverableStorageProvider,
  PlatformDeliverableStorageProvider,
  S3DeliverableStorageProvider,
  StudioLocalStorageProvider,
  assertStablePublicUrl,
  resolveStorageMode,
  serialiseDeliverable,
  sha256Hex,
  storageProviderForUrl,
  storageProviderFromConfig
});
