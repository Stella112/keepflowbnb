import {z} from "zod";
import {bellInputSchema,type BellInput} from "../paper/model.ts";
import {curatedTickers} from "../binance/rwa-schemas.ts";

export const draftRequestSchema=z.object({prompt:z.string().trim().min(5).max(1000)}).strict();
const aliases:Record<string,string>={NVIDIA:"NVDA",APPLE:"AAPL",MICROSOFT:"MSFT",GOOGLE:"GOOGL",ALPHABET:"GOOGL",AMAZON:"AMZN",TESLA:"TSLA"};
const percent="(\\d+(?:\\.\\d{1,2})?)\\s*%";
function bps(value:string){const [whole,fraction=""]=value.split(".");const result=Number(whole)*100+Number(fraction.padEnd(2,"0"));if(result>10000)throw new Error("A percentage cannot exceed 100%.");return result;}
export type BellDraft={definition:BellInput;requestedAmountUsdt:string|null;policySuggestions:{maxSingleAssetBps:number|null;automaticSelling:false|null};method:"DETERMINISTIC_PARSER";warnings:string[]};
export function draftFromPrompt(input:unknown,supportedTickers:readonly string[]):BellDraft{
 const {prompt}=draftRequestSchema.parse(input);let text=prompt.toUpperCase();for(const [name,ticker] of Object.entries(aliases))text=text.replace(new RegExp(`\\b${name}\\b`,"g"),ticker);
 if(/\d*\.\d{3,}\s*%/.test(text))throw new Error('Use percentage tokens with at most two decimal places; excessive precision is not rounded or partially matched.');
 if(/(?:^|[^\d])\.\d+\s*%/.test(text))throw new Error('Write percentage fractions with a leading zero; partial numeric matching is not supported.');
 if(/[+\-−–]\s*\d+(?:\.\d+)?\s*%/.test(text))throw new Error("Use unsigned allocation percentages; negative or signed weights are not supported.");
 // Negation applies only to the explicit no-selling clause, never to other actions.
 const actionText=text.replace(/(?:DON'T|DO NOT|NO|NEVER)\s+(?:AUTOMATICALLY\s+)?SELL\b/g,"");
 if(/\b(?:SELL|SHORT|LEVERAGE|BORROW|TRANSFER)\b/.test(actionText))throw new Error("This draft parser only supports stock allocation instructions; it cannot execute trades.");
 const knownAssets=new Set<string>([...curatedTickers,"USDT","CASH","RESERVE"]);
 const reservedWords=new Set(["AT","KEEP","RESERVE","CASH","CAP","MAX","MAXIMUM","STOCK","HOLDING","IN","TO","AS"]);
 for(const match of text.matchAll(/\b([A-Z][A-Z0-9.]*)\s*(?:AT|:|=)?\s*\d+(?:\.\d+)?\s*%/g))if(!knownAssets.has(match[1])&&!reservedWords.has(match[1]))throw new Error(`Unknown allocated asset ${match[1]}. Use supported company names or tickers.`);
 for(const match of text.matchAll(/\d+(?:\.\d+)?\s*%\s*(?:(?:IN|TO|AS)\s+)?([A-Z][A-Z0-9.]*)\b/g))if(!knownAssets.has(match[1])&&!reservedWords.has(match[1]))throw new Error(`Unknown allocated asset ${match[1]}. Use supported company names or tickers.`);
 const tickers=curatedTickers.filter(ticker=>new RegExp(`\\b${ticker}\\b`).test(text));
 if(!tickers.length)throw new Error("Name supported companies or tickers. Themes such as ‘AI stocks’ need explicit stock choices.");
 if(tickers.some(ticker=>!supportedTickers.includes(ticker)))throw new Error("A requested stock is absent from current Binance discovery. Choose a currently supported ticker.");
 const reserveMatches=[...text.matchAll(new RegExp(`(?:KEEP|RESERVE|CASH)\\s*${percent}(?:\\s*(?:IN|AS))?\\s*(?:USDT|CASH|RESERVE)?`,"g")),...text.matchAll(new RegExp(`${percent}\\s*(?:USDT|CASH|RESERVE)`,"g"))];
 const reserves=[...new Set(reserveMatches.map(match=>bps(match[1])))];if(reserves.length>1)throw new Error("Conflicting cash reserves. State one reserve percentage.");
 const reserveBps=reserves[0]??1000;const warnings:string[]=[];if(!reserves.length)warnings.push("No reserve specified: draft proposes 10% cash. Review before saving.");
 const weights=tickers.map(ticker=>{const matches=[...text.matchAll(new RegExp(`\\b${ticker}\\s*(?:AT|:|=)?\\s*${percent}`,"g")),...text.matchAll(new RegExp(`${percent}\\s*(?:IN|TO)?\\s*\\b${ticker}\\b`,"g"))];const values=[...new Set(matches.map(match=>bps(match[1])))];if(values.length>1)throw new Error(`Conflicting weights for ${ticker}.`);return {ticker,weightBps:values[0]??0};});
 if(weights.some(asset=>!asset.weightBps)){if(!/\b(?:EQUAL|EQUALLY)\b/.test(text)||weights.some(asset=>asset.weightBps))throw new Error("State a percentage for every company, or request equal weights without individual percentages.");const available=10000-reserveBps;const each=Math.floor(available/weights.length);weights.forEach((asset,index)=>asset.weightBps=each+(index<available%weights.length?1:0));}
 const capMatches=[...text.matchAll(new RegExp(`(?:CAP|MAXIMUM|MAX)\\s+(?:ONE\\s+STOCK|SINGLE\\s+(?:STOCK|HOLDING))\\s*(?:AT|:)?\\s*${percent}`,'g'))];
 if(capMatches.length>1)throw new Error('Specify one single-stock cap; repeated or conflicting caps are ambiguous.');
 const cap=capMatches.length?bps(capMatches[0][1]):null;
 if(cap!==null&&weights.some(asset=>asset.weightBps>cap))throw new Error("Draft allocations exceed your requested single-stock cap. Adjust the weights.");
 const definition=bellInputSchema.parse({title:`${tickers.join(" / ")} Flow`.slice(0,80),description:prompt.slice(0,500),assets:weights,reserveBps});
 const amount=text.match(/\b(\d+(?:\.\d{1,6})?)\s+USDT\b/);
 return {definition,requestedAmountUsdt:amount?.[1]??null,policySuggestions:{maxSingleAssetBps:cap,automaticSelling:/(?:DON'T|DO NOT|NO|NEVER)\s+(?:AUTOMATICALLY\s+)?SELL/.test(text)?false:null},method:"DETERMINISTIC_PARSER",warnings:[...warnings,"Policy suggestions are unsaved. This draft grants no trading or automation permission."]};
}
