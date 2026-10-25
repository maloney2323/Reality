// Live, read-only GitHub regression evidence. Consumes provider-origin GitHub
// Actions run metadata + job logs for the SAME named test before and after.
// No mutation, model tokens, synthetic owner permission or inference of
// autonomous repair from human-authored commits.
import crypto from 'node:crypto';
export const GITHUB_REGRESSION_EVIDENCE_VERSION='reality-github-regression-evidence-v0.1';
export const FROZEN_GITHUB_CASE=Object.freeze({
 repository:'maloney2323/Reality',
 beforeRunId:40120398452,
 afterRunId:40140138344,
 testName:'real orchestration path sees prior ledger evidence and detects model contradiction via quote extraction',
});
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const now=()=>new Date().toISOString();
function abort(reason){const error=new Error(reason);error.code=reason;throw error;}
export function evaluateGithubRegressionEvidence({before,after,beforeLog,afterLog,observedAt=now()}={}){
 if(!before||!after)abort('GITHUB_RUN_METADATA_REQUIRED');
 if(before.id!==FROZEN_GITHUB_CASE.beforeRunId||after.id!==FROZEN_GITHUB_CASE.afterRunId)
   abort('GITHUB_RUN_ID_MISMATCH');
 for(const run of [before,after]){
   if(run.repository?.full_name!==FROZEN_GITHUB_CASE.repository)
     abort('GITHUB_REPOSITORY_MISMATCH');
   if(run.status!=='completed'||!['success','failure'].includes(run.conclusion))
     abort('GITHUB_RUN_UNRESOLVED');
   if(typeof run.head_sha!=='string'||!/^[a-f0-9]{40}$/.test(run.head_sha))
     abort('GITHUB_COMMIT_PROVENANCE_REQUIRED');
   if(!Number.isSafeInteger(run.workflow_id)||run.workflow_id<1)
     abort('GITHUB_WORKFLOW_ID_REQUIRED');
   if(run.event!=='pull_request'&&run.event!=='push')
     abort('GITHUB_UNEXPECTED_WORKFLOW_EVENT');
 }
 if(before.workflow_id!==after.workflow_id)abort('GITHUB_WORKFLOW_ID_CHANGED');
 if(before.conclusion!=='failure'||after.conclusion!=='success')
   abort('GITHUB_BEFORE_AFTER_RUN_NOT_RECOVERED');
 if(before.head_sha===after.head_sha)abort('GITHUB_NO_NEW_REVISION');
 if(typeof beforeLog!=='string'||typeof afterLog!=='string')
   abort('GITHUB_JOB_LOGS_REQUIRED');
 const testName=FROZEN_GITHUB_CASE.testName;
 const matchExact=(s,expected)=>{
   const lines=s.split(/\r?\n/);
   return lines.some(line=>{
     // GitHub job logs prefix each TAP line with a timestamp and "Z ".
     const m=line.match(/(?:^|\s)(not ok|ok)\s+\d+\s+-\s+(.+)\s*$/);
     return m?.[1]===expected&&m?.[2]?.trim()===testName;
   });
 };
 const beforeFailed=matchExact(beforeLog,'not ok');
 const afterPassed=matchExact(afterLog,'ok');
 if(!beforeFailed||!afterPassed)
   abort('GITHUB_IDENTICAL_TEST_BEFORE_AFTER_NOT_ATTESTED');
 const evidence={
   kind:'GITHUB_EXTERNAL_PROVIDER_REGRESSION_EVIDENCE',
   version:GITHUB_REGRESSION_EVIDENCE_VERSION,
   scope:'HISTORICAL_REAL_GITHUB_CI_NOT_AGENTIC_AUTONOMOUS_REPAIR',
   source:'GITHUB_ACTIONS_FRESH_PROVIDER_READBACK',
   observed_at:observedAt,
   repository:FROZEN_GITHUB_CASE.repository,
   workflow_id:before.workflow_id,
   exact_test_name:testName,
   before:{
     run_id:before.id,commit_sha:before.head_sha,
     workflow_conclusion:before.conclusion,target_test_result:'FAILED',
     log_sha256:sha(beforeLog),
     url:'https://github.com/'+FROZEN_GITHUB_CASE.repository+'/actions/runs/'+before.id,
   },
   after:{
     run_id:after.id,commit_sha:after.head_sha,
     workflow_conclusion:after.conclusion,target_test_result:'PASSED',
     log_sha256:sha(afterLog),
     url:'https://github.com/'+FROZEN_GITHUB_CASE.repository+'/actions/runs/'+after.id,
   },
   same_test_verification:true,
   verified_historical_regression:true,
   independently_observed_external_workflow_results:true,
   autonomously_discovered_or_repaired_by_reality:false,
   model_self_report_claims_evaluated:0,
   model_vs_reality_comparison_complete:false,
   independent_proof_of_causal_fix:false,
   number_of_measured_human_interventions:null,
   supervision_minutes_saved:null,
   actual_model_tokens:null,
   production_deployment_changed:false,
   user_business_actions_taken:0,
 };
 const receipt_hash=sha(JSON.stringify(evidence));
 return Object.freeze({...evidence,receipt_hash});
}
export async function readGithubRegressionEvidence({
 token=process.env.GITHUB_TOKEN||process.env.REALITY_GITHUB_TOKEN,
 fetchImpl=fetch,
}={}){
 if(!token||typeof token!=='string')abort('GITHUB_READ_ONLY_TOKEN_REQUIRED');
 const base='https://api.github.com/repos/'+FROZEN_GITHUB_CASE.repository;
 const hdr={
   accept:'application/vnd.github+json',authorization:'Bearer '+token,
   'x-github-api-version':'2022-11-28',
 };
 const get=async (endpoint,format='json')=>{
   const resp=await fetchImpl(base+endpoint,{method:'GET',headers:hdr,redirect:'follow'});
   if(!resp.ok)abort('GITHUB_EXTERNAL_READBACK_FAILED_'+resp.status);
   return format==='text'?resp.text():resp.json();
 };
 const run=async id=>get('/actions/runs/'+id);
 const jobs=async id=>{
   const data=await get('/actions/runs/'+id+'/jobs?per_page=50');
   const arr=data.jobs||[];
   const j=arr.find(j=>j.name==='contract-tests'&&j.status==='completed')||
     arr.find(j=>j.status==='completed'&&j.conclusion==='failure')||arr[0];
   if(!j?.id||!Number.isSafeInteger(j.id))abort('GITHUB_WORKFLOW_JOB_MISSING');
   return j;
 };
 const [before,after]=await Promise.all([
   run(FROZEN_GITHUB_CASE.beforeRunId),
   run(FROZEN_GITHUB_CASE.afterRunId),
 ]);
 // Fail before requesting logs if repository and run identity cannot match.
 if(before.id!==FROZEN_GITHUB_CASE.beforeRunId||
    after.id!==FROZEN_GITHUB_CASE.afterRunId||
    before.repository?.full_name!==FROZEN_GITHUB_CASE.repository||
    after.repository?.full_name!==FROZEN_GITHUB_CASE.repository)
    abort('GITHUB_RUN_SOURCE_MISMATCH');
 const [jobBefore,jobAfter]=await Promise.all([jobs(before.id),jobs(after.id)]);
 const logs=async jobId=>get('/actions/jobs/'+jobId+'/logs','text');
 const [beforeLog,afterLog]=await Promise.all([logs(jobBefore.id),logs(jobAfter.id)]);
 return evaluateGithubRegressionEvidence({before,after,beforeLog,afterLog});
}
