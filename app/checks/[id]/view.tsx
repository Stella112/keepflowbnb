"use client";
import {useCheckReceipt,CheckResult} from "../../bell-check";
export function ReceiptView({id}:{id:string}){const {receipt,error}=useCheckReceipt(undefined,id);return <section>{error?<p role="alert" className="error">{error}</p>:receipt?<CheckResult receipt={receipt}/>:<p role="status">Loading the saved check…</p>}</section>;}
