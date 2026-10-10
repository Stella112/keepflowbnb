// External certificate-validated QR regression; no proxy or TLS bypass.
import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['scripts/check-qr-login.mjs'],{windowsHide:true,stdio:'inherit',env:{...process.env,FIRSTBELL_QR_DESKTOP_URL:'https://56.125.248.192:80'}});
if(result.error)throw result.error;process.exit(result.status??1);
