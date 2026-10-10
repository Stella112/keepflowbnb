# Paymaster verification — 2026-10-08

## Implemented scope

`lib/paymaster/megafuel.ts` is an internal **read-only eligibility adapter**, not a sponsorship/signing/broadcast API. Disabled unless `PAYMASTER_ENABLED=true` or an internal test explicitly enables it. Default remains disabled; no environment or deployment flags were changed.

Endpoint is pinned to `https://bsc-megafuel.nodereal.io/`, with redirect rejection, eight-second abort, 16 KiB streamed-response limit, strict Zod input/output validation and request-ID correlation. Unknown/malformed/error responses yield UNAVAILABLE, not eligibility.

Trusted context must establish BSC 56, server-validated public wallet address (not proof of ownership), policy allowance, permitted route and selector, zero native value, positive USDT amount capped at five USDT, bounded gas at most one million, fresh quote, and successful simulation bound to an exact transaction fingerprint. Caller must derive this context from verified server state; accepting these assertions from public request JSON would invalidate the security boundary. The module has no public route. The local quote freshness window is an application constraint, not an upstream quote-expiry claim.

Even ELIGIBLE results retain `executionEnabled:false`; this means provider eligibility only, not wallet compatibility or guaranteed sponsored confirmation. Sponsor display fields are untrusted text; icon/website URLs are not fetched or returned.

## Authoritative interface evidence

NodeReal's official JS SDK calls `pm_isSponsorable` with one transaction argument and declares `Sponsorable`, `SponsorName`, `SponsorIcon`, `SponsorWebsite` response fields. The adapter follows this exact method and requires those fields. [Official JS source](https://github.com/node-real/megafuel-js-sdk/blob/main/src/paymasterclient.ts).

NodeReal's Go SDK independently calls `pm_isSponsorable` with transaction arguments. [Official Go source](https://github.com/node-real/megafuel-go-sdk/blob/main/pkg/paymasterclient/client.go).

BNB's API specification supplies hexadecimal `from`, `to`, `value`, `data`, `gas` fields but names response policy metadata differently. [BNB API specification](https://docs.bnbchain.org/bnb-smart-chain/developers/paymaster/paymaster-api/).

The older provider guide instead names `pm_sponsorable`; BNB wallet guide names `gm_sponsorable`. This documentation discrepancy remains recorded; the adapter does not try alternate methods or normalize unknown response variants. [NodeReal guide](https://docs.nodereal.io/docs/wallet-integration-copy), [BNB wallet guide](https://docs.bnbchain.org/bnb-smart-chain/developers/paymaster/wallet-integration/).

## Verification level

DOCUMENTATION VERIFIED: SDK method, provider endpoint and expected response fields.

LOCALLY VERIFIED: `node --test tests/paymaster.test.ts`: three passing tests covering disabled/no-network paths, wrong chain/policy/wallet/budget, stale quote and mismatched simulation, exact RPC body/pinned URL, response correlation, calldata/native-value mutation, oversized responses and network failure. Fixture ELIGIBLE is explicitly a synthetic unit-test response, not mainnet sponsorship evidence.

LIVE VERIFIED: no sponsored execution, no eligible stock transaction proof, no actual wallet compatibility proof. A harmless public `eth_chainId` probe from this PC returned `TypeError fetch failed`; no provider response was obtained. It made no signing, registration or payment request. This network failure does not prove the provider is unavailable from the VPS.

Whole-project typecheck and Linux production build now pass.

## Remaining blockers and scope

1. Actual provider response for an application-validated, successfully simulated stock transaction is not established. Unknown provider variants fail closed.
2. Consumer Binance Wallet raw-signing/zero-gas/provider-submission compatibility is unverified; EIP-1193 connection alone does not prove it.
3. A qualifying sponsor policy and any needed sponsor authorization/funding are unverified.
4. Adapter is now wired into the dry preparation workflow using the exact server-built candidate, actual simulation fingerprint and captured policies. Public address checks grant no signing authority.
5. No signed transaction submission, nonce management, paid fallback or sponsor registration implementation exists here. These remain required future work after capability and authorization verification.

No keys, accounts, permissions or funds were accessed or changed. No signed transaction was submitted. Gate 12 remains unverified.

Application workflow: four additional tests pass for candidate binding, guarded sponsored preparation and disabled authorization/submission. No real eligible or sponsored transaction is claimed.

2026-10-09 VPS network verification: the pinned public endpoint returned HTTP200 and exact JSON-RPC eth_chainId result0x38 (BSC56), with correct ID and no error. This verifies TLS/RPC reachability only. No wallet, policy eligibility, signature, payment or transaction was supplied. Proof test-results/paymaster-network-proof.json; script scripts/check-paymaster-network.mjs. Sponsorability and sponsored confirmation remain unverified.
