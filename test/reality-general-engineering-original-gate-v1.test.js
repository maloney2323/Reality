import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRealityUnifiedShiftGraph}
 from '../src/reality-shift-unified-execution-controller-v1.js';

const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const issue=n=>'https://github.com/maloney2323/Reality/issues/'+n;
const pull=n=>'https://github.com/maloney2323/Reality/pull/'+n;
const work=x=>'work:'+x.repeat(32);
const job=(index,source,kind,phase,id,next)=>({
 source_step_index:index,source_ref:source,original_kind:kind,phase,
 original_work_id:id,next_governed_action:next,
 source_proof_sha256:'sha256:'+'a'.repeat(64),
 independent_source_proof_verified:true,
 capability_installation_authorized:false,
 original_job_completed_by_graph:false,
 provider_effect_claimed_by_graph:false
});
const graph=()=>({
 status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
 shift_id:SHIFT,owner_id:OWNER,plan_fingerprint:'sha256:'+'b'.repeat(64),
 completion_bound:true,selected_sources:4,
 execution_scope_from_owner_warrant_only:true,new_job_created:false,
 installation_authorized:false,original_job_completed_by_graph:false,
 production_changed:false,
 jobs:[
  job(2,issue(263),'REAL_ENGINEERING_REPAIR_ORIGINAL','SETTLED',
      work('c'),'DO_NOT_REEXECUTE_ORIGINAL'),
  job(3,issue(185),'REAL_ENGINEERING_REPAIR_ORIGINAL','SOURCE_ADMITTED',
      work('d'),'GENERATE_AND_INDEPENDENTLY_TEST_SAME_REPAIR'),
  job(4,pull(57),'REAL_PR_REVIEW_ORIGINAL','PREPARED',
      work('e'),'CONTINUE_VERIFIED_PR_REVIEW'),
  job(5,issue(62),'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL','NOT_ADMITTED',
      null,'QUALIFY_DISTINCT_OWNER_WORK_NO_FAKE_JOB')
 ]
});

test('a second independently verified issue original can be routed, without replaying settled #263',()=>{
 const x=assertRealityUnifiedShiftGraph(graph(),{expectedShiftId:SHIFT});
 assert.equal(x.status,'UNIFIED_OWNER_JOB_CONTROL_READY');
 assert.equal(x.engineering_ready,true);
 assert.equal(x.jobs[0].phase,'SETTLED');
 assert.equal(x.jobs[1].original_work_id,work('d'));
 assert.equal(x.next_action,'GENERATE_AND_INDEPENDENTLY_TEST_SAME_REPAIR');
 assert.equal(x.all_selected_settled,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(x.production_changed,false);
});

test('an issue observation is not an engineering original without independent admission',()=>{
 for(const changed of [
  {original_work_id:null},
  {independent_source_proof_verified:false},
  {source_proof_sha256:null},
  {source_ref:pull(99)},
  {source_ref:issue(263)},
 ]){
  const g=graph();
  g.jobs[1]={...g.jobs[1],...changed};
  assert.throws(()=>assertRealityUnifiedShiftGraph(g,{expectedShiftId:SHIFT}),
   /REALITY_UNIFIED_SHIFT_/);
 }
});

test('no source kind recasting of independently verified #263 is allowed',()=>{
 const g=graph();
 g.jobs[0]={...g.jobs[0],original_kind:'GENUINE_UNIVERSE_CAPABILITY_ORIGINAL'};
 assert.throws(()=>assertRealityUnifiedShiftGraph(g,{expectedShiftId:SHIFT}),
  /EXACT_REPAIR_IDENTITY_MUST_NOT_BE_RECAST_AS_OTHER_ENGINE/);
});
