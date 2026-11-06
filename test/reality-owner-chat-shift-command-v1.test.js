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
  'Run a 7 hour shift',
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
 const r=safeShiftReadbackState({ok:true,shifts:[x]},{requestedHours:10});
 assert.equal(r.hasActive,true);
 assert.equal(r.duration_hours,10);
 assert.equal(r.matching_requested_hours,true);
 assert.equal(safeShiftReadbackState({ok:true,shifts:[x]},
  {requestedHours:12}).matching_requested_hours,false);
 assert.equal(safeShiftReadbackState({ok:true,shifts:[]}).hasActive,false);
 assert.throws(()=>safeShiftReadbackState({ok:true,shifts:[x,x]}),
  /MULTIPLE_ACTIVE/);
 assert.throws(()=>safeShiftReadbackState({ok:true,shifts:[{
  ...x,planned_end_at:'2026-11-07T08:00:00.000Z'}]}),
  /ACTIVE_IDENTITY/);
});
test('Chat uses signed-in Send event and the real authenticated shift endpoint',()=>{
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 const shift=readFileSync(new URL('../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 assert.match(ui,/type="module"/);
 assert.match(ui,/interpretSignedInChatShiftCommand\(value\)/);
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
 assert.match(shift,/shiftRpc\(db,\s*'reality_authorize_employee_shift_v1'/);
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
