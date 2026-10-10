import test from "node:test";
import assert from "node:assert/strict";
import {readBoundedJson,RequestBodyError} from "../lib/request-body.ts";
test("all route byte ceilings reject oversized UTF-8 and accept exact boundaries regardless of Content-Length",async()=>{
 for(const limit of [256,512,2048,4096]){
  const valid=JSON.stringify({x:"a".repeat(limit-8)});
  assert.equal(Buffer.byteLength(valid),limit);
  assert.deepEqual(await readBoundedJson(new Request("https://firstbell.example",{method:"POST",headers:{"Content-Length":"0"},body:valid}),limit),{x:"a".repeat(limit-8)});
  await assert.rejects(readBoundedJson(new Request("https://firstbell.example",{method:"POST",headers:{"Content-Length":"0"},body:JSON.stringify({x:"🔔".repeat(limit/4)})}),limit),RequestBodyError);
 }
});
test("malformed stream is cancelled before later chunks are retained and lock is released",async()=>{
 let cancelled=false;const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array([255]));controller.enqueue(new Uint8Array(65536));},cancel(){cancelled=true;}});
 const request=new Request("https://firstbell.example",{method:"POST",body:stream,duplex:"half"} as RequestInit);
 await assert.rejects(readBoundedJson(request,2048),RequestBodyError);assert.equal(cancelled,true);assert.equal(request.body!.locked,false);
});
