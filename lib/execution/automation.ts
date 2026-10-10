import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import {nextPaperRun} from '../paper/autopilot-math.ts';

const planSchema=z.object({id:z.string().uuid(),account:z.string().min(1).max(100),wallet:z.string().regex(/^0x[0-9a-f]{40}$/),bellId:z.string().min(1).max(80),bellVersion:z.number().int().positive(),bellHash:z.string().min(1).max(100),policyVersion:z.number().int().nonnegative(),authorizationId:z.string().min(1).max(100),authorizationExpiresAt:z.iso.datetime(),maxRunUsd:z.string().regex(/^\d+(\.\d{1,6})?$/).max(16),cadence:z.enum(['DAILY','WEEKLY']),weekday:z.number().int().min(0).max(6),nextRunAt:z.iso.datetime(),enabled:z.boolean()}).strict();
export type LivePlan=z.infer<typeof planSchema>;
export type LiveRun={key:string;planId:string;account:string;scheduledFor:string;state:'CLAIMED'|'SKIPPED'|'PENDING'|'UNKNOWN';reason:string;intentIds:string[]};
// A claimed run has no retry lease. A process crash must be reconciled, not spent again.
export class AutomationStore{
 private db:DatabaseSync;
 constructor(db:DatabaseSync){this.db=db;db.exec('CREATE TABLE IF NOT EXISTS live_automation_plans(id TEXT PRIMARY KEY,account TEXT NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS live_automation_runs(key TEXT PRIMARY KEY,plan_id TEXT NOT NULL,account TEXT NOT NULL,payload TEXT NOT NULL)');}
 create(value:LivePlan){const plan=planSchema.parse(value);this.db.prepare('INSERT INTO live_automation_plans VALUES (?,?,?)').run(plan.id,plan.account,JSON.stringify(plan));return plan;}
 read(account:string,id:string):LivePlan|undefined{const row=this.db.prepare('SELECT payload FROM live_automation_plans WHERE id=? AND account=?').get(id,account);return row?planSchema.parse(JSON.parse(String(row.payload))):undefined;}
 pause(account:string,id:string){const plan=this.read(account,id);if(!plan)throw Error('PLAN_NOT_FOUND');plan.enabled=false;this.db.prepare('UPDATE live_automation_plans SET payload=? WHERE id=? AND account=?').run(JSON.stringify(plan),id,account);}
 run(account:string,key:string):LiveRun|undefined{const row=this.db.prepare('SELECT payload FROM live_automation_runs WHERE key=? AND account=?').get(key,account);return row?JSON.parse(String(row.payload)):undefined;}
 claim(account:string,id:string,now:number){this.db.exec('BEGIN IMMEDIATE');try{const plan=this.read(account,id);if(!plan||!plan.enabled||Date.parse(plan.nextRunAt)>now){this.db.exec('COMMIT');return undefined;}const key=createHash('sha256').update(`${id}:${plan.nextRunAt}`).digest('hex');const prior=this.run(account,key);if(prior){this.db.exec('COMMIT');return undefined;}
 const record:LiveRun={key,planId:id,account,scheduledFor:plan.nextRunAt,state:'CLAIMED',reason:'Run claimed before external work.',intentIds:[]};this.db.prepare('INSERT INTO live_automation_runs VALUES (?,?,?,?)').run(key,id,account,JSON.stringify(record));
 // Advance from now, never charge for missed periods.
 plan.nextRunAt=nextPaperRun(new Date(now).toISOString(),plan.cadence,plan.weekday);this.db.prepare('UPDATE live_automation_plans SET payload=? WHERE id=?').run(JSON.stringify(plan),id);this.db.exec('COMMIT');return {plan,record};}catch(error){this.db.exec('ROLLBACK');throw error;}}
 finish(record:LiveRun,state:LiveRun['state'],reason:string,intentIds:string[]=[]){this.db.exec('BEGIN IMMEDIATE');try{const previous=this.run(record.account,record.key);if(previous?.state!=='CLAIMED')throw Error('RUN_ALREADY_FINISHED');const next={...previous,state,reason,intentIds};this.db.prepare('UPDATE live_automation_runs SET payload=? WHERE key=?').run(JSON.stringify(next),record.key);this.db.exec('COMMIT');return next;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
export type AutomationDependencies={enabled?:boolean;store:AutomationStore;now?:()=>number;
 // Must resolve revocable authority and pinned Flow/current policy from server state.
 authorize:(plan:Readonly<LivePlan>)=>Promise<boolean>;
 // This planner must use existing on-chain cash, never a fictional contribution/deposit.
 prepare:(plan:Readonly<LivePlan>,runKey:string)=>Promise<{intentId:string;amountMicros:string}[]>;
 // Each leg uses the guarded submission service with its own fresh simulation and budget hold.
 submit:(plan:Readonly<LivePlan>,intentId:string)=>Promise<{state:string}>;
};
function micros(value:string){const [whole,fraction='']=value.split('.');return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));}
export async function runLiveAutomation(account:string,id:string,deps:AutomationDependencies){
 if(deps.enabled!==true)throw Error('EXECUTION_DISABLED');const now=deps.now??Date.now,claim=deps.store.claim(account,id,now());if(!claim)return undefined;const {plan,record}=claim;let started=false;const ids:string[]=[];
 const authorized=async()=>{const current=deps.store.read(account,id);return current?.enabled===true&&Date.parse(plan.authorizationExpiresAt)>now()&&await deps.authorize(Object.freeze(structuredClone(plan)));};
 try{if(!await authorized())return deps.store.finish(record,'SKIPPED','Authorization is expired, revoked or changed.');const legs=await deps.prepare(Object.freeze(structuredClone(plan)),record.key);
 if(legs.length>8||new Set(legs.map(l=>l.intentId)).size!==legs.length||legs.some(l=>!l.intentId||!/^\d+$/.test(l.amountMicros)||BigInt(l.amountMicros)<=0n)||legs.reduce((sum,l)=>sum+BigInt(l.amountMicros),0n)>micros(plan.maxRunUsd))throw Error('RUN_CAP');
 if(!legs.length)return deps.store.finish(record,'SKIPPED','No policy-compliant purchase is due.');
 for(const leg of legs){if(!await authorized())return deps.store.finish(record,started?'PENDING':'SKIPPED','Automation paused or authority changed before the next leg.',ids);started=true;ids.push(leg.intentId);const result=await deps.submit(Object.freeze(structuredClone(plan)),leg.intentId);if(!['PENDING','CONFIRMED'].includes(result.state))return deps.store.finish(record,'UNKNOWN','A leg requires reconciliation; remaining purchases stopped.',ids);}
 return deps.store.finish(record,'PENDING','Submitted legs require chain reconciliation.',ids);
 }catch{return deps.store.finish(record,started?'UNKNOWN':'SKIPPED',started?'Submission outcome needs reconciliation; spending will not be retried.':'Preparation failed before any submission.',ids);}
}
