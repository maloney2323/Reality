import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRealityShiftConversationBrief}
 from '../src/reality-shift-conversation-brief-v1.js';
import {safeShiftReadbackState,interpretSignedInChatShiftCommand}
 from '../reality-owner-chat-shift-command-v1.js';

const shift={
 shift_id:'11111111-2222-4333-8444-555555555555',
 status:'AWAITING_EXACT_ORIGINAL_WORK',
 planned_start_at:'2026-11-08T09:00:00.000Z',
 planned_end_at:'infinity',
 steps:Array.from({length:8},(_,i)=>({
  step_index:i+1,
  state:i===5?'AWAITING_EXACT_WORK':'QUEUED',
  proof_sha256:null,source_ref:null,source_status:null
 }))
};
test('completion-bound shift remains current regardless of eight-hour clock',()=>{
 const now=new Date('2026-11-09T19:00:00.000Z');
 const state=safeShiftReadbackState({ok:true,shifts:[shift]},{now:now.getTime()});
 assert.equal(state.hasActive,true);
 assert.equal(state.completion_bound,true);
 assert.equal(state.duration_hours,null);
 const brief=buildRealityShiftConversationBrief([shift],[],now);
 assert.equal(brief.shift_id,shift.shift_id);
 assert.equal(brief.completion_bound,true);
 assert.equal(brief.shift_duration_hours,null);
 assert.equal(brief.complete_shift_proven,false);
 assert.match(brief.headline,/continuing safely/);
});
test('ordinary signed-in start selects frozen jobs until receipts; explicit hour plan stays legacy',()=>{
 const normal=interpretSignedInChatShiftCommand('Start the jobs');
 assert.equal(normal?.completion_bound,true);
 assert.equal(normal?.installation_authorized,false);
 const explicit=interpretSignedInChatShiftCommand('Start a 4 hour shift');
 assert.equal(explicit?.completion_bound,false);
 assert.equal(explicit?.duration_hours,4);
});
test('service-only completion close never derives successful settlement from elapsed time',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261108_completion_bound_employee_work_warrant_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/planned_end_at='infinity'::timestamptz/);
 assert.match(sql,/source_scope jsonb not null/);
 assert.match(sql,/original_jobs_independently_settled_in_this_shift/);
 assert.match(sql,/genuine_independent_final_receipts_v1/);
 assert.match(sql,/riley_pr_review_originals_v1/);
 assert.match(sql,/COMPLETION_WAITING_FOR_FINAL_JOB_RECEIPTS/);
 assert.match(sql,/ALL_AUTHORIZED_ORIGINAL_JOBS_INDEPENDENTLY_SETTLED/);
 assert.doesNotMatch(sql,/completion_reason','SHIFT_AUTHORIZATION_WINDOW_EXPIRED/);
 assert.match(sql,/revoke all on function public\.reality_close_employee_completion_shift_v1/);
});
test('existing preview worker runs receipt-check before ordinary shift pulse',()=>{
 const source=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(source,/reality_close_employee_completion_shift_v1/);
 assert.ok(source.indexOf('reality_close_employee_completion_shift_v1')<
  source.indexOf('processGovernedEmployeeShiftTick(db'));
 assert.match(source,/completion_bound_work:completionClose/);
});

test('owner-scoped Chat shows final receipt only when every exact original was independently settled',()=>{
 const a='work:'+'a'.repeat(32),b='work:'+'b'.repeat(32);
 const proof={status:'EMPLOYEE_SHIFT_EVIDENCE_REPORT',
  shift_id:shift.shift_id,completion_bound:true,
  completion_reason:'ALL_AUTHORIZED_ORIGINAL_JOBS_INDEPENDENTLY_SETTLED',
  original_jobs_independently_settled_in_this_shift:2,
  authorized_source_job_count:2,
  verified_original_receipts:[
   {original_work_id:a,source_proof_sha256:'sha256:'+'a'.repeat(64),
    independent_final_receipt_verified:true},
   {original_work_id:b,source_proof_sha256:'sha256:'+'b'.repeat(64),
    independent_final_receipt_verified:true}
  ],production_changed:false};
 const closed={...shift,status:'ENDED_WITH_VERIFIED_JOB',
  close_report:proof,closed_at:'2026-11-09T09:11:00Z'};
 const data=buildRealityShiftConversationBrief([closed],[],
  new Date('2026-11-09T10:00:00Z'));
 assert.equal(data.complete_shift_proven,true);
 assert.equal(data.verified_final_original_job_count,2);
 assert.deepEqual(data.final_receipt,proof);
 assert.match(data.what_finished,/2 original jobs independently settled/);
 const incomplete=buildRealityShiftConversationBrief([{
  ...closed,close_report:{...proof,
   original_jobs_independently_settled_in_this_shift:1}
 }],[],new Date('2026-11-09T10:00:00Z'));
 assert.equal(incomplete.complete_shift_proven,false);
 assert.equal(incomplete.final_receipt,null);
});
