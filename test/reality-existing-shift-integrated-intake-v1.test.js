import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectRealityExistingShiftIntegratedIntake}
 from '../src/reality-existing-shift-integrated-intake-v1.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const repo='https://github.com/maloney2323/Reality/issues/';
const sha='sha256:'+'a'.repeat(64);
const urls=[repo+'263',repo+'185',
 'https://github.com/maloney2323/Reality/pull/57',repo+'62'];
const ids=['work:'+'1'.repeat(32),null,'work:'+'2'.repeat(32),null];
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',shift_id:shift,
 owner_id:owner,plan_fingerprint:sha,
 jobs:urls.map((source_ref,i)=>({
  source_ref,source_step_index:i+2,original_work_id:ids[i]
 }))};
const supervisor={
 status:'AUTOMATIC_SOURCE_TRIAGE_RECONCILED_NO_NEW_AUTHORITY',
 shift_id:shift,owner_id:owner,selected_source_count:4,
 independently_settled_originals:2,sources_needing_distinct_qualification:2,
 read_only:true,production_changed:false,
 install_approval_authorized_by_triage:false,
 original_job_admission_authorized_by_triage:false,
 jobs:urls.map((source_ref,i)=>({
  source_ref,source_step_index:i+2,original_work_id:ids[i],
  status:[0,2].includes(i)?
   'EXACT_ORIGINAL_INDEPENDENTLY_SETTLED_NO_REPLAY':
   'SOURCE_VALIDATED_ORIGINAL_JOB_NOT_QUALIFIED',
  independently_verified_final_receipt_ref:[0,2].includes(i)?
   'supabase:independent:proof':'',
  claim_consumed:false,creates_job:false,
  approved_installation:false,production_changed:false
 }))
};
const issues=[62,143,178,185,188,201,263].map(n=>({
 issue_url:repo+n,issue_number:n,
 title:'Real source issue '+n+' awaits independent validation'
}));
const weekly={
 status:'EXISTING_WEEKLY_SOURCE_SNAPSHOT_RECONCILED_READ_ONLY',
 owner_scope_verified:true,shift_id:shift,plan_fingerprint:sha,
 source_sha256:'b'.repeat(64),week_start:'2026-11-16',
 open_issue_count:7,open_issues:issues,
 snapshot_is_original_job_qualification:false,
 snapshot_is_new_execution_authority:false,
 execution_authorized_by_read:false,
 installation_authorized:false,production_changed:false
};
const titles=['Evidence-backed safe resumption','Cross-connector authorization',
 'Managed agent execution','Runtime evaluation budgets','Historic repair #188'];
const capabilityFeed={
 ok:true,status:'OWNER_GAP_INTAKE_RECONCILED',owner_id:owner,
 read_only:true,work_started:false,production_changed:false,
 counts:{current_candidates:5,verified_current_gaps:0},
 items:titles.map((title,i)=>({
  key:'cap:'+i,kind:i===4?'INDEPENDENTLY_TESTED_CANDIDATE':
   'RESEARCH_OPPORTUNITY',title,stage:'INSPECTED_NEEDS_GAP_TEST',
  potential_value:'Review expected benefit and risk',
  next_proof:'Verify source and current original scope',
  executable_job:false,installation_authorized:false,
  verified_missing_capability:false
 }))
};
const args={graph,supervisor,weekly,capabilityFeed};
test('automatically recognizes weekly work AND exact homepage upgrade list within same authorized shift',()=>{
 const result=projectRealityExistingShiftIntegratedIntake(args);
 assert.equal(result.independent_settlements_recognized,2);
 assert.equal(result.current_shift_sources_needing_qualification,2);
 assert.equal(result.weekly_source_observations,7);
 assert.equal(result.homepage_upgrade_opportunities,5);
 assert.equal(result.verified_current_capability_gaps,0);
 assert.equal(result.next_worker_pulse_code,
  'AUTO_INTAKE_2_SETTLED_2_UNQUALIFIED_7_WEEKLY_5_UPGRADES');
 assert.equal(result.weekly_sources.find(x=>x.source_url.endsWith('/263')).scope_status,
  'SETTLED_CURRENT_WARRANT_NO_REPLAY');
 assert.equal(result.weekly_sources.find(x=>x.source_url.endsWith('/185')).scope_status,
  'INSIDE_CURRENT_WARRANT_QUALIFICATION_REQUIRED');
 assert.equal(result.weekly_sources.find(x=>x.source_url.endsWith('/143')).scope_status,
  'OUTSIDE_CURRENT_WARRANT_REVIEW_ONLY');
 assert.equal(result.homepage_capability_candidates[4].intake_status,
  'TESTED_HISTORICALLY_REQUIRES_FRESH_ORIGINAL_BINDING');
 assert.equal(result.qualified_new_original_jobs_from_this_projection,0);
 assert.equal(result.current_shift_scope_extended,false);
 assert.equal(result.original_jobs_created,false);
 assert.equal(result.original_jobs_started,false);
 assert.equal(result.owner_approval_consumed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
});
test('no weekly issue or inspected homepage proposal can grant new original authority',()=>{
 for(const changed of [
  {...weekly,shift_id:'21dff8db-6f46-444d-a149-ab15f1caf8fe'},
  {...weekly,snapshot_is_new_execution_authority:true},
  {...weekly,open_issues:[...issues,issues[0]],open_issue_count:8},
  {...weekly,open_issues:issues.map((x,i)=>i===0?
    {...x,issue_url:'https://evil.example/issues/62'}:x)},
  {...weekly,plan_fingerprint:'sha256:'+'f'.repeat(64)},
 ])assert.throws(()=>projectRealityExistingShiftIntegratedIntake({
  ...args,weekly:changed}),/REALITY_INTEGRATED_INTAKE_/);
 for(const changed of [
  {...capabilityFeed,owner_id:'21dff8db-6f46-444d-a149-ab15f1caf8fe'},
  {...capabilityFeed,items:capabilityFeed.items.map((x,i)=>i===0?
   {...x,executable_job:true}:x)},
  {...capabilityFeed,items:capabilityFeed.items.map((x,i)=>i===0?
   {...x,verified_missing_capability:true}:x)}
 ])assert.throws(()=>projectRealityExistingShiftIntegratedIntake({
  ...args,capabilityFeed:changed}),/REALITY_INTEGRATED_INTAKE_/);
});
test('existing scheduled worker and owner Chat read same private inventory, never authorize second shift',()=>{
 const files=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
 const worker=files('api/reality/governed-employee-shift-worker.js');
 const ownerRead=files('api/reality/personal-governed-employee-shift.js');
 const sql=files('supabase/migrations/20261113_existing_shift_weekly_capability_intake_v1.sql');
 for(const code of [worker,ownerRead]){
  assert.match(code,/projectRealityExistingShiftIntegratedIntake/);
  assert.match(code,/reality_read_owner_shift_weekly_backlog_v1/);
  assert.match(code,/reality_read_owner_capability_gap_feed_v1/);
 }
 assert.match(worker,/integratedWorkIntake.next_worker_pulse_code/);
 assert.match(worker,/validSecret\(req,process\.env\)/);
 assert.doesNotMatch(worker,/reality_authorize_employee_shift_v1/);
 assert.match(sql,/security invoker/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/revoke all on function/);
 assert.match(sql,/snapshot_is_new_execution_authority',false/);
});
