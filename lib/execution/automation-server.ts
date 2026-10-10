import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {cookies} from 'next/headers';
import {z} from 'zod';
import {getBell,ownedBellIds,readAccount,paperDatabase,linkedWallet} from '../paper/store';
import {walletPortfolio} from './portfolio';
import {effectiveBellPolicy,quotePolicy} from './rules';
import {toUnits} from '../binance/amounts';
import {getDiscovery} from '../binance/rwa';
import {prepareIntent} from './intents/server';
import {AutomationStore,type LivePlan} from './automation';
import {AutomationAuthorityStore} from './automation-authority';
import {existingCashAutomationPlan} from './automation-readonly-plan';
export const automationCreateSchema=z.object({action:z.literal('CREATE_READ_ONLY'),requestId:z.string().uuid(),bellId:z.string().min(1).max(80),bellVersion:z.number().int().positive(),bellHash:z.string().min(1).max(100),policyVersion:z.number().int().nonnegative(),maxRunUsd:z.string().regex(/^\d+(\.\d{1,6})?$/).max(16),cadence:z.enum(['DAILY','WEEKLY']),weekday:z.number().int().min(0).max(6)}).strict();
function authorityStore(){const db=paperDatabase();return new AutomationAuthorityStore(db,(owner,wallet,hash,now)=>linkedWallet(owner)?.toLowerCase()===wallet&&!!db.prepare('SELECT account_id FROM identity_sessions WHERE token_hash=? AND account_id=? AND revoked=0 AND expires_at>?').get(hash,owner,now));}
function pins(owner:string,plan:Pick<LivePlan,'bellId'|'bellVersion'|'bellHash'|'policyVersion'>){const bell=getBell(plan.bellId);return !!bell&&ownedBellIds(owner).includes(bell.id)&&bell.version===plan.bellVersion&&bell.contentHash===plan.bellHash&&(readAccount(owner).policyVersion??0)===plan.policyVersion;}
function view(plan:LivePlan,authorized:boolean){const {account,authorizationId,...publicPlan}=plan;return {...publicPlan,mode:'READ_ONLY',financialAuthorization:'NONE',executionAvailable:false,authorityActive:authorized};}
export function listReadOnlyAutomation(owner:string){const authorities=authorityStore();return {mode:'READ_ONLY',executionAvailable:false,liveAutomationAvailable:false,plans:authorities.list(owner).map(plan=>view(plan,authorities.authorized(plan,Date.now())))};}
export function readOnlyAutomationHistory(owner:string,id:string){return {mode:'READ_ONLY',executionAvailable:false,runs:authorityStore().history(owner,id)};}
export async function createReadOnlyAutomation(owner:string,wallet:string,value:z.infer<typeof automationCreateSchema>){const token=(await cookies()).get('firstbell-identity')?.value;if(!token||!/^[0-9a-f]{64}$/.test(token))throw Error('SESSION_REQUIRED');const amount=toUnits(value.maxRunUsd,6);if(amount<=0n||amount>100_000_000n)throw Error('USE_UP_TO_100_USDT');const {action,...input}=value;const authorities=authorityStore(),plan=authorities.create({...input,account:owner,wallet,sessionHash:createHash('sha256').update(token).digest('hex')},Date.now(),()=>pins(owner,{bellId:input.bellId,bellVersion:input.bellVersion,bellHash:input.bellHash,policyVersion:input.policyVersion}));return view(plan,authorities.authorized(plan,Date.now()));}
export function changeReadOnlyAutomation(owner:string,id:string,action:'ENABLE_READ_ONLY'|'PAUSE'|'REVOKE'){const authorities=authorityStore(),plan=authorities.change(owner,id,action,Date.now());return view(plan,authorities.authorized(plan,Date.now()));}
// Production due checker uses actual existing cash. It never invents a deposit and
// never calls live submit/agent signing, even when operator execution flags are enabled.
export async function runReadOnlyAutomation(owner:string,id:string){const store=new AutomationStore(paperDatabase()),authorities=authorityStore(),claimed=store.claim(owner,id,Date.now());if(!claimed)return undefined;const {plan,record}=claimed,ids:string[]=[];
 const valid=()=>store.read(owner,id)?.enabled===true&&authorities.authorized(plan,Date.now())&&pins(owner,plan);
 try{if(!valid())return store.finish(record,'SKIPPED','Read-only authority expired, revoked, paused or captured strategy/rules changed.');const bell=getBell(plan.bellId)!,personal=readAccount(owner).policy,policy=effectiveBellPolicy(bell,personal),snapshot=await walletPortfolio(plan.wallet),market=await getDiscovery();
  if(!valid()||!quotePolicy(policy,market.fetchedAt,snapshot.marketFetchedAt,50).allowed)throw Error('STALE_OR_CHANGED');
  const allocation=existingCashAutomationPlan(snapshot,bell,personal,plan.maxRunUsd);
  for(const asset of allocation.allocations){if(!valid())throw Error('AUTHORIZATION_CHANGED');const candidates=market.tokens.filter(token=>token.underlyingTicker===asset.ticker&&token.binanceChainId==='56'&&[1,3].includes(token.assetType??-1)&&token.statusInfo.openState),selected=candidates.find(token=>token.platformId==='bstock')??candidates[0];if(!selected)continue;
   const requestId=randomUUID(),intent=await prepareIntent(owner,plan.wallet,{requestId,ticker:asset.ticker,provider:selected.platformId,amount:asset.amount});ids.push(intent.id);if(!valid()||intent.status!=='READY_READ_ONLY')break;
  }
  return store.finish(record,'SKIPPED',ids.length?'Actual-cash read-only intents prepared. No signature, budget reservation, deposit or submission occurred. Live daily/weekly remaining usage is not verified by this advisory checker.':'No actual-cash purchase fits the captured Flow and personal rules.',ids);
 }catch{return store.finish(record,'SKIPPED','Read-only preparation could not be verified. No spending or submission occurred.',ids);}
}
export async function runDueReadOnlyAutomation(){const authorities=authorityStore(),db=paperDatabase(),rows=db.prepare("SELECT id,account FROM live_automation_plans WHERE json_extract(payload,'$.enabled')=1 AND json_extract(payload,'$.nextRunAt')<=? ORDER BY json_extract(payload,'$.nextRunAt') LIMIT 50").all(new Date().toISOString());const results=[];for(const row of rows){const plan=new AutomationStore(db).read(String(row.account),String(row.id));if(plan?.enabled&&authorities.authorized(plan,Date.now())&&Date.parse(plan.nextRunAt)<=Date.now())results.push(await runReadOnlyAutomation(String(row.account),String(row.id)));}return results;}


