import "server-only";
import {DatabaseSync} from "node:sqlite";
import {join} from "node:path";
import {accountId} from "./store";
import type {quoteSummary,simulateCandidate} from "../binance/trading";
export type PreviewReceipt=ReturnType<typeof quoteSummary>&{simulation:Awaited<ReturnType<typeof simulateCandidate>>};
// accountId initializes and protects the shared database before this connection opens.
async function database(){await accountId();const db=new DatabaseSync(process.env.PAPER_DATABASE_PATH??join(process.cwd(),"logs","paper.sqlite"));db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS preview_receipts(id TEXT PRIMARY KEY,owner TEXT NOT NULL,receipt TEXT NOT NULL)");return db;}
export async function savePreviewReceipt(receipt:PreviewReceipt){const owner=await accountId(),db=await database();try{db.prepare("INSERT INTO preview_receipts(id,owner,receipt) VALUES (?,?,?)").run(receipt.id,owner,JSON.stringify(receipt));}finally{db.close();}}
export async function readPreviewReceipt(id:string){const owner=await accountId(),db=await database();try{const row=db.prepare("SELECT receipt FROM preview_receipts WHERE id=? AND owner=?").get(id,owner);return row?JSON.parse(String(row.receipt)) as PreviewReceipt:undefined;}finally{db.close();}}
