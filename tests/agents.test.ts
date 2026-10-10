import {test} from "node:test";
import assert from "node:assert/strict";
import {agenticWalletOperatorStatus,agentStudioVersion,readonlyCommands} from "../lib/agents/operator-status.ts";
import {projectLocalRunner} from "../lib/agents/operator-status.ts";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {join,resolve,relative,isAbsolute} from "node:path";
const wallet="0x1111111111111111111111111111111111111111";
const binding={operatorId:"owner",requesterId:"owner",wallet,authorization:"OPERATOR_READ_ONLY"};
test("agents disabled by default and cannot share an operator session",async()=>{let calls=0;const runner=async()=>{calls++;throw new Error();};assert.equal((await agenticWalletOperatorStatus(binding,{enabled:false,runner})).status,"DISABLED");assert.equal((await agenticWalletOperatorStatus({...binding,requesterId:"another"},{enabled:true,runner})).status,"BLOCKED");assert.equal(calls,0);assert.equal((await agentStudioVersion({enabled:false,runner})).status,"DISABLED");});
test("unconnected auth stops immediately and wrong wallet does not disclose settings",async()=>{const called:string[]=[];const runner=async(command:string)=>{called.push(command);return JSON.stringify(command==="WALLET_STATUS"?{success:true,data:{status:"CONNECTED"}}:{success:true,data:{addresses:[{binanceChainId:"56",address:"0x2222222222222222222222222222222222222222"}]}});};assert.equal((await agenticWalletOperatorStatus(binding,{enabled:true,runner})).code,"OPERATOR_WALLET_MISMATCH");assert.deepEqual(called,["WALLET_STATUS","WALLET_ADDRESS"]);const disconnected=async()=>JSON.stringify({success:true,data:{status:"UNCONNECTED"}});assert.equal((await agenticWalletOperatorStatus(binding,{enabled:true,runner:disconnected})).status,"UNCONNECTED");});
test("operator status strips credential fields and retains only verified readonly metadata",async()=>{const runner=async(command:string)=>JSON.stringify({success:true,data:command==="WALLET_STATUS"?{status:"CONNECTED",sessionToken:"secret"}:command==="WALLET_ADDRESS"?{addresses:[{binanceChainId:"56",address:wallet}]}:{sessionExpireTime:"2099-01-01T00:00:00Z",dailyLimit:5,tradeAllTokens:false,abnormalTxnHandling:"AutoReject",sessionToken:"secret"}});const result=await agenticWalletOperatorStatus(binding,{enabled:true,runner});assert.equal(result.status,"CONNECTED");assert.equal(result.executionEnabled,false);assert.ok(!JSON.stringify(result).includes("secret"));assert.deepEqual(Object.keys(readonlyCommands).sort(),["STUDIO_VERSION","WALLET_ADDRESS","WALLET_SETTINGS","WALLET_STATUS"]);});
test("malformed output fails closed and Studio version is not deployed-agent proof",async()=>{assert.equal((await agenticWalletOperatorStatus(binding,{enabled:true,runner:async()=>"not-json"})).status,"UNAVAILABLE");assert.equal((await agentStudioVersion({enabled:true,runner:async()=>"0.0.14"})).code,"CLI_VERSION_ONLY");assert.equal((await agentStudioVersion({enabled:true,runner:async()=>"0.0.14 secret"})).status,"UNAVAILABLE");});
test("inactive deadline is independent from session expiry and malformed deadlines fail closed",async()=>{
 for(const deadline of ["2000-01-01T00:00:00Z","not-a-date",null]){
  const runner=async(command:string)=>JSON.stringify({success:true,data:command==="WALLET_STATUS"?{status:"CONNECTED"}:command==="WALLET_ADDRESS"?{addresses:[{binanceChainId:"56",address:wallet}]}:{sessionExpireTime:"2099-01-01T00:00:00Z",inactiveSignOutTime:deadline,dailyLimit:5,tradeAllTokens:false,abnormalTxnHandling:"AutoReject"}});
  const result=await agenticWalletOperatorStatus(binding,{enabled:true,runner});assert.equal(result.status,deadline==="2000-01-01T00:00:00Z"?"UNCONNECTED":"UNAVAILABLE");
 }
});
test("real subprocess runner uses contained test fixture, fixed args and no inherited secrets",async()=>{
 // Synthetic package fixture, not an installed or authenticated Binance provider.
 const fixtureBase=resolve(process.cwd(),"test-results");await mkdir(fixtureBase,{recursive:true});const root=await mkdtemp(join(fixtureBase,"firstbell-agent-fixture-"));const packageRoot=join(root,"tools","agents","node_modules","@binance","agentic-wallet");
 try{
  await mkdir(packageRoot,{recursive:true});await writeFile(join(packageRoot,"package.json"),JSON.stringify({name:"@binance/agentic-wallet",version:"1.10.0",bin:{baw:"fixture.mjs"}}));
  await writeFile(join(packageRoot,"fixture.mjs"),'console.log(JSON.stringify({argv:process.argv.slice(2),unexpected:Object.keys(process.env).filter(key=>!/^(NODE_ENV|PATH|SystemRoot|TEMP|TMP|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|HOMEDRIVE|HOMEPATH|LOGONSERVER|SYSTEMDRIVE|USERDOMAIN|USERNAME|WINDIR)$/i.test(key))}));');
  const result=JSON.parse(await projectLocalRunner(root)("WALLET_STATUS"));assert.deepEqual(result.argv,["wallet","status","--json"]);assert.deepEqual(result.unexpected,[]);
  await writeFile(join(root,"outside.mjs"),'console.log("should never run")');await writeFile(join(packageRoot,"package.json"),JSON.stringify({name:"@binance/agentic-wallet",version:"1.10.0",bin:{baw:"../../../../../outside.mjs"}}));await assert.rejects(()=>projectLocalRunner(root)("WALLET_STATUS"));
  await writeFile(join(packageRoot,"package.json"),JSON.stringify({name:"wrong-package",version:"1.10.0",bin:{baw:"fixture.mjs"}}));await assert.rejects(()=>projectLocalRunner(root)("WALLET_STATUS"));
 }finally{const target=resolve(root);const rel=relative(fixtureBase,target);assert.ok(rel.startsWith("firstbell-agent-fixture-")&&!rel.includes("..")&&!isAbsolute(rel));await rm(target,{recursive:true,force:true});}
});
