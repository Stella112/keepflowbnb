import "server-only";
import type { PreparedQuote } from "./trading";
const previews=new Map<string,PreparedQuote>();
export function savePreview(preview:PreparedQuote){
  for(const [id,value] of previews)if(Date.now()-Date.parse(value.fetchedAt)>60_000)previews.delete(id);
  if(previews.size>=1000)previews.delete(previews.keys().next().value!);
  previews.set(preview.id,preview);
}
export function getPreview(id:string,wallet:string){const preview=previews.get(id);return preview?.input.wallet.toLowerCase()===wallet.toLowerCase()?preview:undefined;}
