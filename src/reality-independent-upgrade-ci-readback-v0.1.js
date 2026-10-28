// Trusted, READ-ONLY CI gate after a governed Reality extension draft PR.
// No model/browser-provided status can grant promotion. This service confirms
// exact GitHub source commit, draft PR, and named required workflow run IDs.
// An actual deployment/merge, capability registration and job resumption
// require later independent, separate owner-authorized stages.
export const INDEPENDENT_UPGRADE_CI_GATE_VERSION='reality-independent-upgrade-ci-readback-v0.1';
const REPO='maloney2323/Reality',ROOT='https://api.github.com/repos/'+REPO;
const BASE='experiment/reality-live-durable-adversarial-20261025';
const BRANCH=/^reality\\/build\\/build-[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const REQUIRED=Object.freeze([
 'Governed Autonomous Self-Upgrading Provider v0.1',
 'Reality Governed Execution Engine v0.1',
]);
const fail=code=>{throw Error(code)};
async function readJson(fetchImpl,path){
 const response=await fetchImpl(ROOT+path,{
  method:'GET',redirect:'error',
  headers:{Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28',
   'User-Agent':'Reality-Independent-Upgrade-CI-Gate'},
 });
 if(!response?.ok)fail('UPGRADE_CI_PROVIDER_READBACK_UNAVAILABLE');
 const data=await response.json();
 if(!data||typeof data!=='object'||Array.isArray(data))
  fail('UPGRADE_CI_PROVIDER_RESPONSE_INVALID');
 return data;
}
export async function verifyIndependentUpgradeDraftCI({
 originalWorkId,prNumber,expectedHeadSha,expectedBranch,
 pinnedBaseSha,requiredRunIds,fetchImpl=fetch,
}={}){
 if(!WORK.test(String(originalWorkId||''))||
    !Number.isSafeInteger(prNumber)||prNumber<1||
    !SHA.test(String(expectedHeadSha||''))||
    !SHA.test(String(pinnedBaseSha||''))||
    !BRANCH.test(String(expectedBranch||''))||
    !Array.isArray(requiredRunIds)||requiredRunIds.length!==REQUIRED.length||
    requiredRunIds.some(id=>!Number.isSafeInteger(id)||id<1)||
    new Set(requiredRunIds).size!==REQUIRED.length)
  fail('UPGRADE_CI_TRUSTED_EXACT_PR_AND_RUN_SCOPE_REQUIRED');
 if(typeof fetchImpl!=='function')
  fail('UPGRADE_CI_PROVIDER_READER_REQUIRED');
 const pr=await readJson(fetchImpl,'/pulls/'+prNumber);
 if(pr.number!==prNumber||pr.state!=='open'||pr.draft!==true||
    pr.merged!==false||
    pr.html_url!=='https://github.com/'+REPO+'/pull/'+prNumber||
    pr.head?.repo?.full_name!==REPO||
    pr.head.ref!==expectedBranch||
    pr.head.sha!==expectedHeadSha||
    pr.base?.repo?.full_name!==REPO||
    pr.base.ref!==BASE||
    pr.base.sha!==pinnedBaseSha)
  fail('UPGRADE_CI_DRAFT_PR_CHANGED_OR_UNVERIFIED');
 const prCreatedAt=Date.parse(pr.created_at);
 if(!Number.isFinite(prCreatedAt))
  fail('UPGRADE_CI_DRAFT_PR_TIMESTAMP_UNVERIFIED');
 const verified=[];
 const missing=new Set(REQUIRED);
 for(const runId of requiredRunIds){
  const run=await readJson(fetchImpl,'/actions/runs/'+runId);
  const createdAt=Date.parse(run.created_at);
  if(run.id!==runId||
     run.repository?.full_name!==REPO||
     run.head_repository?.full_name!==REPO||
     run.head_sha!==expectedHeadSha||
     run.head_branch!==expectedBranch||
     run.status!=='completed'||run.conclusion!=='success'||
     run.event!=='pull_request'||
     !Number.isSafeInteger(run.workflow_id)||run.workflow_id<1||
     !Number.isFinite(createdAt)||createdAt<prCreatedAt||
     run.html_url!=='https://github.com/'+REPO+'/actions/runs/'+runId||
     !missing.has(run.name))
   fail('UPGRADE_CI_RUN_NOT_EXACT_GREEN_PR_COMMIT');
  missing.delete(run.name);
  verified.push(Object.freeze({
   workflow_name:run.name,workflow_id:run.workflow_id,
   run_id:runId,run_url:run.html_url,head_sha:run.head_sha,
  }));
 }
 if(missing.size)fail('UPGRADE_CI_REQUIRED_INDEPENDENT_CHECK_NOT_SEEN');
 return Object.freeze({
  version:INDEPENDENT_UPGRADE_CI_GATE_VERSION,
  state:'EXACT_DRAFT_PR_CI_VERIFIED_PROMOTION_STILL_BLOCKED',
  original_work_id:originalWorkId,
  pull_request_number:prNumber,
  pull_request_url:pr.html_url,
  tested_head_sha:expectedHeadSha,
  pinned_base_sha:pinnedBaseSha,
  required_workflows:verified,
  independent_github_readback:true,
  separate_promotion_approval_required:true,
  promotion_authorized:false,
  capability_installed:false,
  original_job_resumed:false,
  original_job_completed:false,
  github_write_performed:false,
 });
}
