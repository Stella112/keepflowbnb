"use client";
import {useEffect,useState} from "react";
export function ShareLink({url,label}:{url:string|null,label:string}){
 const [qr,setQr]=useState(""),[message,setMessage]=useState("");
 useEffect(()=>{let active=true;setQr("");setMessage("");if(url)import("qrcode").then(module=>module.toDataURL(url,{width:180,margin:2})).then(image=>{if(active)setQr(image);}).catch(()=>{if(active)setMessage("QR is unavailable. Use the share link.");});return()=>{active=false;};},[url]);
 async function share(){if(!url)return;try{if(navigator.share)await navigator.share({title:label,url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);setMessage("Link copied.");}else setMessage("Select and copy the link below.");}catch{setMessage("Select and copy the link below.");}}
 return <div className="share-box">{url?<><button className="quiet" onClick={share}>Share {label} ↗</button><input aria-label={`${label} share link`} readOnly value={url} onFocus={event=>event.target.select()}/>{qr&&<img className="qr-image" src={qr} alt={`QR code containing the ${label} HTTPS share link`}/>}<p className="fine-print" role="status">{message||"This link opens KeepFlow. It contains no sign-in credential or wallet permission."}</p></>:<p className="fine-print">Public sharing is unavailable until the app has a configured HTTPS address.</p>}</div>;
}
