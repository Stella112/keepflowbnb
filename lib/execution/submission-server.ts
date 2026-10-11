import {assertBasketIntentNotCancelled} from './basket-intent-fence';
import type {Policy} from '../paper/model';
import 'server-only';
import {erc20Abi,type Address,type Hex} from 'viem';
import {existingAccountId,linkedWallet,paperDatabase,readAccount} from '../paper/store';
import {intentStore} from './intents/server';
import {reconcileIntent,type ReconcileRpc} from './intents/reconcile-core';
import type {Intent,PinnedTransaction} from './intents/model';
import {getDiscovery} from '../binance/rwa';
import {getBinanceClient} from '../binance/client';
import {publicClient,USDT_ADDRESS,verifyToken} from '../binance/onchain';
import {simulationSchema,swapEffectsMatch} from '../binance/trading-schemas';
import {walletPortfolio} from './portfolio';
import {walletPolicy,quotePolicy} from './rules';
import {toUnits} from '../binance/amounts';
import {BudgetStore,type VerifiedSettlement} from './budget-store';
import {LiveReceiptStore,receiptMatchesOriginalSettlement} from './live-receipt';
import {SubmissionStore} from './submission-store';
import {SubmissionTickets} from './submission-handoff';
import {verifySubmissionSettlement} from './submission-settlement';
import {submissionService,submissionFingerprint,recoverExistingSubmission,type SubmissionContext} from './submission';
export function submissionEnabled(){return process.env.MAINNET_WRITE_ENABLED==='true'&&process.env.EXECUTION_MODE==='MAINNET';}
function rpcReader():ReconcileRpc{const rpc=publicClient();return {chainId:()=>rpc.getChainId(),transaction:async hash=>{try{return await rpc.getTransaction({hash});}catch(error){if(error instanceof Error&&error.name==='TransactionNotFoundError')return null;throw error;}},receipt:async hash=>{try{return await rpc.getTransactionReceipt({hash});}catch(error){if(error instanceof Error&&error.name==='TransactionReceiptNotFoundError')return null;throw error;}},head:()=>rpc.getBlockNumber(),block:async blockNumber=>{const block=await rpc.getBlock({blockNumber});return {hash:block.hash,timestamp:block.timestamp};},stockBalance:(token,wallet,blockNumber)=>rpc.readContract({address:token as Address,abi:erc20Abi,functionName:'balanceOf',args:[wallet as Address],blockNumber})};}
async function freshValidation(context:Readonly<SubmissionContext>,intent:Readonly<Intent>){
 assertBasketIntentNotCancelled(paperDatabase(),context.account,intent.id);const q=intent.quote,tx=intent.transaction;if(!q||!tx||intent.approval)throw Error('APPROVAL_OR_PINS_UNAVAILABLE');
 const operatorCap=process.env.LIVE_MAX_TRADE_USD??'5';if(!/^\d+(\.\d{1,6})?$/.test(operatorCap)||toUnits(operatorCap,6)<=0n||toUnits(operatorCap,6)>25_000_000n||toUnits(intent.input.amount,6)>toUnits(operatorCap,6))throw Error('LIVE_OPERATOR_CAP');
 if(await existingAccountId()!==context.account||linkedWallet(context.account)?.toLowerCase()!==context.wallet)throw Error('AUTH_REQUIRED');
 const discovery=await getDiscovery(),asset=discovery.tokens.find(token=>token.underlyingTicker===intent.input.ticker&&token.platformId===q.provider&&token.binanceChainId==='56'&&token.tokenContractAddress.toLowerCase()===q.stock.toLowerCase());
 if(!asset||![1,3].includes(asset.assetType??-1)||!asset.statusInfo.openState||['ASSET_PAUSED','ASSET_LIMITED','UNSUPPORTED','MARKET_PAUSED','MARKET_MAINTENANCE'].includes(asset.statusInfo.reasonCode??''))throw Error('ASSET_UNAVAILABLE');
 const [funding,stock,snapshot]=await Promise.all([verifyToken(USDT_ADDRESS),verifyToken(q.stock),walletPortfolio(context.wallet)]);
 if(funding.symbol!=='USDT'||funding.decimals!==q.fundingDecimals||stock.decimals!==q.stockDecimals||stock.symbol!==asset.tokenSymbol||funding.address.toLowerCase()!==q.funding.toLowerCase())throw Error('TOKEN_MISMATCH');
 const policy=readAccount(context.account).policy,decision=walletPolicy(toUnits(intent.input.amount,6),BigInt(snapshot.cashMicros),BigInt(snapshot.exposures[intent.input.ticker]??'0'),BigInt(snapshot.totalMicros),policy);
 if(!decision.allowed||!quotePolicy(policy,q.fetchedAt,snapshot.marketFetchedAt,50).allowed)throw Error('POLICY_BLOCKED');
 const rpc=publicClient(),[allowance,gasBalance]=await Promise.all([rpc.readContract({address:funding.address,abi:erc20Abi,functionName:'allowance',args:[context.wallet as Address,q.spender as Address]}),rpc.getBalance({address:context.wallet as Address})]);
 if(await rpc.getChainId()!==56||allowance<BigInt(q.amountUnits)||gasBalance<BigInt(tx.gas)*BigInt(tx.gasPrice))throw Error('CHAIN_ALLOWANCE_OR_GAS_UNAVAILABLE');
 // Binance returns a different gasPrice and calldata on every build of the same quote (observed live
 // 2026-10-11), so a rebuild can never match byte for byte. Instead re-simulate the exact pinned bytes the
 // wallet will sign and require the same effects: exact USDT out, at least the pinned minimum stock in.
 if(tx.chainId!==56||tx.from.toLowerCase()!==context.wallet||tx.to.toLowerCase()!==q.spender.toLowerCase()||BigInt(tx.value)!==0n)throw Error('PINNED_TRANSACTION_INVALID');
 const client=getBinanceClient(),simulation=await client.simulate({from:tx.from,to:tx.to,data:tx.data,value:tx.value},simulationSchema);
 if(!swapEffectsMatch(simulation,{wallet:context.wallet,funding:q.funding,stock:q.stock,amount:BigInt(q.amountUnits),minimumReceive:BigInt(q.minimumReceiveUnits),spender:q.spender,allowance}))throw Error('PINNED_SIMULATION_FAILED');
 if(await existingAccountId()!==context.account||linkedWallet(context.account)?.toLowerCase()!==context.wallet||JSON.stringify(readAccount(context.account).policy)!==JSON.stringify(policy)||!quotePolicy(policy,q.fetchedAt,snapshot.marketFetchedAt,50).allowed)throw Error('AUTH_POLICY_OR_FRESHNESS_CHANGED');
 return {intent:{...structuredClone(intent),simulation:{approvalStatus:'NOT_NEEDED',swapStatus:'SUCCESS',checkedAt:new Date().toISOString(),message:'Exact pinned swap revalidated; no signature requested.',executionEnabled:false}},policy,wallet:context.wallet,allowanceSufficient:true};
}
function services(){const database=paperDatabase(),verified=new WeakSet<object>(),budget=new BudgetStore(database,({evidence})=>{if(typeof evidence!=='object'||evidence===null||!verified.has(evidence))throw Error('UNVERIFIED_CHAIN_EVIDENCE');return evidence as VerifiedSettlement;}),store=new SubmissionStore(database),tickets=new SubmissionTickets(database);
 const service=submissionService({enabled:submissionEnabled(),store,budget,readOwnedIntent:(owner,id)=>intentStore().read(owner,id),revalidate:freshValidation,wallet:{submitExactTransaction:async()=>{throw Error('SERVER_WALLET_SIGNING_UNAVAILABLE');}},verifyObservedHash:async(owner,intent,hash)=>{if(await existingAccountId()!==owner||linkedWallet(owner)?.toLowerCase()!==intent.wallet.toLowerCase())return false;const result=await reconcileIntent(intent,hash as Hex,rpcReader());return ['PENDING','CONFIRMED','REVERTED'].includes(result.status);}});
 return {service,budget,store,tickets,verified};}
