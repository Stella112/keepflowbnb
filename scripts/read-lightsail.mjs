// Operator verification only. The protected server environment supplies credentials.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { z } from 'zod';
import { buildReadUrl } from '../lib/binance/auth.ts';
const [endpoint, queryJson, name] = process.argv.slice(2);
const allowed = ['/api/v1/dex/market/rwa/platforms','/api/v1/dex/market/rwa/search','/api/v1/dex/market/rwa/tokens','/api/v1/dex/market/rwa/price','/api/v1/dex/market/rwa/underlying-profile','/api/v1/dex/market/rwa/underlying-market','/api/v1/dex/aggregator/quote','/api/v1/dex/aggregator/swap','/api/v1/dex/aggregator/approve-transaction'];
if (!allowed.includes(endpoint) || !/^[a-z0-9-]+$/.test(name ?? '')) throw new Error('Unsupported verification request');
const query = z.record(z.string(),z.string()).parse(JSON.parse(queryJson));
buildReadUrl('https://web3.binance.com/build', endpoint, query);
const source = `import { readFileSync } from 'node:fs';
import { createReadClient } from './lib/binance/client-core.ts';
import { z } from 'zod';
const config={};
for(const line of readFileSync('/home/ubuntu/firstbell/shared/app.env','utf8').split('\\n')) {
 const index=line.indexOf('=');if(index>0 && line.slice(index+1).startsWith('"')) config[line.slice(0,index)]=JSON.parse(line.slice(index+1));
}
let metric;
const client=createReadClient({baseUrl:config.BINANCE_WEB3_BASE_URL,apiKey:config.BINANCE_WEB3_API_KEY,apiSecret:config.BINANCE_WEB3_API_SECRET},{fetch:async(input,init)=>{
 const response=await fetch(input,init);const raw=await response.clone().text();
 process.stdout.write(JSON.stringify({raw:raw.replaceAll(config.BINANCE_WEB3_API_KEY,'[REDACTED]').replaceAll(config.BINANCE_WEB3_API_SECRET,'[REDACTED]')})+'\\n');return response;
},log:entry=>{metric=entry;}});
try {await client.get(${JSON.stringify(endpoint)},${JSON.stringify(query)},z.unknown());process.stdout.write(JSON.stringify({metric})+'\\n');}
catch(error){process.stdout.write(JSON.stringify({metric,error:error.code})+'\\n');process.exitCode=1;}
`;
const command = 'cd /home/ubuntu/firstbell/current && /home/ubuntu/.local/node-v24.21.0/bin/node --input-type=module';
let output;
try { output=execFileSync('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=10','-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192',command],{input:source,encoding:'utf8',timeout:45000,maxBuffer:2200000}); }
catch(error){output=String(error.stdout ?? '');process.exitCode=1;}
mkdirSync('fixtures/api',{recursive:true});mkdirSync('logs',{recursive:true});
for(const line of output.trim().split('\n').filter(Boolean)) {
 const entry=JSON.parse(line);
 if(typeof entry.raw==='string') writeFileSync(`fixtures/api/${name}.json`,entry.raw);
 if(entry.metric){appendFileSync('logs/dx.jsonl',JSON.stringify({...entry.metric,module:'lightsail-verification'})+'\n');console.log(JSON.stringify(entry.metric));}
 if(entry.error)console.log(JSON.stringify({error:entry.error}));
}
