import {
  getNetwork
} from "./chunk-YQUACLG3.js";
import {
  writePrivate
} from "./chunk-KTZSXJL6.js";
import {
  STUDIO_TOML,
  findProjectRoot,
  loadStudioToml
} from "./chunk-AHE5Y6SQ.js";

// src/wallet.ts
import { execFileSync } from "child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync
} from "fs";
import { homedir, tmpdir } from "os";
import {
  delimiter,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve
} from "path";
import { pathToFileURL } from "url";
import {
  AltanaWalletProvider,
  EVMWalletProvider,
  SigningPolicy,
  TWAKProvider,
  TurnkeyWalletProvider
} from "@bnbagent/sdk";
import {
  TURNKEY_SDK_SERVER_PACKAGE,
  TURNKEY_VIEM_PACKAGE,
  defaultAgentPermissions,
  deserializeSession,
  materializeTwakHome,
  resolveTwakBin,
  setAltanaSdkImporter,
  setTurnkeySdkImporter
} from "@bnbagent/sdk/wallets";
import { getAddress as toChecksumAddress } from "viem";
var ALTANA_SDK_TESTED_VERSION = "0.7.1";
var TURNKEY_TESTED_SDK_COMBINATIONS = Object.freeze([
  Object.freeze({
    [TURNKEY_SDK_SERVER_PACKAGE]: "8.1.0",
    [TURNKEY_VIEM_PACKAGE]: "0.14.34"
  })
]);
var TURNKEY_SDK_INSTALL_COMMAND = `pnpm add ${TURNKEY_SDK_SERVER_PACKAGE}@${TURNKEY_TESTED_SDK_COMBINATIONS[0][TURNKEY_SDK_SERVER_PACKAGE]} ${TURNKEY_VIEM_PACKAGE}@${TURNKEY_TESTED_SDK_COMBINATIONS[0][TURNKEY_VIEM_PACKAGE]}`;
var PASSWORD_ENV = "WALLET_PASSWORD";
var KEYSTORE_JSON_ENV = "WALLET_KEYSTORE_JSON";
var KEYSTORE_DIR_ENV = "BNBAGENT_KEYSTORE_DIR";
var TWAK_HOME_ENV = "TWAK_HOME_DIR";
var TWAK_LOCAL_HOME_ENV = "TWAK_HOME";
var TWAK_WALLET_JSON_ENV = "TWAK_WALLET_JSON";
var TWAK_CREDENTIALS_JSON_ENV = "TWAK_CREDENTIALS_JSON";
var TWAK_CHAIN_BY_NETWORK = {
  "bsc-testnet": "bsctestnet",
  "bsc-mainnet": "bsc"
};
var ALTANA_SESSION_ENV = "ALTANA_SESSION";
var ALTANA_SESSION_FILE_ENV = "ALTANA_SESSION_FILE";
var ALTANA_NETWORK_BY_STUDIO = {
  "bsc-testnet": "bnb-testnet",
  "bsc-mainnet": "bnb-mainnet"
};
function recordOf(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function altanaCallKey(value) {
  const call = recordOf(value);
  const to = String(call.to ?? "").toLowerCase();
  const signature = String(call.signature ?? "");
  return to && signature ? `${to}:${signature}` : null;
}
function inspectAltanaSessionPermissions(permissions, chainId) {
  const expected = (defaultAgentPermissions({ chainId, tokenSpend: { limit: 1n } }).calls ?? []).map(altanaCallKey);
  const rawSpend = recordOf(permissions).spend;
  const expectedSpend = defaultAgentPermissions({ chainId, tokenSpend: { limit: 1n } }).spend ?? [];
  const spendValid = Array.isArray(rawSpend) && rawSpend.length > 0 && rawSpend.length <= expectedSpend.length && expectedSpend.filter((cap) => cap.token !== void 0).every(
    (expectedCap) => rawSpend.some(
      (value) => String(recordOf(value).token).toLowerCase() === String(expectedCap.token).toLowerCase()
    )
  ) && rawSpend.every((value, index) => {
    const cap = recordOf(value);
    const rawLimit = typeof cap.limit === "object" ? recordOf(cap.limit).$bigint : cap.limit;
    const token = String(cap.token ?? "").toLowerCase();
    return rawSpend.findIndex(
      (entry) => String(recordOf(entry).token ?? "").toLowerCase() === token
    ) === index && expectedSpend.some(
      (expectedCap) => String(expectedCap.token ?? "").toLowerCase() === token && cap.period === expectedCap.period
    ) && (typeof rawLimit === "bigint" || typeof rawLimit === "string") && /^[0-9]+$/.test(String(rawLimit)) && BigInt(String(rawLimit)) > 0n && BigInt(String(rawLimit)) < 1n << 256n;
  });
  const rawCalls = recordOf(permissions).calls;
  const actual = Array.isArray(rawCalls) ? rawCalls.map(altanaCallKey) : [];
  const actualSet = new Set(actual);
  return {
    current: spendValid && actual.length === expected.length && actualSet.size === expected.length && !actual.includes(null) && !expected.includes(null) && expected.every((call) => actualSet.has(call)),
    expectedCallCount: expected.length,
    actualCallCount: actual.length
  };
}
var cachedAltanaSession = null;
var cachedAltanaError = null;
var altanaLoadPromise = null;
var TURNKEY_CHAIN_ID_BY_NETWORK = {
  "bsc-testnet": 97,
  "bsc-mainnet": 56
};
function asError(error) {
  return error instanceof Error ? error : new Error(String(error));
}
function altanaStartupError(error) {
  const cause = asError(error);
  const guidance = "After correcting the Altana session source, restart the command or Agent; the failed startup snapshot is intentionally retained for this process.";
  if (cause.message.includes(guidance)) return cause;
  return new Error(`${cause.message} ${guidance}`, { cause });
}
function esmExportTarget(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const found = esmExportTarget(candidate);
      if (found !== null) return found;
    }
    return null;
  }
  if (value !== null && typeof value === "object") {
    const record = value;
    for (const condition of ["import", "node", "default"]) {
      const found = esmExportTarget(record[condition]);
      if (found !== null) return found;
    }
  }
  return null;
}
function resolveProjectPackage(projectRoot, packageName, installHint, expectedVersion) {
  let cursor = resolve(projectRoot);
  for (; ; ) {
    const packageDir = join(cursor, "node_modules", ...packageName.split("/"));
    const packageJson = join(packageDir, "package.json");
    if (existsSync(packageJson)) {
      const metadata = JSON.parse(readFileSync(packageJson, "utf8"));
      if (expectedVersion !== void 0 && metadata.version !== expectedVersion) {
        throw new Error(
          `${packageJson} has ${packageName} version ${JSON.stringify(metadata.version)}; install the tested ${packageName}@${expectedVersion}.`
        );
      }
      const exportsField = metadata.exports;
      const rootExport = exportsField !== null && typeof exportsField === "object" && !Array.isArray(exportsField) && "." in exportsField ? exportsField["."] : exportsField;
      const target = esmExportTarget(rootExport) ?? (typeof metadata.module === "string" ? metadata.module : null) ?? (typeof metadata.main === "string" ? metadata.main : null);
      if (target === null) {
        throw new Error(
          `${packageJson} has no importable ESM entry; ${installHint}`
        );
      }
      const entry = resolve(packageDir, target);
      const withinPackage = relative(packageDir, entry);
      if (withinPackage === "" || withinPackage.startsWith("..") || isAbsolute(withinPackage) || !existsSync(entry)) {
        throw new Error(
          `invalid ${packageName} ESM entry ${JSON.stringify(target)} in ${packageJson}`
        );
      }
      return { entry, version: metadata.version };
    }
    if (existsSync(join(cursor, "pnpm-workspace.yaml"))) return null;
    const parent = dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}
function resolveProjectAltanaSdkEntry(projectRoot) {
  return resolveProjectPackage(
    projectRoot,
    "@altananetwork/sdk",
    "install @altananetwork/sdk@0.7.1 in the agent project.",
    ALTANA_SDK_TESTED_VERSION
  )?.entry ?? null;
}
function resolveProjectTurnkeySdkEntry(projectRoot, packageName) {
  const hint = `install both Turnkey packages: ${TURNKEY_SDK_INSTALL_COMMAND}`;
  const packages = {
    [TURNKEY_SDK_SERVER_PACKAGE]: resolveProjectPackage(
      projectRoot,
      TURNKEY_SDK_SERVER_PACKAGE,
      hint
    ),
    [TURNKEY_VIEM_PACKAGE]: resolveProjectPackage(
      projectRoot,
      TURNKEY_VIEM_PACKAGE,
      hint
    )
  };
  const names = [
    TURNKEY_SDK_SERVER_PACKAGE,
    TURNKEY_VIEM_PACKAGE
  ];
  if (!TURNKEY_TESTED_SDK_COMBINATIONS.some(
    (pair) => names.every(
      (name) => packages[name] === null || packages[name].version === pair[name]
    )
  )) {
    throw new Error(`Unvalidated Turnkey SDK combination; ${hint}.`);
  }
  return packages[packageName]?.entry ?? null;
}
function armTurnkeyImporter(projectRoot) {
  const packages = [
    TURNKEY_SDK_SERVER_PACKAGE,
    TURNKEY_VIEM_PACKAGE
  ];
  const entries = /* @__PURE__ */ new Map();
  for (const packageName of packages) {
    const entry = resolveProjectTurnkeySdkEntry(projectRoot, packageName);
    if (entry !== null) entries.set(packageName, entry);
  }
  if (entries.size === 0) {
    setTurnkeySdkImporter(null);
    return;
  }
  if (entries.size !== packages.length) {
    const missing = packages.filter((name) => !entries.has(name));
    throw new Error(
      `wallet.kind='turnkey' needs both Turnkey packages in the agent project; missing ${missing.join(", ")} \u2014 install both: pnpm add ${TURNKEY_SDK_SERVER_PACKAGE} ${TURNKEY_VIEM_PACKAGE}`
    );
  }
  setTurnkeySdkImporter((packageName) => {
    const entry = entries.get(packageName);
    if (entry === void 0) {
      return Promise.reject(
        new Error(`no resolved entry for ${packageName} (importer bug)`)
      );
    }
    return import(pathToFileURL(entry).href);
  });
}
function readAltanaSessionFile(file) {
  if (process.platform !== "win32") {
    const mode = statSync(file).mode & 511;
    if ((mode & 63) !== 0) {
      console.warn(
        `[AltanaWalletProvider] ${file} is group/other-readable (mode ${mode.toString(8)}) but contains the session private key \u2014 chmod 600 it.`
      );
    }
  }
  return readFileSync(file, "utf8");
}
async function ensureAltanaSessionLoaded() {
  if (cachedAltanaSession !== null) return;
  if (cachedAltanaError !== null) throw cachedAltanaError;
  if (altanaLoadPromise !== null) return altanaLoadPromise;
  altanaLoadPromise = (async () => {
    try {
      const projectRoot = findProjectRoot();
      if (projectRoot === null) return;
      const cfg = loadStudioToml(join(projectRoot, STUDIO_TOML));
      const walletCfg = cfg.wallet ?? {};
      if (String(walletCfg.kind ?? "evm-local") !== "altana") return;
      const localEntry = resolveProjectAltanaSdkEntry(projectRoot);
      setAltanaSdkImporter(
        localEntry === null ? null : () => import(pathToFileURL(localEntry).href)
      );
      let serialized;
      const inline = process.env[ALTANA_SESSION_ENV];
      const envFile = process.env[ALTANA_SESSION_FILE_ENV];
      if (inline) {
        serialized = inline;
      } else {
        const configured = envFile || String(walletCfg.session_file ?? "");
        if (!configured) {
          throw new Error(
            "no Altana session configured \u2014 run `bag wallet session grant`, or set ALTANA_SESSION / ALTANA_SESSION_FILE."
          );
        }
        const sessionFile = isAbsolute(configured) || projectRoot === null ? configured : join(projectRoot, configured);
        serialized = readAltanaSessionFile(sessionFile);
      }
      const session = await deserializeSession(serialized);
      const networkName = String(
        (cfg.network ?? {}).default ?? "bsc-testnet"
      );
      const permissionInspection = inspectAltanaSessionPermissions(
        session.permissions,
        getNetwork(networkName).chainId
      );
      if (!permissionInspection.current) {
        throw new Error(
          "Altana session does not match the selector-bound @bnbagent/sdk@0.5.4 permission set and bounded token spend policy; run `bag wallet session grant --force`."
        );
      }
      if (session.expiry <= Math.floor(Date.now() / 1e3)) {
        throw new Error(
          `Altana session ${session.publicKey} expired at ${session.expiry}; run \`bag wallet session grant --force\`.`
        );
      }
      cachedAltanaSession = session;
    } catch (error) {
      cachedAltanaError = altanaStartupError(error);
      throw cachedAltanaError;
    } finally {
      altanaLoadPromise = null;
    }
  })();
  return altanaLoadPromise;
}
function ensureKeystoreMaterialized() {
  const raw = process.env[KEYSTORE_JSON_ENV];
  if (!raw) return null;
  const keystore = JSON.parse(raw);
  const address = keystore.address;
  if (!address) {
    throw new Error(
      `${KEYSTORE_JSON_ENV} is set but its JSON has no 'address' field; cannot derive the keystore filename.`
    );
  }
  const prefixed = address.startsWith("0x") ? address : `0x${address}`;
  const fname = `${toChecksumAddress(prefixed)}.json`;
  const root = findProjectRoot();
  const cfg = loadStudioToml(
    root !== null ? join(root, "studio.toml") : void 0
  );
  const walletCfg = cfg.wallet ?? {};
  let keystoreDir = String(walletCfg.keystore_dir ?? ".studio/wallets");
  if (!isAbsolute(keystoreDir) && root !== null) {
    keystoreDir = join(root, keystoreDir);
  }
  let dst = join(keystoreDir, fname);
  if (existsSync(dst)) {
    delete process.env[KEYSTORE_JSON_ENV];
    return dst;
  }
  try {
    mkdirSync(keystoreDir, { recursive: true });
    chmodSync(keystoreDir, 448);
    writePrivate(dst, raw);
  } catch {
    const fallbackDir = join(tmpdir(), "bnbagent-keystore", "wallets");
    mkdirSync(fallbackDir, { recursive: true });
    chmodSync(fallbackDir, 448);
    dst = join(fallbackDir, fname);
    writePrivate(dst, raw);
    process.env[KEYSTORE_DIR_ENV] = fallbackDir;
  }
  delete process.env[KEYSTORE_JSON_ENV];
  return dst;
}
function resolveTwakHome(walletCfg, projectRoot) {
  const envHome = process.env[TWAK_HOME_ENV];
  if (envHome) return envHome;
  const cfgHome = walletCfg?.twak_home;
  if (cfgHome) {
    const p = String(cfgHome);
    if (!isAbsolute(p) && projectRoot != null) return join(projectRoot, p);
    return p;
  }
  const local = process.env[TWAK_LOCAL_HOME_ENV];
  if (local) return local;
  return null;
}
function whichSecurity() {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir && existsSync(join(dir, "security"))) return join(dir, "security");
  }
  return null;
}
function ensureTwakKeychain(twakHome, hooks = {}) {
  const platform = hooks.platform ?? process.platform;
  const securityPath = hooks.securityPath !== void 0 ? hooks.securityPath : whichSecurity();
  if (platform !== "darwin" || securityPath === null) return false;
  if (resolve(twakHome) === resolve(homedir())) {
    return false;
  }
  const kc = join(twakHome, "Library", "Keychains", "login.keychain-db");
  if (existsSync(kc)) return true;
  const env = { ...process.env, HOME: twakHome };
  const run = hooks.run ?? ((args, e) => {
    execFileSync(args[0], args.slice(1), {
      env: e,
      timeout: 3e4,
      stdio: "pipe"
    });
  });
  try {
    mkdirSync(dirname(kc), { recursive: true, mode: 448 });
    chmodSync(dirname(kc), 448);
    for (const args of [
      ["security", "create-keychain", "-p", "", kc],
      ["security", "default-keychain", "-s", kc],
      ["security", "unlock-keychain", "-p", "", kc]
    ]) {
      run(args, env);
    }
  } catch {
    return existsSync(kc);
  }
  return existsSync(kc);
}
function ensureTwakMaterialized() {
  const raw = process.env[TWAK_WALLET_JSON_ENV];
  if (!raw) return null;
  const home = join(tmpdir(), "twak-home");
  materializeTwakHome({
    walletJson: raw,
    credentialsJson: process.env[TWAK_CREDENTIALS_JSON_ENV] || void 0,
    home
  });
  process.env[TWAK_HOME_ENV] = home;
  delete process.env[TWAK_WALLET_JSON_ENV];
  delete process.env[TWAK_CREDENTIALS_JSON_ENV];
  return home;
}
function buildPolicy(walletCfg) {
  const signingCfg = walletCfg.signing ?? {};
  if (Object.keys(signingCfg).length === 0) return null;
  const extraDomains = signingCfg.extra_domains ?? [];
  const extraPrimaryTypes = signingCfg.extra_primary_types ?? [];
  const maxWindow = signingCfg.max_validity_window_seconds;
  const maxFuture = signingCfg.max_future_validity_seconds;
  if (extraDomains.length === 0 && extraPrimaryTypes.length === 0 && maxWindow == null && maxFuture == null) {
    return null;
  }
  const domainPairs = [];
  extraDomains.forEach((entry, i) => {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new Error(
        `[wallet.signing].extra_domains[${i}] must be a [chain_id, address] pair, got ${JSON.stringify(entry)}`
      );
    }
    const [chainId, addr] = entry;
    let checksummed;
    try {
      checksummed = toChecksumAddress(String(addr));
    } catch (e) {
      throw new Error(
        `[wallet.signing].extra_domains[${i}] has invalid address ${JSON.stringify(addr)}: ${e instanceof Error ? e.message : e}`
      );
    }
    domainPairs.push([Number(chainId), checksummed]);
  });
  const primaryTypes = [];
  extraPrimaryTypes.forEach((entry, i) => {
    if (typeof entry !== "string" || entry === "") {
      throw new Error(
        `[wallet.signing].extra_primary_types[${i}] must be a non-empty string, got ${JSON.stringify(entry)}`
      );
    }
    primaryTypes.push(entry);
  });
  return SigningPolicy.strictDefault().extend({
    ...domainPairs.length > 0 ? { domainAllowlist: domainPairs } : {},
    ...primaryTypes.length > 0 ? { primaryTypeAllowlist: primaryTypes } : {},
    ...maxWindow != null ? { maxValidityWindowSeconds: Number(maxWindow) } : {},
    ...maxFuture != null ? { maxFutureValiditySeconds: Number(maxFuture) } : {}
  });
}
function applyTxTuning(walletCfg) {
  const txCfg = walletCfg.tx ?? {};
  if (Object.keys(txCfg).length === 0) return;
  const exportIfUnset = (envKey, value) => {
    if (!process.env[envKey]) {
      process.env[envKey] = value;
    }
  };
  const intField = (key, minimum) => {
    const raw = txCfg[key];
    if (raw == null) return null;
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < minimum) {
      throw new Error(
        `[wallet.tx].${key} must be an integer >= ${minimum}, got ${JSON.stringify(raw)}`
      );
    }
    return n;
  };
  const relayUnseen = intField("relay_unseen_timeout_seconds", 0);
  if (relayUnseen !== null) {
    exportIfUnset("BNBAGENT_RELAY_UNSEEN_TIMEOUT", String(relayUnseen));
  }
  const receiptTimeout = intField("receipt_timeout_seconds", 1);
  if (receiptTimeout !== null) {
    exportIfUnset("BNBAGENT_RECEIPT_TIMEOUT", String(receiptTimeout));
  }
  const fallbackUrls = txCfg.fallback_rpc_urls;
  if (fallbackUrls != null) {
    if (!Array.isArray(fallbackUrls) || fallbackUrls.some((u) => typeof u !== "string" || u.trim() === "")) {
      throw new Error(
        `[wallet.tx].fallback_rpc_urls must be an array of non-empty URL strings, got ${JSON.stringify(fallbackUrls)}`
      );
    }
    if (fallbackUrls.length > 0) {
      exportIfUnset("BNBAGENT_FALLBACK_RPC_URLS", fallbackUrls.join(","));
    }
  }
}
function anchorKeystoreDir(keystoreDir, projectRoot) {
  if (keystoreDir === void 0) return void 0;
  if (!isAbsolute(keystoreDir) && projectRoot != null) {
    return join(projectRoot, keystoreDir);
  }
  return keystoreDir;
}
function twakProviderOptions(walletCfg, projectRoot, network) {
  const chain = TWAK_CHAIN_BY_NETWORK[network ?? "bsc-testnet"];
  if (chain === void 0) {
    throw new Error(
      `wallet.kind='twak' supports networks ${JSON.stringify(Object.keys(TWAK_CHAIN_BY_NETWORK).sort())}, got '${network}'`
    );
  }
  const home = resolveTwakHome(walletCfg, projectRoot);
  return {
    chain,
    // Generated twak projects pin the CLI in app/agent/node_modules. Passing
    // the project root keeps runtime calls on that validated binary even when
    // the process was launched from another working directory.
    twakBin: resolveTwakBin(projectRoot ?? process.cwd()),
    ...home !== null ? { home } : {},
    // Anti-drift anchor: a wallet reporting a different address throws
    // WalletIdentityMismatch before any operation.
    ...walletCfg.address ? { expectedAddress: String(walletCfg.address) } : {},
    // autoCreate=false ALWAYS (local and deployed): wallet creation is an
    // explicit, Studio-managed step. Implicit runtime creation would mint an
    // unanchored identity and break the address anti-drift guarantee — a
    // missing wallet must fail loudly.
    autoCreate: false
  };
}
function buildLocalAdminWallet(walletCfg, projectRoot) {
  const walletsDir = process.env[KEYSTORE_DIR_ENV] || anchorKeystoreDir(
    walletCfg.keystore_dir !== void 0 ? String(walletCfg.keystore_dir) : void 0,
    projectRoot
  );
  const signingPolicy = buildPolicy(walletCfg);
  const anchoredAddress = walletCfg.address ? toChecksumAddress(String(walletCfg.address)) : null;
  if (anchoredAddress === null) {
    throw new Error(
      "no [wallet].address is anchored; run `bag wallet new` to create the keystore explicitly before starting the Agent."
    );
  }
  const password = process.env[PASSWORD_ENV];
  if (!password) {
    throw new Error(
      `${PASSWORD_ENV} env var is required to unlock the local administrator keystore. Set it in the project's .env.local (.studio/.env.local in a workspace) \u2014 \`bag\` auto-loads that file. If it's still unset, the line is missing or you're running outside the project tree: \`cd\` into the project (or agent/) and retry, or export WALLET_PASSWORD=\u2026 in your shell.`
    );
  }
  let provider;
  try {
    provider = new EVMWalletProvider({
      password,
      address: anchoredAddress,
      ...walletsDir ? { walletsDir } : {},
      ...signingPolicy !== null ? { signingPolicy } : {}
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith("Keystore not found:")) {
      throw new Error(
        "The encrypted keystore for this project's wallet address is missing. Restore the correct keystore and check studio.toml; do not create a replacement identity to recover an existing wallet.",
        { cause }
      );
    }
    throw cause;
  }
  const decryptedAddress = toChecksumAddress(provider.address);
  if (decryptedAddress !== anchoredAddress) {
    throw new Error(
      `wallet identity mismatch: [wallet].address ${anchoredAddress} does not match decrypted keystore address ${decryptedAddress}. Restore the correct keystore before signing or requesting faucet funds.`
    );
  }
  return provider;
}
function buildWallet(walletCfg, projectRoot, opts = {}) {
  const kind = String(walletCfg.kind ?? "evm-local");
  if (kind === "evm-local") {
    return buildLocalAdminWallet(walletCfg, projectRoot);
  }
  if (kind === "twak") {
    if (walletCfg.signing) {
      console.warn(
        "[wallet.signing] is ignored for wallet.kind='twak' \u2014 the twak CLI exposes no generic EIP-712 surface (upstream P0); x402 payments go through the delegated payer's own prechecks."
      );
    }
    const providerOpts = twakProviderOptions(
      walletCfg,
      projectRoot,
      opts.network
    );
    if (providerOpts.home !== void 0) {
      ensureTwakKeychain(providerOpts.home);
    }
    return new TWAKProvider(providerOpts);
  }
  if (kind === "altana") {
    if (walletCfg.signing) {
      console.warn(
        "[wallet.signing] is ignored for wallet.kind='altana' \u2014 generic EIP-712/message signing is not exposed; ERC-8183 quotes use the bounded session quote signer."
      );
    }
    const networkName = opts.network ?? "bsc-testnet";
    const network = ALTANA_NETWORK_BY_STUDIO[networkName];
    if (network === void 0) {
      throw new Error(
        `wallet.kind='altana' supports networks ${JSON.stringify(Object.keys(ALTANA_NETWORK_BY_STUDIO).sort())}, got '${networkName}'`
      );
    }
    if (cachedAltanaError !== null) throw cachedAltanaError;
    if (cachedAltanaSession === null) {
      throw new Error(
        "no Altana session loaded \u2014 run `bag wallet session grant`, then restart the command or Agent."
      );
    }
    if (walletCfg.address) {
      const anchored = toChecksumAddress(
        String(walletCfg.address)
      );
      const sessionAddress = toChecksumAddress(
        cachedAltanaSession.walletAddress
      );
      if (anchored !== sessionAddress) {
        throw new Error(
          `[wallet].address ${anchored} does not match Altana session walletAddress ${sessionAddress} (stale session_file? re-grant with --force).`
        );
      }
    }
    return new AltanaWalletProvider({
      session: cachedAltanaSession,
      network
    });
  }
  if (kind === "turnkey") {
    const signingPolicy = buildPolicy(walletCfg);
    const networkName = opts.network ?? "bsc-testnet";
    const expectedChainId = TURNKEY_CHAIN_ID_BY_NETWORK[networkName];
    if (expectedChainId === void 0) {
      throw new Error(
        `wallet.kind='turnkey' supports networks ${JSON.stringify(Object.keys(TURNKEY_CHAIN_ID_BY_NETWORK).sort())}, got '${networkName}'`
      );
    }
    if (projectRoot != null) {
      armTurnkeyImporter(projectRoot);
    }
    const provider = TurnkeyWalletProvider.fromEnv({
      expectedChainId,
      ...signingPolicy !== null ? { signingPolicy } : {}
    });
    if (walletCfg.address) {
      const anchored = toChecksumAddress(
        String(walletCfg.address)
      );
      if (anchored !== provider.address) {
        throw new Error(
          `[wallet].address ${anchored} does not match TURNKEY_SIGN_WITH ${provider.address} (stale anchor or different Turnkey credentials? fix .studio/.env.local, then re-run \`bag wallet new\`).`
        );
      }
    }
    return provider;
  }
  if (["pieverse", "trust", "binance", "mpc"].includes(kind)) {
    throw new Error(
      `wallet.kind='${kind}' is not implemented in v0.0.2 (planned for a later milestone).`
    );
  }
  throw new Error(`Unknown wallet.kind: '${kind}'`);
}
var cachedWallet = null;
function getWallet() {
  if (cachedWallet === null) {
    const cfg = loadStudioToml();
    const walletCfg = cfg.wallet ?? {};
    applyTxTuning(walletCfg);
    const network = String(
      (cfg.network ?? {}).default ?? "bsc-testnet"
    );
    cachedWallet = buildWallet(walletCfg, findProjectRoot(), {
      network
    });
  }
  return cachedWallet;
}
function _setAltanaSessionForTests(session) {
  cachedAltanaSession = session;
  cachedAltanaError = null;
  cachedWallet = null;
}
function _resetCache() {
  cachedWallet = null;
  cachedAltanaSession = null;
  cachedAltanaError = null;
  altanaLoadPromise = null;
  setAltanaSdkImporter(null);
  setTurnkeySdkImporter(null);
}

export {
  ALTANA_SDK_TESTED_VERSION,
  TURNKEY_TESTED_SDK_COMBINATIONS,
  TURNKEY_SDK_INSTALL_COMMAND,
  PASSWORD_ENV,
  KEYSTORE_JSON_ENV,
  KEYSTORE_DIR_ENV,
  TWAK_HOME_ENV,
  TWAK_LOCAL_HOME_ENV,
  TWAK_WALLET_JSON_ENV,
  TWAK_CREDENTIALS_JSON_ENV,
  ALTANA_SESSION_ENV,
  ALTANA_SESSION_FILE_ENV,
  ALTANA_NETWORK_BY_STUDIO,
  inspectAltanaSessionPermissions,
  TURNKEY_CHAIN_ID_BY_NETWORK,
  resolveProjectAltanaSdkEntry,
  resolveProjectTurnkeySdkEntry,
  ensureAltanaSessionLoaded,
  ensureKeystoreMaterialized,
  resolveTwakHome,
  ensureTwakKeychain,
  ensureTwakMaterialized,
  buildPolicy,
  applyTxTuning,
  twakProviderOptions,
  buildLocalAdminWallet,
  buildWallet,
  getWallet,
  _setAltanaSessionForTests,
  _resetCache
};
