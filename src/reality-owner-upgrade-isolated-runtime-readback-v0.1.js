// Post-merge execution proof: independently observe BOTH named push CI runs
// on the EXACT merged isolated-preview commit, including the Docker test job.
// This proves executable in the no-network isolated test runner, not that
// arbitrary generated code has been loaded into the production application.
// No GitHub writes, capability registration, or customer work effects here.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {githubGet} from './reality-connector-github-v1.0.js';
export const OWNER_UPGRADE_ISOLATED_RUNTIME_VERSION='reality-owner-upgrade-isolated-runtime-readback-v0.1';
const REPO='maloney2323/Reality',ROOT='/repos/'+REPO;
const BASE='experiment/reality-live-durable-adversarial-20261025';
const SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const REQUIRED=['Governed Autonomous Self-Upgrading Provider v0.1',
 'Reality Governed Execution Engine v0.1'];
const fail=x=>{throw Error(x)};
export async function verifyOwnerIsolatedExtensionRuntime({
 session,scope,plan,installed,env=process.env,get=githubGet,
}={}){
 if(env?.VERCEL_ENV!=='preview'||!validUuid(session?.user_id)||
    !validUuid(scope?.conversationId)||scope.ownerId!==session.user_id||
    scope.workId!==plan?.original_work_id||
    scope.conversationId!==plan?.conversation_id||
    plan.owner_id!==session.user_id||
    scope.goalRevision!==plan.goal_revision||
    scope.candidateSha!==plan.candidate_sha256||
    scope.headSha!==plan.github_head_sha||
    plan.pinned_base_sha!==scope.pinnedBaseSha||
    !SHA.test(String(scope.headSha||''))||
    !HASH.test(String(scope.candidateSha||''))||
    installed?.installed!==true||installed.independent!==true||
    installed.exact_candidate_files_verified!==true||
    installed.production_deployment_performed!==false||
    installed.original_work_id!==scope.workId||
    installed.candidate_sha256!==scope.candidateSha||
    installed.head_sha!==scope.headSha||
    !SHA.test(String(installed.merge_commit_sha||''))||
    installed.base_ref!==BASE||
    typeof get!=='function')
  fail('UPGRADE_RUNTIME_PREVIEW_EXACT_INSTALL_REQUIRED');
 const source=await get(ROOT+'/git/ref/heads/'+BASE);
 if(source?.ref!=='refs/heads/'+BASE||
    source.object?.sha!==installed.merge_commit_sha)
  fail('UPGRADE_RUNTIME_MERGED_PREVIEW_COMMIT_MOVED');
 const query=ROOT+'/actions/runs?branch='+encodeURIComponent(BASE)+
   '&event=push&per_page=100';
 const result=await get(query);
 if(!Array.isArray(result?.workflow_runs)||
    !Number.isSafeInteger(result.total_count)||
    result.total_count>100)
  fail('UPGRADE_RUNTIME_GITHUB_RUN_COVERAGE_INCOMPLETE');
 const verified=[];
 for(const name of REQUIRED){
  const found=result.workflow_runs.filter(run=>
   run.name===name&&run.event==='push'&&run.status==='completed'&&
   run.conclusion==='success'&&run.head_branch===BASE&&
   run.head_sha===installed.merge_commit_sha&&
   run.repository?.full_name===REPO&&
   run.head_repository?.full_name===REPO&&
   run.html_url==='https://github.com/'+REPO+'/actions/runs/'+run.id&&
   Number.isSafeInteger(run.id)&&run.id>0);
  if(found.length!==1)fail('UPGRADE_RUNTIME_EXACT_POST_MERGE_CI_NOT_GREEN');
  const run=found[0];
  if(name===REQUIRED[0]){
   const jobs=await get(ROOT+'/actions/runs/'+run.id+'/jobs?per_page=100');
   const matching=jobs?.jobs?.filter(j=>
    j.name==='isolated-extension-verification'&&j.status==='completed'&&
    j.conclusion==='success'&&
    j.steps?.some(s=>s.name===
     'Require at least one extension and one test, then run in no-network no-secret Docker'&&
     s.conclusion==='success'));
   if(!Array.isArray(jobs?.jobs)||jobs.total_count>100||
      matching?.length!==1)
    fail('UPGRADE_RUNTIME_NO_NETWORK_EXTENSION_JOB_NOT_VERIFIED');
  }
  verified.push(Object.freeze({run_id:run.id,run_url:run.html_url,
   workflow_name:name,merge_commit_sha:installed.merge_commit_sha}));
 }
 return Object.freeze({
  version:OWNER_UPGRADE_ISOLATED_RUNTIME_VERSION,
  owner_id:session.user_id,conversation_id:scope.conversationId,
  original_work_id:scope.workId,goal_revision:scope.goalRevision,
  candidate_sha256:scope.candidateSha,head_sha:scope.headSha,
  capability_id:plan.capability_id,
  merge_commit_sha:installed.merge_commit_sha,
  registered:false,
  // "runtime_active" means ONLY the isolated CI-extension execution runtime.
  // It does NOT mean the extension is live in Vercel, or any original job ran.
  runtime_active:true,runtime_kind:'GITHUB_ACTIONS_NO_NETWORK_ISOLATED_EXTENSION_TEST',
  isolated_no_network_test_execution_verified:true,
  independently_reobserved:true,post_merge_ci_runs:verified,
  original_job_completed:false,production_deployment_performed:false,
 });
}
