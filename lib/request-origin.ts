function loopback(hostname:string){return ['localhost','127.0.0.1','[::1]','::1'].includes(hostname.toLowerCase());}
export function requestOrigin(request:Request){
 const url=new URL(request.url),host=request.headers.get('host')??url.host;
 if(!/^[a-zA-Z0-9.:[\]-]+$/.test(host))return undefined;
 const forwarded=request.headers.get('x-forwarded-proto');
 // The deployed app listens on loopback and nginx overwrites this header.
 // A directly exposed application must not trust a client-supplied scheme.
 if(forwarded&&!loopback(url.hostname))return undefined;
 const protocol=forwarded??url.protocol.slice(0,-1);
 if(!['http','https'].includes(protocol))return undefined;
 try{return new URL(`${protocol}://${host}`).origin;}catch{return undefined;}
}
export function trustedIdentityOrigin(origin:string){
 try{const url=new URL(origin);return url.origin===origin&&!url.username&&!url.password&&(url.protocol==='https:'||(url.protocol==='http:'&&loopback(url.hostname)));}catch{return false;}
}
export function identityTransportAllowed(request:Request){const origin=requestOrigin(request);return !!origin&&trustedIdentityOrigin(origin);}
export function identityCookieSecure(request:Request){return requestOrigin(request)?.startsWith('https://')===true;}
export const identityTransportError='Wallet sign-in requires HTTPS. Public HTTPS is not reachable yet; use the localhost SSH preview until the server HTTPS connection is fixed.';
export function sameOrigin(request:Request){
  const origin=request.headers.get("origin");
  const host=request.headers.get("host")??new URL(request.url).host;
  // nginx overwrites this header; direct development requests use the URL protocol.
  const protocol=request.headers.get("x-forwarded-proto")??new URL(request.url).protocol.slice(0,-1);
  if(!origin||!["http","https"].includes(protocol)||!/^[a-zA-Z0-9.:[\]-]+$/.test(host))return false;
  try{return new URL(origin).origin===requestOrigin(request);}catch{return false;}
}
