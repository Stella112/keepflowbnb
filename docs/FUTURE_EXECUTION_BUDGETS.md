# Future execution budget reservations

The budget core is implemented for a future authorized live engine and is not called by any application route. No signer, submission endpoint, RPC settlement verifier or mainnet operation was added. Current financial authorization remains paper/read-only.

Reservations use exact six-decimal USDT units and SQLite write transactions. Limits aggregate by normalized wallet across browser accounts. Every unresolved hold counts toward both current WAT day and Monday-start week caps, including holds from previous periods. Confirmed debit is attributed to its verified block confirmation time. Releasing unused reservation capacity does not refund recorded spending.

The future engine must commit SUBMISSION_STARTED before calling a wallet/signing/submission service, even before a hash is available. Ambiguous holds are never expired or cancelled. Only untouched RESERVED records can be cancelled; a verified reverted transaction can release its hold. Request, intent and transaction-hash bindings are permanent. Repeated identical terminal settlement does not count twice.

A trusted server verifier must independently establish the pinned intent/wallet/hash, canonical block, at least twelve confirmations and actual token debit. Schema validation and fixture booleans do not prove this. Actual debit above reservation is preserved immutably and quarantines the wallet; no recovery/override exists. Every meaningful transition has an immutable revisioned journal.

Ten deterministic tests passed, including synchronized independent SQLite writers, reopening storage, WAT/Monday rollover, immutable evidence and actual debit above the reservation policy ceiling. Independent Codex review accepted the repairs. These are synthetic tests, not live acceptance evidence.


Future verifier requirement: normalize actual funding-token debit to policy micro-units by rounding upward, never truncating finer on-chain decimals, and retain the original exact token-unit evidence. This conversion and live RPC verification are not implemented or claimed by the disconnected core.

