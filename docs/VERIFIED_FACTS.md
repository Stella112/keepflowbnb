# Verified facts

FACT: Submissions lock 11 October 2026 at 12:00 UTC.
SOURCE: https://www.bnbchain.org/en/hackathons/tokenized-stocks
DATE VERIFIED: 2026-10-04
VERIFICATION METHOD: Official page read, Key Dates table.
CODE DEPENDENCIES: None.

FACT: Documentation index lists RWA search, aggregator quote/approval and transaction simulation paths.
SOURCE: https://web3.binance.com/en/dev-docs/llms.txt
DATE VERIFIED: 2026-10-04
VERIFICATION METHOD: Official index read.
CODE DEPENDENCIES: None; endpoint semantics remain unverified.


## 2026-10-05 facts

FACT: Request signing requires Base64 HMAC-SHA256 over timestamp + uppercase method + full encoded /build path/query + exact body.
SOURCE: https://web3.binance.com/en/dev-docs/authentication
DATE VERIFIED: 2026-10-05
VERIFICATION METHOD: Official reference read; local signing tests. DOC VERIFIED only.
CODE DEPENDENCIES: lib/binance/auth.ts; scripts/verify-api.ts.

FACT: Supported-chain probe returned HTTP 200, code 40304, success false, compliance restriction. Authentication success cannot be inferred.
SOURCE: fixtures/api/wallet-supported-chains.json
DATE VERIFIED: 2026-10-05
VERIFICATION METHOD: One live read-only request.
CODE DEPENDENCIES: Probe stops immediately on nonzero business status.
