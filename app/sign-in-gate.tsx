"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {WalletConnect,type Provider} from "./wallet-connect";
import {signInWithWallet} from "./wallet-sign-in";
export function SignInGate(){
 const [wallet,setWallet]=useState<string|null|undefined>(undefined),[busy,setBusy]=useState(false),[error,setError]=useState("");const lock=useRef(false);
 useEffect(()=>{const abort=new AbortController();fetch("/api/account",{cache:"no-store",signal:abort.signal}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(!abort.signal.aborted)setWallet(typeof d.wallet==="string"?d.wallet:null);}).catch(()=>{if(!abort.signal.aborted)setWallet(null);});return()=>abort.abort();},[]);
 const signIn=useCallback(async(address:string,provider?:Provider)=>{if(!address||!provider||lock.current)return;lock.current=true;setBusy(true);setError("");try{const result=await signInWithWallet(address,provider);setWallet(result.wallet);}catch(e){setError(e instanceof Error?e.message:"Wallet sign-in was declined.");}finally{lock.current=false;setBusy(false);}},[]);
 if(wallet===undefined)return <p className="fine-print" aria-live="polite">Checking sign-in…</p>;
 if(wallet)return <p className="signed-in">Signed in · <span className="address">{wallet.slice(0,6)}…{wallet.slice(-4)}</span></p>;
 return <div className="sign-in-gate"><p><strong>Step 1 · Sign in with your wallet.</strong> Binance Wallet is recommended. Signing in is a free message signature; it grants no spending permission.</p><WalletConnect onAddress={signIn}/>{busy&&<p role="status">Confirm the KeepFlow sign-in message in your wallet…</p>}{error&&<p role="alert" className="error">{error}</p>}</div>;
}
