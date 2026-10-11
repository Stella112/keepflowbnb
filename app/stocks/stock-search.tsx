"use client";
import {useState} from "react";
import Link from "next/link";
export type StockRow={ticker:string;name:string;logo:string;kind:string;issuers:{name:string;symbol:string;price:number|null;open:boolean;status:string}[]};
const usd=(value:number)=>value.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2});

export function StockSearch({rows,fetchedAt}:{rows:StockRow[];fetchedAt:string}){
 const [query,setQuery]=useState("");
 const q=query.trim().toLowerCase(),shown=q?rows.filter(r=>r.ticker.toLowerCase().includes(q)||r.name.toLowerCase().includes(q)):rows;
 return <section aria-label="Stock list">
  <label htmlFor="stock-search" className="sr-only">Search stocks</label>
  <input id="stock-search" className="search-input" type="search" placeholder="Search by company or ticker" value={query} onChange={e=>setQuery(e.target.value)} autoComplete="off"/>
  <p className="fine-print">{shown.length} of {rows.length} · Binance RWA data at {new Date(fetchedAt).toISOString().slice(11,16)} UTC</p>
  {shown.length?<ul className="stock-rows">{shown.map(r=>{const prices=r.issuers.filter(i=>i.open&&i.price!==null).map(i=>i.price!),from=prices.length?Math.min(...prices):null,open=r.issuers.some(i=>i.open);
   return <li key={r.ticker}><Link href={`/s/${r.ticker}`} className="stock-row">
    {/* eslint-disable-next-line @next/next/no-img-element */}<img src={r.logo} alt="" width={40} height={40} className="stock-logo"/>
    <span className="stock-row-main"><strong>{r.name}</strong><span>{r.ticker} · {r.kind} · {r.issuers.map(i=>i.name).join(", ")}</span></span>
    <span className="stock-row-price">{from!==null?<><strong>{usd(from)}</strong><span>{prices.length>1?"from, per share":"per share"}</span></>:<span className={open?"":"unavailable"}>{open?"Price unavailable":"Not tradable now"}</span>}</span>
   </Link></li>;})}</ul>:<p className="empty">No supported stock matches “{query}”. Try a ticker like NVDA or a name like Apple.</p>}
 </section>;
}
