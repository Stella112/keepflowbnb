import {stringToHex} from "viem";
import type {Provider} from "./wallet-connect";
export async function signInWithWallet(address:string,provider:Provider){
 const start=await fetch("/api/account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"CHALLENGE",address})});const challenge=await start.json();if(!start.ok)throw new Error(challenge.error);
 const signature=await provider.request({method:"personal_sign",params:[stringToHex(challenge.message),address]});
 const verified=await fetch("/api/account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"VERIFY",signature})});const result=await verified.json();if(!verified.ok)throw new Error(result.error);return result as {wallet:string;restored:boolean};
}
