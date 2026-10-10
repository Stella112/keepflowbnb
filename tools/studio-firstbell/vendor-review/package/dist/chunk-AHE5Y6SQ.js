// src/config.ts
import { lstatSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { basename, dirname, join, resolve } from "path";
import { parse as parseToml } from "smol-toml";
var STUDIO_TOML = "studio.toml";
var GLOBAL_REGISTRY_PATH = join(
  homedir(),
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
    linkStat = lstatSync(path);
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
    targetStat = statSync(path);
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
    return statSync(path).isFile();
  } catch (cause) {
    const code = cause.code;
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw cause;
  }
}
function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
function selfAndParents(start) {
  const out = [];
  let current = resolve(start);
  for (; ; ) {
    out.push(current);
    const parent = dirname(current);
    if (parent === current) return out;
    current = parent;
  }
}
function workspaceBase(root) {
  for (const base of [join(root, APP_DIR), root]) {
    if (isRegularStudioToml(join(base, "agent", STUDIO_TOML))) return base;
  }
  return null;
}
function findProjectRoot(start) {
  const current = start !== void 0 ? resolve(start) : process.cwd();
  for (const candidate of selfAndParents(current)) {
    if (isRegularStudioToml(join(candidate, STUDIO_TOML))) return candidate;
  }
  for (const candidate of selfAndParents(current)) {
    const base = workspaceBase(candidate);
    if (base !== null) return join(base, "agent");
  }
  return null;
}
function findSubProjectRoot(side, start) {
  if (side !== "agent" && side !== "service") {
    throw new Error(`side must be 'agent' or 'service'; got '${side}'`);
  }
  const current = start !== void 0 ? resolve(start) : process.cwd();
  for (const candidate of selfAndParents(current)) {
    if (candidate !== dirname(candidate) && candidate.slice(dirname(candidate).length + 1) === side && isRegularStudioToml(join(candidate, STUDIO_TOML))) {
      return candidate;
    }
  }
  for (const candidate of selfAndParents(current)) {
    const base = workspaceBase(candidate);
    if (base !== null) return join(base, side);
  }
  const singleRoot = findProjectRoot(current);
  if (singleRoot !== null && (isDir(join(singleRoot, APP_DIR, side)) || isDir(join(singleRoot, side)))) {
    return singleRoot;
  }
  return null;
}
function findWorkspaceRoot(start) {
  const current = start !== void 0 ? resolve(start) : process.cwd();
  for (const candidate of selfAndParents(current)) {
    if (workspaceBase(candidate) !== null) return candidate;
  }
  return null;
}
function findStudioWorkspaceRoot(start) {
  const base = findWorkspaceRoot(start);
  if (base === null) return null;
  return basename(base) === APP_DIR ? dirname(base) : base;
}
function envLocalPath(start) {
  const ws = findStudioWorkspaceRoot(start) ?? findProjectRoot(start) ?? (start !== void 0 ? resolve(start) : process.cwd());
  return join(ws, ".studio", ".env.local");
}
function loadStudioToml(path) {
  let tomlPath;
  if (path === void 0) {
    const root = findProjectRoot();
    if (root === null) {
      throw new StudioTomlNotFoundError();
    }
    tomlPath = join(root, STUDIO_TOML);
  } else {
    tomlPath = isDir(path) ? join(path, STUDIO_TOML) : path;
  }
  isRegularStudioToml(tomlPath);
  return parseToml(readFileSync(tomlPath, "utf-8"));
}
function loadEnv(path = ".env.local") {
  if (!isFile(path)) return {};
  const loaded = {};
  for (const [key, value] of Object.entries(
    parseEnvFile(readFileSync(path, "utf-8"))
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
  return parseToml(readFileSync(registryPath, "utf-8"));
}

export {
  STUDIO_TOML,
  GLOBAL_REGISTRY_PATH,
  APP_DIR,
  StudioTomlNotFoundError,
  StudioTomlPathError,
  findProjectRoot,
  findSubProjectRoot,
  findWorkspaceRoot,
  findStudioWorkspaceRoot,
  envLocalPath,
  loadStudioToml,
  loadEnv,
  parseEnvFile,
  getGlobalRegistry
};
