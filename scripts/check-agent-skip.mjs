import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const base=process.env.FIRSTBELL_TEST_URL??'http://56.125.248.192';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext();await context.request.get(base+'/api/paper');
 const headers={Origin:base};
 const policy=await context.request.post(base+'/api/paper',{headers,data:{action:'POLICY',requestId:randomUUID(),policy:{maxTradeUsd:'100',maxSingleAssetBps:4000,minReserveBps:1000,driftBps:5000}}});assert.equal(policy.status(),200);
 const enabled=await context.request.post(base+'/api/paper/autopilot',{headers,data:{action:'ENABLE',bellId:'ai-compute',contributionUsd:'20',cadence:'DAILY',weekday:5,maxTradeUsd:'10'}});assert.equal(enabled.status(),200);
 execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','sudo systemctl start firstbell-paper-agent.service'],{stdio:'inherit'});
 const state=await (await context.request.get(base+'/api/paper')).json();const plan=await (await context.request.get(base+'/api/paper/autopilot')).json();
 const receipt=state.receipts.find(r=>r.id===plan.plan.lastReceiptId);assert.equal(receipt.status,'SKIPPED');assert.equal(state.cashUsd,'10020');assert.equal(state.positions.length,0);assert.deepEqual(receipt.legs,[]);assert.match(receipt.reason,/drift and reserve/);assert.equal(receipt.transactionHash,null);
 await context.request.post(base+'/api/paper/autopilot',{headers,data:{action:'PAUSE'}});
 console.log(JSON.stringify({result:'PASS',status:receipt.status,reason:receipt.reason,cashUsd:state.cashUsd,positions:0,mainnetWrites:false}));
}finally{await browser.close();}
