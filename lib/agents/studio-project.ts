import {realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {z} from 'zod';

// Reviewed @bnbagent/studio-cli 0.0.14 scanProject: static filesystem diagnostics,
// not identity registration, runtime health, deployment readiness or research proof.
export const studioScanVersion='0.0.14' as const;
type ScanRequest={args:readonly ['scan','--path',string];cwd:string;version:typeof studioScanVersion;inheritApplicationEnvironment:false};
export type StudioScanRunner=(request:ScanRequest)=>Promise<string>;
const binding=z.object({operatorId:z.string().min(1).max(80),requesterId:z.string().min(1).max(80),authorization:z.literal('OPERATOR_READ_ONLY')}).strict();
const nullable=z.string().max(4096).nullable();
const report=z.object({path:z.string().max(4096),is_studio_project:z.boolean(),has_studio_toml:z.boolean(),has_package_json:z.boolean(),has_agentcore_json:z.boolean(),deploy_ready:z.boolean(),has_dot_studio_dir:z.boolean(),project_name:nullable,package_name:nullable,role:z.enum(['agent','none']),has_agent_layer:z.boolean(),package_manager:z.enum(['pnpm','yarn','bun','npm','unknown']),node_version:nullable,recipes_emitted:z.array(z.enum(['agent','wallet'])).max(2),studio_version_constraint:nullable}).strict();
const base={scope:'SINGLE_OPERATOR' as const,executionEnabled:false as const,runtimeVerified:false as const,deploymentVerified:false as const,researchVerified:false as const};
export async function studioProjectDiagnostic(identity:unknown,options:{enabled?:boolean;allowedRoot?:string;projectRoot?:string;runner?:StudioScanRunner}={}){
 if(options.enabled!==true)return {...base,status:'DISABLED' as const,code:'STUDIO_PROJECT_DISABLED'};
 const owner=binding.safeParse(identity);if(!owner.success||owner.data.operatorId!==owner.data.requesterId)return {...base,status:'BLOCKED' as const,code:'OPERATOR_SCOPE_REQUIRED'};
 if(!options.allowedRoot||!options.projectRoot||!options.runner)return {...base,status:'UNAVAILABLE' as const,code:'CONTAINED_RUNNER_REQUIRED'};
 try{
  const allowed=realpathSync(resolve(options.allowedRoot)),root=realpathSync(resolve(options.projectRoot)),rel=relative(allowed,root);
  if(rel.startsWith('..')||isAbsolute(rel))return {...base,status:'BLOCKED' as const,code:'PROJECT_OUTSIDE_OPERATOR_ROOT'};
  // The trusted injected runner must enforce package version/entry containment,
  // timeout/output limits and filesystem isolation. The original bag entry loads project
  // secrets/wallet sessions before scan; it must not run in the live project without
  // separately reviewed isolation. No general shell or concrete runner is provided.
  const text=await options.runner({args:Object.freeze(['scan','--path',root] as const),cwd:root,version:studioScanVersion,inheritApplicationEnvironment:false});
  if(Buffer.byteLength(text)>32768)throw new Error('Oversized report');
  const parsed=report.parse(JSON.parse(text));
  if(resolve(parsed.path)!==root||parsed.role!==(parsed.has_agent_layer?'agent':'none')||parsed.deploy_ready!==parsed.has_agentcore_json||new Set(parsed.recipes_emitted).size!==parsed.recipes_emitted.length)throw new Error('Unverified report');
  return {...base,status:'INSPECTED' as const,code:'STATIC_PROJECT_DIAGNOSTIC_ONLY',requiredCliVersion:studioScanVersion,projectDetected:parsed.is_studio_project,configurationPresent:parsed.has_studio_toml,packageManifestPresent:parsed.has_package_json,deploymentDescriptorPresent:parsed.has_agentcore_json,studioDirectoryPresent:parsed.has_dot_studio_dir,agentEntrypointPresent:parsed.has_agent_layer,packageManager:parsed.package_manager,recipeCount:parsed.recipes_emitted.length};
 }catch{return {...base,status:'UNAVAILABLE' as const,code:'SCAN_OR_RESPONSE_UNVERIFIED'};}
}

