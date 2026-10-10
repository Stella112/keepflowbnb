import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base=process.env.FIRSTBELL_TEST_URL??'http://56.125.248.192';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({storageState:'test-results/agent-browser-state.json'});
 const read=async()=>({agent:await (await context.request.get(base+'/api/paper/autopilot')).json(),account:await (await context.request.get(base+'/api/paper')).json()});
 const before=await read();
 execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','sudo systemctl restart firstbell; for attempt in $(seq 1 20); do curl -fsS http://127.0.0.1:3100/api/health >/dev/null && exit 0; sleep 1; done; exit 1'],{stdio:'inherit'});
 const after=await read();assert.deepEqual(after.agent,before.agent);assert.equal(after.account.cashUsd,before.account.cashUsd);assert.deepEqual(after.account.positions.map(p=>p.quantity),before.account.positions.map(p=>p.quantity));assert.equal(after.account.receipts.length,before.account.receipts.length);
 assert.equal((await context.request.post(base+'/api/paper/autopilot/tick')).status(),401);
 assert.equal((await (await context.request.get(base+'/api/health')).json()).executionAvailable,false);
 console.log(JSON.stringify({result:'PASS',checks:['agent schedule and pinned version survive restart','virtual cash and quantities survive restart','receipt history survives restart','scheduler rejects unauthenticated calls','mainnet disabled']}));
}finally{await browser.close();}
