import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
export class SubmissionTickets{
 private db:DatabaseSync;
 constructor(db:DatabaseSync){this.db=db;db.exec('CREATE TABLE IF NOT EXISTS submission_handoff_tickets(intent_id TEXT PRIMARY KEY,account TEXT NOT NULL,token_hash TEXT NOT NULL,created_at TEXT NOT NULL)');}
 issue(account:string,intentId:string,now:number){const ticket=randomBytes(32).toString('hex');this.db.prepare('INSERT INTO submission_handoff_tickets VALUES (?,?,?,?)').run(intentId,account,createHash('sha256').update(ticket).digest('hex'),new Date(now).toISOString());return ticket;}
 verifies(account:string,intentId:string,ticket:string){if(!/^[0-9a-f]{64}$/.test(ticket))return false;const row=this.db.prepare('SELECT token_hash FROM submission_handoff_tickets WHERE account=? AND intent_id=?').get(account,intentId);return !!row&&timingSafeEqual(Buffer.from(String(row.token_hash),'hex'),createHash('sha256').update(ticket).digest());}
}
