// Execute a bounded, genuine, read-only Riley engineering work unit in
// isolated GitHub Actions. Not an eight-hour shift or original-job execution.
import {mkdirSync,writeFileSync} from 'node:fs';
import {auditRealityEngineeringIssue,verifyRileyAuditReceipt}
 from '../src/reality-riley-engineering-pilot-v1.js';
const err=code=>{throw Error('RILEY_PILOT_'+code)};
if(process.env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 process.env.GITHUB_REF!=='refs/heads/fix/reality-chat-fullscreen-verified-cycle-20261105'||
 process.env.GITHUB_EVENT_NAME!=='push'||
 !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||'')||
 !/^[1-9]\d{0,15}$/.test(process.env.GITHUB_RUN_ID||''))
 err('SIGNED_PREVIEW_SOURCE_REQUIRED');
const issue=Number(process.env.RILEY_SOURCE_ISSUE);
if(!Number.isSafeInteger(issue)||issue<1||issue>100000)
 err('TRACKED_ISSUE_REQUIRED');
const evidence=await auditRealityEngineeringIssue({
 issueNumber:issue,
 workflowName:process.env.RILEY_TARGET_WORKFLOW_NAME,
 sourceCommitSha:process.env.GITHUB_SHA,
 sourceRunId:Number(process.env.GITHUB_RUN_ID),
 token:process.env.GITHUB_TOKEN
});
verifyRileyAuditReceipt(evidence);
mkdirSync('riley-pilot-evidence',{recursive:true});
writeFileSync('riley-pilot-evidence/investigation.json',
 JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
console.log('RILEY_REAL_PROVIDER_INVESTIGATION',JSON.stringify({
 finding:evidence.finding,issue:evidence.issue_url,
 current_unreproduced_failures:evidence.fresh_failure_count,
 total_sample:evidence.workflow_runs_observed,
 provider_coverage_limited:evidence.workflow_runs_scan_limited,
 proof_sha256:evidence.evidence_sha256,
 original_job_completed:false,model_generated:false,
 production_changed:false
}));
