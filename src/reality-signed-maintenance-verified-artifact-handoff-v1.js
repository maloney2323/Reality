// Reality's EXISTING signed worker advances independently tested source into
// an exact reviewable artifact in the same shift, not a new AI coordinator.
// Provider-backed broker reads the existing GitHub run + source; database
// protects owner/shift identity. This stage cannot authorize installation.
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const fail=x=>{throw Error('SIGNED_REPAIR_ARTIFACT_'+x)};
const hold=(status,extra={})=>Object.freeze({
 status,...extra,verified_repair_artifact:false,
 installation_authorized:false,repair_installed:false,
 original_job_completed:false,production_changed:false,new_shift_started:false
});
export async function reconcileSignedVerifiedMaintenanceArtifact({
 db,env=process.env,shiftId,workerRunId,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  db.url!=='https://'+db.project+'.supabase.co'||
  typeof db.secretKey!=='string'||db.secretKey.length<24||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  !SHA.test(env.VERCEL_GIT_COMMIT_SHA||'')||
  typeof fetchImpl!=='function')
  fail('EXACT_SIGNED_EXISTING_WORKER_REQUIRED');
 let r;
 try{
  r=await fetchImpl(db.url+
   '/functions/v1/reality-signed-maintenance-repair-source-broker-v1',{
    method:'POST',cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(27000),
    headers:{apikey:db.secretKey,
     authorization:'Bearer '+db.secretKey,'content-type':'application/json'},
    body:JSON.stringify({mode:'artifact',shift_id:shiftId,
     worker_run_id:workerRunId,release_sha:env.VERCEL_GIT_COMMIT_SHA})
   });
 }catch{
  return hold('VERIFIED_MAINTENANCE_ARTIFACT_PROVIDER_UNAVAILABLE');
 }
 if(!r?.ok)return hold('VERIFIED_MAINTENANCE_ARTIFACT_BROKER_UNVERIFIED');
 const d=await r.json().catch(()=>null);
 if(!d||Array.isArray(d)||d.ok!==true||
  d.source_read_only!==true||d.model_generated!==false||
  d.repair_executed!==false||d.original_job_completed!==false||
  d.installation_authorized!==false||d.production_changed!==false||
  d.new_shift_started!==false)
  fail('ARTIFACT_BROKER_AUTHORITY_UNTRUSTED');
 if(['NO_SIGNED_MAINTENANCE_ARTIFACT_WORKER_SCOPE',
  'NO_UNRECONCILED_VERIFIED_MAINTENANCE_ARTIFACT',
  'NO_PINNED_MAINTENANCE_ARTIFACT_CI_YET',
  'ARTIFACT_PINNED_CI_STEPS_MISSING',
  'NO_PINNED_VERIFIED_REPAIR_ARTIFACT_MATCHED_CASE'].includes(d.status))
  return hold(d.status);
 if(d.status!=='EXACT_MAINTENANCE_SOURCE_REPAIR_ARTIFACT_RECORDED'||
  d.shift_id!==shiftId||!UUID.test(d.owner_id||'')||
  !UUID.test(d.maintenance_id||'')||
  !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(d.source_ref||'')||
  d.candidate_commit_sha!==env.VERCEL_GIT_COMMIT_SHA||
  !SHA.test(d.source_blob_sha||'')||
  !HASH.test(d.review_receipt_sha256||'')||
  !HASH.test(d.case_ci_receipt_sha256||'')||
  !HASH.test(d.github_artifact_digest||'')||
  !Number.isSafeInteger(d.github_run_id)||d.github_run_id<1||
  !Number.isSafeInteger(d.github_artifact_id)||d.github_artifact_id<1||
  d.exact_artifact_review_verified!==true||
  d.owner_approval_ready!==false||
  d.install_target_verified!==false||
  d.repair_installed!==false)
  fail('EXACT_SIGNED_VERIFIED_REPAIR_ARTIFACT_INVALID');
 return Object.freeze({
  status:d.status,shift_id:shiftId,
  maintenance_id:d.maintenance_id,source_ref:d.source_ref,
  candidate_commit_sha:d.candidate_commit_sha,
  source_blob_sha:d.source_blob_sha,
  github_run_id:d.github_run_id,
  github_artifact_id:d.github_artifact_id,
  github_artifact_digest:d.github_artifact_digest,
  independent_case_ci_receipt_sha256:d.case_ci_receipt_sha256,
  review_receipt_sha256:d.review_receipt_sha256,
  verified_repair_artifact:true,
  owner_approval_ready:false,install_target_verified:false,
  installation_authorized:false,repair_installed:false,
  original_job_completed:false,production_changed:false,
  new_shift_started:false,
  next_action:'INDEPENDENT_INSTALL_TARGET_AND_OWNER_APPROVAL_REVIEW_REQUIRED'
 });
}


