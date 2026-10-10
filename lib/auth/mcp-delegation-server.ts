import 'server-only';
import {paperDatabase,linkedWallet} from '../paper/store';
import {McpDelegationStore} from './mcp-delegation-core';
export const mcpDelegations=()=>new McpDelegationStore(paperDatabase(),owner=>!!linkedWallet(owner));
