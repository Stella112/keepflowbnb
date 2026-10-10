import {assertBasketIntentNotCancelled} from './basket-intent-fence';
import 'server-only';
import {erc20Abi,type Address,type Hex} from 'viem';
import {ApprovalJournal,prepareApproval,reconcileApproval,type ApprovalRpc,type ApprovalJob} from './approval';
import {intentStore} from './intents/server';
import {intentView} from './intents/model';
import {paperDatabase,readAccount,existingAccountId,linkedWallet} from '../paper/store';
import {publicClient,USDT_ADDRESS,verifyToken} from '../binance/onchain';
import {getBinanceClient} from '../binance/client';
import {simulationSchema,simulationSucceeded} from '../binance/trading-schemas';
import {toUnits} from '../binance/amounts';
import {walletPortfolio} from './portfolio';
import {walletPolicy,quotePolicy} from './rules';
export function approvalEnabled(){return process.env.MAINNET_WRITE_ENABLED==='true'&&process.env.EXECUTION_MODE==='MAINNET'&&process.env.FIRSTBELL_APPROVAL_ENABLED==='true';}
const journal=()=>new ApprovalJournal(paperDatabase());
function owned(owner:string,wallet:string,id:string){const intent=intentStore().read(owner,id);if(!intent||intent.wallet.toLowerCase()!==wallet.toLowerCase())throw Error('NOT_FOUND');return intent;}
export function approvalView(job:ApprovalJob){const {data,...view}=job;return {...view,calldataPinned:true};}
export function approvalStatus(owner:string,wallet:string,id:string){const intent=owned(owner,wallet,id);const db=paperDatabase(),store=journal(),row=db.prepare('SELECT id FROM approval_journal WHERE owner=? AND intent_id=?').get(owner,id);return {enabled:approvalEnabled(),candidate:intent.approval?{...intentView(intent).approval,quoteFetchedAt:intent.quote?.fetchedAt,expiresAt:intent.quote?.localFreshUntil,authorizationRequired:true}:null,approval:row?approvalView(store.read(owner,String(row.id))!):null,requiresFreshSwap:true};}
export async function prepareApprovalHandoff(owner:string,wallet:string,id:string){
 if(!approvalEnabled())throw Error('EXECUTION_DISABLED');assertBasketIntentNotCancelled(paperDatabase(),owner,id);const intent=owned(owner,wallet,id),job=prepareApproval(intent),q=intent.quote!,rpc=publicClient(),policy=readAccount(owner).policy;
 if(JSON.stringify(policy)!==JSON.stringify(intent.policySnapshot)||q.funding.toLowerCase()!==USDT_ADDRESS.toLowerCase()||q.fundingDecimals!==18||toUnits(intent.input.amount,18).toString()!==job.amountUnits||toUnits(intent.input.amount,6)>5_000_000n)throw Error('POLICY_OR_AMOUNT_CHANGED');
 const [token,snapshot]=await Promise.all([verifyToken(USDT_ADDRESS),walletPortfolio(wallet)]);if(token.symbol!=='USDT'||token.decimals!==18||await rpc.getChainId()!==56||!walletPolicy(toUnits(intent.input.amount,6),BigInt(snapshot.cashMicros),BigInt(snapshot.exposures[intent.input.ticker]??'0'),BigInt(snapshot.totalMicros),policy).allowed||!quotePolicy(policy,q.fetchedAt,snapshot.marketFetchedAt,50).allowed)throw Error('FRESH_VALIDATION_FAILED');
 const simulation=await getBinanceClient().simulate({from:wallet,to:job.token,value:'0',data:job.data},simulationSchema);
 if(!simulationSucceeded(simulation)||simulation.balanceChanges.length!==0||simulation.allowanceChanges.length!==1||!simulation.allowanceChanges.every(change=>change.tokenAddress.toLowerCase()===job.token&&change.owner.toLowerCase()===job.wallet&&change.spender.toLowerCase()===job.spender&&BigInt(change.postAmount)===BigInt(job.amountUnits)))throw Error('APPROVAL_SIMULATION_FAILED');
 const [gas,gasPrice,bnb]=await Promise.all([rpc.estimateGas({account:job.wallet as Address,to:job.token as Address,data:job.data,value:0n}),rpc.getGasPrice(),rpc.getBalance({address:job.wallet as Address})]);if(gas<=0n||gas>1_000_000n||gasPrice<=0n||gasPrice>=(1n<<256n)||bnb<gas*gasPrice||await rpc.getChainId()!==56)throw Error('APPROVAL_GAS_OR_CHAIN_UNAVAILABLE');
 if(await existingAccountId()!==owner||linkedWallet(owner)?.toLowerCase()!==job.wallet||JSON.stringify(readAccount(owner).policy)!==JSON.stringify(policy)||!approvalEnabled())throw Error('AUTH_OR_POLICY_CHANGED');prepareApproval(intent);
 const store=journal(),admitted=store.admit(owner,intent),claimed=store.claimHandoff(owner,admitted.id);if(!claimed)return {enabled:true,approval:approvalView(store.read(owner,admitted.id)!),requiresFreshSwap:true};
 return {enabled:true,approval:approvalView(claimed),requiresFreshSwap:true,transaction:{chainId:56,from:claimed.wallet,to:claimed.token,data:claimed.data,value:'0',gas:gas.toString(),gasPrice:gasPrice.toString(),authorization:'EXACT_ERC20_APPROVAL_ONLY'}};
}
function reader():ApprovalRpc{const rpc=publicClient();return {chainId:()=>rpc.getChainId(),transaction:async hash=>{try{return await rpc.getTransaction({hash});}catch(error){if(error instanceof Error&&error.name==='TransactionNotFoundError')return null;throw error;}},receipt:async hash=>{try{return await rpc.getTransactionReceipt({hash});}catch(error){if(error instanceof Error&&error.name==='TransactionReceiptNotFoundError')return null;throw error;}},head:()=>rpc.getBlockNumber(),block:async blockNumber=>{const block=await rpc.getBlock({blockNumber});return {hash:block.hash,timestamp:block.timestamp};},allowance:(token,wallet,spender,blockNumber)=>rpc.readContract({address:token as Address,abi:erc20Abi,functionName:'allowance',args:[wallet as Address,spender as Address],blockNumber})};}
export async function observeApproval(owner:string,wallet:string,id:string,hash:Hex){const intent=owned(owner,wallet,id),store=journal(),row=paperDatabase().prepare('SELECT id FROM approval_journal WHERE owner=? AND intent_id=?').get(owner,id);const job=row?store.read(owner,String(row.id))!:store.admit(owner,intent);const observed=store.observe(owner,job.id,hash),result=await reconcileApproval(observed,reader());store.record(owner,job.id,observed.revision,result);return {enabled:approvalEnabled(),approval:approvalView(store.read(owner,job.id)!),requiresFreshSwap:true};}

