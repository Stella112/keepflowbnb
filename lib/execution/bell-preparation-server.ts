import "server-only";
import {createBellPreparation} from "./bell-preparation";
import {existingAccountId,linkedWallet,getBell,readAccount} from "../paper/store";
import {findDryRequest,admitDryCheck,expireDryCheck} from "./store";
import {checkBell} from "./check";
import {takePreviewSlot} from "../binance/preview-limit";

// Internal application binding only. This does not create an MCP transport,
// signing endpoint or background financial execution worker.
export const applicationBellPreparation=createBellPreparation({
 sessionAccount:existingAccountId,linkedWallet,bell:getBell,
 personalPolicy:owner=>readAccount(owner).policy,
 find:(owner,requestId)=>{const existing=findDryRequest(owner,requestId);if(!existing)return undefined;return {...existing,receipt:expireDryCheck(owner,existing.receipt.id)??existing.receipt};},admit:admitDryCheck,read:expireDryCheck,takeSlot:takePreviewSlot,
 run:(owner,fingerprint,receipt,kind)=>checkBell(owner,fingerprint,receipt,{quoteOnly:kind==="QUOTE_ONLY"}),
});
