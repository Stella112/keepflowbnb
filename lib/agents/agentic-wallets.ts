import type {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import type {OnboardingRunner} from './onboarding.ts';

/**
 * Per-user Binance Agentic Wallet connections. Each KeepFlow account signs in its own Agentic Wallet through
 * Binance's official QR flow; the session lives in that account's private directory (BINANCE_BAW_DIR) and is only
 * ever used for that account's own Autopilot. KeepFlow never sees keys; the user's Binance app limits and
 * revocation stay in force.
 */
export type AgenticWallet={owner:string;wallet:string;dir:string;connectedAt:string};
type Pending={owner:string;qrCodeId:string;expiresAt:number;dir:string};

export class AgenticWalletStore{
 private db:DatabaseSync;
 constructor(db:DatabaseSync){
  this.db=db;
  db.exec('CREATE TABLE IF NOT EXISTS agentic_wallets(owner TEXT PRIMARY KEY,wallet TEXT NOT NULL UNIQUE,dir TEXT NOT NULL,connected_at TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS agentic_signins(owner TEXT PRIMARY KEY,qr_code_id TEXT NOT NULL,expires_at INTEGER NOT NULL,dir TEXT NOT NULL)');
 }
 read(owner:string):AgenticWallet|undefined{const row=this.db.prepare('SELECT owner,wallet,dir,connected_at FROM agentic_wallets WHERE owner=?').get(owner);return row?{owner:String(row.owner),wallet:String(row.wallet),dir:String(row.dir),connectedAt:String(row.connected_at)}:undefined;}
 byWallet(wallet:string){const row=this.db.prepare('SELECT owner FROM agentic_wallets WHERE wallet=?').get(wallet.toLowerCase());return row?String(row.owner):undefined;}
 count(){return Number(this.db.prepare('SELECT COUNT(*) AS n FROM agentic_wallets').get()?.n??0);}
 bind(owner:string,wallet:string,dir:string,now:number){this.db.prepare('INSERT INTO agentic_wallets(owner,wallet,dir,connected_at) VALUES(?,?,?,?) ON CONFLICT(owner) DO UPDATE SET wallet=excluded.wallet,dir=excluded.dir,connected_at=excluded.connected_at').run(owner,wallet.toLowerCase(),dir,new Date(now).toISOString());return this.read(owner)!;}
 remove(owner:string){this.db.prepare('DELETE FROM agentic_wallets WHERE owner=?').run(owner);this.db.prepare('DELETE FROM agentic_signins WHERE owner=?').run(owner);}
 pending(owner:string):Pending|undefined{const row=this.db.prepare('SELECT owner,qr_code_id,expires_at,dir FROM agentic_signins WHERE owner=?').get(owner);return row?{owner:String(row.owner),qrCodeId:String(row.qr_code_id),expiresAt:Number(row.expires_at),dir:String(row.dir)}:undefined;}
 setPending(p:Pending){this.db.prepare('INSERT INTO agentic_signins(owner,qr_code_id,expires_at,dir) VALUES(?,?,?,?) ON CONFLICT(owner) DO UPDATE SET qr_code_id=excluded.qr_code_id,expires_at=excluded.expires_at,dir=excluded.dir').run(p.owner,p.qrCodeId,p.expiresAt,p.dir);}
 clearPending(owner:string){this.db.prepare('DELETE FROM agentic_signins WHERE owner=?').run(owner);}
}

export type ConnectDeps={store:AgenticWalletStore;runner:(dir:string)=>OnboardingRunner;dirFor:(owner:string)=>string;prepareDir:(dir:string)=>Promise<void>;removeDir:(dir:string)=>Promise<void>;now:()=>number;maxWallets:number};

function data(text:string){if(Buffer.byteLength(text)>32768)throw Error('INVALID_SETUP_RESPONSE');return z.object({success:z.literal(true),data:z.record(z.string(),z.unknown())}).parse(JSON.parse(text)).data;}
const challengeSchema=z.object({qrCodeId:z.string().uuid(),expireAt:z.string().regex(/^\d{10,16}$/),urlForWeb:z.string().max(8192),pairingCode:z.string().regex(/^[A-Za-z0-9]{6}$/)});
/** Only Binance's own login pages are ever shown to the user. */
export function officialLoginUrl(raw:string){
 const url=new URL(raw);
 return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.hash&&((url.hostname==='web3.binance.com'&&url.pathname==='/en/agent-login')||(url.hostname==='app.binance.com'&&/^\/uni-qr\/[A-Za-z0-9_-]{1,80}$/.test(url.pathname)&&!url.search));
}

async function bindConnected(owner:string,dir:string,run:OnboardingRunner,deps:ConnectDeps){
 const status=data(await run('STATUS'));if(status.status!=='CONNECTED')throw Error('NOT_CONNECTED');
 const rows=z.object({addresses:z.array(z.object({binanceChainId:z.string(),address:z.string().max(128)})).max(32)}).parse(data(await run('ADDRESS'))).addresses.filter(a=>a.binanceChainId==='56');
 if(rows.length!==1||!/^0x[0-9a-fA-F]{40}$/.test(rows[0].address))throw Error('BSC_ADDRESS_UNVERIFIED');
 const wallet=rows[0].address.toLowerCase(),holder=deps.store.byWallet(wallet);
 if(holder&&holder!==owner)throw Error('WALLET_ALREADY_LINKED');
 deps.store.clearPending(owner);
 return deps.store.bind(owner,wallet,dir,deps.now());
}

export async function startAgenticConnect(owner:string,deps:ConnectDeps){
 if(deps.store.read(owner))return {status:'CONNECTED' as const,wallet:deps.store.read(owner)!.wallet};
 if(deps.store.count()>=deps.maxWallets)throw Error('CAPACITY_REACHED');
 const dir=deps.dirFor(owner);await deps.prepareDir(dir);const run=deps.runner(dir);
 const output=data(await run('SIGNIN'));
 if(output.status==='ALREADY_CONNECTED'){const bound=await bindConnected(owner,dir,run,deps);return {status:'CONNECTED' as const,wallet:bound.wallet};}
 const challenge=challengeSchema.parse(output),expiresAt=Number(challenge.expireAt),now=deps.now();
 if(!officialLoginUrl(challenge.urlForWeb)||!Number.isSafeInteger(expiresAt)||expiresAt<=now||expiresAt>now+600_000)throw Error('INVALID_SETUP_RESPONSE');
 deps.store.setPending({owner,qrCodeId:challenge.qrCodeId,expiresAt,dir});
 return {status:'AWAITING_APPROVAL' as const,urlForWeb:challenge.urlForWeb,pairingCode:challenge.pairingCode,expiresAt:new Date(expiresAt).toISOString()};
}

export async function verifyAgenticConnect(owner:string,deps:ConnectDeps){
 const pending=deps.store.pending(owner);
 if(!pending||pending.expiresAt<=deps.now()){deps.store.clearPending(owner);throw Error('SIGNIN_EXPIRED');}
 const run=deps.runner(pending.dir);
 // A timeout or non-success means the user has not approved yet; the same code stays valid until it expires.
 let verified:Record<string,unknown>;try{verified=data(await run('VERIFY',pending.qrCodeId));}catch{throw Error('NOT_APPROVED');}
 if(verified.status!=='SUCCESS')throw Error('NOT_APPROVED');
 const bound=await bindConnected(owner,pending.dir,run,deps);
 return {status:'CONNECTED' as const,wallet:bound.wallet};
}

/** Forgets the session on KeepFlow's side. The user can also revoke it in the Binance app at any time. */
export async function disconnectAgentic(owner:string,deps:Pick<ConnectDeps,'store'|'removeDir'|'dirFor'>){
 const current=deps.store.read(owner),pending=deps.store.pending(owner);
 deps.store.remove(owner);
 for(const dir of new Set([current?.dir,pending?.dir,deps.dirFor(owner)].filter((d):d is string=>Boolean(d))))await deps.removeDir(dir);
}
