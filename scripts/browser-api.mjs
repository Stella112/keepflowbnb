// Test helper: use Chromium's verified TLS transport for IP certificates through CONNECT.
// No certificate bypass, application interception, or fabricated responses.
export async function useBrowserApi(context){
 const run=async(url,options={},method='GET')=>{
  const target=new URL(url),foreign=options.headers?.Origin&&options.headers.Origin!==target.origin;
  let page=context.pages()[0];if(!page)page=await context.newPage();
  if(foreign){
   const probe=await context.newPage();await probe.goto('data:text/html,cross-origin-test');
   const actual=probe.waitForResponse(response=>response.url()===url&&response.request().method()===method,{timeout:5000}).catch(()=>undefined);
   const blocked=await probe.evaluate(async({url,method,data})=>{try{await fetch(url,{method,headers:{'Content-Type':'text/plain'},body:JSON.stringify(data),signal:AbortSignal.timeout(10000)});return false;}catch{return true;}},{url,method,data:options.data});
   const response=await actual;await probe.close();
   return {status:()=>response?.status(),json:async()=>({}),blockedByBrowser:!response&&blocked};
  }
  if(!page.url().startsWith(target.origin+'/'))await page.goto(target.origin+'/account',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async({url,method,data})=>{
   const response=await fetch(url,{method,credentials:'same-origin',headers:method==='POST'?{'Content-Type':'application/json'}:undefined,...(method==='POST'?{body:JSON.stringify(data)}:{}),cache:'no-store'});
   return {status:response.status,body:await response.json()};
  },{url,method,data:options.data});
  return {status:()=>result.status,json:async()=>result.body};
 };
 context.request.get=(url,options)=>run(url,options,'GET');
 context.request.post=(url,options)=>run(url,options,'POST');
 return context;
}
