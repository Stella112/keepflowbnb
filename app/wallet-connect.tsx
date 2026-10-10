"use client";
import { useEffect, useState } from "react";
import { addressSchema } from "../lib/binance/rwa-schemas";
export type Provider = { request(args:{method:string;params?:unknown[]}):Promise<unknown>; on?(event:string,listener:(value:unknown)=>void):void;removeListener?(event:string,listener:(value:unknown)=>void):void };
type Wallet = { info:{uuid:string;name:string};provider:Provider };
export function WalletConnect({onAddress}:{onAddress:(address:string,provider?:Provider)=>void}) {
  const [wallets,setWallets]=useState<Wallet[]>([]);const [chosen,setChosen]=useState("");
  const [provider,setProvider]=useState<Provider>();const [address,setAddress]=useState("");
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const announce=(event:Event)=>{
      const detail=(event as CustomEvent<Wallet>).detail;
      if(detail?.info?.uuid&&typeof detail.info.name==="string"&&typeof detail.provider?.request==="function")setWallets((current)=>current.some((wallet)=>wallet.info.uuid===detail.info.uuid)?current:[...current,detail]);
    };
    window.addEventListener("eip6963:announceProvider",announce);window.dispatchEvent(new Event("eip6963:requestProvider"));
    return ()=>window.removeEventListener("eip6963:announceProvider",announce);
  },[]);
  useEffect(()=>{
    if(!provider)return;
    const clear=()=>{setAddress("");onAddress("");};
    provider.on?.("accountsChanged",clear);provider.on?.("chainChanged",clear);provider.on?.("disconnect",clear);
    return ()=>{provider.removeListener?.("accountsChanged",clear);provider.removeListener?.("chainChanged",clear);provider.removeListener?.("disconnect",clear);};
  },[provider,onAddress]);
  async function connect(){
    setBusy(true);setError("");setAddress("");onAddress("");
    try {
      const selected=wallets.find((wallet)=>wallet.info.uuid===chosen)?.provider??wallets[0]?.provider??(window as unknown as {ethereum?:Provider}).ethereum;
      if(!selected)throw new Error("Open this page in a wallet browser or enable your wallet extension.");
      setProvider(selected);
      let accounts=await selected.request({method:"eth_requestAccounts"});
      if(!Array.isArray(accounts)||!addressSchema.safeParse(accounts[0]).success)throw new Error("Your wallet did not return a valid address.");
      if(await selected.request({method:"eth_chainId"})!=="0x38"){
        await selected.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x38"}]});
        if(await selected.request({method:"eth_chainId"})!=="0x38")throw new Error("Switch your wallet to BNB Smart Chain and reconnect.");
        accounts=await selected.request({method:"eth_accounts"});
        if(!Array.isArray(accounts)||!addressSchema.safeParse(accounts[0]).success)throw new Error("Reconnect your wallet after switching networks.");
      }
      setAddress(accounts[0]);onAddress(accounts[0],selected);
    }catch(error){setError(error instanceof Error?error.message:"Wallet connection was declined.");}
    finally{setBusy(false);}
  }
  return <div className="wallet-control">{wallets.length>1&&<><label htmlFor="wallet">Wallet</label><select id="wallet" value={chosen||wallets[0].info.uuid} onChange={(event)=>{setChosen(event.target.value);setAddress("");onAddress("");}}>{wallets.map((wallet)=><option key={wallet.info.uuid} value={wallet.info.uuid}>{wallet.info.name}</option>)}</select></>}<button className="button" disabled={busy} onClick={connect}>{busy?"Connecting…":address?`${address.slice(0,6)}…${address.slice(-4)} · BSC`:"Connect wallet"}</button>{error&&<p role="alert" className="error">{error}</p>}</div>;
}
