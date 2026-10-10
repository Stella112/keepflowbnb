import {createHash} from "node:crypto";
import type {DatabaseSync} from "node:sqlite";
import type {Intent} from "./model.ts";
const terminal=new Set(["BLOCKED","CONFIRMED","REVERTED","UNVERIFIED"]);
export function intentFingerprint(input:unknown){return createHash("sha256").update(JSON.stringify(input)).digest("hex");}
export class IntentStore{
 private db:DatabaseSync;
 constructor(db:DatabaseSync){this.db=db;db.exec("CREATE TABLE IF NOT EXISTS transaction_intents(id TEXT PRIMARY KEY,owner TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,state TEXT NOT NULL,UNIQUE(owner,request_id)); CREATE TABLE IF NOT EXISTS transaction_intent_events(intent_id TEXT NOT NULL,revision INTEGER NOT NULL,event TEXT NOT NULL,PRIMARY KEY(intent_id,revision)); CREATE TABLE IF NOT EXISTS intent_transaction_hashes(chain_id INTEGER NOT NULL,hash TEXT NOT NULL,intent_id TEXT NOT NULL,PRIMARY KEY(chain_id,hash)); CREATE UNIQUE INDEX IF NOT EXISTS intent_single_observed_hash ON intent_transaction_hashes(intent_id)");}
 read(owner:string,id:string){const row=this.db.prepare("SELECT state FROM transaction_intents WHERE owner=? AND id=?").get(owner,id);return row?JSON.parse(String(row.state)) as Intent:undefined;}
 find(owner:string,requestId:string){const row=this.db.prepare("SELECT fingerprint,state FROM transaction_intents WHERE owner=? AND request_id=?").get(owner,requestId);return row?{fingerprint:String(row.fingerprint),intent:JSON.parse(String(row.state)) as Intent}:undefined;}
 expirePreparation(owner:string,id:string){const intent=this.read(owner,id);if(intent?.status==="PREPARING"&&Date.now()-Date.parse(intent.createdAt)>300_000)this.update(owner,intent,{...intent,revision:intent.revision+1,status:"BLOCKED",reason:"Read-only preparation was interrupted or timed out. No signing or submission path exists. Start a new preparation."});return this.read(owner,id);}
 events(owner:string,id:string){if(!this.read(owner,id))return undefined;return this.db.prepare("SELECT event FROM transaction_intent_events WHERE intent_id=? ORDER BY revision").all(id).map(row=>JSON.parse(String(row.event)) as Intent);}
 admit(owner:string,fingerprint:string,intent:Intent){this.db.exec("BEGIN IMMEDIATE");try{const existing=this.find(owner,intent.requestId);if(existing){this.db.exec("COMMIT");return {created:false,...existing};}this.db.prepare("INSERT INTO transaction_intents VALUES (?,?,?,?,?)").run(intent.id,owner,intent.requestId,fingerprint,JSON.stringify(intent));this.db.prepare("INSERT INTO transaction_intent_events VALUES (?,?,?)").run(intent.id,0,JSON.stringify(intent));this.db.exec("COMMIT");return {created:true,fingerprint,intent};}catch(error){this.db.exec("ROLLBACK");throw error;}}
 update(owner:string,expected:Intent,next:Intent){
  if(next.id!==expected.id||next.requestId!==expected.requestId||next.wallet!==expected.wallet||next.createdAt!==expected.createdAt||JSON.stringify(next.input)!==JSON.stringify(expected.input)||next.executionAvailable!==false||next.revision!==expected.revision+1||terminal.has(expected.status))return false;
  // Once prepared, the quote, approval and transaction cannot be rewritten.
  for(const key of ["quote","transaction","approval","policy","policySnapshot","walletSnapshot","simulation"] as const)if(expected[key]!==undefined&&JSON.stringify(next[key])!==JSON.stringify(expected[key]))return false;
  if(expected.reconciliation&&["PENDING","CONFIRMED","REVERTED","UNVERIFIED"].includes(expected.reconciliation.status)&&next.reconciliation?.hash.toLowerCase()!==expected.reconciliation.hash.toLowerCase())return false;
  const allowed=expected.status==="PREPARING"?["BLOCKED","READY_READ_ONLY"]:["UNKNOWN","PENDING","CONFIRMED","REVERTED","UNVERIFIED"];
  if(!allowed.includes(next.status))return false;
  this.db.exec("BEGIN IMMEDIATE");try{
   const current=this.read(owner,expected.id);if(!current||current.revision!==expected.revision){this.db.exec("COMMIT");return false;}
   const observed=this.db.prepare("SELECT hash FROM intent_transaction_hashes WHERE chain_id=56 AND intent_id=? LIMIT 1").get(next.id);
   if(observed&&next.reconciliation?.hash.toLowerCase()!==String(observed.hash)){this.db.exec("COMMIT");return false;}
   if(next.reconciliation&&next.reconciliation.status!=="UNKNOWN"){
    const hash=next.reconciliation.hash.toLowerCase(),bound=this.db.prepare("SELECT intent_id FROM intent_transaction_hashes WHERE chain_id=56 AND hash=?").get(hash);
    if(bound&&bound.intent_id!==next.id){this.db.exec("COMMIT");return false;}
    this.db.prepare("INSERT OR IGNORE INTO intent_transaction_hashes VALUES (56,?,?)").run(hash,next.id);
   }
   const changed=this.db.prepare("UPDATE transaction_intents SET state=? WHERE owner=? AND id=? AND json_extract(state,'$.revision')=?").run(JSON.stringify(next),owner,next.id,expected.revision).changes===1;if(changed)this.db.prepare("INSERT INTO transaction_intent_events VALUES (?,?,?)").run(next.id,next.revision,JSON.stringify(next));this.db.exec("COMMIT");return changed;
  }catch(error){this.db.exec("ROLLBACK");throw error;}
 }
}
