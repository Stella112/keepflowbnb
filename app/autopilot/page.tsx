import {Navigation} from "../navigation";
import {AgentView} from "./view";
import {AutomationControls} from "./automation-controls";
import {WalletContributionPlanner} from "./wallet-plan";
import {AgenticLive} from "./agentic-live";
export default async function Autopilot({searchParams}:{searchParams:Promise<{bell?:string}>}){const {bell}=await searchParams;return <main><Navigation/><section className="hero compact"><p className="eyebrow">Your portfolio. Your rules.</p><h1>Put your Flow<br/>on autopilot.</h1><p className="intro">Your agent contributes on schedule, sends new money to underweight holdings first and explains every decision. Live contributions run through a Binance Agentic Wallet under your app limits; you can also run it in paper mode.</p></section><AgenticLive/><AgentView preferredBell={bell}/><WalletContributionPlanner preferredBell={bell}/><AutomationControls/></main>;}
