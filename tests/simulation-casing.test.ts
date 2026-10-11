import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {simulationSchema,swapEffectsMatch} from "../lib/binance/trading-schemas.ts";

const live=simulationSchema.parse(JSON.parse(readFileSync(new URL("../fixtures/api/simulate-swap-nvdab-erc20-casing.json",import.meta.url),"utf8")));
const intent={wallet:"0x8462d428c98d78f16c3e79ad66085f5d669d4d15",funding:"0x55d398326f99059fF775485246999027B3197955",stock:"0x02fca66c1d1afb4e2a7884261eb00f63598a7436",amount:100000000000000000n,minimumReceive:431165641911874n,spender:"0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5",allowance:100000000000000000n};

test("Binance's live 'Erc20' spelling is accepted when every effect matches exactly",()=>{
 assert.equal(swapEffectsMatch(live,intent),true);
});
test("the casing fix loosens nothing else: wrong amount, short receipt, other owner or non-ERC20 still fail",()=>{
 assert.equal(swapEffectsMatch(live,{...intent,amount:200000000000000000n}),false);
 assert.equal(swapEffectsMatch(live,{...intent,minimumReceive:433176344319177n}),false);
 assert.equal(swapEffectsMatch({...live,balanceChanges:live.balanceChanges.map(c=>({...c,owner:"0x"+"1".repeat(40)}))},intent),false);
 assert.equal(swapEffectsMatch({...live,balanceChanges:live.balanceChanges.map(c=>({...c,tokenType:"Erc721"}))},intent),false);
 assert.equal(swapEffectsMatch(live,{...intent,allowance:50000000000000000n}),false);
});