// Resume the EXISTING signed maintenance work after an independently recorded
// RED/GREEN repair artifact. A different signed worker must verify candidate
// bytes, the exact preview target, and its rollback base before any owner
// installation decision. No model output or browser state is authority.
export async function independentlyReviewSignedMaintenanceInstallTarget({
 db,env=process.env,shiftId,workerRunId,fetchImpl=fetch,call=null
}={}){
 const {shiftRpc}=await import('./reality-governed-shift-boundary-v1.js');
 const rpc=call||shiftRpc;
 const safe=(status,extra={})=>Object.freeze({
  status,...extra,install_target_verified:false,owner_approval_ready:false,
  installation_authorized:false,repair_installed:false,
  original_job_completed:false,production_changed:false,new_shift_started:false
 });
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  typeof rpc!=='function'||typeof fetchImpl!=='function')
  fail('INSTALL_TARGET_SIGNED_OWNER_SCOPE_REQUIRED');
 const scope=await rpc(db,
  'reality_read_signed_maintenance_install_target_review_v1',{
   p_shift_id:shiftId,p_worker_run_id:workerRunId
  },{fetchImpl});
 if(scope?.status==='NO_SIGNED_MAINTENANCE_INSTALL_TARGET_REVIEW_DUE'&&
  scope.installation_authorized===false&&scope.repair_installed===false&&
  scope.original_job_completed===false&&scope.production_changed===false)
  return safe(scope.status);
 const branch='reality/chat-direct-work-handoff-20261115';
 if(scope?.status!=='SIGNED_MAINTENANCE_EXACT_INSTALL_TARGET_REVIEW_DUE'||
  scope.shift_id!==shiftId||!UUID.test(scope.maintenance_id||'')||
  !UUID.test(scope.owner_id||'')||
  scope.reviewer_worker_run_id!==workerRunId||
  scope.artifact_worker_run_id===workerRunId||
  !UUID.test(scope.artifact_worker_run_id||'')||
  scope.target_branch!==branch||
  !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(scope.source_ref||'')||
  !/^src\/[a-z0-9_./-]+\.js$/.test(scope.source_path||'')||
  scope.source_path.includes('..')||
  !SHA.test(scope.candidate_commit_sha||'')||
  !SHA.test(scope.candidate_source_blob_sha||'')||
  !SHA.test(scope.historical_source_blob_sha||'')||
  !HASH.test(scope.artifact_receipt_sha256||'')||
  !HASH.test(scope.case_ci_receipt_sha256||'')||
  scope.original_job_completed!==false||
  scope.installation_authorized!==false||
  scope.owner_approval_ready!==false||
  scope.production_changed!==false||scope.new_shift_started!==false)
  fail('INSTALL_TARGET_EXACT_ARTIFACT_AND_OWNER_WARRANT_UNVERIFIED');
 const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
 if(token.length<20)return safe('MAINTENANCE_INSTALL_TARGET_GITHUB_CREDENTIAL_UNAVAILABLE');
 const base='https://api.github.com/repos/maloney2323/Reality';
 async function get(url){
  let response;
  try{
   response=await fetchImpl(url,{
    method:'GET',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(8500),
    headers:{authorization:'Bearer '+token,
     accept:'application/vnd.github+json',
     'x-github-api-version':'2022-11-28',
     'user-agent':'Reality-Independent-Maintenance-Target-Review'}
   });
  }catch{return null}
  if(!response?.ok)return null;
  return response.json().catch(()=>null);
 }
 const [ref,candidate,target]=await Promise.all([
  get(base+'/git/ref/heads/'+branch),
  get(base+'/contents/'+scope.source_path+'?ref='+scope.candidate_commit_sha),
  get(base+'/contents/'+scope.source_path+'?ref='+branch)
 ]);
 if(ref?.ref!=='refs/heads/'+branch||!SHA.test(ref.object?.sha||'')||
  candidate?.path!==scope.source_path||
  candidate?.sha!==scope.candidate_source_blob_sha||
  target?.path!==scope.source_path||!SHA.test(target.sha||''))
  return safe('SIGNED_MAINTENANCE_INSTALL_TARGET_PROVIDER_PROOF_UNAVAILABLE',{
   maintenance_id:scope.maintenance_id});
 if(target.sha!==scope.historical_source_blob_sha)
  return safe('SIGNED_MAINTENANCE_INSTALL_TARGET_SOURCE_DRIFT_REQUALIFICATION_REQUIRED',{
   maintenance_id:scope.maintenance_id,shift_id:shiftId,
   target_branch:branch,expected_existing_blob_sha:scope.historical_source_blob_sha,
   observed_existing_blob_sha:target.sha});
 const saved=await rpc(db,'reality_record_signed_maintenance_install_target_review_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId,
  p_maintenance_id:scope.maintenance_id,
  p_candidate_blob_sha:candidate.sha,p_target_branch:branch,
  p_target_head_sha:ref.object.sha,
  p_target_existing_blob_sha:target.sha
 },{fetchImpl});
 if(saved?.status!=='EXACT_SIGNED_MAINTENANCE_INSTALL_TARGET_INDEPENDENTLY_REVIEWED'||
  saved.owner_id!==scope.owner_id||saved.shift_id!==shiftId||
  saved.maintenance_id!==scope.maintenance_id||
  saved.candidate_commit_sha!==scope.candidate_commit_sha||
  saved.candidate_source_blob_sha!==candidate.sha||
  saved.target_branch!==branch||saved.target_head_sha!==ref.object.sha||
  saved.target_existing_blob_sha!==target.sha||
  !HASH.test(saved.target_review_receipt_sha256||'')||
  saved.owner_approval_ready!==false||
  saved.installation_authorized!==false||saved.repair_installed!==false||
  saved.original_job_completed!==false||saved.production_changed!==false||
  saved.new_shift_started!==false)
  fail('INSTALL_TARGET_INDEPENDENT_DURABLE_RECEIPT_UNVERIFIED');
 return Object.freeze({...saved,install_target_verified:true,
  original_artifact_receipt_sha256:scope.artifact_receipt_sha256,
  original_case_ci_receipt_sha256:scope.case_ci_receipt_sha256,
  owner_approval_ready:false,installation_authorized:false,
  repair_installed:false,original_job_completed:false,
  production_changed:false,new_shift_started:false});
}
