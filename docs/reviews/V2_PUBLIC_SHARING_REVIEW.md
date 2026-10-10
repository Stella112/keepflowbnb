# Public sharing review — 2026-10-09

Mandate section 10 general and Bell-specific share QR routes now use the server-configured HTTPS origin rather than the current localhost preview address. Only the home route and public Bell identifiers are permitted. Credentials, URL query/fragment/path configuration, local DNS, private IPv4, CGNAT and IPv6 literals are rejected. IPv6 literal sharing remains unsupported pending separate routing verification.

Independent Codex review found local/private origin forms initially accepted. The final repair rejects the reported cases and regression tests passed. Server configuration is trusted; URL validation does not establish DNS resolution, certificate trust or public network reachability. Physical phone and public HTTPS acceptance remain pending.

Sharing does not create sessions, sign messages, authorize wallets, spend funds or encode calldata. Existing manifest downloads remain available. No Claude CLI ran.

Final deployment 20261009130058: 140 Linux tests, typecheck/build passed; npm audit zero vulnerabilities. Deployed mobile home/Bell QR and configured HTTPS link checks passed. Runtime remains DRY_RUN / MAINNET_WRITE_ENABLED=false; both API credentials have zero browser-bundle matches. Evidence: test-results/public-sharing-proof.json.
