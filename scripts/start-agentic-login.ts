import {writeFileSync,mkdirSync} from 'node:fs';
import {z} from 'zod';
import {onboardingLocalRunner} from '../lib/agents/onboarding.ts';
// Starts an owner-requested login challenge only. App permissions and login
// completion remain human actions; this never invokes verify or wallet writes.
try{
 const response=z.object({success:z.literal(true),data:z.record(z.string(),z.unknown())}).parse(JSON.parse(await onboardingLocalRunner(process.cwd())('SIGNIN')));
 if(response.data.status==='ALREADY_CONNECTED'){console.log(JSON.stringify({status:'ALREADY_CONNECTED',financialAuthorization:'NONE'}));}
 else{
  const challenge=z.object({qrCodeId:z.string().uuid(),expireAt:z.string().regex(/^\d{10,16}$/),urlForWeb:z.string().max(8192),pairingCode:z.string().regex(/^[A-Za-z0-9]{6}$/)}).parse(response.data),url=new URL(challenge.urlForWeb);
  if(url.protocol!=='https:'||!((url.hostname==='web3.binance.com'&&url.pathname==='/en/agent-login')||(url.hostname==='app.binance.com'&&/^\/uni-qr\/[A-Za-z0-9_-]{1,80}$/.test(url.pathname)&&!url.search))||url.username||url.password||url.port||url.hash||Number(challenge.expireAt)<=Date.now()||Number(challenge.expireAt)>Date.now()+600000)throw Error();
  mkdirSync('logs',{recursive:true});writeFileSync('logs/agentic-auth-challenge.json',JSON.stringify(challenge),{mode:0o600});
  console.log(JSON.stringify({status:'AWAITING_BINANCE_APP',urlForWeb:challenge.urlForWeb,pairingCode:challenge.pairingCode,expiresAt:new Date(Number(challenge.expireAt)).toISOString(),financialAuthorization:'NONE'}));
 }
}catch{console.error('Agentic Wallet login challenge unavailable; no login or financial authority confirmed.');process.exitCode=1;}


