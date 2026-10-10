import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeFunctionData, erc20Abi } from "viem";
import { quoteSchema, swapSchema, approvalSchema, assertQuoteMatches, simulationSchema, simulationSucceeded, swapEffectsMatch } from "../lib/binance/trading-schemas.ts";
import { toUnits, fromUnits, shareExposure } from "../lib/binance/amounts.ts";
const fixture=(name:string):unknown=>JSON.parse(readFileSync(new URL(`../fixtures/api/${name}.json`,import.meta.url),"utf8")).data;
const quote=quoteSchema.parse((fixture("quote-nvda-bstocks-5") as unknown[])[0]);
test("swap success requires exact wallet debit and minimum stock receipt",()=>{
 const wallet="0x1111111111111111111111111111111111111111",funding=quote.fromToken.tokenContractAddress,stock=quote.toToken.tokenContractAddress;
 const intent={wallet,funding,stock,amount:5n,minimumReceive:10n};
 const result=simulationSchema.parse({status:"SUCCESS",failReason:null,allowanceChanges:[],balanceChanges:[{contractAddress:funding,owner:wallet,tokenType:"ERC20",change:"-5"},{contractAddress:stock,owner:wallet,tokenType:"ERC20",change:"10"}]});
 assert.equal(swapEffectsMatch(result,intent),true);
 assert.equal(swapEffectsMatch({...result,balanceChanges:[]},intent),false);
 for(const mutation of [{owner:funding},{change:"9"},{contractAddress:wallet},{tokenType:"ERC721"}])assert.equal(swapEffectsMatch({...result,balanceChanges:[result.balanceChanges[0],{...result.balanceChanges[1],...mutation}]},intent),false);
 assert.equal(swapEffectsMatch(result,{...intent,amount:4n}),false);
});
test("real SWAP quote and build validate despite docs' RWA RFQ blanket statement",()=>{
  const swap=swapSchema.parse(fixture("swap-nvda-bstocks"));
  assert.equal(quote.executionMode,"SWAP");assert.equal(swap.executionMode,"SWAP");
  assert.equal(swap.tx.to.toLowerCase(),quote.approveTarget!.toLowerCase());
  assertQuoteMatches(quote,{amount:5n*10n**18n,from:quote.fromToken.tokenContractAddress,to:quote.toToken.tokenContractAddress,fromDecimals:18,toDecimals:18,toSymbol:"NVDAB"});
});
test("swap effects allow only the verified funding allowance decrement",()=>{
  const wallet="0x1111111111111111111111111111111111111111",funding=quote.fromToken.tokenContractAddress,stock=quote.toToken.tokenContractAddress,spender=quote.approveTarget!;
  const intent={wallet,funding,stock,spender,allowance:8n,amount:5n,minimumReceive:10n};
  const change={tokenAddress:funding,owner:wallet,spender,preAmount:"8",postAmount:"3"};
  const result=simulationSchema.parse({status:"SUCCESS",failReason:null,allowanceChanges:[change],balanceChanges:[{contractAddress:funding,owner:wallet,tokenType:"ERC20",change:"-5"},{contractAddress:stock,owner:wallet,tokenType:"ERC20",change:"10"}]});
  assert.equal(swapEffectsMatch(result,intent),true);
  assert.equal(swapEffectsMatch({...result,allowanceChanges:[]},intent),true);
  for(const mutation of [{tokenAddress:stock},{owner:stock},{spender:stock},{preAmount:"9"},{postAmount:"4"},{postAmount:"9"}])
    assert.equal(swapEffectsMatch({...result,allowanceChanges:[{...change,...mutation}]},intent),false);
  assert.equal(swapEffectsMatch({...result,allowanceChanges:[change,change]},intent),false);
  assert.equal(swapEffectsMatch(result,{...intent,allowance:4n}),false);
  assert.equal(swapEffectsMatch(result,{...intent,spender:undefined}),false);
});
test("unverified native gas deltas and contradictory effects fail closed",()=>{
  const wallet="0x1111111111111111111111111111111111111111",funding=quote.fromToken.tokenContractAddress,stock=quote.toToken.tokenContractAddress;
  const intent={wallet,funding,stock,amount:5n,minimumReceive:10n};
  const result=simulationSchema.parse({status:"SUCCESS",failReason:null,allowanceChanges:[],balanceChanges:[{contractAddress:funding,owner:wallet,tokenType:"ERC20",change:"-5"},{contractAddress:stock,owner:wallet,tokenType:"ERC20",change:"10"}]});
  // Synthetic adversarial native marker: not a recorded or supported provider value.
  const native={contractAddress:"0x0000000000000000000000000000000000000000",owner:wallet,tokenType:"UNVERIFIED_NATIVE",change:"-1"};
  assert.equal(swapEffectsMatch({...result,balanceChanges:[...result.balanceChanges,native]},intent),false);
  assert.equal(swapEffectsMatch({...result,status:"FAILED"},intent),false);
  assert.equal(swapEffectsMatch({...result,failReason:"reverted"},intent),false);
  assert.equal(swapEffectsMatch(result,{...intent,minimumReceive:0n}),false);
  assert.equal(swapEffectsMatch(result,{...intent,stock:funding}),false);
});
test("mismatched chain, recipient token, amount, decimals, fee and honeypot cannot pass",()=>{
  const expected={amount:5n*10n**18n,from:quote.fromToken.tokenContractAddress,to:quote.toToken.tokenContractAddress,fromDecimals:18,toDecimals:18,toSymbol:"NVDAB"};
  assert.equal(quoteSchema.safeParse({...quote,binanceChainId:"1"}).success,false);
  for(const bad of [{...expected,amount:1n},{...expected,to:expected.from},{...expected,toDecimals:6}])assert.throws(()=>assertQuoteMatches(quote,bad));
  assert.throws(()=>assertQuoteMatches({...quote,feeAmount:"1"},expected));
  assert.throws(()=>assertQuoteMatches({...quote,toToken:{...quote.toToken,isHoneyPot:true}},expected));
});
test("real approval builder encodes exact 5-USDT amount and quote spender",()=>{
  const approval=approvalSchema.parse(fixture("approval-nvda-bstocks"))[0];
  const decoded=decodeFunctionData({abi:erc20Abi,data:approval.data as `0x${string}`});
  assert.equal(decoded.functionName,"approve");
  assert.equal(String(decoded.args![0]).toLowerCase(),quote.approveTarget!.toLowerCase());
  assert.equal(decoded.args![1],5n*10n**18n);
});
test("amounts preserve exact units and ratio; never round excessive precision",()=>{
  assert.equal(toUnits("5",18),5n*10n**18n);assert.equal(fromUnits(20811070648182777n,18),"0.020811070648182777");
  assert.equal(shareExposure(1n*10n**18n,18,"1.000778223752807865"),"1.000778223752807865");
  assert.throws(()=>toUnits("1.0000001",6));assert.throws(()=>toUnits("1e6",18));assert.throws(()=>toUnits("-1",18));
});
test("actual approval success does not imply actual swap success",()=>{
  const approval=simulationSchema.parse(fixture("simulate-approval-nvda"));
  const swap=simulationSchema.parse(fixture("simulate-swap-nvda"));
  assert.equal(simulationSucceeded(approval),true);
  assert.equal(approval.allowanceChanges[0].postAmount,"5000000000000000000");
  assert.equal(simulationSucceeded(swap),false);
  assert.match(swap.failReason!,/exceeds balance/);
  assert.equal(simulationSucceeded({...approval,failReason:"execution reverted"}),false);
  assert.equal(simulationSchema.safeParse({...approval,status:"UNKNOWN"}).success,false);
});
