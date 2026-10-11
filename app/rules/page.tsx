import {Navigation} from "../navigation";
import {RulesView} from "./view";
export const metadata={title:"My rules | KeepFlow"};
export default function RulesPage(){return <main><Navigation/><section className="hero compact"><p className="eyebrow">Personal rules</p><h1>Your money, your rules.</h1><p className="intro">Set the limits every purchase must pass before your wallet is ever asked to confirm it.</p></section><RulesView/></main>;}
