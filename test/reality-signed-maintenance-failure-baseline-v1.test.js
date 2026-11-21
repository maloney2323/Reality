import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
import {reproduceOneSignedMaintenanceFailureBaseline}
 from '../src/reality-signed-maintenance-failure-baseline-v1.js';

const owner='11111111-2222-4333-8444-555555555555';
const shift='22222222-3333-4444-8555-666666666666';
const origin='33333333-4444-4555-8666-777777777777';
const incident='44444444-5555-4666-8777-888888888888';
const worker='55555555-6666-4777-8888-999999999999';
const claimId='66666666-7777-4888-8999-aaaaaaaaaaaa';
const hash=c=>'sha256:'+c.repeat(64);
const source='https://github.com/maloney2323/Reality/pull/307';
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'sandbox'};
const db={strictSecrets:true,secretKey:'test-only',project:'sandbox',
 url:'https://fixture.supabase.co'};
const claim={status:'SIGNED_MAINTENANCE_BASELINE_CLAIMED',
 maintenance_id:incident,owner_id:owner,origin_shift_id:origin,
 claim_shift_id:shift,claim_id:claimId,worker_run_id:worker,
 kind:'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',source_ref:source,
 assignee:'Riley',independent_reviewer:'Quinn',
 last_source_sha256:hash('a'),source_observation_receipt_sha256:hash('b'),
 independent_review_receipt_sha256:hash('c'),
 original_job_completed:false,repair_executed:false,
 installation_authorized:false,production_changed:false};
const rolesBuilder=()=>({roles:[{employee_name:'Riley'},
 {employee_name:'Quinn'}]});
const readSource=async()=>({source_ref:source,
 provider_proof_sha256:hash('a'),
 checked_at:new Date().toISOString()});
