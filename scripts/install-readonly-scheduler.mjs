import {execFileSync} from 'node:child_process';
const source=String.raw`set -eu
root=/home/ubuntu/firstbell
python3 - <<'PY'
from pathlib import Path
import secrets,os
root=Path('/home/ubuntu/firstbell/shared')
app=root/'app.env'
lines=app.read_text().splitlines()
values=[line.partition('=')[2].strip().strip('"') for line in lines if line.startswith('FIRSTBELL_READONLY_RUNNER_TOKEN=')]
if len(values)>1: raise RuntimeError('Duplicate scheduler token configuration')
token=values[0] if values and len(values[0])>=32 else secrets.token_hex(32)
lines=[line for line in lines if not line.startswith('FIRSTBELL_READONLY_RUNNER_TOKEN=')]
lines.append('FIRSTBELL_READONLY_RUNNER_TOKEN='+token)
app.write_text('\n'.join(lines)+'\n');os.chmod(app,0o600)
scheduler=root/'readonly-scheduler.env'
scheduler.write_text('FIRSTBELL_READONLY_RUNNER_TOKEN='+token+'\n');os.chmod(scheduler,0o600)
script=root/'readonly-scheduler.py'
script.write_text('''import os,json,urllib.request
request=urllib.request.Request('http://127.0.0.1:3100/api/automation/runner',data=b'',headers={'Authorization':'Bearer '+os.environ['FIRSTBELL_READONLY_RUNNER_TOKEN']},method='POST')
with urllib.request.urlopen(request,timeout=290) as response:
 result=json.load(response)
 if result.get('mode')!='READ_ONLY' or result.get('executionAvailable') is not False: raise RuntimeError('Unexpected scheduler authority')
 print(json.dumps({'mode':'READ_ONLY','executionAvailable':False,'checkedRunCount':len(result.get('runs',[]))}))
''');os.chmod(script,0o600)
PY
sudo tee /etc/systemd/system/firstbell-readonly-checks.service >/dev/null <<'UNIT'
[Unit]
Description=KeepFlow read-only wallet schedule checks
After=firstbell.service
[Service]
Type=oneshot
User=ubuntu
EnvironmentFile=/home/ubuntu/firstbell/shared/readonly-scheduler.env
ExecStart=/usr/bin/python3 /home/ubuntu/firstbell/shared/readonly-scheduler.py
TimeoutStartSec=300
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
UNIT
sudo tee /etc/systemd/system/firstbell-readonly-checks.timer >/dev/null <<'UNIT'
[Unit]
Description=KeepFlow read-only checks every five minutes
[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=false
[Install]
WantedBy=timers.target
UNIT
sudo systemctl daemon-reload
sudo systemctl restart firstbell
sudo systemctl enable --now firstbell-readonly-checks.timer
sudo systemctl start firstbell-readonly-checks.service
sudo journalctl -u firstbell-readonly-checks.service -n 3 --no-pager
`;
execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','bash -s'],{input:source,stdio:['pipe','inherit','inherit'],timeout:360000});
