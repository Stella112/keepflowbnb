import {privateKeyToAccount} from 'viem/accounts';
import {randomBytes,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const base='https://56.125.248.192:80',cookies=new Map();
async function request(path,body,expected=200){const headers=new Headers();if(body){headers.set('Content-Type','application/json');headers.set('Origin',base);}if(cookies.size)headers.set('Cookie',[...cookies].map(([k,v])=>k+'='+v).join('; '));const response=await fetch(base+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(90000)});for(const line of response.headers.getSetCookie()){const pair=line.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}assert.equal(response.status,expected,`${path}: unexpected HTTP ${response.status}`);return response.json();}
const signer=privateKeyToAccount('0x'+randomBytes(32).toString('hex'));
const challenge=await request('/api/account',{action:'CHALLENGE',address:signer.address});await request('/api/account',{action:'VERIFY',signature:await signer.signMessage({message:challenge.message})});
try{
 const {intent}=await request('/api/intents',{requestId:randomUUID(),ticker:'NVDA',provider:'bstock',amount:'5'});assert.equal(intent.executionAvailable,false);
 const status=await request(`/api/intents/${intent.id}/submission`);assert.equal(status.executionAvailable,false);assert.equal(status.submission,null);assert.match(status.confirmedFingerprint,/^[a-f0-9]{64}$/);
 await request(`/api/intents/${intent.id}/submission`,{action:'PREPARE',confirmedFingerprint:status.confirmedFingerprint,userConfirmed:true},403);
 const approval=await request(`/api/intents/${intent.id}/approval`);assert.equal(approval.enabled,false);
 await request(`/api/intents/${intent.id}/approval`,{action:'PREPARE',userConfirmed:true},403);
 const {bell}=await request('/api/bells',{title:'Guarded automation acceptance',description:'Synthetic unfunded owner acceptance',assets:[{ticker:'NVDA',weightBps:3000},{ticker:'MSFT',weightBps:3000},{ticker:'AAPL',weightBps:3000}],reserveBps:1000});
 const account=await request('/api/paper');
 const basketRequest={action:'CREATE',requestId:randomUUID(),bellId:bell.id,bellVersion:bell.version,bellHash:bell.contentHash,policyVersion:account.policyVersion,amount:'5'};
 const {session:basket}=await request('/api/baskets',basketRequest);assert.equal(basket.executionAvailable,false);assert.equal(basket.approvalAvailable,false);assert.equal(basket.legs.length,3);assert.equal(basket.retainedReserveUsd,'0.5');
 assert.equal((await request('/api/baskets',basketRequest)).session.id,basket.id);
 await request('/api/baskets',{action:'SUBMIT',id:basket.id,userConfirmed:true},409);
 const preparedBasket=await request('/api/baskets',{action:'PREPARE',id:basket.id});assert.equal(preparedBasket.session.state,'PARTIAL_STOP');assert.equal(preparedBasket.session.legs[0].state,'BLOCKED');assert.equal(preparedBasket.session.legs[1].state,'PLANNED');const cancelled=await request('/api/baskets',{action:'CANCEL',id:basket.id,expectedRevision:preparedBasket.session.revision});assert.equal(cancelled.session.state,'CANCELLED');assert.ok(cancelled.session.legs.every(leg=>leg.state==='CANCELLED'));
 const {plan}=await request('/api/automation',{action:'CREATE_READ_ONLY',requestId:randomUUID(),bellId:bell.id,bellVersion:bell.version,bellHash:bell.contentHash,policyVersion:account.policyVersion,maxRunUsd:'5',cadence:'DAILY',weekday:1});assert.equal(plan.enabled,false);assert.equal(plan.financialAuthorization,'NONE');
 const enabled=await request('/api/automation',{action:'ENABLE_READ_ONLY',id:plan.id});assert.equal(enabled.plan.enabled,true);assert.equal(enabled.liveAutomationAvailable,false);
 const check=await request('/api/automation',{action:'CHECK_READ_ONLY',id:plan.id});assert.equal(check.run.state,'SKIPPED');assert.deepEqual(check.run.intentIds,[]);assert.equal(check.executionAvailable,false);
 await request('/api/automation',{action:'PAUSE',id:plan.id});await request('/api/automation',{action:'REVOKE',id:plan.id});await request('/api/automation',{action:'ENABLE_READ_ONLY',id:plan.id},409);
 const history=await request('/api/automation?id='+plan.id);assert.equal(history.runs.length,1);assert.equal(history.runs[0].state,'SKIPPED');
 await request('/api/account',{action:'LOGOUT'});await request(`/api/intents/${intent.id}/submission`,undefined,401);await request('/api/automation',undefined,401);await request('/api/baskets?id='+basket.id,undefined,401);await request('/api/transactions/'+intent.id,undefined,401);
 console.log('PASS deployed initial private status, disabled swap/approval writes, synthetic-owner read-only schedule create/enable/pause/revoke, actual unfunded-wallet due check skipped safely, no live authority, logout protection. No wallet transaction, deposit or paid call.');
}catch(error){await request('/api/account',{action:'LOGOUT'}).catch(()=>{});throw error;}

