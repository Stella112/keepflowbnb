import type {PinnedTransaction} from './intents/model.ts';
export type WalletTransport={request:(args:{method:string;params?:unknown[]})=>Promise<unknown>};
const address=/^0x[0-9a-fA-F]{40}$/;
const quantity=(value:string)=>{if(!/^\d+$/.test(value))throw Error('INVALID_QUANTITY');return `0x${BigInt(value).toString(16)}`;};
/** Uses the connected wallet's own confirmation UI. Never loads or exports a key. */
export function connectedWalletSigner(provider:WalletTransport,enabled=false){return {
 async submitExactTransaction(transaction:Readonly<PinnedTransaction>){
  if(!enabled)throw Error('EXECUTION_DISABLED');
  const tx=structuredClone(transaction);
  if(tx.chainId!==56||!address.test(tx.from)||!address.test(tx.to)||!/^0x(?:[a-fA-F0-9]{2})+$/.test(tx.data)||BigInt(tx.value)!==0n)throw Error('INVALID_TRANSACTION');
  const chain=await provider.request({method:'eth_chainId'});
  if(chain!=='0x38')throw Error('WRONG_CHAIN');
  const accounts=await provider.request({method:'eth_accounts'});
  if(!Array.isArray(accounts)||typeof accounts[0]!=='string'||accounts[0].toLowerCase()!==tx.from.toLowerCase())throw Error('WALLET_CHANGED');
  const hash=await provider.request({method:'eth_sendTransaction',params:[{from:tx.from,to:tx.to,data:tx.data,value:quantity(tx.value),gas:quantity(tx.gas),gasPrice:quantity(tx.gasPrice),chainId:'0x38'}]});
  if(typeof hash!=='string'||!/^0x[a-fA-F0-9]{64}$/.test(hash))throw Error('UNKNOWN_TRANSACTION_HASH');
  return hash.toLowerCase();
 }
};}
