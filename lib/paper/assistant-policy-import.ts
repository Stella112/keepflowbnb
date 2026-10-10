import {z} from 'zod';
import {policySchema,type Policy} from './model.ts';
import {draftPersonalPolicy} from './policy-draft.ts';
const field=z.enum(['maxTradeUsd','maxDailySpendUsd','maxWeeklySpendUsd','maxSingleAssetBps','minReserveBps','driftBps','maxSlippageBps','quoteMaxAgeSeconds','priceMaxAgeSeconds']);
const draft=z.object({policy:policySchema.strict(),explicitFields:z.array(field).min(1).max(9),provenance:z.object({method:z.literal('DETERMINISTIC_SUPPORTED_CLAUSES'),clauses:z.array(z.object({text:z.string().min(1).max(1000),field}).strict()).min(1).max(9)}).strict(),saved:z.literal(false),authorization:z.literal('NONE'),limitations:z.array(z.string().max(1000)).max(20)}).strict();
const result=z.object({draft,expectedPolicyVersion:z.number().int().nonnegative()}).strict();
export function importAssistantPolicy(text:string,current:Policy,version:number){
 if(new TextEncoder().encode(text).length>16384)throw Error('Draft exceeds 16 KB.');
 const parsed=z.union([result,z.object({result,executionAvailable:z.literal(false)}).strict()]).parse(JSON.parse(text)),value='result' in parsed?parsed.result:parsed;
 if(value.expectedPolicyVersion!==version)throw Error('Policy version changed. Request a fresh draft.');
 const rebuilt=draftPersonalPolicy(value.draft.provenance.clauses.map(clause=>clause.text).join('; '),current);
 if(JSON.stringify(rebuilt.explicitFields)!==JSON.stringify(value.draft.explicitFields)||JSON.stringify(rebuilt.provenance)!==JSON.stringify(value.draft.provenance))throw Error('Draft instructions do not match the stated fields.');
 for(const key of rebuilt.explicitFields)if(rebuilt.policy[key]!==value.draft.policy[key])throw Error('Draft values do not match its instructions.');
 return {draft:rebuilt,expectedPolicyVersion:version};
}
