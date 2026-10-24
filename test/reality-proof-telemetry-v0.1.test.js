import test from 'node:test';
import assert from 'node:assert/strict';
import {runFullLoopSandboxProof} from '../src/reality-full-loop-sandbox-proof-v0.1.js';
import {scoreFullLoopProof,summarizeProofTelemetry} from '../src/reality-proof-telemetry-v0.1.js';

test('receipt-derived sandbox completion is distinct from customer and model success',async()=>{
  const result=await runFullLoopSandboxProof();
  const t=scoreFullLoopProof(result);
  assert.equal(t.receipt_chain_valid,true);
  assert.equal(t.eligible_discovered_items,1);
  assert.equal(t.attempted_retries,1);
  assert.equal(t.attempted_completion_claims,1);
  assert.equal(t.verified_sandbox_recoveries,1);
  assert.equal(t.proof_divergence_rate_pct,0);
  assert.equal(t.verified_recovery_yield_pct,100);
  assert.equal(t.independently_verified_external_outcomes,0);
  assert.equal(t.independently_adjudicated_customer_hallucination_rate_pct,null);
  assert.equal(t.shadow_competitor_divergence_rate_pct,null);
  assert.equal(t.asri_zero_touch_verified_business_resolution_pct,null);
  assert.equal(t.actual_tokens_spent,null);
  assert.equal(t.receipt_hash_is_signature,false);
});
test('failed external-style readback does not get called recovery, even when execution self-reports success',async()=>{
  const result=await runFullLoopSandboxProof({denyIndependentReadback:true});
  const t=scoreFullLoopProof(result);
  assert.equal(t.receipt_chain_valid,true);
  assert.equal(t.attempted_retries,1);
  assert.equal(t.attempted_completion_claims,1);
  assert.equal(t.verified_sandbox_recoveries,0);
  assert.equal(t.unresolved_completion_claims,1);
  assert.equal(t.proof_divergence_rate_pct,100);
  assert.equal(t.verified_recovery_yield_pct,0);
  assert.equal(t.measured_customer_supervision_minutes_saved,null);
  assert.equal(t.original_model_self_report_claims,0);
});
test('approval absent: no retry and no fabricated 0% failure/divergence rate',async()=>{
  const result=await runFullLoopSandboxProof({ownerApproval:false});
  const t=scoreFullLoopProof(result);
  assert.equal(t.authorization_blocked_before_execution,true);
  assert.equal(t.attempted_retries,0);
  assert.equal(t.attempted_completion_claims,0);
  assert.equal(t.verified_recovery_yield_pct,null);
  assert.equal(t.proof_divergence_rate_pct,null);
  assert.equal(t.asri_zero_touch_verified_business_resolution_pct,null);
});
test('scope and receipt integrity cannot be forged to manufacture verified telemetry',async()=>{
  const original=await runFullLoopSandboxProof();
  const altered={...original,receipts:original.receipts.map(x=>({...x,detail:{...x.detail}}))};
  altered.receipts[0].detail.work_id='another-work';
  const t=scoreFullLoopProof(altered);
  assert.equal(t.receipt_chain_valid,false);
  assert.equal(t.verified_sandbox_recoveries,0);
  assert.equal(t.head_hash,null);
  assert.equal(t.proof_divergence_rate_pct,null);
});
test('session aggregation counts failed verification; never invents competitor or business outcome percentages',async()=>{
 const ok=scoreFullLoopProof(await runFullLoopSandboxProof());
 const failed=scoreFullLoopProof(await runFullLoopSandboxProof({denyIndependentReadback:true}));
 const denied=scoreFullLoopProof(await runFullLoopSandboxProof({ownerApproval:false}));
 const t=summarizeProofTelemetry([ok,failed,denied]);
 assert.equal(t.run_count,3);
 assert.equal(t.sandbox_retries_attempted,2);
 assert.equal(t.sandbox_recoveries_verified,1);
 assert.equal(t.sandbox_recovery_yield_pct,50);
 assert.equal(t.sandbox_readback_divergence_pct,50);
 assert.equal(t.competitor_failure_rate_pct,null);
 assert.equal(t.real_customer_asri_pct,null);
 assert.equal(t.real_supervision_minutes_saved,null);
});
