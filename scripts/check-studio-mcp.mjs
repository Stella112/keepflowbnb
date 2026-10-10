import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const client=new Client({name:'firstbell-protocol-test',version:'1'});
const transport=new StdioClientTransport({command:process.execPath,args:['tools/studio-firstbell/app/agent/src/mcpMain.ts'],stderr:'pipe'});
try{await client.connect(transport);const result=await client.listTools();if(result.tools.length!==1||result.tools[0].name!=='review_public_bell'||result.tools[0].annotations.readOnlyHint!==true)throw Error('Unexpected tool authority');console.log('PASS real stdio MCP initialization and sole read-only tool registration; no signer/payment invoked');}finally{await client.close();}
