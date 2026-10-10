import {z} from "zod";
import {curatedTickers,tokensSchema,type RwaToken} from "../binance/rwa-schemas.ts";
const tickerSchema=z.enum(curatedTickers);
const sourceUrl="https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data";
export type StockBrief={status:"FACTUAL_DATA_ONLY";ticker:typeof curatedTickers[number];source:{name:"Binance RWA discovery";url:string;fetchedAt:string};representations:{provider:string;chainId:56;contract:string;tokenSymbol:string;tokenName:string;underlyingName:string;decimals:number;tokenPriceUsd:string;tokenToShareRatio:string;derivedReferencePriceUsd:string;status:RwaToken["statusInfo"]}[];paidProviderConfigured:false;analystResearchAvailable:false;limitations:string[]};
export function buildStockBrief(ticker:unknown,tokens:unknown,fetchedAt:unknown):StockBrief{
 const checked=tickerSchema.parse(ticker),data=tokensSchema.parse(tokens);
 const time=z.iso.datetime({offset:true}).parse(fetchedAt);const millis=Date.parse(time);
 if(!Number.isFinite(millis)||millis>Date.now())throw new Error("Discovery timestamp is invalid or in the future.");
 const seen=new Set<string>();const matching=data.filter(token=>token.underlyingTicker===checked&&token.binanceChainId==="56"&&[1,3].includes(token.assetType??-1)&&!!token.underlyingName);
 if(!matching.length)throw new Error("No eligible current discovery representation exists for this ticker.");
 const representations=matching.map(token=>{const key=token.tokenContractAddress.toLowerCase();if(seen.has(key))throw new Error("Duplicate stock contract in discovery.");seen.add(key);return {provider:token.platformId,chainId:56 as const,contract:token.tokenContractAddress,tokenSymbol:token.tokenSymbol,tokenName:token.tokenName,underlyingName:token.underlyingName!,decimals:Number(token.decimals),tokenPriceUsd:token.tokenPrice,tokenToShareRatio:token.tokenToShareRatio,derivedReferencePriceUsd:token.referencePrice,status:{...token.statusInfo}};});
 return {status:"FACTUAL_DATA_ONLY",ticker:checked,source:{name:"Binance RWA discovery",url:sourceUrl,fetchedAt:time},representations,paidProviderConfigured:false,analystResearchAvailable:false,limitations:["Source-reported indicative onchain token prices, not executable quotes or verified stock exchange prices.","Reference price is provider-reported derived per-share token price, not independent underlying market data.","Prices and trading status can change after the displayed discovery timestamp; no freshness or execution guarantee is made.","This factual brief contains no analyst reports, fundamentals, rating, forecast or investment recommendation."]};
}
