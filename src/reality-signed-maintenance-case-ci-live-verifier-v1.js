// Actual signed shift worker -> existing Supabase GitHub credential broker.
// The broker independently rechecks GitHub's pinned red/green Actions job,
// frozen source, registered work scope and artifact before a DB test receipt
// can advance. No new job/shift, model-authored proof, install or settlement.
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const error=x=>{throw Error('SIGNED_CASE_CI_LIVE_'+x)};
const safe=(status,extra={})=>Object.freeze({
 status,...extra,case_specific_frozen_red_attested:false,
 code_regression_green_verified:false,repair_installed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
});
// A resume signal is a routing hint, not a warrant or proof. The broker
// independently re-reads the exact signal and current signed maintenance scope.
export function selectSignedCaseCiResumeEvent(shadow,shiftId){
 if(shadow?.status!=='FINAL_LOOP_EVENT_SUBSCRIPTIONS_AND_SIGNAL_TRACE_READ_ONLY'||
    shadow.shift_id!==shiftId||shadow.execution_authorized!==false||
    !Array.isArray(shadow.events)||!Array.isArray(shadow.subscriptions))return null;
 const matches=shadow.events.filter(e=>
  UUID.test(e?.event_id||'')&&e.event_state==='SHADOW_PENDING'&&
  e.source_current===true&&e.would_resume_suspended_obligation===true&&
  ['QUALIFIER_PROOF_CHANGED','INDEPENDENT_FROZEN_CI_RECEIPT'].includes(e.event_kind)&&
  HASH.test(e.source_receipt_sha256||'')&&
  shadow.subscriptions.some(s=>s.original_work_id===e.original_work_id&&
   s.source_ref===e.source_ref&&s.continuity_revision===e.continuity_revision&&
   s.condition_kind===e.event_kind&&
   s.next_qualified_action==='VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC'));
 return matches.length===1?Object.freeze({event_id:matches[0].event_id,
  source_ref:matches[0].source_ref}):null;
}
export async function continueSignedMaintenanceCaseCiVerification({
 db,env=process.env,shiftId,workerRunId,resumeEvent=null,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  typeof db.url!=='string'||
  db.url!=='https://'+db.project+'.supabase.co'||
  typeof db.secretKey!=='string'||db.secretKey.length<24||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  !SHA.test(env.VERCEL_GIT_COMMIT_SHA||'')||
  typeof fetchImpl!=='function')
  error('EXACT_EXISTING_SIGNED_SHIFT_WORKER_REQUIRED');
 if(resumeEvent!==null&&(!UUID.test(resumeEvent.event_id||'')||
  !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(resumeEvent.source_ref||'')))
  error('EXACT_RESUME_EVENT_REQUIRED');
 let response;
 try{
  response=await fetchImpl(
   db.url+'/functions/v1/reality-signed-maintenance-repair-source-broker-v1',{
    method:'POST',cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(27000),
    headers:{apikey:db.secretKey,
     authorization:'Bearer '+db.secretKey,'content-type':'application/json'},
    body:JSON.stringify({mode:'case_ci',shift_id:shiftId,
     worker_run_id:workerRunId,release_sha:env.VERCEL_GIT_COMMIT_SHA,
     ...(resumeEvent?{resume_event_id:resumeEvent.event_id}:{})})
   });
 }catch{
  return safe('EXACT_SIGNED_CASE_CI_BROKER_TRANSPORT_UNVERIFIED');
 }
 if(!response?.ok)
  return safe('EXACT_SIGNED_CASE_CI_BROKER_PROOF_UNAVAILABLE');
 const r=await response.json().catch(()=>null);
 if(!r||Array.isArray(r)||r.ok!==true||
  r.source_read_only!==true||
  r.model_generated!==false||
  r.independent_frozen_red_verified!==false||
  r.repair_executed!==false||
  r.original_job_completed!==false||
  r.installation_authorized!==false||
  r.production_changed!==false||
  r.new_shift_started!==false)
  error('CASE_CI_SIGNED_BROKER_RESULT_INVALID');
 if([
  'NO_CURRENT_SIGNED_MAINTENANCE_CASE_CI_REVIEW_WARRANT',
  'NO_UNREVIEWED_SIGNED_MAINTENANCE_CASE_CI_SCOPE',
  'NO_PINNED_SIGNED_CASE_CI_GITHUB_RUN_YET',
  'NO_MATCHING_FROZEN_SOURCE_CASE_OR_PINNED_ARTIFACT',
  'NO_CURRENT_EXACT_CASE_CI_RESUME_EVENT'
 ].includes(r.status)&&r.case_specific_frozen_red_attested!==true)
  return safe(r.status,{reviewed_count:r.reviewed_count??0});
 if(r.status!=='EXACT_SIGNED_MAINTENANCE_SOURCE_CI_RED_GREEN_INDEPENDENTLY_ATTESTED'||
  r.shift_id!==shiftId||!UUID.test(r.maintenance_id||'')||
  (resumeEvent!==null&&(r.resume_event_id!==resumeEvent.event_id||r.source_ref!==resumeEvent.source_ref))||
  !Number.isSafeInteger(r.github_run_id)||r.github_run_id<1||
  !HASH.test(r.case_specific_ci_receipt_sha256||'')||
  r.case_specific_frozen_red_attested!==true||
  r.code_regression_green_verified!==true||
  r.repair_installed!==undefined&&r.repair_installed!==false)
  error('EXACT_MAINTENANCE_INDEPENDENT_FROZEN_RECEIPT_INVALID');
 return Object.freeze({
  status:r.status,shift_id:shiftId,maintenance_id:r.maintenance_id,
  github_run_id:r.github_run_id,
  case_specific_ci_receipt_sha256:r.case_specific_ci_receipt_sha256,
  case_specific_frozen_red_attested:true,
  code_regression_green_verified:true,
  original_customer_work_completed:false,
  repair_installed:false,repair_executed:false,
  original_job_completed:false,installation_authorized:false,
  production_changed:false,new_shift_started:false,
  next_action:'EXACT_SOURCE_PATCH_INDEPENDENT_REPAIR_AND_INSTALL_REVIEW_REQUIRED'
 });
}
