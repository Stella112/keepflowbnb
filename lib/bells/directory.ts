import type {Flow} from "../paper/model.ts";

/** Flows created by automated acceptance runs (QA accounts, 2026-10-07 to 10-10). They stay
 * stored and reachable by link; they are only kept out of the public directory. */
const acceptanceFlowIds=new Set([
 "e62ba472-1c37-4cd6-b99c-d4b8cb16bb37","97e7bd13-4ad3-4a37-9d9b-b732a0ceed6f","0b9ebbd2-29ae-4030-99e5-7d600e50016c",
 "d9292454-e4cd-4e05-8069-a72575aae96d","58b4499a-e8d5-474e-a625-e8fa4163d097","90dd500b-377a-4ade-a670-aa0d6adcc8e1",
 "4e220431-fb6c-495c-9904-906d06b7304a","57640373-de3b-43b6-9377-ff6ebcb25a6b","923e9ae3-0599-46ec-a541-e6877961a754",
 "12c622c8-f224-4b89-878c-fdaa7ee892a6",
]);
export const directoryFlows=(flows:Flow[])=>flows.filter(flow=>!acceptanceFlowIds.has(flow.id));
