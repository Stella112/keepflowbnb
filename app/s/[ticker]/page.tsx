import Link from "next/link";
import { notFound } from "next/navigation";
import {Navigation} from "../../navigation";
import { curatedTickers } from "../../../lib/binance/rwa-schemas";
import { StockView } from "./stock-view";
export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!curatedTickers.some((value) => value === ticker)) notFound();
  return <main><Navigation/><Link href="/stocks" className="back">← All stocks</Link><StockView ticker={ticker}/><footer><p>Real purchases are signed in your own wallet and settle on BNB Smart Chain. Tokenized stocks carry issuer, liquidity and market-hours risk. Paper practice uses virtual money only.</p></footer></main>;
}
