import {spawn} from 'node:child_process';
// Keep the SSH preview in this terminal session and recover transient resets.
let child,stopping=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;child?.kill();});
while(!stopping){
 child=spawn('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ExitOnForwardFailure=yes','-o','ConnectTimeout=10','-o','ServerAliveInterval=5','-o','ServerAliveCountMax=2','-i',process.env.FIRSTBELL_SSH_IDENTITY??'C:/bnbstocks/firstbell.pem','-N','-L','127.0.0.1:3100:127.0.0.1:3100','ubuntu@56.125.248.192'],{windowsHide:true,stdio:'inherit'});
 await new Promise(resolve=>{child.once('error',error=>{console.error('Preview SSH failed: '+error.message);resolve();});child.once('exit',resolve);});
 if(!stopping){console.log('Preview connection ended; reconnecting in five seconds.');await new Promise(resolve=>setTimeout(resolve,5000));}
}
