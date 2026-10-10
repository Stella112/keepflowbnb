import {spawn} from 'node:child_process';
const base='http://127.0.0.1:10333';
const tunnel=spawn('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ExitOnForwardFailure=yes','-o','ConnectTimeout=10','-o','ServerAliveInterval=5','-i','C:/bnbstocks/firstbell.pem','-N','-L','127.0.0.1:10333:127.0.0.1:3100','ubuntu@56.125.248.192'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
try{
 let healthy=false;for(let count=0;count<40;count++){if(tunnel.exitCode!==null)throw new Error('Session test SSH connection ended.');try{const response=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)});if(response.ok&&(await response.json()).application==='keepflow'){healthy=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}if(!healthy)throw new Error('Session test tunnel unavailable.');
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/check-session-security.mjs'],{windowsHide:true,stdio:'inherit',env:{...process.env,FIRSTBELL_TEST_URL:base}});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('Session security regression failed.')));});
}finally{tunnel.kill();}
