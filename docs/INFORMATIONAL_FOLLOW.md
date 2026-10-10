# Informational Bell following

Following saves a private snapshot of a public Bell for the current account. Creator updates appear as a comparison against that snapshot. Following never changes balances, holdings, personal policies, contributions, an Autopilot plan or wallet permissions.

Repeating a follow request retains the original snapshot. Reviewing and acknowledging a newer version explicitly advances only the informational snapshot, with both saved-version and current-version checks to reject stale decisions. Unfollowing removes only the follow record.

Allocation, reserve and Bell policy changes are displayed with a personal-rule advisory. These checks do not evaluate holdings, executable quotes, simulation, gas or transaction eligibility. Any later investment or Autopilot change remains a separate action under the account's rules.

The API derives the account from the server session and never accepts a client owner or wallet. Mutations require a same-origin request, validated bounded body and an existing account. Follow records are private and limited per account. Saved browser session identity is needed to recover them; wallet sign-in can recover the linked account across devices.

This satisfies informational following rather than live portfolio adoption or financial execution. Those acceptance gates remain tracked separately.

Verified release 20261009082916: all 123 Linux tests, typecheck and production build passed. Three follow-store tests cover durable ownership, replay, stale acknowledgement and row limits. Deployed mobile browser proves detail follow, upstream update diff, stale409, explicit acknowledgement, unfollow, strict argument/origin rejection and unchanged personal policy/Autopilot. Independent auth review fixed stale401/404 responses clearing newer UI state. Test Bell removed after exact fixture validation. Evidence: test-results/bell-follow-proof.json.
