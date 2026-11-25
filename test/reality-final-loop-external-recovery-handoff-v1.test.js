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

test('signed worker uses existing provider observer, canonical ledger and incident claim path',async()=>{
 const {observeSignedInfrastructureOnExistingWorker:observe}=await import('../src/reality-final-loop-external-recovery-handoff-v1.js');
 const owner='11111111-1111-4111-8111-111111111111',shift='22222222-2222-4222-8222-222222222222',
 run='33333333-3333-4333-8333-333333333333',lease='44444444-4444-4444-8444-444444444444',event='55555555-5555-4555-8555-555555555555';
 const parent=observation.parent_project_ref,project=observation.project_ref;
 const env={VERCEL_ENV:'preview',REALITY_FINAL_LOOP_INFRASTRUCTURE_OBSERVATION_ENABLED:'true',
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:parent,
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:parent,REALITY_RELEASE_CONTROL_SUPABASE_MANAGEMENT_TOKEN:'x'.repeat(30)};
 const continuity={owner_id:owner,shift_id:shift,shared_continuity_guard:{
  owner_id:owner,shift_id:shift,status:'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY',
  execution_authorized:false,handoffs:[{source_ref:'https://github.com/maloney2323/Reality/pull/307',
   original_work_id:'work:'+'a'.repeat(32),continuity_identity_verified:true,qualifier_digest_verified:true,
   qualifier_receipt_sha256:'sha256:'+'a'.repeat(64),independent_original_outcome_verified:false,original_job_completed:false}]}};
 const calls=[];let digest;
 const input={db:{project:parent,strictSecrets:true},env,continuity,
  wake:{status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift},workerRunId:run,wakeClaimId:lease,
  fetchImpl:async(url,options)=>{assert.equal(options.method,'GET');assert.equal(url,'https://api.supabase.com/v1/projects/'+parent+'/branches');calls.push('provider');
   return {ok:true,json:async()=>[{project_ref:project,parent_project_ref:parent,is_default:false,
    name:observation.branch_name,status:observation.branch_status,preview_project_status:observation.preview_project_status,updated_at:observation.observed_at}]}},
  call:async(_,rpc,payload)=>{calls.push(rpc);
   if(rpc==='reality_observe_signed_infrastructure_blocker_v1'){
    assert.equal(payload.p_original_work_id,continuity.shared_continuity_guard.handoffs[0].original_work_id);
    assert.equal(payload.p_wake_claim_id,lease);digest=payload.p_observation.source_receipt_sha256;
    return {status:'SIGNED_INFRASTRUCTURE_INCIDENT_RECORDED',event_id:event,source_receipt_sha256:digest,execution_authorized:false};
   }
   assert.equal(rpc,'reality_read_signed_infrastructure_blocker_v1');assert.equal(payload.p_incident_id,event);
   return {status:'SIGNED_INFRASTRUCTURE_INCIDENT_READBACK',independent_verified:true,event_id:event,
    source_receipt_sha256:digest,project_ref:project,state:'OPEN',phase:'DETECTED',execution_authorized:false};
  }};
 const r=await observe(input);
 assert.equal(r.status,'EXTERNAL_INFRA_SIGNED_DIAGNOSTIC_REQUESTED');
 assert.equal(r.recovery_status,'DURABLE_INCIDENT_AVAILABLE_TO_EXISTING_SIGNED_INVESTIGATOR');
 assert.deepEqual(calls,['provider','provider','reality_observe_signed_infrastructure_blocker_v1','reality_read_signed_infrastructure_blocker_v1']);
 assert.equal(r.repair_executed,false);
 calls.length=0;
 assert.equal((await observe({...input,db:{project,strictSecrets:true}})).status,'SIGNED_INFRASTRUCTURE_CANONICAL_SCOPE_OR_PROVIDER_NOT_CONFIGURED');
 assert.equal(calls.length,0);
});
