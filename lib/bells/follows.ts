import "server-only";
import {paperDatabase,getBell,readAccount} from "../paper/store";
import {BellFollowStore} from "./follows-core";
export const bellFollows=()=>new BellFollowStore(paperDatabase(),getBell);
export const listBellFollows=(owner:string)=>bellFollows().list(owner,readAccount(owner).policy);
