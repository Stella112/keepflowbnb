/**
 * Atomic creation of private (0o600) files — port of
 * `bnbagent_studio_core/_secret_write.py`.
 *
 * The file is created with restrictive permissions *from the start* (not
 * written under the process umask and chmod-ed afterwards), so secret
 * material is never momentarily world-readable between write and chmod.
 */
/**
 * Write `content` to `path` as a 0o600 file, created atomically.
 *
 * The descriptor is opened with O_CREAT mode 0o600 and an explicit fchmod
 * (to defeat a restrictive-umask edge), so the file is never momentarily
 * world-readable. O_TRUNC overwrites existing contents *and* the fchmod
 * retroactively tightens an already-permissive file to 0o600 — safe for
 * both first-create and rewrite-in-place callers. The parent directory
 * must already exist.
 */
declare function writePrivate(path: string, content: string): void;

export { writePrivate };
