"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/llm.ts
var llm_exports = {};
__export(llm_exports, {
  pieverseKeyHash: () => pieverseKeyHash,
  resolveModel: () => resolveModel,
  resolveProviderConfig: () => resolveProviderConfig
});
module.exports = __toCommonJS(llm_exports);
var import_node_crypto = require("crypto");
var import_amazon_bedrock = require("@ai-sdk/amazon-bedrock");
var import_anthropic = require("@ai-sdk/anthropic");
var import_openai = require("@ai-sdk/openai");
var OPENAI_COMPATIBLE_BASE_URLS = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  "pieverse-llm": "https://llm.pieverse.io/v1"
};
var API_KEY_ENV = {
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
  "pieverse-llm": "PIEVERSE_LLM_API_KEY",
  anthropic: "ANTHROPIC_API_KEY"
};
function pieverseKeyHash(apiKey) {
  return (0, import_node_crypto.createHash)("sha256").update(apiKey, "utf-8").digest("hex");
}
function normaliseKeyHash(value) {
  return value.trim().toLowerCase().replace(/^0x/u, "");
}
function resolveProviderConfig(llmCfg) {
  const provider = String(llmCfg.provider ?? "openrouter");
  const model = llmCfg.model;
  if (!model) {
    throw new Error("[llm] model is required in studio.toml");
  }
  const modelId = String(model);
  if (provider === "bedrock") {
    return { provider, modelId, apiKey: null, baseUrl: null };
  }
  if (provider === "anthropic") {
    const keyEnv = API_KEY_ENV.anthropic;
    const apiKey = process.env[keyEnv];
    if (!apiKey) {
      throw new Error(
        `${keyEnv} env var is required for provider='anthropic'.`
      );
    }
    return { provider, modelId, apiKey, baseUrl: null };
  }
  const defaultBaseUrl = OPENAI_COMPATIBLE_BASE_URLS[provider];
  if (defaultBaseUrl !== void 0) {
    const keyEnv = API_KEY_ENV[provider];
    const apiKey = process.env[keyEnv];
    if (!apiKey) {
      const hint = provider === "pieverse-llm" ? ` \u2014 run \`bag llm activate\` to create a zero-deposit key and write ${keyEnv} into .env.local.` : "";
      throw new Error(
        `${keyEnv} env var is required for provider='${provider}'.${hint}`
      );
    }
    if (provider === "pieverse-llm") {
      const pieverse = llmCfg.pieverse;
      const pieverseCfg = pieverse !== null && typeof pieverse === "object" && !Array.isArray(pieverse) ? pieverse : {};
      const configuredHash = pieverseCfg.key_hash;
      if (configuredHash) {
        const expected = normaliseKeyHash(String(configuredHash));
        const actual = pieverseKeyHash(apiKey);
        if (expected !== actual) {
          throw new Error(
            `${keyEnv} does not match [llm.pieverse].key_hash (configured ${expected.slice(0, 12)}\u2026, actual ${actual.slice(0, 12)}\u2026). Refusing to use or auto-renew the wrong Pieverse key.`
          );
        }
      }
    }
    const baseUrl = String(llmCfg.base_url ?? defaultBaseUrl);
    return { provider, modelId, apiKey, baseUrl };
  }
  throw new Error(`Unknown llm.provider: '${provider}'`);
}
function resolveModel(llmCfg) {
  const cfg = resolveProviderConfig(llmCfg);
  if (cfg.provider === "bedrock") {
    return (0, import_amazon_bedrock.createAmazonBedrock)()(cfg.modelId);
  }
  if (cfg.provider === "anthropic") {
    return (0, import_anthropic.createAnthropic)({ apiKey: cfg.apiKey ?? void 0 })(cfg.modelId);
  }
  return (0, import_openai.createOpenAI)({
    baseURL: cfg.baseUrl ?? void 0,
    apiKey: cfg.apiKey ?? void 0
  }).chat(cfg.modelId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  pieverseKeyHash,
  resolveModel,
  resolveProviderConfig
});
