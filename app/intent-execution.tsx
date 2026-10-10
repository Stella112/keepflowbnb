"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from 'react';
import {WalletConnect,type Provider} from './wallet-connect';
import {connectedWalletSigner} from '../lib/execution/wallet-signer';
import type {PinnedTransaction} from '../lib/execution/intents/model';
type Status={executionAvailable:boolean;confirmedFingerprint:string;submission?:{state:string;hash?:string|null}|null};
export function IntentExecution({id,wallet,amount,ticker}:{id:string;wallet:string;amount:string;ticker:string}){
 const [status,setStatus]=useState<Status>(),[provider,setProvider]=useState<Provider>(),[address,setAddress]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[hash,setHash]=useState('');
 const locked=useRef(false),mounted=useRef(true),ticket=useRef<string|undefined>(undefined);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const connect=useCallback((value:string,selected?:Provider)=>{setAddress(value);setProvider(selected);},[]);
 const endpoint=`/api/intents/${encodeURIComponent(id)}/submission`;
 async function refresh(){setBusy(true);setMessage('');try{const response=await fetch(endpoint,{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error??'Status unavailable.');setStatus(data);}catch{setMessage('Execution status could not be verified.');}finally{setBusy(false);}}
 async function observe(value:string){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'OBSERVE',...(ticket.current?{ticket:ticket.current}:{}),hash:value})}),data=await response.json();if(!response.ok)throw Error(data.error??'Confirmation is not yet verified.');setStatus(data);setMessage('Chain status refreshed. Pending or unknown transactions must not be sent again.');}
 async function submit(){if(locked.current||!provider||!status?.executionAvailable||address.toLowerCase()!==wallet.toLowerCase())return;locked.current=true;setBusy(true);setMessage('Verifying current rules before requesting wallet confirmation.');
 try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'PREPARE',confirmedFingerprint:status.confirmedFingerprint,userConfirmed:true})}),data=await response.json();if(!response.ok)throw Error(data.error??'The purchase could not pass its final checks.');
 const handoff=data.handoff as {ticket:string;transaction:PinnedTransaction;expiresAt:string}|undefined;
 if(!handoff){setMessage('This intent already has a submission record. Reconcile it; do not resend.');await refresh();return;}
 ticket.current=handoff.ticket;
 if(!mounted.current||Date.parse(handoff.expiresAt)<=Date.now())throw Error('The handoff expired. Check status before doing anything else.');
 setMessage('Review the exact transaction in your wallet.');const txHash=await connectedWalletSigner(provider,true).submitExactTransaction(handoff.transaction);setHash(txHash);setMessage('Transaction sent. Checking its chain receipt.');await observe(txHash);
 }catch(error){setMessage(`${error instanceof Error?error.message:'Wallet outcome is unknown.'} This intent will not be automatically resent. If your wallet shows a transaction hash, use it below.`);}finally{setBusy(false);}}
 useEffect(()=>{void refresh();
},[id]);
 return <section aria-label="Wallet purchase"><h3>Step 4 · Confirm the purchase</h3><p>{amount} USDT for {ticker} on BNB Smart Chain.</p><button className="quiet" disabled={busy} onClick={refresh}>Refresh purchase status</button>{status&&!status.executionAvailable&&<p>Live purchases are disabled. Paper trading and read-only checks remain available.</p>}{status?.executionAvailable&&<><WalletConnect onAddress={connect}/><p className="fine-print">The connected wallet must match your signed-in wallet. A purchase uses real USDT and may require BNB for gas.</p><button className="button" disabled={busy||locked.current||!provider||address.toLowerCase()!==wallet.toLowerCase()} onClick={submit}>Confirm {amount} USDT purchase in wallet</button></>}{status?.submission&&<p>Submission: {status.submission.state}{status.submission.hash&&<> · <span className="address">{status.submission.hash}</span></>}</p>}{status?.submission&&['CONFIRMED','REVERTED'].includes(status.submission.state)&&<p><Link href={`/transactions/${id}`}>Open verified transaction receipt ↗</Link></p>}<details><summary>Recover a submitted transaction</summary><label>Transaction hash<input value={hash} onChange={e=>setHash(e.target.value)} placeholder="0x…" autoComplete="off"/></label><button className="quiet" disabled={busy||!/^0x[0-9a-fA-F]{64}$/.test(hash)} onClick={async()=>{setBusy(true);try{await observe(hash);}catch{setMessage('The transaction could not yet be verified against this purchase. Do not resend.');}finally{setBusy(false);}}}>Check transaction onchain</button></details>{message&&<p role="status">{message}</p>}</section>;
}

