import {inspectResearchPayment,type ResearchMerchant} from './payment-challenge.ts';

export type ResearchOfferConfiguration=ResearchMerchant&{enabled:boolean;approvedOrigin:string};
const unavailable=(code:string)=>({status:'UNAVAILABLE' as const,code,paymentAuthorized:false as const,paymentSubmitted:false as const,executionEnabled:false as const});
/** Retrieves an offer only. Never creates a payment signature, retries a 402,
 * follows a redirect, passes cookies/credentials, or reads a paid report. The
 * merchant URL and origin are trusted operator configuration, never user input. */
export async function fetchResearchOffer(configuration:ResearchOfferConfiguration|undefined,dependencies:{fetch?:typeof fetch;now?:()=>number}={}){
 if(!configuration?.enabled)return unavailable('RESEARCH_PROVIDER_NOT_CONFIGURED');
 try{
  const url=new URL(configuration.url),origin=new URL(configuration.approvedOrigin);
  if(url.protocol!=='https:'||url.origin!==origin.href.replace(/\/$/,'')||url.username||url.password||url.hash||origin.pathname!=='/'||origin.search||origin.hash)throw Error();
  const host=url.hostname.toLowerCase();
  // Restrict provider binding to an operator-approved public DNS name. No IP,
  // loopback/local DNS, arbitrary headers or caller-provided endpoint is accepted.
  if(!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host)||!host.includes('.')||/^\d+(?:\.\d+){3}$/.test(host)||['localhost','local','internal','test','invalid','example'].some(suffix=>host===suffix||host.endsWith('.'+suffix)))throw Error();
  for(const [name,value] of url.searchParams)if(name!=='ticker'||!['NVDA','MSFT','AAPL','AMZN','GOOGL','META','TSLA','SPY'].includes(value))throw Error();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await(dependencies.fetch??fetch)(url,{method:'GET',headers:{Accept:'application/json'},credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});
   try{
    if(response.status!==402)return unavailable('PROVIDER_DID_NOT_RETURN_PAYMENT_OFFER');
    const header=response.headers.get('PAYMENT-REQUIRED');if(!header)throw Error();
    return inspectResearchPayment(header,configuration,(dependencies.now??Date.now)());
   }finally{await response.body?.cancel().catch(()=>{});}
  }finally{clearTimeout(timer);}
 }catch{return unavailable('RESEARCH_OFFER_UNVERIFIED');}
}
