import {test} from "node:test";
import assert from "node:assert/strict";
import {privateKeyToAccount} from "viem/accounts";
import {loginChallenge,verifyLogin} from "../lib/paper/identity-message.ts";
const signer=privateKeyToAccount('0x'+'01'.repeat(32) as `0x${string}`),other=privateKeyToAccount('0x'+'02'.repeat(32) as `0x${string}`);
test("wallet sign-in binds the exact domain, nonce, address and five-minute expiry",async()=>{
 const now=Date.parse('2026-10-06T12:00:00Z'),challenge=loginChallenge(signer.address,'https://firstbell.example','ab'.repeat(12),now),signature=await signer.signMessage({message:challenge.message});
 assert.equal(await verifyLogin(challenge,challenge.origin,signature,now),true);
 assert.equal(await verifyLogin(challenge,'https://attacker.example',signature,now),false);
 assert.equal(await verifyLogin(challenge,challenge.origin,signature,now+300000),false);
 assert.equal(await verifyLogin({...challenge,message:challenge.message+'changed'},challenge.origin,signature,now),false);
 assert.equal(await verifyLogin({...challenge,address:other.address},challenge.origin,signature,now),false);
 assert.equal(await verifyLogin(challenge,challenge.origin,await other.signMessage({message:challenge.message}),now),false);
});
