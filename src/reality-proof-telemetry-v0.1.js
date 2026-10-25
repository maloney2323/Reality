// Receipt-derived telemetry; never score model or customer performance from
// scripted execution, a model's self-report, or unadjudicated observations.
import {verifyFullLoopProofReceipts} from './reality-full-loop-sandbox-proof-v0.1.js';
export const PROOF_TELEMETRY_VERSION='reality-proof-telemetry-v0.1';
const rate=(n,d)=>d>0?Number((100*n/d).toFixed(1)):null;
const int=flag=>flag?1:0;
export function scoreFullLoopProof(result){
  if(!result||typeof result!=='object')throw Error('PROOF_RESULT_REQUIRED');
  const events=result.receipts||result.steps||[];
  const chain_ok=verifyFullLoopProofReceipts(events);
  const find=(step)=>events.filter(e=>e.step===step);
  const discovered=find('WORK_DISCOVERED');
  const attempted=find('ORIGINAL_WORK_RETRIED');
  const claimed=attempted.filter(e=>e.detail?.completed_in_sandbox===true);
  const reconstructed=find('INDEPENDENT_SANDBOX_RECONSTRUCTION')
    .filter(e=>e.detail?.verified===true);
  const continued=find('CONTINUED_FROM_VERIFIED_UNIVERSE');
  const verified=chain_ok&&result.status==='CLOSED_LOOP_VERIFIED_SANDBOX'&&
    result.independent_sandbox_readback_verified===true&&
    result.ephemeral_universe_updated===true&&result.cognition_resumed===true&&
    attempted.length===1&&claimed.length===1&&reconstructed.length===1&&
    continued.length===1&&
    attempted[0].detail?.original_work_id===discovered[0]?.detail?.work_id&&
    reconstructed[0].detail?.original_work_id===discovered[0]?.detail?.work_id&&
    continued[0].detail?.original_work_id===discovered[0]?.detail?.work_id;
  const claimed_success=chain_ok?claimed.length:0;
  const accepted_success=verified?1:0;
  const unverified_claims=chain_ok?Math.max(0,claimed_success-accepted_success):null;
  const blocked=!attempted.length && (find('APPROVAL_NEEDED').length>0||
    find('ORIGINAL_WORK_BLOCKED').length>0);
  return Object.freeze({
    version:PROOF_TELEMETRY_VERSION,
    evidence_scope:'EPHEMERAL_SANDBOX_RECONSTRUCTION',
    claims_about_customer_world_allowed:false,
    receipt_chain_valid:chain_ok,
    receipts_inspected:events.length,
    head_hash:chain_ok?events.at(-1)?.hash||null:null,
    eligible_discovered_items:chain_ok?discovered.length:0,
    attempted_retries:chain_ok?attempted.length:0,
    attempted_completion_claims:chain_ok?claimed_success:0,
    verified_sandbox_recoveries:accepted_success,
    unresolved_completion_claims:unverified_claims,
    proof_divergence_rate_pct:chain_ok?rate(unverified_claims,claimed_success):null,
    verified_recovery_yield_pct:chain_ok?rate(accepted_success,attempted.length):null,
    authorization_blocked_before_execution:chain_ok&&blocked,
    independently_verified_external_outcomes:0,
    original_model_self_report_claims:0,
    actual_model_calls:0,
    actual_tokens_spent:null,
    tokens_per_verified_customer_recovery:null,
    actual_human_touches:null,
    asri_zero_touch_verified_business_resolution_pct:null,
    measured_customer_supervision_minutes_saved:null,
    independently_adjudicated_customer_hallucination_rate_pct:null,
    independently_adjudicated_customer_drift_rate_pct:null,
    shadow_competitor_runs:0,
    shadow_competitor_divergence_rate_pct:null,
    bitemporal_source_effective_time:null,
    bitemporal_source_assertion_time:null,
    receipt_hash_is_signature:false,
    immutable_external_anchor_verified:false,
    no_false_zero_claims:true,
    limitations:[
      'All simulated-authority and outcome measurements describe only the ephemeral sandbox.',
      'A model-success hallucination rate needs actual model self-reports and independently authenticated provider readback; none occurred here.',
      'A hash-linked receipt without an external immutable anchor or signature does not prove non-repudiation.',
      'Real customer ASRI, supervision savings, time/tokens per resolution and competitor comparison are unmeasured.',
    ],
  });
}
export function summarizeProofTelemetry(runs=[]){
  if(!Array.isArray(runs))throw Error('PROOF_TELEMETRY_RUNS_ARRAY_REQUIRED');
  const valid=runs.filter(r=>r?.receipt_chain_valid===true&&
    r?.evidence_scope==='EPHEMERAL_SANDBOX_RECONSTRUCTION');
  const sum=key=>valid.reduce((n,r)=>n+(Number.isSafeInteger(r[key])?r[key]:0),0);
  const attempted=sum('attempted_retries'),success=sum('verified_sandbox_recoveries');
  const claims=sum('attempted_completion_claims'),unverified=sum('unresolved_completion_claims');
  return Object.freeze({
    scope:'CURRENT_PAGE_SESSION_ONLY_NOT_DURABLE_OR_CUSTOMER_VALIDATED',
    run_count:runs.length,
    valid_receipt_chains:valid.length,
    rejected_unverified_runs:runs.length-valid.length,
    sandbox_retries_attempted:attempted,
    sandbox_recoveries_verified:success,
    sandbox_recovery_yield_pct:rate(success,attempted),
    sandbox_completion_claims:claims,
    unverified_sandbox_completion_claims:unverified,
    sandbox_readback_divergence_pct:rate(unverified,claims),
    competitor_failure_rate_pct:null,
    real_customer_asri_pct:null,
    real_supervision_minutes_saved:null,
    real_hallucination_rate_pct:null,
  });
}