function callProvider({claimed=claim,recorded}={}){
 const calls=[];
 const call=async(_db,method,args)=>{
  calls.push({method,args});
  if(method==='reality_claim_signed_internal_maintenance_baseline_v1')
   return claimed;
  if(method==='reality_record_signed_internal_maintenance_baseline_v1')
   return recorded||{
    status:'INTERNAL_MAINTENANCE_HISTORICAL_FAILURE_BASELINE_REPRODUCED',
    maintenance_id:incident,owner_id:owner,origin_shift_id:origin,
    source_ref:source,
    baseline_kind:'HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES',
    baseline_receipt_sha256:hash('d'),
    next_action:'RUN_INDEPENDENT_EXECUTABLE_FROZEN_CI_RED_BEFORE_MODEL_PATCH',
    independent_frozen_ci_test_completed:false,model_code_generated:false,
    repair_executed:false,original_job_completed:false,
    installation_authorized:false,production_changed:false
   };
  throw Error('UNKNOWN_METHOD_'+method);
 };
 return {calls,call};
}
test('second signed worker rechecks SAME owner/incident and records independent baseline, not a patch',async()=>{
 const p=callProvider();let observed=0;
 const a=await reproduceOneSignedMaintenanceFailureBaseline({
  db,env,shiftId:shift,workerRunId:worker,call:p.call,rolesBuilder,
  readSource:async(...args)=>{observed++;return readSource(...args)},
  fetchImpl:async()=>{throw Error('UNEXPECTED_PROVIDER')}
 });
 assert.equal(observed,2);
 assert.equal(p.calls.length,2);
 assert.deepEqual(p.calls.map(c=>c.method),[
  'reality_claim_signed_internal_maintenance_baseline_v1',
  'reality_record_signed_internal_maintenance_baseline_v1']);
 assert.deepEqual(p.calls[0].args,{p_shift_id:shift,p_worker_run_id:worker});
 assert.equal(p.calls[1].args.p_maintenance_id,incident);
 assert.equal(p.calls[1].args.p_provider_sha256,hash('a'));
 assert.equal(a.origin_shift_id,origin);
 assert.equal(a.historical_baseline_verified,true);
 assert.equal(a.executable_frozen_ci_red_verified,false);
 assert.equal(a.model_code_generated,false);
 assert.equal(a.repair_executed,false);
 assert.equal(a.original_job_completed,false);
 assert.equal(a.no_new_shift_started,true);
 assert.equal(a.same_internal_job_preserved,true);
});
test('no current signed owner shift means no baseline claim',async()=>{
 const p=callProvider({claimed:{status:'NO_SIGNED_MAINTENANCE_BASELINE_READY',
  original_job_completed:false,repair_executed:false,
  installation_authorized:false,production_changed:false}});
 const a=await reproduceOneSignedMaintenanceFailureBaseline({
  db,env,shiftId:shift,workerRunId:worker,call:p.call,rolesBuilder,
  readSource:async()=>{throw Error('UNEXPECTED')}
 });
 assert.equal(a.maintenance_job_claimed,false);
 assert.equal(p.calls.length,1);
});
test('changing provider source cannot be treated as reproduced failure',async()=>{
 const p=callProvider();let n=0;
 const a=await reproduceOneSignedMaintenanceFailureBaseline({
  db,env,shiftId:shift,workerRunId:worker,call:p.call,rolesBuilder,
  readSource:async()=>({source_ref:source,
   provider_proof_sha256:hash(++n===1?'a':'e'),
   checked_at:new Date().toISOString()})
 });
 assert.equal(a.status,'SIGNED_MAINTENANCE_BASELINE_SOURCE_EPOCH_CHANGED');
 assert.equal(a.historical_baseline_verified,false);
 assert.equal(p.calls.length,1);
});
test('forged repair or claim source is independently rejected',async()=>{
 for(const bad of [
  {...claim,source_ref:'https://evil.example/pull/307'},
  {...claim,installation_authorized:true},
  {...claim,assignee:'Quinn'},
  {...claim,last_source_sha256:'not-source-proof'},
 ]){
  const p=callProvider({claimed:bad});
  await assert.rejects(reproduceOneSignedMaintenanceFailureBaseline({
   db,env,shiftId:shift,workerRunId:worker,call:p.call,rolesBuilder,
   readSource:async()=>{throw Error('SHOULD_NOT_READ')}
  }),/SIGNED_MAINTENANCE_BASELINE_INDEPENDENT_FENCED_CLAIM_UNTRUSTED/);
  assert.equal(p.calls.length,1);
 }
 const p=callProvider({recorded:{
  status:'INTERNAL_MAINTENANCE_HISTORICAL_FAILURE_BASELINE_REPRODUCED',
  maintenance_id:incident,owner_id:owner,origin_shift_id:origin,
  source_ref:source,baseline_kind:'HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES',
  baseline_receipt_sha256:hash('d'),
  next_action:'RUN_INDEPENDENT_EXECUTABLE_FROZEN_CI_RED_BEFORE_MODEL_PATCH',
  independent_frozen_ci_test_completed:true,model_code_generated:false,
  repair_executed:false,original_job_completed:false,
  installation_authorized:false,production_changed:false}});
 await assert.rejects(reproduceOneSignedMaintenanceFailureBaseline({
  db,env,shiftId:shift,workerRunId:worker,call:p.call,rolesBuilder,readSource
 }),/SIGNED_MAINTENANCE_BASELINE_DURABLE_INDEPENDENT_HISTORICAL_BASELINE_RECEIPT_UNTRUSTED/);
});
test('new service-only RPCs are in signed shared transport without general execution permission',async()=>{
 for(const name of ['reality_claim_signed_internal_maintenance_baseline_v1',
  'reality_record_signed_internal_maintenance_baseline_v1']){
  const a=await shiftRpc(db,name,{p_shift_id:shift},{fetchImpl:async(url,opts)=>{
   assert.equal(url,db.url+'/rest/v1/rpc/'+name);
   assert.equal(opts.method,'POST');
   return {ok:true,json:async()=>({status:'EXACT_TEST_RECEIPT'})};
  }});
  assert.equal(a.status,'EXACT_TEST_RECEIPT');
 }
 await assert.rejects(shiftRpc(db,'reality_maintenance_autoinstall_anything_v1',{},{
  fetchImpl:async()=>{throw Error('UNEXPECTED')}}),/SHIFT_RPC_NOT_ALLOWLISTED/);
});
test('service migration requires distinct signed worker, original reviewer evidence, owner, and stable source',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261117_signed_internal_maintenance_failure_baseline_v18.sql',
  import.meta.url),'utf8');
 for(const text of [
  'claimed_worker_run_id<>p_worker_run_id',
  "run.status='STARTED'",
  'for update of m0 skip locked',
  "s.closed_at is null",
  "s.planned_end_at>clock_timestamp()",
  'last_source_sha256=p_provider_sha256',
  "receipt_sha256=m.independent_review_receipt_sha256",
  'v_claims<>0',
  'v_inquiries<b.prior_inquiry_count',
  "previously_reviewed_sha256<>current_provider_sha256",
  'independent_failure_baseline_receipt_sha256',
  'reconcile_stale_internal_maintenance_baseline_v1'
 ])assert.ok(sql.includes(text),text);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_original_claims_v1/i);
 assert.doesNotMatch(sql,/cron\.schedule\(|insert into reality_internal\.governed_employee_shifts_v1/i);
 assert.doesNotMatch(sql,/grant execute[^;]+to (anon|authenticated)/is);
});
test('real signed worker wires separate baseline result without claiming frozen CI pass',()=>{
 const code=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(code,/reproduceOneSignedMaintenanceFailureBaseline\(\{/);
 assert.match(code,/workerRunId:actualWorkerRunId/);
 assert.match(code,/signed_maintenance_failure_baseline:maintenanceFailureBaseline/);
 assert.match(code,/executable_frozen_ci_red_verified:false/);
});
