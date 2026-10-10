import {createHash,randomBytes} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
function setup(db:DatabaseSync){db.exec('CREATE TABLE IF NOT EXISTS identity_sessions(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL,expires_at INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0)');}
export function createIdentitySession(db:DatabaseSync,account:string,now=Date.now()){
 setup(db);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO identity_sessions(token_hash,account_id,expires_at) VALUES (?,?,?)').run(digest(token),account,now+90*86400000);return token;
}
export function resolveIdentitySession(db:DatabaseSync,token:string,now=Date.now()){
 if(!/^[a-f0-9]{64}$/.test(token))return undefined;setup(db);const row=db.prepare('SELECT account_id FROM identity_sessions WHERE token_hash=? AND revoked=0 AND expires_at>?').get(digest(token),now);return row?String(row.account_id):undefined;
}
export function revokeIdentitySession(db:DatabaseSync,token:string){setup(db);db.prepare('UPDATE identity_sessions SET revoked=1 WHERE token_hash=?').run(digest(token));}

export type IdentitySessionSummary={activeSessions:number;currentExpiresAt:string};
function currentSession(db:DatabaseSync,token:string,linked:(account:string)=>boolean,now:number){
 if(!Number.isFinite(now)||!/^[a-f0-9]{64}$/.test(token))return undefined;
 const account=resolveIdentitySession(db,token,now);if(!account||!linked(account))return undefined;
 const row=db.prepare('SELECT expires_at FROM identity_sessions WHERE token_hash=? AND account_id=? AND revoked=0 AND expires_at>?').get(digest(token),account,now);
 return row?{account,expiresAt:Number(row.expires_at)}:undefined;
}
export function identitySessionSummary(db:DatabaseSync,token:string,linked:(account:string)=>boolean,now=Date.now()):IdentitySessionSummary|undefined{
 const session=currentSession(db,token,linked,now);if(!session)return undefined;
 const row=db.prepare('SELECT COUNT(*) AS total FROM identity_sessions WHERE account_id=? AND revoked=0 AND expires_at>?').get(session.account,now);
 return {activeSessions:Number(row?.total??0),currentExpiresAt:new Date(session.expiresAt).toISOString()};
}
export function revokeOtherIdentitySessions(db:DatabaseSync,token:string,linked:(account:string)=>boolean,now?:number){
 setup(db);db.exec('BEGIN IMMEDIATE');try{
  const checkedAt=now??Date.now();
  const session=currentSession(db,token,linked,checkedAt);if(!session)throw new Error('SESSION_REQUIRED');
  const result=db.prepare('UPDATE identity_sessions SET revoked=1 WHERE account_id=? AND token_hash<>? AND revoked=0 AND expires_at>?').run(session.account,digest(token),checkedAt);
  const summary=identitySessionSummary(db,token,linked,checkedAt);if(!summary)throw new Error('SESSION_REQUIRED');
  db.exec('COMMIT');return {...summary,revokedCount:Number(result.changes)};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
