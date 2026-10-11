"use client";
import { useEffect, useState } from "react";
import { addressSchema } from "../lib/binance/rwa-schemas";
export type Provider = { request(args:{method:string;params?:unknown[]}):Promise<unknown>; on?(event:string,listener:(value:unknown)=>void):void;removeListener?(event:string,listener:(value:unknown)=>void):void };
type Wallet = { info:{uuid:string;name:string;icon?:string;rdns?:string};provider:Provider };
type InjectedWindow = { ethereum?:Provider&{isBinance?:boolean}; binancew3w?:{ethereum?:Provider} };
const BINANCE="binance-web3-wallet";
// Binance Web3 Wallet is always offered first. Detection follows Binance's EVM provider docs:
// window.binancew3w.ethereum (extension) and window.ethereum.isBinance (Binance app browser), plus EIP-6963.
const isBinance=(wallet:Wallet)=>/binance/i.test(wallet.info.name)||/binance/i.test(wallet.info.rdns??"");
const safeIcon=(icon?:string)=>icon&&/^data:image\/(svg\+xml|png|webp);/.test(icon)?icon:undefined;
function binanceProvider(wallets:Wallet[]):Provider|undefined{
 const injected=window as unknown as InjectedWindow;
 return wallets.find(isBinance)?.provider??injected.binancew3w?.ethereum??(injected.ethereum?.isBinance?injected.ethereum:undefined);
}
export function WalletConnect({onAddress}:{onAddress:(address:string,provider?:Provider)=>void}) {
  const [wallets,setWallets]=useState<Wallet[]>([]);const [chosen,setChosen]=useState(BINANCE);
  const [provider,setProvider]=useState<Provider>();const [address,setAddress]=useState("");
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [help,setHelp]=useState(false);
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
  const [legacy,setLegacy]=useState<Wallet>();
  // Wallets that predate EIP-6963 only inject window.ethereum; keep them reachable under a plain name.
  useEffect(()=>{const timer=setTimeout(()=>{const injected=(window as unknown as InjectedWindow).ethereum;if(injected&&!injected.isBinance)setLegacy({info:{uuid:"injected",name:"Browser wallet"},provider:injected});},400);return()=>clearTimeout(timer);},[]);
  const others=[...wallets.filter((wallet)=>!isBinance(wallet)),...(legacy&&!wallets.length?[legacy]:[])];
  const binanceIcon=safeIcon(wallets.find(isBinance)?.info.icon);
  async function connect(id:string){
    setChosen(id);setBusy(true);setError("");setAddress("");onAddress("");setHelp(false);
    try {
      const selected=id===BINANCE?binanceProvider(wallets):others.find((wallet)=>wallet.info.uuid===id)?.provider;
      if(!selected){
        if(id===BINANCE){setHelp(true);return;}
        throw new Error("That wallet is no longer available. Refresh the page and try again.");
      }
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
  if(address)return <div className="wallet-control"><p className="signed-in">Connected · <span className="address">{address.slice(0,6)}…{address.slice(-4)}</span> · BNB Smart Chain</p></div>;
  return <div className="wallet-control">
    <button className="button wallet-button binance-first" disabled={busy} onClick={()=>connect(BINANCE)}>{binanceIcon&&<img src={binanceIcon} alt="" width={22} height={22}/>}{busy&&chosen===BINANCE?"Connecting…":"Binance Web3 Wallet"}<span className="pill">Recommended</span></button>
    {help&&<div className="notice"><p><strong>Binance Web3 Wallet isn&apos;t available in this browser.</strong></p><p><strong>On a phone:</strong> in the Binance app, open the Wallet, tap Services → DApps, type <strong>keepflow.site</strong> in the address bar, then tap Binance Web3 Wallet again.</p><p><strong>On a computer:</strong> install the Binance Wallet extension, then refresh this page.</p><p><a href="https://www.binance.com/en/web3wallet" target="_blank" rel="noreferrer">Get Binance Web3 Wallet ↗</a></p></div>}
    {others.length>0&&<details className="other-wallets"><summary>Other wallets</summary><div className="other-wallet-list">{others.map((wallet)=><button key={wallet.info.uuid} className="secondary wallet-button" disabled={busy} onClick={()=>connect(wallet.info.uuid)}>{safeIcon(wallet.info.icon)&&<img src={safeIcon(wallet.info.icon)} alt="" width={20} height={20}/>}{busy&&chosen===wallet.info.uuid?"Connecting…":wallet.info.name}</button>)}</div></details>}
    {error&&<p role="alert" className="error">{error}</p>}
  </div>;
}
