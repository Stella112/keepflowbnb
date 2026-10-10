import 'server-only';
import {getDiscovery} from '../binance/rwa';
import {getBinanceClient} from '../binance/client';
import {underlyingBinding,buildUnderlyingResearch,underlyingMarketSchema,underlyingProfileSchema,underlyingProviderSchema} from './underlying';
import {curatedTickers} from '../binance/rwa-schemas';
import {z} from 'zod';
export async function getUnderlyingResearch(ticker:unknown,provider:unknown){
 const checked=z.enum(curatedTickers).parse(ticker),issuer=underlyingProviderSchema.parse(provider),discovery=await getDiscovery();
 const matches=discovery.tokens.filter(token=>token.underlyingTicker===checked&&token.platformId===issuer&&token.binanceChainId==='56');
 if(matches.length!==1)throw Error('REPRESENTATION_UNAVAILABLE_OR_AMBIGUOUS');
 const selected=underlyingBinding(matches[0]),client=getBinanceClient(),query={binanceChainId:'56',tokenContractAddress:selected.contract};
 const [profile,market]=await Promise.allSettled([client.get('/api/v1/dex/market/rwa/underlying-profile',query,underlyingProfileSchema).then(data=>({data,fetchedAt:new Date().toISOString()})),client.get('/api/v1/dex/market/rwa/underlying-market',query,underlyingMarketSchema).then(data=>({data,fetchedAt:new Date().toISOString()}))]);
 return buildUnderlyingResearch(selected,profile.status==='fulfilled'?profile.value.data:undefined,market.status==='fulfilled'?market.value.data:undefined,{profile:profile.status==='fulfilled'?profile.value.fetchedAt:undefined,market:market.status==='fulfilled'?market.value.fetchedAt:undefined});
}
