import type {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import type {BudgetReservation} from './budget-store.ts';
const units=z.string().regex(/^\d+$/).max(78),hash=z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform(v=>v.toLowerCase()),address=z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform(v=>v.toLowerCase());
export const liveReceiptSchema=z.object({intentId:z.string().uuid(),mode:z.literal('MAINNET'),chainId:z.literal(56),wallet:address,ticker:z.string().min(1).max(12),provider:z.string().min(1).max(50),hash,outcome:z.enum(['CONFIRMED','REVERTED']),confirmedAt:z.iso.datetime(),blockHash:hash,confirmations:z.number().int().min(12),funding:address,stock:address,fundingDecimals:z.number().int().min(0).max(36),stockDecimals:z.number().int().min(0).max(36),spentUnits:units,receivedUnits:units,stockBalanceAtBlock:units.nullable(),blockNumber:units,policySnapshot:z.record(z.string(),z.unknown())}).strict();
export type LiveReceipt=z.infer<typeof liveReceiptSchema>;
export function receiptMatchesOriginalSettlement(receipt:LiveReceipt,reservation:BudgetReservation,details:unknown){
 const original=z.object({blockHash:hash,outcome:z.enum(['CONFIRMED','REVERTED']),wallet:address,hash,intentId:z.string(),confirmedAt:z.iso.datetime(),confirmations:z.number().int().min(12)}).safeParse(details);
 if(!original.success||receipt.fundingDecimals!==18)return false;const before=original.data,micros=(BigInt(receipt.spentUnits)+10n**12n-1n)/10n**12n;
 return receipt.intentId===reservation.intentId&&receipt.intentId===before.intentId&&receipt.hash.toLowerCase()===reservation.hash?.toLowerCase()&&receipt.hash.toLowerCase()===before.hash&&receipt.wallet.toLowerCase()===reservation.wallet.toLowerCase()&&receipt.wallet.toLowerCase()===before.wallet&&receipt.outcome===reservation.state&&receipt.outcome===before.outcome&&receipt.confirmedAt===reservation.confirmedAt&&receipt.confirmedAt===before.confirmedAt&&receipt.blockHash.toLowerCase()===before.blockHash&&receipt.confirmations>=before.confirmations&&micros.toString()===reservation.actualSpendMicros;
}
/** Called only after exact effects and canonical finality verification in server code. */
export class LiveReceiptStore{
 private db:DatabaseSync;
 constructor(db:DatabaseSync){this.db=db;db.exec('CREATE TABLE IF NOT EXISTS live_receipts(intent_id TEXT PRIMARY KEY,owner TEXT NOT NULL,hash TEXT NOT NULL UNIQUE,payload TEXT NOT NULL)');}
 read(owner:string,intentId:string):LiveReceipt|undefined{const row=this.db.prepare('SELECT payload FROM live_receipts WHERE owner=? AND intent_id=?').get(owner,intentId);return row?liveReceiptSchema.parse(JSON.parse(String(row.payload))):undefined;}
 save(owner:string,input:LiveReceipt){const receipt=liveReceiptSchema.parse(input),payload=JSON.stringify(receipt);this.db.exec('BEGIN IMMEDIATE');try{const prior=this.db.prepare('SELECT owner,payload FROM live_receipts WHERE intent_id=? OR hash=?').get(receipt.intentId,receipt.hash);if(prior){if(prior.owner!==owner||prior.payload!==payload)throw Error('RECEIPT_CONFLICT');this.db.exec('COMMIT');return receipt;}this.db.prepare('INSERT INTO live_receipts VALUES(?,?,?,?)').run(receipt.intentId,owner,receipt.hash,payload);this.db.exec('COMMIT');return receipt;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
