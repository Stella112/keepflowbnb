import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {DryCheckStore} from "../lib/execution/receipt-store-core.ts";
import {defaultPolicy} from "../lib/paper/model.ts";
import type {DryReceipt} from "../lib/execution/rules.ts";
const receipt=(id:string,createdAt=new Date().toISOString()):DryReceipt=>({id,requestId:id,mode:"DRY_RUN",status:"CHECKING",bell:{id:"bell",title:"Flow",version:1,contentHash:"hash"},wallet:"0x1111111111111111111111111111111111111111",amount:"1",reserveAmount:"0",roundingAmount:"0",policy:defaultPolicy,createdAt,legs:[],reason:"Checking",executionEnabled:false,transactionHash:null});
test("transactional admission enforces owner scope, request replay and terminal fencing",()=>{
 const db=new DatabaseSync(":memory:"),store=new DryCheckStore(db),first=receipt("first");
 try{
  assert.equal(store.admit("owner","fp",first).kind,"ADMITTED");
  assert.equal(store.admit("owner","fp",first).kind,"EXISTING");
  assert.equal(store.admit("owner","other",receipt("second")).kind,"BUSY");
  assert.equal(store.read("stranger","first"),undefined);
  assert.equal(store.save("owner","wrong",first),false);
  assert.equal(store.save("owner","fp",{...first,status:"BLOCKED"}),true);
  assert.equal(store.save("owner","fp",first),false);
  assert.equal(store.read("owner","first")?.status,"BLOCKED");
  assert.equal(store.admit("owner","other",receipt("second")).kind,"ADMITTED");
 }finally{db.close();}
});
test("admission expires old workers and prevents a late result from resurrecting them",()=>{
 const db=new DatabaseSync(":memory:"),store=new DryCheckStore(db),old=receipt("old",new Date(Date.now()-400_000).toISOString());
 try{
  store.admit("owner","old-fp",old);
  assert.equal(store.admit("owner","new-fp",receipt("new")).kind,"ADMITTED");
  assert.equal(store.read("owner","old")?.status,"FAILED");
  assert.equal(store.save("owner","old-fp",{...old,status:"SIMULATED"}),false);
  assert.equal(store.read("owner","old")?.status,"FAILED");
 }finally{db.close();}
});
