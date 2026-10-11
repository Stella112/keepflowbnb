import {accountId,readAccount,getBell} from "../../../../../lib/paper/store";
import {getDiscovery} from "../../../../../lib/binance/rwa";
import {fitFlowToRules} from "../../../../../lib/policy/flow-fit";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
/** How this Flow fits the visitor's own rules. Read-only: it saves, quotes and spends nothing. */
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(id.length>80)return Response.json({error:"Invalid Flow."},{status:400,headers});
 const bell=getBell(id);if(!bell)return Response.json({error:"Flow not found."},{status:404,headers});
 try{
  const owner=await accountId(),account=readAccount(owner);
  const market=await getDiscovery();
  const unavailable=bell.assets.map(a=>a.ticker).filter(t=>!market.tokens.some(token=>token.underlyingTicker===t&&token.binanceChainId==="56"&&token.statusInfo.openState));
  return Response.json({flow:{id:bell.id,title:bell.title,version:bell.version,contentHash:bell.contentHash},rulesVersion:account.policyVersion??0,rulesCustomized:(account.policyVersion??0)>0,marketFetchedAt:market.fetchedAt,fit:fitFlowToRules(bell,account.policy,unavailable)},{headers});
 }catch{return Response.json({error:"Your rules or live market data are unavailable right now. Nothing was changed."},{status:503,headers});}
}
