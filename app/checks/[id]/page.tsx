import {Navigation} from "../../navigation";
import {ReceiptView} from "./view";
export default async function CheckPage({params}:{params:Promise<{id:string}>}){return <main><Navigation/><section className="hero compact"><p className="eyebrow">A saved check, not a purchase</p><h1>Your Flow check.</h1></section><ReceiptView id={(await params).id}/></main>;}
