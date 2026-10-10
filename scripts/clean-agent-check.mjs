import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const proof=JSON.parse(readFileSync('test-results/agent-proof.json','utf8'));
if(!/^[a-f0-9-]{36}$/.test(proof.bellId)||proof.version!==3)throw new Error('Passing strategy fixture required');
const script=`import sqlite3,json
db=sqlite3.connect('/home/ubuntu/firstbell/shared/paper.sqlite')
db.execute('BEGIN IMMEDIATE')
rows=db.execute("SELECT id,owner,definition FROM bells WHERE json_extract(definition,'$.title')=? AND json_extract(definition,'$.createdAt')>=?",('QA scheduled Flow','2026-10-09T08:49:56Z')).fetchall()
if not 1<=len(rows)<=3 or not any(row[0]==${JSON.stringify(proof.bellId)} for row in rows): raise RuntimeError('Unexpected verification fixtures; refusing cleanup')
for id,owner,raw in rows:
 bell=json.loads(raw)
 expected=[{'ticker':'NVDA','weightBps':3000},{'ticker':'MSFT','weightBps':3000},{'ticker':'GOOGL','weightBps':3000}] if bell.get('version')==1 else [{'ticker':'NVDA','weightBps':3500},{'ticker':'MSFT','weightBps':2500},{'ticker':'GOOGL','weightBps':3000}]
 if bell.get('version') not in (1,3) or bell.get('assets')!=expected or bell.get('description')!='Controlled paper-agent verification.' or bell.get('reserveBps')!=1000 or bell.get('forkedFromId')!='ai-compute' or bell.get('example'): raise RuntimeError('Test Flow changed; refusing cleanup')
 if db.execute('SELECT COUNT(*) FROM bell_follows WHERE bell_id=?',(id,)).fetchone()[0]: raise RuntimeError('Flow followed; refusing cleanup')
 row=db.execute('SELECT state FROM accounts WHERE id=?',(owner,)).fetchone()
 if row:
  account=json.loads(row[0]);plan=account.get('autopilot')
  if plan and plan.get('bell',{}).get('id')==id:
   plan['enabled']=False
   db.execute('UPDATE accounts SET state=? WHERE id=?',(json.dumps(account),owner))
 db.execute('DELETE FROM bell_versions WHERE bell_id=?',(id,))
 db.execute('DELETE FROM bells WHERE id=? AND owner=?',(id,owner))
db.commit()
print(json.dumps({'removedUnchangedQAFixtures':len(rows),'testSchedulesPaused':True,'privateReceiptsPreserved':True}))
`;
execFileSync('ssh',['-o','ConnectTimeout=10','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','python3 -'],{input:script,stdio:['pipe','inherit','inherit'],timeout:30000});
