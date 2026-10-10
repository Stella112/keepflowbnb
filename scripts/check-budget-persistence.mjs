import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.FIRSTBELL_TEST_URL??'http://localhost:3100',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({storageState:'test-results/paper-budget-state.json'});
 const read=async()=>{const response=await context.request.get(base+'/api/paper');assert.equal(response.status(),200);return response.json();};
 const before=await read();assert.equal(before.policy.maxDailySpendUsd,'0');assert.ok(Number(before.paperBudget.dailySpentUsd)>0);
 execFileSync('ssh',['-o','ConnectTimeout=10','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','sudo systemctl restart firstbell'],{timeout:30000,stdio:'inherit'});
 let after;for(let attempt=0;attempt<20;attempt++){try{after=await read();break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}}
 assert.deepEqual(after.paperBudget,before.paperBudget);assert.deepEqual(after.policy,before.policy);assert.deepEqual(after.receipts,before.receipts);assert.equal(after.cashUsd,before.cashUsd);
 writeFileSync('test-results/paper-budget-persistence.json',JSON.stringify({result:'PASS',paperBudgetPreserved:true,policyAndReceiptsPreserved:true,executionAvailable:false},null,2));console.log('PASS: consumed paper budgets, zero cap, cash and receipts survived controlled restart.');
}finally{await browser.close();}
