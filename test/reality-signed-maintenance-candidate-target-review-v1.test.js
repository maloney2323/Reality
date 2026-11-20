import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {independentlyReviewSignedMaintenanceTarget}
 from '../src/reality-signed-maintenance-candidate-target-review-v1.js';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const maintenance='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const reviewerRun='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const modelRequest='e078c059-250b-4ae0-b81f-c154c829d76e';
const reviewRequest='bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const offTarget='src/reality-weekly-workload-insight-v1.js';
const executable='src/reality-shift-business-qualification-review-v1.js';
const sha=x=>x.repeat(40);
const hash=x=>'sha256:'+x.repeat(64);
const claim={status:'SIGNED_MAINTENANCE_CANDIDATE_TARGET_REVIEW_CLAIMED',
 maintenance_id:maintenance,owner_id:owner,shift_id:shift,
 source_ref:'https://github.com/maloney2323/Reality/pull/307',
 source_path:offTarget,model_request_id:modelRequest,
 reviewer_request_id:reviewRequest,release_sha:sha('a'),
 candidate_receipt_sha256:hash('b'),
 source_review_authorized:true,target_repair_proven:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false};
const manifest={status:'SIGNED_MAINTENANCE_SOURCE_MANIFEST_VERIFIED',
 source_tree_sha:sha('c'),worker_source_blob_sha:sha('d'),
 runtime_imports_count:1,
 files:[{path:executable,sha:sha('e'),size:1901}]};
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
function harness({input=claim,graph=manifest}={}){
 const calls=[],reads=[];
 const call=async(_db,method,payload)=>{
  calls.push({method,payload});
  if(method==='reality_claim_signed_maintenance_candidate_target_review_v1')
   return input;
  if(method==='reality_record_signed_maintenance_candidate_target_review_v1'){
   return {
    status:payload.p_target_in_worker_graph?
     'SIGNED_WORKER_DEPENDENCY_ONLY_FROZEN_RED_STILL_REQUIRED':
     'OFF_TARGET_NOT_SIGNED_WORKER_EXECUTOR_DEPENDENCY',
    maintenance_id:maintenance,owner_id:owner,shift_id:shift,
    source_path:input.source_path,
    review_receipt_sha256:hash('f'),
    target_in_worker_graph:payload.p_target_in_worker_graph,
    independent_target_review_recorded:true,
    candidate_is_verified_repair:false,
    independent_frozen_red_verified:false,independent_ci_verified:false,
    repair_executed:false,original_job_completed:false,
    installation_authorized:false,production_changed:false,
    new_shift_started:false
   };
  }
  throw Error('UNAUTHORIZED_RPC_'+method);
 };
 const readBroker=async(mode,options)=>{
  reads.push({mode,options});return graph;
 };
 return {calls,reads,run:()=>independentlyReviewSignedMaintenanceTarget({
  db,env,shiftId:shift,workerRunId:reviewerRun,
  call,readBroker,fetchImpl:async()=>{throw Error('NO_NETWORK_DIRECT')}
 })};
}
test('second signed worker rejects independently verified OFF-TARGET PR307 source patch, preserves original identity',async()=>{
 const t=harness(),v=await t.run();
 assert.equal(v.status,'OFF_TARGET_NOT_SIGNED_WORKER_EXECUTOR_DEPENDENCY');
 assert.equal(v.target_in_worker_graph,false);
 assert.equal(v.independent_target_review_recorded,true);
 assert.equal(v.candidate_is_verified_repair,false);
 assert.equal(v.independent_frozen_red_verified,false);
 assert.equal(v.independent_ci_verified,false);
 assert.equal(v.original_job_completed,false);
 assert.equal(v.installation_authorized,false);
 assert.equal(v.production_changed,false);
 assert.equal(v.original_candidate_receipt_sha256,claim.candidate_receipt_sha256);
 assert.deepEqual(t.calls.map(x=>x.method),[
  'reality_claim_signed_maintenance_candidate_target_review_v1',
  'reality_record_signed_maintenance_candidate_target_review_v1'
 ]);
 assert.equal(t.calls[1].payload.p_target_in_worker_graph,false);
 assert.equal(t.reads[0].options.claim.request_id,modelRequest);
 assert.equal(t.reads[0].options.claim.release_sha,claim.release_sha);
});
test('signed dependency is only a candidate: original RED and final receipt remain missing',async()=>{
 const t=harness({input:{...claim,source_path:executable}});
 const v=await t.run();
 assert.equal(v.status,'SIGNED_WORKER_DEPENDENCY_ONLY_FROZEN_RED_STILL_REQUIRED');
 assert.equal(v.target_in_worker_graph,true);
 assert.equal(v.candidate_is_verified_repair,false);
 assert.equal(v.original_job_completed,false);
});
test('no candidate review is idempotent and cannot mint receipt or invoke broker',async()=>{
 const t=harness({input:{status:
  'NO_SIGNED_MAINTENANCE_CANDIDATE_TARGET_REVIEW_READY',
  source_review_authorized:false,installation_authorized:false,
  original_job_completed:false,production_changed:false,
  new_shift_started:false}});
 const v=await t.run();
 assert.equal(v.independent_target_review_recorded,false);
 assert.equal(t.calls.length,1);
 assert.equal(t.reads.length,0);
});
test('forged owner/source/approval or unpinned graph does not record review',async()=>{
 for(const fake of [
  {...claim,source_review_authorized:false},
  {...claim,shift_id:'ffffffff-eeee-4ddd-8ccc-bbbbbbbbbbbb'},
  {...claim,installation_authorized:true},
  {...claim,candidate_receipt_sha256:'not-real'}
 ]){
  const h=harness({input:fake});
  await assert.rejects(h.run(),/SIGNED_MAINTENANCE_TARGET_REVIEW_INDEPENDENT_SOURCE_CANDIDATE_CLAIM_UNVERIFIED/);
  assert.equal(h.calls.length,1);
 }
 const h=harness({graph:{...manifest,worker_source_blob_sha:'bad'}});
 await assert.rejects(h.run(),/SIGNED_MAINTENANCE_TARGET_REVIEW_INDEPENDENT_PINNED_WORKER_GRAPH_UNVERIFIED/);
 assert.equal(h.calls.length,1);
});
test('SQL enforces separate signed worker and old source receipt, no installation',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261120152000_signed_maintenance_candidate_relevance_review_v1.sql',
  import.meta.url),'utf8');
 for(const bit of [
  "c.signed_worker_run_id<>p_worker_run_id",
  "run.status='STARTED'",
  "w.state='ACTIVE'",
  "c.candidate_receipt_sha256",
  "on conflict(maintenance_id) do nothing",
  "OFF_TARGET_NOT_SIGNED_WORKER_EXECUTOR_DEPENDENCY",
  "candidate_is_verified_repair',false",
  'revoke all on function'
 ])assert.ok(sql.includes(bit),bit);
 const sourceSQL=readFileSync(new URL(
  '../supabase/migrations/20261120154500_signed_maintenance_reviewer_source_read_v1.sql',
  import.meta.url),'utf8');
 assert.match(sourceSQL,/c.state='MODEL_CANDIDATE_RECORDED'/);
 assert.match(sourceSQL,/rv.state='CLAIMED'/);
 assert.match(sourceSQL,/rv.original_candidate_receipt_sha256=c.candidate_receipt_sha256/);
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(worker,/independentlyReviewSignedMaintenanceTarget\(\{/);
 assert.match(worker,/signed_maintenance_candidate_target_review:signedMaintenanceCandidateTargetReview/);
});
