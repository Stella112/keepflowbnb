import Link from 'next/link';
import type {Metadata} from 'next';
import {Navigation} from '../navigation';
import {publicShareUrl} from '../../lib/share-url';
import {delegationTools} from '../../lib/auth/mcp-delegation-schema';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Build with AI · KeepFlow',description:'Use KeepFlow from Claude or any MCP app: research tokenized stocks, draft Flows and get a purchase ready for your wallet.'};
export default function AssistantSetup(){
 const home=publicShareUrl(process.env.FIRSTBELL_PUBLIC_URL,'/'),endpoint=home?new URL('/api/mcp',home).href:null;
 const example=endpoint?`import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Optional: an approved token unlocks your private tools. Leave unset for public tools.
const token = process.env.KEEPFLOW_MCP_TOKEN;
const client = new Client({ name: "My KeepFlow assistant", version: "1" });
const transport = new StreamableHTTPClientTransport(new URL(${JSON.stringify(endpoint)}),
  token ? { requestInit: { headers: { Authorization: "Bearer " + token } } } : undefined);
try {
  await client.connect(transport);
  console.log((await client.listTools()).tools.map(tool => tool.name));
  console.log(await client.callTool({ name: "quote_flow", arguments: { flowId: "ai-compute", amount: "20" } }));
} finally {
  await client.close();
}`:null;
 const claudeCode=endpoint?`claude mcp add --transport http keepflow ${endpoint}`:null;
 const claudeCodePrivate=endpoint?`claude mcp add --transport http keepflow ${endpoint} --header "Authorization: Bearer $KEEPFLOW_MCP_TOKEN"`:null;
 const prompts=[
  'Which tokenized stocks can I buy on BNB Chain? Compare NVIDIA on Ondo and bStocks per share.',
  'Give me a research brief on Tesla: price, issuers, valuation and 52-week range.',
  'Draft a $50 Flow: NVIDIA 40%, Microsoft 30%, Alphabet 20%, keep 10% in USDT, max 40% in one company.',
  'What would $20 of the AI Compute Flow buy right now?',
  'I want to buy $5 of NVIDIA. Prepare the review link.',
 ];
 return <main><Navigation/>
 <div className="hero compact"><p className="eyebrow">Build with AI</p><h1>Research, plan and buy by asking.</h1><p className="intro">Add KeepFlow to Claude or any MCP app. Ask about tokenized stocks, turn an idea into a Flow, price it, and get a purchase ready. Your assistant can&apos;t spend money: you sign every purchase in your own wallet.</p></div>
 <div className="assistant-grid">
 <section className="purchase-panel"><h2>Connect in 30 seconds</h2><p>No account or token needed to start.</p>{endpoint?<><label htmlFor="mcp-url">Server URL</label><input id="mcp-url" readOnly value={endpoint}/>
  <h3>Claude (web or desktop)</h3><p>Settings → Connectors → <strong>Add custom connector</strong>. Name it KeepFlow and paste the server URL.</p>
  <h3>Claude Code</h3><pre className="code-block"><code>{claudeCode}</code></pre>
  <h3>Other MCP apps</h3><p>Add a remote server using Streamable HTTP and the URL above.</p></>:<p className="notice">The public server URL is not configured yet.</p>}</section>
 <section className="purchase-panel"><h2>Try asking</h2><ul className="prompt-list">{prompts.map(p=><li key={p}>“{p}”</li>)}</ul><p className="fine-print">Drafts work best with named companies and percentages. If a draft can&apos;t be made, KeepFlow tells your assistant how to rephrase and which stocks are available.</p></section>
 </div>
 <section className="purchase-panel"><h2>What your assistant can do</h2><div className="capability-table" role="table" aria-label="Assistant capabilities">
  <div role="row"><strong role="rowheader">Without a token</strong><p role="cell">Search stocks, research briefs and company facts, read and compare Flows, draft new Flows and rules, price estimates from live Binance prices, and purchase review links.</p></div>
  <div role="row"><strong role="rowheader">With a token you approve</strong><p role="cell">Everything above, plus your wallet holdings, paper portfolio, receipts and decisions, and real Binance quotes and simulations for your own wallet. You pick the exact tools; access lasts one hour and you can revoke it anytime.</p></div>
  <div role="row"><strong role="rowheader">Never</strong><p role="cell">Buy, sign or send a transaction, publish a Flow, save your rules or change Autopilot. Those always happen on KeepFlow, with your wallet.</p></div>
 </div></section>
 <section className="purchase-panel"><h2>How buying works</h2><ol className="review-steps"><li><strong>Ask to buy.</strong> Your assistant calls <code>prepare_purchase_review</code> and gives you a KeepFlow link. It lasts 15 minutes and carries no spending permission.</li><li><strong>Open it and sign in</strong> with Binance Wallet or another BSC wallet.</li><li><strong>KeepFlow checks again:</strong> a fresh quote, your USDT balance, your limits and a simulation of the exact transaction.</li><li><strong>You approve in your wallet</strong>, or close the page and nothing happens. The receipt is verified on BNB Smart Chain.</li></ol></section>
 <section className="purchase-panel"><h2>Private access (optional)</h2><ol className="review-steps"><li><Link href="/account">Sign in on the Account page</Link> with your wallet.</li><li>Under “Assistant access”, tick the tools you want (for example <code>get_wallet_portfolio</code>, <code>quote_flow</code>, <code>simulate_stock_buy</code>), review and approve. The token is shown once.</li><li>Add it to your app as the header <code>Authorization: Bearer YOUR_TOKEN</code>. In Claude Code:</li></ol>{claudeCodePrivate&&<pre className="code-block"><code>{claudeCodePrivate}</code></pre>}<p className="fine-print">Claude web and desktop connectors can&apos;t send custom headers yet, so they use the public tools. OAuth sign-in is not implemented. Keep tokens out of chats, URLs and source files.</p></section>
 <details className="purchase-panel"><summary>Developer details: SDK example, tool scopes and errors</summary><p>Uses <code>@modelcontextprotocol/sdk</code> 1.32.1 over stateless Streamable HTTP. Older <code>*_bell</code> tool names (from First Bell) still work alongside the Flow names, and existing <code>FIRSTBELL_*</code> settings are still read.</p>{example&&<pre className="code-block"><code>{example}</code></pre>}<details><summary>Tools a token can unlock</summary><ul>{delegationTools.map(name=><li key={name}><code>{name}</code></li>)}</ul></details><h3>If a request fails</h3><ul><li>401: the token or its approving sign-in has expired or been revoked. Approve a new one.</li><li>“Outside the current assistant grant”: that tool wasn&apos;t selected. Approve a new grant that includes it.</li><li>429: too many requests in a minute. Wait and retry.</li></ul><Link href="/account">Review or revoke assistant access ↗</Link></details>
 </main>;
}
