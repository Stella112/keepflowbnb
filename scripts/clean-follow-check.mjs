import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const proof=JSON.parse(readFileSync('test-results/bell-follow-proof.json','utf8'));
if(proof.result!=='PASS'||!/^[a-f0-9-]{36}$/.test(proof.bellId))throw new Error('Passing fixture proof required');
const script=`import sqlite3,json
db=sqlite3.connect('/home/ubuntu/firstbell/shared/paper.sqlite')
db.execute('BEGIN IMMEDIATE')
id=${JSON.stringify(proof.bellId)}
row=db.execute('SELECT definition FROM bells WHERE id=?',(id,)).fetchone()
if row:
 bell=json.loads(row[0])
 if not bell.get('title','').startswith('Follow QA ') or bell.get('description')!='Temporary informational-follow verification fixture.' or bell.get('version')!=2 or bell.get('example') or bell.get('assets')!=[{'ticker':'NVDA','weightBps':5000},{'ticker':'MSFT','weightBps':2500},{'ticker':'AAPL','weightBps':1500}] or bell.get('reserveBps')!=1000: raise RuntimeError('Fixture changed; refusing cleanup')
 if db.execute('SELECT COUNT(*) FROM bell_follows WHERE bell_id=?',(id,)).fetchone()[0]: raise RuntimeError('Flow followed; refusing cleanup')
 db.execute('DELETE FROM bell_versions WHERE bell_id=?',(id,))
 db.execute('DELETE FROM bells WHERE id=?',(id,))
db.commit()
print('Removed only the unchanged informational-follow QA Flow; accounts and user data preserved.')
`;
execFileSync('ssh',['-o','ConnectTimeout=10','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','python3 -'],{input:script,stdio:['pipe','inherit','inherit'],timeout:30000});
