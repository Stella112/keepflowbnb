export function publicShareUrl(configured:string|undefined,path:string):string|null{
 if(path!=="/"&&!/^\/b\/[a-zA-Z0-9_-]+$/.test(path))return null;
 try{
  const origin=new URL(configured??"");
  if(origin.protocol!=="https:"||origin.username||origin.password||origin.pathname!=="/"||origin.search||origin.hash)return null;
  const host=origin.hostname.toLowerCase().replace(/\.$/,"");
  // Sharing currently supports public DNS and IPv4; IPv6 literals need separate routing verification.
  if(host.startsWith("[")||!host.includes(".")||host.endsWith(".localhost")||host.endsWith(".local")||/^(127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(host))return null;
  return origin.origin+path;
 }catch{return null;}
}
