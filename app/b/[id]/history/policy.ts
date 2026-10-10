export function policyValue(field:string,value:unknown){
 if(value===undefined||value===null)return "No extra Flow rule";
 if(field.endsWith("Usd"))return `$${value}`;
 if(field.endsWith("Bps"))return `${Number(value)/100}%`;
 if(field.endsWith("Seconds"))return `${value} seconds`;
 if(typeof value==="boolean")return value?"On":"Off";
 return String(value);
}
export const policyNames:Record<string,string>={maxTradeUsd:"Maximum trade",maxDailySpendUsd:"Daily spending cap",maxWeeklySpendUsd:"Weekly spending cap",maxSingleAssetBps:"Single-company cap",minReserveBps:"Minimum reserve",maxSlippageBps:"Slippage cap",quoteMaxAgeSeconds:"Quote freshness",priceMaxAgeSeconds:"Price freshness",allowAutomaticSelling:"Automatic selling",contributionFirst:"Contribution first"};
