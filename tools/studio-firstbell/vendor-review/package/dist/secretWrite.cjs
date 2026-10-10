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

// src/secretWrite.ts
var secretWrite_exports = {};
__export(secretWrite_exports, {
  writePrivate: () => writePrivate
});
module.exports = __toCommonJS(secretWrite_exports);
var import_node_fs = require("fs");
function writePrivate(path, content) {
  const fd = (0, import_node_fs.openSync)(path, "w", 384);
  try {
    (0, import_node_fs.fchmodSync)(fd, 384);
    (0, import_node_fs.writeSync)(fd, content);
  } finally {
    (0, import_node_fs.closeSync)(fd);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  writePrivate
});
