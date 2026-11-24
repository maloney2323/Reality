// Signed Final Loop continuation for the existing original obligation.
// This is NOT a second scheduler, executor, verifier or approval authority.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {projectRecoveryContractFromFinalLoop}
 from './reality-final-loop-proof-carrying-recovery-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const KEY=/^[A-Z][A-Z0-9_]{2,100}$/;
const CAP='REPRODUCE_CASE_SPECIFIC_FROZEN_RED';
const no=(status,extra={})=>Object.freeze({
 schema:'reality-signed-proof-recovery-continuation-v1',
 status,read_only:true,
 contract_frozen:false,claim_created:false,strategy_executed:false,
 original_job_completed:false,independent_red_verified:false,
 owner_approval_granted:false,production_changed:false,
 installation_authorized:false,external_effect_performed:false,
 next_governed_action:null,...extra
});
export async function advanceOneSignedProofRecovery({
 db,env=process.env,wake,graph,continuityReturn,stagedRoutes,
 ownerPackets,workerRunId,call=shiftRpc
}={}){
 const proposal=projectRecoveryContractFromFinalLoop({
  graph,continuityReturn,stagedRoutes,ownerPackets});
 if(proposal.status!=='RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE')
  return no('RECOVERY_SOURCE_PROOF_NOT_QUALIFIED_FOR_CONTRACT',{
   proof_status:proposal.status});
 const c=proposal.contract_candidate;
 // The existing shared benchmark may propose/inspect but may NEVER
 // freeze or execute a recovery. Require a separately isolated DB/project
 // plus the current signed release and one-use lease.
 const isolated=env.VERCEL_ENV==='preview'&&
  env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'&&
  env.REALITY_FINAL_LOOP_PROOF_RECOVERY_ENABLED==='true'&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED==='true'&&
  env.REALITY_SIGNED_WORKER_RELEASE_ATTESTATION_ENABLED==='true'&&
  typeof env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF==='string'&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF.length>0&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF!==
   env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF&&
  db?.strictSecrets===true&&
  db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&
  db.project===env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF&&
  wake?.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
  wake.shift_id===graph.shift_id&&
  UUID.test(workerRunId||'')&&UUID.test(graph.owner_id||'')&&
  UUID.test(graph.shift_id||'')&&
  typeof call==='function';
 if(!isolated)
  return no('RECOVERY_PROOF_CONTRACT_PREPARED_ISOLATED_EXECUTOR_NOT_ACTIVATED',{
   obligation_id:c.obligation_id,contract_id:c.contract_id,
   next_required_proof:'RED',missing_registered_capability:CAP,
   next_governed_action:'VERIFY_ISOLATED_SIGNED_RECOVERY_RELEASE_AND_CAPABILITY'});
 // Never blindly replay a write when its transport outcome is unknown:
 // first read its exact immutable identity from the isolated DB.
 let durable;
 try{
  durable=await call(db,'reality_read_final_loop_recovery_contract_v1',{
   p_shift_id:graph.shift_id,p_obligation_id:c.obligation_id},{timeoutMs:6000});
 }catch{
  return no('RECOVERY_DURABLE_CONTRACT_READ_UNAVAILABLE_NO_RETRY',{
   contract_id:c.contract_id,next_governed_action:'RECONCILE_EXACT_CONTRACT_READBACK'});
 }
 if(durable?.status==='RECOVERY_NO_DURABLE_CONTRACT'){
  let receipt;
  try{
   receipt=await call(db,'reality_freeze_final_loop_recovery_contract_v1',{
    p_shift_id:graph.shift_id,p_original_work_id:c.obligation_id,
    p_worker_run_id:workerRunId,p_contract:c
   },{timeoutMs:6000});
  }catch{
   return no('RECOVERY_FREEZE_OUTCOME_UNCERTAIN_NO_REPLAY',{
    contract_id:c.contract_id,next_governed_action:'RECONCILE_EXACT_CONTRACT_READBACK'});
  }
  if(receipt?.status!=='RECOVERY_CONTRACT_ATOMIC_FREEZE_RECORDED'||
    receipt.contract_id!==c.contract_id||
    receipt.obligation_id!==c.obligation_id||
    receipt.continuity_root_id!==c.continuity_root_id||
    !HASH.test(receipt.freeze_receipt_sha256||'')||
    receipt.execution_authorized!==false||
    receipt.original_job_completed!==false||
    receipt.production_changed!==false)
   return no('RECOVERY_ATOMIC_FREEZE_REJECTED_NO_EFFECT',{
    contract_id:c.contract_id,freeze_status:KEY.test(receipt?.status||'')?
     receipt.status:'UNVERIFIED',
    next_governed_action:'RECONCILE_SIGNED_FROZEN_CONTRACT_WARRANT'});
  try{
   durable=await call(db,'reality_read_final_loop_recovery_contract_v1',{
    p_shift_id:graph.shift_id,p_obligation_id:c.obligation_id},{timeoutMs:6000});
  }catch{
   return no('RECOVERY_FREEZE_COMMITTED_READBACK_REQUIRED',{
    contract_id:c.contract_id,next_governed_action:'RECONCILE_EXACT_CONTRACT_READBACK'});
  }
 }
 if(durable?.status!=='RECOVERY_CONTRACT_SIGNED_OWNER_READBACK'||
  durable.contract_id!==c.contract_id||
  durable.contract?.contract_id!==c.contract_id||
  durable.contract?.obligation_id!==c.obligation_id||
  durable.contract?.source_revision!==c.source_revision||
  durable.contract?.continuity_head_sha256!==c.continuity_head_sha256||
  durable.durableFreeze?.status!=='RECOVERY_CONTRACT_ATOMIC_FREEZE_VERIFIED'||
  durable.durableFreeze.contract_id!==c.contract_id||
  !HASH.test(durable.durableFreeze.freeze_receipt_sha256||'')||
  durable.durableFreeze.independently_observed!==true||
  durable.read_only!==true||
  durable.execution_authorized!==false||
  durable.original_job_completed!==false)
  return no('RECOVERY_FROZEN_CONTRACT_INDEPENDENT_READBACK_MISMATCH',{
   contract_id:c.contract_id,next_governed_action:'RECHECK_CANONICAL_CONTINUITY_HEAD'});
 // Already frozen and returned on this worker. The missing capability is
 // a next action; approval for READ_ONLY_INTERNAL_PR_REVIEW is NOT a warrant
 // to install test harnesses or source changes.
 let cap;
 try{cap=await call(db,'reality_read_final_loop_recovery_capability_v1',{
  p_capability_id:CAP},{timeoutMs:6000});}
 catch{
  return no('RECOVERY_CAPABILITY_REGISTERED_READBACK_UNAVAILABLE',{
   contract_id:c.contract_id,contract_frozen:true,
   freeze_receipt_sha256:durable.durableFreeze.freeze_receipt_sha256,
   next_governed_action:'RECONCILE_REGISTERED_CAPABILITY_EVIDENCE'});
 }
 if(cap?.status!=='RECOVERY_CAPABILITY_SIGNED_REGISTRATION_EXISTS'||
  cap.capability_id!==CAP||
  cap.effect_kind!=='EVIDENCE_ONLY_FROZEN_CI_REPRODUCTION'||
  !HASH.test(cap.registration_receipt_sha256||''))
  return no('RECOVERY_CAPABILITY_ACQUISITION_REQUIRED',{
   contract_id:c.contract_id,contract_frozen:true,
   freeze_receipt_sha256:durable.durableFreeze.freeze_receipt_sha256,
   next_required_proof:'RED',missing_registered_capability:CAP,
   next_governed_action:'ROUTE_MISSING_CAPABILITY_TO_EXISTING_GOVERNED_ACQUISITION'});
 // A verified registered capability only makes an exact claim CANDIDATE.
 // The existing signed executor must independently validate a source/epoch
 // strategy, hard budget, warrant, and actual provider proof before claim.
 return no('RECOVERY_SIGNED_CAPABILITY_STRATEGY_PROOF_REQUIRED',{
  contract_id:c.contract_id,contract_frozen:true,
  freeze_receipt_sha256:durable.durableFreeze.freeze_receipt_sha256,
  next_required_proof:'RED',registered_capability:CAP,
  next_governed_action:'INDEPENDENTLY_ATTEST_STRATEGY_ENVIRONMENT_AND_BUDGET'});
}
