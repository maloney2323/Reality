import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {continueSignedMaintenanceCaseCiVerification,selectSignedCaseCiResumeEvent}
 from '../src/reality-signed-maintenance-case-ci-live-verifier-v1.js';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const worker='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const incident='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
const digest='sha256:'+'c'.repeat(64);
const release='b'.repeat(40);
const db={project:'hvkfreoagbrphwghjajw',strictSecrets:true,
 url:'https://hvkfreoagbrphwghjajw.supabase.co',
 secretKey:'fixture-service-only-credential-not-used'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project,
 VERCEL_GIT_COMMIT_SHA:release};
const verified={
 ok:true,status:'EXACT_SIGNED_MAINTENANCE_SOURCE_CI_RED_GREEN_INDEPENDENTLY_ATTESTED',
 source_read_only:true,model_generated:false,
 independent_frozen_red_verified:false,
 repair_executed:false,original_job_completed:false,
 installation_authorized:false,production_changed:false,
 new_shift_started:false,shift_id:shift,maintenance_id:incident,
 github_run_id:44770893142,case_specific_ci_receipt_sha256:digest,
 case_specific_frozen_red_attested:true,code_regression_green_verified:true
};
function mock(result=verified){
 const requests=[];
 const fetchImpl=async(url,options)=>{
  requests.push({url,options});
  return {ok:true,json:async()=>result};
 };
 return {requests,run:()=>continueSignedMaintenanceCaseCiVerification({
  db,env,shiftId:shift,workerRunId:worker,fetchImpl
 })};
}
test('signed current worker consumes independently verified exact source RED GREEN, never claims install or completion',async()=>{
 const h=mock(),r=await h.run();
 assert.equal(r.status,'EXACT_SIGNED_MAINTENANCE_SOURCE_CI_RED_GREEN_INDEPENDENTLY_ATTESTED');
 assert.equal(r.case_specific_frozen_red_attested,true);
 assert.equal(r.code_regression_green_verified,true);
 assert.equal(r.maintenance_id,incident);
 assert.equal(r.case_specific_ci_receipt_sha256,digest);
 assert.equal(r.repair_executed,false);
 assert.equal(r.repair_installed,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.production_changed,false);
 assert.equal(r.new_shift_started,false);
 assert.equal(h.requests.length,1);
 assert.equal(h.requests[0].url,db.url+
  '/functions/v1/reality-signed-maintenance-repair-source-broker-v1');
 const o=h.requests[0].options;
 assert.equal(o.method,'POST');
 assert.deepEqual(JSON.parse(o.body),{
  mode:'case_ci',shift_id:shift,worker_run_id:worker,release_sha:release
 });
 assert.equal(o.headers.authorization,'Bearer '+db.secretKey);
 assert.equal(o.redirect,'error');
});
test('unreviewed or missing exact release yields no false CI or original receipt',async()=>{
 for(const status of [
  'NO_CURRENT_SIGNED_MAINTENANCE_CASE_CI_REVIEW_WARRANT',
  'NO_UNREVIEWED_SIGNED_MAINTENANCE_CASE_CI_SCOPE',
  'NO_PINNED_SIGNED_CASE_CI_GITHUB_RUN_YET',
  'NO_MATCHING_FROZEN_SOURCE_CASE_OR_PINNED_ARTIFACT'
 ]){
  const r=await mock({...verified,status,
   case_specific_frozen_red_attested:false,
   code_regression_green_verified:false}).run();
  assert.equal(r.status,status);
  assert.equal(r.case_specific_frozen_red_attested,false);
  assert.equal(r.original_job_completed,false);
 }
});
test('fake finish, broad approval, wrong shift, tampered run or receipt are rejected',async()=>{
 for(const bad of [
  {...verified,original_job_completed:true},
  {...verified,installation_authorized:true},
  {...verified,production_changed:true},
  {...verified,independent_frozen_red_verified:true},
  {...verified,repair_executed:true},
  {...verified,shift_id:'ffffffff-aaaa-4bbb-8ccc-eeeeeeeeeeee'},
  {...verified,maintenance_id:'bogus'},
  {...verified,github_run_id:0},
  {...verified,case_specific_ci_receipt_sha256:'bogus'},
  {...verified,code_regression_green_verified:false},
  {...verified,new_shift_started:true}
 ]){
  await assert.rejects(mock(bad).run(),/SIGNED_CASE_CI_LIVE_/);
 }
});
test('unavailable broker fails closed instead of retrying an unknown provider effect',async()=>{
 const r=await continueSignedMaintenanceCaseCiVerification({
  db,env,shiftId:shift,workerRunId:worker,
  fetchImpl:async()=>{throw Error('PROVIDER_TIMEOUT_SECRET_LEAK_TEST')}
 });
 assert.equal(r.status,'EXACT_SIGNED_CASE_CI_BROKER_TRANSPORT_UNVERIFIED');
 assert.equal(r.original_job_completed,false);
 assert.equal(JSON.stringify(r).includes('SECRET_LEAK'),false);
});
test('signed live case CI only records verified GitHub evidence under original warrant',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261120172000_existing_shift_sourcecase_ci_attestation_v1.sql',
  import.meta.url),'utf8');
 for(const phrase of [
  "current_user<>'service_role'",
  "w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'",
  "w.state='ACTIVE'","run.status='STARTED'",
  "pulse.last_worker_status='WAKE_RECEIVED'",
  "m.independent_frozen_test_receipt_sha256 is null",
  "m.repaired_capability_receipt_sha256 is null",
  "m.exact_install_approval_receipt_sha256 is null",
  "independent_frozen_test_receipt_sha256=v_hash",
  "phase='FROZEN_FAILURE_VERIFIED'",
  "on conflict(maintenance_id) do nothing",
  "original_job_completed',false",
  "revoke all on function"
 ])assert.ok(sql.includes(phrase),phrase);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_shifts_v1/);
 const broker=readFileSync(new URL(
 '../supabase/functions/reality-signed-maintenance-repair-source-broker-v1/index.ts',
 import.meta.url),'utf8');
 for(const phrase of [
  "REALITY_GITHUB_BROKER_TOKEN",
  "verifyOneCase",
  "signed_case_spec_blob_sha",
  "verifySuite(red,{expectsRed:true",
  "EXACT_SIGNED_MAINTENANCE_SOURCE_CI_RED_GREEN_INDEPENDENTLY_ATTESTED"
 ])assert.ok(broker.includes(phrase),phrase);
 assert.doesNotMatch(broker,/method:'PUT'|method:'DELETE'|method:'PATCH'/);
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/continueSignedMaintenanceCaseCiVerification\(\{/);
 assert.match(worker,/signed_maintenance_sourcecase_ci_reconciliation:signedMaintenanceCaseCiReconciliation/);
});


