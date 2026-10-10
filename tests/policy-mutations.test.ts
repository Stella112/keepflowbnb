import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {newAccount,type Account,type Receipt} from '../lib/paper/model.ts';
import {mutatePolicy,assertTradeRequestAvailable} from '../lib/paper/policy-mutations.ts';
const update=(id:string,version?:number,limit='50')=>({requestId:id,fingerprint:JSON.stringify([id,version,limit]),expectedPolicyVersion:version,policy:{...newAccount().policy,maxTradeUsd:limit}});
test('policy replay returns its original version without overwriting newer rules',()=>{
 const state=newAccount(),a=update('a',0),b=update('b',1,'20');
 assert.equal(mutatePolicy(state,a).policyVersion,1);mutatePolicy(state,b);
 assert.equal(mutatePolicy(state,a).policyVersion,1);assert.equal(state.policyVersion,2);assert.equal(state.policy.maxTradeUsd,'20');
 assert.throws(()=>mutatePolicy(state,update('a',0,'99')));
 assert.throws(()=>mutatePolicy(state,update('c',1)));
 assert.throws(()=>mutatePolicy(state,update('d')));
 assert.equal(state.policyVersion,2);
});
test('legacy account permits omitted version only for first update and request IDs span action types',()=>{
 const state=newAccount();mutatePolicy(state,update('a'));assert.throws(()=>assertTradeRequestAvailable(state,'a'));
 assert.throws(()=>mutatePolicy(state,update('b')));
 state.receipts.push({requestId:'trade'} as Receipt);assert.throws(()=>mutatePolicy(state,update('trade',1)));
});
test('SQLite reopen preserves policy ledger and transactional conflict leaves the stored rules intact',()=>{
 const directory=mkdtempSync(join(tmpdir(),'firstbell-policy-')),path=join(directory,'state.sqlite');let db=new DatabaseSync(path);
 try{
 db.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY,state TEXT NOT NULL)');db.prepare('INSERT INTO accounts VALUES (?,?)').run('owner',JSON.stringify(newAccount()));
 const apply=(input:ReturnType<typeof update>)=>{db.exec('BEGIN IMMEDIATE');try{const state=JSON.parse(String(db.prepare('SELECT state FROM accounts WHERE id=?').get('owner')!.state)) as Account;const result=mutatePolicy(state,input);db.prepare('UPDATE accounts SET state=? WHERE id=?').run(JSON.stringify(state),'owner');db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
 const a=update('a',0);apply(a);apply(update('b',1,'20'));db.close();db=new DatabaseSync(path);
 assert.equal(apply(a).policyVersion,1);assert.throws(()=>apply(update('bad',0)));
 const stored=JSON.parse(String(db.prepare('SELECT state FROM accounts').get()!.state));assert.equal(stored.policyVersion,2);assert.equal(stored.policy.maxTradeUsd,'20');assert.equal(stored.policyMutations.length,2);
 }finally{db.close();rmSync(directory,{recursive:true,force:true});}
});
