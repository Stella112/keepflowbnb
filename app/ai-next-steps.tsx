"use client";
import {useState} from "react";
import Link from "next/link";

/** Follow-ups a connected AI assistant can do with KeepFlow's MCP tools. Copying a prompt does nothing by itself. */
export function AiNextSteps({ticker,intentId}:{ticker:string;intentId:string}){
 const [copied,setCopied]=useState("");
 const ideas=[
  {title:"Build a Flow around it",tool:"create_flow_from_prompt",prompt:`Using KeepFlow, draft a Flow with ${ticker} 40%, two related stocks at 25% each, and keep 10% in USDT. Show me the draft before anything is saved.`},
  {title:"Check my portfolio",tool:"get_wallet_portfolio",prompt:"Using KeepFlow, show what my wallet holds now and how my tokenized-stock positions are split."},
  {title:"Preview Autopilot",tool:"preview_next_contribution",prompt:"Using KeepFlow, preview what my next Autopilot contribution would buy under my rules, and explain anything it would skip."},
  {title:"Explain this purchase",tool:"get_execution_status",prompt:`Using KeepFlow, look up purchase ${intentId} with get_execution_status and explain in plain words what happened and which checks it passed.`},
 ];
 async function copy(text:string){try{await navigator.clipboard.writeText(text);setCopied(text);setTimeout(()=>setCopied(""),2000);}catch{setCopied("");}}
 return <section className="purchase-panel ai-next"><p className="eyebrow">Build with AI</p><h2>What next? Ask your assistant.</h2><p>With KeepFlow connected to Claude or another MCP app, copy a prompt below. Assistants can research, draft and preview. They can&apos;t buy, sign or save anything for you.</p>
  <ul className="ai-ideas">{ideas.map(idea=><li key={idea.tool}><div><strong>{idea.title}</strong><p className="fine-print">{idea.prompt}</p></div><button className="secondary" onClick={()=>copy(idea.prompt)}>{copied===idea.prompt?"Copied":"Copy prompt"}</button></li>)}</ul>
  <p className="fine-print">Portfolio, Autopilot and purchase details need an assistant token that you approve for those tools. <Link href="/assistant">Set up KeepFlow in your AI app ↗</Link></p></section>;
}
