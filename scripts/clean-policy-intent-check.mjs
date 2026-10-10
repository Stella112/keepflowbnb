import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const proof=JSON.parse(readFileSync('test-results/policy-intent-proof.json','utf8'));
const token=JSON.parse(readFileSync('test-results/policy-intent-state.json','utf8')).cookies.find(cookie=>cookie.name==='firstbell-identity')?.value;
if(proof.result!=='PASS'||!/^[0-9a-f-]{36}$/.test(proof.bellId)||!/^[a-f0-9]{64}$/.test(token??''))throw new Error('Passing test identity required');
const digest=createHash('sha256').update(token).digest('hex');
const script=`import sqlite3,json
db=sqlite3.connect('/home/ubuntu/firstbell/shared/paper.sqlite')
owner=db.execute('SELECT account_id FROM identity_sessions WHERE token_hash=? AND revoked=0',(${JSON.stringify(digest)},)).fetchone()
if not owner: raise RuntimeError('Test session not found')
id=${JSON.stringify(proof.bellId)}
row=db.execute('SELECT definition FROM bells WHERE id=? AND owner=?',(id,owner[0])).fetchone()
removed=0
if row:
 bell=json.loads(row[0])
 if bell.get('title')!='QA policy intersection' or bell.get('example') or bell.get('version')!=1 or bell.get('policy',{}).get('maxTradeUsd')!='2': raise RuntimeError('Refusing to remove changed definition')
 db.execute('DELETE FROM bell_versions WHERE bell_id=?',(id,))
 removed=db.execute('DELETE FROM bells WHERE id=? AND owner=?',(id,owner[0])).rowcount
 db.commit()
print(json.dumps({'removedUnchangedTestBell':removed,'intentJournalPreserved':True}))
`;
execFileSync('ssh',['-o','ConnectTimeout=10','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','python3 -'],{input:script,stdio:['pipe','inherit','inherit'],timeout:30000});
