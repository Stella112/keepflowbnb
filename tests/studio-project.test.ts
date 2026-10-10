import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {studioProjectDiagnostic} from '../lib/agents/studio-project.ts';
const owner={operatorId:'operator',requesterId:'operator',authorization:'OPERATOR_READ_ONLY'};
test('disabled, foreign operator and missing contained runner never invoke CLI',async()=>{let calls=0;const runner=async()=>{calls++;return '';};assert.equal((await studioProjectDiagnostic(owner,{runner})).status,'DISABLED');assert.equal((await studioProjectDiagnostic({...owner,requesterId:'other'},{enabled:true,runner})).status,'BLOCKED');assert.equal((await studioProjectDiagnostic(owner,{enabled:true,runner})).status,'UNAVAILABLE');assert.equal(calls,0);});
test('fixed source-backed scan contract strips paths and metadata and never claims runtime proof',async()=>{
 const parent=resolve('test-results');await mkdir(parent,{recursive:true});const directory=await mkdtemp(join(parent,'studio-scan-'));const root=realpathSync(directory);
 const fixture={path:root,is_studio_project:true,has_studio_toml:true,has_package_json:true,has_agentcore_json:true,deploy_ready:true,has_dot_studio_dir:true,project_name:'private-name',package_name:null,role:'agent',has_agent_layer:true,package_manager:'pnpm',node_version:'secret-like-metadata',recipes_emitted:['agent','wallet'],studio_version_constraint:'private-dependency'};
 try{const result=await studioProjectDiagnostic(owner,{enabled:true,allowedRoot:parent,projectRoot:root,runner:async request=>{assert.deepEqual(request.args,['scan','--path',root]);assert.equal(request.version,'0.0.14');assert.equal(request.inheritApplicationEnvironment,false);return JSON.stringify(fixture);}});assert.equal(result.status,'INSPECTED');assert.equal(result.deploymentVerified,false);assert.equal(result.runtimeVerified,false);assert.equal(result.researchVerified,false);assert.ok(!JSON.stringify(result).includes(root));assert.ok(!JSON.stringify(result).includes('private'));assert.ok(!JSON.stringify(result).includes('secret'));
  for(const value of [{...fixture,path:parent},{...fixture,role:'none'},{...fixture,deploy_ready:false},{...fixture,recipes_emitted:['agent','agent']},{...fixture,credentials:'secret'}])assert.equal((await studioProjectDiagnostic(owner,{enabled:true,allowedRoot:parent,projectRoot:root,runner:async()=>JSON.stringify(value)})).status,'UNAVAILABLE');
  assert.equal((await studioProjectDiagnostic(owner,{enabled:true,allowedRoot:root,projectRoot:parent,runner:async()=>{throw new Error('Should not run');}})).status,'BLOCKED');
  for(const text of ['not-json','x'.repeat(32769)])assert.equal((await studioProjectDiagnostic(owner,{enabled:true,allowedRoot:parent,projectRoot:root,runner:async()=>text})).code,'SCAN_OR_RESPONSE_UNVERIFIED');
 }finally{const rel=relative(parent,resolve(directory));assert.ok(rel.startsWith('studio-scan-')&&!rel.includes('..')&&!isAbsolute(rel));await rm(directory,{recursive:true,force:true});}
});
