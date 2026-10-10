import {stockAnalystPrice,stockAnalystOffer} from '../lib/research/stockanalyst.ts';
const price=await stockAnalystPrice();
const offer=await stockAnalystOffer({symbols:['AAPL'],analysis_type:'comprehensive'});
console.log(JSON.stringify({provider:price.provider,payTo:price.payTo,amountAtomic:price.amountAtomic,acceptedTokens:price.acceptedTokens.map(token=>({symbol:token.symbol,method:token.requirement.extra.assetTransferMethod})),priceAndChallengeAgree:offer.challenge.accepts.every(item=>item.payTo.toLowerCase()===price.payTo),paymentSent:false,privatePortfolioSent:false,requestHash:offer.requestHash}));
