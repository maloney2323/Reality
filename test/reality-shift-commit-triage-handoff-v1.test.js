import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {admitVerifiedCurrentShiftCommitTriage}
 from '../src/reality-shift-commit-triage-handoff-v1.js';
import {assertRealityUnifiedShiftGraph}
 from '../src/reality-shift-unified-execution-controller-v1.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const source='https://github.com/maloney2323/Reality/issues/62';
const ref='sha256:'+'a'.repeat(64);
const commit='939914571be04ba519e2d644fe5e7c37e57c734d';
const work='work:'+'c'.repeat(32);
const digest='sha256:'+'b'.repeat(64);
const graph=()=>({status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 shift_id:shift,owner_id:owner,plan_fingerprint:'sha256:'+'d'.repeat(64),
 jobs:[{source_ref:source,source_step_index:5,
  original_kind:'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL',
  phase:'NOT_ADMITTED',original_work_id:null,
  independent_source_proof_verified:true,source_proof_sha256:ref}]});
const qualified=g=>({status:'INDEPENDENT_COMMIT_REFERENCE_TRIAGE_SOURCE_VERIFIED',
 shift_id:g.shift_id,owner_id:g.owner_id,plan_fingerprint:g.plan_fingerprint,
 source_ref:source,source_proof_sha256:ref,commit_sha:commit,
 issue_body_sha256:digest,commit_content_sha256:digest,
 independent_provider_readback_verified:true,
 original_job_admitted:false,original_job_completed:false,
 installation_authorized:false,production_changed:false});
const admitted={status:'EXACT_OWNER_SHIFT_COMMIT_TRIAGE_ORIGINAL_ADMITTED',
 shift_id:shift,owner_id:owner,original_work_id:work,
 source_ref:source,source_proof_sha256:ref,commit_sha:commit,
 phase:'SOURCE_ADMITTED',original_job_admitted:true,
 original_job_completed:false,installation_authorized:false,production_changed:false};
const evidence={status:'EXACT_SHIFT_COMMIT_TRIAGE_PROVIDER_EVIDENCE_RECORDED',
 shift_id:shift,original_work_id:work,source_ref:source,commit_sha:commit,
 phase:'EVIDENCE_VERIFIED',independent_provider_readback_verified:true,
 original_job_completed:false,installation_authorized:false,production_changed:false};
