import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectRealityEmployeeTimeInquiryContext as project}
 from '../src/reality-employee-time-inquiry-context-v1.js';

const owner='11111111-2222-4333-8444-555555555555';
const stamp='2026-11-16T12:00:00.000Z';
const h='sha256:'+'a'.repeat(64);
const roster={
 status:'READ_ONLY_PROPOSED_AI_EMPLOYEES',
 proposed_employees:[
  {display_name:'Employee One',function_id:'fn_one',
   responsibilities:['Review source evidence'],business_outcome:'Verified improvement'},
  {display_name:'Employee Two',function_id:'fn_two',
   responsibilities:['Investigate customer needs'],business_outcome:'Customer outcomes'}
 ],
 original_job_admitted:false,installation_authorized:false,
 production_changed:false
};
const time={
 ok:true,status:'REALITY_OWNER_TIME_HORIZON_READ_ONLY',
 owner_scope_verified:true,read_only:true,
 approved_new_work_by_read:false,shift_started_by_read:false,
 deployment_changed_by_read:false,billing_changed_by_read:false,
 new_jobs_created_by_read:0,verified_cash_savings_usd:null,
 past:{status:'INDEPENDENT_HISTORY_VERIFIED',
  verified_final_loop_receipts:2},
 present:{status:'OWNER_SHIFT_HISTORY_READBACK_VERIFIED',
  active_shift_count:1},
 future:{status:'OWNER_DISCOVERY_OBSERVATIONS_VERIFIED',
  snapshot_stale:false,observations_are_not_authorized_work:true,
  qualified_executable_jobs:0,source_checked_at:stamp}
};
const row=(employee,title,disposition,ref='https://example.com/a')=>({
 employee,title,disposition,source_ref:ref,evidence_sha256:h,
 source_family:'SOURCE',qualified_job:false,execution_authorized:false
});
const discovery={
 status:'OWNER_EMPLOYEE_DISCOVERY_SOURCE_INVENTORY',
 owner_id:owner,checked_at:stamp,
 shift_authorized:false,installation_authorized:false,
 production_changed:false,qualified_jobs:0,source_count:3,
 items:[
  row('Employee One','Unverified provider observation','NEEDS_CURRENT_VALIDATION'),
  row('Employee Two','Old evidence needs refresh','HISTORICAL_REVALIDATION_REQUIRED'),
  row('Employee One','Previously settled source','SETTLED_NO_REPLAY',
   'https://example.com/settled')
 ]
};

test('uses actual owner-scoped evidence to prepare role-specific inquiry sources',()=>{
 const out=project({ownerId:owner,roster,time,discovery});
 assert.equal(out.status,'VERIFIED_TIME_SOURCES_AVAILABLE_FOR_EMPLOYEE_INQUIRY');
 assert.equal(out.total_inquiry_sources,2);
 assert.equal(out.roles.length,2);
 assert.deepEqual(out.roles.map(x=>x.source_inquiries_available),[1,1]);
 assert.equal(out.roles[0].inquiry_sources[0].source_title,
  'Unverified provider observation');
 assert.equal(out.roles[1].inquiry_sources[0].source_time_perspective,
  'PAST_REQUIRES_CURRENT_PROOF');
 assert.equal(out.past_verified_receipt_count,2);
 assert.equal(out.present_active_shift_count,1);
 assert.equal(out.generated_question_count,0);
 assert.equal(out.qualified_executable_jobs,0);
 assert.equal(out.execution_authorized,false);
 assert.equal(out.production_changed,false);
});
test('stale or mismatched future evidence cannot become employee inquiry work',()=>{
 for(const t of [
  {...time,future:{...time.future,snapshot_stale:true}},
  {...time,future:{...time.future,source_checked_at:'2026-11-15T12:00:00.000Z'}},
  {...time,future:{status:'FUTURE_DISCOVERY_NOT_VERIFIED'}}
 ]){
  const out=project({ownerId:owner,roster,time:t,discovery});
  assert.equal(out.total_inquiry_sources,0);
  assert.equal(out.future_source_snapshot_verified,false);
  assert.equal(out.qualified_executable_jobs,0);
 }
});
test('settled source is withheld and duplicates do not become fresh work',()=>{
 const records=[
  discovery.items[0],{...discovery.items[0]},
  discovery.items[2]
 ];
 const out=project({ownerId:owner,roster,time,discovery:{
  ...discovery,items:records,source_count:records.length
 }});
 assert.equal(out.total_inquiry_sources,1);
});
test('no unverified role, owner or authorization enters the feed',()=>{
 assert.throws(()=>project({ownerId:'wrong',roster,time,discovery}),
  /OWNER_ROSTER_NOT_VERIFIED/);
 assert.throws(()=>project({ownerId:owner,roster,time,discovery:{
  ...discovery,owner_id:'22222222-2222-4222-8222-222222222222'
 }}),/DISCOVERY_OWNER_OR_SCOPE_UNVERIFIED/);
 assert.throws(()=>project({ownerId:owner,roster,time:{
  ...time,approved_new_work_by_read:true
 },discovery}),/TIME_READBACK_UNVERIFIED/);
 assert.throws(()=>project({ownerId:owner,roster,time,discovery:{
  ...discovery,items:[{...discovery.items[0],execution_authorized:true}],
  source_count:1
 }}),/UNTRUSTED_SOURCE_ITEM/);
});
test('existing employee and time endpoints use shared readback; no second queue',()=>{
 const api=readFileSync(new URL('../api/reality/personal-employee-roster.js',
  import.meta.url),'utf8');
 const home=readFileSync(new URL('../api/reality/personal-time-horizon.js',
  import.meta.url),'utf8');
 assert.match(api,/projectRealityEmployeeTimeInquiryContext/);
 assert.match(api,/readOwnerTimeHorizonEvidence/);
 assert.match(home,/export async function readOwnerTimeHorizonEvidence/);
 assert.match(home,/authenticatedChatSession\(req,res\)/);
 assert.doesNotMatch(api,/authorize_employee_shift|admit_exact_shift_original/);
});
