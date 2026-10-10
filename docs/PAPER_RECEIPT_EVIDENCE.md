# Paper receipt evidence

New paper trading and scheduled agent receipts capture the event-time Bell version and content hash, remaining virtual cash, personal rules, and effective Bell/plan rules. These are stored with the original receipt. Later strategy or policy changes do not rewrite the event. Legacy receipts omit missing evidence rather than borrowing current state.

Scheduled plan caps are represented only in effective rules. Personal rules retain their actual account values. Cash is captured after all completed sequential paper legs, including partial baskets; no real USDT, fees or blockchain result is implied.

Receipt JSON downloads use the existing owner-scoped API and require the same browser account or authenticated restored account as viewing. Unauthorized reads return the same no-store 404 without creating an account cookie. Exports omit internal request fingerprints and replay IDs. Wallet keys, session tokens and permissions are not part of the receipt.

Independent Codex review accepted the personal/effective-rule repair; four targeted tests passed. Deployed browser validation is recorded separately after activation. Mainnet spending remains disabled.
