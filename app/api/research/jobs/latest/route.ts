import {z} from "zod";
import {curatedTickers} from "../../../../../lib/binance/rwa-schemas";
import {existingAccountId} from "../../../../../lib/paper/store";
import {researchJobs} from "../../../../../lib/research/jobs";
export const dynamic="force-dynamic";
export async function GET(request:Request){const headers={"Cache-Control":"no-store"},ticker=z.enum(curatedTickers).safeParse(new URL(request.url).searchParams.get("ticker"));if(!ticker.success)return Response.json({error:"Choose a supported stock."},{status:400,headers});const owner=await existingAccountId();if(!owner)return Response.json({error:"No saved brief is available in this session."},{status:401,headers});const job=researchJobs().latestCompleted(owner,ticker.data);if(!job)return Response.json({error:"No completed brief is saved for this stock in your account."},{status:404,headers});return Response.json({job,paymentSubmitted:false,executionAvailable:false},{headers});}