test('current exact proof-change signal routes to the existing signed case verifier, never a different source',async()=>{
 const eventId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const source='https://github.com/maloney2323/Reality/pull/307';
 const event={event_id:eventId,event_state:'SHADOW_PENDING',
  event_kind:'QUALIFIER_PROOF_CHANGED',source_current:true,
  would_resume_suspended_obligation:true,source_receipt_sha256:digest,
  original_work_id:'work:'+'a'.repeat(32),source_ref:source,continuity_revision:2};
 const shadow={status:'FINAL_LOOP_EVENT_SUBSCRIPTIONS_AND_SIGNAL_TRACE_READ_ONLY',
  shift_id:shift,execution_authorized:false,events:[event],
  subscriptions:[{original_work_id:event.original_work_id,source_ref:source,
   continuity_revision:2,condition_kind:event.event_kind,
   next_qualified_action:'VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC'}]};
 const selection=selectSignedCaseCiResumeEvent(shadow,shift);
 assert.deepEqual(selection,{event_id:eventId,source_ref:source});
 for(const bad of [
  {...shadow,execution_authorized:true},
  {...shadow,events:[{...event,source_current:false}]},
  {...shadow,events:[{...event,continuity_revision:3}]},
  {...shadow,events:[event,{...event,event_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}]},
  {...shadow,subscriptions:[]}
 ])assert.equal(selectSignedCaseCiResumeEvent(bad,shift),null);
 const args={db,env,shiftId:shift,workerRunId:worker,resumeEvent:selection};
 let calls=0;
 const fetchImpl=async(_url,opts)=>{
  calls++;
  assert.equal(JSON.parse(opts.body).resume_event_id,eventId);
  return {ok:true,json:async()=>({...verified,resume_event_id:eventId,source_ref:source})};
 };
 const r=await continueSignedMaintenanceCaseCiVerification({...args,fetchImpl});
 assert.equal(calls,1);
 assert.equal(r.case_specific_frozen_red_attested,true);
 assert.equal(r.installation_authorized,false);
 await assert.rejects(continueSignedMaintenanceCaseCiVerification({...args,
  fetchImpl:async()=>({ok:true,json:async()=>({...verified,resume_event_id:eventId,
   source_ref:'https://github.com/maloney2323/Reality/pull/308'})})}),
  /SIGNED_CASE_CI_LIVE_EXACT_MAINTENANCE_INDEPENDENT_FROZEN_RECEIPT_INVALID/);
});
