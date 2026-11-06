import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {identifyExactRileyOriginalCandidates,
 renderRileyLoopReadiness} from '../src/reality-riley-live-loop-readiness-v1.js';
const SHIFT='11111111-2222-4333-8444-555555555555';
const TRIGGER='77777777-7777-4777-8777-777777777777';
const WORK='work:'+'e'.repeat(32);
const SOURCE='https://github.com/maloney2323/Reality/issues/263';
const PROOF='sha256:'+'b'.repeat(64);
const steps=()=>Array.from({length:8},(_,i)=>({
 step_index:i+1,state:i===1?'SOURCE_CHECKED':
  i===5?'AWAITING_EXACT_WORK':'QUEUED',
 source_ref:i===1?SOURCE:null,
 proof_sha256:i===1?PROOF:null
}));
const shifts=(status='AWAITING_EXACT_ORIGINAL_WORK')=>({
 status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
 work_installation_authorized_by_read:false,production_changed:false,
 shifts:[{shift_id:SHIFT,status,steps:steps()}]});
const job={
 source_issue_number:263,original_work_id:WORK,trigger_id:TRIGGER,
 phase:'PENDING_FROZEN_REPRODUCTION',independently_settled:false,
 owner_install_approved:false,environment:'ISOLATED_PREVIEW'
};
const loop=jobs=>({status:'OWNER_GOVERNED_LOOP_READBACK',
 owner_installation_authorized_by_read:false,
 external_action_performed:false,production_changed:false,jobs});
