import {
  getNetwork
} from "./chunk-YQUACLG3.js";

// src/payments/capabilities.ts
var DEFAULT_REFRESH_INTERVAL_MS = 3e4;
var DEFAULT_TIMERS = Object.freeze({
  setInterval(callback, milliseconds) {
    const handle = globalThis.setInterval(callback, milliseconds);
    if (typeof handle === "object" && "unref" in handle) {
      handle.unref();
    }
    return handle;
  },
  clearInterval(handle) {
    globalThis.clearInterval(
      handle
    );
  }
});
var SellerCapabilityManager = class {
  #options;
  #assets;
  #b402Assets;
  #current = null;
  #refreshing = null;
  #starting = null;
  #lifecycleGeneration = 0;
  #started = false;
  #timer = null;
  constructor(options) {
    const network = getNetwork(options.network);
    if (options.assets.length === 0) {
      throw new Error("seller capability assets must not be empty");
    }
    if (new Set(options.assets).size !== options.assets.length) {
      throw new Error("seller capability assets must not contain duplicates");
    }
    this.#assets = Object.freeze(
      options.assets.map((assetId) => network.asset(assetId))
    );
    this.#b402Assets = Object.freeze(
      options.assets.map((assetId) => network.b402Asset(assetId))
    );
    this.#options = options;
  }
  async start() {
    if (this.#started && this.#starting?.generation === this.#lifecycleGeneration) {
      return this.#starting.promise;
    }
    if (this.#started && this.#current !== null) return this.#current;
    const milliseconds = this.#validatedRefreshInterval();
    const generation = ++this.#lifecycleGeneration;
    this.#started = true;
    const promise = this.#startOnce(generation, milliseconds);
    const starting = Object.freeze({ generation, promise });
    this.#starting = starting;
    try {
      return await promise;
    } finally {
      if (this.#starting === starting) this.#starting = null;
    }
  }
  async #startOnce(generation, milliseconds) {
    try {
      const snapshot = await this.refresh();
      if (this.#isCurrentStart(generation)) {
        this.#schedulePeriodicRefresh(milliseconds);
      }
      return snapshot;
    } catch (error) {
      if (this.#isCurrentStart(generation)) {
        this.#started = false;
        this.#lifecycleGeneration += 1;
        if (this.#timer !== null) {
          (this.#options.timers ?? DEFAULT_TIMERS).clearInterval(this.#timer);
          this.#timer = null;
        }
        this.#current = null;
      }
      throw error;
    }
  }
  #isCurrentStart(generation) {
    return this.#started && this.#lifecycleGeneration === generation;
  }
  refresh() {
    if (this.#refreshing !== null) return this.#refreshing;
    const refreshing = this.#performRefresh().finally(() => {
      if (this.#refreshing === refreshing) this.#refreshing = null;
    });
    this.#refreshing = refreshing;
    return refreshing;
  }
  async #performRefresh() {
    const [erc8183, b402] = await Promise.all([
      this.#resolveErc8183(),
      this.#resolveB402()
    ]);
    const rails = Object.freeze({ erc8183, b402 });
    const snapshot = Object.freeze({
      network: this.#options.network,
      generatedAt: toTimestamp(this.#options.clock?.() ?? /* @__PURE__ */ new Date()),
      rails,
      overall: aggregateSellerCapabilities([erc8183, b402])
    });
    this.#current = snapshot;
    return snapshot;
  }
  currentSnapshot() {
    return this.#current;
  }
  async freshSnapshot() {
    return this.refresh();
  }
  stop() {
    this.#started = false;
    this.#lifecycleGeneration += 1;
    if (this.#timer !== null) {
      (this.#options.timers ?? DEFAULT_TIMERS).clearInterval(this.#timer);
      this.#timer = null;
    }
  }
  #validatedRefreshInterval() {
    const milliseconds = this.#options.refreshIntervalMs === void 0 ? DEFAULT_REFRESH_INTERVAL_MS : this.#options.refreshIntervalMs;
    if (milliseconds === null) return null;
    if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
      throw new Error("capability refresh interval must be a positive integer");
    }
    return milliseconds;
  }
  #schedulePeriodicRefresh(milliseconds) {
    if (this.#timer !== null) return;
    if (milliseconds === null) return;
    this.#timer = (this.#options.timers ?? DEFAULT_TIMERS).setInterval(() => {
      void this.refresh();
    }, milliseconds);
  }
  async #resolveErc8183() {
    const config = this.#options.erc8183;
    if (!config.enabled) {
      return makeDisabledRail("erc8183", this.#assets);
    }
    const assets = await Promise.all(
      this.#assets.map(async (asset) => {
        try {
          const supported = await config.isPaymentTokenSupported(
            asset.address,
            asset.assetId
          );
          return makeAsset(
            asset,
            supported === true ? ["erc8183"] : [],
            supported === true ? [] : [{ code: "commerce-unsupported", method: "erc8183" }],
            null
          );
        } catch {
          return makeAsset(
            asset,
            [],
            [{ code: "commerce-probe-failed", method: "erc8183" }],
            "Commerce payment-token capability probe failed"
          );
        }
      })
    );
    return makeRail("erc8183", true, false, assets);
  }
  async #resolveB402() {
    const config = this.#options.b402;
    if (!config.enabled) return makeDisabledRail("b402", this.#b402Assets);
    if (isZeroUsd(this.#options.priceUsd)) {
      return makeRail(
        "b402",
        true,
        true,
        this.#b402Assets.map(
          (asset) => makeAsset(asset, [], [{ code: "free-route", method: null }], null)
        )
      );
    }
    let kinds;
    try {
      kinds = await config.loadSupportedKinds();
      if (!Array.isArray(kinds)) {
        throw new TypeError("B402 supported capability must be an array");
      }
    } catch {
      const assets2 = this.#b402Assets.map(
        (asset) => makeAsset(
          asset,
          [],
          asset.b402Methods.map((method) => ({
            code: "b402-supported-probe-failed",
            method
          })),
          "B402 supported-capability probe failed"
        )
      );
      return makeRail("b402", true, false, assets2);
    }
    const network = `eip155:${getNetwork(this.#options.network).chainId}`;
    const assets = this.#b402Assets.map((asset) => {
      const routes = asset.b402Methods.flatMap((method) => {
        const kind = kinds.find(
          (candidate) => kindMatches(candidate, asset, network, method)
        );
        return kind === void 0 ? [] : [makeB402Route(asset, kind, method)];
      });
      const activeMethods = routes.map((route) => route.method);
      const missing = asset.b402Methods.filter((method) => !activeMethods.includes(method)).map((method) => ({
        code: "b402-method-unsupported",
        method
      }));
      return makeAsset(asset, activeMethods, missing, null, routes);
    });
    return makeRail("b402", true, false, assets);
  }
};
function aggregateSellerCapabilities(rails) {
  const enabledRails = rails.filter((rail) => rail.enabled).map((rail) => rail.rail);
  const servingRails = rails.filter((rail) => rail.status === "active" || rail.status === "degraded").map((rail) => rail.rail);
  return Object.freeze({
    available: servingRails.length > 0,
    enabledRails: Object.freeze(enabledRails),
    servingRails: Object.freeze(servingRails)
  });
}
function kindMatches(kind, asset, network, method) {
  if (kind === null || typeof kind !== "object" || kind.trusted !== true || kind.x402Version !== 2 || kind.scheme !== "exact" || kind.network !== network || kind.assetId !== asset.assetId || kind.method !== method || typeof kind.version !== "string" || kind.version.length === 0 || !isEvmAddress(kind.signerAddress) || method === "permit2-exact" && !isEvmAddress(kind.spenderAddress)) {
    return false;
  }
  return asset.b402Kinds.some(
    (catalogKind) => catalogKind.method === method && catalogKind.name === kind.name && catalogKind.version === kind.version
  );
}
function makeB402Route(asset, kind, method) {
  const signerAddress = kind.signerAddress;
  const spenderAddress = method === "permit2-exact" ? kind.spenderAddress ?? null : null;
  const challengeExtra = Object.freeze({
    assetTransferMethod: method,
    name: kind.name,
    version: kind.version,
    signerAddress,
    ...spenderAddress === null ? {} : { spenderAddress }
  });
  return Object.freeze({
    assetId: asset.assetId,
    x402Version: 2,
    scheme: "exact",
    network: kind.network,
    method,
    name: kind.name,
    version: kind.version,
    signerAddress,
    spenderAddress,
    challengeExtra
  });
}
function isEvmAddress(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/i.test(value);
}
function makeAsset(asset, activeMethods, inactiveReasons, lastError, b402Routes = []) {
  return Object.freeze({
    assetId: asset.assetId,
    symbol: asset.symbol,
    address: asset.address,
    decimals: asset.decimals,
    isDefault: asset.isDefault,
    active: activeMethods.length > 0,
    activeMethods: Object.freeze([...activeMethods]),
    b402Routes: Object.freeze([...b402Routes]),
    inactiveReasons: Object.freeze(
      inactiveReasons.map((reason) => Object.freeze({ ...reason }))
    ),
    lastError
  });
}
function makeRail(rail, enabled, free, assets) {
  const active = assets.filter((asset) => asset.active).length;
  const partiallyAvailable = assets.some(
    (asset) => asset.active && asset.inactiveReasons.length > 0
  );
  const status = !enabled ? "disabled" : free ? "active" : active === 0 ? "dormant" : active < assets.length || partiallyAvailable ? "degraded" : "active";
  return Object.freeze({
    rail,
    enabled,
    free,
    status,
    assets: Object.freeze([...assets])
  });
}
function makeDisabledRail(rail, assets) {
  return makeRail(
    rail,
    false,
    false,
    assets.map(
      (asset) => makeAsset(asset, [], [{ code: "rail-disabled", method: null }], null)
    )
  );
}
function toTimestamp(value) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}
function isZeroUsd(value) {
  return /^0(?:\.0+)?$/.test(value);
}

