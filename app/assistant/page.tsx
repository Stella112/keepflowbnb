import Link from 'next/link';
import {Navigation} from '../navigation';
import {publicShareUrl} from '../../lib/share-url';
import {delegationTools} from '../../lib/auth/mcp-delegation-schema';
export const dynamic='force-dynamic';
export default function AssistantSetup(){
 const home=publicShareUrl(process.env.FIRSTBELL_PUBLIC_URL,'/'),endpoint=home?new URL('/api/mcp',home).href:null;
 const example=endpoint?`import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const token = process.env.FIRSTBELL_MCP_TOKEN;
if (!token) throw new Error("Configure your approved read token securely.");
const client = new Client({ name: "My KeepFlow assistant", version: "1" });
const transport = new StreamableHTTPClientTransport(new URL(${JSON.stringify(endpoint)}), {
  requestInit: { headers: { Authorization: "Bearer " + token } }
});
try {
  await client.connect(transport);
  console.log((await client.listTools()).tools.map(tool => tool.name));
  // Select get_bell during approval to enable this example.
  console.log(await client.callTool({ name: "get_bell", arguments: { id: "ai-compute" } }));
} finally {
  await client.close();
}`:null;
 const claudeCode=endpoint?`claude mcp add --transport http keepflow ${endpoint}`:null;
 const prompts=["What tokenized stocks can I buy on BNB Chain? Compare the Ondo and bStocks versions of NVIDIA.","Show me the AI Compute Flow and explain what each stock is.","Draft a $50 Flow of semiconductor stocks, max 30% in one company, keep 10% in USDT.","Fork Everyday Leaders but replace Amazon with Alphabet."];
 return <main><Navigation/><div className="hero compact"><p className="eyebrow">KeepFlow for AI assistants</p><h1>Ask Claude about your stocks.</h1><p className="intro">KeepFlow has an MCP server. Connect it to Claude or any MCP client to search tokenized stocks, read Flows and draft new portfolios in plain English. It never moves money: every purchase is still signed by you, in your own wallet.</p></div>
 <section className="purchase-panel"><h2>Connect in 30 seconds</h2><p>No account or token needed for stock data, Flows and drafts.</p>{endpoint?<><label htmlFor="mcp-url">Server URL</label><input id="mcp-url" readOnly value={endpoint}/><h3>Claude Code</h3><pre className="code-block"><code>{claudeCode}</code></pre><h3>Claude desktop or claude.ai</h3><p>Settings → Connectors → <strong>Add custom connector</strong>, name it KeepFlow and paste the server URL.</p><h3>Other MCP clients</h3><p>Use Streamable HTTP with the server URL above.</p></>:<p className="notice">The public server URL is not configured yet.</p>}
 <h3>Try asking</h3><ul className="prompt-list">{prompts.map(p=><li key={p}>“{p}”</li>)}</ul></section>
 <section className="purchase-panel"><h2>Let it see your portfolio (optional)</h2><p>To let an assistant read your own portfolio, receipts and agent decisions, approve a token for exactly the tools you choose. It lasts one hour and you can revoke it anytime.</p></section>
 <section className="purchase-panel"><h2>Private access in three steps</h2><ol><li><Link href="/account">Sign in on the Account page</Link> with your wallet or phone QR.</li><li>Under “Assistant read access”, choose the exact tools, review the request and approve. The token is shown once.</li><li>Configure the endpoint below and the header <code>Authorization: Bearer YOUR_APPROVED_TOKEN</code> in your client’s secure credential settings.</li></ol>{endpoint?<><label htmlFor="mcp-endpoint">KeepFlow MCP endpoint</label><input id="mcp-endpoint" aria-label="KeepFlow MCP endpoint" readOnly value={endpoint}/><p className="fine-print">A token grants only its selected tools for one hour. Revoking the grant or its approving sign-in session stops access. Refreshing the grant list does not extend it.</p></>:<p className="notice">A public HTTPS endpoint has not been configured. The operator must configure it before external clients can connect.</p>}<p>Access permits selected reads and unsaved drafts only. It cannot publish a Flow, save personal rules, trade, sign, schedule activity or prepare transactions.</p><p className="fine-print">Private access needs a client that can send a custom Authorization header (Claude Code: add <code>--header "Authorization: Bearer YOUR_TOKEN"</code>). OAuth sign-in is not implemented yet.</p></section><details className="purchase-panel"><summary>Developer details: official SDK example, scopes and errors</summary><p>This example uses <code>@modelcontextprotocol/sdk</code> version 1.32.1. Set your token in the client process’s protected environment as <code>FIRSTBELL_MCP_TOKEN</code>. Keep credentials out of chats, URLs and source files.</p>{example&&<pre style={{overflowX:'auto',maxWidth:'100%'}}><code>{example}</code></pre>}<details><summary>Available read and unsaved draft scopes</summary><ul>{delegationTools.map(name=><li key={name}><code>{name}</code></li>)}</ul></details><h3>Draft with an assistant</h3><p>Explicitly select create_bell_from_prompt, modify_bell_from_prompt or create_policy_from_prompt when approving access. Draft tools return unsaved suggestions, never publication or trading permission. Review Flow suggestions in the Create page and personal rules in your portfolio before saving them separately.</p><h3>If a request fails</h3><ul><li>401: the token or approving session has expired or been revoked. Sign in and explicitly approve a new grant.</li><li>A tool is absent: it was not selected for that grant. Create a new grant with the required read scope.</li><li>429: the bounded request quota is busy. Wait before retrying reads.</li></ul><Link href="/account">Review or revoke assistant access ↗</Link></details></main>;
}
