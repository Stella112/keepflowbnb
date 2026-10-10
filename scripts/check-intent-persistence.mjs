import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base=process.env.FIRSTBELL_TEST_URL??'http://localhost:3100',proof=JSON.parse(readFileSync('test-results/policy-intent-proof.json','utf8'));
assert.equal(proof.result,'PASS');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({storageState:'test-results/policy-intent-state.json'});
 const read=async()=>{const response=await context.request.get(`${base}/api/intents/${proof.intentId}`);assert.equal(response.status(),200);return response.json();};
 const before=await read();assert.deepEqual(before.intent,proof.intent);assert.deepEqual(before.events,proof.journal);
 execFileSync('ssh',['-o','ConnectTimeout=10','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','sudo systemctl restart firstbell'],{stdio:'inherit',timeout:30000});
 let after;for(let attempt=0;attempt<20;attempt++){try{after=await read();break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}}
 assert.deepEqual(after,before);assert.equal(after.intent.executionAvailable,false);
 writeFileSync('test-results/intent-persistence-proof.json',JSON.stringify({result:'PASS',intentId:proof.intentId,journalPreserved:true,ownerSessionPreserved:true,executionAvailable:false},null,2));
 console.log('PASS: private intent and immutable journal survived controlled restart.');
}finally{await browser.close();}
