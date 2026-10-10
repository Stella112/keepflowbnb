"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {WalletConnect} from "./wallet-connect";
import type {DryReceipt} from "../lib/execution/rules";
import {paperRequestId} from "../lib/paper/request-id";
import {displayQuantity} from "./display-quantity";

export function CheckResult({receipt}:{receipt:DryReceipt}){
 return <section className="quote-result" aria-live="polite"><p className="eyebrow">Read-only · {receipt.status.replaceAll("_"," ")}</p><h3>{receipt.bell.title}</h3><p>{receipt.reason}</p><p className="fine-print">No funds spent. No token approval submitted. No stock ownership created.</p>
 {receipt.snapshot&&<dl><dt>Wallet USDT</dt><dd>{receipt.snapshot.usdt}</dd><dt>Wallet snapshot</dt><dd>BSC block {receipt.snapshot.blockNumber}</dd></dl>}
 <div className="check-legs">{receipt.legs.map((leg,index)=><article key={leg.ticker} className="check-leg"><h3>{index+1}. {leg.ticker} · {leg.amount} USDT</h3><p className="eyebrow">{leg.status.replaceAll("_"," ")}</p><p>{leg.reason}</p>{leg.policy&&<p className="fine-print">Policy: {leg.policy.code} — {leg.policy.reason}</p>}{leg.quote&&<dl><dt>Estimated shares</dt><dd>{displayQuantity(leg.quote.estimatedShares)}</dd><dt>Approval needed</dt><dd>{leg.quote.approvalRequired?"Yes":"No"}</dd></dl>}{leg.simulation&&<dl><dt>Approval simulation</dt><dd>{leg.simulation.approvalStatus}</dd><dt>Purchase simulation</dt><dd>{leg.simulation.swapStatus}</dd></dl>}{leg.sponsorship&&<details><summary>Gas sponsorship check · {leg.sponsorship.eligibility.status.toLowerCase()}</summary><p>{leg.sponsorship.eligibility.status==="ELIGIBLE"?"Provider eligibility only; sponsored signing and execution are unverified.":"Sponsorship is unavailable for execution. No paid fallback or gasless transaction was performed."}</p><p className="fine-print">{leg.sponsorship.eligibility.code}</p>{leg.sponsorship.gas&&<p>Normal build gas estimate: {leg.sponsorship.gas.estimatedBnb} BNB. Estimated gas limit {leg.sponsorship.gas.limit}; this is not a final fee or gas already spent.</p>}{leg.sponsorship.blockers.map(blocker=><p className="fine-print" key={blocker}>{blocker}</p>)}</details>}{leg.quote&&<details><summary>Route details</summary><p className="fine-print">{leg.provider} · {leg.quote.route} · {leg.quote.estimatedTokens} {leg.quote.tokenSymbol}</p><p className="fine-print">Quote checked {leg.quote.fetchedAt}. Quotes are rebuilt under a local 15-second freshness rule; this is not a provider expiry guarantee.</p></details>}</article>)}</div>
 <dl><dt>Flow reserve</dt><dd>{receipt.reserveAmount} USDT</dd><dt>Rounding remainder</dt><dd>{receipt.roundingAmount} USDT</dd><dt>Flow version</dt><dd>{receipt.bell.version}</dd><dt>Requested budget</dt><dd>{receipt.amount} USDT</dd><dt>Transaction</dt><dd>None — dry run</dd></dl>
 <Link className="quiet" href={`/checks/${receipt.id}`}>Open saved check receipt ↗</Link></section>;
}
export function useCheckReceipt(initial?:DryReceipt,id?:string){
 const [receipt,setReceipt]=useState(initial),[error,setError]=useState("");
 useEffect(()=>{
  const receiptId=id??receipt?.id;if(!receiptId||(!id&&receipt?.status!=="CHECKING"))return;
  let cancelled=false,timer:ReturnType<typeof setTimeout>;const controller=new AbortController();
  async function poll(){try{const response=await fetch(`/api/execution/${receiptId}`,{cache:"no-store",signal:controller.signal});const body=await response.json();if(!response.ok)throw new Error(body.error??"Could not load this check.");if(cancelled)return;setReceipt(body);setError("");if(body.status==="CHECKING")timer=setTimeout(poll,2000);}catch(e){if(cancelled)return;setError(e instanceof Error?e.message:"Could not load this check.");}}
  void poll();return()=>{cancelled=true;controller.abort();clearTimeout(timer);};
 },[id,receipt?.id,receipt?.status]);
 return {receipt,setReceipt,error};
}
export function BellCheck({bellId}:{bellId:string}){
 const [wallet,setWallet]=useState(""),[amount,setAmount]=useState("20"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const check=useCheckReceipt();const {setReceipt}=check;const generation=useRef(0),retry=useRef<{signature:string;id:string}|null>(null);
 const connect=useCallback((address:string)=>{generation.current++;setWallet(address);setReceipt(undefined);setError("");setBusy(false);},[setReceipt]);
 async function run(){const current=++generation.current;setBusy(true);setError("");setReceipt(undefined);try{const intent={bellId,wallet,amount},signature=JSON.stringify(intent);if(retry.current?.signature!==signature)retry.current={signature,id:paperRequestId()};const response=await fetch("/api/execution",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:retry.current.id,...intent})});const body=await response.json();if(!response.ok){retry.current=null;throw new Error(body.error??"The check could not start.");}retry.current=null;if(current===generation.current)setReceipt(body);}catch(e){if(current===generation.current)setError(e instanceof Error?e.message:"The check failed.");}finally{if(current===generation.current)setBusy(false);}}
 return <div><p className="fine-print">Connect a wallet to check this Flow against its real BSC balances. No signature or funds are needed for the check.</p><WalletConnect onAddress={connect}/><label htmlFor="bell-check-budget">Flow budget (USDT)</label><input id="bell-check-budget" inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setReceipt(undefined);}} disabled={busy||check.receipt?.status==="CHECKING"}/><button className="button" disabled={!wallet||busy||check.receipt?.status==="CHECKING"} onClick={run}>{busy||check.receipt?.status==="CHECKING"?"Checking the real route…":"Check this Flow"}</button>{(error||check.error)&&<p role="alert" className="error">{error||check.error}</p>}{check.receipt&&<CheckResult receipt={check.receipt}/>}<p className="fine-print">Your saved spending rules apply. Checks use a maximum of 25 USDT per stock. Mainnet purchases stay disabled.</p></div>;
}

