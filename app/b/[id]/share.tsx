import {ShareLink} from "../../share-link";
import {publicShareUrl} from "../../../lib/share-url";
export function ShareBell({id}:{id:string}){return <><ShareLink url={publicShareUrl(process.env.FIRSTBELL_PUBLIC_URL,`/b/${id}`)} label="this Flow"/><a className="quiet" href={`/api/bells/${encodeURIComponent(id)}/manifest`}>Download Flow definition ↗</a></>;}
