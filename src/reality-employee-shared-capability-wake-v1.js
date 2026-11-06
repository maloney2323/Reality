// Riley uses Reality's existing governed capability-worker wake.
// This is a trigger only, never an installation or a new job.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {dispatchGenuineCapabilityWake} from './reality-genuine-capability-github-wakeup-v1.js';
export const RILEY_SHARED_WAKE_VERSION='reality-riley-shared-capability-wake-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const PROOF=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/;
const err=code=>{throw Error('RILEY_SHARED_WAKE_'+code)};
const verdict=(status,extra={})=>Object.freeze({
 version:RILEY_SHARED_WAKE_VERSION,status,
 employee:'Riley',production_changed:false,
 installation_authorized:false,original_job_completed:false,
 new_job_created:false,model_invoked:false,
 worker_execution_acknowledged:false,verified_human_hours_saved:null,
 ...extra
});
export async function wakeExistingRileyCapabilityJob({
 db,reconciliation,fetchImpl=fetch,
 read=async({db,shift_id,original_work_id,trigger_id})=>shiftRpc(
  db,'reality_read_shift_capability_wake_v1',
  {p_shift_id:shift_id,p_original_work_id:original_work_id,p_trigger_id:trigger_id},
  {fetchImpl}),
 dispatch=dispatchGenuineCapabilityWake
}={}){
 if(reconciliation?.status!=='EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED'||
  reconciliation?.governed_existing_work_status!==
   'EXISTING_AUTHORIZED_ORIGINAL_REUSED_READ_ONLY')
  return verdict('NO_EXACT_ACTIVE_ORIGINAL_JOB_TO_WAKE');
 if(!db||typeof read!=='function'||typeof dispatch!=='function'||
  !UUID.test(reconciliation.shift_id||'')||
  !WORK.test(reconciliation.governed_original_work_id||'')||
  !UUID.test(reconciliation.governed_trigger_id||'')||
  !ISSUE.test(reconciliation.shift_observation_source_ref||'')||
  !PROOF.test(reconciliation.shift_observation_proof_sha256||'')||
  reconciliation.governed_cycle_dispatched_by_shift!==false||
  reconciliation.model_invoked_by_shift!==false||
  reconciliation.new_customer_job_created!==false||
  reconciliation.installation_authorized!==false||
  reconciliation.production_changed!==false)
  err('RECONCILED_SCOPE_UNTRUSTED');
 const evidence=await read({
  db,shift_id:reconciliation.shift_id,
  original_work_id:reconciliation.governed_original_work_id,
  trigger_id:reconciliation.governed_trigger_id
 });
 if(evidence?.status==='NO_ELIGIBLE_SHIFT_CAPABILITY_WAKE')
  return verdict('EXISTING_JOB_NOT_READY_FOR_NEW_WAKE',{
   shift_id:reconciliation.shift_id,dispatch_attempted:false});
 if(evidence?.status!=='EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE'||
  evidence.shift_id!==reconciliation.shift_id||
  evidence.original_work_id!==reconciliation.governed_original_work_id||
  evidence.trigger_id!==reconciliation.governed_trigger_id||
  evidence.source_ref!==reconciliation.shift_observation_source_ref||
  evidence.source_proof_sha256!==reconciliation.shift_observation_proof_sha256||
  !UUID.test(evidence.source_event_id||'')||
  evidence.existing_job_only!==true||
  evidence.installation_authorized!==false||
  evidence.production_changed!==false||
  evidence.original_job_completed!==false)
  err('INDEPENDENT_PREWAKE_READBACK_MISMATCH');
 const wake=await dispatch({
  trigger_id:evidence.trigger_id,
  source_event_id:evidence.source_event_id,
  original_work_id:evidence.original_work_id
 });
 if(wake?.dispatched!==true||
  wake.trigger_id!==evidence.trigger_id||
  wake.source_event_id!==evidence.source_event_id||
  wake.original_work_id!==evidence.original_work_id||
  wake.installation_authorized!==false||
  wake.production_changed!==false)
  err('WAKE_PROVIDER_RECEIPT_UNVERIFIED');
 return verdict('EXISTING_REALITY_CAPABILITY_WAKE_RECORDED',{
  shift_id:evidence.shift_id,original_work_id:evidence.original_work_id,
  trigger_id:evidence.trigger_id,dispatch_attempted:true,
  dispatch_existing_idempotent:wake.existing===true,
  provider_commit_sha:/^[a-f0-9]{40}$/.test(wake.worker_commit_sha||'')?
   wake.worker_commit_sha:null
 });
}
