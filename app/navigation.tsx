import Link from "next/link";
import {PRODUCT_NAME} from "../lib/brand";
import {connection} from "next/server";
import {liveTradingEnabled} from "../lib/mode";
import {existingAccountId,linkedWallet} from "../lib/paper/store";
import {TabBar} from "./tab-bar";
const primary:[string,string][]=[["/stocks","Stocks"],["/bells","Flows"],["/portfolio","Portfolio"],["/assistant","Build with AI"]];
const more:[string,string,string][]=[["/buy","Buy your first stock","A guided first purchase"],["/create","Create a Flow","Build and share your own portfolio"],["/my-bells","My Flows","Flows you created or forked"],["/rules","My rules","Limits that protect every purchase"],["/autopilot","Autopilot","Scheduled contributions under your rules"],["/activity","Activity","Every purchase, check and receipt"],["/agent","Research","Company facts and analyst reports"],["/portfolio?mode=paper","Paper trading","Practice with virtual dollars"]];
export async function Navigation({mode="mainnet"}:{mode?:"mainnet"|"paper"}={}){
 await connection();
 const badge=mode==="paper"?"Paper trading":liveTradingEnabled()?"BNB Chain · Mainnet":"BNB Chain · Checks only";
 const owner=await existingAccountId().catch(()=>undefined),wallet=owner?linkedWallet(owner):undefined;
 return <><header className="site-header"><div className="site-header-inner">
  <Link className="brand" href="/" aria-label={`${PRODUCT_NAME} home`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="brand-mark" src="/icon.svg" alt="" width={32} height={32}/>{PRODUCT_NAME}</Link>
  <nav className="site-nav" aria-label="Main navigation">{primary.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}
   <details className="nav-more"><summary>More</summary><div className="nav-menu">{more.map(([href,label,hint])=><Link key={href} href={href}><strong>{label}</strong><span>{hint}</span></Link>)}</div></details></nav>
  <div className="site-actions"><span className={mode==="paper"?"badge":"badge live"}>{badge}</span><Link className="button small" href="/account">{wallet?`${wallet.slice(0,6)}…${wallet.slice(-4)}`:"Connect wallet"}</Link></div>
 </div></header>
 <TabBar/></>;
}
