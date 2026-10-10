import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectStudioCredentials,studioSetupDiagnostics} from '../tools/studio-firstbell/app/agent/src/setupDiagnostics.mjs';
test('Studio diagnostics expose credential presence only and never claim authentication',()=>{
 const root=mkdtempSync(join(tmpdir(),'studio-setup-'));
 try{mkdirSync(join(root,'.studio/wallets'),{recursive:true});writeFileSync(join(root,'.studio/.env.local'),'WALLET_PASSWORD=secret-fixture-value\n',{mode:0o600});writeFileSync(join(root,'.studio/wallets/operator.json'),'private material never parsed');const result=inspectStudioCredentials(root);assert.equal(result.passwordPresent,true);assert.equal(result.localWalletPresent,true);assert.equal(result.authenticationVerified,false);assert.ok(!JSON.stringify(result).includes('secret-fixture-value'));}finally{rmSync(root,{recursive:true,force:true});}
});
test('official configuration diagnostics keep signing payments and deployment disabled',async()=>{const result=await studioSetupDiagnostics();assert.equal(result.configuration.officialConfigurationValidated,true);assert.equal(result.signingEnabled,false);assert.equal(result.paidResearchEnabled,false);assert.equal(result.cloudDeploymentVerified,false);});
