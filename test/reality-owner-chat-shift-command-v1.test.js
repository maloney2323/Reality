import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 interpretSignedInChatShiftCommand,safeShiftReadbackState,
} from '../reality-owner-chat-shift-command-v1.js';

const commands=[
 ['Run an eight-hour autonomous shift',8],
 ['Reality, run a 10-hour development shift and research competitors',10],
 ['Start a 12 hour workday',12],
 ['Start a 3 hour shift',3],
 ['Begin a three-hour governed shift',3],
 ['Schedule a 1 hour employee shift',1],
 ['Run a 9 hour development shift',9],
 ['Please launch 8 hr shift',8],
 ['Begin a ten hour governed shift',10],
 ['schedule a twelve-hour employee shift',12],
 ['Hey Reality, run an 8 hour shift',8],
];
test('explicit first-person owner instructions are the only start-shift trigger',()=>{
 for(const [text,hours] of commands){
  const r=interpretSignedInChatShiftCommand(text);
  assert.equal(r?.duration_hours,hours,text);
  assert.equal(r?.intent,'START_ONE_OWNER_AUTHORIZED_EMPLOYEE_SHIFT');
  assert.equal(r?.authorization_source,'EXPLICIT_SIGNED_IN_CHAT_SEND_ACTION');
  assert.equal(r?.installation_authorized,false);
  assert.equal(r?.production_changed,false);
 }
});
test('passive questions, simulated shifts, unsupported durations and recurring work never dispatch',()=>{
 for(const value of [
  'Tell me whether Reality can run an 8 hour shift',
  'How about a twelve-hour shift?',
  'I want an eight-hour workday',
  'Can we plan a 10-hour shift?',
  "Don't run a 12 hour shift",
  'Please simulate an 8 hour shift',
  'Run a 13 hour shift',
  'Run a 24 hour shift',
  'Run an eight hour shift every day',
  'Schedule a 10 hour shift daily',
  'What if we run an 8 hour shift?',
  'Execute code',
  'Start work',
  'Hi',
  'Run an eight-hour shift without starting anything',
  '',
 ]){
   assert.equal(interpretSignedInChatShiftCommand(value),null,value);
 }
});
test('shift readback accepts exact one active owner shift and rejects ambiguity',()=>{
 const start='2026-11-06T08:00:00.000Z',end='2026-11-06T18:00:00.000Z';
 const x={shift_id:'11111111-2222-4333-8444-555555555555',
  status:'QUEUED',planned_start_at:start,planned_end_at:end};
 const clock=Date.parse('2026-11-06T09:00:00.000Z');
 const r=safeShiftReadbackState({ok:true,shifts:[x]},{requestedHours:10,now:clock});
 assert.equal(r.hasActive,true);
 assert.equal(r.duration_hours,10);
 assert.equal(r.matching_requested_hours,true);
 assert.equal(safeShiftReadbackState({ok:true,shifts:[x]},
  {requestedHours:12,now:clock}).matching_requested_hours,false);
 assert.equal(safeShiftReadbackState({ok:true,shifts:[]}).hasActive,false);
 assert.throws(()=>safeShiftReadbackState({ok:true,shifts:[x,x]},{now:clock}),
  /MULTIPLE_ACTIVE/);
 assert.throws(()=>safeShiftReadbackState({ok:true,shifts:[{
  ...x,planned_end_at:'2026-11-07T08:00:00.000Z'}]},{now:clock}),
  /ACTIVE_IDENTITY/);
});
test('expired unclosed original shift does not hold the new owner shift hostage',()=>{
 const past={shift_id:'11111111-2222-4333-8444-555555555555',
  status:'AWAITING_EXACT_ORIGINAL_WORK',
  planned_start_at:'2026-11-07T22:58:08.286Z',
  planned_end_at:'2026-11-08T06:58:08.286Z'};
 const now=Date.parse('2026-11-08T09:00:00.000Z');
 const r=safeShiftReadbackState({ok:true,shifts:[past]},{now});
 assert.equal(r.hasActive,false);
 assert.equal(r.expired_unclosed_shifts,1);
 const next={...past,shift_id:'22222222-3333-4444-8555-666666666666',
  status:'QUEUED',planned_start_at:'2026-11-08T09:10:00.000Z',
  planned_end_at:'2026-11-08T17:10:00.000Z'};
 const shared=safeShiftReadbackState({ok:true,shifts:[past,next]},{now});
 assert.equal(shared.hasActive,true);
 assert.equal(shared.shift_id,next.shift_id);
 assert.equal(shared.expired_unclosed_shifts,1);
 assert.throws(()=>safeShiftReadbackState({ok:true,shifts:[
  {...past,planned_end_at:'garbled'},next]},{now}),/ACTIVE_IDENTITY/);
 assert.throws(()=>safeShiftReadbackState({ok:true,shifts:[next,
  {...next,shift_id:'33333333-4444-4555-8666-777777777777'}]},{now}),
  /MULTIPLE_ACTIVE/);
});
test('Chat uses signed-in Send event and the real authenticated shift endpoint',()=>{
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 const shift=readFileSync(new URL('../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 assert.match(ui,/type="module"/);
 assert.match(ui,/interpretSignedInChatShiftCommand\(value,\{/);
 assert.match(ui,/const before=await json\(SHIFT/);
 assert.match(ui,/safeShiftReadbackState\(before/);
 assert.match(ui,/action:'AUTHORIZE_EXACT_EMPLOYEE_SHIFT'/);
 assert.match(ui,/requested_hours:command.duration_hours/);
 assert.match(ui,/expected_fingerprint:draft.expected_fingerprint/);
 assert.match(ui,/planned_start_at:start/);
 assert.match(ui,/created.worker_dispatch_verified!==false/);
 assert.match(ui,/void refreshShiftStatus\(\)/);
 assert.match(shift,/await authenticatedChatSession\(req,res\)/);
 assert.match(shift,/assertSameOrigin\(req\)/);
 assert.match(shift,/reality_authorize_employee_completion_shift_v1/);
 assert.match(shift,/reality_authorize_employee_shift_v1/);
 assert.match(shift,/worker_dispatch_verified:false/);
 assert.doesNotMatch(ui,/installation_authorized:true|production_changed:true/);
});
test('no new owner worker, governor, ledger, or model-based shift authority created',()=>{
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(ui,/Shift authorization is not a verified worker dispatch/);
 assert.match(ui,/[Tt]he existing trusted worker scheduler/);
 assert.match(ui,/The current shift engine performs source validation/);
 assert.doesNotMatch(ui,/REALITY_EMPLOYEE_SHIFT_WORKER_TOKEN/);
 assert.doesNotMatch(ui,/new Worker\(/);
});

test('ordinary signed-in Start the shift/job commands authorize the existing exact work scope without a magic phrase',()=>{
 for(const message of [
  'Start the shift','Start the job','Start the jobs',
  'Run the shift','Begin the job now','Reality, start the shift',
  'Start Riley and Taylor\'s shift now','Start Riley\'s shift',
  'Start the automation jobshift','I authorize your automation jobshift',
  'I authorize Reality to start the shift','I authorize the current jobs'
 ]){
  const command=interpretSignedInChatShiftCommand(message,{selectedHours:8});
  assert.equal(command?.intent,'START_ONE_OWNER_AUTHORIZED_EMPLOYEE_SHIFT',message);
  assert.equal(command?.duration_hours,8,message);
  assert.equal(command?.authorization_source,'EXPLICIT_SIGNED_IN_CHAT_SEND_ACTION',message);
  assert.equal(command?.installation_authorized,false,message);
  assert.equal(command?.repeated_confirmations_required,false,message);
 }
 assert.equal(interpretSignedInChatShiftCommand('Start the job',{selectedHours:10}).duration_hours,8);
 assert.equal(interpretSignedInChatShiftCommand('Start the job',{selectedHours:10}).completion_bound,true);
 assert.equal(interpretSignedInChatShiftCommand('Start the shift',{selectedHours:13}),null);
 for(const message of [
  'What if I start the shift?','I am ready to approve',
  'Do not start the job','Start the job tomorrow',
  'Start the job after the tests','Start the shift every day',
  'Can you start the shift?','Pretend to start the job',
  'Example: start the shift','Start work',
  'I authorize everyone to deploy production'
 ])
  assert.equal(interpretSignedInChatShiftCommand(message),null,message);
});

test('ordinary one-tap Start Jobs means until every independent final receipt, never eight-hour expiry',()=>{
 for(const command of [
  'Start the jobs','Start the shift','Start the job',
  'Run the full shift','Start the jobs until complete',
  'Start jobs until tested and verified',
  'Start jobs until verified and receipted'
 ]){
  const out=interpretSignedInChatShiftCommand(command);
  assert.equal(out?.intent,'START_ONE_OWNER_AUTHORIZED_EMPLOYEE_SHIFT',command);
  assert.equal(out?.completion_bound,true,command);
  assert.equal(out?.installation_authorized,false,command);
 }
 const timed=interpretSignedInChatShiftCommand('Start a 3 hour shift');
 assert.equal(timed?.completion_bound,false);
 assert.equal(timed?.duration_hours,3);
});
test('completion-bound work remains active until independently settled despite elapsed 8-hour estimate',()=>{
 const s={shift_id:'11111111-2222-4333-8444-555555555555',
  status:'AWAITING_EXACT_ORIGINAL_WORK',
  planned_start_at:'2026-11-05T01:00:00.000Z',
  planned_end_at:'infinity'};
 const r=safeShiftReadbackState({ok:true,shifts:[s]},{
  requestedHours:8,now:Date.parse('2026-11-08T09:00:00Z')});
 assert.equal(r.hasActive,true);
 assert.equal(r.completion_bound,true);
 assert.equal(r.duration_hours,null);
 assert.equal(r.completion_condition,
  'ALL_SELECTED_JOBS_INDEPENDENTLY_VERIFIED_AND_RECEIPTED');
 assert.equal(r.expired_unclosed_shifts,0);
});
test('completion-bound owner UI uses exact signed-in start and never asks for hours',()=>{
 const html=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 const api=readFileSync(new URL('../api/reality/personal-governed-employee-shift.js',
  import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261108_completion_bound_employee_work_warrant_v1.sql',
  import.meta.url),'utf8');
 assert.match(html,/Start the jobs until complete/);
 assert.match(html,/completion_bound:true/);
 assert.match(api,/reality_authorize_employee_completion_shift_v1/);
 assert.match(api,/completion_bound:b\.completion_bound===true/);
 assert.match(sql,/ALL_AUTHORIZED_ORIGINAL_JOBS_INDEPENDENTLY_SETTLED/);
 assert.match(sql,/genuine_independent_final_receipts_v1/);
 assert.match(sql,/riley_pr_review_originals_v1/);
 assert.match(sql,/realized_cash_savings_usd',null/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/planned_end_at='infinity'::timestamptz/);
 assert.doesNotMatch(sql,/grant execute[^;]*to authenticated/);
});
