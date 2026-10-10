export type QrStatus="PENDING"|"APPROVED"|"CONSUMED"|"CANCELLED";
export type QrRequest={id:string;desktop:string;status:QrStatus;phoneAccount:string|null;code:string;origin:string;expiresAt:number};
export function qrStatus(request:QrRequest,now=Date.now()){return request.expiresAt<=now?"EXPIRED":request.status;}
export function canApproveQr(request:QrRequest,phone:string,code:string,now=Date.now()){
 return qrStatus(request,now)!=="EXPIRED"&&request.code===code&&(request.status==="PENDING"||(request.status==="APPROVED"&&request.phoneAccount===phone));
}
export function canFinishQr(request:QrRequest,desktop:string,now=Date.now()){
 return qrStatus(request,now)==="APPROVED"&&request.desktop===desktop&&request.phoneAccount!==null;
}
