const base=process.env.FIRSTBELL_TEST_URL??'http://56.125.248.192';
for(const [path,body] of [['/api/research/draft',{prompt:'NVIDIA 30%, Microsoft 30%, Apple 30%, keep 10% in USDT'}],['/api/account/qr',{}]]){
 try{const response=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)}),result=await response.json();console.log(JSON.stringify({path,status:response.status,error:result.error??null,method:result.draft?.method,assets:result.draft?.definition?.assets?.length,qrCreated:!!result.id}));}catch(error){console.log(JSON.stringify({path,error:error.name}));}
}

