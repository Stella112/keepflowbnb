import {z} from 'zod';
import {sameOrigin,identityTransportAllowed} from '../../../../lib/request-origin';
import {existingAccountId,linkedWallet,readAccount,bellHistory} from '../../../../lib/paper/store';
import {takePreviewSlot} from '../../../../lib/binance/preview-limit';
import {walletPortfolio} from '../../../../lib/execution/portfolio';
import {walletContributionPlan} from '../../../../lib/planning/wallet-contribution';
import {toUnits} from '../../../../lib/binance/amounts';
export const dynamic='force-dynamic';
const schema=z.object({bellId:z.string().min(1).max(80),bellVersion:z.number().int().positive(),bellContentHash:z.string().min(1).max(128),contributionUsd:z.string().regex(/^\d+(\.\d{1,6})?$/).max(16).refine(value=>/^\d+(\.\d{1,6})?$/.test(value)&&toUnits(value,6)<=10_000_000_000n)}).strict();
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(!identityTransportAllowed(request))return Response.json({error:'Use HTTPS or a local SSH preview to access your authenticated wallet.'},{status:403,headers});
 if(!sameOrigin(request))return Response.json({error:'Open KeepFlow to plan a contribution.'},{status:403,headers});
 const owner=await existingAccountId(),wallet=owner?linkedWallet(owner):undefined;if(!owner||!wallet)return Response.json({error:'Sign in with your wallet before planning actual holdings.'},{status:401,headers});
 let input:z.infer<typeof schema>;
 try{const reader=request.body?.getReader();if(!reader)throw Error();let bytes=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>1024){await reader.cancel();throw Error();}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}input=schema.parse(JSON.parse(text));}catch{return Response.json({error:'Choose a pinned Flow version and a valid hypothetical contribution.'},{status:400,headers});}
 const bell=bellHistory(input.bellId).find(b=>b.version===input.bellVersion&&b.contentHash===input.bellContentHash);if(!bell)return Response.json({error:'The selected Flow version is unavailable. Reload and review the definition.'},{status:409,headers});
 if(!takePreviewSlot())return Response.json({error:'Wallet planning is busy. Try again in one minute.'},{status:429,headers});
 try{const policy=readAccount(owner).policy,snapshot=await walletPortfolio(wallet);if(snapshot.wallet.toLowerCase()!==wallet.toLowerCase())throw Error();return Response.json({plan:walletContributionPlan(snapshot,bell,policy,input.contributionUsd)},{headers});}catch{return Response.json({error:'The actual wallet contribution plan could not be verified. Refresh balances and prices; unavailable values are never assumed to be zero.'},{status:503,headers});}
}
