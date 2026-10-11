import Link from "next/link";
import {PRODUCT_NAME} from "../lib/brand";
import {connection} from "next/server";
import {liveTradingEnabled} from "../lib/mode";
const primary:[string,string][]=[["/buy","Buy"],["/#stocks","Stocks"],["/bells","Flows"],["/portfolio","Portfolio"],["/autopilot","Autopilot"],["/assistant","Build with AI"]];
const more:[string,string,string][]=[["/create","Create a Flow","Build and share your own portfolio"],["/my-bells","My Flows","Flows you created or forked"],["/rules","My rules","Limits that protect every purchase"],["/agent","Research","Company facts and paid analyst reports"],["/portfolio?mode=paper","Paper trading","Practice with virtual dollars"],["/activity","Activity","Every purchase, check and receipt"]];
export async function Navigation({mode="mainnet"}:{mode?:"mainnet"|"paper"}={}){
 await connection();
 const badge=mode==="paper"?"Paper mode":liveTradingEnabled()?"BNB Chain · Mainnet":"BNB Chain · Checks only";
 return <header className="site-header"><div className="site-header-inner">
  <Link className="brand" href="/" aria-label={`${PRODUCT_NAME} home`}><img className="brand-mark" src="/icon.svg" alt="" width={32} height={32}/>{PRODUCT_NAME}</Link>
  <nav className="site-nav" aria-label="Main navigation">{primary.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}
   <details className="nav-more"><summary>More</summary><div className="nav-menu">{more.map(([href,label,hint])=><Link key={href} href={href}><strong>{label}</strong><span>{hint}</span></Link>)}</div></details></nav>
  <div className="site-actions"><span className={mode==="paper"?"badge":"badge live"}>{badge}</span><Link className="button small" href="/account">Account</Link></div>
 </div></header>;
}
