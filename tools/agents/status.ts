import {agenticWalletOperatorStatus,agentStudioVersion} from "../../lib/agents/operator-status.ts";
// Operator-only command, no HTTP server and no arbitrary user arguments.
if(process.argv.length>2)throw new Error("This diagnostic accepts no command arguments.");
const operator=process.env.FIRSTBELL_AGENT_OPERATOR_ID??"";
const binding={operatorId:operator,requesterId:operator,wallet:process.env.FIRSTBELL_AGENT_OPERATOR_WALLET??"",authorization:"OPERATOR_READ_ONLY"};
console.log(JSON.stringify({agenticWallet:await agenticWalletOperatorStatus(binding),agentStudio:await agentStudioVersion()},null,2));
