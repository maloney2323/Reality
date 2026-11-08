import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertRealityUnifiedShiftGraph} from '../src/reality-shift-unified-execution-controller-v1.js';
const uuid='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const pr='https://github.com/maloney2323/Reality/pull/57';
const issue=n=>'https://github.com/maloney2323/Reality/issues/'+n;
const source={source_proof_sha256:'sha256:'+'a'.repeat(64),
 independent_source_proof_verified:true,
 original_job_completed_by_graph:false,capability_installation_authorized:false,
 provider_effect_claimed_by_graph:false};
const record=(index,url,kind,phase,work,next)=>({
 ...source,source_step_index:index,source_ref:url,original_kind:kind,
 phase,original_work_id:work,next_governed_action:next
});
const graph={
 status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
 shift_id:uuid,owner_id:owner,plan_fingerprint:'sha256:'+'b'.repeat(64),
 completion_bound:true,selected_sources:4,
 execution_scope_from_owner_warrant_only:true,new_job_created:false,
 installation_authorized:false,original_job_completed_by_graph:false,
 production_changed:false,
 jobs:[
  record(2,issue(263),'REAL_ENGINEERING_REPAIR_ORIGINAL','SOURCE_ADMITTED',
   'work:'+'c'.repeat(32),'GENERATE_AND_INDEPENDENTLY_TEST_SAME_REPAIR'),
  record(3,issue(185),'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL','NOT_ADMITTED',null,
   'QUALIFY_DISTINCT_OWNER_WORK_NO_FAKE_JOB'),
  record(4,pr,'REAL_PR_REVIEW_ORIGINAL','PREPARED',
   'work:'+'d'.repeat(32),'CONTINUE_VERIFIED_PR_REVIEW'),
  record(5,issue(62),'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL','NOT_ADMITTED',null,
   'QUALIFY_DISTINCT_OWNER_WORK_NO_FAKE_JOB')
 ]};
test('one reality shift controller reconciles ALL four current original source states',()=>{
 const x=assertRealityUnifiedShiftGraph(graph,{expectedShiftId:uuid});
 assert.equal(x.status,'UNIFIED_OWNER_JOB_CONTROL_READY');
 assert.equal(x.jobs.length,4);
 assert.equal(x.engineering_ready,true);
 assert.equal(x.pr_ready,true);
 assert.equal(x.install_approval_pending,false);
 assert.equal(x.next_action,'GENERATE_AND_INDEPENDENTLY_TEST_SAME_REPAIR');
 assert.equal(x.all_selected_settled,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(x.production_changed,false);
 assert.equal(x.jobs.filter(x=>x.original_work_id).length,2);
});
test('installed/uninstalled and historical outcomes cannot authorize a batch or replay',()=>{
 for(const fake of [
  {...graph,installation_authorized:true},
  {...graph,original_job_completed_by_graph:true},
  {...graph,production_changed:true},
  {...graph,shift_id:'11111111-1111-4111-8111-111111111111'},
  {...graph,selected_sources:3},
  {...graph,jobs:graph.jobs.map((x,i)=>i===1?{...x,original_work_id:graph.jobs[0].original_work_id}:x)},
  {...graph,jobs:graph.jobs.map((x,i)=>i===1?{...x,source_ref:graph.jobs[0].source_ref}:x)},
  {...graph,jobs:graph.jobs.map((x,i)=>i===0?{...x,
   independent_source_proof_verified:false}:x)},
  {...graph,jobs:graph.jobs.map((x,i)=>i===0?{...x,
   original_kind:'GENUINE_UNIVERSE_CAPABILITY_ORIGINAL',phase:'SOURCE_ADMITTED'}:x)}
 ]){
  if(fake!==undefined)
   assert.throws(()=>assertRealityUnifiedShiftGraph(fake,{expectedShiftId:uuid}),
    /REALITY_UNIFIED_SHIFT_/);
 }
});
test('no authorized work produces a read-only empty decision, not an execution claim',()=>{
 const x=assertRealityUnifiedShiftGraph({
  status:'NO_CURRENT_OWNER_SHIFT_EXECUTION_GRAPH',jobs:[],
  installation_authorized:false,production_changed:false
 });
 assert.equal(x.status,'NO_CURRENT_AUTHORIZED_WORK');
 assert.equal(x.jobs.length,0);
 assert.equal(x.next_action,'AWAIT_SIGNED_OWNER_START');
});
test('source not yet independently verified can only advance to source readback',()=>{
 const fresh={...graph,jobs:graph.jobs.map((x,i)=>i===0?{
  ...x,original_kind:'UNVERIFIED_SOURCE',phase:'QUEUED',
  original_work_id:null,source_proof_sha256:null,
  independent_source_proof_verified:false,
  next_governed_action:'VERIFY_SOURCE_BEFORE_ANY_EXECUTION'
 }:x)};
 const x=assertRealityUnifiedShiftGraph(fresh);
 assert.equal(x.engineering_ready,false);
 assert.equal(x.next_action,'VERIFY_EXACT_SOURCE_EVIDENCE');
});
test('source-authenticated worker uses one unified graph before and after the ordinary shift pulse',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const rpc=readFileSync(new URL(
  '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261108_unified_owner_original_work_graph_v1.sql',
  import.meta.url),'utf8');
 assert.match(worker,/assertRealityUnifiedShiftGraph/);
 assert.match(worker,/reality_read_current_shift_execution_graph_v1/);
 assert.match(worker,/const hasVerifiedSource/);
 assert.match(worker,/const hasReview/);
 assert.match(worker,/unified_execution_graph:/);
 assert.match(worker,/NO_CURRENT_OWNER_AUTHORIZED_TRIAGE_143_SOURCE/);
 assert.match(rpc,/read_current_shift_execution_graph_v1/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/w.plan_fingerprint=s.plan_fingerprint/);
 assert.match(sql,/riley_unattended_repair_originals_v1/);
 assert.match(sql,/genuine_capability_queue_v1/);
 assert.match(sql,/riley_pr_review_originals_v1/);
 assert.match(sql,/source_scope/);
 assert.match(sql,/revoke all on function public.reality_read_current_shift_execution_graph_v1/);
 assert.doesNotMatch(sql,/grant execute[^;]*to authenticated/);
});