import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMegaFuelSponsorability, transactionFingerprint, MEGAFUEL_ENDPOINT } from "../lib/paymaster/megafuel.ts";
const now = 1800000000000;
const tx = { from: "0x1111111111111111111111111111111111111111", to: "0x2222222222222222222222222222222222222222", data: "0x1234567800", gas: "0x186a0", value: "0x0" };
const context = { chainId: 56, wallet: tx.from, allowedRoutes: [tx.to], allowedSelectors: ["0x12345678"], maxGas: 200000, amountUsdtMicros: "5000000", policyAllowed: true, quoteAt: now, simulation: { status: "SUCCESS", checkedAt: now, transactionFingerprint: transactionFingerprint(tx) } };
test("paymaster is disabled by default and blocked policies never reach RPC", async () => {
 let calls=0; const fetcher: typeof fetch=async()=>{calls++;throw new Error("unexpected");};
 assert.equal((await checkMegaFuelSponsorability(tx,context,{enabled:false,now,fetcher})).status,"DISABLED");
 for(const bad of [{...context,chainId:1},{...context,policyAllowed:false},{...context,wallet:tx.to},{...context,maxGas:99999},{...context,amountUsdtMicros:"5000001"},{...context,quoteAt:now-15001},{...context,simulation:{...context.simulation,transactionFingerprint:"0".repeat(64)}}]) assert.equal((await checkMegaFuelSponsorability(tx,bad,{enabled:true,now,fetcher})).status,"BLOCKED");
 assert.equal(calls,0);
});
test("provider method, pinned URL and response ID are enforced; eligibility is not execution",async()=>{
 const fetcher: typeof fetch=async(url,init)=>{assert.equal(url,MEGAFUEL_ENDPOINT);assert.equal(init?.redirect,"error"); const request=JSON.parse(String(init?.body));assert.equal(request.method,"pm_isSponsorable");assert.deepEqual(request.params,[tx]);return Response.json({jsonrpc:"2.0",id:request.id,result:{Sponsorable:true,SponsorName:"Test fixture sponsor",SponsorIcon:"",SponsorWebsite:""}});};
 const result=await checkMegaFuelSponsorability(tx,context,{enabled:true,now,fetcher});assert.equal(result.status,"ELIGIBLE");assert.equal(result.executionEnabled,false);
 const mismatch: typeof fetch=async()=>Response.json({jsonrpc:"2.0",id:"wrong",result:{Sponsorable:true}});
 assert.equal((await checkMegaFuelSponsorability(tx,context,{enabled:true,now,fetcher:mismatch})).status,"UNAVAILABLE");
});
test("calldata mutation, positive value, oversized response and provider error fail closed",async()=>{
 const fetcher: typeof fetch=async()=>new Response("x".repeat(16385));
 assert.equal((await checkMegaFuelSponsorability({...tx,data:"0x1234567801"},context,{enabled:true,now,fetcher})).status,"BLOCKED");
 assert.equal((await checkMegaFuelSponsorability({...tx,value:"0x1"},context,{enabled:true,now,fetcher})).status,"BLOCKED");
 assert.equal((await checkMegaFuelSponsorability(tx,context,{enabled:true,now,fetcher})).status,"UNAVAILABLE");
 const unavailable: typeof fetch=async()=>{throw new Error("network failure");};
 assert.equal((await checkMegaFuelSponsorability(tx,context,{enabled:true,now,fetcher:unavailable})).status,"UNAVAILABLE");
});
