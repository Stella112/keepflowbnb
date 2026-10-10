import {readBoundedJson} from "../request-body.ts";
export async function readBellBody(request:Request):Promise<unknown>{return readBoundedJson(request,4096);}
