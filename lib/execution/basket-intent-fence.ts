import type {DatabaseSync} from 'node:sqlite';
/** Call inside the same SQLite write transaction as a financial journal claim. */
export function assertBasketIntentNotCancelled(db:DatabaseSync,account:string,intentId:string){
 if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='live_basket_sessions'").get())return;
 const cancelled=db.prepare("SELECT id FROM live_basket_sessions WHERE account=? AND json_extract(payload,'$.state')='CANCELLED' AND EXISTS (SELECT 1 FROM json_each(json_extract(payload,'$.legs')) WHERE json_extract(value,'$.intentId')=? AND json_extract(value,'$.state')='CANCELLED')").get(account,intentId);
 if(cancelled)throw Error('BASKET_INTENT_CANCELLED');
 if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transaction_intents'").get())return;
 const intent=db.prepare('SELECT request_id FROM transaction_intents WHERE owner=? AND id=?').get(account,intentId);if(!intent)return;
 const mapped=db.prepare("SELECT id FROM live_basket_sessions WHERE account=? AND json_extract(payload,'$.state')='CANCELLED' AND EXISTS (SELECT 1 FROM json_each(json_extract(payload,'$.legs')) AS leg JOIN json_each(json_extract(leg.value,'$.preparationRequestIds')) AS request WHERE request.value=? AND json_extract(leg.value,'$.state')='CANCELLED')").get(account,String(intent.request_id));
 if(mapped)throw Error('BASKET_INTENT_CANCELLED');
}
