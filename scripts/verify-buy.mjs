import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
const source=`import {readFileSync} from 'node:fs';
import {createReadClient} from './lib/binance/client-core.ts';
import {createPublicClient,http,erc20Abi} from 'viem';
import {z} from 'zod';
const config={};for(const line of readFileSync('/home/ubuntu/firstbell/shared/app.env','utf8').split('\\n')){const i=line.indexOf('=');if(i>0&&line.slice(i+1).startsWith('"'))config[line.slice(0,i)]=JSON.parse(line.slice(i+1));}
let label='quote-nvda-bstocks-fresh';
const client=createReadClient({baseUrl:config.BINANCE_WEB3_BASE_URL,apiKey:config.BINANCE_WEB3_API_KEY,apiSecret:config.BINANCE_WEB3_API_SECRET},{fetch:async(input,init)=>{const response=await fetch(input,init);const raw=await response.clone().text();console.log(JSON.stringify({label,raw}));return response;},log:metric=>console.log(JSON.stringify({metric}))});
const wallet='0x1f41ebf1e60e5daa9cdda69637a78a9381b23388';
const query={binanceChainId:'56',amount:'5000000000000000000',fromTokenAddress:'0x55d398326f99059fF775485246999027B3197955',toTokenAddress:'0x02fca66c1d1afb4e2a7884261eb00f63598a7436',userWalletAddress:wallet};
try {
 const routes=await client.get('/api/v1/dex/aggregator/quote',query,z.array(z.object({quoteId:z.string(),vendorName:z.string(),executionMode:z.string(),approveTarget:z.string().nullable()})));
 const route=routes.find(route=>route.executionMode==='SWAP');if(!route)throw new Error('No SWAP route');
 label='swap-nvda-bstocks';const built=await client.get('/api/v1/dex/aggregator/swap',{...query,quoteId:route.quoteId,slippagePercent:'0.5'},z.object({tx:z.object({from:z.string(),to:z.string(),data:z.string(),value:z.string()})}));
 label='approval-nvda-bstocks';const approvals=await client.get('/api/v1/dex/aggregator/approve-transaction',{binanceChainId:'56',tokenContractAddress:query.fromTokenAddress,approveAmount:query.amount,vendor:route.vendorName},z.array(z.object({data:z.string(),dexContractAddress:z.string()})).length(1));
 const rpc=createPublicClient({transport:http(config.BSC_RPC_URL,{timeout:15000,retryCount:0})});
 if(await rpc.getChainId()!==56)throw new Error('Wrong chain');
 const [balance,gas,allowance]=await Promise.all([rpc.readContract({address:query.fromTokenAddress,abi:erc20Abi,functionName:'balanceOf',args:[wallet]}),rpc.getBalance({address:wallet}),rpc.readContract({address:query.fromTokenAddress,abi:erc20Abi,functionName:'allowance',args:[wallet,route.approveTarget]})]);
 console.log(JSON.stringify({readiness:{usdtBalance:balance.toString(),nativeBalance:gas.toString(),allowance:allowance.toString(),funded:balance>=BigInt(query.amount),approved:allowance>=BigInt(query.amount)}}));
 label='simulate-approval-nvda';await client.simulate({from:wallet,to:query.fromTokenAddress,value:'0',data:approvals[0].data},z.unknown());
 label='simulate-swap-nvda';await client.simulate(built.tx,z.unknown());
}catch(error){console.log(JSON.stringify({error:error.code??'VERIFICATION_STOPPED'}));process.exitCode=1;}
`;
let output;
try{output=execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','cd /home/ubuntu/firstbell/current && /home/ubuntu/.local/node-v24.21.0/bin/node --input-type=module'],{input:source,encoding:'utf8',timeout:60000,maxBuffer:2200000});}
catch(error){output=String(error.stdout??'');process.exitCode=1;}
mkdirSync('fixtures/api',{recursive:true});
for(const line of output.trim().split('\n').filter(Boolean)){const entry=JSON.parse(line);if(entry.raw)writeFileSync('fixtures/api/'+entry.label+'.json',entry.raw);if(entry.metric){appendFileSync('logs/dx.jsonl',JSON.stringify(entry.metric)+'\n');console.log(JSON.stringify(entry.metric));}if(entry.readiness)console.log(JSON.stringify({readiness:entry.readiness}));if(entry.error)console.log(JSON.stringify({error:entry.error}));}
