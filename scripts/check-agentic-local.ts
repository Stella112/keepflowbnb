import {projectLocalRunner} from '../lib/agents/operator-status.ts';
const runner=projectLocalRunner(process.cwd());
try{const result=JSON.parse(await runner('WALLET_STATUS'));const state=result?.data?.status;if(result.success!==true||!['UNCONNECTED','CREATING','CONNECTED'].includes(state))throw Error();console.log(JSON.stringify({package:'@binance/agentic-wallet',version:'1.10.0',status:state,signingEnabled:false}));}catch{console.log(JSON.stringify({package:'@binance/agentic-wallet',version:'1.10.0',status:'UNAVAILABLE',signingEnabled:false}));process.exitCode=1;}
