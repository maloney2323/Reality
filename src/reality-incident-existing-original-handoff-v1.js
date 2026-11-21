// Existing watch-dog incident -> EXISTING owner-authorized original recovery.
// This is the missing governed handoff, NOT a second executor or an admission
// to a new job. A service-only DB independently joins the exact failure run,
// consumed original approval, active original and signed provider observation.
// The existing original recovery RPC alone can preserve a continuation.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const safe=(status,rest={})=>Object.freeze({
 status,...rest,original_job_created:false,
 repair_executed:false,installation_authorized:false,
 production_changed:false
});
export async function advanceExistingOwnerIncidentOriginal({
 db,env=process.env,call=shiftRpc,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  typeof call!=='function')throw Error('INCIDENT_ORIGINAL_SIGNED_PREVIEW_WORKER_REQUIRED');
 const claim=await call(db,'reality_claim_next_incident_original_handoff_v1',{},
  {fetchImpl});
 if(claim?.status==='NO_EXISTING_OWNER_INCIDENT_ORIGINAL_ELIGIBLE'&&
  claim.original_job_created===false&&claim.repair_executed===false&&
  claim.installation_authorized===false&&claim.production_changed===false)
  return safe('NO_EXISTING_OWNER_INCIDENT_ORIGINAL_ELIGIBLE');
 if(claim?.status!=='EXISTING_OWNER_INCIDENT_ORIGINAL_CLAIMED'||
   !UUID.test(claim.owner_id||'')||!UUID.test(claim.incident_id||'')||
   !UUID.test(claim.observation_id||'')||
   !WORK.test(claim.original_work_id||'')||
   !/^[a-f0-9]{64}$/.test(claim.source_error_fingerprint||'')||
   claim.original_job_created!==false||claim.repair_executed!==false||
   claim.installation_authorized!==false||claim.production_changed!==false)
  throw Error('INCIDENT_ORIGINAL_INDEPENDENT_CLAIM_MISMATCH');
 const {owner_id,incident_id,observation_id,original_work_id}=claim;
 try{
  // This RPC rechecks the existing original's owner, frozen failure, approved
  // isolated installation and unsettled continuation; it cannot mint a new
  // owner approval or retry a provider write.
  const prior=await call(db,'reality_commit_genuine_original_recovery_v1',{
   p_observation_id:observation_id
  },{fetchImpl});
  if(prior?.status!=='EXISTING_ORIGINAL_RECOVERY_OBLIGATION_PRESERVED'||
   prior.owner_id!==owner_id||prior.original_work_id!==original_work_id||
   prior.observation_id!==observation_id||
   !UUID.test(prior.recovery_id||'')||
   prior.must_preserve_original_job!==true||
   prior.allow_safe_reconciliation_without_new_approval!==true||
   prior.owner_approval_for_new_install_still_required!==true||
   prior.retry_external_effects_authorized!==false||
   prior.model_generation_authorized!==false||
   prior.new_customer_job_created!==false||
   prior.original_job_completed!==false||
   prior.installation_authorized!==false||
   prior.production_changed!==false)
   throw Error('INCIDENT_ORIGINAL_EXISTING_RECOVERY_PROOF_UNVERIFIED');
  const receipt=await call(db,'reality_record_incident_original_handoff_v1',{
   p_owner_id:owner_id,p_incident_id:incident_id,
   p_observation_id:observation_id,
   p_original_work_id:original_work_id,
   p_existing_recovery_id:prior.recovery_id
  },{fetchImpl});
  if(receipt?.status!=='OWNER_INCIDENT_EXISTING_ORIGINAL_RECOVERY_PRESERVED'||
   receipt.owner_id!==owner_id||receipt.incident_id!==incident_id||
   receipt.original_work_id!==original_work_id||
   receipt.existing_recovery_id!==prior.recovery_id||
   !HASH.test(receipt.proof_sha256||'')||
   receipt.original_job_created!==false||
   receipt.repair_executed!==false||
   receipt.installation_authorized!==false||
   receipt.production_changed!==false)
   throw Error('INCIDENT_ORIGINAL_DURABLE_HANDOFF_PROOF_MISMATCH');
  return safe(receipt.status,{
   incident_id,original_work_id,
   existing_recovery_id:prior.recovery_id,
   proof_sha256:receipt.proof_sha256,
   next_action:'CONTINUE_EXACT_EXISTING_GOVERNED_ORIGINAL_REPAIR_AND_VERIFY',
   same_original_recovery_preserved:true
  });
 }catch{
  // No automatic second claim, new job, installation or external retry.
  try{await call(db,'reality_fail_incident_original_handoff_v1',{
   p_owner_id:owner_id,p_incident_id:incident_id,
   p_observation_id:observation_id
  },{fetchImpl})}catch{}
  return safe('INCIDENT_EXISTING_ORIGINAL_PROOF_FAILED_OWNER_REVIEW',{
   incident_id,original_work_id,
   next_action:'PRESENT_EXACT_MISSING_ORIGINAL_PROOF_IN_OWNER_CHAT',
   same_original_recovery_preserved:false
  });
 }
}
