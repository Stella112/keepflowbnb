import {Navigation} from "../../../navigation";
import {QrPhone} from "./view";
export default async function PhoneLogin({params}:{params:Promise<{id:string}>}){return <main><Navigation/><div className="hero compact"><p className="eyebrow">Phone approval</p><h1>Log in on your computer.</h1><p className="intro">Sign in on this phone, check the code, then approve the computer you scanned.</p></div><QrPhone id={(await params).id}/></main>;}
