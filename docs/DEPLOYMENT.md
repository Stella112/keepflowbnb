# Lightsail deployment — current status 2026-10-09

Current operational setup: protected read-only credentials are installed in shared/app.env (0600); Next listens on loopback port 3100; nginx serves ports 80/443; SQLite and opaque wallet sessions persist outside releases. Runtime is DRY_RUN / MAINNET_WRITE_ENABLED=false. FIRSTBELL_PUBLIC_URL=https://56.125.248.192. Public TCP 443 still times out; SSH transport verifies trusted TLS. Automatic renewal succeeded 2026-10-09; the public certificate is valid 2026-10-09 11:28:24 UTC through2026-10-16 03:28:23 UTC. Next timer trigger 2026-10-10 00:14:24 UTC. See STATUS.md for the latest release and tests.

## Initial bootstrap (historical)

Server: Ubuntu 24.04, São Paulo; SSH user `ubuntu`, IP `56.125.248.192`.

Verified preview: http://56.125.248.192/
Health: http://56.125.248.192/api/health

Both returned HTTP 200 after deployment. Health reported `executionAvailable: false`. This is the bootstrap/read-only infrastructure; no stock purchase functionality is claimed.

Deploy from `C:\bnbstocks` with `npm run deploy:lightsail`. The script expects the user-provided local `firstbell.pem` or `FIRSTBELL_SSH_IDENTITY`, and a previously verified SSH host key. It archives only allowed application source files; it excludes environment files, private keys and Git metadata. Source archives and the official Node binary are checksum-verified on the server. Dependencies use `npm ci`; tests, TypeScript and production build must pass before switching the release symlink.

Current release: `/home/ubuntu/firstbell/releases/20261005234731`.
Current symlink: `/home/ubuntu/firstbell/current`.
Services: `firstbell` and `nginx`, active and enabled at verification.

Node version: 24.21.0, downloaded from https://nodejs.org/dist/v24.21.0/ and checked against the official SHASUMS256.txt. Node 24 is an LTS branch per https://nodejs.org/en/about/previous-releases.

Next binds only to 127.0.0.1:3100. nginx serves the numeric IP on port 80. TLS and a domain remain pending. Application API credentials have not been copied or persisted. The optional service environment-file path is `/home/ubuntu/firstbell/shared/app.env`; that file does not exist yet. A one-call in-memory API test approval does not authorize installing a permanent credential file.

Read-only checks: `systemctl is-active firstbell nginx`, `systemctl is-enabled firstbell nginx`, and `curl http://127.0.0.1:3100/api/health`.

## 2026-10-06 — Current operational setup
Protected server credential storage explicitly approved by the user for read-only discovery, quotes and simulation. /home/ubuntu/firstbell/shared/app.env mode 0600, parent 0700; secrets excluded from source releases. systemd firstbell listens on loopback port 3100, nginx on public 80/443. Real Let's Encrypt IP certificate firstbell-ip installed; trusted local HTTPS health passed. Renewal timer runs twice daily with randomized delay and reload hook. Public 443 currently times out, so HTTPS must be allowed in Lightsail Networking; HTTP proxy retained in the meantime. IP certificate expires 2026-10-12, so renewal is essential. No domain needed for this installed IP certificate.
Read-only previews remain functional over HTTP, but real wallet signing will require public HTTPS verification before being enabled. Preserve the installed TLS nginx site when deploying source releases. Verify health, certificate renewal timer, public HTTPS, source bundle secret scan and consumer browser flow after relevant changes. No API credential values logged or returned.

## Paper account persistence — 2026-10-06
Primary UI now runs paper trading under the user's explicit latest instruction. SQLite database is /home/ubuntu/firstbell/shared/paper.sqlite, mode 0600 under protected shared directory; WAL transactions keep paper cash, positions and receipts consistent. PAPER_DATABASE_PATH is a systemd environment setting and survives source-release switches. Local default logs/paper.sqlite is ignored. No paper money exists onchain; account access is an HttpOnly, SameSite=Lax, host-only browser session cookie with 90-day lifetime. Cookie Secure can be enabled with PAPER_COOKIE_SECURE=true once public HTTPS works; current virtual-only HTTP operation has no wallet or API keys in the browser. Losing the cookie loses access to that practice account. Do not call paper data a verified onchain balance.
Mainnet executionAvailable remains false. Paper tradingAvailable is reported separately. QR is rendered only for HTTPS Bell URLs. Public HTTPS/TCP 443 remains an infrastructure prerequisite for public QR sharing and future real wallet execution.

## Scheduled paper agent
Deployment now installs firstbell-paper-agent.service (oneshot) and firstbell-paper-agent.timer (every minute). The worker reads /home/ubuntu/firstbell/shared/paper-scheduler.key (0600) and posts only to the loopback authenticated tick endpoint. Keys are generated server-side and never bundled in browser code. PAPER_SCHEDULER_KEY_PATH is set in the app service; protected environment, SQLite and the scheduler key persist outside releases. Worker logs contain only aggregate completion/failure counts and mode. Check with systemctl is-active firstbell-paper-agent.timer and journalctl -u firstbell-paper-agent.

## Workspace release and local preview
Current verified release: 20261006201051. Adds wallet sign-in/recovery, My Bells/history and private read-only preview receipts. Existing paper state is preserved in the shared SQLite file. Public HTTP remains available; public HTTPS reachability still needs the cloud firewall rule. The local development listener was unavailable; a hidden SSH tunnel now maps localhost:3100 to the VPS app on 127.0.0.1:3100. Restart it using npm run preview:lightsail. This is a deployed preview, not a separate locally built server. No credentials are copied by this tunnel.

## QR login deployment
The old HTTP QR configuration was replaced. firstbell.service now sets FIRSTBELL_PUBLIC_URL=https://56.125.248.192; identity operations require secure transport. Public TCP 443 and a physical phone scan remain unverified. Requests persist in protected shared SQLite and expire after five minutes. No QR authentication secrets or wallet private keys are deployed to the browser.


