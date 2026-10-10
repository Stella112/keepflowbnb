import {readBoundedJson} from "../../../../lib/request-body";
import {draftFromPrompt,draftRequestSchema} from "../../../../lib/research/draft";
import {getDiscovery} from "../../../../lib/binance/rwa";
import {sameOrigin} from "../../../../lib/request-origin";
import {takePreviewSlot} from "../../../../lib/binance/preview-limit";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Open KeepFlow to prepare a draft."},{status:403});
 if(!takePreviewSlot())return Response.json({error:"Draft service is busy. Try again in one minute."},{status:429});
 let input;try{input=draftRequestSchema.parse(await readBoundedJson(request,2048));}catch{return Response.json({error:"Enter a stock allocation request under 1,000 characters."},{status:400});}
 let discovery;try{discovery=await getDiscovery();}catch{return Response.json({error:"Live stock discovery is unavailable. No draft was generated."},{status:503});}
 try{const draft=draftFromPrompt(input,discovery.tokens.map(token=>token.underlyingTicker));return Response.json({draft,source:{name:"Binance RWA discovery",url:"https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data",fetchedAt:discovery.fetchedAt},assets:discovery.tokens.filter(token=>draft.definition.assets.some(asset=>asset.ticker===token.underlyingTicker)).map(token=>({ticker:token.underlyingTicker,company:token.underlyingName,provider:token.platformId,address:token.tokenContractAddress,priceUsd:token.tokenPrice,open:token.statusInfo.openState,reason:token.statusInfo.reasonMsg})),research:{status:"NOT_REQUESTED",reason:"This is live discovery data, not an analyst report or AI research."}},{headers:{"Cache-Control":"no-store"}});}catch(error){return Response.json({error:error instanceof Error&&error.name!=="ZodError"?error.message:"Weights including cash must total exactly 100%."},{status:400});}
}