// src/payments/capabilityAdapters.ts
function createSellerCapabilityManager(options) {
  const erc8183 = options.erc8183.enabled ? (() => {
    const commerceClient = options.erc8183.commerceClient;
    return {
      enabled: true,
      isPaymentTokenSupported: async (address, _assetId) => commerceClient.isPaymentTokenSupported(address)
    };
  })() : { enabled: false };
  const b402 = options.b402.enabled ? (() => {
    const transport = options.b402.transport;
    return {
      enabled: true,
      loadSupportedKinds: async () => {
        const raw = await transport.supported();
        return normalizeB402SupportedKinds(options.network, raw);
      }
    };
  })() : { enabled: false };
  return new SellerCapabilityManager({
    network: options.network,
    assets: options.assets,
    priceUsd: options.priceUsd,
    erc8183,
    b402,
    ...options.clock === void 0 ? {} : { clock: options.clock },
    ...options.refreshIntervalMs === void 0 ? {} : { refreshIntervalMs: options.refreshIntervalMs },
    ...options.timers === void 0 ? {} : { timers: options.timers }
  });
}
function normalizeB402SupportedKinds(networkName, rawResponse) {
  if (!isRecord(rawResponse) || !Array.isArray(rawResponse.kinds)) {
    throw new TypeError("B402 /supported response must contain a kinds array");
  }
  const network = getNetwork(networkName);
  const normalized = rawResponse.kinds.flatMap((rawKind) => {
    const parsed = normalizeKind(network, rawKind);
    return parsed === null ? [] : [parsed];
  });
  const routeCounts = /* @__PURE__ */ new Map();
  for (const kind of normalized) {
    const key = `${kind.network}:${kind.assetId}:${kind.method}`;
    routeCounts.set(key, (routeCounts.get(key) ?? 0) + 1);
  }
  return Object.freeze(
    normalized.filter(
      (kind) => routeCounts.get(`${kind.network}:${kind.assetId}:${kind.method}`) === 1
    )
  );
}
function normalizeKind(network, rawKind) {
  if (!isRecord(rawKind) || !isRecord(rawKind.extra)) return null;
  const expectedNetwork = `eip155:${network.chainId}`;
  const extra = rawKind.extra;
  const method = extra.assetTransferMethod;
  if (rawKind.x402Version !== 2 || rawKind.scheme !== "exact" || rawKind.network !== expectedNetwork || !isB402Method(method) || typeof extra.name !== "string" || typeof extra.version !== "string" || !isEvmAddress2(extra.signerAddress)) {
    return null;
  }
  if (method === "permit2-exact" && !isEvmAddress2(extra.spenderAddress)) {
    return null;
  }
  const name = extra.name;
  const version = extra.version;
  const signerAddress = extra.signerAddress;
  const candidates = network.assets().filter(
    (asset2) => asset2.b402Kinds.some(
      (kind) => kind.method === method && kind.name === name && kind.version === version
    )
  );
  const asset = candidates[0];
  if (candidates.length !== 1 || asset === void 0) return null;
  return Object.freeze({
    trusted: true,
    x402Version: 2,
    scheme: "exact",
    network: expectedNetwork,
    assetId: asset.assetId,
    method,
    name,
    version,
    signerAddress,
    ...method === "permit2-exact" ? { spenderAddress: extra.spenderAddress } : {}
  });
}
function isB402Method(value) {
  return value === "eip3009" || value === "permit2-exact";
}
function isEvmAddress2(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/i.test(value);
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export {
  aggregateSellerCapabilities,
  createSellerCapabilityManager
};
