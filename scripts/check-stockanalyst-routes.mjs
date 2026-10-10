import {privateKeyToAccount} from 'viem/accounts';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='https://56.125.248.192:80',cookies=new Map();
async function request(path,body,expected=200){const headers=new Headers();if(body){headers.set('Content-Type','application/json');headers.set('Origin',base);}if(cookies.size)headers.set('Cookie',[...cookies].map(([key,value])=>key+'='+value).join('; '));const response=await fetch(base+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});for(const line of response.headers.getSetCookie()){const pair=line.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}assert.equal(response.status,expected,`${path} returned ${response.status}`);return response.json();}
await request('/api/research/stockanalyst',{action:'PRICE',ticker:'NVDA'},401);
const signer=privateKeyToAccount('0x'+randomBytes(32).toString('hex')),challenge=await request('/api/account',{action:'CHALLENGE',address:signer.address});await request('/api/account',{action:'VERIFY',signature:await signer.signMessage({message:challenge.message})});
try{
 const price=await request('/api/research/stockanalyst',{action:'PRICE',ticker:'NVDA'});assert.equal(price.paymentSubmitted,false);assert.equal(price.executionAvailable,false);assert.equal(price.feeAuthorizationAvailable,false);assert.equal(price.result.amountAtomic,'100000000000000000');assert.equal(price.result.acceptedTokens.length,4);
 const offer=await request('/api/research/stockanalyst',{action:'OFFER',ticker:'NVDA'});assert.equal(offer.paymentSubmitted,false);assert.equal(offer.feeOffer.wallet.toLowerCase(),signer.address.toLowerCase());assert.equal(offer.feeAuthorizationAvailable,false);
 await request('/api/research/stockanalyst',{action:'AUTHORIZE',offerId:offer.feeOffer.id,fingerprint:offer.feeOffer.fingerprint,asset:price.result.acceptedTokens.find(token=>token.symbol==='USD1').requirement.asset,userConfirmed:true},403);
 await request('/api/research/stockanalyst',{action:'PRICE',ticker:'INVALID'},400);
 const id='x402_'+'0'.repeat(32);await request('/api/research/stockanalyst/jobs/'+id,undefined,503);
 await request('/api/account',{action:'LOGOUT'});await request('/api/research/stockanalyst',{action:'OFFER',ticker:'NVDA'},401);await request('/api/research/stockanalyst/jobs/'+id,undefined,401);
 mkdirSync('test-results',{recursive:true});writeFileSync('test-results/stockanalyst-routes-proof.json',JSON.stringify({result:'PASS',checkedAt:new Date().toISOString(),provider:price.result.provider,merchant:price.result.payTo,tokens:price.result.acceptedTokens.map(token=>({symbol:token.symbol,method:token.requirement.extra.assetTransferMethod})),actualPriceAndUnpaidOffer:true,authorizationDisabled:true,ownerWalletBound:true,logoutProtected:true,paidCalls:0,walletTransactions:0},null,2));console.log('PASS actual VPS provider fees and unpaid402 offer; owner binding, disabled fee authority, strict ticker and logout protections. No paid request or wallet transaction.');
}finally{await request('/api/account',{action:'LOGOUT'}).catch(()=>{});}
