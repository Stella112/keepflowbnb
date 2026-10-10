import { z } from "zod";
export const previewSchema=z.object({id:z.string().uuid(),ticker:z.string(),provider:z.string(),amount:z.string(),tokenSymbol:z.string(),estimatedTokens:z.string(),estimatedShares:z.string(),route:z.string(),estimatedNetworkFeeUsd:z.string().nullable(),priceImpactPercent:z.string().nullable(),approvalRequired:z.boolean(),balanceSufficient:z.boolean(),usdtBalance:z.string(),fetchedAt:z.string().datetime(),executionEnabled:z.literal(false)});
export const checkedPreviewSchema=previewSchema.extend({simulation:z.object({approvalStatus:z.enum(["NOT_NEEDED","SUCCESS","FAILED"]),swapStatus:z.enum(["SUCCESS","FAILED"]),message:z.string(),checkedAt:z.string().datetime(),executionEnabled:z.literal(false)})});
export type Preview=z.infer<typeof checkedPreviewSchema>;
