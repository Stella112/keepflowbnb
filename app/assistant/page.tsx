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
 return <main><Navigation/><div className="hero compact"><p className="eyebrow">Assistant setup</p><h1>Give your assistant read access.</h1><p className="intro">Connect a client that supports Streamable HTTP MCP and a custom Authorization header.</p></div><section className="purchase-panel"><h2>Connect in three steps</h2><ol><li><Link href="/account">Sign in on the Account page</Link> with your wallet or phone QR.</li><li>Under “Assistant read access”, choose the exact tools, review the request and approve. The token is shown once.</li><li>Configure the endpoint below and the header <code>Authorization: Bearer YOUR_APPROVED_TOKEN</code> in your client’s secure credential settings.</li></ol>{endpoint?<><label htmlFor="mcp-endpoint">KeepFlow MCP endpoint</label><input id="mcp-endpoint" aria-label="KeepFlow MCP endpoint" readOnly value={endpoint}/><p className="fine-print">A token grants only its selected tools for one hour. Revoking the grant or its approving sign-in session stops access. Refreshing the grant list does not extend it.</p></>:<p className="notice">A public HTTPS endpoint has not been configured. The operator must configure it before external clients can connect.</p>}<p>Access permits selected reads and unsaved drafts only. It cannot publish a Flow, save personal rules, trade, sign, schedule activity or prepare transactions.</p><p className="fine-print">Automatic OAuth sign-in is not implemented. A client that requires OAuth and cannot set a custom Bearer header cannot use this connection method.</p></section><section className="purchase-panel"><h2>Check with the official SDK</h2><p>This example uses <code>@modelcontextprotocol/sdk</code> version 1.32.1. Set your token in the client process’s protected environment as <code>FIRSTBELL_MCP_TOKEN</code>. Keep credentials out of chats, URLs and source files.</p>{example&&<pre style={{overflowX:'auto',maxWidth:'100%'}}><code>{example}</code></pre>}<details><summary>Available read and unsaved draft scopes</summary><ul>{delegationTools.map(name=><li key={name}><code>{name}</code></li>)}</ul></details><h3>Draft with an assistant</h3><p>Explicitly select create_bell_from_prompt, modify_bell_from_prompt or create_policy_from_prompt when approving access. Draft tools return unsaved suggestions, never publication or trading permission. Review Flow suggestions in the Create page and personal rules in your portfolio before saving them separately.</p><h3>If a request fails</h3><ul><li>401: the token or approving session has expired or been revoked. Sign in and explicitly approve a new grant.</li><li>A tool is absent: it was not selected for that grant. Create a new grant with the required read scope.</li><li>429: the bounded request quota is busy. Wait before retrying reads.</li></ul><Link href="/account">Review or revoke assistant access ↗</Link></section></main>;
}
