import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const ssh=['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-o','ConnectTimeout=10','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192'];
// TLS remains certificate-backed. Plain HTTP serves ACME and redirects only.
execFileSync('ssh',[...ssh,'sudo apt-get -o DPkg::Lock::Timeout=120 install -y -qq libnginx-mod-stream'],{stdio:'inherit',timeout:180000});
const script=readFileSync(new URL('./setup-public-tls-port.py',import.meta.url),'utf8');
execFileSync('ssh',[...ssh,'sudo python3 -'],{input:script,stdio:['pipe','inherit','inherit'],timeout:60000});

