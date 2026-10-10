# Account sign-in sessions

Wallet-signed-in accounts can view their active session count and current expiry on Account, and explicitly revoke other active First Bell sessions. The current session stays valid. Other accounts and expired records are unaffected. Repeating revocation is idempotent.

Both endpoints derive identity from the protected opaque session cookie and verified linked account, never a client wallet address, guest UUID, account ID or token argument. Responses contain only counts, current expiry and the unchanged-financial-authorization marker. No token, token hash, IP address or guessed device name is exposed.

The mutation rechecks authorization and expiry after acquiring the database transaction lock, then revokes other active sessions of that account. The current credential cannot revoke anything after it expires or is revoked. It does not revoke wallet/Agentic permissions or prevent a later wallet-approved login.

Account and QR interfaces fence asynchronous results and validate the recovered account. A shared operation lock serializes QR generation/finish, direct wallet sign-in and logout, preventing competing sign-in requests from committing different browser identities.

The browser proof uses randomly generated unfunded test signers for message authentication only. Certificate-validated QR regression runs over SSH because public port 443 remains unreachable; it is not physical phone evidence.
