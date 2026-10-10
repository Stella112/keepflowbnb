import "server-only";
import {DatabaseSync} from "node:sqlite";
import {mkdirSync,chmodSync} from "node:fs";
import {dirname,join} from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {cookies,headers} from "next/headers";
import {identityTransportAllowed,identityCookieSecure,identityTransportError} from "../request-origin";
import {createIdentitySession,resolveIdentitySession,revokeIdentitySession} from './identity-sessions';
import {newAccount,type Account,type Flow,type BellInput} from "./model";
import {canonicalJson} from "../bells/manifest";
import type {LoginChallenge} from "./identity-message";
const singleton=globalThis as typeof globalThis & {firstBellPaperDb?:DatabaseSync};
export function paperDatabase(){return db();}
function db(){
 if(singleton.firstBellPaperDb)return singleton.firstBellPaperDb;
 const path=process.env.PAPER_DATABASE_PATH??join(process.cwd(),"logs","paper.sqlite");
 mkdirSync(dirname(path),{recursive:true});const database=new DatabaseSync(path);chmodSync(path,0o600);
 database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS bells(id TEXT PRIMARY KEY, owner TEXT, definition TEXT NOT NULL); CREATE TABLE IF NOT EXISTS bell_versions(bell_id TEXT, version INTEGER, definition TEXT NOT NULL, PRIMARY KEY(bell_id,version))");
 database.exec("CREATE TABLE IF NOT EXISTS wallet_accounts(wallet TEXT PRIMARY KEY, account_id TEXT UNIQUE NOT NULL); CREATE TABLE IF NOT EXISTS login_challenges(account_id TEXT PRIMARY KEY, challenge TEXT NOT NULL)");
 singleton.firstBellPaperDb=database;
 const examples: (BellInput & {id:string})[]=[
  {id:"ai-compute",title:"AI Compute",description:"A paper portfolio of companies building the AI infrastructure stack.",assets:[{ticker:"NVDA",weightBps:3000},{ticker:"MSFT",weightBps:2500},{ticker:"GOOGL",weightBps:2000},{ticker:"AMZN",weightBps:1500}],reserveBps:1000},
  {id:"blue-chip",title:"Everyday Leaders",description:"A balanced paper basket of familiar companies, with a cash reserve.",assets:[{ticker:"AAPL",weightBps:3000},{ticker:"MSFT",weightBps:3000},{ticker:"AMZN",weightBps:3000}],reserveBps:1000},
  {id:"nvidia",title:"Start with NVIDIA",description:"A single-company Flow for practicing paper purchases.",assets:[{ticker:"NVDA",weightBps:10000}],reserveBps:0},
 ];
 for(const example of examples){const {id,...input}=example;const bell=makeBell(input,id,true);database.prepare("INSERT OR IGNORE INTO bells(id,owner,definition) VALUES (?,NULL,?)").run(id,JSON.stringify(bell));}
 return database;
}
export async function accountId(){
 const jar=await cookies();let id=jar.get("firstbell-paper")?.value;
 const transport=await identityRequest();
 const token=jar.get('firstbell-identity')?.value;
 if(token){if(!identityTransportAllowed(transport))throw new Error(identityTransportError);const authenticated=resolveIdentitySession(db(),token);if(authenticated)return authenticated;}
 // Legacy account UUIDs were transmitted over HTTP. They can never restore a
 // linked identity, including after migrating to HTTPS. Wallet reauthentication
 // recovers the existing data and issues a fresh opaque session.
 if(id&&linkedWallet(id))id=undefined;
 if(!id||!/^([0-9a-f]{8}-[0-9a-f-]{27})$/.test(id)){id=randomUUID();jar.set("firstbell-paper",id,{httpOnly:true,sameSite:"lax",secure:identityCookieSecure(transport),path:"/",maxAge:60*60*24*90});}
 db().prepare("INSERT OR IGNORE INTO accounts(id,state) VALUES (?,?)").run(id,JSON.stringify(newAccount()));return id;
}
export function readAccount(id:string):Account{return JSON.parse(String(db().prepare("SELECT state FROM accounts WHERE id=?").get(id)!.state));}
export function transact<T>(id:string,action:(state:Account)=>T):T{
 const database=db();database.exec("BEGIN IMMEDIATE");try{const state=readAccount(id);const result=action(state);database.prepare("UPDATE accounts SET state=? WHERE id=?").run(JSON.stringify(state),id);database.exec("COMMIT");return result;}catch(error){database.exec("ROLLBACK");throw error;}
}
function makeBell(input:BellInput,id:string=randomUUID(),example=false):Flow{const now=new Date().toISOString();return {...input,id,version:1,schemaVersion:1,slug:id,visibility:"PUBLIC",contentHash:createHash("sha256").update(canonicalJson(input)).digest("hex"),createdAt:now,publishedAt:now,example};}
export function listBells():Flow[]{return db().prepare("SELECT definition FROM bells ORDER BY rowid DESC LIMIT 100").all().map(row=>JSON.parse(String(row.definition)));}
export function getBell(id:string):Flow|undefined{const row=db().prepare("SELECT definition FROM bells WHERE id=?").get(id);return row?JSON.parse(String(row.definition)):undefined;}
export function createBell(input:BellInput,owner:string){const source=input.forkedFromId?getBell(input.forkedFromId):undefined;if(input.forkedFromId&&!source)throw new Error("The original Flow was not found.");const bell=makeBell({...input,...(input.policy?{policy:structuredClone(input.policy)}:source?.policy?{policy:structuredClone(source.policy)}:{})});bell.creatorWallet=linkedWallet(owner);if(source)bell.forkedFromVersion=source.version;db().prepare("INSERT INTO bells(id,owner,definition) VALUES (?,?,?)").run(bell.id,owner,JSON.stringify(bell));return bell;}
export function requestFingerprint(input:unknown){return createHash("sha256").update(JSON.stringify(input)).digest("hex");}
export function duePaperAccounts(now=Date.now()){return db().prepare("SELECT id,state FROM accounts WHERE json_extract(state,'$.autopilot.enabled')=1 AND json_extract(state,'$.autopilot.nextRunAt')<=? LIMIT 20").all(new Date(now).toISOString()).map(row=>({id:String(row.id),state:JSON.parse(String(row.state)) as Account}));}
async function identityRequest(){return new Request('http://localhost:3100/',{headers:await headers()});}
export async function existingAccountId(){const jar=await cookies(),request=await identityRequest(),token=jar.get('firstbell-identity')?.value;if(token&&identityTransportAllowed(request)){const id=resolveIdentitySession(db(),token);if(id)return id;}const guest=jar.get('firstbell-paper')?.value;return guest&&!linkedWallet(guest)?guest:undefined;}
export async function issueIdentitySession(account:string,request:Request){if(!identityTransportAllowed(request))throw new Error(identityTransportError);const jar=await cookies(),old=jar.get('firstbell-identity')?.value;if(old)revokeIdentitySession(db(),old);const token=createIdentitySession(db(),account);jar.set('firstbell-identity',token,{httpOnly:true,sameSite:'lax',secure:identityCookieSecure(request),path:'/',maxAge:90*86400});}
export async function clearIdentitySession(){const jar=await cookies(),token=jar.get('firstbell-identity')?.value;if(token)revokeIdentitySession(db(),token);jar.delete('firstbell-identity');jar.delete('firstbell-paper');}
export function ownedBellIds(owner:string){return db().prepare("SELECT id FROM bells WHERE owner=?").all(owner).map(row=>String(row.id));}
export function publishBell(input:BellInput,id:string,owner:string,expectedVersion:number){
 const database=db();database.exec("BEGIN IMMEDIATE");try{const row=database.prepare("SELECT owner,definition FROM bells WHERE id=?").get(id);if(!row||row.owner!==owner)throw new Error("Only the creator can publish this Flow.");const current:Flow=JSON.parse(String(row.definition));if(current.version!==expectedVersion)throw new Error("This Flow has changed. Reload before publishing.");
  const {forkedFromId:_parent,...clean}=input;const definition=makeBell({...clean,...(current.forkedFromId?{forkedFromId:current.forkedFromId}:{})},id);definition.version=current.version+1;definition.createdAt=current.createdAt;definition.forkedFromVersion=current.forkedFromVersion;definition.creatorWallet=current.creatorWallet??linkedWallet(owner);
  database.prepare("INSERT OR IGNORE INTO bell_versions(bell_id,version,definition) VALUES (?,?,?)").run(id,current.version,JSON.stringify(current));database.prepare("UPDATE bells SET definition=? WHERE id=? AND owner=?").run(JSON.stringify(definition),id,owner);database.exec("COMMIT");return definition;
 }catch(error){database.exec("ROLLBACK");throw error;}
}
export function linkedWallet(id:string){const row=db().prepare("SELECT wallet FROM wallet_accounts WHERE account_id=?").get(id);return row?String(row.wallet):undefined;}
export function saveLoginChallenge(id:string,challenge:LoginChallenge){db().prepare("INSERT INTO login_challenges(account_id,challenge) VALUES (?,?) ON CONFLICT(account_id) DO UPDATE SET challenge=excluded.challenge").run(id,JSON.stringify(challenge));}
export function readLoginChallenge(id:string):LoginChallenge|undefined{const row=db().prepare("SELECT challenge FROM login_challenges WHERE account_id=?").get(id);return row?JSON.parse(String(row.challenge)):undefined;}
export function consumeLogin(id:string,challenge:LoginChallenge){
 const database=db();database.exec("BEGIN IMMEDIATE");try{
  const active=readLoginChallenge(id);if(!active||active.message!==challenge.message||Date.parse(active.expiresAt)<=Date.now())throw new Error("Sign-in expired or already used. Connect again.");
  const wallet=challenge.address.toLowerCase(),saved=database.prepare("SELECT account_id FROM wallet_accounts WHERE wallet=?").get(wallet);let restored=id;
  if(saved)restored=String(saved.account_id);else {if(linkedWallet(id))throw new Error("Sign out before linking a different wallet.");database.prepare("INSERT INTO wallet_accounts(wallet,account_id) VALUES (?,?)").run(wallet,id);}
  database.prepare("DELETE FROM login_challenges WHERE account_id=?").run(id);database.exec("COMMIT");return restored;
 }catch(error){database.exec("ROLLBACK");throw error;}
}
export function bellHistory(id:string):Flow[]{const latest=getBell(id);return [...db().prepare("SELECT definition FROM bell_versions WHERE bell_id=? ORDER BY version DESC").all(id).map(row=>JSON.parse(String(row.definition)) as Flow),...(latest?[latest]:[])].sort((a,b)=>b.version-a.version);}



