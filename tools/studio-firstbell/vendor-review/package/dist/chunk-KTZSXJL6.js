// src/secretWrite.ts
import { closeSync, fchmodSync, openSync, writeSync } from "fs";
function writePrivate(path, content) {
  const fd = openSync(path, "w", 384);
  try {
    fchmodSync(fd, 384);
    writeSync(fd, content);
  } finally {
    closeSync(fd);
  }
}

export {
  writePrivate
};
