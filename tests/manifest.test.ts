import {test} from "node:test";
import assert from "node:assert/strict";
import {bellManifest,canonicalJson} from "../lib/bells/manifest.ts";
import type {Flow} from "../lib/paper/model.ts";
const bell:Flow={id:"example",title:"Example",description:"Test",assets:[{ticker:"NVDA",weightBps:9000}],reserveBps:1000,version:1,contentHash:"legacy",createdAt:"2026-10-08T12:00:00.000Z",example:false};
test("canonical Flow export is deterministic and preserves unknown provenance honestly",()=>{
 assert.equal(canonicalJson({b:1,a:{z:2,c:3}}),canonicalJson({a:{c:3,z:2},b:1}));
 const result=bellManifest({...bell,forkedFromId:"parent"});
 assert.equal(result.source?.version,null);assert.equal(result.publishedAt,null);assert.equal(result.integrity.onchainRecorded,false);
 assert.equal(result.manifestHash,bellManifest({...bell,forkedFromId:"parent"}).manifestHash);
 assert.notEqual(result.manifestHash,bellManifest({...bell,version:2}).manifestHash);
 assert.equal(result.automation.defaultEnabled,false);
});
test("exports reject corrupted published allocations and never silently repair them",()=>{
 assert.throws(()=>bellManifest({...bell,reserveBps:0}));
 assert.throws(()=>bellManifest({...bell,version:0}));
});
