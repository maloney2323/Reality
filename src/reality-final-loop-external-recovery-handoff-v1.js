// Connect external failure observation to Reality's existing signed
// Continuity admission and governed recovery capability. No second executor.
import {observeExternalInfrastructureBlocker} from './reality-final-loop-external-infrastructure-observer-v1.js';
const safe=(status,extra={})=>Object.freeze({
 schema:'reality-final-loop-external-recovery-handoff-v1',status,
 repair_executed:false,continuation_verified:false,production_changed:false,
 ...extra
});
export async function admitExternalFailureToReality({
 observation,verifyProvider,admitToContinuity,readContinuityReceipt,
 requestSignedRecovery,scope
}={}){
 const candidate=observeExternalInfrastructureBlocker(observation);
 if(candidate.status!=='EXTERNAL_INFRA_RECOVERY_OBSERVATION_CANDIDATE')
  return safe(candidate.status);
 if(typeof verifyProvider!=='function'||typeof admitToContinuity!=='function'||
  typeof readContinuityReceipt!=='function'||typeof requestSignedRecovery!=='function')
  return safe('EXTERNAL_INFRA_REGISTERED_HANDLERS_MISSING',{
   next_governed_action:'REGISTER_EXISTING_SIGNED_CONTINUITY_AND_RECOVERY_HANDLERS'
  });
 if(scope?.project_ref!==candidate.project_ref||
    scope?.parent_project_ref!==candidate.parent_project_ref||
    scope?.isolated!==true||scope?.production===true)
  return safe('EXTERNAL_INFRA_ISOLATION_SCOPE_UNVERIFIED');
 let provider;
 try{provider=await verifyProvider(candidate)}catch{
  return safe('EXTERNAL_INFRA_PROVIDER_READBACK_UNAVAILABLE_NO_REPLAY');
 }
 if(provider?.independent_verified!==true||
    provider.project_ref!==candidate.project_ref||
    provider.branch_status!==candidate.branch_status||
    provider.source_receipt_sha256!==candidate.source_receipt_sha256)
  return safe('EXTERNAL_INFRA_PROVIDER_PROOF_MISMATCH');
 let admitted;
 try{admitted=await admitToContinuity({
  candidate,provider,scope,kind:'EXTERNAL_INFRA_BLOCKER',
  idempotency_key:candidate.source_receipt_sha256
 })}catch{
  return safe('EXTERNAL_INFRA_ADMISSION_OUTCOME_UNCERTAIN_READBACK_REQUIRED');
 }
 if(typeof admitted?.event_id!=='string'||!admitted.event_id)
  return safe('EXTERNAL_INFRA_DURABLE_EVENT_NOT_CONFIRMED');
 let receipt;
 try{receipt=await readContinuityReceipt(admitted.event_id)}catch{
  return safe('EXTERNAL_INFRA_CONTINUITY_READBACK_UNAVAILABLE_NO_REPLAY');
 }
 if(receipt?.independent_verified!==true||
    receipt.event_id!==admitted.event_id||
    receipt.source_receipt_sha256!==candidate.source_receipt_sha256||
    receipt.project_ref!==candidate.project_ref||
    receipt.state!=='OPEN')
  return safe('EXTERNAL_INFRA_CONTINUITY_EVENT_NOT_VERIFIED');
 let recovery;
 try{recovery=await requestSignedRecovery({
  event_id:admitted.event_id,source_receipt_sha256:candidate.source_receipt_sha256,
  scope,action:candidate.next_governed_action,
  diagnostic_only:true,mutation_authorized:false
 })}catch{
  return safe('EXTERNAL_INFRA_RECOVERY_WAKE_UNCERTAIN_READBACK_REQUIRED',{
   event_id:admitted.event_id
  });
 }
 return safe('EXTERNAL_INFRA_SIGNED_DIAGNOSTIC_REQUESTED',{
  event_id:admitted.event_id,
  recovery_status:recovery?.status||'UNVERIFIED',
  next_governed_action:'INDEPENDENTLY_VERIFY_DIAGNOSIS_THEN_REQUIRE_EXACT_REPAIR_WARRANT'
 });
}
