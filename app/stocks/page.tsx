import type {Metadata} from "next";
import {Navigation} from "../navigation";
import {getDiscovery} from "../../lib/binance/rwa";
import {curatedTickers,marketLabel} from "../../lib/binance/rwa-schemas";
import {StockSearch,type StockRow} from "./stock-search";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Stocks · KeepFlow",description:"Tokenized US stocks and ETFs you can buy on BNB Smart Chain with USDT."};

export default async function Stocks(){
 const discovery=await getDiscovery().catch(()=>null);
 const rows:StockRow[]=curatedTickers.flatMap(ticker=>{
  const listed=(discovery?.tokens??[]).filter(t=>t.underlyingTicker===ticker&&t.binanceChainId==="56");if(!listed.length)return [];
  return [{ticker,name:listed[0].underlyingName??ticker,logo:listed[0].tokenLogoUrl,kind:listed[0].assetType===3?"ETF":"Stock",
   issuers:listed.map(t=>{const price=Number(t.tokenPrice)/Number(t.tokenToShareRatio);return {name:t.platformId==="ondo"?"Ondo":t.platformId==="bstock"?"bStocks":t.platformId,symbol:t.tokenSymbol,price:Number.isFinite(price)?price:null,open:t.statusInfo.openState,status:marketLabel(t)};})}];
 });
 return <main><Navigation/>
  <div className="hero compact"><p className="eyebrow">Tokenized stocks on BNB Smart Chain</p><h1>Stocks</h1><p className="intro">Buy tokenized versions of well-known US companies and ETFs with USDT, from your own wallet. Each one is issued by a token provider (bStocks or Ondo); KeepFlow shows which one you&apos;re buying.</p></div>
  {discovery&&rows.length?<StockSearch rows={rows} fetchedAt={discovery.fetchedAt}/>:<section className="empty" role="alert"><h2>Live stock data is unavailable.</h2><p>Binance market data couldn&apos;t be loaded, so nothing can be bought right now. Please try again in a minute.</p><a className="button" href="/stocks">Try again</a></section>}
  <p className="fine-print">Prices are onchain token prices from Binance RWA data, divided by each token&apos;s share ratio to show a price per share. They are indicative; the price you pay comes from a live quote before you sign. Tokenized stocks are issued by third parties and may not carry the rights of directly held shares.</p>
 </main>;
}
