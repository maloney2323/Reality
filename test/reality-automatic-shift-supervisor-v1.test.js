import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectRealityAutomaticShiftSupervisor}
 from '../src/reality-automatic-shift-supervisor-v1.js';
import {reconcileRealityMixedShiftReceipts}
 from '../src/reality-mixed-shift-receipts-v1.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const prefix='https://github.com/maloney2323/Reality/';
const digest='sha256:'+'a'.repeat(64);
const native='work:873a6e74fd14c6beacc9042dd8021dfc';
const pr='work:94fc872f8ba9062f968920c59218c3ca';
const sources=[prefix+'issues/263',prefix+'issues/185',
 prefix+'pull/57',prefix+'issues/62'];
const originals=[native,null,pr,null];
const phases=['SETTLED','NOT_ADMITTED','SETTLED','NOT_ADMITTED'];
const kinds=['REAL_ENGINEERING_REPAIR_ORIGINAL',
 'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL',
 'REAL_PR_REVIEW_ORIGINAL',
 'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL'];
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',shift_id:shift,
 owner_id:owner,jobs:sources.map((source_ref,i)=>({
  source_ref,source_step_index:i+2,source_proof_sha256:digest,
  independent_source_proof_verified:true,
  original_work_id:originals[i],phase:phases[i],
  original_kind:kinds[i],capability_installation_authorized:false,
  original_job_completed_by_graph:false,provider_effect_claimed_by_graph:false
 }))};
const mixed={version:'reality-mixed-shift-receipts-v1',shift_id:shift,
 read_only:true,current_shift_complete:false,installation_authorized:false,
 production_changed:false,source_items_in_authorized_scope:4,
 completed_original_receipts:[
  {original_work_id:native,source_ref:sources[0],source_proof_sha256:digest,
   final_receipt_ref:'supabase:riley_native_independent_final_receipts_v1:681ce4ab-4dd0-47cf-963b-dc65087468fc',
   independently_settled:true,installation_authorized_by_this_read:false,
   work_replayed_by_this_read:false},
  {original_work_id:pr,source_ref:sources[2],source_proof_sha256:digest,
   final_receipt_ref:'supabase:riley_pr_review_originals_v1:6d699686-c233-4c9d-aad0-611474f70114',
   independently_settled:true,installation_authorized_by_this_read:false,
   work_replayed_by_this_read:false}
 ],source_items_without_verified_final_receipt:[sources[1],sources[3]]
};
test('automatic supervisor recognizes two exact receipted originals and leaves two source proposals unqualified',()=>{
 const x=projectRealityAutomaticShiftSupervisor(graph,mixed);
 assert.equal(x.independently_settled_originals,2);
 assert.equal(x.sources_needing_distinct_qualification,2);
 assert.equal(x.existing_originals_to_continue,0);
 assert.equal(x.next_worker_pulse_code,'AUTO_TRIAGE_2_SETTLED_2_NEED_QUALIFICATION');
 assert.equal(x.jobs[0].status,'EXACT_ORIGINAL_INDEPENDENTLY_SETTLED_NO_REPLAY');
 assert.equal(x.jobs[2].next_action,'DO_NOT_REEXECUTE');
 assert.equal(x.jobs[1].status,'SOURCE_VALIDATED_ORIGINAL_JOB_NOT_QUALIFIED');
 assert.equal(x.jobs[3].original_work_id,null);
 assert.equal(x.automatically_started_job_count,0);
 assert.equal(x.original_job_admission_authorized_by_triage,false);
 assert.equal(x.install_approval_authorized_by_triage,false);
 assert.equal(x.shift_completed_by_triage,false);
 assert.equal(x.measured_roi_usd,null);
});
test('signed original already admitted may continue only through existing trusted worker gates',()=>{
 const incoming={...graph,jobs:graph.jobs.map((j,i)=>i===1?{
  ...j,original_work_id:'work:'+'c'.repeat(32),
  original_kind:'GENUINE_UNIVERSE_CAPABILITY_ORIGINAL',
  phase:'PENDING_FROZEN_REPRODUCTION'
 }:j)};
 const x=projectRealityAutomaticShiftSupervisor(incoming,mixed);
 assert.equal(x.existing_originals_to_continue,1);
 assert.equal(x.sources_needing_distinct_qualification,1);
 assert.equal(x.jobs[1].next_action,'USE_CURRENT_TRUSTED_WORKER_PREWAKE_AND_ATOMIC_CLAIM');
 assert.equal(x.jobs[1].creates_job,false);
 assert.equal(x.jobs[1].claim_consumed,false);
});
test('verified source and receipt identity mismatches must fail closed',()=>{
 const altered={...mixed,completed_original_receipts:mixed.completed_original_receipts.map((r,i)=>
  i===0?{...r,source_proof_sha256:'sha256:'+'b'.repeat(64)}:r)};
 assert.throws(()=>projectRealityAutomaticShiftSupervisor(graph,altered),
  /SETTLED_ORIGINAL_NOT_MATCHED_TO_CURRENT_GRAPH/);
 const duplicate={...mixed,completed_original_receipts:[mixed.completed_original_receipts[0],mixed.completed_original_receipts[0]]};
 assert.throws(()=>projectRealityAutomaticShiftSupervisor(graph,duplicate),
  /EXACT_COMPLETED_WORK_RECEIPT_INVALID/);
 const invalid={...graph,jobs:graph.jobs.map((j,i)=>i===0?{
  ...j,capability_installation_authorized:true
 }:j)};
 assert.throws(()=>projectRealityAutomaticShiftSupervisor(invalid,mixed),
  /SIGNED_SOURCE_GRAPH_UNTRUSTED/);
 const changed={...mixed,shift_id:'21dff8db-6f46-444d-a149-ab15f1caf8fe'};
 assert.throws(()=>projectRealityAutomaticShiftSupervisor(graph,changed),
  /CURRENT_OWNER_SCOPE_AND_INDEPENDENT_RECEIPTS_REQUIRED/);
});
test('supervisor is integrated in authenticated owner read and the current service wake, without starting a shift',()=>{
 const ownerAPI=readFileSync(new URL('../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const ownerUI=readFileSync(new URL('../reality-shift-conversation-v1.js',import.meta.url),'utf8');
 assert.match(ownerAPI,/projectRealityAutomaticShiftSupervisor\(/);
 assert.match(ownerAPI,/shift_automatic_supervisor_status/);
 assert.match(worker,/projectRealityAutomaticShiftSupervisor\(/);
 assert.match(worker,/automaticWorkSupervisor\.next_worker_pulse_code/);
 assert.match(worker,/p_safe_result:safeOutcome/);
 assert.match(ownerUI,/Automatic supervisor:/);
 assert.match(worker,/validSecret\(req,process\.env\)/);
 assert.doesNotMatch(worker,/reality_authorize_employee_shift_v1/);
});
