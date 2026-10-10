import {test} from "node:test";
import assert from "node:assert/strict";
import {canApproveQr,canFinishQr,qrStatus,type QrRequest} from "../lib/paper/qr-login-rules.ts";
const request:QrRequest={id:"test",desktop:"desktop",status:"PENDING",phoneAccount:null,code:"AABBCCDD",origin:"https://firstbell.example",expiresAt:5000};
test("QR approval requires matching code and active request; an approved phone cannot be replaced",()=>{
 assert.equal(canApproveQr(request,"phone","AABBCCDD",4999),true);assert.equal(canApproveQr(request,"phone","00000000",4999),false);assert.equal(canApproveQr(request,"phone","AABBCCDD",5000),false);
 const approved={...request,status:"APPROVED" as const,phoneAccount:"phone"};assert.equal(canApproveQr(approved,"other","AABBCCDD",4999),false);assert.equal(canApproveQr(approved,"phone","AABBCCDD",4999),true);
});
test("QR redemption requires the originating desktop, explicit phone approval and single-use active status",()=>{
 assert.equal(canFinishQr(request,"desktop",4999),false);const approved={...request,status:"APPROVED" as const,phoneAccount:"phone"};
 assert.equal(canFinishQr(approved,"desktop",4999),true);assert.equal(canFinishQr(approved,"other",4999),false);assert.equal(canFinishQr(approved,"desktop",5000),false);
 for(const status of ["CANCELLED","CONSUMED"] as const){assert.equal(canFinishQr({...approved,status},"desktop",4999),false);assert.equal(canApproveQr({...approved,status},"phone","AABBCCDD",4999),false);}
 assert.equal(qrStatus(approved,5000),"EXPIRED");
});
