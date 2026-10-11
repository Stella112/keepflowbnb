import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rwaPriceSchema,candlesSchema,toCandles,buildGap,txDetailSchema,checkReceiptAgainstBinance,portfolioOverviewSchema,recentPnlSchema,buildWalletPnl} from '../lib/binance/market-schemas.ts';

const fixture=(name:string)=>JSON.parse(readFileSync(new URL(`../fixtures/api/${name}`,import.meta.url),'utf8'));
const ONDO='0xa9ee28c80f960b889dfbd1902055218cba016f75',BSTOCK='0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const token=(platformId:string,tokenContractAddress:string,openState=true)=>({platformId,tokenContractAddress,tokenToShareRatio:'1.000000000000000000',statusInfo:{openState,nextOpenTime:openState?null:1791725400000}});

test('real RWA price and candle responses parse; uppercase bar is a documented-looking value the API rejects',()=>{
 const prices=rwaPriceSchema.parse(fixture('rwa-price-nvda.json').data);
 assert.deepEqual(prices.map(p=>p.platformId).sort(),['bstock','ondo']);
 const candles=toCandles(candlesSchema.parse(fixture('candles-nvda-ondo-1h.json').data));
 assert.ok(candles.length>10);
 assert.ok(candles.every((c,i)=>i===0||c.time>candles[i-1].time));
 assert.equal(fixture('candles-bar-uppercase-error.json').code,40001);
});

test('gap compares issuers per underlying share and names the cheaper one',()=>{
 const prices=rwaPriceSchema.parse(fixture('rwa-price-nvda.json').data);
 const gap=buildGap({ticker:'NVDA',fetchedAt:'2026-10-11T00:00:00.000Z',tokens:[token('ondo',ONDO),token('bstock',BSTOCK)],prices,candles:{}});
 assert.equal(gap.legs.length,2);
 const ondo=gap.legs.find(l=>l.provider==='ondo')!;
 assert.equal(ondo.sharePrice,Math.round(Number(prices.find(p=>p.platformId==='ondo')!.tokenPrice)*1e4)/1e4);
 assert.equal(ondo.change24hPct,null);
 assert.equal(gap.cheaper,'bstock');
 assert.ok(gap.crossSpreadPct!>0&&gap.crossSpreadPct!<1);
 assert.equal(gap.marketOpen,true);
});

test('24h change uses the close nearest to one day before the last bar',()=>{
 const prices=rwaPriceSchema.parse(fixture('rwa-price-nvda.json').data);
 const h=3_600_000,c=(time:number,close:number)=>({time,open:close,high:close,low:close,close,volume:1});
 const gap=buildGap({ticker:'NVDA',fetchedAt:'x',tokens:[token('ondo',ONDO)],prices,candles:{[ONDO]:[c(0,200),c(h,210),c(25*h,231)]}});
 assert.equal(gap.legs[0].change24hPct,10);
});

test('gap respects token-to-share ratio, drops unmatched issuers and reports a closed market',()=>{
 const prices=rwaPriceSchema.parse(fixture('rwa-price-nvda.json').data);
 const halfShare={...token('ondo',ONDO,false),tokenToShareRatio:'0.5'};
 const gap=buildGap({ticker:'NVDA',fetchedAt:'2026-10-11T00:00:00.000Z',tokens:[halfShare,token('wrong-issuer',BSTOCK,false)],prices,candles:{}});
 assert.equal(gap.legs.length,1);
 assert.ok(Math.abs(gap.legs[0].sharePrice-Number(prices.find(p=>p.platformId==='ondo')!.tokenPrice)*2)<0.001);
 assert.equal(gap.crossSpreadPct,null);
 assert.equal(gap.marketOpen,false);
 assert.equal(gap.nextOpenTime,1791725400000);
});

test('Binance transaction detail independently matches a receipt and flags any difference',()=>{
 const rows=txDetailSchema.parse(fixture('tx-detail-nvda-buy.json').data);
 const d=rows[0];
 const wallet='0x172fcd41e0913e95784454622d1c3724f546f849';
 // The fixture is a router trade: treat the router as the "wallet" for the USDT leg and check field mapping.
 const receipt={hash:d.txhash,wallet,outcome:'CONFIRMED' as const,blockNumber:d.height,funding:'0x55d398326f99059ff775485246999027b3197955',stock:ONDO,
  spentUnits:'0',receivedUnits:'0',fundingDecimals:18,stockDecimals:18};
 const usdtOut=(d.tokenTransferDetails??[]).filter(t=>t.from===wallet&&t.tokenContractAddress===receipt.funding).reduce((s,t)=>s+BigInt(t.amount.replace('.','').replace(/^0+/,'')||'0')*10n**BigInt(18-(t.amount.split('.')[1]?.length??0)),0n);
 const matched=checkReceiptAgainstBinance({...receipt,spentUnits:usdtOut.toString(),stock:'0x2740fac3c69aab40c18ec90fee62500fa5be7777',receivedUnits:'0'},rows);
 assert.equal(matched.checks.find(c=>c.label.startsWith('Same transaction'))!.ok,true);
 assert.equal(matched.checks.find(c=>c.label.startsWith('Same block'))!.ok,true);
 assert.equal(matched.checks.find(c=>c.label.startsWith('USDT'))!.ok,true);
 assert.equal(matched.status,'MISMATCH'); // no stock tokens arrived at this address
 const wrongBlock=checkReceiptAgainstBinance({...receipt,blockNumber:'1'},rows);
 assert.equal(wrongBlock.status,'MISMATCH');
 assert.equal(checkReceiptAgainstBinance(receipt,[]).status,'NOT_INDEXED');

});

test('Address Portfolio keeps only listed tokenized stocks and sums 30 days of daily PnL',()=>{
 const overview=portfolioOverviewSchema.parse(fixture('portfolio-overview-holder.json').data);
 const recent=recentPnlSchema.parse(fixture('portfolio-recent-pnl-holder.json').data);
 const pnl=buildWalletPnl('0x73D8BD54F7CF5FAB43FE4EF40A62D390644946DB',overview,recent,[{tokenContractAddress:ONDO.toUpperCase().replace('0X','0x'),underlyingTicker:'NVDA'}],'2026-10-11T00:00:00.000Z');
 assert.equal(pnl.wallet,'0x73d8bd54f7cf5fab43fe4ef40a62d390644946db');
 assert.deepEqual(pnl.stocks.map(s=>s.ticker),['NVDA']);
 assert.equal(pnl.otherTokens,recent.pnlList.length-1);
 assert.equal(pnl.realizedPnlUsd,'93.52');
 assert.match(pnl.last30dPnlUsd,/^-?\d+\.\d{2}$/);
});

test('Wallet API balance list comes back empty for a wallet that holds tokenized stocks (kept as DevEx evidence)',()=>{
 const body=fixture('wallet-balances-empty-holder.json');
 assert.equal(body.code,0);
 assert.deepEqual(body.data[0].tokenAssets,[]);
 const recent=recentPnlSchema.parse(fixture('portfolio-recent-pnl-holder.json').data);
 assert.ok(recent.pnlList.some(r=>r.tokenContractAddress===ONDO&&Number(r.tokenBalanceAmount)>1000));
});
