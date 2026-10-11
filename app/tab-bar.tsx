"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
// Phone navigation: five destinations with icons and labels, fixed to the bottom of the screen.
const icon={
 home:<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>,
 stocks:<path d="M4 18 9.5 12l3.5 3.5L20 8M15 8h5v5"/>,
 flows:<><circle cx="12" cy="12" r="8"/><path d="M12 4v8l6 4"/></>,
 portfolio:<><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5h6v2M4 12h16"/></>,
 ai:<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/>,
};
const tabs:[string,string,keyof typeof icon][]=[["/","Home","home"],["/stocks","Stocks","stocks"],["/bells","Flows","flows"],["/portfolio","Portfolio","portfolio"],["/assistant","AI","ai"]];
export function TabBar(){
 const path=usePathname()??"/";
 const active=(href:string)=>href==="/"?path==="/":href==="/bells"?path.startsWith("/bells")||path.startsWith("/b/"):href==="/stocks"?path.startsWith("/stocks")||path.startsWith("/s/")||path==="/buy":path.startsWith(href);
 return <nav className="tab-bar" aria-label="Primary">{tabs.map(([href,label,key])=><Link key={href} href={href} aria-current={active(href)?"page":undefined}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon[key]}</svg><span>{label}</span></Link>)}</nav>;
}
