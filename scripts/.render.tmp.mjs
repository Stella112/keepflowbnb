import {chromium} from '@playwright/test';import {pathToFileURL} from 'node:url';import {mkdirSync} from 'node:fs';
const [dir,mode,fps,total]=[process.argv[2],process.argv[3],Number(process.argv[4]??30),Number(process.argv[5]??150.05)];
const b=await chromium.launch({channel:'msedge'});const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.goto(pathToFileURL(dir+'/video.html').href,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
await p.evaluate(()=>{for(const a of document.getAnimations())a.pause();});
const seek=t=>p.evaluate(ms=>{for(const a of document.getAnimations())a.currentTime=ms;},t*1000);
if(mode==='preview'){const times=process.argv.slice(6).map(Number);mkdirSync(dir+'/preview',{recursive:true});for(const t of times){await seek(t);await p.screenshot({path:`${dir}/preview/t${String(t).padStart(6,'0')}.png`});}}
else{mkdirSync(dir+'/frames',{recursive:true});const n=Math.ceil(total*fps);for(let i=0;i<n;i++){await seek(i/fps);await p.screenshot({path:`${dir}/frames/f${String(i).padStart(5,'0')}.jpg`,type:'jpeg',quality:92});if(i%300===0)console.log('frame',i,'/',n);}}
await b.close();
