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
