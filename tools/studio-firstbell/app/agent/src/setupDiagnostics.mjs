import {lstatSync, readdirSync, readFileSync, realpathSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateStudioReadOnlyConfiguration} from './studioConfig.mjs';

/** Presence checks only: never unlocks a wallet, imports credentials, or invokes bag. */
export function inspectStudioCredentials(workspace){
 const root=realpathSync(workspace), secret=resolve(root,'.studio/.env.local'), wallets=resolve(root,'.studio/wallets');
 let passwordPresent=false, protectedFile=false, localWalletPresent=false;
 try{
  const stat=lstatSync(secret);
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size>16384||realpathSync(secret)!==secret)throw Error('STUDIO_SECRET_BOUNDARY');
  protectedFile=process.platform==='win32'?false:(stat.mode&0o077)===0;
  // Read a bounded file locally; neither credential contents nor errors leave this function.
  const entry=readFileSync(secret,'utf8').match(/^WALLET_PASSWORD\s*=\s*([^\r\n]*)/m)?.[1]?.trim();
  passwordPresent=Boolean(entry&&entry!=='""'&&entry!=="''"&&!entry.startsWith('#'));
 }catch(error){if(error?.message==='STUDIO_SECRET_BOUNDARY')throw error;}
 try{
  if(lstatSync(wallets).isSymbolicLink()||!realpathSync(wallets).startsWith(root+sep))throw Error('STUDIO_WALLET_BOUNDARY');
  localWalletPresent=readdirSync(wallets).some(name=>/^[a-zA-Z0-9_.-]+\.json$/.test(name)&&lstatSync(resolve(wallets,name)).isFile()&&!lstatSync(resolve(wallets,name)).isSymbolicLink());
 }catch(error){if(error?.message==='STUDIO_WALLET_BOUNDARY')throw error;}
 return {passwordPresent,localWalletPresent,secretPermissionsVerified:protectedFile,authenticationVerified:false};
}
export async function studioSetupDiagnostics(){
 const workspace=fileURLToPath(new URL('../../../',import.meta.url));
 const configuration=await validateStudioReadOnlyConfiguration();
 return {configuration,credentials:inspectStudioCredentials(workspace),status:'LOCAL_PUBLIC_MCP_READY',paidResearchEnabled:false,cloudDeploymentVerified:false,onchainIdentityVerified:false,signingEnabled:false,
  requiredExternalActions:['Enter an operator-owned wallet password through the official hidden terminal prompt or protected .studio/.env.local.','Review and authorize wallet provisioning or import separately; the current application authorization is paper trading and read-only.','Review provider credentials, runtime secret exposure, cloud cost and identity transaction before deployment.']};
}
