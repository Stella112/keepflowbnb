import {createHash} from "node:crypto";
import {bellInputSchema,type Flow} from "../paper/model.ts";

export function canonicalJson(value:unknown):string{
 if(value===null||typeof value!=="object")return JSON.stringify(value);
 if(Array.isArray(value))return `[${value.map(canonicalJson).join(",")}]`;
 const object=value as Record<string,unknown>;
 return `{${Object.keys(object).filter(key=>object[key]!==undefined).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
}
export function bellManifest(bell:Flow){
 bellInputSchema.parse({title:bell.title,description:bell.description,assets:bell.assets,reserveBps:bell.reserveBps,...(bell.policy?{policy:bell.policy}:{}),...(bell.forkedFromId?{forkedFromId:bell.forkedFromId}:{})});
 if(!Number.isSafeInteger(bell.version)||bell.version<1||!Number.isFinite(Date.parse(bell.createdAt)))throw new Error("Invalid published Flow.");
 const definition={schemaVersion:1 as const,id:bell.id,slug:bell.slug??bell.id,version:bell.version,name:bell.title,description:bell.description,visibility:"PUBLIC" as const,creatorAddress:bell.creatorWallet??null,assets:bell.assets.map(asset=>({...asset})),reserve:{asset:"USDT_RESERVE",weightBps:bell.reserveBps},policy:{chainId:56,spotOnly:true,contributionFirst:true,allowAutomaticSelling:false,...(bell.policy??{})},automation:{defaultEnabled:false,requiresPersonalAuthorization:true},source:bell.forkedFromId?{bellId:bell.forkedFromId,version:bell.forkedFromVersion??null}:null,createdAt:bell.createdAt,publishedAt:bell.publishedAt??null,storedDefinitionHash:bell.contentHash};
 const manifestHash=createHash("sha256").update(canonicalJson(definition)).digest("hex");
 return {...definition,manifestHash,integrity:{algorithm:"SHA-256",serialization:"sorted-object-keys-json",onchainRecorded:false,notes:"Legacy definitions do not record publication time or source version. Null fields represent unavailable provenance, not guessed values."}};
}


