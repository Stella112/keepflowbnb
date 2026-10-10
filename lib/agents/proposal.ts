import {z} from 'zod';
import {draftFromPrompt} from '../research/draft.ts';
import {policySchema} from '../paper/model.ts';
import type {BellReviewReport} from './review-report.ts';

const source='https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data';
/** Captured facts constrain explicit user instructions; they do not select investments. */
export function proposalFromReview(report:BellReviewReport,prompt:string,now=Date.now()){
 if(!Number.isFinite(now)||report.kind!=='SOURCED_FACTUAL_REVIEW'||report.saved!==false||report.executionEnabled!==false||report.paymentSubmitted!==false||report.analystResearchAvailable!==false)throw Error('A completed factual review is required.');
 z.object({id:z.string().min(1).max(80),version:z.number().int().positive(),contentHash:z.string().regex(/^[a-f0-9]{64}$/),title:z.string().min(1).max(80)}).strict().parse(report.bell);
 z.number().int().nonnegative().parse(report.policyVersion);
 const policy=policySchema.parse(report.effectivePolicy);policySchema.parse(report.personalPolicy);
 const created=z.iso.datetime({offset:true}).parse(report.createdAt),createdTime=Date.parse(created);
 if(createdTime>now||now-createdTime>120000)throw Error('Review is stale. Request a fresh sourced review.');
 const seen=new Set<string>();const times:number[]=[];
 for(const brief of report.briefs){
  const time=Date.parse(z.iso.datetime({offset:true}).parse(brief.source.fetchedAt));
  if(brief.status!=='FACTUAL_DATA_ONLY'||brief.source.name!=='Binance RWA discovery'||brief.source.url!==source||brief.analystResearchAvailable!==false||brief.paidProviderConfigured!==false||time>createdTime||now-time>120000||seen.has(brief.ticker)||!brief.representations.length||brief.representations.some(rep=>rep.chainId!==56||!/^0x[0-9a-fA-F]{40}$/.test(rep.contract)))throw Error('Captured stock sources are invalid or stale.');
  seen.add(brief.ticker);times.push(time);
 }
 if(!seen.size)throw Error('Captured stock sources are missing.');
 const draft=draftFromPrompt({prompt},[...seen]);
 if(draft.warnings.some(value=>value.startsWith('No reserve specified:')))throw Error('Specify your cash reserve explicitly before preparing a proposal.');
 if(draft.definition.assets.some(asset=>asset.weightBps>policy.maxSingleAssetBps)||draft.definition.reserveBps<policy.minReserveBps)throw Error('Draft violates the captured exposure or reserve rules. Adjust your instructions.');
 return {importDraft:{draft,source:'Binance RWA discovery' as const,fetchedAt:new Date(Math.min(...times)).toISOString(),saved:false as const,originalBellId:null},provenance:{bell:{...report.bell},policyVersion:report.policyVersion,reviewCreatedAt:created,sourceUrls:[source],sourceFetchedAt:report.briefs.map(brief=>({ticker:brief.ticker,fetchedAt:brief.source.fetchedAt}))},method:'USER_DIRECTED_FACTUAL_DRAFT' as const,executionEnabled:false as const,limitations:['Allocations come only from your explicit instructions; no analyst or AI stock selection was performed.','Captured policy and stock sources are checked, but current holdings, spend usage and executable quotes are not.','Import into the editor, review current conditions and save separately. No permissions change.']};
}
