"use client";
import {useEffect,useState} from "react";
import type {StockGap,Candle} from "../lib/binance/market-schemas";
const issuerName=(id:string)=>id==="ondo"?"Ondo":id==="bstock"?"bStocks":id;
const pct=(value:number)=>`${value>0?"+":""}${value.toFixed(2)}%`;
function Sparkline({candles}:{candles:Candle[]}){
 if(candles.length<2)return <p className="fine-print">Too few on-chain trades in the last 72 hours to draw a chart.</p>;
 const values=candles.flatMap(c=>[c.high,c.low]),min=Math.min(...values),max=Math.max(...values),span=max-min||1,w=300,h=72;
 const x=(i:number)=>i/(candles.length-1)*w,y=(v:number)=>h-((v-min)/span)*(h-8)-4;
 const path=candles.map((c,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(c.close).toFixed(1)}`).join("");
 return <svg className="gap-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Hourly on-chain closes from ${candles[0].close.toFixed(2)} to ${candles[candles.length-1].close.toFixed(2)} USD`} preserveAspectRatio="none"><path d={path} className="gap-line"/></svg>;
}
export function PriceGap({ticker}:{ticker:string}){
 const [gap,setGap]=useState<StockGap>(),[error,setError]=useState(""),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(false);
 useEffect(()=>{const pending=new AbortController();setBusy(true);setError("");fetch(`/api/stocks/${encodeURIComponent(ticker)}/gap`,{cache:"no-store",signal:pending.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error??"Prices unavailable.");if(body.ticker!==ticker||!Array.isArray(body.legs))throw Error("Prices could not be verified.");if(!pending.signal.aborted)setGap(body);}).catch(e=>{if(!pending.signal.aborted)setError(e instanceof Error?e.message:"Prices unavailable.");}).finally(()=>{if(!pending.signal.aborted)setBusy(false);});return()=>pending.abort();},[ticker,refresh]);
 return <section className="purchase-panel price-gap"><p className="eyebrow">Ondo vs bStocks · per underlying share</p><h2>Where is {ticker} cheaper right now?</h2>
  {error&&<p role="alert" className="error">{error}</p>}
  {gap&&<>{!gap.marketOpen&&<p className="notice"><strong>The US market is closed.</strong> The exchange price is frozen{gap.nextOpenTime?` until ${new Date(gap.nextOpenTime).toLocaleString("en-GB",{timeZone:"Africa/Lagos",weekday:"short",hour:"2-digit",minute:"2-digit"})} WAT`:""}, but these tokens keep trading on-chain. The 24-hour move below happened while the stock could not trade.</p>}
  <div className="gap-legs">{gap.legs.map(leg=><article key={leg.contract}><p className="eyebrow">{issuerName(leg.provider)}</p><strong>${leg.sharePrice.toLocaleString("en-US",{maximumFractionDigits:2})}</strong><p className={leg.change24hPct===null?"fine-print":leg.change24hPct>=0?"gap-up":"gap-down"}>{leg.change24hPct===null?"24h move unavailable":`${pct(leg.change24hPct)} on-chain, last 24h`}</p><Sparkline candles={leg.candles}/><p className="fine-print">{leg.lastTradeAt?`Last hourly bar ${new Date(leg.lastTradeAt).toLocaleString("en-GB",{timeZone:"Africa/Lagos"})} WAT`:"No recent on-chain trades"} · price updated {new Date(leg.updatedAt).toLocaleTimeString("en-GB",{timeZone:"Africa/Lagos"})}</p></article>)}</div>
  {gap.crossSpreadPct!==null&&gap.cheaper&&<p><strong>{issuerName(gap.cheaper)}</strong> is {gap.crossSpreadPct.toFixed(2)}% cheaper per underlying share right now. You can pick the issuer in the purchase panel.</p>}
  <p className="fine-print">Per-share prices divide each token price by its token-to-share ratio. Indicative only: the price you pay comes from a live quote, including slippage. Binance’s RWA “reference price” is derived from the token price itself, so it is not shown as an independent stock quote. Sources: Binance RWA Data (token price and share ratio) and Market API (hourly candles, last 72 hours).</p></>}
  <button className="quiet" disabled={busy} onClick={()=>setRefresh(v=>v+1)}>{busy?"Checking prices…":"Refresh prices ↻"}</button></section>;
}
