import {ImageResponse} from "next/og";
import {getBell} from "../../../lib/paper/store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const alt="KeepFlow portfolio allocation";
export const size={width:1200,height:630};
export const contentType="image/png";
export default async function BellImage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,bell=getBell(id);
 if(!bell)return new Response("Flow unavailable",{status:404,headers:{"Cache-Control":"no-store"}});
 return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:"#101820",color:"#fff",padding:64,fontFamily:"sans-serif"}}>
  <div style={{display:"flex",fontSize:25,color:"#f4ce56"}}>KEEPFLOW · BNB SMART CHAIN</div>
  <div style={{display:"flex",fontSize:58,fontWeight:700,marginTop:28,lineHeight:1.1}}>{bell.title}</div>
  <div style={{display:"flex",fontSize:24,marginTop:20,color:"#c3ccd5"}}>Published version {bell.version} · Target allocations</div>
  <div style={{display:"flex",flexWrap:"wrap",gap:14,marginTop:32}}>{bell.assets.map(asset=><div key={asset.ticker} style={{display:"flex",padding:"14px 20px",background:"#26333f",borderRadius:12,fontSize:26}}>{asset.ticker} · {asset.weightBps/100}%</div>)}{bell.reserveBps>0&&<div style={{display:"flex",padding:"14px 20px",background:"#26333f",borderRadius:12,fontSize:26}}>USDT reserve · {bell.reserveBps/100}%</div>}</div>
  <div style={{display:"flex",marginTop:"auto",fontSize:24,color:"#c3ccd5"}}>Scan it. Own it. Fork it. Automate it.</div>
 </div>,size);
}
