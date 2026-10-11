import Link from "next/link";
import { getDiscovery } from "../lib/binance/rwa";
import { curatedTickers } from "../lib/binance/rwa-schemas";
import {Navigation} from "./navigation";
import {listBells} from "../lib/paper/store";
import {ShareLink} from "./share-link";
import {publicShareUrl} from "../lib/share-url";
export const dynamic = "force-dynamic";
const usd=(value:number)=>value.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2});
const steps:[string,string,string][]=[
 ["Scan it","Open a stock or a Flow from a link or QR code. No app to install, no seed phrase to learn.","01"],
 ["Own it","Pay with USDT from Binance Wallet or any BNB Chain wallet. The stock tokens land in your wallet, not ours.","02"],
 ["Fork it","Copy any Flow, change the weights and share your own version. The creator never controls your money.","03"],
 ["Automate it","Set rules once. Autopilot adds to underweight stocks on schedule and never sells without your say-so.","04"],
];
export default async function Home() {
  const discovery = await getDiscovery().catch(() => null);
  const stocks = curatedTickers.flatMap((ticker) => {
    const assets = discovery?.tokens.filter((token) => token.underlyingTicker === ticker) ?? [];
    if(!assets.length)return [];
    const prices=assets.map(a=>Number(a.tokenPrice)/Number(a.tokenToShareRatio)).filter(Number.isFinite);
    return [{ ticker, name: assets[0].underlyingName, logo: assets[0].tokenLogoUrl, issuers: assets.map(a=>a.platformId==="ondo"?"Ondo":a.platformId==="bstock"?"bStocks":a.platformId), price: prices.length?Math.min(...prices):null }];
  });
  const flows=listBells().filter(bell=>bell.example);
  const featured=flows.find(f=>f.id==="ai-compute")??flows[0];
  return <main>
    <Navigation/>
    <section className="home-hero">
      <div>
        <p className="eyebrow">Tokenized stocks on BNB Chain</p>
        <h1>Own real stocks on&#8209;chain, in a few taps.</h1>
        <p className="intro">Buy NVIDIA, Apple, Microsoft and more with USDT from your own wallet. Bundle them into a Flow you can share, fork and keep on track automatically, under rules you set.</p>
        <div className="hero-actions"><Link className="button large" href="/buy">Buy your first stock</Link><Link className="button secondary" href="/#stocks">Explore stocks</Link></div>
        <p className="fine-print hero-note">You need a BNB Chain wallet with USDT. No USDT yet? <Link href="/portfolio?mode=paper">Practice with paper money</Link>.</p>
        <ul className="trust-row"><li>Your wallet, your keys</li><li>Live Binance market data</li><li>Practice free with paper money</li></ul>
      </div>
      {featured&&<Link href={`/b/${featured.id}`} className="flow-preview" aria-label={`Open the ${featured.title} Flow`}>
        <div className="flow-preview-head"><span className="pill">Featured Flow</span><span className="muted">v{featured.version}</span></div>
        <h2>{featured.title}</h2><p className="muted">{featured.description}</p>
        <div className="allocation-stack" aria-hidden="true">{featured.assets.map((a,i)=><i key={a.ticker} style={{flexBasis:`${a.weightBps/100}%`}} className={`seg-${i%5}`}/>)}{featured.reserveBps>0&&<i style={{flexBasis:`${featured.reserveBps/100}%`}} className="seg-cash"/>}</div>
        <ul className="allocation-legend">{featured.assets.map((a,i)=><li key={a.ticker}><span className={`dot seg-${i%5}`}/>{a.ticker}<b>{a.weightBps/100}%</b></li>)}{featured.reserveBps>0&&<li><span className="dot seg-cash"/>USDT reserve<b>{featured.reserveBps/100}%</b></li>}</ul>
        <span className="button full">Invest in this Flow</span>
      </Link>}
    </section>

    <section className="how-it-works" aria-labelledby="how"><h2 id="how" className="section-title">How KeepFlow works</h2><div className="steps">{steps.map(([title,body,n])=><article key={title}><span className="step-n">{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>

    <section id="stocks" className="explore"><div className="section-heading"><div><p className="eyebrow">Companies you know</p><h2>Start with one stock.</h2></div>{discovery && <span className="live-dot">Live prices</span>}</div>
      {discovery && stocks.length ? <div className="stock-grid four">{stocks.map((stock) => <Link className="stock-card" href={`/s/${stock.ticker}`} key={stock.ticker}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="stock-logo" src={stock.logo} alt="" width={44} height={44} loading="lazy"/>
        <div className="stock-card-body"><span className="ticker">{stock.ticker}</span><h3>{stock.name}</h3><p>{stock.issuers.join(" · ")}</p></div>
        {stock.price!==null&&<strong className="stock-price">{usd(stock.price)}</strong>}
      </Link>)}</div> : <div className="empty"><h3>Live prices are temporarily unavailable.</h3><p>Refresh to try again.</p><a href="/" className="text-link">Refresh ↻</a></div>}
      {discovery && <p className="fine-print">Price per underlying share, cheapest issuer, from the Binance RWA Data API at {new Date(discovery.fetchedAt).toLocaleTimeString("en-GB",{timeZone:"Africa/Lagos",hour:"2-digit",minute:"2-digit"})} WAT. You see a live quote before you buy.</p>}
    </section>

    <section className="explore"><div className="section-heading"><div><p className="eyebrow">Ready-made portfolios</p><h2>Or invest in a Flow.</h2></div><Link className="text-link" href="/bells">All Flows →</Link></div>
      <div className="flow-grid">{flows.map(flow=><Link className="flow-card" key={flow.id} href={`/b/${flow.id}`}><h3>{flow.title}</h3><p>{flow.assets.map(a=>a.ticker).join(" · ")}{flow.reserveBps?" · USDT":""}</p><div className="allocation-stack small" aria-hidden="true">{flow.assets.map((a,i)=><i key={a.ticker} style={{flexBasis:`${a.weightBps/100}%`}} className={`seg-${i%5}`}/>)}{flow.reserveBps>0&&<i style={{flexBasis:`${flow.reserveBps/100}%`}} className="seg-cash"/>}</div><span className="text-link">View Flow →</span></Link>)}</div>
    </section>

    <section className="feature-band">
      <div><p className="eyebrow">Autopilot</p><h2>The agent proposes. Your rules decide. Your wallet executes.</h2><p>Pick a Flow, an amount and a schedule. KeepFlow buys what is underweight, skips anything that breaks your limits and records why, with a receipt checked against the chain.</p><Link className="button secondary" href="/autopilot">Set up Autopilot</Link></div>
      <div><p className="eyebrow">Build with AI</p><h2>Ask Claude to research and plan.</h2><p>Add KeepFlow to Claude or any MCP app, then ask: “Compare NVIDIA on Ondo and bStocks, then draft a $50 Flow: NVIDIA 40%, Microsoft 30%, Alphabet 20%, keep 10% in USDT.” When you want to buy, it gives you a review link and you sign in your own wallet.</p><Link className="button secondary" href="/assistant">Set up in 30 seconds</Link></div>
    </section>

    <section className="explore phone-band"><div><h2>Open KeepFlow on your phone.</h2><p className="muted">Scan with your camera, then open the link in your wallet’s browser.</p></div><ShareLink url={publicShareUrl(process.env.FIRSTBELL_PUBLIC_URL,"/")} label="KeepFlow"/></section>
    <footer><strong>Your wallet. Your keys. Your decisions.</strong><p>KeepFlow never holds your funds. Every approval and purchase is shown in your own wallet and settles on BNB Smart Chain. Tokenized stocks carry issuer, liquidity and market-hours risk and are not available in every country. Paper mode uses virtual money only.</p></footer>
  </main>;
}
