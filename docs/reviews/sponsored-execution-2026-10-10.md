# Sponsored original transaction implementation

Inspected 2026-10-10:

- https://docs.bnbchain.org/bnb-smart-chain/developers/paymaster/paymaster-api/
- https://docs.bnbchain.org/bnb-smart-chain/developers/paymaster/wallet-integration/

The API specification names `pm_isSponsorable` and `eth_sendRawTransaction`. The wallet integration guide says `gm_sponsorable` in its workflow; the implementation retains the explicit API specification method. Existing MegaFuel response handling intentionally requires its previously verified SponsorName variant; the generic SponsorPolicy variant is not silently treated as the same provider response.

The new engine prepares the pending nonce, requires exact zero-gas simulation and financial authorization, reserves the shared wallet budget through its trusted adapter, commits a once-only journal before signing, checks the recovered sender and every transaction field, derives its own hash, and submits only to the fixed MegaFuel endpoint. It never falls back to owner-paid gas. Ambiguous submission retains the reservation and cannot be retried. Public application endpoints remain read-only and do not attach a compatible signer.

Independent verification requires a mined legacy chain-56 original transaction, exact fields, zero actual gas price, at least 12 canonical confirmations, and the existing stock/funding effects reconciler. `sponsorPaymentVerified` remains false: the original's zero gas price is insufficient evidence of a sponsor's separate gas-payment transaction. Provider policy identity also does not prove funds availability.

Validation: `node --test tests/sponsored-execution.test.ts tests/paymaster-workflow.test.ts`: 9 passed. `npx tsc --noEmit`: passed. The signing tests use an unfunded synthetic test key and intercepted provider requests. No real transaction was signed or submitted and no financial flags changed.

External acceptance still requires documented supported-wallet raw signing of a legacy EIP-155 transaction on chain 56 with gasPrice zero, explicit owner financial authorization, actual sponsor eligibility/funding, and independently observed sponsor-payment evidence. `eth_sendTransaction` support alone does not establish raw-signing compatibility.
