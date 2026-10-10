export class RequestBodyError extends Error {}
export async function readBoundedJson(request:Request,limit:number):Promise<unknown>{
 if(!Number.isSafeInteger(limit)||limit<1||limit>65536)throw new RequestBodyError("Invalid request limit.");
 const reader=request.body?.getReader();if(!reader)throw new RequestBodyError("Invalid request.");
 const decoder=new TextDecoder("utf-8",{fatal:true});let bytes=0,text="";
 try{
  for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>limit)throw new RequestBodyError("Request body is too large.");text+=decoder.decode(part.value,{stream:true});}
  text+=decoder.decode();return JSON.parse(text);
 }catch(error){try{await reader.cancel();}catch{}throw error instanceof RequestBodyError?error:new RequestBodyError("Invalid request JSON.");}finally{reader.releaseLock();}
}
