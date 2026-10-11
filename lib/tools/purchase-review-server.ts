import "server-only";
import {PurchaseReviewStore,type PurchaseReviewInput} from "./purchase-review";
import {paperDatabase,getBell} from "../paper/store";
import {getDiscovery} from "../binance/rwa";
import {publicShareUrl} from "../share-url";
import {ToolError} from "./service";

export const purchaseReviews=()=>new PurchaseReviewStore(paperDatabase());

/** Creates a short-lived link to KeepFlow's normal, wallet-signed purchase screen. Nothing is quoted, reserved or executed here. */
export async function createReview(input:PurchaseReviewInput,owner:string|undefined){
 const home=publicShareUrl(process.env.FIRSTBELL_PUBLIC_URL,"/");if(!home)throw new ToolError("NOT_CONFIGURED","The public KeepFlow address is not configured.");
 let summary:Record<string,unknown>,review;
 if(input.flowId){
  const flow=getBell(input.flowId);if(!flow)throw new ToolError("NOT_FOUND","Flow not found.");
  review=purchaseReviews().create({kind:"FLOW",flowId:flow.id,flowVersion:flow.version,amount:input.amount,owner,source:"MCP"});
  summary={flow:{id:flow.id,title:flow.title,version:flow.version},holdings:flow.assets.map(a=>({ticker:a.ticker,weightBps:a.weightBps})),reserveBps:flow.reserveBps};
 }else{
  const ticker=input.ticker!,listed=(await getDiscovery()).tokens.filter(t=>t.underlyingTicker===ticker&&t.binanceChainId==="56"&&t.statusInfo.openState);
  const token=input.provider?listed.find(t=>t.platformId===input.provider):listed.find(t=>t.platformId==="bstock")??listed[0];
  if(!token)throw new ToolError("UNAVAILABLE","That stock has no open BNB Smart Chain listing right now.");
  review=purchaseReviews().create({kind:"STOCK",ticker,provider:token.platformId,amount:input.amount,owner,source:"MCP"});
  summary={ticker,provider:token.platformId,tokenSymbol:token.tokenSymbol,contract:token.tokenContractAddress};
 }
 return {status:"REVIEW_LINK_CREATED",executed:false,executionEnabled:false,reviewUrl:new URL(`/review/${review.id}`,home).href,expiresAt:new Date(review.expiresAt).toISOString(),amountUsdt:review.amount,boundToAccount:Boolean(owner),...summary,
  next:"Open the link and sign in with your own wallet. KeepFlow then gets a fresh quote, checks your USDT balance and your rules, and simulates the transaction. Your wallet asks you to approve; nothing happens until you sign."};
}
