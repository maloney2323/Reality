// Reality's signed worker independently requalifies an unresolved GitHub
// quarantine write as a NEW release-bound candidate, SAME original work.
// This is not a replay of the prior fenced provider write, nor install approval.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const safe=(status,more={})=>Object.freeze({status,...more,
 new_shift_started:false,installation_authorized:false,
 original_job_completed:false,production_changed:false});
const REPO='maloney2323/Reality';
const ROOT='https://api.github.com/repos/'+REPO;
async function getGithub(fetchImpl,path){
 try{
  const response=await fetchImpl(ROOT+path,{method:'GET',cache:'no-store',
   redirect:'error',signal:AbortSignal.timeout(6500),
   headers:{accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-independent-signed-provider-requalification'}});
  if(!Number.isInteger(response?.status))
   return {status:null,data:null};
  return {status:response.status,data:response.ok?
   await response.json().catch(()=>null):null};
 }catch{return {status:null,data:null}}
}
export async function requalifyOneFencedSignedChatProvider({
 db,env=process.env,shiftId,workerRunId,call=shiftRpc,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
   !SHA.test(env.VERCEL_GIT_COMMIT_SHA||'')||
   !/^(repair|reality)\/[A-Za-z0-9/_-]{10,135}$/.test(
    env.VERCEL_GIT_COMMIT_REF||'')||
   env.VERCEL_GIT_COMMIT_REF.includes('..')||
   env.VERCEL_GIT_COMMIT_REF.startsWith('reality/chat-recovery/')||
   typeof call!=='function'||typeof fetchImpl!=='function')
  return safe('SIGNED_FENCED_PROVIDER_TRUSTED_PREVIEW_SCOPE_REQUIRED');
 const q=await call(db,'reality_read_next_signed_chat_recovery_publish_v1',{},
  {fetchImpl});
 if(q?.status==='NO_SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE')
  return safe(q.status);
 if(q?.status!=='SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE_READ'||
   q.phase!=='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED')
  return safe('NO_FENCED_SIGNED_CHAT_PROVIDER_REQUALIFICATION_DUE');
 if(!UUID.test(q.trigger_id||'')||
   q.original_work_id?.match(/^work:[a-f0-9]{32}$/)===null||
   !UUID.test(q.message_id||'')||
   !HASH.test(q.candidate?.candidate_sha256||'')||
   !HASH.test(q.spec_sha256||'')||
   !SHA.test(q.release_sha||'')||
   q.candidate?.base_sha!==q.release_sha||
   q.source_ref!=='supabase:reality_chat_messages:'+q.message_id||
   q.installation_authorized!==false||
   q.original_job_completed!==false||q.production_changed!==false||
   !Number.isSafeInteger(q.quarantine_epoch)||
   q.quarantine_epoch<0||q.quarantine_epoch>=9||
   !Number.isSafeInteger(q.feature_epoch)||
   q.feature_epoch<0||q.feature_epoch>4)
  return safe('SIGNED_FENCED_PROVIDER_EXACT_ORIGINAL_UNVERIFIED');
 if(q.release_sha===env.VERCEL_GIT_COMMIT_SHA)
  return safe('SIGNED_FENCED_PROVIDER_NEW_SOURCE_RELEASE_NOT_YET_AVAILABLE');
 const oldBranch='reality/chat-recovery/'+q.trigger_id+
  (q.feature_epoch>0?'-feature-r'+q.feature_epoch:'')+
  (q.quarantine_epoch>0?'-syntax-r'+q.quarantine_epoch:'');
 const [repo,oldRef,currentRef,oldCommit]=await Promise.all([
  getGithub(fetchImpl,''),
  getGithub(fetchImpl,'/git/ref/heads/'+oldBranch),
  getGithub(fetchImpl,'/git/ref/heads/'+env.VERCEL_GIT_COMMIT_REF),
  getGithub(fetchImpl,'/commits/'+q.release_sha)
 ]);
 if(repo.status!==200||repo.data?.full_name!==REPO||
   repo.data.private!==false||repo.data.disabled===true||
   oldRef.status!==404||
   currentRef.status!==200||
   currentRef.data?.ref!=='refs/heads/'+env.VERCEL_GIT_COMMIT_REF||
   currentRef.data?.object?.sha!==env.VERCEL_GIT_COMMIT_SHA||
   oldCommit.status!==200||oldCommit.data?.sha!==q.release_sha)
  return safe('SIGNED_FENCED_PROVIDER_INDEPENDENT_GITHUB_SOURCE_OR_REF_UNVERIFIED',{
   independent_read_only:true,provider_ref_status:oldRef.status,
   current_preview_ref_status:currentRef.status});
 const result=await call(db,'reality_requalify_fenced_signed_chat_provider_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId,
  p_trigger_id:q.trigger_id,
  p_candidate_sha256:q.candidate.candidate_sha256,
  p_original_branch:oldBranch,
  p_old_release_sha:q.release_sha,
  p_current_release_sha:env.VERCEL_GIT_COMMIT_SHA,
  p_public_repo_status:repo.status,
  p_independent_ref_status:oldRef.status,
  p_current_preview_ref_verified:true
 },{fetchImpl});
 if(result?.status!=='SIGNED_FENCED_PROVIDER_NEW_RELEASE_SAME_ORIGINAL_SPEC_FROZEN')
  return safe(result?.status||'SIGNED_FENCED_PROVIDER_REQUALIFICATION_LEDGER_UNVERIFIED');
 const newBranch='reality/chat-recovery/'+q.trigger_id+
  (q.feature_epoch>0?'-feature-r'+q.feature_epoch:'')+
  '-syntax-r'+(q.quarantine_epoch+1);
 if(result.trigger_id!==q.trigger_id||
  result.original_work_id!==q.original_work_id||
  result.previous_candidate_sha256!==q.candidate.candidate_sha256||
  result.previous_branch!==oldBranch||
  result.new_branch!==newBranch||
  !HASH.test(result.new_spec_sha256||'')||
  !HASH.test(result.independent_requalification_receipt_sha256||'')||
  result.full_goal_feature_accepted!==false||
  result.installation_authorized!==false||
  result.original_job_completed!==false||
  result.production_changed!==false||
  result.new_shift_started!==false)
  return safe('SIGNED_FENCED_PROVIDER_NEW_SOURCE_RECEIPT_MISMATCH');
 return safe(result.status,{
  trigger_id:q.trigger_id,original_work_id:q.original_work_id,
  prior_fenced_branch:oldBranch,new_branch:newBranch,
  independent_requalification_receipt_sha256:
   result.independent_requalification_receipt_sha256,
  new_spec_sha256:result.new_spec_sha256,
  independent_current_release_verified:true,
  old_provider_write_replayed:false
 });
}
