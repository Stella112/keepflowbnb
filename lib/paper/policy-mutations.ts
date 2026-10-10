import type {Account,Policy} from './model.ts';
export class PolicyConflict extends Error {}
export function assertTradeRequestAvailable(state:Account,requestId:string){
 if(state.policyMutations?.some(record=>record.requestId===requestId))throw new PolicyConflict('This request ID was already used for a policy change.');
}
// Persist the policy and its replay ledger in the same account transaction.
export function mutatePolicy(state:Account,input:{requestId:string;fingerprint:string;policy:Policy;expectedPolicyVersion?:number}){
 if(state.receipts.some(receipt=>receipt.requestId===input.requestId))throw new PolicyConflict('This request ID was already used for a trading action.');
 const prior=state.policyMutations?.find(record=>record.requestId===input.requestId);
 if(prior){if(prior.fingerprint!==input.fingerprint)throw new PolicyConflict('This request ID was already used for different policy instructions.');return prior.result;}
 const version=state.policyVersion??0;
 if((input.expectedPolicyVersion??(version===0?0:-1))!==version)throw new PolicyConflict('Your rules have changed. Refresh before saving.');
 if((state.policyMutations?.length??0)>=500)throw new PolicyConflict('This account has reached its policy-change limit.');
 const result={saved:true as const,policyVersion:version+1};
 state.policy={...input.policy};state.policyVersion=result.policyVersion;
 (state.policyMutations??=[]).push({requestId:input.requestId,fingerprint:input.fingerprint,result});
 return result;
}
