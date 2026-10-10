import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const base=process.env.FIRSTBELL_TEST_URL??'http://56.125.248.192',proof=JSON.parse(readFileSync('test-results/core-proof.json','utf8'));
const state=JSON.parse(readFileSync('test-results/core-browser-state.json','utf8')),cookie=state.cookies.find(cookie=>cookie.name==='firstbell-paper');
assert.match(cookie?.value??'',/^[0-9a-f-]{36}$/);
const headers={Cookie:'firstbell-paper='+cookie.value};
async function read(){const response=await fetch(base+'/api/execution/'+proof.receiptId,{headers,signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);return response.json();}
const before=await read();assert.equal(before.status,'BLOCKED');
execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','sudo systemctl restart firstbell.service'],{stdio:'inherit',timeout:30000});
let after;for(let attempt=0;attempt<20;attempt++){try{after=await read();break;}catch{await new Promise(resolve=>setTimeout(resolve,1000));}}
assert.deepEqual(after,before);
const guardScript=`import subprocess,json,pathlib
pid=subprocess.check_output(['systemctl','show','firstbell.service','-p','MainPID','--value'],text=True).strip()
values={}
for entry in pathlib.Path('/proc/'+pid+'/environ').read_bytes().split(bytes([0])):
 key,sep,value=entry.partition(b'=')
 if key in [b'EXECUTION_MODE',b'MAINNET_WRITE_ENABLED',b'LIVE_MAX_TRADE_USD']: values[key.decode()]=value.decode()
print(json.dumps(values))
`;
const guards=JSON.parse(execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','python3 -'],{input:guardScript,encoding:'utf8',timeout:30000}));
assert.equal(guards.EXECUTION_MODE,'DRY_RUN');assert.equal(guards.MAINNET_WRITE_ENABLED,'false');
writeFileSync('test-results/core-persistence-proof.json',JSON.stringify({result:'PASS',receiptSurvivedRestart:true,guards}));
console.log(JSON.stringify({result:'PASS',receiptSurvivedRestart:true,guards}));
