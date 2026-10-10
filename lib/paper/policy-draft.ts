import {policySchema,type Policy} from './model.ts';
import {toUnits} from '../binance/amounts.ts';
export type PersonalPolicyDraft={policy:Policy;explicitFields:(keyof Policy)[];provenance:{method:'DETERMINISTIC_SUPPORTED_CLAUSES';clauses:{text:string;field:keyof Policy}[]};saved:false;authorization:'NONE';limitations:string[]};
export function draftPersonalPolicy(prompt:string,current:Policy):PersonalPolicyDraft{
 if(prompt.length>1000||!prompt.trim())throw new Error('Enter between 1 and 1000 characters.');
 const policy=policySchema.parse({...current}),clauses=prompt.trim().split(/\s*(?:,|;|\band\b)\s*/i),fields=new Set<keyof Policy>(),provenance:{text:string;field:keyof Policy}[]=[];
 const rules:[RegExp,keyof Policy,'usd'|'percent'|'integer'][]=[
  [/^(?:maximum|max|cap) trade(?: at)? (\d+(?:\.\d{1,6})?) (?:usd|usdt|dollars)$/i,'maxTradeUsd','usd'],
  [/^(?:maximum|max) daily spend (\d+(?:\.\d{1,6})?) (?:usd|usdt|dollars)$/i,'maxDailySpendUsd','usd'],
  [/^(?:maximum|max) weekly spend (\d+(?:\.\d{1,6})?) (?:usd|usdt|dollars)$/i,'maxWeeklySpendUsd','usd'],
  [/^(?:cap one stock at|maximum company exposure|maximum single holding) (\d+(?:\.\d{1,2})?)%$/i,'maxSingleAssetBps','percent'],
  [/^(?:reserve|minimum reserve|keep) (\d+(?:\.\d{1,2})?)%(?: in (?:usdt|cash))?$/i,'minReserveBps','percent'],
  [/^(?:maximum|max) slippage (\d+) (?:bps|basis points)$/i,'maxSlippageBps','integer'],
  [/^(?:maximum|max) quote age (\d+) seconds?$/i,'quoteMaxAgeSeconds','integer'],
  [/^(?:maximum|max) price age (\d+) seconds?$/i,'priceMaxAgeSeconds','integer'],
 ];
 for(const clause of clauses){
  let matched=false;
  for(const [pattern,field,kind] of rules){const match=clause.match(pattern);if(!match)continue;if(fields.has(field))throw new Error('Each rule may be specified only once; conflicting or repeated clauses are ambiguous.');
   const value=kind==='usd'?match[1]:kind==='percent'?Number(toUnits(match[1],2)):Number(match[1]);
   if(kind==='usd'){const units=toUnits(String(value),6);if(field==='maxTradeUsd'&&(units<=0n||units>1_000_000_000n))throw new Error('Maximum trade must be above zero and at most 1000 USD.');if(field!=='maxTradeUsd'&&units>10_000_000_000n)throw new Error('Period spending caps must be between zero and 10000 USD.');}
   Object.assign(policy,{[field]:value});fields.add(field);provenance.push({text:clause,field});matched=true;break;
  }
  if(!matched)throw new Error(`Unsupported clause: ${clause.slice(0,120)}. Use only trade, period spending, exposure, reserve, slippage or freshness limits. Money movement and automatic selling cannot be requested here.`);
 }
 return {policy:policySchema.parse(policy),explicitFields:[...fields],provenance:{method:'DETERMINISTIC_SUPPORTED_CLAUSES',clauses:provenance},saved:false,authorization:'NONE',limitations:['This limited parser is not an AI model or investment research.','Unspecified fields retain the supplied current policy. Review and save separately with the current policy version.','No money movement, automatic selling, wallet permission or scheduling is authorized.','Daily and weekly limits apply to paper purchases in WAT calendar periods. Live spending is disabled. Paper fills do not model actual route slippage.']};
}
