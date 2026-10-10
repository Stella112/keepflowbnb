import type {Account,Flow,Policy,Receipt} from "./model.ts";
import {effectiveBellPolicy} from "../execution/rules.ts";
import {fromUnits} from "../binance/amounts.ts";
import type {DatabaseSync} from "node:sqlite";
export function readOwnedPaperReceipt(db:DatabaseSync,owner:string|undefined,id:string):Receipt|undefined{
 if(!owner)return undefined;
 const row=db.prepare("SELECT state FROM accounts WHERE id=?").get(owner);
 return row?(JSON.parse(String(row.state)) as Account).receipts.find(receipt=>receipt.id===id):undefined;
}
export function paperReceiptEvidence(state:Account,bell?:Flow,policy:Policy=state.policy){
 return {cashAfterUsd:fromUnits(BigInt(state.cashMicros),6),policySnapshot:structuredClone(state.policy),effectivePolicySnapshot:structuredClone(bell?effectiveBellPolicy(bell,policy):policy),...(bell?{bellVersion:bell.version,bellContentHash:bell.contentHash}:{})};
}
export function paperReceiptExport(receipt:Receipt){const {fingerprint,requestId,...evidence}=receipt;return {schemaVersion:1 as const,receipt:structuredClone(evidence),financialAuthorization:"NONE_PAPER_ONLY" as const};}
