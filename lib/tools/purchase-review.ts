import {randomBytes} from "node:crypto";
import type {DatabaseSync} from "node:sqlite";
import {z} from "zod";
import {curatedTickers} from "../binance/rwa-schemas.ts";

/** A review link only pre-fills KeepFlow's normal purchase screen. It carries no
 * quote, calldata, signature or spending authority; the website signs the user in,
 * re-quotes, re-checks balance and rules and simulates before the wallet is asked. */
export const REVIEW_TTL_MS=15*60_000;
const amount=z.string().regex(/^\d+(\.\d{1,6})?$/).max(20);
export const purchaseReviewInput=z.object({
 ticker:z.enum(curatedTickers).optional(),
 provider:z.enum(["bstock","ondo"]).optional(),
 flowId:z.string().min(1).max(80).optional(),
 amount,
}).strict()
 .refine(v=>Boolean(v.ticker)!==Boolean(v.flowId),{message:"Give either a ticker or a flowId, not both."})
 .refine(v=>!v.flowId||!v.provider,{message:"provider applies to single-stock reviews only."})
 .refine(v=>Number(v.amount)>0&&Number(v.amount)<=(v.flowId?100:25),{message:"Amount must be above 0 and at most 25 USDT for a stock or 100 USDT for a Flow."});
export type PurchaseReviewInput=z.infer<typeof purchaseReviewInput>;
export type PurchaseReview={id:string;kind:"STOCK"|"FLOW";ticker:string|null;provider:string|null;flowId:string|null;flowVersion:number|null;amount:string;owner:string|null;source:string;createdAt:number;expiresAt:number};
export const reviewIdPattern=/^[A-Za-z0-9_-]{24}$/;

export class PurchaseReviewStore{
 private readonly db:DatabaseSync;
 constructor(db:DatabaseSync){
  this.db=db;
  db.exec("CREATE TABLE IF NOT EXISTS purchase_reviews(id TEXT PRIMARY KEY, kind TEXT NOT NULL, ticker TEXT, provider TEXT, flow_id TEXT, flow_version INTEGER, amount TEXT NOT NULL, owner TEXT, source TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)");
 }
 create(input:{kind:"STOCK"|"FLOW";ticker?:string;provider?:string;flowId?:string;flowVersion?:number;amount:string;owner?:string;source:string},now=Date.now()):PurchaseReview{
  this.db.prepare("DELETE FROM purchase_reviews WHERE expires_at<=?").run(now);
  const review:PurchaseReview={id:randomBytes(18).toString("base64url"),kind:input.kind,ticker:input.ticker??null,provider:input.provider??null,flowId:input.flowId??null,flowVersion:input.flowVersion??null,amount:input.amount,owner:input.owner??null,source:input.source,createdAt:now,expiresAt:now+REVIEW_TTL_MS};
  this.db.prepare("INSERT INTO purchase_reviews(id,kind,ticker,provider,flow_id,flow_version,amount,owner,source,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(review.id,review.kind,review.ticker,review.provider,review.flowId,review.flowVersion,review.amount,review.owner,review.source,review.createdAt,review.expiresAt);
  return review;
 }
 read(id:string,now=Date.now()):PurchaseReview|undefined{
  if(!reviewIdPattern.test(id))return undefined;
  const row=this.db.prepare("SELECT * FROM purchase_reviews WHERE id=?").get(id) as Record<string,string|number|null>|undefined;
  if(!row||Number(row.expires_at)<=now)return undefined;
  return {id:String(row.id),kind:row.kind==="FLOW"?"FLOW":"STOCK",ticker:row.ticker as string|null,provider:row.provider as string|null,flowId:row.flow_id as string|null,flowVersion:row.flow_version===null?null:Number(row.flow_version),amount:String(row.amount),owner:row.owner as string|null,source:String(row.source),createdAt:Number(row.created_at),expiresAt:Number(row.expires_at)};
 }
}
