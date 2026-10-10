import {Navigation} from "../navigation";
import {AgentView} from "./view";
import {AutomationControls} from "./automation-controls";
import {WalletContributionPlanner} from "./wallet-plan";
export default async function Autopilot({searchParams}:{searchParams:Promise<{bell?:string}>}){const {bell}=await searchParams;return <main><Navigation/><section className="hero compact"><p className="eyebrow">Your portfolio. Your rules.</p><h1>Put your Flow<br/>on autopilot.</h1><p className="intro">A paper investing agent that contributes on schedule, puts new virtual money into underweight holdings, and explains every decision.</p></section><AgentView preferredBell={bell}/><WalletContributionPlanner preferredBell={bell}/><AutomationControls/></main>;}
