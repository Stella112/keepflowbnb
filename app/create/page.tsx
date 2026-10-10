import {Navigation} from "../navigation";
import {getBell,existingAccountId,ownedBellIds} from "../../lib/paper/store";
import {notFound} from "next/navigation";
import {BellEditor} from "./editor";
export const dynamic="force-dynamic";
export default async function Create({searchParams}:{searchParams:Promise<{fork?:string;edit?:string}>}){const {fork,edit}=await searchParams;const original=edit?getBell(edit):fork?getBell(fork):undefined;if(edit){const owner=await existingAccountId();if(!owner||!ownedBellIds(owner).includes(edit)||!original)notFound();}return <main><Navigation/><section className="hero compact"><p className="eyebrow">Your idea. Your definition.</p><h1>{edit?"Publish a new strategy.":original?"Make it your own.":"Create a Flow."}</h1><p className="intro">Choose your companies and weights. Include a virtual cash reserve. Every Flow is a shareable definition for paper investing.</p></section><BellEditor original={original} editing={Boolean(edit)}/></main>;}
