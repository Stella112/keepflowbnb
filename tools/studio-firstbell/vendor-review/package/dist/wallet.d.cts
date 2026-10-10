import { WalletProvider, EVMWalletProvider, SigningPolicy } from '@bnbagent/sdk';
import { AltanaNetwork, AltanaSession, TurnkeyPackageName, TWAKProviderOptions } from '@bnbagent/sdk/wallets';
import { TomlTable } from './config.cjs';

/**
 * Wallet factory — port of `bnbagent_studio_core/wallet.py`.
 *
 * `getWallet()` reads [wallet] from studio.toml and returns the appropriate
 * SDK provider. Supported kinds: `evm-local` (encrypted local keystore),
 * `twak` (Trust Wallet Agent Kit CLI), `altana` (bounded session key) and
 * `turnkey` (remote signer, keys in Turnkey's AWS Nitro enclave); other
 * kinds throw.
 *
 * Cached as a per-process singleton.
 *
 * `EVMWalletProvider` enforces a `SigningPolicy` on every EIP-712
 * signTypedData call. The SDK default (`SigningPolicy.strictDefault`)
 * allowlists only the U-token deployments registered in the SDK's network
 * registry. Projects that need additional domains declare them via
 * `[wallet.signing].extra_domains` in studio.toml — see `buildPolicy`.
 * `[wallet.signing]` is meaningless for kind='twak' (no EIP-712 surface)
 * and is ignored with a warning.
 */

declare const ALTANA_SDK_TESTED_VERSION = "0.7.1";
/** Add a pair only after validating both packages together; never infer semver compatibility. */
declare const TURNKEY_TESTED_SDK_COMBINATIONS: readonly Readonly<{
    "@turnkey/sdk-server": "8.1.0";
    "@turnkey/viem": "0.14.34";
}>[];
declare const TURNKEY_SDK_INSTALL_COMMAND: string;
declare const PASSWORD_ENV = "WALLET_PASSWORD";
declare const KEYSTORE_JSON_ENV = "WALLET_KEYSTORE_JSON";
declare const KEYSTORE_DIR_ENV = "BNBAGENT_KEYSTORE_DIR";
declare const TWAK_HOME_ENV = "TWAK_HOME_DIR";
declare const TWAK_LOCAL_HOME_ENV = "TWAK_HOME";
declare const TWAK_WALLET_JSON_ENV = "TWAK_WALLET_JSON";
declare const TWAK_CREDENTIALS_JSON_ENV = "TWAK_CREDENTIALS_JSON";
declare const ALTANA_SESSION_ENV = "ALTANA_SESSION";
declare const ALTANA_SESSION_FILE_ENV = "ALTANA_SESSION_FILE";
declare const ALTANA_NETWORK_BY_STUDIO: Readonly<Record<string, AltanaNetwork>>;
interface AltanaPermissionInspection {
    readonly current: boolean;
    readonly expectedCallCount: number;
    readonly actualCallCount: number;
}
/** Compare a saved session with SDK 0.5.4's exact selector-bound call set. */
declare function inspectAltanaSessionPermissions(permissions: unknown, chainId: number): AltanaPermissionInspection;
declare const TURNKEY_CHAIN_ID_BY_NETWORK: Readonly<Record<string, number>>;
/**
 * Resolve the optional Altana SDK from the generated project's dependency
 * tree (see {@link resolveProjectPackage} for the search rules).
 */
declare function resolveProjectAltanaSdkEntry(projectRoot: string): string | null;
/**
 * Resolve one of the optional Turnkey packages from the generated project's
 * dependency tree (same search rules as the Altana resolver).
 */
declare function resolveProjectTurnkeySdkEntry(projectRoot: string, packageName: TurnkeyPackageName): string | null;
/**
 * Preload the configured Altana session for the synchronous wallet factory.
 * Source precedence: ALTANA_SESSION > ALTANA_SESSION_FILE >
 * [wallet].session_file. Successful sessions and failures are cached so every
 * later `getWallet()` observes the same startup result.
 */
declare function ensureAltanaSessionLoaded(): Promise<void>;
/**
 * Reconstruct the on-disk keystore from a secret env var (idempotent).
 *
 * The deploy step injects the keystore JSON as the `WALLET_KEYSTORE_JSON`
 * secret env var; this helper, called once at Agent startup, writes that
 * JSON back to disk so the unchanged disk-reading `getWallet()` can unlock
 * it as usual.
 *
 * - No-op (returns null) when `WALLET_KEYSTORE_JSON` is unset/empty.
 * - No-op (returns the existing path) when the target file already exists.
 * - Otherwise writes `<keystore_dir>/<checksum-address>.json` and returns
 *   its path. When the dir is NOT writable (read-only code mount), the
 *   keystore is materialized under the system temp dir instead and
 *   `BNBAGENT_KEYSTORE_DIR` is exported so `getWallet()` loads it from
 *   there.
 */
declare function ensureKeystoreMaterialized(): string | null;
/**
 * Resolve the twak HOME-style directory (the dir that CONTAINS `.twak`).
 *
 * Single source of truth for every consumer. Precedence:
 * 1. `TWAK_HOME_DIR` env — runtime materialization; always wins in deployed
 *    processes.
 * 2. `[wallet].twak_home` — the PROJECT's own wallet home (relative paths
 *    anchored to the project root, never CWD).
 * 3. `TWAK_HOME` env — machine-wide local-dev override.
 * 4. null — the SDK then uses the real `$HOME` (`~/.twak`).
 */
declare function resolveTwakHome(walletCfg: TomlTable | null | undefined, projectRoot?: string | null): string | null;
/** Test seams for {@link ensureTwakKeychain} (mirrors the Python tests'
 * monkeypatching of sys.platform / shutil.which / subprocess.run). */
