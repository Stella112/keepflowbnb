import {execFileSync} from 'node:child_process';
const source=`import json,pathlib,stat,subprocess
root=pathlib.Path('/home/ubuntu/firstbell')
cfg={}
for line in (root/'shared/app.env').read_text().splitlines():
 key,sep,value=line.partition('=')
 if sep: cfg[key]=json.loads(value) if value.startswith(chr(34)) else value
secrets=[cfg[key].encode() for key in ('BINANCE_WEB3_API_KEY','BINANCE_WEB3_API_SECRET') if cfg.get(key)]
if len(secrets)!=2: raise RuntimeError('Both API credentials required for bundle scan')
hits=sum(any(secret in f.read_bytes() for secret in secrets) for f in (root/'current/.next/static').rglob('*') if f.is_file())
pid=subprocess.check_output(['systemctl','show','firstbell','--property=MainPID','--value'],text=True).strip()
env=dict(part.split('=',1) for part in pathlib.Path('/proc/'+pid+'/environ').read_bytes().decode().split(chr(0)) if '=' in part)
guards={key:env.get(key) for key in ('EXECUTION_MODE','MAINNET_WRITE_ENABLED','LIVE_MAX_TRADE_USD','FIRSTBELL_PUBLIC_URL')}
mode=stat.S_IMODE((root/'shared/paper.sqlite').stat().st_mode)
print(json.dumps({'release':(root/'current').resolve().name,'browserBundleSecretMatches':hits,'checkedApiSecrets':len(secrets),'databaseMode':oct(mode),'guards':guards}))
raise SystemExit(1 if hits or mode!=0o600 or guards['EXECUTION_MODE']!='DRY_RUN' or guards['MAINNET_WRITE_ENABLED']!='false' else 0)
`;
execFileSync('ssh',['-o','ConnectTimeout=10','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','python3 -'],{input:source,stdio:['pipe','inherit','inherit'],timeout:30000});
