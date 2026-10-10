// Purpose-specific public factual work. No secret, wallet, storage or signing import.
const sourceUrl='https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data';
const allowed=new Set(['search_stock','get_stock','get_stock_research','get_bell','get_bell_versions','compare_bell_versions']);
export function publicToolClient(baseUrl,fetcher=fetch){
 const base=new URL(baseUrl);if(base.origin!==baseUrl||base.username||base.password||!(base.protocol==='https:'||(base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname))))throw Error('SECURE_APP_ORIGIN_REQUIRED');
 return async(name,args,signal)=>{
  if(!allowed.has(name))throw Error('PUBLIC_READ_ONLY_TOOL_REQUIRED');
  const response=await fetcher(base.origin+'/api/tools',{method:'POST',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',Origin:base.origin},body:JSON.stringify({name,arguments:args})});
  if(!response.ok)throw Error('FIRST_BELL_READ_UNAVAILABLE');
  const reader=response.body?.getReader();if(!reader)throw Error('EMPTY_RESPONSE');let size=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>131072){await reader.cancel();throw Error('SOURCE_TOO_LARGE');}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  const data=JSON.parse(text);if(data.executionAvailable!==false||!Object.hasOwn(data,'result'))throw Error('UNVERIFIED_TOOL_RESPONSE');return data.result;
 };
}
export async function preparePublicBellReview(input,call,clock=Date.now,deadlineMs=25000){
 if(!Number.isInteger(deadlineMs)||deadlineMs<1||deadlineMs>25000)throw Error('BOUNDED_REVIEW_DEADLINE_REQUIRED');
 const controller=new AbortController();let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('PUBLIC_REVIEW_DEADLINE'));},deadlineMs);});
 const guardedCall=async(name,args)=>{controller.signal.throwIfAborted();const result=await call(name,args,controller.signal);controller.signal.throwIfAborted();return result;};
 try{return await Promise.race([prepareReview(input,guardedCall,clock),deadline]);}finally{clearTimeout(timer);controller.abort();}
}
async function prepareReview(input,call,clock){
 const checkedAt=()=>typeof clock==='function'?clock():clock;
 if(!input||Object.keys(input).sort().join(',')!=='bellContentHash,bellId,bellVersion'||typeof input.bellId!=='string'||input.bellId.length<1||input.bellId.length>80||!Number.isSafeInteger(input.bellVersion)||input.bellVersion<1||typeof input.bellContentHash!=='string'||input.bellContentHash.length>128)throw Error('PINNED_BELL_REQUIRED');
 const bell=await call('get_bell',{id:input.bellId});
 if(bell.id!==input.bellId||bell.version!==input.bellVersion||bell.contentHash!==input.bellContentHash)throw Error('BELL_VERSION_CHANGED');
 if(!Array.isArray(bell.assets)||bell.assets.length<1||bell.assets.length>8||new Set(bell.assets.map(a=>a.ticker)).size!==bell.assets.length||bell.assets.some(a=>typeof a.ticker!=='string'||!Number.isSafeInteger(a.weightBps)||a.weightBps<1)||!Number.isSafeInteger(bell.reserveBps)||bell.reserveBps<0||bell.assets.reduce((n,a)=>n+a.weightBps,0)+bell.reserveBps!==10000)throw Error('INVALID_BELL');
 const facts=[];
 for(const asset of bell.assets){
  const brief=await call('get_stock_research',{ticker:asset.ticker}),time=Date.parse(brief.source?.fetchedAt),now=checkedAt();
  if(brief.status!=='FACTUAL_DATA_ONLY'||brief.ticker!==asset.ticker||brief.source?.url!==sourceUrl||brief.source.name!=='Binance RWA discovery'||!Number.isFinite(now)||!Number.isFinite(time)||time>now||now-time>120000||!Array.isArray(brief.representations)||!brief.representations.length||brief.representations.length>32)throw Error('SOURCED_FACTS_UNAVAILABLE');
  const representations=brief.representations.map(rep=>{if(rep.chainId!==56||!/^0x[0-9a-fA-F]{40}$/.test(rep.contract)||typeof rep.provider!=='string'||typeof rep.tokenSymbol!=='string'||!/^\d+(\.\d+)?$/.test(rep.tokenPriceUsd))throw Error('INVALID_SOURCE_REPRESENTATION');return {provider:rep.provider,chainId:56,contract:rep.contract,tokenSymbol:rep.tokenSymbol,indicativeTokenPriceUsd:rep.tokenPriceUsd};});
  facts.push({ticker:asset.ticker,targetBps:asset.weightBps,source:{name:brief.source.name,url:sourceUrl,fetchedAt:brief.source.fetchedAt},representations});
 }
 const finishedAt=checkedAt();if(!Number.isFinite(finishedAt))throw Error('INVALID_REPORT_TIME');
 return {kind:'PUBLIC_SOURCED_BELL_REVIEW',bell:{id:bell.id,version:bell.version,contentHash:bell.contentHash},reserveBps:bell.reserveBps,facts,createdAt:new Date(finishedAt).toISOString(),executionEnabled:false,paymentSubmitted:false,studioRuntimeVerified:false,limitations:['Public factual data only; no private wallet, personal policy or account was accessed.','No model, rating, forecast, signing, saving, payment or trade occurred.','Indicative prices are not executable quotes.','This keyless standalone adapter does not prove Studio runtime, identity or deployment.']};
}
