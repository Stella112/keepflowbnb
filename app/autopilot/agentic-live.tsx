"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import type {AgenticPlan,AgenticRun} from "../../lib/agents/agentic-autopilot";
type FlowOption={id:string;title:string;version:number;contentHash:string};
type Overview={live:boolean;isOperator:boolean;operatorWallet:string|null;capUsd:string;wallet:{status:string;address:string|null;quota:{left:number;dailyLimit:number;used:number}|null}|null;plan:AgenticPlan|null;runs:AgenticRun[]};
const short=(a:string)=>`${a.slice(0,6)}…${a.slice(-4)}`;
export function AgenticLive(){
 const [data,setData]=useState<Overview>(),[flows,setFlows]=useState<FlowOption[]>([]),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [flowId,setFlowId]=useState(""),[amount,setAmount]=useState("10"),[cadence,setCadence]=useState<"DAILY"|"WEEKLY">("WEEKLY");const lock=useRef(false);
 const load=useCallback(async()=>{try{const r=await fetch("/api/agentic",{cache:"no-store"}),d=await r.json();if(!r.ok)throw Error(d.error);setData(d);if(d.plan){setFlowId(d.plan.bellId);setAmount(d.plan.contributionUsd);setCadence(d.plan.cadence);}}catch(e){setError(e instanceof Error?e.message:"Autopilot is unavailable.");}},[]);
 useEffect(()=>{void load();fetch("/api/bells").then(r=>r.json()).then(d=>setFlows(d.bells??[])).catch(()=>{});},[load]);
 async function act(body:object,done:string){if(lock.current)return;lock.current=true;setBusy(true);setError("");setMessage("");try{const r=await fetch("/api/agentic",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw Error(d.error);setMessage(d.run?`Run ${d.run.state.toLowerCase()}: ${d.run.reason}`:done);await load();}catch(e){setError(e instanceof Error?e.message:"Request failed.");}finally{lock.current=false;setBusy(false);}}
 const flow=flows.find(f=>f.id===flowId);
 if(!data)return <section className="purchase-panel"><p className="eyebrow">Live Autopilot · Binance Agentic Wallet</p><p>{error||"Loading…"}</p></section>;
 return <section className="purchase-panel agentic-live"><p className="eyebrow">Live Autopilot · Binance Agentic Wallet</p><h2>Real contributions, under two sets of limits.</h2>
  <p>KeepFlow decides what to buy using your Flow and your rules. Each purchase runs through your own Binance Agentic Wallet, so the daily limit you set in the Binance app applies too. It never sells, never resends an unconfirmed order, and records every purchase only after onchain confirmation.</p>
  {!data.live&&<p className="notice">Live Autopilot is switched off on the server. Practice with the paper agent above until it is enabled.</p>}
  {data.live&&!data.isOperator&&<p className="notice">Live Autopilot runs for the single operator account that controls the configured Agentic Wallet. Your account can use the paper agent and buy directly from your own wallet.</p>}
  {data.live&&data.isOperator&&<>
   <dl><dt>Agentic Wallet</dt><dd>{data.wallet?.status==="CONNECTED"&&data.wallet.address?<span className="address">{short(data.wallet.address)} · connected</span>:<span className="error">{data.wallet?.status==="UNCONNECTED"?"Not signed in. Run baw auth signin on the server.":"Unavailable"}</span>}</dd>
   {data.wallet?.quota&&<><dt>Binance app daily limit</dt><dd>{data.wallet.quota.used} used of {data.wallet.quota.dailyLimit} · {data.wallet.quota.left} left today</dd></>}
   <dt>Per purchase cap</dt><dd>{data.capUsd} USDT</dd></dl>
   <label htmlFor="ag-flow">Flow</label><select id="ag-flow" value={flowId} onChange={e=>setFlowId(e.target.value)}><option value="">Choose a Flow</option>{flows.map(f=><option key={f.id} value={f.id}>{f.title} · v{f.version}</option>)}</select>
   <label htmlFor="ag-amount">USDT per contribution</label><input id="ag-amount" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/>
   <label htmlFor="ag-cadence">Schedule</label><select id="ag-cadence" value={cadence} onChange={e=>setCadence(e.target.value as "DAILY"|"WEEKLY")}><option value="WEEKLY">Weekly · Mondays 09:00 WAT</option><option value="DAILY">Daily · 09:00 WAT</option></select>
   <button className="button" disabled={busy||!flow} onClick={()=>flow&&act({action:"SAVE_PLAN",bellId:flow.id,bellVersion:flow.version,bellHash:flow.contentHash,contributionUsd:amount,cadence},"Plan saved. It stays paused until you enable it.")}>Save plan</button>
   {data.plan&&<div className="agentic-actions"><p className="fine-print">Plan: {data.plan.contributionUsd} USDT {data.plan.cadence.toLowerCase()} into Flow version {data.plan.bellVersion} · {data.plan.enabled?"enabled":"paused"}</p>
    <button className="quiet" disabled={busy} onClick={()=>act({action:data.plan!.enabled?"PAUSE":"ENABLE"},data.plan!.enabled?"Autopilot paused.":"Autopilot enabled.")}>{data.plan.enabled?"Pause Autopilot":"Enable Autopilot"}</button>
    <button className="button secondary" disabled={busy} onClick={()=>{if(window.confirm(`Buy up to ${data.plan!.contributionUsd} USDT of stocks now from the Agentic Wallet?`))void act({action:"RUN_NOW",requestId:crypto.randomUUID()},"Run finished.");}}>{busy?"Working…":"Run a contribution now"}</button></div>}
  </>}
  {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}
  {data.runs.length>0&&<div className="agentic-runs"><h3>Recent runs</h3>{data.runs.map(run=><article key={run.key} className="agentic-run"><p><strong>{run.state}</strong> · {run.trigger.toLowerCase()} · {new Date(run.createdAt).toLocaleString("en-GB",{timeZone:"UTC"})} UTC · {run.contributionUsd} USDT</p><p className="fine-print">{run.reason}</p><ul>{run.legs.map(leg=><li key={leg.ticker}>{leg.ticker} · {leg.amountUsd} USDT · {leg.state}{leg.txHash&&<> · <a href={`https://bscscan.com/tx/${leg.txHash}`} target="_blank" rel="noreferrer">BscScan ↗</a></>}<br/><span className="fine-print">{leg.reason}</span></li>)}</ul>{run.state==="PENDING"&&<button className="quiet" disabled={busy} onClick={()=>act({action:"RECONCILE",key:run.key},"Status refreshed.")}>Check settlement</button>}</article>)}</div>}
 </section>;
}
