import {test} from "node:test";
import assert from "node:assert/strict";
import {publicShareUrl} from "../lib/share-url.ts";
test("share links use only configured public HTTPS origin and public routing",()=>{
 assert.equal(publicShareUrl("https://56.125.248.192","/b/ai-compute"),"https://56.125.248.192/b/ai-compute");
 assert.equal(publicShareUrl("https://firstbell.example/","/"),"https://firstbell.example/");
 for(const origin of [undefined,"http://firstbell.example","https://localhost","https://127.0.0.1","https://10.1.2.3","https://[::1]","https://user:secret@example.com","https://example.com/path","https://example.com/?token=x","https://example.com/#secret"]){assert.equal(publicShareUrl(origin,"/"),null);}
 for(const path of ["/login/qr/token","/b/a?secret=x","//evil.example","/b/../account"]){assert.equal(publicShareUrl("https://firstbell.example",path),null);}
 for(const origin of ["https://[fd00::1]","https://[fe80::1]","https://[::ffff:127.0.0.1]","https://localhost.","https://router.local","https://router","https://100.64.0.1","https://100.127.255.254"]){assert.equal(publicShareUrl(origin,"/"),null);}
});
