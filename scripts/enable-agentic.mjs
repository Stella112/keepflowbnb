import {execFileSync} from 'node:child_process';
// Owner-approved 2026-10-11: live Autopilot (≤0.5 USDT per day in total, Binance app daily limit also applies) and
// paid research (≤1 report/day, 0.1 USD1 fixed by the merchant, only when the owner clicks) through the operator Agentic Wallet. Secrets are generated on the server only.
const operator='0x43b9bEB18853487d48bCB863EeEDF95597a1Fe7C',owner='0xdc646c197d0202fc2a0326af8ab55066a3549e2e';
const source=String.raw`set -eu
python3 - <<'PY'
from pathlib import Path
import secrets,os
root=Path('/home/ubuntu/firstbell/shared')
app=root/'app.env'
lines=app.read_text().splitlines()
def current(key):
  values=[l.partition('=')[2].strip().strip('"') for l in lines if l.startswith(key+'=')]
  if len(values)>1: raise RuntimeError('Duplicate '+key)
  return values[0] if values else ''
runner=current('AGENTIC_RUNNER_TOKEN'); runner=runner if len(runner)>=32 else secrets.token_hex(32)
jobkey=current('FIRSTBELL_RESEARCH_JOB_KEY'); jobkey=jobkey if len(jobkey)==64 else secrets.token_hex(32)
settings={'AGENTIC_WALLET_ENABLED':'true','AUTOPILOT_LIVE_ENABLED':'true','AUTOPILOT_OPERATOR_ADDRESS':'${operator}',
 'AGENTIC_OPERATOR_OWNER_WALLET':'${owner}','AGENTIC_RUNNER_TOKEN':runner,'FIRSTBELL_RESEARCH_PAYMENTS_ENABLED':'true',
 'AGENTIC_RESEARCH_DAILY_LIMIT':'1','LIVE_MAX_TRADE_USD':'0.5','AGENTIC_DAILY_MAX_USD':'0.5','FIRSTBELL_RESEARCH_JOB_KEY':jobkey}
if current('EXECUTION_MODE')!='MAINNET' or current('MAINNET_WRITE_ENABLED')!='true': raise RuntimeError('Mainnet mode is not configured in app.env')
lines=[l for l in lines if l.partition('=')[0] not in settings]+[k+'='+v for k,v in settings.items()]
app.write_text('\n'.join(lines)+'\n');os.chmod(app,0o600)
env=root/'agentic-scheduler.env'
env.write_text('AGENTIC_RUNNER_TOKEN='+runner+'\n');os.chmod(env,0o600)
script=root/'agentic-scheduler.py'
script.write_text('''import os,json,urllib.request
request=urllib.request.Request('http://127.0.0.1:3100/api/agentic/runner',data=b'',headers={'Authorization':'Bearer '+os.environ['AGENTIC_RUNNER_TOKEN']},method='POST')
with urllib.request.urlopen(request,timeout=290) as response:
 result=json.load(response)
 print(json.dumps({'runs':[{k:r.get(k) for k in ('period','created','state')} for r in result.get('runs',[])]}))
''');os.chmod(script,0o600)
print('settings updated:',', '.join(k for k in settings if 'TOKEN' not in k and 'KEY' not in k))
PY
sudo tee /etc/systemd/system/keepflow-agentic.service >/dev/null <<'UNIT'
[Unit]
Description=KeepFlow live Autopilot due-period check
After=firstbell.service
[Service]
Type=oneshot
User=ubuntu
EnvironmentFile=/home/ubuntu/firstbell/shared/agentic-scheduler.env
ExecStart=/usr/bin/python3 /home/ubuntu/firstbell/shared/agentic-scheduler.py
TimeoutStartSec=300
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
UNIT
sudo tee /etc/systemd/system/keepflow-agentic.timer >/dev/null <<'UNIT'
[Unit]
Description=KeepFlow live Autopilot check every fifteen minutes (each period runs at most once)
[Timer]
OnBootSec=3min
OnUnitActiveSec=15min
Persistent=false
[Install]
WantedBy=timers.target
UNIT
sudo systemctl daemon-reload
sudo systemctl restart firstbell
sleep 6
curl -fsS http://127.0.0.1:3100/api/health; echo
sudo systemctl enable --now keepflow-agentic.timer
systemctl list-timers keepflow-agentic.timer --no-pager | head -3
`;
execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','bash -s'],{input:source,stdio:['pipe','inherit','inherit'],timeout:360000});
