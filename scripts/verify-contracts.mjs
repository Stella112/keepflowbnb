import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const captured=JSON.parse(readFileSync('fixtures/api/rwa-search-nvda.json','utf8'));
const addresses=captured.data.flatMap((stock)=>stock.assets).filter((asset)=>asset.binanceChainId==='56').map((asset)=>asset.tokenContractAddress);
addresses.unshift('0x55d398326f99059fF775485246999027B3197955'); // Official trading reference's BSC USDT address; checked onchain below.
const source=`import {readFileSync} from 'node:fs';
import {createPublicClient,http,erc20Abi} from 'viem';
const config={};for(const line of readFileSync('/home/ubuntu/firstbell/shared/app.env','utf8').split('\\n')){const i=line.indexOf('=');if(i>0&&line.slice(i+1).startsWith('"'))config[line.slice(0,i)]=JSON.parse(line.slice(i+1));}
const client=createPublicClient({transport:http(config.BSC_RPC_URL,{timeout:15000,retryCount:0})});
if(await client.getChainId()!==56)throw new Error('Unexpected chain');
const blockNumber=await client.getBlockNumber();const tokens=[];
for(const address of ${JSON.stringify(addresses)}){
 const [code,decimals,symbol]=await Promise.all([client.getCode({address,blockNumber}),client.readContract({address,abi:erc20Abi,functionName:'decimals',blockNumber}),client.readContract({address,abi:erc20Abi,functionName:'symbol',blockNumber})]);
 if(!code||code==='0x')throw new Error('No contract');tokens.push({address,decimals,symbol,contractPresent:true});
}
console.log(JSON.stringify({timestamp:new Date().toISOString(),chainId:56,blockNumber:blockNumber.toString(),tokens}));`;
const output=execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','C:/bnbstocks/firstbell.pem','ubuntu@56.125.248.192','cd /home/ubuntu/firstbell/current && /home/ubuntu/.local/node-v24.21.0/bin/node --input-type=module'],{input:source,encoding:'utf8',timeout:60000});
JSON.parse(output);writeFileSync('fixtures/api/bsc-contracts.json',output);console.log(output);
