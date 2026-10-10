'use client';
import {useEffect,useRef,useState} from 'react';
type Security={activeSessions:number;currentExpiresAt:string};
export function SessionSecurity(){
 const generation=useRef(0),controller=useRef<AbortController|null>(null),[state,setState]=useState<Security|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function request(revoke=false){controller.current?.abort();const active=++generation.current,abort=new AbortController();controller.current=abort;setBusy(true);setError('');setMessage('');try{
  const response=await fetch('/api/account/sessions',revoke?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'REVOKE_OTHERS'}),signal:abort.signal}:{cache:'no-store',signal:abort.signal}),data=await response.json();
  if(!response.ok)throw new Error(response.status===401?'Sign in again to manage sessions.':'Session access could not be verified.');
  if(data.financialAuthorization!=='UNCHANGED'||(revoke&&(!Number.isSafeInteger(data.revokedCount)||data.revokedCount<0))||!Number.isSafeInteger(data.activeSessions)||data.activeSessions<1||typeof data.currentExpiresAt!=='string'||!Number.isFinite(Date.parse(data.currentExpiresAt)))throw new Error('Session status could not be verified.');
  if(generation.current===active&&!abort.signal.aborted){setState(data);if(revoke)setMessage(`${data.revokedCount} other sign-in session${data.revokedCount===1?'':'s'} signed out.`);}
 }catch(error){if(generation.current===active&&!abort.signal.aborted){setState(null);setError(error instanceof Error?error.message:'Session status is unavailable.');}}finally{if(generation.current===active&&!abort.signal.aborted)setBusy(false);}}
 useEffect(()=>{void request();return()=>{generation.current++;controller.current?.abort();};},[]);
 return <section className='purchase-panel'><h2>Sign-in session security.</h2><p>Revoke other KeepFlow sign-ins while keeping this browser signed in. This does not revoke wallet permissions or prevent a new sign-in approved by your wallet.</p>{state&&<><p>{state.activeSessions} active sign-in session{state.activeSessions===1?'':'s'}.</p><p className='fine-print'>This session expires {new Date(state.currentExpiresAt).toLocaleString('en-GB',{timeZone:'Africa/Lagos'})} WAT.</p><button className='button secondary' disabled={busy||state.activeSessions<=1} onClick={()=>request(true)}>Sign out other browsers</button></>}<button className='quiet' disabled={busy} onClick={()=>request()}>Refresh sign-in sessions</button>{busy&&<p role='status'>Checking session access…</p>}{error&&<p role='alert' className='error'>{error}</p>}{message&&<p role='status' className='notice'>{message}</p>}</section>;
}
