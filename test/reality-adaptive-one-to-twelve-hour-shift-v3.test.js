import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRealityEightHourShiftDraft}
 from '../src/reality-eight-hour-shift-plan-v1.js';
import {buildRealityWorkdayOpportunityBrief}
 from '../src/reality-workday-opportunity-brief-v1.js';
import {computeShiftFingerprint} from '../src/reality-governed-shift-boundary-v1.js';
import {interpretSignedInChatShiftCommand,safeShiftReadbackState}
 from '../reality-owner-chat-shift-command-v1.js';
import {buildRealityShiftConversationBrief}
 from '../src/reality-shift-conversation-brief-v1.js';
function brief(){
 const item={
  finding_id:'catalog:'+'a'.repeat(32),finding_type:'OPEN_ISSUE',
  source:'github_issues',state:'TRACKED_NEEDS_REVIEW',
  title:'Source-backed test issue',category:'reliability',
  evidence_refs:['https://github.com/maloney2323/Reality/issues/263'],
  value_assessment:{triage_score:89},
  execution_work_item:null,authorization_required:false
 };
 return buildRealityWorkdayOpportunityBrief({
  version:'reality-work-catalog-v0.1',status:'OBSERVED',
  observed_at:'2026-11-06T17:00:00.000Z',authority:'NONE_GRANTED',
  execution_enabled:false,items:[item],
  source_coverage:{issues:'checked',pull_requests:'checked',
   actions:'checked',commits:'checked',customer_feedback:'not_connected',
   business_operations:'not_connected',external_research:'not_connected'}
 });
}
test('exact 1–12h shift preserves eight governed steps and source authority',()=>{
 const b=brief(),hashes=new Set();
 for(let hours=1;hours<=12;hours++){
  const plan=buildRealityEightHourShiftDraft(b,{durationHours:hours});
  assert.equal(plan.shift_duration_hours,hours);
  assert.equal(plan.shift_duration_minutes,hours*60);
  assert.equal(plan.slots.length,8);
  assert.equal(plan.slots[0].offset_start_minutes,0);
  assert.equal(plan.slots.at(-1).offset_end_minutes,hours*60);
  assert.ok(plan.slots.every((s,i)=>s.planning_minutes>=1&&
   s.planning_minutes<=120&&s.sequence===i+1&&
   s.offset_end_minutes-s.offset_start_minutes===s.planning_minutes&&
   s.offset_start_minutes===(i?plan.slots[i-1].offset_end_minutes:0)));
  assert.equal(plan.installation_authorized,false);
  assert.equal(plan.job_started,false);
  assert.equal(plan.ready_to_execute_batch,false);
  assert.equal(plan.financial_roi_verified,false);
  const hash=computeShiftFingerprint(plan);
  assert.match(hash,/^sha256:[a-f0-9]{64}$/);
  assert.equal(hashes.has(hash),false);
  hashes.add(hash);
 }
});
test('3h and 12h support exact signed-in Chat with no passive or repeated authority',()=>{
 for(const hours of [1,3,7,9,11,12]){
  const r=interpretSignedInChatShiftCommand('Run a '+hours+' hour shift');
  assert.equal(r?.duration_hours,hours);
  assert.equal(r?.installation_authorized,false);
  assert.equal(r?.authorization_source,'EXPLICIT_SIGNED_IN_CHAT_SEND_ACTION');
 }
 for(const prompt of [
  'Schedule a 3 hour shift every week',
  'What if Riley works 12 hours?',
  "Don't run a 3 hour shift",
  'Run a 13 hour shift',
  'Run a 0 hour shift',
  'Plan three hours tomorrow'
 ]){
  assert.equal(interpretSignedInChatShiftCommand(prompt),null,prompt);
 }
});
test('3h active readback and conversation remain accurate, not human wages saved',()=>{
 const shift={
  shift_id:'11111111-2222-4333-8444-555555555555',
  status:'QUEUED',planned_start_at:'2026-11-09T12:00:00.000Z',
  planned_end_at:'2026-11-09T15:00:00.000Z',
  steps:Array.from({length:8},(_,i)=>({
   step_index:i+1,state:'QUEUED',proof_sha256:null
  }))
 };
 const r=safeShiftReadbackState({ok:true,shifts:[shift]},{requestedHours:3});
 assert.equal(r.duration_hours,3);
 assert.equal(r.matching_requested_hours,true);
 const b=buildRealityShiftConversationBrief([shift],[],
  new Date('2026-11-09T11:59:00.000Z'));
 assert.equal(b.shift_duration_hours,3);
 assert.equal(b.verified_human_hours_saved,null);
 assert.equal(b.complete_shift_proven,false);
});
test('backend enforces variable shift fingerprint and DB function 1–12h without expanding installation permissions',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261106_adaptive_one_to_twelve_hour_governed_shift_v3.sql',import.meta.url),'utf8');
 const api=readFileSync(new URL(
  '../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 const planner=readFileSync(new URL(
  '../src/reality-next-week-employee-plan-v1.js',import.meta.url),'utf8');
 assert.match(sql,/drop constraint if exists governed_employee_shifts_v1_allowed_hours_v2/);
 assert.match(sql,/interval '1 hour'/);
 assert.match(sql,/interval '12 hours'/);
 assert.match(sql,/mod\(v_end,60\)<>0/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/p_fingerprint/);
 assert.doesNotMatch(sql,/truncate|delete from/i);
 assert.match(api,/hours<1\|\|hours>12/);
 assert.match(api,/computeShiftFingerprint\(plan\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(ui,/id="runShiftHours"/);
 assert.match(ui,/Start the jobs until complete/);
 assert.match(ui,/command.completion_bound!==true/);
 assert.match(api,/reality_authorize_employee_completion_shift_v1/);
 assert.match(planner,/maximum_daily_review_timebox_hours:12/);
 assert.match(planner,/daily_hours_follow_source_workload_not_a_fixed_eight_hour_quota:true/);
 assert.doesNotMatch(api,/installation_authorized:true/);
});
