import {z} from 'zod';
import {bellInputSchema} from '../../lib/paper/model.ts';
const envelope=z.object({draft:z.object({definition:bellInputSchema,requestedAmountUsdt:z.string().max(100).nullable(),policySuggestions:z.object({maxSingleAssetBps:z.number().int().min(0).max(10000).nullable(),automaticSelling:z.literal(false).nullable()}).strict(),method:z.literal('DETERMINISTIC_PARSER'),warnings:z.array(z.string().max(1000)).max(20)}).strict(),source:z.literal('Binance RWA discovery'),fetchedAt:z.iso.datetime({offset:true}),saved:z.literal(false),originalBellId:z.string().min(1).max(80).nullable()}).strict();
export function parseAssistantDraft(text:string,editingBellId?:string){
 if(new TextEncoder().encode(text).length>16384)throw Error('Draft exceeds 16 KB.');
 const parsed=z.union([envelope,z.object({result:envelope,executionAvailable:z.literal(false)}).strict()]).parse(JSON.parse(text));
 const value='result' in parsed?parsed.result:parsed;
 if(value.originalBellId!==null&&value.originalBellId!==editingBellId)throw Error('Open the matching owned Flow editor before importing a modification draft.');
 if(editingBellId&&value.originalBellId!==editingBellId)throw Error('Use a modification draft for this Flow.');
 if(value.draft.definition.forkedFromId)throw Error('Draft cannot replace editor provenance.');
 return value;
}
