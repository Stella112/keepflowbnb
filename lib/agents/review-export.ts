import type {AgentReviewJob} from './review-store.ts';
export function exportBellReview(job:AgentReviewJob){
 if(job.status!=='COMPLETE'||!job.report||job.report.bell.id!==job.bell.id||job.report.bell.version!==job.bell.version||job.report.bell.contentHash!==job.bell.contentHash||job.report.policyVersion!==job.policyVersion||job.report.executionEnabled!==false||job.report.paymentSubmitted!==false)throw Error('VERIFIED_COMPLETED_REVIEW_REQUIRED');
 // Explicit projection excludes database/session/worker internals and future job fields.
 return {format:'FIRSTBELL_SOURCED_REVIEW_V1' as const,financialAuthority:'NONE' as const,review:{id:job.id,status:'COMPLETE' as const,createdAt:job.createdAt,finishedAt:job.finishedAt,bell:structuredClone(job.bell),policyVersion:job.policyVersion,report:structuredClone(job.report)}};
}
