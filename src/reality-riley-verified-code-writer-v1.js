// Riley writes REAL model-authored code only after Reality's existing
// constitutional engine has independently verified the exact frozen contract.
// A new isolated GitHub branch is NOT an installation, approval or settlement.
import {createFoundationalBuildTicket,validateFoundationalCandidate}
 from './reality-foundational-build-loop-v1.0.js';

export const RILEY_VERIFIED_CODE_WRITER_VERSION='reality-riley-verified-code-writer-v1';
const SHA=/^[a-f0-9]{40}$/;
const HEX=/^[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SOURCE_BRANCH='feature/reality-general-capability-engine-20261101';
const REPO='maloney2323/Reality';
const deny=reason=>{throw Error('RILEY_VERIFIED_WRITER_'+reason)};
// Never accept a caller-forged 'verified:true' plan in a credentialed stage.
const authenticatedPlans=new WeakSet();
const stageBranch=(work,artifact)=>
 'reality/riley/verified-'+work.slice(5,17)+'-'+artifact.slice(0,12);

export function authorizeRileyCandidateStage({
 admission,proposal,proof,qualification,runId,baseCommitSha,
 baseBranch=SOURCE_BRANCH
}={}){
 if(!Number.isSafeInteger(runId)||runId<1||!SHA.test(baseCommitSha||'')||
    baseBranch!==SOURCE_BRANCH)
  deny('PINNED_ISOLATED_WORKFLOW_REQUIRED');
 if(!admission||admission.repository_sha!==baseCommitSha||
    admission.installation_authorized!==false||
    !Array.isArray(admission.queued)||!Array.isArray(admission.previously_claimed)||
    proposal?.source!=='REAL_OPENAI_MODEL_GENERATION'||
    proposal.installation_authorized!==false||
    proposal.original_job_completed!==false||
    proof?.schema!=='reality-genuine-sandbox-v1'||
    proof.workflow_run_id!==String(runId)||
    proof.runner_git_sha!==baseCommitSha||
    proof.runner_isolation!=='DOCKER_NETWORK_NONE_READONLY_NO_SECRETS'||
    proof.passed!==true||proof.installation_authorized!==false||
    proof.original_job_completed!==false||
    proof.production_changed!==false||
    proof.frozen_result?.exit_code!==0||
    !Number.isInteger(proof.frozen_result?.tests)||
    proof.frozen_result.tests<1||proof.frozen_result.fail!==0||
    proof.candidate_result?.exit_code!==0||
    !Number.isInteger(proof.candidate_result?.tests)||
    proof.candidate_result.tests<1||proof.candidate_result.fail!==0)
  deny('INDEPENDENT_FROZEN_PROOF_REQUIRED');
 const {version,ticket_hash,...ticketData}=proposal.ticket||{};
 const ticket=createFoundationalBuildTicket(ticketData);
 if(ticket.version!==version||ticket.ticket_hash!==ticket_hash||
    ticket.repository_base_sha!==baseCommitSha||
    ticket.repository_branch!==SOURCE_BRANCH||
    ticket.environment!=='ISOLATED_PREVIEW')
  deny('ORIGINAL_TICKET_BRANCH_OR_HASH_CHANGED');
 const candidate=validateFoundationalCandidate(ticket,proposal.candidate);
 if(candidate.artifact_sha256!==proposal.candidate?.artifact_sha256||
    !HEX.test(candidate.artifact_sha256)||
    !/^resp_[A-Za-z0-9_-]{4,144}$/.test(candidate.model_response_id||'')||
    proof.original_work_id!==ticket.original_work_id||
    proof.artifact_sha256!==candidate.artifact_sha256||
    proof.ticket_hash!==ticket.ticket_hash||
    proof.model_response_id!==candidate.model_response_id||
    proof.frozen_test_path!==ticket.frozen_test_path||
    proof.frozen_suite_sha256!==ticket.frozen_regression_sha256)
  deny('MODEL_ARTIFACT_NOT_INDEPENDENTLY_VERIFIED');
 const rows=[...admission.queued,...admission.previously_claimed]
  .filter(x=>x.original_work_id===ticket.original_work_id);
 if(rows.length!==1||!UUID.test(rows[0].trigger_id||'')||
    !UUID.test(rows[0].source_event_id||'')||
    rows[0].original_work_id!==proof.original_work_id)
  deny('EXACT_EXISTING_OWNER_JOB_NOT_ADMITTED');
 if(qualification?.status!=='AWAITING_OWNER_APPROVAL'||
    qualification.original_work_id!==ticket.original_work_id||
    qualification.artifact_sha256!==candidate.artifact_sha256||
    qualification.installation_authorized!==false||
    qualification.original_job_completed!==false||
    !HEX.test(qualification.pre_state_hash||'')||
    !HEX.test(qualification.post_state_hash||'')||
    !qualification.valid_time||!qualification.transaction_time)
  deny('DURABLE_OWNER_REVIEW_QUALIFICATION_REQUIRED');
 if(!WORK.test(ticket.original_work_id)||
    !candidate.files.some(f=>f.path===ticket.source_entrypoint)||
    candidate.files.some(f=>!/^((src|test)\/reality-extensions\/)[A-Za-z0-9._/-]+$/.test(f.path)))
  deny('SOURCE_AND_TEST_ISOLATION_REQUIRED');
 const plan=Object.freeze({
  version:RILEY_VERIFIED_CODE_WRITER_VERSION,
  base_commit_sha:baseCommitSha,base_branch:baseBranch,
  branch:stageBranch(ticket.original_work_id,candidate.artifact_sha256),
  original_work_id:ticket.original_work_id,
  trigger_id:rows[0].trigger_id,
  source_event_id:rows[0].source_event_id,
  artifact_sha256:candidate.artifact_sha256,
  model_response_id:candidate.model_response_id,
  run_id:runId,
  files:Object.freeze(candidate.files.map(f=>Object.freeze({path:f.path,content:f.content}))),
  independent_verification_passed:true,
  model_generated:true,
  code_staging_permitted:true,
  owner_installation_approved:false,
  installation_performed:false,
  original_job_settled:false,production_changed:false
 });
 authenticatedPlans.add(plan);
 return plan;
}

export async function stageRileyVerifiedCandidate({
 plan,token,fetchImpl=fetch
}={}){
 if(!plan||typeof plan!=='object'||!authenticatedPlans.has(plan)||
    plan.version!==RILEY_VERIFIED_CODE_WRITER_VERSION||
    !SHA.test(plan.base_commit_sha||'')||
    plan.base_branch!==SOURCE_BRANCH||
    !WORK.test(plan.original_work_id||'')||
    !HEX.test(plan.artifact_sha256||'')||
    plan.branch!==stageBranch(plan.original_work_id,plan.artifact_sha256)||
    plan.independent_verification_passed!==true||
    plan.model_generated!==true||
    plan.code_staging_permitted!==true||
    plan.owner_installation_approved!==false||
    plan.installation_performed!==false||
    plan.original_job_settled!==false||
    plan.production_changed!==false||
    !Array.isArray(plan.files)||plan.files.length<2||plan.files.length>16||
    !plan.files.some(f=>f.path.startsWith('src/reality-extensions/'))||
    !plan.files.some(f=>f.path.startsWith('test/reality-extensions/'))||
    plan.files.some(f=>
     !/^(src|test)\/reality-extensions\/[A-Za-z0-9._/-]+$/.test(f.path)||
     f.path.includes('..')||f.path.includes('//')||
     typeof f.content!=='string'||!f.content||f.content.length>70000)||
    typeof token!=='string'||token.length<25||
    typeof fetchImpl!=='function')
  deny('TRUSTED_VERIFIED_CANDIDATE_AND_GITHUB_CREDENTIAL_REQUIRED');
 const files=plan.files.map(x=>({path:x.path,mode:'100644',type:'blob',content:x.content}));
 const names=files.map(x=>x.path);
 if(new Set(names).size!==names.length)deny('DUPLICATE_STAGED_PATH');
 async function github(path,{method='GET',body,missing=false}={}){
  const response=await fetchImpl('https://api.github.com/repos/'+REPO+path,{
   method,redirect:'error',cache:'no-store',
   headers:{accept:'application/vnd.github+json',
    authorization:'Bearer '+token,
    'content-type':'application/json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-Riley-Independent-Code-Stage-v1'},
   signal:AbortSignal.timeout(15000),
   body:body===undefined?undefined:JSON.stringify(body),
  });
  if(response.status===404&&missing)return null;
  if(!response.ok)deny('GITHUB_PROVIDER_EFFECT_UNCERTAIN');
  const data=await response.json().catch(()=>null);
  if(!data||typeof data!=='object')deny('GITHUB_PROVIDER_RESPONSE_INVALID');
  return data;
 }
 // Read branch without moving it. A different isolated HEAD means a new
 // independently qualified ticket is required, never silent rebasing.
 const head=await github('/git/ref/heads/'+SOURCE_BRANCH);
 if(head?.object?.sha!==plan.base_commit_sha)
  deny('FROZEN_BASE_BRANCH_MOVED');
 const base=await github('/git/commits/'+plan.base_commit_sha);
 if(base?.sha!==plan.base_commit_sha||!SHA.test(base.tree?.sha||''))
  deny('BASE_COMMIT_TREE_UNVERIFIED');
 const tree=await github('/git/trees/'+base.tree.sha+'?recursive=1');
 if(tree?.sha!==base.tree.sha||tree.truncated!==false||
    !Array.isArray(tree.tree))
  deny('COMPLETE_BASE_TREE_READBACK_REQUIRED');
 if(tree.tree.some(x=>names.includes(x.path)))
  deny('CANDIDATE_OVERWRITES_ALREADY_EXISTING_CODE');
 const refPath='/git/ref/heads/'+plan.branch;
 const already=await github(refPath,{missing:true});
 if(already){
  if(!SHA.test(already.object?.sha||''))
   deny('EXISTING_STAGED_BRANCH_UNVERIFIED');
  const commit=await github('/git/commits/'+already.object.sha);
  if(commit?.sha!==already.object.sha||
     commit.parents?.length!==1||
     commit.parents[0].sha!==plan.base_commit_sha)
   deny('EXISTING_STAGED_BRANCH_DRIFT');
  const resultTree=await github('/git/trees/'+commit.tree.sha+'?recursive=1');
  if(resultTree?.truncated!==false||!Array.isArray(resultTree.tree))
   deny('EXISTING_STAGED_TREE_READBACK_REQUIRED');
  // Existing delivery is not a new execution. Verify every file blob by
  // reading content through GitHub; SHA alone is not a semantic receipt.
  for(const file of plan.files){
   const data=await github('/contents/'+file.path+'?ref='+
    encodeURIComponent(plan.branch));
   if(data.path!==file.path||
      Buffer.from(String(data.content||'').replace(/\s/g,''),'base64')
       .toString('utf8')!==file.content)
    deny('EXISTING_STAGED_FILE_BYTES_CHANGED');
  }
  return Object.freeze({
   status:'EXACT_VERIFIED_RILEY_CODE_ALREADY_STAGED',
   original_work_id:plan.original_work_id,
   branch:plan.branch,commit_sha:already.object.sha,
   artifact_sha256:plan.artifact_sha256,
   files:files.map(x=>x.path),new_branch_created:false,
   model_generated:true,independent_verification_passed:true,
   installation_authorized:false,original_job_settled:false,
   production_changed:false
  });
 }
 const stagedTree=await github('/git/trees',{method:'POST',body:{
  base_tree:base.tree.sha,tree:files}});
 if(!SHA.test(stagedTree?.sha||''))deny('CANDIDATE_GIT_TREE_NOT_RECORDED');
 const commit=await github('/git/commits',{method:'POST',body:{
  message:'Riley: independently verified uninstalled capability candidate '+plan.original_work_id,
  tree:stagedTree.sha,parents:[plan.base_commit_sha]
 }});
 if(!SHA.test(commit?.sha||'')||commit.tree?.sha!==stagedTree.sha||
    commit.parents?.length!==1||
    commit.parents[0].sha!==plan.base_commit_sha)
  deny('ISOLATED_CODE_COMMIT_READBACK_INVALID');
 const created=await github('/git/refs',{method:'POST',body:{
  ref:'refs/heads/'+plan.branch,sha:commit.sha}});
 if(created?.ref!=='refs/heads/'+plan.branch||
    created.object?.sha!==commit.sha)
  deny('STAGED_BRANCH_CREATE_UNCERTAIN');
 const after=await github(refPath);
 if(after?.object?.sha!==commit.sha)deny('STAGED_BRANCH_NOT_INDEPENDENTLY_READ_BACK');
 return Object.freeze({
  status:'EXACT_VERIFIED_RILEY_CODE_STAGED_IN_ISOLATION',
  original_work_id:plan.original_work_id,
  branch:plan.branch,commit_sha:commit.sha,
  artifact_sha256:plan.artifact_sha256,
  files:files.map(x=>x.path),new_branch_created:true,
  model_generated:true,independent_verification_passed:true,
  owner_installation_authorized:false,
  installation_authorized:false,original_job_settled:false,
  production_changed:false
 });
}
