"use client";
import {useEffect,useState} from "react";
import type {Policy} from "../lib/paper/model";
import {PolicyDraft} from "./policy-draft";
import {AssistantPolicyImport} from "./assistant-policy-import";
const optionalNumbers=["maxSlippageBps","quoteMaxAgeSeconds","priceMaxAgeSeconds"] as const;
const optionalLabels={maxSlippageBps:"Maximum route slippage (basis points)",quoteMaxAgeSeconds:"Maximum quote age (seconds)",priceMaxAgeSeconds:"Maximum indicative price age (seconds)"};
export function RulesEditor({current,version,busy,onSave}:{current:Policy;version:number;busy:boolean;onSave:(policy:Policy,expectedVersion:number)=>void}){
 const [policy,setPolicy]=useState<Policy>(current),[expected,setExpected]=useState(version);
 useEffect(()=>{setPolicy(current);setExpected(version);},[current,version]);
 const apply=(draft:{policy:Policy},draftVersion:number)=>{setPolicy(draft.policy);setExpected(draftVersion);};
 return <div className="purchase-panel rules-editor"><PolicyDraft onApply={apply}/><AssistantPolicyImport disabled={busy} current={current} version={version} onApply={apply}/>
  <label htmlFor="max-trade">Maximum per purchase (USD)</label><input id="max-trade" inputMode="decimal" value={policy.maxTradeUsd} onChange={e=>setPolicy({...policy,maxTradeUsd:e.target.value})}/>
  {(["maxDailySpendUsd","maxWeeklySpendUsd"] as const).map(field=><div key={field}><label htmlFor={`personal-${field}`}>{field==="maxDailySpendUsd"?"Maximum daily spend (USD)":"Maximum weekly spend (USD)"}</label><input id={`personal-${field}`} inputMode="decimal" value={policy[field]??""} onChange={event=>{const next={...policy};if(event.target.value==="")delete next[field];else next[field]=event.target.value;setPolicy(next);}}/></div>)}
  <p className="fine-print">WAT calendar days and Monday-start weeks. Zero blocks purchases; blank removes that cap. Selling does not restore spent budget.</p>
  <label htmlFor="max-exposure">Maximum single holding weight (%)</label><input id="max-exposure" type="number" min="1" max="100" value={policy.maxSingleAssetBps/100} onChange={e=>setPolicy({...policy,maxSingleAssetBps:Math.round(Number(e.target.value)*100)})}/>
  <label htmlFor="min-reserve">Minimum USDT reserve (%)</label><input id="min-reserve" type="number" min="0" max="90" value={policy.minReserveBps/100} onChange={e=>setPolicy({...policy,minReserveBps:Math.round(Number(e.target.value)*100)})}/>
  <label htmlFor="drift">Minimum underweight drift (percentage points)</label><input id="drift" type="number" min="0" max="50" value={policy.driftBps/100} onChange={e=>setPolicy({...policy,driftBps:Math.round(Number(e.target.value)*100)})}/>
  {optionalNumbers.map(field=><div key={field}><label htmlFor={`personal-${field}`}>{optionalLabels[field]}</label><input id={`personal-${field}`} inputMode="numeric" value={policy[field]??""} onChange={event=>{const next={...policy};if(event.target.value==="")delete next[field];else next[field]=Number(event.target.value);setPolicy(next);}}/></div>)}
  <p className="fine-print">These rules apply to real-wallet purchases and paper trades. A Flow can only make them stricter, never looser. Quote and slippage caps apply to real-wallet purchases; paper fills do not model route slippage. Blank optional caps add no extra limit.</p>
  <button className="button" disabled={busy} onClick={()=>onSave(policy,expected)}>{busy?"Saving…":"Save my rules"}</button></div>;
}
