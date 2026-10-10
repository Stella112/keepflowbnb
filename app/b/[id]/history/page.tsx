import {notFound} from "next/navigation";
import Link from "next/link";
import {Navigation} from "../../../navigation";
import {bellHistory} from "../../../../lib/paper/store";
import {VersionComparison} from "./comparison";
import {policyNames,policyValue} from "./policy";
export const dynamic="force-dynamic";
export default async function HistoryPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,versions=bellHistory(id);if(!versions.length)notFound();
 return <main><Navigation/><Link className="back" href={`/b/${id}`}>← Back to Flow</Link><div className="hero compact"><p className="eyebrow">Published strategy history</p><h1>{versions[0].title}</h1><p className="intro">Every published definition stays available for comparison. Followers keep their chosen version until they accept an update.</p></div><VersionComparison versions={versions}/><div className="stock-grid">{versions.map(bell=><article className="position-card" key={bell.version}><h2>Version {bell.version}</h2><p>{bell.description}</p>{bell.assets.map(asset=><div className="allocation-row" key={asset.ticker}><span>{asset.ticker}</span><span>{asset.weightBps/100}%</span></div>)}<div className="allocation-row"><span>Cash target</span><span>{bell.reserveBps/100}%</span></div><h3>Published Flow rules</h3>{Object.entries(bell.policy??{}).length?Object.entries(bell.policy!).map(([field,value])=><p key={field}>{policyNames[field]??field}: {policyValue(field,value)}</p>):<p>No extra Flow rules were recorded for this version. Personal rules still apply.</p>}<p className="fine-print">Content hash</p><p className="address">{bell.contentHash}</p>{bell.creatorWallet&&<p className="address">Creator wallet: {bell.creatorWallet}</p>}</article>)}</div></main>;
}
