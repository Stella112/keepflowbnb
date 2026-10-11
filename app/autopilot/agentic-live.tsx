"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import type {AgenticPlan,AgenticRun} from "../../lib/agents/agentic-autopilot";
type FlowOption={id:string;title:string;version:number;contentHash:string;assets?:{ticker:string;weightBps:number}[]};
type Overview={live:boolean;isOperator:boolean;connected:boolean;connectedWallet:string|null;ownSession:boolean;signinPending:boolean;capUsd:string;dailyCapUsd:string|null;wallet:{status:string;address:string|null;quota:{left:number;dailyLimit:number;used:number}|null}|null;plan:AgenticPlan|null;runs:AgenticRun[]};
type Challenge={urlForWeb:string;pairingCode:string;expiresAt:string;qr:string};
const short=(a:string)=>`${a.slice(0,6)}…${a.slice(-4)}`;
export function AgenticLive(){
 const [data,setData]=useState<Overview>(),[signedOut,setSignedOut]=useState(false),[flows,setFlows]=useState<FlowOption[]>([]),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [challenge,setChallenge]=useState<Challenge>();
 const [flowId,setFlowId]=useState(""),[amount,setAmount]=useState("0.5"),[cadence,setCadence]=useState<"DAILY"|"WEEKLY">("DAILY");const lock=useRef(false);
 const load=useCallback(async()=>{try{const r=await fetch("/api/agentic",{cache:"no-store"}),d=await r.json();if(r.status===401){setSignedOut(true);return;}if(!r.ok)throw Error(d.error);setSignedOut(false);setData(d);if(d.plan){setFlowId(d.plan.bellId);setAmount(d.plan.contributionUsd);setCadence(d.plan.cadence);}}catch(e){setError(e instanceof Error?e.message:"Autopilot is unavailable.");}},[]);
 useEffect(()=>{void load();fetch("/api/bells").then(r=>r.json()).then(d=>setFlows(d.bells??[])).catch(()=>{});},[load]);
 async function post(body:object){const r=await fetch("/api/agentic",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw Error(d.error);return d;}
 async function act(body:object,done:string){if(lock.current)return;lock.current=true;setBusy(true);setError("");setMessage("");try{const d=await post(body);setMessage(d.run?`Run ${d.run.state.toLowerCase()}: ${d.run.reason}`:done);await load();}catch(e){setError(e instanceof Error?e.message:"Request failed.");}finally{lock.current=false;setBusy(false);}}
 async function startConnect(){if(lock.current)return;lock.current=true;setBusy(true);setError("");setMessage("");try{const d=await post({action:"CONNECT_START"});if(d.status==="CONNECTED"){setChallenge(undefined);setMessage("Agentic Wallet connected.");await load();return;}const qr=await (await import("qrcode")).toDataURL(d.urlForWeb,{width:220,margin:2});setChallenge({...d,qr});}catch(e){setError(e instanceof Error?e.message:"Could not start the connection.");}finally{lock.current=false;setBusy(false);}}
 async function confirmConnect(){if(lock.current)return;lock.current=true;setBusy(true);setError("");setMessage("");try{await post({action:"CONNECT_VERIFY"});setChallenge(undefined);setMessage("Agentic Wallet connected. Now choose a Flow and an amount.");await load();}catch(e){setError(e instanceof Error?e.message:"Not confirmed yet.");}finally{lock.current=false;setBusy(false);}}
 const flow=flows.find(f=>f.id===flowId);
 const head=<><p className="eyebrow">Live Autopilot · Binance Agentic Wallet</p><h2>Let an agent invest for you, from your own wallet.</h2></>;
 if(signedOut)return <section className="purchase-panel agentic-live">{head}<p>Sign in to KeepFlow first. Your Autopilot, rules and receipts are tied to your wallet.</p><Link className="button" href="/account">Sign in</Link></section>;
 if(!data)return <section className="purchase-panel agentic-live">{head}<p>{error||"Loading…"}</p></section>;
 return <section className="purchase-panel agentic-live">{head}
  <p>Connect your own Binance Agentic Wallet. KeepFlow picks what to buy from your Flow and your rules; your Agentic Wallet executes it, within the daily limit you set in the Binance app. It never sells, never resends an unconfirmed order, and only records a purchase after it is confirmed on-chain.</p>
  {!data.live&&<p className="notice">Live Autopilot is switched off on the server right now. Use paper Autopilot below.</p>}
  {data.live&&!data.connected&&<div className="connect-box">
   <h3>Connect your Agentic Wallet</h3>
   {!challenge?<><ol className="connect-steps"><li>Have the <strong>Binance app</strong> with an Agentic Wallet, holding a little USDT and BNB on BNB Chain.</li><li>In the Binance app, set the Agentic Wallet’s <strong>daily limit</strong> to what you are comfortable with.</li><li>Press connect, scan the code with the Binance app and approve.</li></ol>
    <button className="button" disabled={busy} onClick={startConnect}>{busy?"Starting…":"Connect Agentic Wallet"}</button>
    <p className="fine-print">KeepFlow never sees your keys. It keeps a sign-in session only for your Autopilot, capped at {data.capUsd} USDT per purchase{data.dailyCapUsd?` and ${data.dailyCapUsd} USDT per day`:""}. Disconnect here or revoke it in the Binance app at any time.</p></>
   :<div className="connect-challenge">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={challenge.qr} alt="Binance Agentic Wallet sign-in QR code" width={220} height={220} className="login-qr-image"/>
    <p>Scan with the <strong>Binance app</strong>, check this code matches, then approve:</p><span className="pair-code">{challenge.pairingCode}</span>
    <p className="fine-print">On this phone? <a href={challenge.urlForWeb} target="_blank" rel="noopener noreferrer">Open the Binance sign-in page ↗</a> · Expires {new Date(challenge.expiresAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</p>
    <div className="agentic-actions"><button className="button" disabled={busy} onClick={confirmConnect}>{busy?"Checking with Binance…":"I’ve approved it"}</button><button className="quiet" disabled={busy} onClick={startConnect}>New code</button></div></div>}
  </div>}
  {data.live&&data.connected&&<>
   <dl><dt>Your Agentic Wallet</dt><dd>{data.wallet?.status==="CONNECTED"&&data.wallet.address?<span className="address">{short(data.wallet.address)} · connected</span>:<span className="error">{data.wallet?.status==="UNCONNECTED"||data.wallet?.status==="EXPIRED"?"Session ended. Disconnect and connect again.":"Unavailable right now"}</span>}</dd>
    {data.wallet?.quota&&<><dt>Binance app daily limit</dt><dd>{data.wallet.quota.used} used of {data.wallet.quota.dailyLimit} · {data.wallet.quota.left} left today</dd></>}
    <dt>KeepFlow caps</dt><dd>{data.capUsd} USDT per purchase{data.dailyCapUsd?` · ${data.dailyCapUsd} USDT per day`:""}</dd></dl>
   <label htmlFor="ag-flow">Flow</label><select id="ag-flow" value={flowId} onChange={e=>setFlowId(e.target.value)}><option value="">Choose a Flow</option>{flows.map(f=><option key={f.id} value={f.id}>{f.title} · v{f.version}</option>)}</select>
   <p className="fine-print">Your rules apply: by default no company may exceed 40% of your portfolio, so a single-stock Flow is skipped. Change this in <Link href="/rules">My rules</Link>.</p>
   <label htmlFor="ag-amount">USDT per contribution</label><input id="ag-amount" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/>
   <label htmlFor="ag-cadence">Schedule</label><select id="ag-cadence" value={cadence} onChange={e=>setCadence(e.target.value as "DAILY"|"WEEKLY")}><option value="DAILY">Daily · 09:00 WAT</option><option value="WEEKLY">Weekly · Mondays 09:00 WAT</option></select>
   <button className="button" disabled={busy||!flow} onClick={()=>flow&&act({action:"SAVE_PLAN",bellId:flow.id,bellVersion:flow.version,bellHash:flow.contentHash,contributionUsd:amount,cadence},"Plan saved. Enable it to run on schedule.")}>Save plan</button>
   {data.plan&&<div className="agentic-actions"><p className="fine-print">Plan: {data.plan.contributionUsd} USDT {data.plan.cadence.toLowerCase()} into {flows.find(f=>f.id===data.plan!.bellId)?.title??"your Flow"} · {data.plan.enabled?"running on schedule":"paused"}</p>
    <button className="button secondary" disabled={busy} onClick={()=>{if(window.confirm(`Buy up to ${data.plan!.contributionUsd} USDT of stocks now from your Agentic Wallet?`))void act({action:"RUN_NOW",requestId:crypto.randomUUID()},"Run finished.");}}>{busy?"Working…":"Run a contribution now"}</button>
    <button className="quiet" disabled={busy} onClick={()=>act({action:data.plan!.enabled?"PAUSE":"ENABLE"},data.plan!.enabled?"Autopilot paused.":"Autopilot enabled. It runs at 09:00 WAT.")}>{data.plan.enabled?"Pause schedule":"Turn on schedule"}</button></div>}
   {data.ownSession&&<button className="quiet danger" disabled={busy} onClick={()=>{if(window.confirm("Disconnect your Agentic Wallet from KeepFlow? Scheduled runs will stop."))void act({action:"DISCONNECT"},"Agentic Wallet disconnected.");}}>Disconnect Agentic Wallet</button>}
  </>}
  {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}
  {data.runs.length>0&&<div className="agentic-runs"><h3>Recent runs</h3>{data.runs.map(run=><article key={run.key} className="agentic-run"><p><strong>{run.state}</strong> · {run.trigger.toLowerCase()} · {new Date(run.createdAt).toLocaleString("en-GB",{timeZone:"UTC"})} UTC · {run.contributionUsd} USDT</p><p className="fine-print">{run.reason}</p><ul>{run.legs.map(leg=><li key={leg.ticker}>{leg.ticker} · {leg.amountUsd} USDT · {leg.state}{leg.txHash&&<> · <a href={`https://bscscan.com/tx/${leg.txHash}`} target="_blank" rel="noreferrer">BscScan ↗</a></>}<br/><span className="fine-print">{leg.reason}</span></li>)}</ul>{run.state==="PENDING"&&<button className="quiet" disabled={busy} onClick={()=>act({action:"RECONCILE",key:run.key},"Status refreshed.")}>Check settlement</button>}</article>)}</div>}
 </section>;
}