interface KeychainHooks {
    platform?: string;
    /** Absolute path to `security`, or null when absent. */
    securityPath?: string | null;
    /** Run one `security` subcommand; must throw on failure. */
    run?: (args: string[], env: NodeJS.ProcessEnv) => void;
}
/**
 * macOS only: ensure an isolated login keychain exists under a DEDICATED
 * twak home, so `twak` CLI ops (run with HOME=<twakHome>) find a default
 * keychain.
 *
 * SECRET-FREE and SAFE: the keychain uses an EMPTY password — it is NOT
 * where the wallet's encryption password lives (that stays in
 * TWAK_WALLET_PASSWORD). Every `security` call runs with HOME=<twakHome> so
 * the machine's real default keychain is never touched. Idempotent. No-op
 * when: not macOS, `security` is absent, a keychain already exists, or
 * `twakHome` is the real `$HOME`. Purely a LOCAL-dev convenience. Returns
 * true when a keychain is present under `twakHome` afterwards.
 */
declare function ensureTwakKeychain(twakHome: string, hooks?: KeychainHooks): boolean;
/**
 * Reconstruct the twak home from secret env vars (idempotent). Mirror of
 * {@link ensureKeystoreMaterialized} for kind='twak': materializes
 * `TWAK_WALLET_JSON` / `TWAK_CREDENTIALS_JSON` under `$TMPDIR/twak-home`
 * and exports `TWAK_HOME_DIR` so `getWallet()` builds the provider against
 * it. No-op (returns null) when `TWAK_WALLET_JSON` is unset/empty.
 */
declare function ensureTwakMaterialized(): string | null;
/**
 * Construct a SigningPolicy from `[wallet.signing]`; null -> SDK default.
 *
 * Schema:
 *
 *     [wallet.signing]
 *     extra_domains = [[56, "0xabc...123"], [97, "0xdef...456"]]
 *     extra_primary_types = ["MyOrder", "BondQuote"]
 *     max_validity_window_seconds = 1800   # widen from default 600
 *     max_future_validity_seconds = 2400   # widen from default 900
 *
 * All fields are additive over `SigningPolicy.strictDefault()`. Empty /
 * missing section returns null so the wallet constructor falls back to the
 * SDK default. Throws on malformed entries (fail fast, not at sign time).
 */
declare function buildPolicy(walletCfg: TomlTable): SigningPolicy | null;
/**
 * Apply `[wallet.tx]` transaction-tuning knobs by exporting the SDK's lazy
 * env vars. Schema:
 *
 *     [wallet.tx]
 *     relay_unseen_timeout_seconds = 60      # BNBAGENT_RELAY_UNSEEN_TIMEOUT (0 disables the early abort)
 *     receipt_timeout_seconds = 600          # BNBAGENT_RECEIPT_TIMEOUT
 *     fallback_rpc_urls = ["https://..."]    # BNBAGENT_FALLBACK_RPC_URLS (relay secondary confirmation)
 *
 * Deliberately env-based rather than SDK setters: the SDK resolves each of
 * these lazily from the env at execute time, and an operator-set env var
 * must always win over studio.toml — so a key is exported ONLY when its env
 * var is not already set. Malformed values fail fast (like buildPolicy),
 * not at broadcast time.
 */
declare function applyTxTuning(walletCfg: TomlTable): void;
/**
 * The TWAKProvider construction options `buildWallet` would use — split out
 * so tests (and diagnostics) can observe home/expectedAddress/autoCreate,
 * which the SDK provider keeps private.
 */
declare function twakProviderOptions(walletCfg: TomlTable, projectRoot?: string | null, network?: string | null): TWAKProviderOptions;
/**
 * Load the encrypted administrator EOA shared by evm-local and Altana setup
 * commands. The decrypted identity must match the address anchored in config.
 */
declare function buildLocalAdminWallet(walletCfg: TomlTable, projectRoot?: string | null): EVMWalletProvider;
/**
 * Pure factory — split out for testability (bypasses the singleton cache +
 * config load). `network` is the studio network name (`[network].default`);
 * only kind='twak' consumes it. Undefined falls back to `bsc-testnet`.
 */
declare function buildWallet(walletCfg: TomlTable, projectRoot?: string | null, opts?: {
    network?: string | null;
}): WalletProvider;
/** Return the project's wallet provider (singleton per process). */
declare function getWallet(): WalletProvider;
/** Test-only: replace the preloaded Altana session. */
declare function _setAltanaSessionForTests(session: AltanaSession | null): void;
/** Test-only: drop all wallet/session caches. */
declare function _resetCache(): void;

export { ALTANA_NETWORK_BY_STUDIO, ALTANA_SDK_TESTED_VERSION, ALTANA_SESSION_ENV, ALTANA_SESSION_FILE_ENV, type AltanaPermissionInspection, KEYSTORE_DIR_ENV, KEYSTORE_JSON_ENV, type KeychainHooks, PASSWORD_ENV, TURNKEY_CHAIN_ID_BY_NETWORK, TURNKEY_SDK_INSTALL_COMMAND, TURNKEY_TESTED_SDK_COMBINATIONS, TWAK_CREDENTIALS_JSON_ENV, TWAK_HOME_ENV, TWAK_LOCAL_HOME_ENV, TWAK_WALLET_JSON_ENV, _resetCache, _setAltanaSessionForTests, applyTxTuning, buildLocalAdminWallet, buildPolicy, buildWallet, ensureAltanaSessionLoaded, ensureKeystoreMaterialized, ensureTwakKeychain, ensureTwakMaterialized, getWallet, inspectAltanaSessionPermissions, resolveProjectAltanaSdkEntry, resolveProjectTurnkeySdkEntry, resolveTwakHome, twakProviderOptions };
