import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
const key=process.env.BINANCE_WEB3_API_KEY;
const secret=process.env.BINANCE_WEB3_API_SECRET;
const target=process.env.FIRSTBELL_SSH_TARGET ?? 'root@38.49.209.149';
const identity=process.env.FIRSTBELL_SSH_IDENTITY ?? 'C:/Users/Admin/.ssh/qevor_codex_deploy';
if(!['root@38.49.209.149','ubuntu@56.125.248.192'].includes(target)) throw new Error('Unapproved SSH target');
const label=target==='ubuntu@56.125.248.192'?'lightsail':'vps';
if(!key||!secret) throw new Error('Missing local credentials');
if(process.env.BINANCE_WEB3_BASE_URL!=='https://web3.binance.com/build') throw new Error('Unsupported host');
const remote = `import sys,json,hmac,hashlib,base64,urllib.request,urllib.error,datetime,time,uuid
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl): return None
credentials=json.load(sys.stdin)
key=credentials['key']; secret=credentials['secret']
path='/build/api/v1/dex/balance/supported/chain?binanceChainId=56'
timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
sign=base64.b64encode(hmac.new(secret.encode(),(timestamp+'GET'+path).encode(),hashlib.sha256).digest()).decode()
request=urllib.request.Request('https://web3.binance.com'+path,headers={'X-OC-APIKEY':key,'X-OC-TIMESTAMP':timestamp,'X-OC-SIGN':sign,'X-OC-NONCE':str(uuid.uuid4()),'Accept':'application/json'})
started=time.monotonic()
try:
 response=urllib.request.build_opener(NoRedirect).open(request,timeout=15)
 status=response.status; raw=response.read().decode()
except urllib.error.HTTPError as error:
 status=error.code; raw=error.read().decode()
except Exception:
 print(json.dumps({'timestamp':timestamp,'httpStatus':None,'note':'Network failure; no retry'}));sys.exit(0)
raw=raw.replace(key,'[REDACTED]').replace(secret,'[REDACTED]')
print(json.dumps({'timestamp':timestamp,'httpStatus':status,'latencyMs':round((time.monotonic()-started)*1000),'raw':raw}))
`;
const encoded=Buffer.from(remote).toString('base64');
const command=`python3 -c "import base64;exec(base64.b64decode('${encoded}'))"`;
const output=execFileSync('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=10','-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-i',identity,target,command],{input:JSON.stringify({key,secret}),encoding:'utf8',timeout:30000,maxBuffer:100000});
const result=z.object({timestamp:z.string(),httpStatus:z.number().nullable(),latencyMs:z.number().optional(),raw:z.string().optional(),note:z.string().optional()}).parse(JSON.parse(output));
mkdirSync('fixtures/api',{recursive:true});
mkdirSync('logs',{recursive:true});
if(result.raw!==undefined) writeFileSync(`fixtures/api/${label}-wallet-supported-chains.json`,result.raw);
let payload;try{payload=JSON.parse(result.raw??'null');}catch{payload=null;}
const envelope=z.object({code:z.number().int(),msg:z.string(),data:z.unknown().optional(),success:z.boolean().optional()}).safeParse(payload);
const log={timestamp:result.timestamp,module:`${label}-verification`,endpoint:'/api/v1/dex/balance/supported/chain',httpStatus:result.httpStatus,businessCode:envelope.success?envelope.data.code:null,latencyMs:result.latencyMs??null,retryCount:0,schemaValidation:envelope.success?'ENVELOPE_VALID':'NO_VALID_ENVELOPE',note:'Read-only VPS probe; credentials supplied through SSH stdin, not persisted remotely'};
appendFileSync('logs/dx.jsonl',JSON.stringify(log)+'\n');
console.log(JSON.stringify(log));
if(!envelope.success || result.httpStatus===null || result.httpStatus<200 || result.httpStatus>=300 || envelope.data.code!==0 || envelope.data.success===false) process.exitCode=1;
