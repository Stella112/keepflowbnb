import 'server-only';
import {erc20Abi,type Address} from 'viem';
import {linkedWallet,readAccount} from '../paper/store';
import {publicClient,USDT_ADDRESS} from '../binance/onchain';
import {getBinanceClient} from '../binance/client';
import {simulationSchema,swapEffectsMatch} from '../binance/trading-schemas';
import {toUnits} from '../binance/amounts';
import {walletPortfolio} from './portfolio';
import {walletPolicy,quotePolicy} from './rules';
import type {SubmissionContext} from './submission';
import type {Intent} from './intents/model';

/** Real read-only provider checks for the exact transaction accepted by submissionService. */
export async function revalidateSubmission(context:Readonly<SubmissionContext>,intent:Readonly<Intent>){
 const wallet=linkedWallet(context.account)?.toLowerCase();
 if(!wallet||wallet!==context.wallet.toLowerCase()||wallet!==intent.wallet.toLowerCase()||!intent.quote||!intent.transaction)throw Error('OWNER_BINDING_CHANGED');
 const q=intent.quote,tx=intent.transaction,client=publicClient();
 if(await client.getChainId()!==56||q.funding.toLowerCase()!==USDT_ADDRESS.toLowerCase()||tx.to.toLowerCase()!==q.spender.toLowerCase())throw Error('CHAIN_OR_ROUTE_CHANGED');
 const policy=readAccount(context.account).policy,snapshot=await walletPortfolio(wallet);
 if(!walletPolicy(toUnits(intent.input.amount,6),BigInt(snapshot.cashMicros),BigInt(snapshot.exposures[intent.input.ticker]??'0'),BigInt(snapshot.totalMicros),policy).allowed||!quotePolicy(policy,q.fetchedAt,snapshot.marketFetchedAt,50).allowed)throw Error('POLICY_CHANGED');
 const allowance=await client.readContract({address:q.funding as Address,abi:erc20Abi,functionName:'allowance',args:[wallet as Address,q.spender as Address]});
 if(allowance<BigInt(q.amountUnits))throw Error('APPROVAL_REQUIRED');
 const simulation=await getBinanceClient().simulate({from:tx.from,to:tx.to,data:tx.data,value:tx.value},simulationSchema);
 if(!swapEffectsMatch(simulation,{wallet,funding:q.funding,stock:q.stock,amount:BigInt(q.amountUnits),minimumReceive:BigInt(q.minimumReceiveUnits),spender:q.spender,allowance}))throw Error('SIMULATION_FAILED');
 // Recheck owner and saved policy after all awaited provider operations.
 if(linkedWallet(context.account)?.toLowerCase()!==wallet||JSON.stringify(readAccount(context.account).policy)!==JSON.stringify(policy))throw Error('AUTHORITY_CHANGED');
 return {intent:structuredClone(intent),policy,wallet,allowanceSufficient:true};
}
