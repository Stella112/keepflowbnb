# Read-only application tool HTTP boundary

POST /api/tools accepts exactly `{name, arguments}` with a bounded request body. This shared application-service interface is not an MCP server or proof of a connected MCP client. The separate /api/mcp route now wraps the same existing handlers in the official SDK Streamable HTTP protocol; see MCP_SERVICE.md.

Public stock/Bell reads and unsaved allocation drafts require same-origin requests. Private portfolio/receipt/policy drafts and preparation operations also require a verified opaque session linked to a wallet, over HTTPS or exact loopback. The server derives account identity and PRIVATE_READ or EXECUTION_PREPARATION scope. Client authorization, wallet identity, confirmation flags and arbitrary transactions are rejected.

The interface excludes Bell mutations, policy saves, financial execution authorization and reconciliation. Those app flows retain their separate validated boundaries. Execution requests remain disabled. All successful responses state executionAvailable:false.

Production bindings use live Binance discovery/quote/build/simulation, actual RPC balances, paper ledger math and owner-scoped stores. Quote-only Bell checks do not build or simulate; saved kind and final state distinguish quotes from simulations. Neither constitutes a trade or ownership proof. Empty real wallets block funding checks rather than using virtual cash.

Policy drafts include source expectedPolicyVersion. Applying a reviewed draft changes editor fields only; an explicit save uses that captured version. Concurrent changes reject stale saves. No schedule or wallet authority is granted.

Independent security review found no concrete new repair required in this HTTP boundary. Service and deployed HTTP/browser results are recorded in STATUS.md. Public HTTPS, physical wallet and external-assistant delegation remain separate gates.

