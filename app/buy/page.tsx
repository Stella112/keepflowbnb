import Link from "next/link";
import type {Metadata} from "next";
import {Navigation} from "../navigation";
import {getDiscovery} from "../../lib/binance/rwa";
import {curatedTickers} from "../../lib/binance/rwa-schemas";
import {liveTradingEnabled,liveTradeCapUsd} from "../../lib/mode";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Buy your first stock · KeepFlow",description:"Buy a tokenized US stock on BNB Smart Chain with USDT from your own wallet, step by step."};
const usd=(value:number)=>value.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2});

export default async function BuyFirstStock(){
 const discovery=await getDiscovery().catch(()=>null),live=liveTradingEnabled(),cap=liveTradeCapUsd();
 const stocks=curatedTickers.flatMap(ticker=>{
  const open=(discovery?.tokens??[]).filter(t=>t.underlyingTicker===ticker&&t.binanceChainId==="56"&&t.statusInfo.openState);
  const pick=open.find(t=>t.platformId==="bstock")??open[0];if(!pick)return [];
  const price=Number(pick.tokenPrice)/Number(pick.tokenToShareRatio);
  return [{ticker,name:pick.underlyingName??ticker,logo:pick.tokenLogoUrl,issuer:pick.platformId==="ondo"?"Ondo":"bStocks",kind:pick.assetType===3?"ETF":"Stock",price:Number.isFinite(price)?price:null}];
 });
 return <main><Navigation/>
  <div className="hero compact"><p className="eyebrow"><span className="mode-tag real">Real trading</span> BNB Smart Chain</p><h1>Buy your first stock.</h1><p className="intro">Three things to have ready, then pick a stock. You buy with USDT from your own wallet. KeepFlow checks everything and shows you the transaction before your wallet asks you to sign.</p></div>

  <section aria-labelledby="ready"><h2 id="ready" className="section-title">1 · What you need</h2><div className="ready-grid">
   <article className="purchase-panel"><span className="step-n">A</span><h3>A wallet on BNB Smart Chain</h3><p>Binance Wallet is recommended. KeepFlow never holds your keys or your money.</p><p><a href="https://www.binance.com/en/web3wallet" target="_blank" rel="noreferrer">Get Binance Wallet ↗</a></p><p className="fine-print">On a phone, open keepflow.site inside the Binance app&apos;s browser so the wallet connects directly.</p></article>
   <article className="purchase-panel"><span className="step-n">B</span><h3>USDT on BNB Smart Chain</h3><p>Buy USDT on Binance and withdraw it to your wallet address, choosing the <strong>BNB Smart Chain (BEP20)</strong> network.</p><p className="fine-print">bStocks accepts small amounts. Ondo routes have rejected purchases below about 5 USDT. KeepFlow caps each real purchase at {cap} USDT.</p></article>
   <article className="purchase-panel"><span className="step-n">C</span><h3>A little BNB for gas</h3><p>About 0.001 BNB covers the approval and purchase transactions.</p><p className="fine-print">Gas sponsorship is not available for purchases yet: our MegaFuel sponsor check currently reports these transactions as not sponsorable. You pay the network fee in BNB, and the exact fee is shown before you sign.</p></article>
  </div><p className="fine-print">No USDT yet? <Link href="/portfolio?mode=paper">Practice with paper money first</Link>. Paper trading uses virtual dollars and is clearly marked.</p></section>

  <section aria-labelledby="pick"><h2 id="pick" className="section-title">2 · Pick a stock</h2>
   {stocks.length?<div className="stock-grid four">{stocks.map(s=><Link key={s.ticker} className="stock-card" href={`/s/${s.ticker}?start=1#buy`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="stock-logo" src={s.logo} alt="" width={44} height={44} loading="lazy"/><div className="stock-card-body"><span className="ticker">{s.ticker}</span><h3>{s.name}</h3><p>{s.kind} · {s.issuer}</p></div>{s.price!==null&&<strong className="stock-price">{usd(s.price)}</strong>}</Link>)}</div>
   :<p className="notice" role="alert">Live stock data from Binance is unavailable right now, so purchases can&apos;t start. Try again in a minute.</p>}
   {discovery&&<p className="fine-print">Prices: Binance RWA data, fetched {new Date(discovery.fetchedAt).toISOString().slice(11,16)} UTC. Onchain token price adjusted by each token&apos;s share ratio.</p>}
  </section>

  <section aria-labelledby="flow"><h2 id="flow" className="section-title">3 · What happens on the stock page</h2><ol className="review-steps journey">
   <li><strong>Connect and sign in</strong> with your wallet. Signing in is a free message, not a payment.</li>
   <li><strong>Enter an amount</strong> in USDT. KeepFlow reads your real USDT balance and tells you if it&apos;s not enough.</li>
   <li><strong>Live quote</strong> from Binance for the exact amount, with the tokens you&apos;ll receive.</li>
   <li><strong>Your rules</strong> are checked: per-purchase limit, daily and weekly spend, single-company cap.</li>
   <li><strong>Simulation</strong> of the exact transaction. If it fails, your wallet is never asked.</li>
   <li><strong>Approve USDT</strong> for exactly this amount (first purchase only), then <strong>confirm the purchase</strong> in your wallet.</li>
   <li><strong>Confirmation</strong> on BNB Smart Chain, then your receipt with the transaction hash and the tokens received.</li>
  </ol>{!live&&<p className="notice">Real purchases are switched off on this server right now. You can still run every check, and practise with paper money.</p>}</section>
 </main>;
}
