import {z} from "zod";
import {curatedTickers} from "../binance/rwa-schemas.ts";
export const usdSchema=z.string().regex(/^\d+(\.\d{1,6})?$/).max(16);
export const assetSchema=z.object({ticker:z.enum(curatedTickers),weightBps:z.number().int().min(1).max(10000)});
const boundedTrade=usdSchema.refine(value=>Number(value)>0&&Number(value)<=1000,"Trade cap must be between 0 and 1000 USD.");
export const spendCapSchema=usdSchema.refine(value=>Number(value)<=10000,"Paper period cap must be at most 10000 USD.");
export const bellPolicySchema=z.object({maxTradeUsd:boundedTrade.optional(),maxDailySpendUsd:spendCapSchema.optional(),maxWeeklySpendUsd:spendCapSchema.optional(),maxSingleAssetBps:z.number().int().min(100).max(10000).optional(),minReserveBps:z.number().int().min(0).max(9000).optional(),maxSlippageBps:z.number().int().min(1).max(500).optional(),quoteMaxAgeSeconds:z.number().int().min(1).max(60).optional(),priceMaxAgeSeconds:z.number().int().min(1).max(300).optional(),allowAutomaticSelling:z.literal(false).optional(),contributionFirst:z.literal(true).optional()}).strict();
export type BellPolicy=z.infer<typeof bellPolicySchema>;
export const bellInputSchema=z.object({title:z.string().trim().min(2).max(80),description:z.string().trim().max(500),assets:z.array(assetSchema).min(1).max(8),reserveBps:z.number().int().min(0).max(9000),policy:bellPolicySchema.optional(),forkedFromId:z.string().max(80).optional()}).strict().refine(b=>new Set(b.assets.map(a=>a.ticker)).size===b.assets.length&&b.assets.reduce((n,a)=>n+a.weightBps,0)+b.reserveBps===10000,"Weights including the cash reserve must total 100%.");
export type BellInput=z.infer<typeof bellInputSchema>;
export type Flow=BellInput & {id:string;version:number;contentHash:string;createdAt:string;example:boolean;creatorWallet?:string;schemaVersion?:1;slug?:string;visibility?:"PUBLIC";publishedAt?:string;forkedFromVersion?:number};
export const policySchema=z.object({maxTradeUsd:usdSchema,maxDailySpendUsd:spendCapSchema.optional(),maxWeeklySpendUsd:spendCapSchema.optional(),maxSingleAssetBps:z.number().int().min(100).max(10000),minReserveBps:z.number().int().min(0).max(9000),driftBps:z.number().int().min(0).max(5000),maxSlippageBps:z.number().int().min(1).max(500).optional(),quoteMaxAgeSeconds:z.number().int().min(1).max(60).optional(),priceMaxAgeSeconds:z.number().int().min(1).max(300).optional()}).strict();
export type Policy=z.infer<typeof policySchema>;
export const defaultPolicy:Policy={maxTradeUsd:"100",maxSingleAssetBps:4000,minReserveBps:1000,driftBps:500};
export type Position={ticker:string;name:string;provider:string;address:string;symbol:string;decimals:number;ratio:string;quantity:string;costMicros:string};
export type Leg={ticker:string;provider:string|null;amountUsd:string;status:"PAPER_FILLED"|"FAILED"|"BLOCKED"|"NOT_STARTED";reason:string;quantity?:string;priceUsd?:string;tokenSymbol?:string;address?:string;marketFetchedAt?:string;policy:"ALLOWED"|"BLOCKED"|"NOT_CHECKED"};
export type Receipt={id:string;requestId:string;fingerprint:string;mode:"PAPER";action:"BUY"|"SELL"|"BASKET"|"AUTOPILOT"|"STRATEGY_UPDATE";bellId?:string;bellVersion?:number;bellContentHash?:string;cashAfterUsd?:string;policySnapshot?:Policy;effectivePolicySnapshot?:Policy;planId?:string;scheduledFor?:string;contributionUsd?:string;status:"PAPER_FILLED"|"PARTIAL"|"FAILED"|"BLOCKED"|"SKIPPED"|"ADOPTED";reason:string;legs:Leg[];createdAt:string;transactionHash:null;simulation:"NOT_RUN_PAPER_MODE"};
export const autopilotInputSchema=z.object({bellId:z.string().min(1).max(80),contributionUsd:usdSchema,cadence:z.enum(["DAILY","WEEKLY"]),weekday:z.number().int().min(0).max(6),maxTradeUsd:usdSchema}).strict();
export type AutopilotPlan={id:string;bell:Flow;contributionUsd:string;cadence:"DAILY"|"WEEKLY";weekday:number;maxTradeUsd:string;enabled:boolean;nextRunAt:string;lastRunAt?:string;lastReceiptId?:string;createdAt:string};
export type PolicyMutation={requestId:string;fingerprint:string;result:{saved:true;policyVersion:number}};
export type Account={paperSpendBudget?:{day:string;week:string;dailyMicros:string;weeklyMicros:string};cashMicros:string;positions:Position[];receipts:Receipt[];policy:Policy;policyVersion?:number;policyMutations?:PolicyMutation[];autopilot?:AutopilotPlan};
export function newAccount():Account{return {cashMicros:"10000000000",positions:[],receipts:[],policy:{...defaultPolicy}};}