const eligible={
 status:'EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE',
 shift_id:SHIFT,original_work_id:WORK,trigger_id:TRIGGER,
 source_ref:SOURCE,source_proof_sha256:PROOF,
 existing_job_only:true,installation_authorized:false,
 original_job_completed:false,production_changed:false
};
test('old read-only shifts never prove an active Riley repair',()=>{
 const result=identifyExactRileyOriginalCandidates({
  shiftReadback:shifts('ENDED_READ_ONLY'),loop:loop([job])});
 assert.equal(result.active_shifts,0);
 assert.deepEqual(result.candidates,[]);
 const view=renderRileyLoopReadiness({activeShiftCount:0,candidates:[]});
 assert.equal(view.status,'NO_ACTIVE_AUTHORIZED_RILEY_SHIFT');
 assert.equal(view.worker_wake_dispatched_by_read,false);
 assert.equal(view.original_job_started_by_read,false);
 assert.equal(view.independent_final_receipt_recorded_by_read,false);
 assert.equal(view.verified_human_hours_saved,null);
});
test('active shift alone is not an original job authorization',()=>{
 const x=identifyExactRileyOriginalCandidates({
  shiftReadback:shifts(),loop:loop([])});
 assert.equal(x.active_shifts,1);
 assert.equal(x.candidates.length,0);
 const y=renderRileyLoopReadiness({
  activeShiftCount:x.active_shifts,candidates:x.candidates});
 assert.equal(y.status,'NO_NEW_QUALIFIED_SHIFT_BOUND_ORIGINAL_JOB');
 assert.equal(y.installation_authorized,false);
});
test('only exact one original owner job and independent DB eligibility can open wake gate',()=>{
 const x=identifyExactRileyOriginalCandidates({
  shiftReadback:shifts(),loop:loop([job])});
 assert.equal(x.candidates.length,1);
 assert.deepEqual(x.candidates[0],{
  shift_id:SHIFT,original_work_id:WORK,trigger_id:TRIGGER,
  source_ref:SOURCE,proof_sha256:PROOF,source_issue_number:263
 });
 const denied=renderRileyLoopReadiness({
  activeShiftCount:1,candidates:x.candidates,verified:[
   {...eligible,source_proof_sha256:'sha256:'+'c'.repeat(64)}]});
 assert.equal(denied.status,'EXACT_ORIGINAL_WAKE_NOT_CURRENTLY_ELIGIBLE');
 const approved=renderRileyLoopReadiness({
  activeShiftCount:1,candidates:x.candidates,verified:[eligible]});
 assert.equal(approved.status,'EXACT_AUTHORIZED_EXISTING_JOB_ELIGIBLE_FOR_WAKE');
 assert.equal(approved.original_work_id,WORK);
 assert.equal(approved.worker_wake_dispatched_by_read,false);
 assert.equal(approved.original_job_settled_by_read,false);
});
test('two distinct eligible jobs in one shift are independently checked, never auto-executed',()=>{
 const next='work:'+'f'.repeat(32);
 const trigger2='88888888-8888-4888-8888-888888888888';
 const source2='https://github.com/maloney2323/Reality/issues/185';
 const second={...job,source_issue_number:185,
  original_work_id:next,trigger_id:trigger2};
 const s=shifts();
 s.shifts[0].steps[2]={step_index:3,state:'SOURCE_CHECKED',
  source_ref:source2,proof_sha256:PROOF};
 const selected=identifyExactRileyOriginalCandidates({
  shiftReadback:s,loop:loop([job,second])});
 assert.equal(selected.candidates.length,2);
 const secondGate={...eligible,original_work_id:next,trigger_id:trigger2,
  source_ref:source2};
 const partial=renderRileyLoopReadiness({
  activeShiftCount:1,candidates:selected.candidates,
  verified:[eligible,{...secondGate,source_proof_sha256:'sha256:'+'c'.repeat(64)}]});
 assert.equal(partial.status,'EXACT_ORIGINAL_WAKE_NOT_CURRENTLY_ELIGIBLE');
 const all=renderRileyLoopReadiness({
  activeShiftCount:1,candidates:selected.candidates,
  verified:[eligible,secondGate]});
 assert.equal(all.status,'EXACT_AUTHORIZED_EXISTING_JOBS_ELIGIBLE_FOR_WAKE');
 assert.deepEqual(all.original_work_ids,[WORK,next]);
 assert.equal(all.eligible_original_count,2);
 assert.equal(all.worker_claim_acknowledged,false);
 assert.equal(all.original_job_started_by_read,false);
 assert.equal(all.installation_authorized,false);
 assert.equal(all.production_changed,false);
 const duplicate=renderRileyLoopReadiness({
  activeShiftCount:1,candidates:selected.candidates,
  verified:[eligible,eligible]});
 assert.equal(duplicate.status,'EXACT_ORIGINAL_WAKE_NOT_CURRENTLY_ELIGIBLE');
});
test('settled, installed, unproven, foreign issue or invalid source never matches',()=>{
 const variants=[
  {...job,phase:'SETTLED_ISOLATED'},
  {...job,phase:'ISOLATED_INSTALLED_PROBATION'},
  {...job,independently_settled:true},
  {...job,owner_install_approved:true},
  {...job,source_issue_number:178},
  {...job,environment:'PRODUCTION'},
  {...job,original_work_id:'not-work'},
  {...job,trigger_id:'not-uuid'}
 ];
 for(const j of variants){
  const x=identifyExactRileyOriginalCandidates({
   shiftReadback:shifts(),loop:loop([j])});
  assert.equal(x.candidates.length,0);
 }
 const bad=shifts();
 bad.shifts[0].steps[1].proof_sha256=null;
 assert.equal(identifyExactRileyOriginalCandidates({
  shiftReadback:bad,loop:loop([job])}).candidates.length,0);
});
test('fail closed on untrusted owner evidence or ambiguous jobs',()=>{
 assert.throws(()=>identifyExactRileyOriginalCandidates({
  shiftReadback:shifts(),loop:{...loop([job]),production_changed:true}
 }),/RILEY_READINESS_OWNER_READBACK_UNVERIFIED/);
 const x=identifyExactRileyOriginalCandidates({
  shiftReadback:shifts(),loop:loop([job])});
 const ambiguous=renderRileyLoopReadiness({
  activeShiftCount:1,candidates:[x.candidates[0],x.candidates[0]]});
 assert.equal(ambiguous.status,'AMBIGUOUS_ORIGINAL_JOB_NO_AUTO_SELECTION');
});
test('owner-authenticated API and Reality Chat expose proof but never admit job',()=>{
 const api=readFileSync(new URL(
  '../api/reality/personal-riley-loop-readiness.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/req\.method!=='GET'/);
 assert.match(api,/VERCEL_ENV!=='preview'/);
 assert.match(api,/assertShiftReadback/);
 assert.match(api,/reality_read_shift_capability_wake_v1/);
 assert.match(api,/worker_execution_authorized_by_read:false/);
 assert.doesNotMatch(api,/enqueueExactGap|dispatchGenuineCapabilityWake|authorize_employee_shift_v1/);
 assert.match(ui,/rileyLoopReadiness/);
 assert.match(ui,/refreshRileyLoopReadiness/);
 assert.match(ui,/const RILEY_LOOP='\/api\/reality\/personal-riley-loop-readiness'/);
});