export function submissionStatus(owner:string,id:string){const {service,budget}=services(),intent=intentStore().read(owner,id);if(!intent)throw Error('NOT_FOUND');const record=recoverExistingSubmission(service,owner,id);return {executionAvailable:submissionEnabled(),approvalFlowAvailable:false,confirmedFingerprint:submissionFingerprint(intent),submission:record??null,reservation:record?.reservationId?budget.read(owner,record.reservationId):null};}
export async function beginSubmissionHandoff(owner:string,wallet:string,id:string,fingerprint:string,trustedBudgetPolicy?:Policy){const {service,tickets}=services();let handoff:{ticket:string;transaction:Readonly<PinnedTransaction>}|undefined;const submission=await service.beginHandoff({account:owner,wallet,intentId:id,confirmedFingerprint:fingerprint,...(trustedBudgetPolicy?{trustedBudgetPolicy}:{})},(record,transaction)=>{handoff={ticket:tickets.issue(owner,record.intentId,Date.now()),transaction};});return {executionAvailable:submissionEnabled(),submission,...(handoff?{handoff:{...handoff,expiresAt:intentStore().read(owner,id)!.quote!.localFreshUntil,authorization:'EXACT_SWAP_ONLY_NO_APPROVAL' as const}}:{})};}
export async function observeSubmissionHash(owner:string,id:string,ticket:string|undefined,hash:Hex){const {service,tickets,budget,verified}=services();if(ticket!==undefined&&!tickets.verifies(owner,id,ticket))throw Error('HANDOFF_TICKET_INVALID');const prior=service.recover(owner,id);if(prior.hash&&prior.hash.toLowerCase()!==hash.toLowerCase())throw Error('SUBMISSION_HASH_CONFLICT');if(['CONFIRMED','REVERTED'].includes(prior.state)){const receipts=new LiveReceiptStore(paperDatabase());if(!receipts.read(owner,id)){const repair=await verifySubmissionSettlement(intentStore().read(owner,id)!,hash,rpcReader());if(repair.receipt){const reservation=budget.read(owner,prior.reservationId!)!,original=budget.events(owner,prior.reservationId!)?.find(event=>event.event===prior.state)?.details;if(!receiptMatchesOriginalSettlement(repair.receipt,reservation,original))throw Error('ORIGINAL_SETTLEMENT_CONFLICT');receipts.save(owner,repair.receipt);}}return {executionAvailable:submissionEnabled(),submission:prior,reservation:budget.read(owner,prior.reservationId!),receipt:receipts.read(owner,id)??null,verification:'VERIFIED_FINAL'};}const submission=await service.observeHash(owner,id,hash),intent=intentStore().read(owner,id)!;
 const result=await verifySubmissionSettlement(intent,hash,rpcReader());if(!result.evidence)return {executionAvailable:submissionEnabled(),submission,verification:result.verification};verified.add(result.evidence);
 const settled=service.reconcile(owner,id,result.evidence);if(result.receipt)new LiveReceiptStore(paperDatabase()).save(owner,result.receipt);return {executionAvailable:submissionEnabled(),submission:settled,reservation:budget.read(owner,settled.reservationId!),verification:result.verification};
}