test('frozen owner shift permits one verified triage admission plus durable independent evidence only',async()=>{
 const calls=[],g=graph();
 const x=await admitVerifiedCurrentShiftCommitTriage({
  db:{},graph:g,verifySource:async()=>qualified(g),
  callRpc:async(_db,name,args)=>{calls.push({name,args});
   return name==='reality_admit_verified_shift_commit_triage_v1'?admitted:evidence;}
 });
 assert.deepEqual(calls.map(x=>x.name),[
  'reality_admit_verified_shift_commit_triage_v1',
  'reality_record_verified_shift_commit_triage_v1'
 ]);
 assert.equal(calls[0].args.p_source_ref,source);
 assert.equal(calls[0].args.p_commit_sha,commit);
 assert.equal(calls[1].args.p_original_work_id,work);
 assert.equal(x.original.original_job_admitted,true);
 assert.equal(x.original.phase,'EVIDENCE_VERIFIED');
 assert.equal(x.original.original_job_completed,false);
 assert.equal(x.original.final_receipt_verified,false);
 assert.equal(x.original.installation_authorized,false);
});
test('no verified commit source has no database calls and no original',async()=>{
 const calls=[];
 const x=await admitVerifiedCurrentShiftCommitTriage({
  db:{},graph:graph(),
  verifySource:async()=>({status:'NO_INDEPENDENTLY_VERIFIED_COMMIT_TRIAGE_SOURCE'}),
  callRpc:async()=>{calls.push(1);throw Error('should not execute');}
 });
 assert.equal(calls.length,0);
 assert.equal(x.original.original_job_admitted,false);
});
test('owner mismatch or stale source identity never records job evidence',async()=>{
 const g=graph();
 for(const changed of [
  {...qualified(g),owner_id:'11111111-1111-4111-8111-111111111111'},
  {...qualified(g),plan_fingerprint:'sha256:'+'e'.repeat(64)},
  {...qualified(g),independent_provider_readback_verified:false},
  {...qualified(g),original_job_admitted:true}
 ]){
  await assert.rejects(()=>admitVerifiedCurrentShiftCommitTriage({
   db:{},graph:g,verifySource:async()=>changed,callRpc:async()=>admitted
  }),/SHIFT_COMMIT_TRIAGE_HANDOFF_INDEPENDENT_SOURCE_AND_OWNER_IDENTITY_CHANGED/);
 }
 for(const ticket of [
  {...admitted,owner_id:'11111111-1111-4111-8111-111111111111'},
  {...admitted,source_ref:'https://github.com/maloney2323/Reality/issues/185'},
  {...admitted,original_work_id:'work:FAKE'},
  {...admitted,original_job_completed:true}
 ]){
  let writes=0;
  await assert.rejects(()=>admitVerifiedCurrentShiftCommitTriage({
   db:{},graph:g,verifySource:async()=>qualified(g),
   callRpc:async()=>{writes++;return ticket;}
  }),/DURABLE_SOURCE_BOUND_ORIGINAL_ID_UNVERIFIED/);
  assert.equal(writes,1);
 }
});
test('unverified evidence readback never claims completion',async()=>{
 const g=graph();
 await assert.rejects(()=>admitVerifiedCurrentShiftCommitTriage({
  db:{},graph:g,verifySource:async()=>qualified(g),
  callRpc:async(_db,name)=>name==='reality_admit_verified_shift_commit_triage_v1'?
   admitted:{...evidence,phase:'SETTLED'}
 }),/DURABLE_PROVIDER_EVIDENCE_READBACK_UNVERIFIED/);
});
test('same shift graph accepts verified triage original but rejects an anonymous substitute',()=>{
 const base={
  status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
  shift_id:shift,owner_id:owner,
  plan_fingerprint:'sha256:'+'d'.repeat(64),completion_bound:true,
  selected_sources:1,execution_scope_from_owner_warrant_only:true,
  new_job_created:false,installation_authorized:false,
  original_job_completed_by_graph:false,production_changed:false,
  jobs:[{
   source_step_index:5,source_ref:source,
   source_proof_sha256:ref,independent_source_proof_verified:true,
   original_kind:'REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL',
   original_work_id:work,phase:'EVIDENCE_VERIFIED',
   next_governed_action:'AWAIT_INDEPENDENT_COMMIT_TRIAGE_DISPOSITION',
   capability_installation_authorized:false,
   original_job_completed_by_graph:false,provider_effect_claimed_by_graph:false
  }]
 };
 const x=assertRealityUnifiedShiftGraph(base);
 assert.equal(x.jobs[0].original_kind,'REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL');
 assert.equal(x.all_selected_settled,false);
 assert.equal(x.installation_authorized,false);
 assert.throws(()=>assertRealityUnifiedShiftGraph({...base,jobs:[
  {...base.jobs[0],original_work_id:null}
 ]}),/COMMIT_TRIAGE_REQUIRES_VERIFIED_FROZEN_ISSUE_ORIGINAL/);
});
test('SQL original admission cannot be used from browser, model, unscoped issue, or static claim',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261113_trusted_shift_commit_reference_triage_v1.sql',import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 for(const contract of [
  /current_user<>'service_role'/,
  /governed_employee_completion_warrants_v1/,
  /w\.state='ACTIVE'/,
  /p_source_proof_sha256/,
  /pg_catalog\.sha256/,
  /riley_commit_reference_triage_originals_v1/,
  /on conflict\(shift_id,source_ref\) do nothing/,
  /COMMIT_TRIAGE_PRIOR_ORIGINAL_SOURCE_CHANGED/,
  /revoke all on function public\.reality_admit_verified_shift_commit_triage_v1/,
  /to service_role/,
  /REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL/
 ])assert.match(sql,contract);
 assert.doesNotMatch(sql,/grant execute on function public\.reality_admit_verified_shift_commit_triage_v1[\s\S]{0,120}to authenticated/);
 assert.match(worker,/admitVerifiedCurrentShiftCommitTriage/);
 assert.match(worker,/commit_reference_triage_original/);
 assert.doesNotMatch(worker,/original_job_completed:commitTriageHandoff\.original\.original_job_admitted/);
});
