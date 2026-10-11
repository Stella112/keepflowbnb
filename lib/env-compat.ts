/** KeepFlow was called First Bell. New deployments may use KEEPFLOW_* names; existing
 * FIRSTBELL_* settings keep working and win if both are set, so nothing changes silently. */
export function applyKeepflowEnvAliases(env:Record<string,string|undefined>=process.env){
 for(const [key,value] of Object.entries(env)){
  if(!key.startsWith("KEEPFLOW_")||value===undefined)continue;
  const legacy="FIRSTBELL_"+key.slice("KEEPFLOW_".length);
  if(env[legacy]===undefined)env[legacy]=value;
 }
 return env;
}
