import {test} from "node:test";
import assert from "node:assert/strict";
import {sameOrigin,identityTransportAllowed,identityCookieSecure,trustedIdentityOrigin} from "../lib/request-origin.ts";
test("same origin survives nginx HTTPS termination and rejects cross-site requests",()=>{
 const request=(origin:string,protocol="https")=>new Request("http://localhost:3100/api/quote",{headers:{host:"56.125.248.192",origin,"x-forwarded-proto":protocol}});
 assert.equal(sameOrigin(request("https://56.125.248.192")),true);
 assert.equal(sameOrigin(request("http://56.125.248.192","http")),true);
 assert.equal(sameOrigin(request("https://attacker.example")),false);
 assert.equal(sameOrigin(request("http://56.125.248.192")),false);
 assert.equal(sameOrigin(request("null")),false);
 assert.equal(sameOrigin(request("https://56.125.248.192","https,http")),false);
});
test('identity requires HTTPS outside exact loopback hosts and cookies follow verified transport',()=>{
 const proxied=(host:string,scheme:string)=>new Request('http://localhost:3100/api/account',{headers:{host,'x-forwarded-proto':scheme}});
 assert.equal(identityTransportAllowed(proxied('56.125.248.192','http')),false);
 assert.equal(identityTransportAllowed(proxied('56.125.248.192','https')),true);
 assert.equal(identityCookieSecure(proxied('56.125.248.192','https')),true);
 assert.equal(identityTransportAllowed(proxied('localhost:3100','http')),true);
 assert.equal(identityCookieSecure(proxied('localhost:3100','http')),false);
 for(const host of ['localhost.attacker.example','127.0.0.1.attacker.example','192.168.1.1'])assert.equal(identityTransportAllowed(proxied(host,'http')),false);
 for(const scheme of ['https,http','HTTPS','garbage'])assert.equal(identityTransportAllowed(proxied('56.125.248.192',scheme)),false);
 assert.equal(trustedIdentityOrigin('http://localhost:3100'),true);
 assert.equal(trustedIdentityOrigin('https://user:password@example.com'),false);
});
test('direct public requests cannot assert forwarded HTTPS and spoof the identity boundary',()=>{
 const request=new Request('http://56.125.248.192/api/account',{headers:{host:'56.125.248.192','x-forwarded-proto':'https',origin:'https://56.125.248.192'}});
 assert.equal(identityTransportAllowed(request),false);assert.equal(sameOrigin(request),false);
});
