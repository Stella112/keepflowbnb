# Research payment boundary

The x402 v2 offer inspector validates a bounded PAYMENT-REQUIRED base64 JSON header against an explicitly configured HTTPS resource, BSC exact scheme, merchant address, token address and separate atomic research budget. It returns the actual offered amount without inventing token decimals or a USD price. A configuration match is not cryptographic merchant authentication. The service-provided timeout is not claimed to be an absolute offer expiry.

Source: https://docs.x402.org/core-concepts/http-402 (verified 2026-10-08). The internal ResearchMerchant contract is First Bell configuration, not a provider API specification.

This is tested protocol plumbing, not a connected paid research integration. No merchant URL, credentials, sponsored payment wallet or paid provider response is configured. There is no payment signature, automatic retry, settlement call or public arbitrary URL fetch. The required live provider, source-grounded result, asynchronous jobs, explicit payment approval and payment proof remain open. Paper trading grants none of that authority.
