import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const session=JSON.parse(readFileSync(process.env.FIRSTBELL_TEST_STATE??'test-results/paper-browser-state.json','utf8')).cookies.find(cookie=>cookie.name==='firstbell-paper')?.value;
if(!/^[0-9a-f-]{36}$/.test(session??''))throw new Error('Expected the test-only paper session');
const source=`import json,sqlite3,pathlib,stat
owner=${JSON.stringify(session)}
path=pathlib.Path('/home/ubuntu/firstbell/shared/paper.sqlite')
db=sqlite3.connect(path)
rows=db.execute('SELECT id,definition FROM bells WHERE owner=?',(owner,)).fetchall()
qa=[row[0] for row in rows if json.loads(row[1])['title'].startswith('QA ')]
if len(qa)>5: raise RuntimeError('Unexpected number of QA definitions')
for bell in qa:
 db.execute('DELETE FROM bell_versions WHERE bell_id=?',(bell,))
 db.execute('DELETE FROM bells WHERE id=? AND owner=?',(bell,owner))
db.commit()
cfg={}
for line in pathlib.Path('/home/ubuntu/firstbell/shared/app.env').read_text().splitlines():
 key,sep,value=line.partition('=')
 if sep: cfg[key]=json.loads(value) if value.startswith(chr(34)) else value
secrets=[cfg[key].encode() for key in ('BINANCE_WEB3_API_KEY','BINANCE_WEB3_API_SECRET') if cfg.get(key)]
if len(secrets)!=2: raise RuntimeError('Both API secrets must be checked')
hits=sum(any(secret in file.read_bytes() for secret in secrets) for file in pathlib.Path('/home/ubuntu/firstbell/current/.next/static').rglob('*') if file.is_file())
print(json.dumps({'removedTestOnlyBells':len(qa),'paperDatabaseMode':oct(stat.S_IMODE(path.stat().st_mode)),'checkedApiSecrets':len(secrets),'browserBundleSecretMatches':hits}))
raise SystemExit(1 if hits else 0)
`;
execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','python3 -'],{input:source,stdio:['pipe','inherit','inherit'],timeout:30000});

