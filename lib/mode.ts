import "server-only";
export function liveTradingEnabled(){return process.env.MAINNET_WRITE_ENABLED==="true"&&process.env.EXECUTION_MODE==="MAINNET";}
export function liveTradeCapUsd(){const cap=process.env.LIVE_MAX_TRADE_USD??"5";return /^\d+(\.\d{1,6})?$/.test(cap)?cap:"5";}
