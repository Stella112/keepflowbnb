import "server-only";
import {randomBytes,randomUUID} from "node:crypto";
import {paperDatabase,linkedWallet} from "./store";
import {canApproveQr,canFinishQr,type QrRequest} from "./qr-login-rules";
function database(){const db=paperDatabase();db.exec("CREATE TABLE IF NOT EXISTS qr_logins(id TEXT PRIMARY KEY,desktop TEXT NOT NULL,status TEXT NOT NULL,phoneAccount TEXT,code TEXT NOT NULL,origin TEXT NOT NULL,expiresAt INTEGER NOT NULL)");return db;}
export function createQrLogin(desktop:string,origin:string){
 const db=database(),now=Date.now();db.exec("BEGIN IMMEDIATE");try{
  db.prepare("DELETE FROM qr_logins WHERE expiresAt<?").run(now-86400000);
  db.prepare("UPDATE qr_logins SET status='CANCELLED' WHERE desktop=? AND status IN ('PENDING','APPROVED')").run(desktop);
  const request:QrRequest={id:randomUUID(),desktop,status:"PENDING",phoneAccount:null,code:randomBytes(4).toString("hex").toUpperCase(),origin,expiresAt:now+300000};
  db.prepare("INSERT INTO qr_logins(id,desktop,status,phoneAccount,code,origin,expiresAt) VALUES (?,?,?,NULL,?,?,?)").run(request.id,desktop,request.status,request.code,origin,request.expiresAt);db.exec("COMMIT");return request;
 }catch(error){db.exec("ROLLBACK");throw error;}
}
export function readQrLogin(id:string):QrRequest|undefined{const row=database().prepare("SELECT * FROM qr_logins WHERE id=?").get(id);return row?row as unknown as QrRequest:undefined;}
export function updateQrLogin(id:string,caller:string,action:"APPROVE"|"FINISH"|"CANCEL",code?:string){
 const db=database();db.exec("BEGIN IMMEDIATE");try{
  const request=readQrLogin(id);if(!request)throw new Error("This QR login was not found.");
  if(action==="APPROVE"){
   if(!linkedWallet(caller))throw new Error("Sign in with your phone wallet first.");
   if(!canApproveQr(request,caller,code??""))throw new Error("This QR login expired or is no longer available.");
   db.prepare("UPDATE qr_logins SET status='APPROVED',phoneAccount=? WHERE id=?").run(caller,id);
  }else if(action==="CANCEL"){
   if(request.desktop!==caller||request.status==="CONSUMED")throw new Error("This login cannot be cancelled.");
   db.prepare("UPDATE qr_logins SET status='CANCELLED' WHERE id=?").run(id);
  }else{
   if(!canFinishQr(request,caller)||!linkedWallet(request.phoneAccount!))throw new Error("This QR login expired or has not been approved.");
   db.prepare("UPDATE qr_logins SET status='CONSUMED' WHERE id=?").run(id);
  }
  db.exec("COMMIT");return action==="FINISH"?request.phoneAccount!:undefined;
 }catch(error){db.exec("ROLLBACK");throw error;}
}
