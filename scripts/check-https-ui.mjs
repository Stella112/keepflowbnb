// Verify browser TLS/QR via encrypted SSH forwarding while public firewall 443 is closed.
// Certificate validation remains enabled. This does not claim public 443 is reachable.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {connect} from 'node:net';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const tunnel=spawn('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ExitOnForwardFailure=yes','-i','C:/bnbstocks/firstbell.pem','-N','-L','127.0.0.1:10443:127.0.0.1:443','ubuntu@56.125.248.192'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let tunnelError='';tunnel.stderr.on('data',chunk=>{tunnelError=(tunnelError+chunk.toString()).slice(-500);});
const sockets=new Set();const proxy=createServer();let browser;
proxy.on('connect',(request,socket,head)=>{if(request.url!=='56.125.248.192:443'){console.log('Rejected non-app proxy destination: '+request.url);socket.destroy();return;}const upstream=connect(10443,'127.0.0.1',()=>{socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);});sockets.add(socket);sockets.add(upstream);upstream.on('error',error=>{console.log('Tunnel socket: '+error.code);socket.destroy();});socket.on('error',()=>upstream.destroy());});
try{
 await new Promise((resolve,reject)=>{let attempt=0;const probe=()=>{const socket=connect(10443,'127.0.0.1',()=>{socket.destroy();resolve();});socket.on('error',()=>{socket.destroy();if(++attempt>=100)reject(new Error('SSH HTTPS forwarding did not start'));else setTimeout(probe,100);});};probe();});
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const port=proxy.address().port;browser=await chromium.launch({channel:'msedge',headless:true,proxy:{server:`http://127.0.0.1:${port}`}});
 const page=await browser.newPage({viewport:{width:380,height:820}});
 await page.goto('https://56.125.248.192/b/ai-compute',{waitUntil:'networkidle'});
 const qr=page.getByAltText("QR code containing this Flow's HTTPS share link");await qr.waitFor({timeout:20000});
 assert.match(await qr.getAttribute('src'),/^data:image\/png;base64,/);
 assert.equal(await page.getByLabel('Shareable Flow link').inputValue(),'https://56.125.248.192/b/ai-compute');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/paper-bell-https.png',fullPage:true});
 console.log('PASS: trusted browser TLS and HTTPS-only QR rendered via SSH transport. Public port 443 reachability is not established by this test.');
}finally{await browser?.close();for(const socket of sockets)socket.destroy();proxy.close();tunnel.kill();if(tunnelError)console.log(tunnelError);}
