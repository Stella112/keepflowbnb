import Link from "next/link";
import {notFound} from "next/navigation";
import {getBell,existingAccountId,ownedBellIds} from "../../../lib/paper/store";
import {Navigation} from "../../navigation";
import {BasketPurchase} from "../../basket-purchase";
import {PaperBuy} from "../../paper-buy";
import {SignInGate} from "../../sign-in-gate";
import {ShareBell} from "./share";
import {BellCheck} from "../../bell-check";
import {BellFollow} from "../../bell-follow";
import type {Metadata} from "next";
import {publicShareUrl} from "../../../lib/share-url";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params,bell=getBell(id);if(!bell)return {title:"Flow unavailable | KeepFlow",robots:{index:false,follow:false}};
 const url=publicShareUrl(process.env.FIRSTBELL_PUBLIC_URL,`/b/${bell.id}`);
 const title=`${bell.title} | KeepFlow`,description=`Tokenized stocks on BNB Chain · Version ${bell.version}. ${bell.description}`;
 return {title,description,...(url?{metadataBase:new URL(new URL(url).origin),alternates:{canonical:url}}:{}),openGraph:{type:"website",title,description,...(url?{url}:{})},twitter:{card:"summary_large_image",title,description}};
}
export default async function BellPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const bell=getBell(id);if(!bell)notFound();const owner=await existingAccountId();const owned=owner?ownedBellIds(owner).includes(id):false;return <main><Navigation/><Link className="back" href="/bells">← All Flows</Link><div className="stock-layout"><section className="stock-overview"><p className="eyebrow">{bell.example?"Example":"Community"} Flow · BNB Smart Chain</p><h1>{bell.title}</h1><p className="intro">{bell.description}</p><div className="allocation-list">{bell.assets.map(asset=><div key={asset.ticker} className="allocation-row"><Link href={`/s/${asset.ticker}`}>{asset.ticker}</Link><span>{asset.weightBps/100}%</span><div className="allocation-bar"><i style={{width:`${asset.weightBps/100}%`}}/></div></div>)}{bell.reserveBps>0&&<div className="allocation-row"><span>USDT reserve</span><span>{bell.reserveBps/100}%</span></div>}</div></section><section className="stock-research"><ShareBell id={bell.id}/><BellFollow bellId={bell.id}/><Link className="quiet" href={`/b/${bell.id}/history`}>View published versions ↗</Link>{owned&&<Link className="quiet" href={`/create?edit=${bell.id}`}>Publish a new strategy version ↗</Link>}<Link className="button secondary" href={`/create?fork=${bell.id}`}>Fork and edit this Flow ↗</Link>{bell.forkedFromId&&<p className="fine-print">Forked from <Link href={`/b/${bell.forkedFromId}`}>the original Flow</Link>. This definition is independent.</p>}<details><summary>Definition details</summary><dl><dt>Version</dt><dd>{bell.version}</dd><dt>Creator</dt><dd className="address">{bell.creatorWallet??(bell.example?"KeepFlow example":"Guest creator")}</dd><dt>Content hash</dt><dd className="address">{bell.contentHash}</dd><dt>Created</dt><dd>{new Date(bell.createdAt).toISOString()}</dd></dl><p className="fine-print">Stores tickers and target weights, not fixed issuer contracts. For each purchase, bStocks is chosen when available, otherwise another verified provider. Each receipt identifies the representation actually used.</p></details></section><aside className="purchase-panel" id="buy"><p className="eyebrow"><span className="mode-tag real">Real trading</span> BNB Smart Chain · real USDT</p><h2>Invest in this Flow.</h2><p>Buy every holding with USDT from your own wallet, one confirmed purchase at a time.</p><SignInGate/><BasketPurchase key={`${bell.id}:${bell.version}`} bell={bell}/><details className="paper-option"><summary><span className="mode-tag paper">Paper trading</span> Practice with virtual money instead</summary><PaperBuy bellId={bell.id}/></details><Link className="button secondary" href={`/autopilot?bell=${bell.id}`}>Put this Flow on autopilot ↗</Link><details className="mainnet-preview"><summary>Check this Flow against a real wallet</summary><BellCheck bellId={bell.id}/></details><p className="fine-print">Purchases run one holding at a time. If one fails or is blocked, later purchases stop and your receipt shows exactly what completed. Nothing is reversed automatically.</p></aside></div></main>;}



