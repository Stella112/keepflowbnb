import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {AgenticWalletStore,startAgenticConnect,verifyAgenticConnect,disconnectAgentic,officialLoginUrl,type ConnectDeps} from '../lib/agents/agentic-wallets.ts';
import type {OnboardingCommand} from '../lib/agents/onboarding.ts';

const QR='11111111-1111-4111-8111-111111111111';
const ok=(data:object)=>JSON.stringify({success:true,data});
function fakeCli(state:{approved:boolean;address:string;alreadyConnected?:boolean;url?:string},calls:{dir:string;command:OnboardingCommand}[]){
 return (dir:string)=>async(command:OnboardingCommand)=>{calls.push({dir,command});
  if(command==='SIGNIN')return state.alreadyConnected?ok({status:'ALREADY_CONNECTED'}):ok({qrCodeId:QR,expireAt:String(Date.now()+300_000),urlForWeb:state.url??'https://web3.binance.com/en/agent-login',pairingCode:'AB12CD'});
  if(command==='VERIFY'){if(!state.approved)throw Error('SETUP_CLI_FAILED');return ok({status:'SUCCESS'});}
  if(command==='STATUS')return ok({status:state.approved||state.alreadyConnected?'CONNECTED':'UNCONNECTED'});
  return ok({addresses:[{binanceChainId:'56',address:state.address},{binanceChainId:'1',address:'0x'+'e'.repeat(40)}]});
 };
}
function deps(state:Parameters<typeof fakeCli>[0],extra:Partial<ConnectDeps>={}){
 const calls:{dir:string;command:OnboardingCommand}[]=[],removed:string[]=[];
 const d:ConnectDeps={store:new AgenticWalletStore(new DatabaseSync(':memory:')),runner:fakeCli(state,calls),dirFor:o=>`/users/${o}`,prepareDir:async()=>{},removeDir:async dir=>{removed.push(dir);},now:()=>Date.now(),maxWallets:5,...extra};
 return {d,calls,removed};
}

test('a user connects their own Agentic Wallet through the official QR and only after Binance confirms',async()=>{
 const state={approved:false,address:'0x'+'A'.repeat(40)};const {d,calls}=deps(state);
 const challenge=await startAgenticConnect('alice',d);
 assert.equal(challenge.status,'AWAITING_APPROVAL');
 assert.equal(d.store.read('alice'),undefined);
 await assert.rejects(verifyAgenticConnect('alice',d),/NOT_APPROVED/);
 assert.ok(d.store.pending('alice'),'code stays valid after an early confirm');
 state.approved=true;
 const done=await verifyAgenticConnect('alice',d);
 assert.equal(done.wallet,'0x'+'a'.repeat(40));
 assert.equal(d.store.read('alice')!.dir,'/users/alice');
 assert.equal(d.store.pending('alice'),undefined);
 assert.ok(calls.every(c=>c.dir==='/users/alice'),'every CLI call used only this user\'s session directory');
});

test('sessions are isolated per user and one Agentic Wallet cannot be linked to two accounts',async()=>{
 const shared='0x'+'b'.repeat(40);
 const {d,calls}=deps({approved:true,address:shared});
 await startAgenticConnect('alice',d);await verifyAgenticConnect('alice',d);
 await startAgenticConnect('bob',d);
 await assert.rejects(verifyAgenticConnect('bob',d),/WALLET_ALREADY_LINKED/);
 assert.equal(d.store.read('bob'),undefined);
 assert.ok(calls.filter(c=>c.dir==='/users/bob').length>0&&calls.filter(c=>c.dir==='/users/alice').length>0);
});

test('expired codes, capacity and non-Binance login pages are refused',async()=>{
 let now=Date.now();
 const {d}=deps({approved:true,address:'0x'+'c'.repeat(40)},{now:()=>now});
 await startAgenticConnect('alice',d);now+=301_000;
 await assert.rejects(verifyAgenticConnect('alice',d),/SIGNIN_EXPIRED/);
 const full=deps({approved:true,address:'0x'+'d'.repeat(40)},{maxWallets:0});
 await assert.rejects(startAgenticConnect('carol',full.d),/CAPACITY_REACHED/);
 const phishing=deps({approved:false,address:'0x'+'d'.repeat(40),url:'https://binance.evil.example/en/agent-login'});
 await assert.rejects(startAgenticConnect('dave',phishing.d),/INVALID_SETUP_RESPONSE/);
 assert.equal(officialLoginUrl('https://app.binance.com/uni-qr/abc_123'),true);
 assert.equal(officialLoginUrl('https://web3.binance.com/en/agent-login#x'),false);
});

test('an already signed-in session binds directly; disconnect forgets it and removes the session directory',async()=>{
 const {d,removed}=deps({approved:false,alreadyConnected:true,address:'0x'+'f'.repeat(40)});
 const result=await startAgenticConnect('erin',d);
 assert.equal(result.status,'CONNECTED');
 await disconnectAgentic('erin',d);
 assert.equal(d.store.read('erin'),undefined);
 assert.deepEqual(removed,['/users/erin']);
});
