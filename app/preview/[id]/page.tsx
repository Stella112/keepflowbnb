import {Navigation} from "../../navigation";
import {PreviewView} from "./view";
export default async function PreviewPage({params}:{params:Promise<{id:string}>}){return <main><Navigation/><PreviewView id={(await params).id}/></main>;}
