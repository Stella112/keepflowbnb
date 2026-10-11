import Link from "next/link";
import {existingAccountId,paperDatabase} from "../../lib/paper/store";
import {LiveReceiptStore} from "../../lib/execution/live-receipt";
import {fromUnits} from "../../lib/binance/amounts";
import {Navigation} from "../navigation";
export const dynamic="force-dynamic";
export const metadata={title:"Activity | KeepFlow"};
export default async function Activity(){
 const owner=await existingAccountId(),receipts=owner?new LiveReceiptStore(paperDatabase()).list(owner):[];
 return <main><Navigation/><section className="hero compact"><p className="eyebrow">Verified onchain activity</p><h1>Your purchases.</h1><p className="intro">Every purchase listed here was confirmed on BNB Smart Chain with at least twelve block confirmations and matched against the exact tokens you received.</p></section>
 {!owner?<div className="empty"><h3>Sign in to see your activity.</h3><p>Your receipts are private to the wallet that made them.</p><Link className="button" href="/account">Sign in ↗</Link></div>
 :receipts.length?<div className="activity-list">{receipts.map(r=><Link key={r.intentId} className="stock-card" href={`/transactions/${r.intentId}`}><div><span className="ticker">{r.outcome==="CONFIRMED"?"CONFIRMED":"REVERTED"} · {r.provider}</span><h3>{r.ticker} · {fromUnits(BigInt(r.spentUnits),r.fundingDecimals)} USDT</h3><p>{r.outcome==="CONFIRMED"?`Received ${fromUnits(BigInt(r.receivedUnits),r.stockDecimals)} tokens`:"No tokens received"} · {new Date(r.confirmedAt).toLocaleString("en-GB",{timeZone:"UTC"})} UTC</p></div><span className="card-arrow">↗</span></Link>)}</div>
 :<div className="empty"><h3>No confirmed purchases yet.</h3><p>Pick a company or a Flow to make your first purchase from your wallet.</p><Link className="button" href="/#stocks">Browse stocks ↗</Link></div>}
 <p className="fine-print">Looking for practice trades? <Link href="/portfolio?mode=paper">Open your paper activity ↗</Link></p></main>;
}
