import test from 'node:test';
import assert from 'node:assert/strict';
import {admitExternalFailureToReality} from '../src/reality-final-loop-external-recovery-handoff-v1.js';
const observation={
 provider:'supabase',project_ref:'txqgqqievsttobujcsli',
 parent_project_ref:'hvkfreoagbrphwghjajw',
 branch_name:'final-loop-444-isolated-acceptance',
 branch_status:'MIGRATIONS_FAILED',preview_project_status:'ACTIVE_HEALTHY',
 observed_at:'2026-11-24T04:28:07.322Z',
 source_receipt_sha256:'sha256:'+'a'.repeat(64)
};
const scope={project_ref:observation.project_ref,
 parent_project_ref:observation.parent_project_ref,isolated:true,production:false};
test('admission verifies provider and durable continuity before signed diagnosis',async()=>{
 const calls=[];
 const r=await admitExternalFailureToReality({observation,scope,
  verifyProvider:async c=>{calls.push('provider');return {
   independent_verified:true,project_ref:c.project_ref,
   branch_status:c.branch_status,source_receipt_sha256:c.source_receipt_sha256}},
  admitToContinuity:async()=>{calls.push('admit');return {event_id:'event-1'}},
  readContinuityReceipt:async()=>{calls.push('read');return {
   independent_verified:true,event_id:'event-1',
   source_receipt_sha256:observation.source_receipt_sha256,
   project_ref:observation.project_ref,state:'OPEN'}},
  requestSignedRecovery:async p=>{calls.push('wake');assert.equal(p.mutation_authorized,false);
   return {status:'QUEUED'}}
 });
 assert.equal(r.status,'EXTERNAL_INFRA_SIGNED_DIAGNOSTIC_REQUESTED');
 assert.deepEqual(calls,['provider','admit','read','wake']);
 assert.equal(r.repair_executed,false);
});
test('unverified provider prevents all downstream effects',async()=>{
 let calls=0;
 const r=await admitExternalFailureToReality({observation,scope,
  verifyProvider:async()=>({independent_verified:false}),
  admitToContinuity:async()=>{calls++},
  readContinuityReceipt:async()=>{calls++},
  requestSignedRecovery:async()=>{calls++}});
 assert.equal(r.status,'EXTERNAL_INFRA_PROVIDER_PROOF_MISMATCH');
 assert.equal(calls,0);
});
test('uncertain admission does not replay',async()=>{
 let wakes=0;
 const r=await admitExternalFailureToReality({observation,scope,
  verifyProvider:async()=>({independent_verified:true,
   project_ref:observation.project_ref,branch_status:observation.branch_status,
   source_receipt_sha256:observation.source_receipt_sha256}),
  admitToContinuity:async()=>{throw Error('timeout')},
  readContinuityReceipt:async()=>null,
  requestSignedRecovery:async()=>{wakes++}});
 assert.equal(r.status,'EXTERNAL_INFRA_ADMISSION_OUTCOME_UNCERTAIN_READBACK_REQUIRED');
 assert.equal(wakes,0);
});
