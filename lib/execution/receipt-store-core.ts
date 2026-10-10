import type {DatabaseSync} from "node:sqlite";
import type {DryReceipt} from "./rules.ts";
export class DryCheckStore{
 private db:DatabaseSync;
 constructor(db:DatabaseSync){this.db=db;db.exec("CREATE TABLE IF NOT EXISTS dry_receipts(id TEXT PRIMARY KEY, owner TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, receipt TEXT NOT NULL, UNIQUE(owner,request_id))");}
 find(owner:string,requestId:string){const row=this.db.prepare("SELECT fingerprint,receipt FROM dry_receipts WHERE owner=? AND request_id=?").get(owner,requestId);return row?{fingerprint:String(row.fingerprint),receipt:JSON.parse(String(row.receipt)) as DryReceipt}:undefined;}
 read(owner:string,id:string){const row=this.db.prepare("SELECT receipt FROM dry_receipts WHERE owner=? AND id=?").get(owner,id);return row?JSON.parse(String(row.receipt)) as DryReceipt:undefined;}
 save(owner:string,fingerprint:string,receipt:DryReceipt){return this.db.prepare("INSERT INTO dry_receipts(id,owner,request_id,fingerprint,receipt) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET receipt=excluded.receipt WHERE dry_receipts.owner=excluded.owner AND dry_receipts.fingerprint=excluded.fingerprint AND json_extract(dry_receipts.receipt,'$.status')='CHECKING'").run(receipt.id,owner,receipt.requestId,fingerprint,JSON.stringify(receipt)).changes===1;}
 active(owner:string){return !!this.db.prepare("SELECT id FROM dry_receipts WHERE owner=? AND json_extract(receipt,'$.status')='CHECKING' AND json_extract(receipt,'$.createdAt')>? LIMIT 1").get(owner,new Date(Date.now()-360_000).toISOString());}
 expire(owner:string,id:string){const receipt=this.read(owner,id);if(!receipt||receipt.status!=="CHECKING"||Date.now()-Date.parse(receipt.createdAt)<=360_000)return receipt;
  receipt.status="FAILED";receipt.finishedAt=new Date().toISOString();receipt.reason="This read-only check was interrupted or timed out. Start a fresh check; no transaction was submitted.";
  this.db.prepare("UPDATE dry_receipts SET receipt=? WHERE id=? AND owner=? AND json_extract(receipt,'$.status')='CHECKING'").run(JSON.stringify(receipt),id,owner);return this.read(owner,id);
 }
 admit(owner:string,fingerprint:string,receipt:DryReceipt){
  this.db.exec("BEGIN IMMEDIATE");try{
   const existing=this.find(owner,receipt.requestId);if(existing){this.db.exec("COMMIT");return {kind:"EXISTING" as const,...existing};}
   const old=this.db.prepare("SELECT id FROM dry_receipts WHERE owner=? AND json_extract(receipt,'$.status')='CHECKING'").all(owner);for(const row of old)this.expire(owner,String(row.id));
   if(this.active(owner)){this.db.exec("COMMIT");return {kind:"BUSY" as const};}
   this.save(owner,fingerprint,receipt);this.db.exec("COMMIT");return {kind:"ADMITTED" as const};
  }catch(error){this.db.exec("ROLLBACK");throw error;}
 }
}
