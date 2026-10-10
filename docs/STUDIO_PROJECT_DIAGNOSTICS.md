# Studio project diagnostic contract — 2026-10-09

The official npm archive @bnbagent/studio-cli0.0.14 was inspected without executing or installing the CLI. Registry integrity: sha512-dayWRT65sU5MQUrA+h6Au+L6Sn3zgCvFq+BQaVoKsTkUFKD8yJL4sBfMLCBFjW7lF9Z/YJYPBQJ729wX7XPpJQ==. Its exact source-backed scan invocation is bag scan --path <trusted-root>, with JSON output by default. The pure scanProject function inspects static project manifests. deploy_ready only means a descriptor exists.

Important startup blocker: main-ZNJEQYXO.js autoloadProjectEnv loads project-local environment, and ensureAltanaSessionLoaded runs before dispatch for scan. Filtering inherited process environment does not prevent this. No actual scan, wallet load, login, paid call, deployment, model activation or provider process ran. Vendor source is ignored under tools/agents/vendor-review.

lib/agents/studio-project.ts implements a default-disabled single-operator diagnostic contract with canonical root containment, fixed arguments and exact pinned-version report validation. It returns only static booleans/enums/counts; raw paths, project names and dependency metadata are omitted. requiredCliVersion is a requirement, not installed-version proof. runtimeVerified, deploymentVerified, researchVerified and executionEnabled are always false.

No concrete runner is supplied. A future runner must enforce pinned package/entry containment, output/timeout limits and separately reviewed isolation that prevents project secret/wallet loading. An injected synthetic runner is used only in two tests; it does not establish Studio installation or runtime acceptance. Unknown fields and inconsistent reports fail closed.

Primary references: https://www.npmjs.com/package/@bnbagent/studio-cli and https://docs.bnbchain.org/developer-kit/bnbchain-studio/cli-reference/ . Published package source takes precedence over architectural documentation where versions differ. No documented built-in research command was found; custom sellerCore and paid provider/payment integration remain separate gates.
