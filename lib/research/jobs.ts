import "server-only";
import {paperDatabase} from "../paper/store";
import {ResearchJobStore} from "./job-store";
export const researchJobs=()=>new ResearchJobStore(paperDatabase());
