import type {AutopilotPlan,Flow,Policy} from './model.ts';
import {effectiveBellPolicy} from '../execution/rules.ts';
import {strategyAllowed} from './autopilot-math.ts';
export class StrategyVersionConflict extends Error {}
export function strategyAdvisory(latest:Flow,personal:Policy){const effectivePolicy=effectiveBellPolicy(latest,personal);return {...strategyAllowed(latest,effectivePolicy),effectivePolicy};}
export function checkStrategyAdoption(plan:AutopilotPlan|undefined,latest:Flow|undefined,personal:Policy,expected:{expectedPlanId:string;expectedBellId:string;expectedPinnedVersion:number;expectedCurrentVersion:number}){
 // latest must come from the trusted Flow store: its owner row is immutable.
 // A guest owner can link a wallet before publishing; an already named creator cannot change.
 const pinnedCreator=plan?.bell.creatorWallet?.toLowerCase();
 if(!plan||!latest||plan.id!==expected.expectedPlanId||plan.bell.id!==expected.expectedBellId||latest.id!==expected.expectedBellId||plan.bell.version!==expected.expectedPinnedVersion||latest.version!==expected.expectedCurrentVersion||latest.version<=plan.bell.version||(pinnedCreator!==undefined&&pinnedCreator!==latest.creatorWallet?.toLowerCase()))throw new StrategyVersionConflict('The selected plan, strategy versions or creator identity changed. Refresh and review the update again.');
 return strategyAdvisory(latest,personal);
}
export function strategyDiff(before:Flow,after:Flow){
 const tickers=[...new Set([...before.assets,...after.assets].map(asset=>asset.ticker))],fields=[...new Set([...Object.keys(before.policy??{}),...Object.keys(after.policy??{})])];
 return {assets:tickers.map(ticker=>({ticker,beforeBps:before.assets.find(asset=>asset.ticker===ticker)?.weightBps??0,afterBps:after.assets.find(asset=>asset.ticker===ticker)?.weightBps??0})),reserve:{beforeBps:before.reserveBps,afterBps:after.reserveBps},policy:fields.filter(field=>(before.policy as Record<string,unknown>|undefined)?.[field]!==(after.policy as Record<string,unknown>|undefined)?.[field]).map(field=>({field,before:(before.policy as Record<string,unknown>|undefined)?.[field]??null,after:(after.policy as Record<string,unknown>|undefined)?.[field]??null}))};
}
