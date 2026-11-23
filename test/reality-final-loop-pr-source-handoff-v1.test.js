import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {connectFinalLoopPrSourcePlanToSignedShift as connect}
 from '../src/reality-final-loop-pr-source-handoff-v1.js';

const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const run='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const hash=c=>'sha256:'+c.repeat(64);
const source=n=>'https://github.com/maloney2323/Reality/pull/'+n;
const original='work:'+'1'.repeat(32);
const graph={
 status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 owner_id:owner,shift_id:shift,plan_fingerprint:hash('b'),
 installation_authorized:false,production_changed:false,
 jobs:[
  {source_ref:source(307),original_work_id:original,phase:'BLOCKED',
   source_proof_sha256:hash('a'),original_kind:'REAL_PR_REVIEW_ORIGINAL',
   independent_source_proof_verified:true},
  {source_ref:source(308),original_work_id:null,phase:'NOT_ADMITTED',
   source_proof_sha256:hash('c'),original_kind:'REAL_PR_REVIEW_ORIGINAL',
   independent_source_proof_verified:true}
 ]
};
const env={
 VERCEL_ENV:'preview',REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_LARGE_PR_QUALIFICATION_SHADOW_ENABLED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'reality-test-db'
};
function makePlan(job,n){
 const scopes=[];
 for(let i=0;i<n;i+=8){
  const files=Array.from({length:Math.min(8,n-i)},(_,j)=>({
   path:'src/file-'+String(i+j)+'.js',status:'modified',
   blob_sha:'f'.repeat(40),additions:1,deletions:0,
   patch_proof_verified:false
  }));
  scopes.push({index:scopes.length,file_count:files.length,
   proposed_scope_sha256:hash('d'),source_head_sha:'e'.repeat(40),
   files,proposed_only:true,native_child_original_admitted:false,
   child_execution_authorized:false,independent_review_verified:false});
 }
 return {
  version:'reality-large-pr-source-qualification-v1',
  status:'FULL_DRAFT_MANIFEST_READ_REVIEW_AUTHORITY_PENDING',
  owner_id:owner,shift_id:shift,source_ref:job.source_ref,
  original_work_id:job.original_work_id,native_phase:job.phase,
  frozen_source_proof_sha256:job.source_proof_sha256,
  source_manifest_sha256:hash('e'),manifest_file_count:n,
  bounded_scope_count:scopes.length,bounded_scopes:scopes,
  source_manifest_complete:true,read_only:true,proposed_only:true,
  native_admission_unchanged:true,parent_obligation_remains_open:true,
  worker_claim_consumed:false,original_job_completed:false,
  patch_coverage_verified:false,independent_review_completed:false,
  cross_scope_review_verified:false,owner_approval_granted:false,
  production_changed:false,installation_authorized:false
 };
}
const inspection={
 status:'SIGNED_PR_SOURCE_COMPATIBILITY_OBSERVED_READ_ONLY',
 owner_id:owner,shift_id:shift,read_only:true,worker_claim_consumed:false,
 source_diagnostics:graph.jobs.map((j,i)=>({
  source_ref:j.source_ref,original_work_id:j.original_work_id,
  native_phase:j.phase,
  large_source_qualification:makePlan(j,i===0?34:304)
 }))
};
test('same signed graph connects both full source plans but does not admit or execute work',async()=>{
 const r=await connect({graph,inspection,env,workerRunId:run,
  call:async()=>{throw Error('NO_DATABASE_ACCESS_EXPECTED')}});
 assert.equal(r.status,'FINAL_LOOP_SOURCE_PLANS_CONNECTED_ISOLATED_STAGING_NOT_ENABLED');
 assert.equal(r.complete_manifest_count,2);
 assert.equal(r.proposals[0].proposed_scope_count,5);
 assert.equal(r.proposals[1].proposed_scope_count,38);
 assert.equal(r.proposals[0].native_phase,'BLOCKED');
 assert.equal(r.proposals[1].native_phase,'NOT_ADMITTED');
 assert.equal(r.proposals[1].original_work_id,null);
 assert.equal(r.proposals[0].next_governed_action,
  'RECONCILE_EXISTING_PARENT_BLOCKER_AND_REQUIRE_EXACT_ACCEPTANCE');
 assert.equal(r.proposals[1].next_governed_action,
  'QUALIFY_DISTINCT_PARENT_ORIGINAL_BEFORE_CHILD_REVIEW');
 assert.equal(r.parent_obligation_remains_open,true);
 assert.equal(r.child_original_admitted,false);
 assert.equal(r.original_job_completed,false);
});
test('staging only in an explicitly isolated same-project preview DB on existing worker run',async()=>{
 const isolated={...env,
  REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED:'true',
  REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
  REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'reality-test-db'};
 const calls=[];
 const db={project:'reality-test-db',strictSecrets:true};
 const r=await connect({graph,inspection,env:isolated,db,workerRunId:run,
  call:async(_db,rpc,args)=>{
   assert.equal(rpc,'reality_stage_final_loop_pr_source_plan_v1');
   assert.equal(args.p_shift_id,shift);
   assert.equal(args.p_worker_run_id,run);
   calls.push(args.p_plan.source_ref);
   return {status:'FINAL_LOOP_SOURCE_PLAN_STAGED_PENDING_GOVERNED_ADMISSION',
    plan_id:calls.length===1?
     'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee':
     'ffffffff-ffff-4fff-ffff-ffffffffffff',
    owner_id:owner,shift_id:shift,source_ref:args.p_plan.source_ref,
    parent_original_work_id:args.p_plan.original_work_id,
    source_manifest_sha256:args.p_plan.source_manifest_sha256,
    source_plan_staged:true,child_original_admitted:false,
    original_job_completed:false,production_changed:false};
  }});
 assert.deepEqual(calls,[source(307),source(308)]);
 assert.equal(r.status,'FINAL_LOOP_PROPOSED_SOURCE_PLANS_DURABLY_STAGED_NOT_EXECUTABLE');
 assert.equal(r.staging_receipts.length,2);
 assert.equal(r.child_original_admitted,false);
 assert.equal(r.owner_approval_granted,false);
 assert.equal(r.parent_obligation_remains_open,true);
});
test('wrong project, untrusted worker run or unisolated flag never writes',async()=>{
 const isolated={...env,
  REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED:'true',
  REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
  REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'reality-test-db'};
 let calls=0;
 for(const options of [
  {db:{strictSecrets:true,project:'shared-live'},workerRunId:run,env:isolated},
  {db:{strictSecrets:false,project:'reality-test-db'},workerRunId:run,env:isolated},
  {db:{strictSecrets:true,project:'reality-test-db'},workerRunId:'bad',env:isolated},
  {db:{strictSecrets:true,project:'reality-test-db'},workerRunId:run,
   env:{...isolated,REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'false'}}
 ]){
  const r=await connect({graph,inspection,...options,
   call:async()=>{calls++;throw Error('SHOULD_NOT_CALL')}});
  assert.equal(r.status,'FINAL_LOOP_SOURCE_PLANS_CONNECTED_ISOLATED_STAGING_NOT_ENABLED');
 }
 assert.equal(calls,0);
});
test('forged plan, cross-original source, and ambiguous original identity fail closed',async()=>{
 const i={...inspection,source_diagnostics:[
  {...inspection.source_diagnostics[0],
   large_source_qualification:{...inspection.source_diagnostics[0].large_source_qualification,
    source_manifest_complete:false}},
  inspection.source_diagnostics[1]
 ]};
 const a=await connect({graph,inspection:i,env});
 assert.equal(a.status,'FINAL_LOOP_CHILD_SOURCE_MANIFEST_SCOPE_MISMATCH');
 const b=await connect({graph,inspection:{
  ...inspection,source_diagnostics:[
   {...inspection.source_diagnostics[0],
    large_source_qualification:{
     ...inspection.source_diagnostics[0].large_source_qualification,
     original_work_id:'work:'+'9'.repeat(32)}},
   inspection.source_diagnostics[1]
 ]},env});
 assert.equal(b.status,'FINAL_LOOP_CHILD_SOURCE_MANIFEST_SCOPE_MISMATCH');
 assert.equal(a.child_original_admitted,false);
 assert.equal(b.original_job_completed,false);
});
test('uncertain native PREPARED effect cannot become a child-stage authority',async()=>{
 const g={...graph,jobs:[{...graph.jobs[0],phase:'PREPARED'},graph.jobs[1]]};
 const r=await connect({graph:g,inspection,env});
 assert.equal(r.status,'FINAL_LOOP_CHILD_SOURCE_MANIFEST_SCOPE_MISMATCH');
 assert.equal(r.original_job_completed,false);
});
test('database receipt cannot self-certify an admitted child',async()=>{
 const isolated={...env,
  REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED:'true',
  REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
  REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'reality-test-db'};
 const r=await connect({graph,inspection,env:isolated,
  db:{project:'reality-test-db',strictSecrets:true},workerRunId:run,
  call:async(_db,_,args)=>({
   status:'FINAL_LOOP_SOURCE_PLAN_STAGED_PENDING_GOVERNED_ADMISSION',
   plan_id:'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',
   owner_id:owner,shift_id:shift,source_ref:args.p_plan.source_ref,
   parent_original_work_id:args.p_plan.original_work_id,
   source_manifest_sha256:args.p_plan.source_manifest_sha256,
   source_plan_staged:true,child_original_admitted:true,
   original_job_completed:true,production_changed:false
  })});
 assert.equal(r.status,'FINAL_LOOP_PROPOSED_SOURCE_PLAN_STAGE_PARTIALLY_BLOCKED');
 assert.ok(r.staging_receipts.every(x=>x.source_plan_staged===false));
 assert.equal(r.child_original_admitted,false);
 assert.equal(r.original_job_completed,false);
});
test('existing signed worker publishes the child source handoff separately from original review',()=>{
 const code=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(code,/connectFinalLoopPrSourcePlanToSignedShift/);
 assert.match(code,/final_loop_pr_source_plan_handoff:finalLoopPrSourcePlanHandoff/);
 assert.match(code,/runAuthorizedRileyPrReview/);
 assert.match(code,/shouldFenceRileyPrClaimForObservedIncompatibility/);
 const boundary=readFileSync(new URL(
  '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 assert.match(boundary,/stage_final_loop_pr_source_plan_v1/);
 assert.match(boundary,/read_final_loop_pr_source_plans_v1/);
});
