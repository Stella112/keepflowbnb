# Owner inputs needed

Current permission remains paper trading and read-only. Login does not authorize payments, token approvals, trades, wallet imports, identity registration or cloud costs.

## Binance VPS login

The reviewed login flow is available on the existing VPS. A fresh official Binance challenge was created there on October10. Confirm its exact pairing code in the Binance app, then tell the engineer it is confirmed. The challenge stays in a protected server file; local CLI session material is not copied. After confirmation the engineer must verify CONNECTED, the BSC address and session expiry before recording successful authentication. An expired link needs a new challenge, not a reused confirmation.

## Studio operator wallet

Completed after explicit owner authorization: a dedicated evm-local wallet was created on the VPS at `/home/ubuntu/firstbell-studio`, address `0xcEf06DA67ACcBcdd6614A9875eFCe2c85A960329`. The official CLI generated and privately saved the password; password and encrypted keystore permissions are0600. No wallet secret was copied into this repository or printed. Address/keystore binding and BSC connectivity passed. Runtime, seller policy, on-chain identity and cloud deployment remain separate incomplete steps. The earlier missing-wallet note below describes the pre-creation check.

The actual setup check found no Studio keystore and no WALLET_PASSWORD. Choose an existing dedicated Studio wallet or authorize creation of a new isolated Studio operator wallet. Creation/import is separate from financial activation. The engineer must prepare the official pinned wallet flow first. Enter the password through the official hidden terminal prompt; do not paste passwords, seed phrases or private keys into chat. Studio wallet provisioning does not authorize identity-registration transactions, cloud deployment, model topups or paid jobs.

Official workflow: https://docs.bnbchain.org/developer-kit/bnbchain-studio/cli-reference/

## Funded verification, later

After production signing, token-domain checks and exact payload review are ready, the engineer must present an exact request for approval: owner wallet, BSC56, asset/spender/merchant, amount, expiry and maximum gas/cost. Only then fund the dedicated wallet and authorize the bounded test. Stock purchases use supported USDT routes; the implemented research signing core supports provider-accepted U or USD1 EIP3009, not USDT Permit2. Current provider fee is0.1 selected research token per accepted attempt; a failed report does not imply a refund. Do not infer payment settlement from job acceptance.

The owner does not need another VPS, another Binance API key or a raw-signing API specification. Signer compatibility, provider integration and remaining production wiring are engineering work. A sponsored path must prove actual wallet compatibility and policy eligibility; ordinary wallet transaction sending does not prove zero-gas raw signing.

Public repository/submission requires a destination repository and separate authorization to publish reviewed source. Credentials and session state must be excluded.
