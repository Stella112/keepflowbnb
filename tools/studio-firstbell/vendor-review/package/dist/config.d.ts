/**
 * Configuration layer — port of `bnbagent_studio_core/config.py`.
 *
 * Provides:
 * - `findProjectRoot()` — walk up from cwd looking for studio.toml
 * - `loadStudioToml(path?)` — parse a project's studio.toml
 * - `loadEnv(path)` — load env vars from a dotenv-style file
 * - `getGlobalRegistry()` — read `~/.bnbagent-studio/projects.toml`
 */
declare const STUDIO_TOML = "studio.toml";
declare const GLOBAL_REGISTRY_PATH: string;
declare const APP_DIR = "app";
/** Generic parsed-TOML shape (smol-toml returns nested plain objects). */
type TomlTable = Record<string, unknown>;
/**
 * `studio.toml` was genuinely absent from the project walk-up.
 *
 * Consumers that deliberately support project-less operation may handle this
 * one condition. Parse, permission, and other I/O failures must stay visible:
 * treating those as an absent config silently drops user payment policy.
 */
declare class StudioTomlNotFoundError extends Error {
    constructor();
}
/**
 * A path named `studio.toml` existed during project discovery but was not a
 * usable regular file. This is deliberately distinct from
 * {@link StudioTomlNotFoundError}: silently walking past an existing
 * directory, device, or broken link can drop a user's payment policy.
 */
declare class StudioTomlPathError extends Error {
    readonly path: string;
    readonly kind: string;
    constructor(path: string, kind: string, options?: ErrorOptions);
}

/**
 * Walk up from `start` (or cwd) until a studio.toml is found. Returns the
 * directory path, or null if nothing is detected.
 *
 * Workspace fallback: if the primary walk-up finds no studio.toml, but cwd
 * (or any ancestor) IS a workspace root, return the workspace's `agent/`
 * sub-project so agent-side CLI commands work from the workspace root.
 */
declare function findProjectRoot(start?: string): string | null;
/**
 * Locate the sub-project root for `side` ("agent" or "service").
 *
 * Resolution order:
 * 1. cwd is already inside a sub-project of the requested side;
 * 2. walk up to a workspace root and return `<base>/<side>`;
 * 3. single-package fallback — the root-level studio.toml project that
 *    contains an `agent/` or `service/` package dir.
 */
declare function findSubProjectRoot(side: string, start?: string): string | null;
/**
 * Locate the workspace root — the first ancestor whose workspace base
 * resolves (contains `app/agent/studio.toml`, or legacy `agent/`). This is
 * the dir the native `agentcore` CLI runs from. Returns null if not found.
 */
declare function findWorkspaceRoot(start?: string): string | null;
/**
 * Locate the canonical Studio workspace root.
 *
 * `findWorkspaceRoot()` intentionally preserves its historical behaviour:
 * from inside `<workspace>/app/agent` it may return `<workspace>/app`,
 * because that directory also resembles the legacy `<root>/agent` layout.
 * Workspace-level commands must use this helper so generated paths such as
 * `agentcore/agentcore.json` are always anchored at the true root.
 */
declare function findStudioWorkspaceRoot(start?: string): string | null;
/**
 * Canonical path to the agent's dev-time `.env.local`:
 * `<workspace>/.studio/.env.local` — OUTSIDE the deploy codeLocation and
 * beside the keystore, so no packaging path can bundle its secrets
 * (commitment #2).
 *
 * `findWorkspaceRoot` returns the *app base* in the current layout (because
 * `app/agent/studio.toml` makes `app` itself look like a legacy workspace
 * base), so step up one level when that base is the `app/` dir. Falls back
 * to the project root / `start` / cwd for non-workspace layouts.
 */
declare function envLocalPath(start?: string): string;
/**
 * Load and parse studio.toml. If `path` is omitted, locates studio.toml via
 * `findProjectRoot()`. Throws when no studio.toml is found.
 */
declare function loadStudioToml(path?: string): TomlTable;
/**
 * Load env vars from a dotenv file into process.env. Returns the vars
 * actually loaded (existing env vars are not overwritten). A missing file
 * is a no-op (returns {}).
 */
declare function loadEnv(path?: string): Record<string, string>;
/** Parse the single-line .env format consistently across local and deployed runs.
 * Whitespace outside one matching quote pair is ignored; the first key wins.
 * Values are literal: no interpolation or escape expansion.
 */
declare function parseEnvFile(text: string): Record<string, string>;
/**
 * Read `~/.bnbagent-studio/projects.toml`. Returns an empty object when the
 * file does not exist. `registryPath` is a test seam (defaults to
 * `GLOBAL_REGISTRY_PATH`).
 */
declare function getGlobalRegistry(registryPath?: string): TomlTable;

export { APP_DIR, GLOBAL_REGISTRY_PATH, STUDIO_TOML, StudioTomlPathError as StudioTomlInvalidPathError, StudioTomlNotFoundError, StudioTomlPathError, type TomlTable, envLocalPath, findProjectRoot, findStudioWorkspaceRoot, findSubProjectRoot, findWorkspaceRoot, getGlobalRegistry, loadEnv, loadStudioToml, parseEnvFile };
