import {spawn} from 'node:child_process';
import {mkdirSync,openSync,closeSync} from 'node:fs';
const url='http://localhost:3100';
async function healthy(){try{const response=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1500)});return response.ok&&(await response.json()).application==='keepflow';}catch{return false;}}
if(await healthy()){console.log('KeepFlow is available at '+url);process.exit(0);}
mkdirSync('logs',{recursive:true});const log=openSync('logs/local-tunnel.log','a');
const child=spawn('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3','-i',process.env.FIRSTBELL_SSH_IDENTITY??'C:/bnbstocks/firstbell.pem','-N','-L','127.0.0.1:3100:127.0.0.1:3100','ubuntu@56.125.248.192'],{detached:true,windowsHide:true,stdio:['ignore',log,log]});
child.on('error',()=>{console.error('SSH could not start. Check your SSH client and key path.');process.exitCode=1;});child.unref();closeSync(log);
for(let attempt=0;attempt<20;attempt++){await new Promise(resolve=>setTimeout(resolve,500));if(await healthy()){console.log(JSON.stringify({url,tunnelPid:child.pid,backend:'Lightsail',mainnetEnabled:false}));process.exit(0);}}
console.error('The local preview did not start. Check logs/local-tunnel.log and whether port 3100 is already in use.');process.exitCode=1;
