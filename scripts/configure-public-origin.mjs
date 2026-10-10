import {execFileSync} from 'node:child_process';
const script=`from pathlib import Path
import os
p=Path('/home/ubuntu/firstbell/shared/app.env')
lines=p.read_text().splitlines()
lines=[line for line in lines if not line.startswith('FIRSTBELL_PUBLIC_URL=')]
lines.append('FIRSTBELL_PUBLIC_URL=https://56.125.248.192:80')
p.write_text('\\n'.join(lines)+'\\n')
os.chmod(p,0o600)
print('Public QR origin configured as HTTPS; no credentials printed.')
`;
execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','python3 -'],{input:script,stdio:['pipe','inherit','inherit']});

