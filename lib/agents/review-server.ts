import 'server-only';
import {cookies} from 'next/headers';
import {createHash} from 'node:crypto';
import {paperDatabase,existingAccountId,linkedWallet} from '../paper/store';
import {AgentReviewStore} from './review-store';
import {buildBellReview} from './review-report';
import {getStockBrief} from '../research/brief-server';
export function reviewStore(){const db=paperDatabase();return new AgentReviewStore(db,(owner,grant)=>!!db.prepare('SELECT account_id FROM identity_sessions WHERE token_hash=? AND account_id=? AND revoked=0 AND expires_at>?').get(grant,owner,Date.now()));}
export async function reviewIdentity(){const owner=await existingAccountId(),token=(await cookies()).get('firstbell-identity')?.value;if(!owner||!linkedWallet(owner)||!token||!/^[a-f0-9]{64}$/.test(token))return;return {owner,grant:createHash('sha256').update(token).digest('hex')};}
export async function runBellReview(owner:string,id:string){const store=reviewStore(),work=store.claim(owner,id);if(!work)return;try{const briefs=[];for(const asset of work.bell.assets){if(!store.valid(work))return;briefs.push(await getStockBrief(asset.ticker));}if(store.valid(work))store.finish(work,buildBellReview(work.bell,work.policy,work.job.policyVersion,briefs));}catch{store.finish(work);}}
