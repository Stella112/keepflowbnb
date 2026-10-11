"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import type {FlowFit} from "../../../lib/policy/flow-fit";
type Response={flow:{id:string;title:string;version:number};rulesCustomized:boolean;marketFetchedAt:string;fit:FlowFit};
const pct=(bps:number)=>`${(bps/100).toFixed(bps%100?2:0)}%`;

/** Step "Apply my rules": shows how this Flow fits the visitor's own limits and, when it doesn't,
 * offers their own adjusted version. The creator's Flow is never edited. */
export function RulesFit({flowId,title,description}:{flowId:string;title:string;description:string}){
 const router=useRouter();
 const [data,setData]=useState<Response>(),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{const abort=new AbortController();fetch(`/api/bells/${encodeURIComponent(flowId)}/fit`,{cache:"no-store",signal:abort.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error);setData(body);}).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error&&e.message?e.message:"Your rules couldn't be checked right now.");});return()=>abort.abort();},[flowId]);
 async function adopt(){
  if(!data?.fit.adjusted)return;setBusy(true);setError("");
  try{
   const response=await fetch("/api/bells",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:`${title} (my rules)`.slice(0,80),description:`My version of ${title} v${data.flow.version}, adjusted to my rules. ${description}`.slice(0,500),assets:data.fit.adjusted.assets,reserveBps:data.fit.adjusted.reserveBps,forkedFromId:flowId})});
   const body=await response.json();if(!response.ok)throw new Error(body.error);
   router.push(`/b/${body.bell.id}#buy`);
  }catch(e){setError(e instanceof Error&&e.message?e.message:"Your version couldn't be saved. Nothing was bought.");setBusy(false);}
 }
 if(error)return <div className="rules-fit"><p className="eyebrow">Before you buy · Apply my rules</p><p role="alert" className="error">{error}</p></div>;
 if(!data)return <div className="rules-fit"><p className="eyebrow">Before you buy · Apply my rules</p><p className="fine-print" aria-live="polite">Checking this Flow against your rules…</p></div>;
 const {fit}=data,limits=`max ${pct(fit.limits.maxSingleAssetBps)} per company · at least ${pct(fit.limits.minReserveBps)} in USDT`;
 return <div className={`rules-fit ${fit.status==="ALLOW"?"ok":"warn"}`}><p className="eyebrow">Before you buy · Apply my rules</p>
  <p className="fine-print">Your rules: {limits}. <Link href="/rules">{data.rulesCustomized?"Edit":"Set"} my rules</Link></p>
  {fit.status==="ALLOW"&&<p><strong>Fits your rules.</strong> {fit.explanation}</p>}
  {fit.status!=="ALLOW"&&<><p><strong>{fit.status==="ADJUSTMENT_REQUIRED"?"Needs adjusting for your rules.":"Can't be bought under your rules."}</strong> {fit.explanation}</p>
   <ul className="fit-reasons">{fit.changes.map(c=><li key={c.ticker+c.code}>{c.reason}</li>)}</ul>
   {fit.adjusted&&<><table className="fit-table"><thead><tr><th>Holding</th><th>Creator</th><th>Your version</th></tr></thead><tbody>
    {fit.original.assets.map(a=>{const next=fit.adjusted!.assets.find(x=>x.ticker===a.ticker)?.weightBps??0;return <tr key={a.ticker} className={next!==a.weightBps?"changed":""}><td>{a.ticker}</td><td>{pct(a.weightBps)}</td><td>{next?pct(next):"—"}</td></tr>;})}
    <tr className={fit.adjusted.reserveBps!==fit.original.reserveBps?"changed":""}><td>USDT reserve</td><td>{pct(fit.original.reserveBps)}</td><td>{pct(fit.adjusted.reserveBps)}</td></tr></tbody></table>
    <button className="button" disabled={busy} onClick={adopt}>{busy?"Saving your version…":"Adjust to my rules"}</button>
    <p className="fine-print">Saves your own version of this Flow (a fork that credits the original) and opens its checkout. Nothing is bought until you approve each purchase in your wallet. Removed weight stays in USDT; it is never moved to other stocks.</p></>}
   {!fit.adjusted&&<p className="fine-print">Nothing was saved or bought.</p>}
  </>}
 </div>;
}
