import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagnoseRealityEmployeeRecovery}
 from '../src/reality-employee-recovery-route-v1.js';
const id='11111111-2222-4333-8444-555555555555';
const work='work:'+'a'.repeat(32);
const hash='b'.repeat(64);
function shift(status,patch={}){
 return {shift_id:id,status,
  steps:Array.from({length:8},(_,i)=>({
   step_index:i+1,state:i===5&&status==='ENDED_WITH_VERIFIED_JOB'?
    'ORIGINAL_JOB_RECEIPT_VERIFIED':
    i===5&&status==='AWAITING_EXACT_ORIGINAL_WORK'?'AWAITING_EXACT_WORK':'QUEUED',
  })),...patch};
}
const diagnose=(s,handoffs=[])=>diagnoseRealityEmployeeRecovery({
 shifts:s==null?[]:[s],handoffs
});
test('no shift and queued shift are not running autonomous employees',()=>{
 const no=diagnose(null);
 assert.equal(no.status,'NO_EMPLOYEE_SHIFT_AUTHORIZED');
 assert.equal(no.shift_id,null);
 const queued=diagnose(shift('QUEUED'));
 assert.equal(queued.status,'WAITING_TRUSTED_SCHEDULED_WORKER');
 assert.equal(queued.original_job_identity_preserved,true);
 assert.equal(queued.eligible_for_auto_install,false);
 assert.equal(queued.model_generation_started_by_diagnosis,false);
 assert.equal(queued.production_changed,false);
 assert.equal(queued.verified_human_hours_saved,null);
});
test('original job gap is identified without inventing same-job execution',()=>{
 const waiting=diagnose(shift('AWAITING_EXACT_ORIGINAL_WORK'));
 assert.equal(waiting.status,'ORIGINAL_JOB_HANDOFF_NOT_CONNECTED');
 assert.match(waiting.next_verified_action,/existing governed capability-engine execution handoff/);
 assert.equal(waiting.worker_has_direct_original_job_execution_connection,false);
 assert.equal(waiting.new_original_job_created,false);
 assert.equal(waiting.real_job_completed_by_diagnosis,false);
 assert.equal(waiting.owner_installation_approval_bypassed,false);
});
test('only exact verified shift-bound candidate can display an approval handoff',()=>{
 const s=shift('AWAITING_EXACT_ORIGINAL_WORK');
 const handoff={
  shift_id:id,status:'EXACT_VERIFIED_CAPABILITY_APPROVAL_READY_IN_REALITY_CHAT',
  original_work_id:work,artifact_sha256:hash,
  capability_id:'reality-ci-failure-evidence',installation_approved:false,
 };
 assert.equal(diagnose(s,[{...handoff,shift_id:'99999999-2222-4333-8444-555555555555'}]).status,
  'ORIGINAL_JOB_HANDOFF_NOT_CONNECTED');
 assert.equal(diagnose(s,[{...handoff,artifact_sha256:'not-verified'}]).status,
  'ORIGINAL_JOB_HANDOFF_NOT_CONNECTED');
 const valid=diagnose(s,[handoff]);
 assert.equal(valid.status,'VERIFIED_UPGRADE_WAITING_EXACT_OWNER_APPROVAL');
 assert.equal(valid.pending_exact_owner_approvals.length,1);
 assert.deepEqual(valid.pending_exact_owner_approvals[0],{
  original_work_id:work,capability_id:'reality-ci-failure-evidence',artifact_sha256:hash});
 assert.equal(valid.eligible_for_auto_install,false);
 assert.equal(valid.owner_installation_approval_bypassed,false);
 assert.throws(()=>diagnose(s,[handoff,handoff]),/EMPLOYEE_RECOVERY_DUPLICATE_APPROVAL/);
});
test('escalation and provider failures never permit unsafe retry or invent savings',()=>{
 const a=diagnose(shift('ESCALATED'));
 assert.equal(a.status,'LEASE_OR_PROVIDER_ESCALATED');
 assert.match(a.next_verified_action,/uncertain side effect/);
 const b=shift('RUNNING');
 b.steps[3].state='BLOCKED_PROVIDER';
 const c=diagnose(b);
 assert.equal(c.status,'PROVIDER_BLOCKED_CONTINUE_BOUNDED_WORK');
 assert.match(c.next_verified_action,/Never infer a missing capability from a transient outage/);
 const d=diagnose(shift('ENDED_WITH_BLOCKED_WORK'));
 assert.equal(d.status,'SHIFT_ENDED_NOT_AUTONOMOUSLY_COMPLETED');
});
test('settlement only indicated when a trusted same-shift receipt step is present',()=>{
 assert.throws(()=>diagnose(shift('ENDED_WITH_VERIFIED_JOB',{
  steps:Array.from({length:8},(_,i)=>({step_index:i+1,state:'QUEUED'}))
 })),/EMPLOYEE_RECOVERY_SETTLEMENT_CONTRADICTION/);
 const result=diagnose(shift('ENDED_WITH_VERIFIED_JOB'));
 assert.equal(result.status,'ORIGINAL_JOB_SETTLEMENT_EVIDENCED');
 assert.equal(result.matched_original_job_receipt,true);
 assert.match(result.next_verified_action,/do not replay settled work/);
 assert.equal(result.verified_human_hours_saved,null);
});
test('existing authenticated shift status and Chat display use the same recovery route',()=>{
 const api=readFileSync(new URL('../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(api,/diagnoseRealityEmployeeRecovery\(\{shifts:read.shifts,handoffs\}\)/);
 assert.match(api,/recovery_diagnosis,/);
 assert.match(ui,/data\.recovery_diagnosis/);
 assert.match(ui,/route\.worker_has_direct_original_job_execution_connection===false/);
 assert.match(ui,/route\.eligible_for_auto_install===false/);
 assert.doesNotMatch(api,/recovery_diagnosis\.installation_authorized=true/);
});
