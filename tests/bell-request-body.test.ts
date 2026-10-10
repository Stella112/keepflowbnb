import test from "node:test";
import assert from "node:assert/strict";
import {readBellBody} from "../lib/bells/request-body.ts";
function streamed(chunks:Uint8Array[],cancel:()=>void=()=>{}){return new Request("https://firstbell.example/api/bells",{method:"POST",body:new ReadableStream({start(controller){for(const chunk of chunks)controller.enqueue(chunk);},cancel}),duplex:"half"} as RequestInit);}
test("Flow body rejects oversized streams by bytes and cancels before reading the remainder",async()=>{
 let cancelled=false;const request=streamed([new Uint8Array(4097),new Uint8Array(100_000)],()=>{cancelled=true;});await assert.rejects(readBellBody(request),/too large/);assert.equal(cancelled,true);
});
test("Flow body decodes split UTF-8 exactly and rejects malformed UTF-8",async()=>{
 const encoded=new TextEncoder().encode(JSON.stringify({title:"Café 🔔"}));
 const request=new Request("https://firstbell.example",{method:"POST",body:new ReadableStream({start(controller){for(const byte of encoded)controller.enqueue(new Uint8Array([byte]));controller.close();}}),duplex:"half"} as RequestInit);
 assert.deepEqual(await readBellBody(request),{title:"Café 🔔"});
 const invalid=new Request("https://firstbell.example",{method:"POST",body:new Uint8Array([123,34,120,34,58,34,255,34,125])});await assert.rejects(readBellBody(invalid));
});
test("Flow body accepts the exact byte boundary and rejects missing or invalid JSON",async()=>{
 const raw=JSON.stringify({x:"a".repeat(4088)});assert.equal(Buffer.byteLength(raw),4096);
 assert.deepEqual(await readBellBody(new Request("https://firstbell.example",{method:"POST",body:raw})),{x:"a".repeat(4088)});
 await assert.rejects(readBellBody(new Request("https://firstbell.example",{method:"POST"})));
 await assert.rejects(readBellBody(new Request("https://firstbell.example",{method:"POST",body:"{"})));
});
