import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceOneShiftContinuityIndependentReview}
 from '../src/reality-shift-continuity-independent-review-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const shift='22222222-3333-4444-8555-666666666666';
const incident='33333333-4444-4555-8666-777777777777';
const job='44444444-5555-4666-8777-888888888888';
const run='55555555-6666-4777-8888-999999999999';
const claimId='66666666-7777-4888-8999-aaaaaaaaaaaa';
const hash=x=>'sha256:'+x.repeat(64);
const ref='https://github.com/maloney2323/Reality/pull/308';
const db={strictSecrets:true,secretKey:'fixture',project:'sandbox'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'sandbox'};
const claim={status:'SIGNED_CONTINUITY_REVIEW_CLAIMED',
 incident_id:incident,owner_id:owner,shift_id:shift,job_id:job,
 claim_id:claimId,worker_run_id:run,reviewer:'Quinn',
 reviewer_function_id:'quality_security_reliability',
 source_ref:ref,previously_reviewed_sha256:hash('a'),
 investigation_receipt_sha256:hash('b'),installation_authorized:false,
 original_job_completed:false,production_changed:false};
const rolesBuilder=()=>({roles:[
 {employee_name:'Quinn',function_id:'quality_security_reliability'}
]});
const readSource=async()=>({
 source_ref:ref,provider_proof_sha256:hash('c'),
 checked_at:'2026-11-17T19:00:00.000Z'
});
function setup({claimResult=claim,recStatus='SOURCE_CHANGED_NEEDS_FROZEN_TEST'}={}){
 const calls=[];
 const call=async(_db,method,args)=>{
  calls.push({method,args});
  if(method==='reality_claim_shift_continuity_independent_review_v1')
   return claimResult;
  if(method==='reality_record_shift_continuity_independent_review_v1')
   return {status:recStatus,incident_id:incident,job_id:job,
    reviewer:'Quinn',independent_review_receipt_sha256:hash('d'),
    next_action:'INDEPENDENT_FROZEN_REPRODUCTION_OR_NEW_SOURCE_EPOCH_REQUIRED',
    original_job_completed:false,repair_executed:false,
    installation_authorized:false,production_changed:false};
  throw Error('FORBIDDEN_METHOD '+method);
 };
 return {call,calls};
}
test('signed reviewer independently re-reads provider twice and records conservative mismatch',async()=>{
 const f=setup();let reads=0;
 const x=await advanceOneShiftContinuityIndependentReview({
  db,env,shiftId:shift,workerRunId:run,call:f.call,
  rolesBuilder,readSource:async()=>{reads++;return readSource()},
  fetchImpl:async()=>{throw Error('FORBIDDEN')},
 });
 assert.equal(reads,2);
 assert.equal(x.status,'SOURCE_CHANGED_NEEDS_FROZEN_TEST');
 assert.equal(x.independent_source_reobservation_completed,true);
 assert.equal(x.independent_repair_test_completed,false);
 assert.equal(x.original_job_completed,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(f.calls[1].method,
  'reality_record_shift_continuity_independent_review_v1');
 assert.equal(f.calls[1].args.p_provider_sha256,hash('c'));
});
test('even matching current provider proof is not customer settlement or repair',async()=>{
 const f=setup({recStatus:'SOURCE_MATCHED_NEEDS_FROZEN_TEST'});
 const x=await advanceOneShiftContinuityIndependentReview({
  db,env,shiftId:shift,workerRunId:run,call:f.call,
  rolesBuilder,readSource:async()=>({...await readSource(),
   provider_proof_sha256:hash('a')}),
  fetchImpl:async()=>{throw Error('FORBIDDEN')}
 });
 assert.equal(x.status,'SOURCE_MATCHED_NEEDS_FROZEN_TEST');
 assert.equal(x.repair_executed,false);
 assert.equal(x.original_job_completed,false);
 assert.equal(x.independent_repair_test_completed,false);
});
test('provider unavailability is a blocker, never a synthetic receipt',async()=>{
 const f=setup();
 const x=await advanceOneShiftContinuityIndependentReview({
  db,env,shiftId:shift,workerRunId:run,call:f.call,
  rolesBuilder,readSource:async()=>{throw Error('PROVIDER_DOWN')},
  fetchImpl:async()=>{throw Error('FORBIDDEN')}
 });
 assert.equal(x.status,'INDEPENDENT_REVIEW_PROVIDER_UNAVAILABLE');
 assert.equal(f.calls.length,1);
 assert.equal(x.original_job_completed,false);
});
test('source changes between signed reads cannot be accepted',async()=>{
 const f=setup();let idx=0;
 const x=await advanceOneShiftContinuityIndependentReview({
  db,env,shiftId:shift,workerRunId:run,call:f.call,
  rolesBuilder,readSource:async()=>({...await readSource(),
   provider_proof_sha256:hash(++idx===1?'c':'e')}),
  fetchImpl:async()=>{throw Error('FORBIDDEN')}
 });
 assert.equal(x.status,'SOURCE_CHANGED_DURING_INDEPENDENT_REOBSERVATION');
 assert.equal(f.calls.length,1);
});
test('unauthorized and forged review cannot write to the owner ledger',async()=>{
 const f=setup({claimResult:{...claim,original_job_completed:true}});
 await assert.rejects(advanceOneShiftContinuityIndependentReview({
  db,env,shiftId:shift,workerRunId:run,call:f.call,
  rolesBuilder,readSource,fetchImpl:async()=>{throw Error('FORBIDDEN')}
 }),/CONTINUITY_INDEPENDENT_REVIEW_EXACT_REVIEW_CLAIM_UNVERIFIED/);
 assert.equal(f.calls.length,1);
});
test('SQL review requires signed worker and prevents false original settlement',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261117_shift_continuity_independent_review_v6.sql',
  import.meta.url),'utf8');
 assert.match(sql,/join reality_internal.signed_worker_actual_runs_v1 run/);
 assert.match(sql,/run.started_at>inc.investigated_at/);
 assert.match(sql,/for update of inc skip locked/);
 assert.match(sql,/not exists\(select 1 from reality_internal.shift_continuity_independent_reviews_v1/);
 assert.match(sql,/previously_reviewed_sha256=p_provider_sha256/);
 assert.match(sql,/original_job_completed boolean not null default false/);
 assert.doesNotMatch(sql,/cron\.schedule\(/);
 assert.match(sql,/jobname='reality-governed-wake-watchdog-v1'/);
 assert.match(sql,/reconcile_stale_continuity_reviews_v1/);
 assert.doesNotMatch(sql,/grant execute[^;]*to (anon|authenticated)/is);
});
