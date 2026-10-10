import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const proof=JSON.parse(readFileSync('test-results/v2-proof.json','utf8'));
if(proof.result!=='PASS'||!/^[0-9a-f-]{36}$/.test(proof.bellId))throw new Error('Only the generated passing draft check may be cleaned');
const script=`import sqlite3,json
db=sqlite3.connect('/home/ubuntu/firstbell/shared/paper.sqlite')
id=${JSON.stringify(proof.bellId)}
row=db.execute('SELECT definition FROM bells WHERE id=?',(id,)).fetchone()
removed=0
if row:
 bell=json.loads(row[0])
 if bell.get('title')!='QA verified draft' or bell.get('example') or bell.get('version')!=1: raise RuntimeError('Refusing to remove a changed definition')
 db.execute('DELETE FROM bell_versions WHERE bell_id=?',(id,))
 removed=db.execute('DELETE FROM bells WHERE id=?',(id,)).rowcount
 db.commit()
print(json.dumps({'removedGeneratedDraftCheck':removed}))
`;
execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','python3 -'],{input:script,stdio:['pipe','inherit','inherit'],timeout:30000});
