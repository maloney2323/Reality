import test from 'node:test';
import assert from 'node:assert/strict';
import {runFullLoopSandboxProof,verifyFullLoopProofReceipts}
 from '../src/reality-full-loop-sandbox-proof-v0.1.js';

test('full loop: discovers recurring work -> blocks attempt -> acquires bounded capability -> owner authorizes -> sandbox retry -> readback -> learning -> Universe -> next cognition',async()=>{
 const result=await runFullLoopSandboxProof();
 assert.equal(result.status,'CLOSED_LOOP_VERIFIED_SANDBOX');
 assert.equal(result.verified_full_loop,true);
 assert.equal(result.original_attempt_blocked,true);
 assert.equal(result.capability_gap_detected,true);
 assert.equal(result.sandbox_capability_verified,true);
 assert.equal(result.proposed_correction_was_executed,true);
 assert.equal(result.authority_scope,'sandbox_only');
 assert.equal(result.independent_sandbox_readback_verified,true);
 assert.equal(result.ephemeral_universe_updated,true);
 assert.equal(result.cognition_resumed,true);
 assert.equal(result.objective_state,'COGNITION_RESUMED');
 assert.equal(result.receipt_chain_verified,true);
 assert.equal(result.continuation_projection.state,'VERIFIED_SANDBOX_ONLY');
 assert.equal(result.externally_consequential_actions,0);
 assert.equal(result.real_customer_operations,0);
 assert.equal(result.production_merge_eligible,false);
 assert.equal(result.generated_code_acquired,false);
 const stages=result.receipts.map(x=>x.step);
 assert.deepEqual(stages,[
  'WORK_DISCOVERED','ORIGINAL_WORK_BLOCKED','CAPABILITY_GAP_CONFIRMED',
  'SANDBOX_CAPABILITY_VERIFIED','ORIGINAL_WORK_RETRIED',
  'INDEPENDENT_SANDBOX_RECONSTRUCTION','CONTINUED_FROM_VERIFIED_UNIVERSE',
 ]);
 assert.equal(result.receipts.find(x=>x.step==='ORIGINAL_WORK_RETRIED').detail.original_work_id,
  result.original_work_id);
 console.log('FULL_LOOP_SANDBOX_RECEIPT',JSON.stringify({
  result:result.status,stages,
  same_original_work:true,sandbox_independent_readback:true,
  verified_customer_operation:false,no_production_change:true,
 }));
});
test('absence of owner authority stops safely after discovery and initial blocked attempt',async()=>{
 const result=await runFullLoopSandboxProof({ownerApproval:false});
 assert.equal(result.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(result.verified_full_loop,false);
 assert.equal(result.externally_consequential_actions,0);
 assert.equal(result.steps.at(-1).step,'APPROVAL_NEEDED');
 assert.equal(result.ledger_verified,true);
});
test('withheld independent readback prevents false completion, Universe update and cognition resume',async()=>{
 const result=await runFullLoopSandboxProof({denyIndependentReadback:true});
 assert.equal(result.status,'BLOCKED_UNVERIFIED');
 assert.equal(result.verified_full_loop,false);
 assert.equal(result.ephemeral_universe_updated,false);
 assert.equal(result.cognition_resumed,false);
 assert.equal(result.independent_sandbox_readback_verified,false);
 assert.equal(result.objective_state,'BLOCKED');
 assert.equal(result.receipts.at(-1).step,'NOT_COMPLETED');
 assert.equal(result.receipt_chain_verified,true);
});
test('tampering with first receipt is detected instead of silently creating a valid historical story',async()=>{
 const result=await runFullLoopSandboxProof();
 const mutated=result.receipts.map(x=>({...x,detail:{...x.detail}}));
 mutated[0].detail.work_id='forged-other-work';
 assert.equal(verifyFullLoopProofReceipts(mutated),false);
 const severed=result.receipts.map(x=>({...x,detail:{...x.detail}}));
 severed[1].prior_hash='not-the-actual-parent-hash';
 assert.equal(verifyFullLoopProofReceipts(severed),false);
});
