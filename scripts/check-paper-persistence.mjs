import {request} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const client=await request.newContext({storageState:'test-results/paper-browser-state.json'});
try{const proof=JSON.parse(readFileSync('test-results/paper-proof.json','utf8'));const response=await client.get('http://56.125.248.192/api/paper');assert.equal(response.status(),200);const current=await response.json();assert.equal(current.cashUsd,proof.cashUsd);assert.deepEqual(current.positions.map(p=>({address:p.address,quantity:p.quantity})),proof.positions);assert.equal(current.receipts.length,proof.receiptCount);console.log('PASS: paper cash, quantities and receipt history survived server restart.');}finally{await client.dispose();}
