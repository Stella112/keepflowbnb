import {z} from "zod";
import {existingAccountId} from "../../../../../lib/paper/store";
import {researchJobs} from "../../../../../lib/research/jobs";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const headers={"Cache-Control":"no-store"};const owner=await existingAccountId(),parsed=z.string().uuid().safeParse((await params).id);const job=owner&&parsed.success?researchJobs().read(owner,parsed.data):undefined;if(!job)return Response.json({error:"Stock brief not found."},{status:404,headers});return Response.json({job,paymentSubmitted:false,executionAvailable:false},{headers});}
