// Auto Qualifier -> independent GitHub functional proof -> EXISTING owner
// install review adapter. The model never supplies the test verdict or scope.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const SHA=/^[a-f0-9]{40}$/, HASH=/^sha256:[a-f0-9]{64}$/, WORK=/^work:[a-f0-9]{32}$/, UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const REPO='maloney2323/Reality',ROOT='https://api.github.com/repos/'+REPO;
export const SIGNED_CHAT_GOAL_WORKFLOW='.github/workflows/reality-signed-chat-full-goal-acceptance-v1.yml';
export const SIGNED_CHAT_GOAL_SUITE='test/reality-signed-chat-full-goal-functional-v1.test.js';
export const SIGNED_CHAT_GOAL_NAME='Reality signed Chat original full-goal functional acceptance';
const STEP='Independently execute full-goal functional contract without secrets or network';
const safe=(status,more={})=>Object.freeze({status,...more,installation_authorized:false,original_job_completed:false,production_changed:false,new_shift_started:false});
const num=n=>Number.isSafeInteger(n)&&n>10000;
const targetPath=p=>/^(src\/|api\/reality\/)[A-Za-z0-9_/-]+\.js$/.test(p||'')&&!p.includes('..')&&!p.includes('//');
export const signedChatPreviewBranch=b=>/^(repair|reality)\/[A-Za-z0-9/_-]{10,135}$/.test(b||'')&&!b.includes('..')&&!b.includes('//')&&!/^reality\/(chat-recovery|chat-development|riley)\//.test(b);
export function selectSignedChatGoalRun(runs,sha,branch,event){
 const eligible=(runs||[]).filter(r=>r?.head_sha===sha&&r.head_branch===branch&&r.event===event&&
  r.name===SIGNED_CHAT_GOAL_NAME&&r.path?.split('@')[0]===SIGNED_CHAT_GOAL_WORKFLOW&&r.status==='completed'&&
  ['success','failure'].includes(r.conclusion)&&num(r.id)&&r.html_url==='https://github.com/'+REPO+'/actions/runs/'+r.id);
 // A rerun must not erase an earlier independently observed failure. A
 // contradictory run set remains ambiguous until the source is requalified.
 if(eligible.length!==1)return null;
 return eligible[0];
}
export function signedChatFunctionalVerdict(run,jobs){
 if(!run||!Array.isArray(jobs))return null;
 const js=jobs.filter(j=>j.run_id===run.id&&j.name==='independent-chat-full-goal'&&j.status==='completed'&&num(j.id)&&Array.isArray(j.steps));
 if(js.length!==1)return null;
 const j=js[0],steps=j.steps,step=steps.filter(s=>s.name===STEP);
 if(step.length!==1||!['success','failure'].includes(step[0].conclusion)||
  !['Checkout exact candidate or installed commit','Verify exact source identity','Prepare isolated Node runtime'].every(name=>steps.some(s=>s.name===name&&s.conclusion==='success')))return null;
 if(run.conclusion==='success'&&j.conclusion==='success'&&step[0].conclusion==='success'&&
  steps.some(x=>x.name==='Confirm acceptance grants no installation or completion authority'&&x.conclusion==='success'))return {id:run.id,job_id:j.id,verdict:'FUNCTIONAL_ACCEPTANCE_PASSED'};
 if(run.conclusion==='failure'&&j.conclusion==='failure'&&step[0].conclusion==='failure')return {id:run.id,job_id:j.id,verdict:'FEATURE_TEST_FAILED'};
 return null;
}
export function verifiedPreviewProviderEvidence(status,checks,sha){
 if(status?.sha!==sha||!Array.isArray(status.statuses)||!Array.isArray(checks?.check_runs))return null;
 const s=status.statuses.filter(x=>x.context==='Vercel'&&x.state==='success'&&Number.isSafeInteger(x.id)&&x.id>0&&
  /^https:\/\/vercel\.com\/[A-Za-z0-9_-]+\/reality\/[A-Za-z0-9_-]{10,100}$/.test(x.target_url||''));
 const c=checks.check_runs.filter(x=>x.head_sha===sha&&x.name==='Vercel Preview Comments'&&x.status==='completed'&&x.conclusion==='success'&&
  x.app?.slug==='vercel'&&Number.isSafeInteger(x.app.id)&&x.app.id>0&&Number.isSafeInteger(x.id)&&x.id>0);
 if(s.length!==1||c.length!==1)return null;
 return {vercel_status_id:s[0].id,vercel_app_check_id:c[0].id,vercel_app_id:c[0].app.id};
}
async function github(fetchImpl,path){
 const r=await fetchImpl(ROOT+path,{method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6000),headers:{
  accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'Reality-independent-signed-chat-goal-verifier'}});
 if(!r?.ok)return null;return r.json().catch(()=>null);
}
async function file(fetchImpl,path,ref){
 const d=await github(fetchImpl,'/contents/'+path+'?ref='+ref);
 if(d?.path!==path||d.encoding!=='base64'||!SHA.test(d.sha||'')||typeof d.content!=='string'||
  !Number.isSafeInteger(d.size)||d.size<1||d.size>280000)return null;
 const bytes=Buffer.from(d.content.replace(/\s/g,''),'base64');
 if(bytes.length!==d.size||createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')!==d.sha)return null;
 return {blob:d.sha,hash:'sha256:'+createHash('sha256').update(bytes).digest('hex')};
}
function valid(c){
 return c?.status==='SIGNED_CHAT_FULL_GOAL_ACCEPTANCE_ELIGIBLE'&&c.source_family==='SIGNED_CHAT_DEVELOPMENT_RECOVERY'&&
  UUID.test(c.attempt_id||'')&&UUID.test(c.owner_id||'')&&UUID.test(c.shift_id||'')&&UUID.test(c.worker_run_id||'')&&
  UUID.test(c.source_message_id||'')&&WORK.test(c.original_work_id||'')&&c.source_ref==='supabase:reality_chat_messages:'+c.source_message_id&&
  SHA.test(c.base_sha||'')&&SHA.test(c.candidate_commit_sha||'')&&SHA.test(c.source_commit_sha||'')&&
  SHA.test(c.expected_preinstall_blob_sha||'')&&SHA.test(c.expected_installed_blob_sha||'')&&c.expected_preinstall_blob_sha!==c.expected_installed_blob_sha&&
  HASH.test(c.candidate_sha256||'')&&HASH.test(c.candidate_artifact_sha256||'')&&HASH.test(c.quarantine_receipt_sha256||'')&&
  targetPath(c.target_path)&&/^reality\/chat-recovery\/[a-f0-9-]{36}(-feature-r[1-9][0-9]*)?(-syntax-r[1-9])?$/.test(c.candidate_branch||'')&&
  Number.isSafeInteger(c.candidate_pr_number)&&c.candidate_pr_number>0&&
  c.installation_authorized===false&&c.original_job_completed===false&&c.production_changed===false;
}
export async function advanceSignedChatFullGoalAcceptance({db,env=process.env,shiftId,workerRunId,call=shiftRpc,fetchImpl=fetch}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||!SHA.test(env.VERCEL_GIT_COMMIT_SHA||'')||!signedChatPreviewBranch(env.VERCEL_GIT_COMMIT_REF))
  return safe('SIGNED_CHAT_GOAL_TRUSTED_PREVIEW_SCOPE_REQUIRED');
 try{
  const c=await call(db,'reality_read_signed_chat_goal_acceptance_scope_v1',{p_shift_id:shiftId,p_worker_run_id:workerRunId},{fetchImpl});
  if(c?.status==='NO_SIGNED_CHAT_FULL_GOAL_ACCEPTANCE_DUE')return safe(c.status);
  if(!valid(c)||c.shift_id!==shiftId||c.worker_run_id!==workerRunId)return safe('SIGNED_CHAT_GOAL_EXACT_ORIGINAL_CONTEXT_REQUIRED');
  const [pr,ci,source,artifact,head]=await Promise.all([
   github(fetchImpl,'/pulls/'+c.candidate_pr_number),
   github(fetchImpl,'/actions/runs?head_sha='+c.candidate_commit_sha+'&per_page=100'),
   github(fetchImpl,'/commits/'+c.source_commit_sha),
   github(fetchImpl,'/commits/'+c.candidate_commit_sha),
   github(fetchImpl,'/git/ref/heads/'+c.candidate_branch)]);
  if(pr?.state!=='open'||pr.draft!==true||pr.merged!==false||pr.head?.repo?.full_name!==REPO||
   pr.base?.repo?.full_name!==REPO||pr.head?.sha!==c.candidate_commit_sha||pr.head?.ref!==c.candidate_branch||
   pr.base?.ref!==env.VERCEL_GIT_COMMIT_REF||head?.object?.sha!==c.candidate_commit_sha||
   source?.sha!==c.source_commit_sha||source.parents?.length!==1||source.parents[0].sha!==c.base_sha||
   source.files?.length!==1||source.files[0].filename!==c.target_path||source.files[0].status!=='modified'||
   artifact?.sha!==c.candidate_commit_sha||artifact.parents?.length!==1||artifact.parents[0].sha!==c.source_commit_sha||
   artifact.files?.length!==1||artifact.files[0].filename!=='evidence/reality-chat-recovery/'+c.attempt_id+'.json'||
   artifact.files[0].status!=='added'||!Array.isArray(ci?.workflow_runs))
   return safe('SIGNED_CHAT_GOAL_QUARANTINED_PROVIDER_GRAPH_UNVERIFIED');
  const [baseline,candidate,w0,w1,s0,s1]=await Promise.all([
   file(fetchImpl,c.target_path,c.base_sha),file(fetchImpl,c.target_path,c.candidate_commit_sha),
   file(fetchImpl,SIGNED_CHAT_GOAL_WORKFLOW,c.base_sha),file(fetchImpl,SIGNED_CHAT_GOAL_WORKFLOW,c.candidate_commit_sha),
   file(fetchImpl,SIGNED_CHAT_GOAL_SUITE,c.base_sha),file(fetchImpl,SIGNED_CHAT_GOAL_SUITE,c.candidate_commit_sha)]);
  if(baseline?.blob!==c.expected_preinstall_blob_sha||candidate?.blob!==c.expected_installed_blob_sha||candidate?.hash!==c.candidate_artifact_sha256||
   !w0||w0.blob!==w1?.blob||!s0||s0.blob!==s1?.blob)
   return safe('SIGNED_CHAT_GOAL_FROZEN_TEST_OR_SOURCE_DRIFT');
  const push=selectSignedChatGoalRun(ci.workflow_runs,c.candidate_commit_sha,c.candidate_branch,'push');
  const pull=selectSignedChatGoalRun(ci.workflow_runs,c.candidate_commit_sha,c.candidate_branch,'pull_request');
  async function check(run){
   if(!run)return null;
   const [exact,jobs]=await Promise.all([github(fetchImpl,'/actions/runs/'+run.id),github(fetchImpl,'/actions/runs/'+run.id+'/jobs?per_page=100')]);
   if(selectSignedChatGoalRun([exact],c.candidate_commit_sha,c.candidate_branch,run.event)?.id!==run.id)return null;
   return signedChatFunctionalVerdict(exact,jobs?.jobs);
  }
  const [functional,integration]=await Promise.all([check(push),check(pull)]);
  const failed=[functional,integration].find(x=>x?.verdict==='FEATURE_TEST_FAILED');
  if(!failed&&(!functional||!integration||functional.id===integration.id||
   functional.verdict!=='FUNCTIONAL_ACCEPTANCE_PASSED'||integration.verdict!=='FUNCTIONAL_ACCEPTANCE_PASSED'))
   return safe('SIGNED_CHAT_GOAL_WAITING_INDEPENDENT_FUNCTIONAL_CI',{original_work_id:c.original_work_id});
  const first=failed||functional;
  let proof={verdict:first.verdict,original_work_id:c.original_work_id,candidate_sha256:c.candidate_sha256,
   candidate_commit_sha:c.candidate_commit_sha,candidate_artifact_sha256:c.candidate_artifact_sha256,
   quarantine_receipt_sha256:c.quarantine_receipt_sha256,base_sha:c.base_sha,
   expected_preinstall_blob_sha:c.expected_preinstall_blob_sha,expected_installed_blob_sha:c.expected_installed_blob_sha,
   workflow:SIGNED_CHAT_GOAL_WORKFLOW,workflow_blob_sha:w0.blob,functional_suite_blob_sha:s0.blob,
   isolation:'DOCKER_NETWORK_NONE_READONLY_NO_SECRETS',functional_run_id:first.id,functional_job_id:first.job_id,
   installation_authorized:false,original_job_completed:false,production_changed:false};
  if(!failed){
   if(c.base_sha!==env.VERCEL_GIT_COMMIT_SHA)return safe('SIGNED_CHAT_GOAL_PREVIEW_BASE_CHANGED_REQUALIFICATION_REQUIRED',{original_work_id:c.original_work_id});
   const [ref,status,checks]=await Promise.all([
    github(fetchImpl,'/git/ref/heads/'+env.VERCEL_GIT_COMMIT_REF),
    github(fetchImpl,'/commits/'+c.base_sha+'/status'),github(fetchImpl,'/commits/'+c.base_sha+'/check-runs?per_page=100')]);
   const transport=verifiedPreviewProviderEvidence(status,checks,c.base_sha);
   if(ref?.ref!=='refs/heads/'+env.VERCEL_GIT_COMMIT_REF||ref.object?.sha!==c.base_sha||!transport)
    return safe('SIGNED_CHAT_GOAL_PREVIEW_TRANSPORT_NOT_INDEPENDENTLY_VERIFIED',{original_work_id:c.original_work_id});
   proof={...proof,...transport,integration_run_id:integration.id,integration_job_id:integration.job_id,
    target_branch:env.VERCEL_GIT_COMMIT_REF,target_base_sha:c.base_sha,independent_transport_verified:true};
  }
  const result=await call(db,'reality_record_signed_chat_goal_acceptance_v1',{
   p_shift_id:shiftId,p_worker_run_id:workerRunId,p_attempt_id:c.attempt_id,p_proof:proof},{fetchImpl});
  if(result?.original_work_id!==c.original_work_id||!HASH.test(result.receipt_sha256||'')||
    result.installation_authorized!==false||result.original_job_completed!==false||result.production_changed!==false||
    !['SIGNED_CHAT_FULL_GOAL_FUNCTIONALLY_QUALIFIED_EXACT_OWNER_REVIEW_READY','SIGNED_CHAT_FULL_GOAL_FAILURE_RECOMPILED_SAME_ORIGINAL','SIGNED_CHAT_FEATURE_FAILURE_NEEDS_FRESH_INVESTIGATION'].includes(result.status))
   return safe('SIGNED_CHAT_GOAL_DURABLE_ACCEPTANCE_RECEIPT_UNVERIFIED');
  return safe(result.status,{original_work_id:c.original_work_id,attempt_id:c.attempt_id,receipt_sha256:result.receipt_sha256,
   owner_approval_ready:result.owner_approval_ready===true,independent_functional_acceptance_verified:!failed,
   universe_original_event_id:result.universe_original_event_id||null});
 }catch{return safe('SIGNED_CHAT_GOAL_INDEPENDENT_PROVIDER_OR_LEDGER_UNVERIFIED');}
}
