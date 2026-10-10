import {readFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
/** Only reviewed pure official configuration export; no wallet bootstrap. */
export async function validateStudioReadOnlyConfiguration(){
 const workspace=fileURLToPath(new URL('../../../',import.meta.url)),vendor=resolve(workspace,'vendor-review/package');
 const manifest=JSON.parse(readFileSync(resolve(vendor,'package.json'),'utf8'));
 if(manifest.name!=='@bnbagent/studio-runtime'||manifest.version!=='0.0.14')throw Error('REVIEWED_RUNTIME_REQUIRED');
 const hashes=JSON.parse(readFileSync(resolve(workspace,'runtime-config-hashes.json'),'utf8'));
 for(const [name,expected] of Object.entries(hashes)){if(!/^[a-zA-Z0-9-]+\.js$/.test(name))throw Error('CONTAINED_CONFIG_REQUIRED');const path=resolve(vendor,'dist',name);if(realpathSync(path)!==path||createHash('sha256').update(readFileSync(path)).digest('hex')!==expected)throw Error('REVIEWED_CONFIG_CHANGED');}
 const {loadStudioToml}=await import(pathToFileURL(resolve(vendor,'dist/config.js')).href);
 const config=loadStudioToml(resolve(workspace,'app/agent/studio.toml'));
 if(config.project?.name!=='firstbell-review-agent'||config.llm?.provider!=='none'||config.budget?.enabled!==false||config.payments?.erc8183?.enabled!==false||config.payments?.erc8183?.auto_settle!==false||config.payments?.seller?.price_usd!=='0'||!Array.isArray(config.payments?.seller?.assets)||config.payments.seller.assets.length||!Array.isArray(config.payments?.allowed_payment_tokens)||config.payments.allowed_payment_tokens.length)throw Error('READ_ONLY_STUDIO_CONFIG_REQUIRED');
 return {officialConfigurationValidated:true,runtimePackage:'@bnbagent/studio-runtime',runtimeVersion:'0.0.14',walletLoaded:false,paymentEnabled:false,modelProvider:'none'};
}
