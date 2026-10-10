import {bellHistory} from "../../../../../lib/paper/store";
import {bellManifest,canonicalJson} from "../../../../../lib/bells/manifest";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,url=new URL(request.url),version=url.searchParams.get("version");
 if(id.length>80||(version!==null&&!/^[1-9]\d{0,8}$/.test(version)))return Response.json({error:"Invalid Flow version."},{status:400});
 const history=bellHistory(id),bell=version?history.find(item=>item.version===Number(version)):history[0];
 if(!bell)return Response.json({error:"Flow version not found."},{status:404});
 return new Response(canonicalJson(bellManifest(bell)),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="firstbell-v${bell.version}.json"`,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
