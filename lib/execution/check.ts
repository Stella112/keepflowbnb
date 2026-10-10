import "server-only";
import {getDiscovery} from "../binance/rwa";
import {prepareQuote,quoteSummary,buildCandidate,simulateCandidate,PurchaseError} from "../binance/trading";
import {BinanceApiError} from "../binance/client-core";
import {toUnits} from "../binance/amounts";
import {walletPortfolio} from "./portfolio";
import {walletPolicy,quotePolicy,finalDryStatus,runSequentialDryLegs,type DryReceipt} from "./rules";
import {saveDryReceipt} from "./store";

import {prepareSponsoredExecution,sponsorCandidateFingerprint} from "../paymaster/workflow";

export async function checkBell(owner:string,fingerprint:string,receipt:DryReceipt,options?:{quoteOnly?:boolean}){
 const quoteOnly=options?.quoteOnly??receipt.checkKind==="QUOTE_ONLY";
 const save=()=>{if(!saveDryReceipt(owner,fingerprint,receipt))throw new Error("Read-only check lease is no longer active.");};
 try{
  const snapshot=await walletPortfolio(receipt.wallet);receipt.snapshot=snapshot;save();
  const discovery=await getDiscovery();let cash=BigInt(snapshot.cashMicros);const exposures={...snapshot.exposures};
  await runSequentialDryLegs(receipt.legs,async leg=>{
   try{
    const amount=toUnits(leg.amount,6);
    leg.policy=walletPolicy(amount,cash,BigInt(exposures[leg.ticker]??"0"),BigInt(snapshot.totalMicros),receipt.policy);
    // A hard amount limit is checked before requesting an upstream quote.
    if(amount<=0n||amount>25_000_000n){leg.status="BLOCKED";leg.reason=leg.policy.reason;return;}
    if(Date.now()-Date.parse(receipt.createdAt)>280_000)throw new PurchaseError("CHECK_TIMEOUT","The check took too long. Start a fresh check.");
    const candidates=discovery.tokens.filter(token=>token.underlyingTicker===leg.ticker&&token.statusInfo.openState);
    const asset=candidates.find(token=>token.platformId==="bstock")??candidates[0];
    if(!asset)throw new PurchaseError("ASSET_UNAVAILABLE","No available stock representation was discovered.");
    leg.provider=asset.platformId;
    const prepared=await prepareQuote({ticker:asset.underlyingTicker as Parameters<typeof prepareQuote>[0]["ticker"],provider:asset.platformId,wallet:receipt.wallet,amount:leg.amount});
    leg.quote=quoteSummary(prepared);leg.status="QUOTED";save();
    if(!leg.policy.allowed){leg.status="BLOCKED";leg.reason=leg.policy.reason;return;}
    const routePolicy=quotePolicy(receipt.policy,prepared.fetchedAt,snapshot.marketFetchedAt,50);
    if(!routePolicy.allowed){leg.policy=routePolicy;leg.status="BLOCKED";leg.reason=routePolicy.reason;return;}
    if(quoteOnly){leg.reason="Actual route quoted under wallet rules. No transaction build or simulation was requested.";cash-=amount;exposures[leg.ticker]=(BigInt(exposures[leg.ticker]??"0")+amount).toString();return;}
    const candidate=await buildCandidate(prepared);
    const sponsorCandidate={from:candidate.built.tx.from,to:candidate.built.tx.to,value:candidate.built.tx.value,data:candidate.built.tx.data,gas:candidate.built.tx.gas,gasPrice:candidate.built.tx.gasPrice};
    let simulationFingerprint:string|undefined;try{simulationFingerprint=sponsorCandidateFingerprint(sponsorCandidate);}catch{}
    const simulation=await simulateCandidate(prepared,candidate);leg.simulation=simulation;
    if(simulation.swapStatus!=="SUCCESS"||simulation.approvalStatus==="FAILED"){leg.status="FAILED";leg.reason=simulation.message;}
    else {const finalPolicy=quotePolicy(receipt.policy,prepared.fetchedAt,snapshot.marketFetchedAt,50);if(!finalPolicy.allowed){leg.policy=finalPolicy;leg.status="BLOCKED";leg.reason=finalPolicy.reason;return;}
     leg.sponsorship=await prepareSponsoredExecution({chainId:56,wallet:receipt.wallet,amountUsdtMicros:amount.toString(),quoteAt:prepared.fetchedAt,route:prepared.route.approveTarget,policyAllowed:true,candidate:sponsorCandidate,simulation:{swapStatus:simulation.swapStatus,approvalStatus:simulation.approvalStatus,checkedAt:simulation.checkedAt,transactionFingerprint:simulationFingerprint??""}});
     leg.status="SIMULATED";leg.reason="The real transaction simulated successfully. No approval or purchase was submitted.";cash-=amount;exposures[leg.ticker]=(BigInt(exposures[leg.ticker]??"0")+amount).toString();}
   }catch(error){leg.status="FAILED";leg.reason=error instanceof PurchaseError?error.message:error instanceof BinanceApiError&&error.businessCode===40375?"The provider requires a larger minimum order for this stock.":"The real quote or simulation could not be verified. No transaction was submitted.";}
  },save,quoteOnly?"QUOTED":"SIMULATED");
  receipt.status=finalDryStatus(receipt.legs,quoteOnly);
  receipt.reason=receipt.status==="QUOTED"?"All legs have actual route quotes under wallet rules. No builds, simulations or trades were submitted.":receipt.status==="SIMULATED"?"All legs passed the read-only checks. This is not a trade or proof of ownership.":"The basket stopped at the first blocked or failed leg. Any preceding results are read-only checks only.";
 }catch{receipt.status="FAILED";receipt.reason="The wallet snapshot could not be verified. No trades were attempted.";for(const leg of receipt.legs)leg.reason="Not started because wallet verification failed.";}
 receipt.finishedAt=new Date().toISOString();saveDryReceipt(owner,fingerprint,receipt);
}
