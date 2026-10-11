"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import type {Policy} from "../../lib/paper/model";
import {paperRequestId} from "../../lib/paper/request-id";
import {RulesEditor} from "../rules-editor";
import {SignInGate} from "../sign-in-gate";
type Account={policy:Policy;policyVersion:number};
export function RulesView(){
 const [account,setAccount]=useState<Account>(),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const load=useCallback(async()=>{setError("");try{const response=await fetch("/api/paper",{cache:"no-store"});const data=await response.json();if(!response.ok||typeof data.policyVersion!=="number"||!data.policy)throw new Error("Your rules are unavailable. Refresh to try again.");setAccount({policy:data.policy,policyVersion:data.policyVersion});}catch(e){setError(e instanceof Error?e.message:"Your rules are unavailable.");}},[]);
 useEffect(()=>{void load();},[load]);
 async function save(policy:Policy,expectedPolicyVersion:number){setBusy(true);setError("");setMessage("");try{const response=await fetch("/api/paper",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"POLICY",policy,expectedPolicyVersion,requestId:paperRequestId()})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Your rules could not be saved.");await load();setMessage("Rules saved. New checks and purchases use them immediately.");}catch(e){setError(e instanceof Error?e.message:"Your rules could not be saved.");}finally{setBusy(false);}}
 return <div className="stock-layout"><section><p className="eyebrow">Your limits, enforced every time</p><h2>What KeepFlow will never do for you.</h2><ul className="rule-promises"><li>Spend more per purchase, per day or per week than you allow.</li><li>Let one company grow past your maximum weight.</li><li>Dip below your USDT reserve.</li><li>Use a stale quote or a route with too much slippage.</li><li>Sell automatically. Contributions go to underweight holdings first.</li></ul><p className="fine-print">A Flow creator, an assistant or Autopilot can only make these rules stricter. Every decision is recorded on a receipt you can inspect.</p><p><Link className="text-link" href="/portfolio">Open my wallet ↗</Link></p></section><aside><SignInGate/>{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}{account?<RulesEditor current={account.policy} version={account.policyVersion} busy={busy} onSave={save}/>:!error&&<p className="fine-print" aria-live="polite">Loading your rules…</p>}</aside></div>;
}
