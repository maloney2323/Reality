// Attach the independently observed technical CI artifact to the SAME
// frozen Final Loop contract. This is one service-only evidence write inside
// the existing signed worker, never a second scheduler or repair executor.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
export const TECHNICAL_CI_CONTINUITY_WRITER_VERSION=
 'reality-final-loop-technical-ci-continuity-writer-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const GIT=/^[a-f0-9]{40}$/;
const providerId=n=>Number.isSafeInteger(n)&&n>0;
const out=(status,extra={})=>Object.freeze({
 schema:TECHNICAL_CI_CONTINUITY_WRITER_VERSION,status,
 source_bound_evidence_only:true,technical_observation_recorded:false,
 original_business_red_verified:false,original_job_claim_admitted:false,
 original_job_completed:false,original_settled:false,
 independent_next_action_executed:false,
 repair_executed:false,execution_authorized:false,
 installation_authorized:false,production_changed:false,
 original_obligation_open:true,new_shift_started:false,
 ...extra
});
export async function attachVerifiedTechnicalCiToContinuity({
 db,env=process.env,wake,workerRunId,contractProposal,
 signedRecovery,technicalCiProviderProof,call=shiftRpc
}={}){
 const c=contractProposal?.contract_candidate;
 const p=technicalCiProviderProof;
 if(p?.status!=='RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING'||
  p.independent_technical_ci_verified!==true||
  p.frozen_technical_red_verified!==true||
  p.original_business_case_red_verified!==false||
  p.original_job_completed!==false||
  p.execution_authorized!==false||
  p.production_changed!==false||
  p.contract_id!==c?.contract_id||
  p.source_ref!==c?.source_ref||
  p.source_revision!==c?.source_revision||
  p.shift_id!==c?.shift_id||
  p.owner_id!==c?.owner_id||
  p.obligation_id!==c?.obligation_id||
  !HASH.test(p.github_artifact_digest||'')||
  !HASH.test(c?.contract_id||'')||
  !UUID.test(c?.continuity_root_id||'')||
  !UUID.test(p.maintenance_id||'')||
  !providerId(p.github_run_id)||!providerId(p.github_job_id)||
  !providerId(p.github_artifact_id)||
  !GIT.test(p.github_release_sha||'')||
  !GIT.test(p.signed_case_spec_git_blob_sha||''))
  return out('RECOVERY_TECH_CI_EXTERNAL_EVIDENCE_STILL_PENDING');
 const exact={contract_id:c.contract_id,obligation_id:c.obligation_id,
  source_ref:c.source_ref,shift_id:c.shift_id,owner_id:c.owner_id,
  continuity_root_id:c.continuity_root_id,maintenance_id:p.maintenance_id,
  github_run_id:p.github_run_id,github_artifact_digest:p.github_artifact_digest};
 // Critical: a previously approved internal review is NOT authority to
 // write evidence to the shared/production database or install a patch.
 const isolated=env.VERCEL_ENV==='preview'&&
  env.REALITY_FINAL_LOOP_PROOF_RECOVERY_ENABLED==='true'&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED==='true'&&
  env.REALITY_SIGNED_WORKER_RELEASE_ATTESTATION_ENABLED==='true'&&
  typeof env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF==='string'&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF.length>0&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF!==
    env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF&&
  db?.strictSecrets===true&&db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&
  db.project===env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF&&
  signedRecovery?.contract_id===c.contract_id&&
  signedRecovery.contract_frozen===true&&
  HASH.test(signedRecovery.freeze_receipt_sha256||'')&&
  wake?.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
  wake.shift_id===c.shift_id&&
  UUID.test(workerRunId||'')&&typeof call==='function';
 if(!isolated)
  return out('RECOVERY_TECH_CI_PROVIDER_PROOF_READY_ISOLATED_ATTESTATION_REQUIRED',{
   ...exact,next_governed_action:'VERIFY_ISOLATED_SIGNED_RECOVERY_RELEASE_AND_RECORD_TECHNICAL_PROOF'});
 const read=()=>call(db,'reality_read_final_loop_technical_ci_observation_v1',{
  p_contract_id:c.contract_id},{timeoutMs:6000});
 let existing;
 try{existing=await read()}catch{
  return out('RECOVERY_TECH_CI_DURABLE_READBACK_UNAVAILABLE_NO_WRITE',{...exact});
 }
 const match=r=>r?.status==='RECOVERY_TECHNICAL_CI_SOURCE_BOUND_OBSERVATION_RECORDED'&&
  r.contract_id===c.contract_id&&
  r.obligation_id===c.obligation_id&&
  r.source_ref===c.source_ref&&
  r.source_revision===c.source_revision&&
  r.shift_id===c.shift_id&&r.owner_id===c.owner_id&&
  r.continuity_root_id===c.continuity_root_id&&
  r.maintenance_id===p.maintenance_id&&
  r.github_job_id===p.github_job_id&&
  r.signed_case_spec_git_blob_sha===p.signed_case_spec_git_blob_sha&&
  r.technical_ci_independently_observed===true&&r.read_only===true&&
  r.github_run_id===p.github_run_id&&
  r.github_artifact_digest===p.github_artifact_digest&&
  r.github_artifact_id===p.github_artifact_id&&
  r.github_release_sha===p.github_release_sha&&
  HASH.test(r.observation_receipt_sha256||'')&&
  r.business_original_red_verified===false&&
  r.original_job_completed===false&&
  r.execution_authorized===false&&
  r.production_changed===false;
 if(existing?.status!=='RECOVERY_TECHNICAL_CI_NOT_DURABLY_OBSERVED')
  return match(existing)?
   out('RECOVERY_TECH_CI_DURABLE_OBSERVATION_ALREADY_RECONCILED',{
    ...exact,technical_observation_recorded:true,
    observation_receipt_sha256:existing.observation_receipt_sha256,
    next_governed_action:'INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED'}):
   out('RECOVERY_TECH_CI_EXISTING_RECORD_MISMATCH_NO_REPLAY',{...exact});
 let recorded;
 try{
  recorded=await call(db,'reality_record_final_loop_technical_ci_observation_v1',{
   p_contract_id:c.contract_id,p_worker_run_id:workerRunId,
   p_proof:p
  },{timeoutMs:6000});
 }catch{
  return out('RECOVERY_TECH_CI_WRITE_OUTCOME_UNCERTAIN_NO_REPLAY',{
   ...exact,next_governed_action:'RECONCILE_SAME_TECHNICAL_CI_OBSERVATION_RECEIPT'});
 }
 if(recorded?.status!=='RECOVERY_TECHNICAL_CI_OBSERVATION_ATOMICALLY_RECORDED'||
  recorded.contract_id!==c.contract_id||
  recorded.obligation_id!==c.obligation_id||
  recorded.github_artifact_digest!==p.github_artifact_digest||
  !HASH.test(recorded.observation_receipt_sha256||'')||
  recorded.business_original_red_verified!==false||
  recorded.original_job_completed!==false||
  recorded.execution_authorized!==false)
  return out('RECOVERY_TECH_CI_ATOMIC_RECORD_REJECTED_OR_UNVERIFIED',{...exact});
 let after;
 try{after=await read()}catch{
  return out('RECOVERY_TECH_CI_WRITE_RECORDED_INDEPENDENT_READBACK_REQUIRED',{...exact});
 }
 // The independent read must confirm the very receipt returned by the
 // atomic writer, not merely another receipt with a well-formed digest.
 if(!match(after)||after.observation_receipt_sha256!==recorded.observation_receipt_sha256)
  return out('RECOVERY_TECH_CI_POSTWRITE_READBACK_MISMATCH',{...exact});
 return out('RECOVERY_TECH_CI_OBSERVATION_DURABLY_RECONCILED',{
  ...exact,technical_observation_recorded:true,
  observation_receipt_sha256:after.observation_receipt_sha256,
  next_governed_action:'INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED'});
}
