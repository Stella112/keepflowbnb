"use client";
import { useEffect, useState } from "react";
import { tokensSchema, marketLabel, type RwaToken } from "../../../lib/binance/rwa-schemas";
import { PaperBuy } from "../../paper-buy";
import {QuotePreview} from "../../quote-preview";
import {IntentPreview} from "../../intent-preview";
import {UnderlyingResearchView} from '../../underlying-research';
import {PaidResearch} from "../../paid-research";
import {StockResearch} from "../../stock-research";
import {AgenticResearch} from "../../agentic-research";
import {PriceGap} from "../../price-gap";
const issuerName = (id: string) => id === "ondo" ? "Ondo" : id === "bstock" ? "bStocks" : id;
export function StockView({ ticker }: { ticker: string }) {
  const [tokens,setTokens] = useState<RwaToken[]>([]);
  const [provider,setProvider] = useState("");
  const [fetchedAt,setFetchedAt] = useState("");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [refresh,setRefresh] = useState(0);
  useEffect(() => {
    const controller=new AbortController();setLoading(true);setError("");
    fetch("/api/stocks",{cache:"no-store",signal:controller.signal}).then(async(response)=>{
      if(!response.ok)throw new Error();
      const data:unknown=await response.json();
      if(typeof data!=="object"||!data||!("tokens" in data)||!("fetchedAt" in data)||typeof data.fetchedAt!=="string")throw new Error();
      const rows=tokensSchema.parse(data.tokens).filter((token)=>token.underlyingTicker===ticker);
      if(!rows.length)throw new Error();
      if(controller.signal.aborted)return;
      setTokens(rows);setFetchedAt(data.fetchedAt);setProvider((current)=>rows.some((row)=>row.platformId===current)?current:(rows.find(row=>row.platformId==="bstock"&&row.statusInfo.openState)??rows.find(row=>row.statusInfo.openState)??rows[0]).platformId);
    }).catch(()=>{if(!controller.signal.aborted){setTokens([]);setError("Data temporarily unavailable.");}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[ticker,refresh]);
  // Links to #buy (for example from Buy your first stock) arrive before the panel exists, so scroll once it renders.
  useEffect(()=>{if(!loading&&tokens.length&&window.location.hash==="#buy")document.getElementById("buy")?.scrollIntoView({behavior:"smooth",block:"start"});},[loading,tokens.length]);
  const [panelInView,setPanelInView]=useState(false);
  useEffect(()=>{const panel=document.getElementById("buy");if(!panel||typeof IntersectionObserver==="undefined")return;const observer=new IntersectionObserver(([entry])=>setPanelInView(entry.isIntersecting),{threshold:0.05});observer.observe(panel);return()=>observer.disconnect();},[loading,tokens.length]);
  const selected=tokens.find((token)=>token.platformId===provider);
  if(loading)return <section className="empty" aria-live="polite"><p>Checking live stock data…</p></section>;
  if(error||!selected)return <section className="empty"><h1>{ticker}</h1><p role="alert">{error||"Data temporarily unavailable."}</p><button onClick={()=>setRefresh(refresh+1)}>Try again</button></section>;
  return <div className="stock-layout"><section className="stock-overview"><p className="eyebrow">{ticker} · Tokenized {selected.assetType===3?"ETF":"stock"}</p><h1>{selected.underlyingName}</h1><p className="market-status"><span className="status-dot"/>{marketLabel(selected)}</p><p className="intro">Own a tokenized representation of {selected.underlyingName} on BNB Smart Chain, bought with USDT from your own wallet.</p>
    <div className="value-block"><p>Onchain token price</p><strong>{Number(selected.tokenPrice).toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2})}</strong><p>Per {selected.tokenSymbol} token · {issuerName(provider)}</p></div>
    <p className="fine-print">Retrieved {new Date(fetchedAt).toLocaleString("en-GB",{timeZone:"Africa/Lagos"})} WAT. This is an indicative token valuation, not an executable purchase price.</p><button className="quiet" onClick={()=>setRefresh(refresh+1)}>Refresh data ↻</button>
    <details><summary>Representation details</summary><dl><dt>Issuer</dt><dd>{issuerName(provider)}</dd><dt>Token symbol</dt><dd>{selected.tokenSymbol}</dd><dt>Token-to-share ratio</dt><dd>{selected.tokenToShareRatio}</dd><dt>Token decimals</dt><dd>{selected.decimals}</dd><dt>Network</dt><dd>BNB Smart Chain (56)</dd><dt>Contract</dt><dd className="address">{selected.tokenContractAddress}</dd><dt>Token-derived share value</dt><dd>${selected.referencePrice}</dd></dl><p className="fine-print">The reference value is converted from the token price per underlying share. It is not an official stock-exchange quote. Issuers are not ranked by token quantity.</p></details></section>
  <section className="stock-research"><PriceGap ticker={ticker}/><UnderlyingResearchView ticker={ticker} provider={provider} contract={selected.tokenContractAddress}/><StockResearch ticker={ticker}/><PaidResearch key={ticker} ticker={ticker}/><AgenticResearch key={`ag-${ticker}`} ticker={ticker}/></section>{!panelInView&&<a className="button mobile-buy" href="#buy" onClick={(e)=>{e.preventDefault();document.getElementById("buy")?.scrollIntoView({behavior:"smooth",block:"start"});}}>Buy {ticker}</a>}<aside className="purchase-panel" id="buy"><p className="eyebrow"><span className="mode-tag real">Real trading</span> BNB Smart Chain · real USDT</p><h2>Buy {ticker}.</h2><details><summary>Issuer · {issuerName(provider)}</summary><label htmlFor="issuer">Issuer</label><select id="issuer" value={provider} onChange={(event)=>setProvider(event.target.value)}>{tokens.map((token)=><option key={token.tokenContractAddress} value={token.platformId}>{issuerName(token.platformId)}</option>)}</select><p className="fine-print">Available issuers have different token-to-share ratios. Each receipt records the representation actually used.</p></details><IntentPreview ticker={ticker} provider={provider}/><details><summary>Indicative quote only</summary><QuotePreview ticker={ticker} provider={provider}/></details><details className="paper-option"><summary><span className="mode-tag paper">Paper trading</span> Practice with virtual money instead</summary><PaperBuy ticker={ticker} provider={provider}/></details></aside></div>;
}




