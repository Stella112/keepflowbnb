import {BellFollow} from "../bell-follow";
import {Navigation} from "../navigation";
import {MyBells} from "./view";
export default function MyBellsPage(){return <main><Navigation/><div className="hero compact"><p className="eyebrow">Your strategies</p><h1>My Flows.</h1><p className="intro">Manage the portfolios you created or forked. Publish new versions, share your strategy, and keep followers in control of their own decisions.</p></div><MyBells/><BellFollow/></main>;}
