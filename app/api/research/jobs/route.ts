import {after} from "next/server";
import {z} from "zod";
import {curatedTickers} from "../../../../lib/binance/rwa-schemas";
import {accountId,existingAccountId} from "../../../../lib/paper/store";
import {sameOrigin} from "../../../../lib/request-origin";
import {takePreviewSlot} from "../../../../lib/binance/preview-limit";
import {readIntentBody} from "../../../../lib/execution/intents/server";
import {researchJobs} from "../../../../lib/research/jobs";
import {getStockBrief} from "../../../../lib/research/brief-server";
export const dynamic="force-dynamic";
export const maxDuration=120;
const input=z.object({requestId:z.string().uuid(),ticker:z.enum(curatedTickers)}).strict();
export async function POST(request:Request){const headers={"Cache-Control":"no-store"};if(!sameOrigin(request))return Response.json({error:"Open KeepFlow to prepare a stock data brief."},{status:403,headers});try{const args=input.parse(await readIntentBody(request)),existingOwner=await existingAccountId(),existing=existingOwner?researchJobs().find(existingOwner,args.requestId):undefined;if(existing){if(existing.ticker!==args.ticker)throw new Error("REQUEST_CONFLICT");return Response.json({job:existing,paymentSubmitted:false,executionAvailable:false},{headers});}if(!takePreviewSlot())return Response.json({error:"Stock briefs are busy. Try again in a minute."},{status:429,headers});const owner=existingOwner??await accountId(),admitted=researchJobs().admit(owner,args.requestId,args.ticker);if(admitted.created)after(async()=>{try{researchJobs().finish(owner,admitted.job.id,await getStockBrief(args.ticker));}catch{researchJobs().finish(owner,admitted.job.id);}});return Response.json({job:admitted.job,paymentSubmitted:false,executionAvailable:false},{status:admitted.created?202:200,headers});}catch(error){const conflict=error instanceof Error&&error.message==="REQUEST_CONFLICT",limited=error instanceof Error&&error.message==="QUEUE_LIMIT";return Response.json({error:limited?"Your stock brief queue or history limit is reached. Open a saved brief, or wait for pending briefs to finish.":conflict?"This request ID already belongs to different stock instructions.":"The stock brief request could not be verified."},{status:limited?429:conflict?409:400,headers});}}
