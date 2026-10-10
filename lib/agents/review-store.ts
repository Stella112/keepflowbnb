import {createHash,randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {policySchema,type Flow,type Policy} from '../paper/model.ts';
import {effectiveBellPolicy} from '../execution/rules.ts';
import type {BellReviewReport} from './review-report.ts';
export type ReviewInput={requestId:string;bell:Flow;policy:Policy;policyVersion:number};
export type AgentReviewJob={id:string;requestId:string;status:'PENDING'|'RUNNING'|'COMPLETE'|'FAILED'|'CANCELLED';createdAt:string;finishedAt?:string;bell:{id:string;version:number;contentHash:string};policyVersion:number;report?:BellReviewReport;reason?:string};
type Work={job:AgentReviewJob;bell:Flow;policy:Policy;grant:string;owner:string;claim:string};
const deadline=180000,lease=30000;
export class AgentReviewStore{
 private db:DatabaseSync;private authorized:(owner:string,grant:string)=>boolean;private now:()=>number;
 constructor(db:DatabaseSync,authorized:(owner:string,grant:string)=>boolean,now:()=>number=Date.now){
  this.db=db;this.authorized=authorized;this.now=now;
  db.exec('CREATE TABLE IF NOT EXISTS agent_review_jobs(id TEXT PRIMARY KEY,owner TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,grant_hash TEXT NOT NULL,definition TEXT NOT NULL,policy TEXT NOT NULL,state TEXT NOT NULL,claim TEXT,claim_at INTEGER,UNIQUE(owner,request_id)); CREATE INDEX IF NOT EXISTS agent_review_pending ON agent_review_jobs(owner)');
  if(!db.prepare('PRAGMA table_info(agent_review_jobs)').all().some(row=>row.name==='claim_at'))db.exec('ALTER TABLE agent_review_jobs ADD COLUMN claim_at INTEGER');
 }
 private transaction<T>(fn:()=>T){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
 private row(owner:string,id:string){return this.db.prepare('SELECT * FROM agent_review_jobs WHERE owner=? AND id=?').get(owner,id);}
 private current(row:Record<string,unknown>){
  let job=JSON.parse(String(row.state)) as AgentReviewJob;
  if(['PENDING','RUNNING'].includes(job.status)){
   const authorized=this.authorized(String(row.owner),String(row.grant_hash)),created=Date.parse(job.createdAt);
   if(!authorized||!Number.isFinite(created)||created>this.now()||this.now()-created>=deadline){
    job={...job,status:authorized?'FAILED':'CANCELLED',finishedAt:new Date(this.now()).toISOString(),reason:authorized?'Review timed out. No payment or financial action occurred.':'The requesting sign-in session was revoked. No review was published.'};
    this.db.prepare("UPDATE agent_review_jobs SET state=? WHERE id=? AND json_extract(state,'$.status') IN ('PENDING','RUNNING')").run(JSON.stringify(job),String(row.id));
    const saved=this.row(String(row.owner),String(row.id));return saved?JSON.parse(String(saved.state)) as AgentReviewJob:undefined;
   }
  }
  return job;
 }
 read(owner:string,id:string){const row=this.row(owner,id);return row?this.current(row):undefined;}
 list(owner:string){return this.db.prepare("SELECT * FROM agent_review_jobs WHERE owner=? ORDER BY json_extract(state,'$.createdAt') DESC,id DESC LIMIT 50").all(owner).flatMap(row=>{const job=this.current(row);if(!job)return [];return [{id:job.id,status:job.status,createdAt:job.createdAt,finishedAt:job.finishedAt,bell:job.bell,policyVersion:job.policyVersion}];});}
 find(owner:string,requestId:string){const row=this.db.prepare('SELECT * FROM agent_review_jobs WHERE owner=? AND request_id=?').get(owner,requestId);return row?this.current(row):undefined;}
 admit(owner:string,grant:string,input:ReviewInput){return this.transaction(()=>{
  if(!this.authorized(owner,grant))throw Error('SESSION_REVOKED');
  const fingerprint=createHash('sha256').update(JSON.stringify({bellId:input.bell.id,bellVersion:input.bell.version,bellContentHash:input.bell.contentHash})).digest('hex');
  const existing=this.db.prepare('SELECT * FROM agent_review_jobs WHERE owner=? AND request_id=?').get(owner,input.requestId);
  if(existing){if(existing.fingerprint!==fingerprint)throw Error('REQUEST_CONFLICT');return {created:false,job:this.current(existing)!};}
  for(const row of this.db.prepare("SELECT * FROM agent_review_jobs WHERE json_extract(state,'$.status') IN ('PENDING','RUNNING')").all())this.current(row);
  const total=Number(this.db.prepare('SELECT COUNT(*) AS n FROM agent_review_jobs WHERE owner=?').get(owner)?.n);
  const pending=Number(this.db.prepare("SELECT COUNT(*) AS n FROM agent_review_jobs WHERE json_extract(state,'$.status') IN ('PENDING','RUNNING')").get()?.n);
  const owned=Number(this.db.prepare("SELECT COUNT(*) AS n FROM agent_review_jobs WHERE owner=? AND json_extract(state,'$.status') IN ('PENDING','RUNNING')").get(owner)?.n);
  if(total>=500||pending>=40||owned>=2)throw Error('QUEUE_LIMIT');
  const job:AgentReviewJob={id:randomUUID(),requestId:input.requestId,status:'PENDING',createdAt:new Date(this.now()).toISOString(),bell:{id:input.bell.id,version:input.bell.version,contentHash:input.bell.contentHash},policyVersion:input.policyVersion};
  this.db.prepare('INSERT INTO agent_review_jobs(id,owner,request_id,fingerprint,grant_hash,definition,policy,state) VALUES (?,?,?,?,?,?,?,?)').run(job.id,owner,input.requestId,fingerprint,grant,JSON.stringify(input.bell),JSON.stringify(input.policy),JSON.stringify(job));return {created:true,job};
 });}
 claim(owner:string,id:string):Work|undefined{return this.transaction(()=>{
  const row=this.row(owner,id);if(!row)return;const job=this.current(row);if(!job||!['PENDING','RUNNING'].includes(job.status))return;
  if(job.status==='RUNNING'&&row.claim_at!==null&&this.now()-Number(row.claim_at)<lease)return;
  const claim=randomUUID(),running={...job,status:'RUNNING' as const};
  this.db.prepare('UPDATE agent_review_jobs SET state=?,claim=?,claim_at=? WHERE id=?').run(JSON.stringify(running),claim,this.now(),id);
  return {job:running,bell:JSON.parse(String(row.definition)) as Flow,policy:JSON.parse(String(row.policy)) as Policy,grant:String(row.grant_hash),owner,claim};
 });}
 valid(work:Work){const row=this.row(work.owner,work.job.id);return !!row&&row.claim===work.claim&&row.claim_at!==null&&this.now()-Number(row.claim_at)<lease&&this.current(row)?.status==='RUNNING'&&this.authorized(work.owner,work.grant);}
 finish(work:Work,report?:BellReviewReport){return this.transaction(()=>{
  if(!this.valid(work))return false;
  const captured=this.row(work.owner,work.job.id)!,job=JSON.parse(String(captured.state)) as AgentReviewJob,bell=JSON.parse(String(captured.definition)) as Flow,policy=JSON.parse(String(captured.policy)) as Policy;
  if(report&&(report.bell.id!==job.bell.id||report.bell.version!==job.bell.version||report.bell.contentHash!==job.bell.contentHash||report.bell.title!==bell.title||report.policyVersion!==job.policyVersion||JSON.stringify(policySchema.parse(report.personalPolicy))!==JSON.stringify(policySchema.parse(policy))||JSON.stringify(policySchema.parse(report.effectivePolicy))!==JSON.stringify(policySchema.parse(effectiveBellPolicy(bell,policy)))||Buffer.byteLength(JSON.stringify(report))>131072))throw Error('REPORT_MISMATCH');
  const next:AgentReviewJob={...job,status:report?'COMPLETE':'FAILED',finishedAt:new Date(this.now()).toISOString(),...(report?{report}:{reason:'Sourced data could not be verified. Nothing was paid, saved or traded.'})};
  return this.db.prepare("UPDATE agent_review_jobs SET state=? WHERE id=? AND owner=? AND claim=? AND json_extract(state,'$.status')='RUNNING'").run(JSON.stringify(next),work.job.id,work.owner,work.claim).changes===1;
 });}
 cancel(owner:string,id:string){return this.transaction(()=>{const job=this.read(owner,id);if(!job)return undefined;if(['PENDING','RUNNING'].includes(job.status)){const next={...job,status:'CANCELLED' as const,finishedAt:new Date(this.now()).toISOString(),reason:'Review cancelled. No payment, saving or financial action occurred.'};this.db.prepare('UPDATE agent_review_jobs SET state=? WHERE id=? AND owner=?').run(JSON.stringify(next),id,owner);return next;}return job;});}
}
