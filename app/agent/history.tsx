"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {z} from 'zod';
type Summary={id:string;status:string;createdAt:string;bell:{id:string;version:number};policyVersion:number};
const responseSchema=z.object({reviews:z.array(z.object({id:z.string().uuid(),status:z.enum(['PENDING','RUNNING','COMPLETE','FAILED','CANCELLED']),createdAt:z.string().datetime(),bell:z.object({id:z.string().min(1).max(80),version:z.number().int().positive()}),policyVersion:z.number().int().nonnegative()})).max(50)});
export function ReviewHistory({revision}:{revision?:string}){
 const [rows,setRows]=useState<Summary[]>([]),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(false);
 useEffect(()=>{const pending=new AbortController();setBusy(true);setError('');fetch('/api/agent/reviews',{cache:'no-store',signal:pending.signal}).then(async response=>{if(!response.ok)throw Error(response.status===401?'Sign in to view your private review history.':'Private review history is unavailable. Try refreshing.');const body=responseSchema.parse(await response.json());if(!pending.signal.aborted)setRows(body.reviews);}).catch(problem=>{if(!pending.signal.aborted){setRows([]);setError(problem instanceof z.ZodError?'Private review history could not be verified. Try refreshing.':problem.message);}}).finally(()=>{if(!pending.signal.aborted)setBusy(false);});return()=>pending.abort();},[revision,refresh]);
 return <section><h2>Your recent reviews</h2><p className="fine-print">Your latest 50 private tasks. Open a review to reload its status or read its captured report.</p><button className="quiet" disabled={busy} onClick={()=>setRefresh(value=>value+1)}>{busy?'Loading history…':'Refresh review history'}</button>{error&&<p className="fine-print" role="status">{error}</p>}{!error&&!busy&&!rows.length&&<p>No private reviews yet.</p>}<ul>{rows.map(row=><li key={row.id}><Link href={`/agent?review=${row.id}`}>{row.bell.id} · version {row.bell.version} · {row.status}</Link><p className="fine-print">{new Date(row.createdAt).toLocaleString()} · personal policy version {row.policyVersion}</p></li>)}</ul></section>;
}
