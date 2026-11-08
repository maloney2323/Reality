import test from 'node:test';
import assert from 'node:assert/strict';
import {createRileyTrustedOriginalDriver}
 from '../src/reality-riley-trusted-original-driver-bridge-v1.js';

const owner='11111111-2222-4333-8444-555555555555';
const shift='22222222-3333-4444-8555-666666666666';
const original='work:'+'a'.repeat(32);
const trigger='33333333-4444-4555-8666-777777777777';
const source='https://github.com/maloney2323/Reality/issues/263';
const proof='sha256:'+'e'.repeat(64);
const scope={shift_id:shift,original_work_id:original,
 trigger_id:trigger,source_ref:source,source_proof_sha256:proof,
 read_only:false,preflight_only:false,
 shift_read_does_not_grant_execution_authority:true,
 exact_trusted_original_preflight_required:true};
const candidate={owner_id:owner,shift_id:shift,
 original_work_id:original,trigger_id:trigger,
 source_ref:source,source_proof_sha256:proof,
 current_owner_scope_verified:true,
 independently_settled:false,installation_authorized:false,
 production_changed:false};
const eligible={status:'EXISTING_SHIFT_ORIGINALS_INDEPENDENTLY_RECONCILED',
 shift_id:shift,execution_authorized:false,
 installation_authorized:false,production_changed:false,
 candidate_count:1,candidates:[candidate]};
const result={status:'SHIFT_TICK_OUTCOMES_RECORDED_RECHECK_MORE_AUTHORIZED_WORK',
 shift_id:shift,attempted:1,independently_settled:0,
 outcomes:[{original_work_id:original,
  status:'ORIGINAL_TRUSTED_PREFLIGHT_BLOCKED_NO_CLAIM',
  original_job_settled:false}],
 shift_finished:false,full_shift_proven:false,
 installation_authorized:false,production_changed:false};
const db={url:'https://isolated.example',secretKey:'test-service-only-stub'};
function ready({readback=eligible,runnerResult=result}={}){
 const observations={rpc:[],run:[]};
 const adapter=createRileyTrustedOriginalDriver({
  db,
  loadShiftReadback:async()=>({}),
  loadOwnerLedgerReadback:async()=>({}),
  loadTrustedAuthorizedOriginal:async()=>({}),
  callRpc:async args=>{
   observations.rpc.push(args);
   return readback;
  },
  runOriginal:async()=>({}),
  runTick:async args=>{
   observations.run.push(args);
   return runnerResult;
  },
  now:()=>new Date('2026-11-07T05:30:00.000Z')
 });
 return {adapter,observations};
}
test('trusted first-customer source scope delegates to existing global DB claim controller only',async()=>{
 const {adapter,observations}=ready();
 const r=await adapter(scope);
 assert.equal(r.status,result.status);
 assert.equal(observations.rpc.length,1);
 assert.equal(observations.rpc[0].name,'reality_read_eligible_shift_originals_v1');
 assert.deepEqual(observations.rpc[0].args,{p_shift_id:shift});
 assert.equal(observations.run.length,1);
 const delegated=observations.run[0];
 assert.equal(delegated.ownerId,owner);
 assert.equal(delegated.shiftId,shift);
 assert.equal(delegated.maxJobs,1);
 assert.equal(delegated.db,db);
 assert.equal(typeof delegated.loadTrustedAuthorizedOriginal,'function');
 assert.equal(typeof delegated.runOriginal,'function');
 assert.equal(r.installation_authorized,false);
 assert.equal(r.production_changed,false);
});
test('missing server-only adapters and invalid source-bound scope fail before readback',async()=>{
 assert.throws(()=>createRileyTrustedOriginalDriver({db}),/ALL_TRUSTED_SERVER_ADAPTERS_REQUIRED/);
 const {adapter,observations}=ready();
 for(const bad of [
  {...scope,read_only:true},
  {...scope,preflight_only:true},
  {...scope,shift_read_does_not_grant_execution_authority:false},
  {...scope,exact_trusted_original_preflight_required:false},
  {...scope,original_work_id:'work:'+'b'.repeat(32)},
  {...scope,shift_id:'bad'},
  {...scope,source_ref:'https://github.com/maloney2323/Reality/pull/265'},
  {...scope,source_proof_sha256:'sha256:untrusted'}
 ]){
  await assert.rejects(adapter(bad),/EXACT_SOURCE_BOUNDED_SHIFT_SCOPE_REQUIRED|EXACT_ORIGINAL_NOT_IN_CURRENT_OWNER_SCOPE/);
 }
 assert.equal(observations.run.length,0);
});
test('ended shift, no eligible originals and unknown readbacks never make execution claim',async()=>{
 for(const readback of [
  {status:'NO_ACTIVE_OWNER_SHIFT_FOR_MULTI_JOB'},
  {...eligible,status:'MODEL_APPROVED_ORIGINAL'},
  {...eligible,execution_authorized:true},
  {...eligible,candidate_count:2},
  {...eligible,candidates:[{...candidate,original_work_id:'work:'+'b'.repeat(32)}]},
  {...eligible,candidates:[{...candidate,source_ref:'https://github.com/maloney2323/Reality/issues/178'}]},
  {...eligible,candidates:[{...candidate,trigger_id:'44444444-5555-4666-8777-888888888888'}]},
  {...eligible,candidates:[{...candidate,current_owner_scope_verified:false}]},
  {...eligible,candidates:[{...candidate,installation_authorized:true}]}
 ]){
  const {adapter,observations}=ready({readback});
  await assert.rejects(adapter(scope),/RILEY_TRUSTED_DRIVER_/);
  assert.equal(observations.run.length,0);
 }
});
test('multiple eligible original jobs select only the requested original, never another',async()=>{
 const other={...candidate,original_work_id:'work:'+'b'.repeat(32),
  trigger_id:'44444444-5555-4666-8777-888888888888'};
 const {adapter,observations}=ready({readback:{...eligible,
  candidate_count:2,candidates:[other,candidate]}});
 const result=await adapter(scope);
 assert.equal(result.status,'SHIFT_TICK_OUTCOMES_RECORDED_RECHECK_MORE_AUTHORIZED_WORK');
 assert.equal(observations.run.length,1);
 assert.equal(observations.run[0].onlyOriginalWorkId,original);
 assert.equal(observations.run[0].maxJobs,1);
});
test('shared executor fabricated settlement and wrong scope are not returned to worker',async()=>{
 for(const bad of [
  {...result,status:'MODEL_SAYS_FINISHED'},
  {...result,shift_id:'44444444-5555-4666-8777-888888888888'},
  {...result,installation_authorized:true},
  {...result,production_changed:true},
  {...result,attempted:2},
  {...result,outcomes:[{...result.outcomes[0],
   original_work_id:'work:'+'b'.repeat(32)}]},
  {...result,shift_finished:true},
  {...result,full_shift_proven:true}
 ]){
  const {adapter}=ready({runnerResult:bad});
  await assert.rejects(adapter(scope),/SHARED_EXECUTOR_OUTCOME_READBACK_INVALID/);
 }
});
