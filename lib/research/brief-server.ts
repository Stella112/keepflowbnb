import "server-only";
import {getDiscovery} from "../binance/rwa";
import {buildStockBrief} from "./brief";
export async function getStockBrief(ticker:unknown){const discovery=await getDiscovery();return buildStockBrief(ticker,discovery.tokens,discovery.fetchedAt);}
