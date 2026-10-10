import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {createServer} from 'node:http';
import {z} from 'zod';
import {validateStudioReadOnlyConfiguration} from './studioConfig.mjs';
import {publicToolClient,preparePublicBellReview} from './sellerCore.mjs';
// Actual public MCP face; no Studio wallet bootstrap or payment.
const officialConfig=await validateStudioReadOnlyConfiguration();
const call=publicToolClient(process.env.FIRST_BELL_PUBLIC_ORIGIN??'http://localhost:3100');
function createPublicServer(){
const server=new McpServer({name:'firstbell-public-review',version:'1.0.0'});
server.registerTool('review_public_bell',{
 description:'Read a pinned public Flow and sourced stock facts. No private account, wallet or paid research access.',
 inputSchema:{bellId:z.string().min(1).max(80),bellVersion:z.number().int().positive(),bellContentHash:z.string().min(1).max(128)},
 annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}
},async input=>{try{const result=await preparePublicBellReview(input,call);return {content:[{type:'text' as const,text:JSON.stringify({...result,studioConfiguration:officialConfig})}]};}catch{return {isError:true,content:[{type:'text' as const,text:'Pinned public review unavailable. Nothing was signed, paid or submitted.'}]};}});
return server;
}
// The official bag dev launcher supplies AGENT_PORT for its MCP HTTP face.
// Default stdio remains available to local MCP clients. Never bind externally.
if(process.env.AGENT_PORT){
 const port=Number(process.env.AGENT_PORT);
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('VALID_LOCAL_MCP_PORT_REQUIRED');
 let admitted=0;
 const http=createServer(async(req,res)=>{
  if(req.url!=='/mcp'){res.writeHead(404);res.end();return;}
  if(req.headers.host!==`127.0.0.1:${port}`&&req.headers.host!==`localhost:${port}`){res.writeHead(403);res.end();return;}
  if(req.headers.origin){res.writeHead(403);res.end();return;}
  if(req.method!=='POST'){res.writeHead(405,{Allow:'POST'});res.end();return;}
  if(admitted>=4){res.writeHead(429,{'Retry-After':'1'});res.end();return;}
  admitted++;let released=false;const release=()=>{if(!released){released=true;admitted--;}};
  let size=0;const chunks:Buffer[]=[];
  try{
   for await(const chunk of req){size+=chunk.length;if(size>16384){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   const server=createPublicServer();
   const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
   res.on('close',()=>{void transport.close();void server.close();});
   await server.connect(transport);await transport.handleRequest(req,res,body);
  }catch{if(!res.headersSent)res.writeHead(400);res.end();}finally{release();}
 });
 http.requestTimeout=10000;http.headersTimeout=10000;
 http.listen(port,'127.0.0.1');
}else await createPublicServer().connect(new StdioServerTransport());
