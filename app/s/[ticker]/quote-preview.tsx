"use client";
import { useEffect, useRef, useState } from "react";
import { checkedPreviewSchema, type Preview } from "../../../lib/binance/preview-schemas";
export function QuotePreview({ticker,provider,wallet}:{ticker:string;provider:string;wallet:string}){
  const [amount,setAmount]=useState("5");const [preview,setPreview]=useState<Preview>();
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const pending=useRef<AbortController|null>(null);
  useEffect(()=>{pending.current?.abort();setBusy(false);setPreview(undefined);setError("");return()=>pending.current?.abort();},[ticker,provider,wallet,amount]);
  async function estimate(){
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    setBusy(true);setError("");setPreview(undefined);
    try{
      const response=await fetch("/api/quote",{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({ticker,provider,wallet,amount})});
      const payload:unknown=await response.json();
      if(!response.ok)throw new Error(typeof payload==="object"&&payload&&"error"in payload&&typeof payload.error==="string"?payload.error:"The estimate is temporarily unavailable.");
      const parsed=checkedPreviewSchema.parse(payload);
      if(parsed.ticker!==ticker||parsed.provider!==provider||parsed.amount!==amount)throw new Error("The estimate changed. Request it again.");
      if(!controller.signal.aborted)setPreview(parsed);
    }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:"The estimate is temporarily unavailable.");}
    finally{if(pending.current===controller)setBusy(false);}
  }
  return <div className="quote-panel"><label htmlFor="amount">You pay in USDT</label><input id="amount" inputMode="decimal" value={amount} onChange={(event)=>setAmount(event.target.value)} aria-describedby="amount-help"/><p id="amount-help" className="fine-print">Read-only estimates up to 25 USDT. Nothing is signed or spent.</p><button className="button" onClick={estimate} disabled={busy||!wallet}>{busy?"Checking purchase…":"Get purchase estimate"}</button>{error&&<p role="alert" className="error">{error}</p>}{preview&&<div className="quote-result" aria-live="polite"><p className="eyebrow">Live estimate</p><strong>{Number(preview.estimatedShares).toLocaleString("en-US",{maximumFractionDigits:8})} shares equivalent</strong><dl><dt>You pay</dt><dd>{preview.amount} USDT</dd><dt>Estimated tokens</dt><dd>{preview.estimatedTokens} {preview.tokenSymbol}</dd><dt>Estimated network cost</dt><dd>{preview.estimatedNetworkFeeUsd?`$${preview.estimatedNetworkFeeUsd}`:"Unavailable"}</dd><dt>Price impact</dt><dd>{preview.priceImpactPercent?`${preview.priceImpactPercent}%`:"Unavailable"}</dd><dt>USDT balance</dt><dd>{preview.usdtBalance}</dd><dt>Token permission</dt><dd>{preview.approvalRequired?"Exact amount approval needed":"Already sufficient"}</dd></dl><p className="fine-print">Price impact is different from slippage. The token-to-share ratio estimates economic exposure, not directly held traditional shares.</p>{!preview.balanceSufficient&&<p className="notice">Your wallet does not contain enough USDT for this amount.</p>}<p className="notice">{preview.simulation.message}</p>{preview.simulation.approvalStatus!=="NOT_NEEDED"&&<p className="fine-print">Exact amount approval simulation: {preview.simulation.approvalStatus.toLowerCase()}. This check does not grant token permission.</p>}</div>}</div>;
}

