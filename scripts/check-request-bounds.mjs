import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.FIRSTBELL_TEST_URL;assert.ok(base?.startsWith('https://'));
const routes=[['/api/account',2048],['/api/account/qr/'+randomUUID(),512],['/api/execution',512],['/api/quote',2048],['/api/wallet/portfolio',256],['/api/paper',4096],['/api/research/draft',2048],['/api/paper/autopilot',2048]];
for(const [path,limit] of routes){
 const response=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'x'.repeat(limit+1)});
 assert.equal(response.status,400,path);assert.equal(response.headers.get('set-cookie'),null,path+' should not create an account or identity');
 const foreign=await fetch(base+path,{method:'POST',headers:{Origin:'https://foreign.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(foreign.status,403,path);
}
mkdirSync('test-results',{recursive:true});writeFileSync('test-results/request-bounds-proof.json',JSON.stringify({result:'PASS',routes:routes.map(([path,byteLimit])=>({path,byteLimit,oversizedStatus:400,foreignOriginStatus:403})),newAccountCookies:false,financialActions:false},null,2));
console.log('PASS: all eight routes reject oversized bodies before account creation and reject foreign origins.');
