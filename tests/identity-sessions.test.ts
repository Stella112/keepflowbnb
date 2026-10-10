import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createIdentitySession,resolveIdentitySession,revokeIdentitySession} from '../lib/paper/identity-sessions.ts';
test('opaque sessions cannot be forged from legacy account IDs and expire at exact boundary',()=>{
 const db=new DatabaseSync(':memory:');try{
 const account='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',token=createIdentitySession(db,account,100);
 assert.equal(resolveIdentitySession(db,account,101),undefined);assert.equal(resolveIdentitySession(db,'a'.repeat(64),101),undefined);
 assert.equal(resolveIdentitySession(db,token,100+90*86400000-1),account);
 assert.equal(resolveIdentitySession(db,token,100+90*86400000),undefined);
 const row=db.prepare('SELECT token_hash FROM identity_sessions').get()!;assert.notEqual(row.token_hash,token);
 }finally{db.close();}
});
test('revocation prevents captured-cookie replay while replacement preserves account ownership',()=>{
 const db=new DatabaseSync(':memory:');try{
 const old=createIdentitySession(db,'same-account'),fresh=createIdentitySession(db,'same-account');assert.notEqual(old,fresh);
 revokeIdentitySession(db,old);assert.equal(resolveIdentitySession(db,old),undefined);assert.equal(resolveIdentitySession(db,fresh),'same-account');
 revokeIdentitySession(db,fresh);assert.equal(resolveIdentitySession(db,fresh),undefined);
 }finally{db.close();}
});
