# Daily and weekly paper purchase limits

Set optional maximum daily and weekly paper spend from Portfolio, describe them as `max daily spend 50 USD, max weekly spend 200 USD`, or add caps to a Bell definition. Blank caps add no limit; zero caps pause purchases. Bell caps can only tighten personal limits.

Days use Africa/Lagos (UTC+1). Weeks begin Monday at 00:00 WAT. Totals count successful virtual purchase cost, including successful legs of partial baskets. Failed/blocked legs and cash contributions consume no purchase budget. Selling never restores consumed budget. Exact costs are stored in USD micro-units; receipts and the usage panel show the same successful cost.

The compact ledger survives receipt-history removal and restart. Accounts created before this feature derive current-period usage from successful historical purchase receipts on first fill; reads do not mutate accounts. Invalid or backwards period history fails closed.

These limits enforce paper purchases only. Real wallet permission, live spending reservations, quote and transaction checks remain separate unfinished acceptance gates. No mainnet writes are enabled by saving these fields.
