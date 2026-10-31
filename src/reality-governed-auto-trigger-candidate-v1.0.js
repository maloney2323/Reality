// Advance a source-backed original job automatically when a real independently
// verified candidate already exists. Runs in the signed-in, owner-authorized
// original investigation request; NO new UI candidate-preparation button.
import {prepareVerifiedOwnerRepairCandidate}
 from './reality-owner-repair-candidate-admission-v1.0.js';
import {claimOriginalJobCapabilityAutoTrigger}
 from './reality-governed-auto-trigger-v1.0.js';

const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const fail=code=>{throw Error('AUTO_TRIGGER_CANDIDATE_'+code)};
export async function autoPrepareOriginalJobCandidate({
 session,trigger,originalWorkId,issueNumber,env=process.env,
 prepare=prepareVerifiedOwnerRepairCandidate,
 claim=claimOriginalJobCapabilityAutoTrigger,
}={}){
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_GOVERNED_AUTO_TRIGGER_ENABLED!=='true'||
    !session?.user_id||!WORK.test(originalWorkId)||
    !Number.isSafeInteger(issueNumber)||issueNumber<1||
    !UUID.test(trigger?.trigger_id)||
    trigger.original_work_id!==originalWorkId||
    trigger.status!=='PENDING_VERIFIED_GAP_REOBSERVATION'||
    trigger.installation_authorized!==false||
    trigger.original_job_completed!==false)
  fail('OWNER_SOURCE_BACKED_UNCLAIMED_TRIGGER_REQUIRED');
 // This existing service reobserves the candidate source, original failed
 // GitHub run, independent Docker acceptance, owner-goal epoch, and persists
 // every constitutional transition. A missing candidate is NOT an approval.
 const ready=await prepare({
  session,expectedOriginalWorkId:originalWorkId,issueNumber,env,
 });
 if(ready?.status!=='EXACT_CANDIDATE_AWAITING_SIGNED_OWNER_INSTALL_APPROVAL'||
    ready.original_work_id!==originalWorkId||
    ready.independent_readback_verified!==true||
    !HASH.test(ready.candidate_artifact_hash)||
    !HASH.test(ready.constitutional_checkpoint_hash)||
    ready.owner_installation_approved!==false||
    ready.original_job_completed!==false||
    ready.production_changed!==false)
  fail('INDEPENDENT_CONSTITUTIONAL_READBACK_REQUIRED');
 // Claim the durable trigger once the existing source and checkpoint are
 // independently verified, not before. A transient provider failure must
 // not burn a one-time trigger or silently claim that work finished.
 const receipt=await claim({
  session,triggerId:trigger.trigger_id,originalWorkId,env,
 });
 if(receipt.original_work_id!==originalWorkId||
    receipt.phase!=='CLAIMED_FOR_INDEPENDENT_INVESTIGATION'||
    receipt.installation_authorized!==false||
    receipt.original_job_completed!==false)
  fail('ONE_TIME_CLAIM_READBACK_REQUIRED');
 return Object.freeze({
  status:'AUTO_TRIGGER_VERIFIED_REPAIR_AWAITING_OWNER_INSTALL_APPROVAL',
  original_work_id:originalWorkId,
  trigger_id:trigger.trigger_id,
  atomic_claim_ref:receipt.claim_id,
  candidate_artifact_hash:ready.candidate_artifact_hash,
  constitutional_checkpoint_hash:ready.constitutional_checkpoint_hash,
  independent_test_run_id:ready.independent_test_run_id,
  original_provider_failed_run_id:ready.original_provider_failed_run_id,
  source_files:ready.source_files,
  owner_action_required:true,
  installation_authorized:false,installed:false,
  original_job_completed:false,production_changed:false,
  new_customer_job_created:false,
 });
}
