import Link from "next/link";
import type {Metadata} from "next";
import {Navigation} from "../../navigation";
import {purchaseReviews} from "../../../lib/tools/purchase-review-server";
import {existingAccountId,getBell} from "../../../lib/paper/store";
import {getDiscovery} from "../../../lib/binance/rwa";
import {IntentPreview} from "../../intent-preview";
import {BasketPurchase} from "../../basket-purchase";
import {SignInGate} from "../../sign-in-gate";
import {RulesFit} from "../../b/[id]/rules-fit";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Review your purchase · KeepFlow",robots:{index:false,follow:false}};
const issuer=(id:string|null)=>id==="ondo"?"Ondo":id==="bstock"?"bStocks":id??"";
const time=(ms:number)=>new Date(ms).toISOString().slice(11,16)+" UTC";

export default async function ReviewPage({params}:{params:Promise<{id:string}>}){
 const review=purchaseReviews().read((await params).id);
 if(!review)return <main><Navigation/><section className="empty"><p className="eyebrow">Purchase review</p><h1>This review link has expired.</h1><p>Review links last 15 minutes and can&apos;t spend anything on their own. Ask your assistant for a new one, or pick a stock or Flow yourself.</p><Link className="button" href="/">Browse stocks and Flows</Link></section></main>;
 const account=await existingAccountId();
 if(review.owner&&account&&account!==review.owner)return <main><Navigation/><section className="empty"><p className="eyebrow">Purchase review</p><h1>This link belongs to another account.</h1><p>Your assistant prepared it for a different KeepFlow sign-in. Sign in with that wallet, or start from the stock or Flow page yourself.</p><Link className="button" href={review.kind==="FLOW"?`/b/${review.flowId}`:`/s/${review.ticker}`}>Open the {review.kind==="FLOW"?"Flow":"stock"} page</Link></section></main>;
 const flow=review.kind==="FLOW"?getBell(review.flowId!):undefined;
 const name=review.kind==="STOCK"?(await getDiscovery().catch(()=>undefined))?.tokens.find(t=>t.underlyingTicker===review.ticker&&t.platformId===review.provider)?.underlyingName??review.ticker:flow?.title;
 if(review.kind==="FLOW"&&!flow)return <main><Navigation/><section className="empty"><h1>This Flow is no longer available.</h1><Link className="button" href="/bells">Browse Flows</Link></section></main>;
 return <main><Navigation/>
  <div className="hero compact"><p className="eyebrow">Prepared by your AI assistant · expires {time(review.expiresAt)}</p><h1>Review: {review.amount} USDT of {name}.</h1><p className="intro">Nothing has been bought. This link only fills in the purchase screen. You stay in control: KeepFlow checks everything again with live data, and your wallet asks you to approve each transaction.</p></div>
  <div className="stock-layout review-layout">
   <section className="stock-overview"><h2>What happens next</h2><ol className="review-steps">
    <li><strong>Sign in with your wallet.</strong> Binance Wallet first; KeepFlow never sees your keys.</li>
    <li><strong>Fresh quote.</strong> The price is fetched again from Binance; nothing from the assistant is reused.</li>
    <li><strong>Your checks.</strong> Your USDT balance, your <Link href="/rules">personal limits</Link>{flow?" and the Flow's own rules":""} are checked.</li>
    <li><strong>Simulation.</strong> The exact transaction is simulated before your wallet is asked.</li>
    <li><strong>You sign.</strong> Approve in your wallet, or walk away and nothing happens.</li>
   </ol>
   {flow&&<><h2>{flow.title} · version {flow.version}</h2>{review.flowVersion!==flow.version&&<p className="notice">This Flow was updated after your assistant prepared the link. You&apos;re seeing the current version.</p>}<ul className="allocation-list">{flow.assets.map(a=><li className="allocation-row" key={a.ticker}><Link href={`/s/${a.ticker}`}>{a.ticker}</Link><span>{(a.weightBps/100).toFixed(a.weightBps%100?2:0)}%</span></li>)}{flow.reserveBps>0&&<li className="allocation-row"><span>USDT kept in reserve</span><span>{(flow.reserveBps/100).toFixed(0)}%</span></li>}</ul></>}
   <p><Link className="quiet" href={flow?`/b/${flow.id}`:`/s/${review.ticker}`}>See the full {flow?"Flow":"stock"} page and research ↗</Link></p>
   </section>
   <aside className="purchase-panel"><p className="eyebrow"><span className="mode-tag real">Real trading</span> BNB Smart Chain · real USDT</p>
    {flow?<><h2>Invest in {flow.title}.</h2><RulesFit flowId={flow.id} title={flow.title} description={flow.description}/><SignInGate/><BasketPurchase key={`${flow.id}:${flow.version}`} bell={flow} initialAmount={review.amount}/></>
     :<><h2>Buy {review.ticker}.</h2><p className="fine-print">Issuer: {issuer(review.provider)}. You can switch issuer on the <Link href={`/s/${review.ticker}`}>stock page</Link>.</p><IntentPreview ticker={review.ticker!} provider={review.provider!} initialAmount={review.amount}/></>}
   </aside>
  </div>
 </main>;
}
