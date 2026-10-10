export function toUnits(value:string,decimals:number):bigint {
  if(!Number.isInteger(decimals)||decimals<0||decimals>255||!/^\d+(\.\d+)?$/.test(value)||value.length>100)throw new Error("Invalid amount");
  const [whole,fraction=""]=value.split(".");
  if(fraction.length>decimals)throw new Error("Too many decimal places");
  return BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,"0")||"0");
}
export function fromUnits(value:bigint,decimals:number):string {
  if(value<0n||!Number.isInteger(decimals)||decimals<0||decimals>255)throw new Error("Invalid units");
  if(decimals===0)return value.toString();
  const digits=value.toString().padStart(decimals+1,"0");
  const tail=digits.slice(-decimals).replace(/0+$/,"");
  return digits.slice(0,-decimals)+(tail?"."+tail:"");
}
export function shareExposure(tokenAmount:bigint,tokenDecimals:number,ratio:string):string {
  const scale=ratio.split(".")[1]?.length??0;
  return fromUnits(tokenAmount*toUnits(ratio,scale),tokenDecimals+scale);
}
