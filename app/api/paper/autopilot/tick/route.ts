import {readFileSync} from "node:fs";
import {timingSafeEqual} from "node:crypto";
import {duePaperAccounts} from "../../../../../lib/paper/store";
import {runPaperAgent} from "../../../../../lib/paper/autopilot";
import {getDiscovery} from "../../../../../lib/binance/rwa";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 const path=process.env.PAPER_SCHEDULER_KEY_PATH;if(!path)return Response.json({error:"Scheduler not configured."},{status:503});
 const expected=Buffer.from(readFileSync(path,"utf8").trim()),provided=Buffer.from(request.headers.get("x-paper-scheduler-token")??"");
 if(provided.length!==expected.length||!timingSafeEqual(provided,expected))return Response.json({error:"Unauthorized."},{status:401});
 const accounts=duePaperAccounts(),market=accounts.length?await getDiscovery().catch(()=>null):null;
 let completed=0,failed=0;for(const account of accounts){try{const result=await runPaperAgent(account.id,Date.now(),market);if(result.due)completed++;}catch{failed++;}}
 return Response.json({mode:"PAPER",completed,failed,mainnetWrites:false},{headers:{"Cache-Control":"no-store"}});
}
