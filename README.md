# KeepFlow — paper trading

Practice tokenized-stock investing with live indicative Binance RWA data and 10,000 virtual USD. Mainnet execution is disabled. The complete Version2 mandate remains unfinished; see docs/BLOCKERS.md. No real USDT, wallet approvals, signatures or gas are needed for the paper app.

Implemented: stock paper buys and full-position closes, persistent virtual cash and holdings, private paper receipts, sequential Flow basket fills, independent editable forks, share links, HTTPS-only QR, portfolio valuation, contribution-first rules and scheduled paper autopilot. Follow a Flow at /autopilot, set daily or weekly virtual contributions, and pause/resume your agent. The VPS checks due plans every minute. Creator versions are proposals: your plan keeps its snapshot until you explicitly accept an update that passes your exposure and reserve rules. Paper fills exclude fees, slippage, distributions and corporate actions; they are not executable quotes or successful blockchain simulations.

The app is deployed at http://56.125.248.192/ . HTTPS certificate and automatic renewal are installed; public TCP 443 still times out and requires cloud-network investigation. Paper trading remains available over HTTP. The primary UI clearly labels virtual balances and paper receipts.

## Development

Use Node 24 or newer. Run npm ci, copy .env.example to .env.local, configure the server-only API/RPC values, then npm run dev. Checks: npm test, npm run typecheck, npm run build. Canonical scope is in CLAUDE.md; the user's 2026-10-06 instruction replaces mainnet-first sequencing with paper development. Current evidence and incomplete mainnet gates are in docs/STATUS.md.

SQLite persists outside source releases: PAPER_DATABASE_PATH=/home/ubuntu/firstbell/shared/paper.sqlite on the VPS; local default logs/paper.sqlite is ignored. Paper accounts use an HttpOnly session cookie. Optional signed wallet login restores the linked account across browsers; clearing cookies on an unlinked guest account loses access. Flow definitions are public; receipts and paper balances are private to the account. Ledger writes are transactional and trade request IDs are idempotent.

## Deployment and checks

npm run deploy:lightsail builds/tests a source-only release before switching the current symlink. Environment and private keys are excluded. Existing protected TLS configuration is preserved with a privileged certificate existence check. scripts/check-paper.mjs exercises real paper buys, sells, basket/fork/rules flows, retries and private receipts. It creates clearly labeled QA definitions and uses a test-only virtual account. scripts/check-paper-persistence.mjs verifies that account after restart. scripts/check-https-ui.mjs verifies trusted TLS and QR through SSH while the public firewall is blocked; it does not establish public HTTPS availability.

The earlier read-only Binance quote/build/simulation integration is retained for future mainnet verification. Historical real approval simulation passed; the real swap failed for insufficient USDT. Paper trading does not pass those mainnet gates. Any later real purchase still requires explicit user authorization and successful live verification.

Scheduled paper contributions use a persistent plan ID and scheduled time as the transactional run key. Saving or retrying a plan does not add another contribution. Runs buy underweights using current personal limits; they never sell automatically. Missing valuations leave the new virtual contribution in cash with a SKIPPED receipt. The initial contribution is due immediately; subsequent periods run at 09:00 WAT, without backfilling missed days. Local background scheduling needs PAPER_SCHEDULER_KEY_PATH and an authenticated POST to /api/paper/autopilot/tick; the Lightsail deployment installs the protected key and systemd worker/timer automatically. scripts/check-agent.mjs and scripts/check-agent-persistence.mjs verify this flow against the deployment.

## Account and creator workspace
Optional /account wallet sign-in links your practice account to an EOA wallet with a gasless, domain-bound message signature. Sign in again to restore the account on another browser. A five-minute random nonce is verified server-side and consumed once; no private key is stored. Guest mode remains available. Signing into an existing saved account restores it without combining the current guest account. /my-bells lists your own strategies; /b/[id]/history shows published versions. New definitions display only a verified creator address or guest attribution.

Stock pages also offer read-only real quote/build/simulation previews under “Preview a future mainnet purchase.” /preview/[id] stores private evidence in SQLite. Actual failed simulations remain failed; changing inputs clears stale results. This does not enable transaction signing/broadcast or spend funds. scripts/check-workspace.mjs verifies login, cross-browser recovery, ownership/history, actual Binance preview, privacy and mobile UI.

For this PC's local view of the VPS, run npm run preview:lightsail. This starts a hidden SSH tunnel from localhost:3100 to the app's VPS loopback port. The SSH key stays on this PC and API credentials stay on the VPS. A local development server cannot occupy the same port concurrently. Localhost and the public IP use separate browser cookies; optional wallet sign-in restores the same saved account across those origins. Normal source development remains npm run dev; the preview tunnel displays the deployed release.

## QR login
Open /account on the PC and choose Show login QR. Scan on your phone and open the approval page in your wallet's browser. Sign the KeepFlow login message, check the eight-character code matches the computer, and approve the computer. Back on the PC, check the wallet address and select Finish QR login. Requests expire after five minutes and are single-use. Generating a new QR cancels the old request. This signs in to the saved paper account; it does not authorize a trade or transfer. Regular wallet-extension login remains available as an alternative.

FIRSTBELL_PUBLIC_URL must be reachable by the phone. The deployed app uses the public VPS origin even when the PC is viewing localhost. Current public HTTP is for paper development while the documented HTTPS firewall issue remains; set a reachable HTTPS origin for production. scripts/check-qr-login.mjs verifies two independent desktop/phone browser contexts and rejection boundaries. An actual phone camera/wallet scan remains to be tried.
## Core wallet checks — 2026-10-08

Open a Flow and expand **Check this Flow against a real wallet** to run real quote, wallet-policy and simulation checks. The portfolio page also reads actual BSC stock holdings separately from virtual positions. Checks save private per-leg receipts and stop at the first failure. They never sign or submit transactions; mainnet execution remains disabled. See [core dry-run boundaries](docs/CORE_DRY_RUN.md).



## Latest account and evidence controls
Opaque wallet sessions support active-session counts and sign-out of other browsers. QR and desktop sign-ins are serialized. Public sharing QR uses the configured HTTPS origin, including from localhost previews. New paper receipts capture event-time Flow version/hash, personal/effective rules and remaining virtual cash, with owner-only JSON export. Missing legacy evidence is explicit. The future wallet-wide budget reservation core is tested but disconnected from execution; no signer, live verifier or broadcast path exists.

