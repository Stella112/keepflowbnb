import Link from 'next/link';
import {notFound} from 'next/navigation';
import {existingAccountId,paperDatabase} from '../../../lib/paper/store';
import {LiveReceiptStore} from '../../../lib/execution/live-receipt';
import {fromUnits} from '../../../lib/binance/amounts';
import {Navigation} from '../../navigation';
export const dynamic='force-dynamic';
export default async function TransactionReceipt({params}:{params:Promise<{id:string}>}){
 const {id}=await params,owner=await existingAccountId(),receipt=owner?new LiveReceiptStore(paperDatabase()).read(owner,id):undefined;if(!receipt)notFound();
 return <main><Navigation/><section className="hero compact"><p className="eyebrow">Verified BSC transaction</p><h1>{receipt.outcome==='CONFIRMED'?'Purchase confirmed.':'Transaction reverted.'}</h1><p>{receipt.ticker} · {receipt.provider}</p><dl><dt>USDT spent</dt><dd>{fromUnits(BigInt(receipt.spentUnits),receipt.fundingDecimals)}</dd><dt>Stock tokens received</dt><dd>{fromUnits(BigInt(receipt.receivedUnits),receipt.stockDecimals)}</dd><dt>Wallet</dt><dd className="address">{receipt.wallet}</dd><dt>Transaction hash</dt><dd className="address">{receipt.hash}</dd><dt>Block</dt><dd>{receipt.blockNumber} · {receipt.confirmations} confirmations verified</dd><dt>Confirmed at</dt><dd>{receipt.confirmedAt}</dd></dl><p><a href={`https://bscscan.com/tx/${receipt.hash}`} target="_blank" rel="noreferrer">View on BscScan ↗</a></p><p><Link href={`/api/transactions/${receipt.intentId}`}>Download verified receipt JSON</Link></p><p className="fine-print">The receipt records exact matching token effects and canonical BSC finality. Gas costs are paid separately and are not included in USDT spent.</p></section></main>;
}

