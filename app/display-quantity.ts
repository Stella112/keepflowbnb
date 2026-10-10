// Display only. Quotes, policy calculations and persisted receipts retain full precision.
export function displayQuantity(value:string){
 const [whole,fraction=""]=value.split(".");const short=fraction.slice(0,6).replace(/0+$/,"");
 if(/^0+$/.test(whole)&&!/[1-9]/.test(short)&&/[1-9]/.test(fraction))return "<0.000001";
 return whole+(short?"."+short:"");
}
