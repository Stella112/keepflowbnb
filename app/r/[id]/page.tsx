import {Navigation} from "../../navigation";
import {ReceiptView} from "./view";
export default async function ReceiptPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <main><Navigation/><ReceiptView id={id}/></main>;}
