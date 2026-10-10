import "server-only";
import {erc20Abi,type Address} from "viem";
import {getDiscovery} from "../binance/rwa";
import {publicClient,USDT_ADDRESS} from "../binance/onchain";
import {addressSchema} from "../binance/rwa-schemas";
import {fromUnits,shareExposure} from "../binance/amounts";
import {valueMicros} from "../paper/engine";
import type {WalletSnapshot} from "./rules";

export async function walletPortfolio(wallet:string):Promise<WalletSnapshot>{
 const owner=addressSchema.parse(wallet) as Address,client=publicClient();
 if(await client.getChainId()!==56)throw new Error("The configured RPC is not BNB Smart Chain.");
 const discovery=await getDiscovery(),blockNumber=await client.getBlockNumber();
 async function token(address:Address){
  const [code,symbol,decimals,balance]=await Promise.all([
   client.getCode({address,blockNumber}),
   client.readContract({address,abi:erc20Abi,functionName:"symbol",blockNumber}),
   client.readContract({address,abi:erc20Abi,functionName:"decimals",blockNumber}),
   client.readContract({address,abi:erc20Abi,functionName:"balanceOf",args:[owner],blockNumber}),
  ]);
  if(!code||code==="0x")throw new Error("A portfolio token could not be verified.");
  return {symbol,decimals,balance};
 }
 const [funding,native]=await Promise.all([token(USDT_ADDRESS),client.getBalance({address:owner,blockNumber})]);
 if(funding.symbol!=="USDT")throw new Error("The funding token could not be verified.");
 const usdt=fromUnits(funding.balance,funding.decimals);
 const cashMicros=valueMicros(funding.balance,funding.decimals,"1");let total=cashMicros;
 const positions:WalletSnapshot["positions"]=[],exposures:Record<string,string>={};
 // Small batches avoid overwhelming a public RPC; every read uses the same block.
 for(let i=0;i<discovery.tokens.length;i+=4){
  const batch=await Promise.all(discovery.tokens.slice(i,i+4).map(async asset=>{
   const verified=await token(asset.tokenContractAddress as Address);
   if(verified.symbol!==asset.tokenSymbol||String(verified.decimals)!==asset.decimals)throw new Error("Stock token metadata disagrees with the chain.");
   if(verified.balance===0n)return undefined;
   if(!/[1-9]/.test(asset.tokenPrice))throw new Error("A held stock has no usable live price.");
   const value=valueMicros(verified.balance,verified.decimals,asset.tokenPrice);
   return {ticker:asset.underlyingTicker,name:asset.underlyingName!,provider:asset.platformId,address:asset.tokenContractAddress,symbol:verified.symbol,quantity:fromUnits(verified.balance,verified.decimals),shares:shareExposure(verified.balance,verified.decimals,asset.tokenToShareRatio),valueUsd:fromUnits(value,6),priceUsd:asset.tokenPrice,value};
  }));
  for(const position of batch){if(!position)continue;const {value,...display}=position;positions.push(display);total+=value;exposures[position.ticker]=(BigInt(exposures[position.ticker]??"0")+value).toString();}
 }
 return {wallet:owner,chainId:56,blockNumber:blockNumber.toString(),checkedAt:new Date().toISOString(),marketFetchedAt:discovery.fetchedAt,bnb:fromUnits(native,18),usdt,cashMicros:cashMicros.toString(),totalMicros:total.toString(),exposures,positions,scope:"BSC USDT and the eight curated companies only. Stock values use live indicative provider prices; USDT is valued at $1. Other assets, fees, and cost basis are excluded."};
}
