import {z} from 'zod';
// Safe to import in the browser; contains no credential or storage code.
export const delegationTools=['search_stock','get_stock','get_stock_research','get_stock_underlying','get_bell','get_bell_versions','compare_bell_versions','get_portfolio','get_portfolio_drift','get_receipt','explain_decision','preview_next_contribution','preview_rebalance','get_execution_status','create_bell_from_prompt','modify_bell_from_prompt','create_policy_from_prompt'] as const;
export const delegationRequestSchema=z.object({label:z.string().trim().min(1).max(60),tools:z.array(z.enum(delegationTools)).min(1).max(delegationTools.length).refine(values=>new Set(values).size===values.length)}).strict();
export const delegationChallengeSchema=delegationRequestSchema.extend({id:z.string().uuid(),audience:z.string().url(),expiresAt:z.string().datetime(),tokenLifetimeSeconds:z.literal(3600)}).strict();
export const delegationGrantSchema=delegationRequestSchema.extend({id:z.string().uuid(),audience:z.string().url(),createdAt:z.string().datetime(),expiresAt:z.string().datetime()}).strict();
