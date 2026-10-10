# Receipt and budget review — 2026-10-09

Independent Codex reviewers accepted event-time paper receipt snapshots and the disconnected future budget reservation core. No Claude CLI ran.

Receipt review found scheduled cap provenance incorrectly labelled personal rules. The repair preserves actual personal rules separately from effective Bell/plan rules, with a regression test. Four focused tests pass, including historical immutability, private owner retrieval, export omissions and legacy absence.

Budget review repaired global intent bindings, immutable overrun evidence, actual-spend validation above policy ceilings, synchronized concurrent-writer tests and transition journals. Ten focused tests pass. Ambiguous submissions retain holds before hash discovery. Wallet-wide period caps, canonical/finality evidence requirements and overrun quarantine are reviewed; no live verifier or execution caller exists.

Release 20261009132122 passed 154 Linux tests, typecheck and production build. npm audit reported zero vulnerabilities. Runtime remains DRY_RUN / MAINNET_WRITE_ENABLED=false. Both API secrets had zero browser-bundle matches; database mode 0600. Browser receipt acceptance is recorded separately in test-results/receipt-evidence-proof.json after completion. No real transaction or payment occurred.


Final release 20261009133732:156 tests, typecheck/build PASS. Receipt UI review repaired legacy effective-rule fallback; missing evidence now says Not captured. Final deployed browser proof passed with PAPER_FILLED receipt, exact cash match, immutable policy after changes, owner-only no-store export, mobile layout and unchanged JSON after controlled restart. Evidence: test-results/receipt-evidence-proof.json.

