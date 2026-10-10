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

// src/config.ts
var config_exports = {};
__export(config_exports, {
  APP_DIR: () => APP_DIR,
  GLOBAL_REGISTRY_PATH: () => GLOBAL_REGISTRY_PATH,
  STUDIO_TOML: () => STUDIO_TOML,
  StudioTomlInvalidPathError: () => StudioTomlPathError,
  StudioTomlNotFoundError: () => StudioTomlNotFoundError,
  StudioTomlPathError: () => StudioTomlPathError,
  envLocalPath: () => envLocalPath,
  findProjectRoot: () => findProjectRoot,
  findStudioWorkspaceRoot: () => findStudioWorkspaceRoot,
  findSubProjectRoot: () => findSubProjectRoot,
  findWorkspaceRoot: () => findWorkspaceRoot,
  getGlobalRegistry: () => getGlobalRegistry,
  loadEnv: () => loadEnv,
  loadStudioToml: () => loadStudioToml,
  parseEnvFile: () => parseEnvFile
});
module.exports = __toCommonJS(config_exports);
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
function isFile(path) {
  try {
    return (0, import_node_fs.statSync)(path).isFile();
  } catch (cause) {
    const code = cause.code;
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw cause;
  }
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
function findSubProjectRoot(side, start) {
  if (side !== "agent" && side !== "service") {
    throw new Error(`side must be 'agent' or 'service'; got '${side}'`);
  }
  const current = start !== void 0 ? (0, import_node_path.resolve)(start) : process.cwd();
  for (const candidate of selfAndParents(current)) {
    if (candidate !== (0, import_node_path.dirname)(candidate) && candidate.slice((0, import_node_path.dirname)(candidate).length + 1) === side && isRegularStudioToml((0, import_node_path.join)(candidate, STUDIO_TOML))) {
      return candidate;
    }
  }
  for (const candidate of selfAndParents(current)) {
    const base = workspaceBase(candidate);
    if (base !== null) return (0, import_node_path.join)(base, side);
  }
  const singleRoot = findProjectRoot(current);
  if (singleRoot !== null && (isDir((0, import_node_path.join)(singleRoot, APP_DIR, side)) || isDir((0, import_node_path.join)(singleRoot, side)))) {
    return singleRoot;
  }
  return null;
}
function findWorkspaceRoot(start) {
  const current = start !== void 0 ? (0, import_node_path.resolve)(start) : process.cwd();
  for (const candidate of selfAndParents(current)) {
    if (workspaceBase(candidate) !== null) return candidate;
  }
  return null;
}
function findStudioWorkspaceRoot(start) {
  const base = findWorkspaceRoot(start);
  if (base === null) return null;
  return (0, import_node_path.basename)(base) === APP_DIR ? (0, import_node_path.dirname)(base) : base;
}
function envLocalPath(start) {
  const ws = findStudioWorkspaceRoot(start) ?? findProjectRoot(start) ?? (start !== void 0 ? (0, import_node_path.resolve)(start) : process.cwd());
  return (0, import_node_path.join)(ws, ".studio", ".env.local");
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
function loadEnv(path = ".env.local") {
  if (!isFile(path)) return {};
  const loaded = {};
  for (const [key, value] of Object.entries(
    parseEnvFile((0, import_node_fs.readFileSync)(path, "utf-8"))
  )) {
    if (key && process.env[key] === void 0) {
      process.env[key] = value;
      loaded[key] = value;
    }
  }
  return loaded;
}
function parseEnvFile(text) {
  const values = /* @__PURE__ */ Object.create(null);
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    if (Object.hasOwn(values, key)) continue;
    let value = match[2].trim();
    if (value.length >= 2 && (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}
function getGlobalRegistry(registryPath = GLOBAL_REGISTRY_PATH) {
  if (!isFile(registryPath)) return {};
  return (0, import_smol_toml.parse)((0, import_node_fs.readFileSync)(registryPath, "utf-8"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APP_DIR,
  GLOBAL_REGISTRY_PATH,
  STUDIO_TOML,
  StudioTomlInvalidPathError,
  StudioTomlNotFoundError,
  StudioTomlPathError,
  envLocalPath,
  findProjectRoot,
  findStudioWorkspaceRoot,
  findSubProjectRoot,
  findWorkspaceRoot,
  getGlobalRegistry,
  loadEnv,
  loadStudioToml,
  parseEnvFile
});
