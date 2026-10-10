import {getAddress,verifyMessage,type Hex} from "viem";
export type LoginChallenge={address:string;origin:string;nonce:string;issuedAt:string;expiresAt:string;message:string};
export function loginChallenge(address:string,origin:string,nonce:string,now=Date.now()):LoginChallenge{
 const url=new URL(origin);if(url.origin!==origin||!['http:','https:'].includes(url.protocol)||!/^[a-f0-9]{24}$/.test(nonce))throw new Error("Invalid sign-in challenge.");
 const checked=getAddress(address),issuedAt=new Date(now).toISOString(),expiresAt=new Date(now+300000).toISOString();
 const message=`${url.host} wants you to sign in with your Ethereum account:\n${checked}\n\nSign in to KeepFlow and recover your paper account. This does not authorize trades or transfers.\n\nURI: ${origin}\nVersion: 1\nChain ID: 56\nNonce: ${nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expiresAt}`;
 return {address:checked,origin,nonce,issuedAt,expiresAt,message};
}
export async function verifyLogin(challenge:LoginChallenge,origin:string,signature:Hex,now=Date.now()){
 if(challenge.origin!==origin||Date.parse(challenge.expiresAt)<=now||Date.parse(challenge.issuedAt)>now)return false;
 try{return await verifyMessage({address:challenge.address as Hex,message:challenge.message,signature});}catch{return false;}
}
