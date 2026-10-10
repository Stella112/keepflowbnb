import { LanguageModel } from 'ai';
import { TomlTable } from './config.cjs';

/**
 * Framework-neutral LLM provider config resolver — port of
 * `bnbagent_studio_core/llm.py`, revised for the TS stack (decision D3):
 * the LiteLLM model-string output is replaced by a Vercel AI SDK model
 * factory (`resolveModel`), while `resolveProviderConfig` keeps the exact
 * provider/env-var/base-URL semantics for CLI display (`bag llm
 * test/status`).
 */

/** SHA-256 identifier used by Pieverse as `[llm.pieverse].key_hash`. */
declare function pieverseKeyHash(apiKey: string): string;
/**
 * Framework-neutral resolved LLM provider config — the output of
 * {@link resolveProviderConfig}. Captures everything needed to construct a
 * model object (or display provider status) without importing any agent
 * framework.
 */
interface ProviderConfig {
    /** Provider kind as written in `[llm].provider` (`bedrock` / `anthropic`
     * / `openrouter` / `openai` / `pieverse-llm`). */
    provider: string;
    /** The model string from `[llm].model`, unmodified. */
    modelId: string;
    /** Resolved from the provider's env var, or null for providers that
     * don't take a key (`bedrock`). */
    apiKey: string | null;
    /** The provider's API base URL, or null when the provider's default
     * base URL applies. */
    baseUrl: string | null;
}
/**
 * Read `[llm]` and resolve a framework-neutral {@link ProviderConfig}.
 *
 * Pure config + env-var lookup; no framework import. Throws on
 * missing/unknown providers and on missing API keys (with a `bag llm
 * activate` hint for Pieverse).
 */
declare function resolveProviderConfig(llmCfg: TomlTable): ProviderConfig;
/**
 * Resolve `[llm]` into a ready-to-use Vercel AI SDK `LanguageModel`.
 *
 * - openrouter / openai / pieverse-llm: OpenAI-compatible Chat Completions
 *   via `createOpenAI({ baseURL, apiKey }).chat(modelId)` — `.chat` (not
 *   the default Responses API callable) because third-party
 *   OpenAI-compatible endpoints only serve `/chat/completions`.
 * - anthropic: `createAnthropic({ apiKey })(modelId)`.
 * - bedrock: `createAmazonBedrock()(modelId)` — AWS creds via env chain.
 */
declare function resolveModel(llmCfg: TomlTable): LanguageModel;

export { type ProviderConfig, pieverseKeyHash, resolveModel, resolveProviderConfig };
