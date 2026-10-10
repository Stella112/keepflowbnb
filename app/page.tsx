import Link from "next/link";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "../lib/brand";
import { getDiscovery } from "../lib/binance/rwa";
import { curatedTickers } from "../lib/binance/rwa-schemas";
import {Navigation} from "./navigation";
import {listBells} from "../lib/paper/store";
import {ShareLink} from "./share-link";
import {publicShareUrl} from "../lib/share-url";
export const dynamic = "force-dynamic";
export default async function Home() {
  const discovery = await getDiscovery().catch(() => null);
  const stocks = curatedTickers.flatMap((ticker) => {
    const assets = discovery?.tokens.filter((token) => token.underlyingTicker === ticker) ?? [];
    return assets.length ? [{ ticker, name: assets[0].underlyingName, providers: assets.length }] : [];
  });
  return <main>
    <Navigation/>
    <div className="hero"><p className="eyebrow">{PRODUCT_TAGLINE}</p><h1>Own real stocks onchain.<br/>Share the portfolio. Keep it flowing.</h1><p className="intro">Buy tokenized stocks like NVIDIA and Apple on BNB Smart Chain with USDT from your own wallet. Package them as a Flow anyone can open from a link or QR, fork into their own version and keep on track under their own rules.</p><Link className="button" href="/bells">Explore Flows ↗</Link> <Link className="quiet" href="/create">Create your own Flow ↗</Link> <Link className="quiet" href="/portfolio?mode=paper">Try it with paper money ↗</Link></div>
    <section id="stocks" className="explore"><div className="section-heading"><div><p className="eyebrow">A place to start</p><h2>Companies you know.</h2></div>{discovery && <span className="live-dot">Live discovery</span>}</div>
      {discovery && stocks.length ? <div className="stock-grid">{stocks.map((stock) => <Link className="stock-card" href={`/s/${stock.ticker}`} key={stock.ticker}><div className="ticker-icon">{stock.ticker.slice(0,1)}</div><div><span className="ticker">{stock.ticker}</span><h3>{stock.name}</h3><p>{stock.providers} verified {stock.providers === 1 ? "representation" : "representations"} on BSC</p></div><span className="card-arrow" aria-hidden="true">↗</span></Link>)}</div> : <div className="empty"><h3>Data temporarily unavailable.</h3><p>Refresh to try stock discovery again.</p><a href="/" className="text-link">Refresh discovery ↻</a></div>}
      {discovery && <p className="fine-print">Discovery refreshed {new Date(discovery.fetchedAt).toLocaleString("en-GB",{timeZone:"Africa/Lagos"})} WAT. Prices and market status are checked again on the stock page.</p>}
    </section>
    <section className="explore bell-explore"><div className="section-heading"><div><p className="eyebrow">Ideas to make your own</p><h2>Start with a Flow.</h2></div><Link className="text-link" href="/bells">All Flows ↗</Link></div><div className="stock-grid">{listBells().filter(bell=>bell.example).map(bell=><Link className="stock-card" key={bell.id} href={`/b/${bell.id}`}><div><span className="ticker">EXAMPLE FLOW</span><h3>{bell.title}</h3><p>{bell.assets.map(a=>a.ticker).join(" · ")}{bell.reserveBps?" · USDT reserve":""}</p></div><span className="card-arrow">↗</span></Link>)}</div></section>
    <section className="explore"><h2>Open KeepFlow on your phone.</h2><ShareLink url={publicShareUrl(process.env.FIRSTBELL_PUBLIC_URL,"/")} label="KeepFlow"/></section>
    <footer><strong>Your wallet. Your keys. Your decisions.</strong><p>KeepFlow never holds your funds. Every approval and purchase is shown in your own wallet and settles on BNB Smart Chain. Tokenized stocks carry issuer, liquidity and market-hours risk. Paper mode uses virtual money and never touches real funds.</p></footer>
  </main>;
}
