import {readFileSync,unlinkSync} from 'node:fs';
import {z} from 'zod';
import {onboardingLocalRunner} from '../lib/agents/onboarding.ts';
// Invoke only after the owner has confirmed the displayed code in Binance App.
try{
 const challenge=z.object({qrCodeId:z.string().uuid(),expireAt:z.string()}).passthrough().parse(JSON.parse(readFileSync('logs/agentic-auth-challenge.json','utf8')));
 if(Number(challenge.expireAt)<=Date.now())throw Error('EXPIRED');
 const run=onboardingLocalRunner(process.cwd());
 const verified=JSON.parse(await run('VERIFY',challenge.qrCodeId));
 if(verified.success!==true||verified.data?.status!=='SUCCESS')throw Error('NOT_CONFIRMED');
 const state=JSON.parse(await run('STATUS'));if(state.success!==true||state.data?.status!=='CONNECTED')throw Error('NOT_CONNECTED');
 const addresses=z.object({success:z.literal(true),data:z.object({addresses:z.array(z.object({binanceChainId:z.string(),address:z.string().max(128)})).max(32)})}).parse(JSON.parse(await run('ADDRESS'))).data.addresses.filter(item=>item.binanceChainId==='56');
 if(addresses.length!==1||!/^0x[0-9a-fA-F]{40}$/.test(addresses[0].address))throw Error('BSC_BINDING_UNVERIFIED');
 unlinkSync('logs/agentic-auth-challenge.json');
 console.log(JSON.stringify({status:'AUTHENTICATED_LOCAL_OPERATOR',wallet:addresses[0].address,financialAuthorization:'NONE',executionAvailable:false}));
}catch{console.error('Agentic Wallet authentication not verified. A fresh QR challenge may be required; financial execution remains disabled.');process.exitCode=1;}
