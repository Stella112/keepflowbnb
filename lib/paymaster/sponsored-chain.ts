import {createPublicClient,http,type Hex} from 'viem';
import {bsc} from 'viem/chains';
import type {SponsoredDependencies,SponsoredTransaction} from './sponsored-execution.ts';
/** Actual BSC JSON-RPC reads. No signer or broadcasting transport is attached.
 * The caller supplies the existing exact stock/funding effects reconciler. */
export function sponsoredChain(rpcUrl:string,verifyEffects:SponsoredDependencies['chain']['verifyEffects']){
 const url=new URL(rpcUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error('HTTPS BSC RPC required');
 const client=createPublicClient({chain:bsc,transport:http(rpcUrl,{timeout:8000,retryCount:0})});
 async function chain56(){if(await client.getChainId()!==56)throw Error('BSC chain mismatch');}
 return {
  nonce:async(wallet:Hex)=>{await chain56();return client.getTransactionCount({address:wallet,blockTag:'pending'});},
  simulateZeroGas:async(tx:SponsoredTransaction)=>{await chain56();try{await client.call({account:tx.from,to:tx.to,data:tx.data,value:0n,gas:tx.gas,gasPrice:0n});return true;}catch{return false;}},
  chain:{
   transaction:async(hash:Hex)=>{await chain56();const tx=await client.getTransaction({hash});if(!tx.to||tx.blockNumber===null||!tx.blockHash||tx.type!=='legacy')throw Error('Mined legacy original required');return {hash:tx.hash,blockNumber:tx.blockNumber,blockHash:tx.blockHash,from:tx.from,to:tx.to,input:tx.input,value:tx.value,gas:tx.gas,gasPrice:tx.gasPrice,nonce:tx.nonce,chainId:tx.chainId??0};},
   receipt:async(hash:Hex)=>{await chain56();const receipt=await client.getTransactionReceipt({hash});return {transactionHash:receipt.transactionHash,status:receipt.status,blockNumber:receipt.blockNumber,blockHash:receipt.blockHash,effectiveGasPrice:receipt.effectiveGasPrice};},
   blockNumber:async()=>{await chain56();return client.getBlockNumber({cacheTime:0});},
   blockHash:async(number:bigint)=>{await chain56();const block=await client.getBlock({blockNumber:number});if(!block.hash)throw Error('Canonical block missing');return block.hash;},
   verifyEffects,
  },
 };
}
