import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRealityShiftConversationBrief} from '../src/reality-shift-conversation-brief-v1.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261104_work_conserving_employee_shift_claim_v1.sql');
const latest=read('supabase/migrations/20261104_shift_fail_forward_research_v1.sql');
const ui=read('reality-eight-hour-shift-plan-v1.js');
const owner='11111111-2222-4333-8444-555555555555';
const initial='2026-11-04T20:25:00.000Z';
const current=new Date('2026-11-04T23:51:00.000Z'); // 19 minutes BEFORE prior stage-five slot
function shift(status='RUNNING'){
 return {shift_id:owner,status,
  planned_start_at:initial,planned_end_at:'2026-11-05T04:25:00.000Z',
  steps:Array.from({length:8},(_,i)=>({
   step_index:i+1,stage:'SOURCE_CHECK',state:i<4?'SOURCE_CHECKED':'QUEUED',
   source_ref:null,source_status:i<4?'READBACK_VERIFIED':null,
   proof_sha256:null,completed_at:i<4?initial:null,
  }))};
}
test('a shift consumes the next eligible step immediately, not after preset 45/105/225-minute delays',()=>{
 assert.match(latest,/offset_start_minutes/);
 assert.match(latest,/SHIFT_STEP_NOT_YET_DUE/);
 assert.match(sql,/Work-conserving shift: claim the next authorized step immediately/);
 assert.doesNotMatch(sql,/make_interval|SHIFT_STEP_NOT_YET_DUE|v_step\.offset_start_minutes/);
 assert.match(sql,/order by step_index for update limit 1/);
 assert.match(sql,/status','READ_ONLY_STEP_CLAIMED'/);
});
test('the owner-approved start, exact end, service role, claim fence, and step-6/7 installation gate are never bypassed',()=>{
 for(const exp of [
  /current_user<>'service_role'/,
  /s\.planned_start_at<=v_now/,
  /s\.planned_end_at>v_now/,
  /for update of s skip locked limit 1/,
  /where shift_id=v_shift\.shift_id and state in \('QUEUED','CLAIMED'\)/,
  /if v_step\.state='CLAIMED' and v_step\.claim_expires_at>v_now/,
  /if v_step\.state='CLAIMED' and v_step\.attempts>=3/,
  /STEP_BLOCKED_SHIFT_CONTINUES/,
  /if v_step\.step_index=8 then/,
  /SHIFT_FINAL_REPORT_NOT_DUE/,
  /if v_step\.step_index>=6 then/,
  /EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED/,
  /no_external_write_authority',true/,
  /production_changed',false/
 ])assert.match(sql,exp);
 assert.doesNotMatch(sql,/OWNER_INSTALL_AUTO_APPROVED|create\s+policy|insert into reality_internal\.governed_employee_shifts_v1/i);
});
test('one exhausted shift cannot starve another already-authorized and due shift',()=>{
 assert.match(sql,/and exists \(select 1 from reality_internal\.governed_employee_shift_steps_v1 t/);
 assert.match(sql,/t\.shift_id=s\.shift_id and t\.state in \('QUEUED','CLAIMED'\)/);
 assert.match(sql,/order by s\.planned_start_at,s\.created_at/);
});
test('Chat no longer claims active worker waits for arbitrary planned slot',()=>{
 const result=buildRealityShiftConversationBrief([shift()],[],current);
 assert.equal(result.status,'RUNNING');
 assert.equal(result.verified_source_checks,4);
 assert.equal(result.next_planned_step_at,null);
 assert.match(result.current,/next trusted worker wake, without scheduled gaps/i);
 assert.match(result.next,/Qualify the next source-backed opportunity/);
 assert.doesNotMatch(result.next,/planned slot/);
 assert.equal(result.complete_shift_proven,false);
 assert.equal(result.verified_human_hours_saved,null);
});
test('future owner-approved shift does not begin early merely because pacing was removed',()=>{
 const item=shift('QUEUED');
 item.planned_start_at='2026-11-05T08:28:00.000Z';
 item.planned_end_at='2026-11-05T16:28:00.000Z';
 const b=buildRealityShiftConversationBrief([item],[],current);
 assert.equal(b.status,'QUEUED');
 assert.equal(b.next_planned_step_at,'2026-11-05T08:28:00.000Z');
 assert.match(b.current,/Scheduled, not started/);
});
test('customer planning interface distinguishes time allocations from mandatory execution delays',()=>{
 assert.match(ui,/planning estimates, not mandatory waits between tasks/);
 assert.match(ui,/Planning estimate/);
 assert.match(ui,/No required wait/);
 assert.match(ui,/Only a separately verified, original-job-bound capability request/);
});
