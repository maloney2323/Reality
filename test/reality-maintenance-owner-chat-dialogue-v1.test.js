import test from 'node:test';
import assert from 'node:assert/strict';
import {readVerifiedEmployeeShiftForChat}
 from '../src/reality-employee-shift-chat-context-v1.js';
import {readFileSync} from 'node:fs';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shiftId='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const oldShift='fd888f5c-ee4e-4257-9756-3d09a6e622c7';
const db={strictSecrets:true,secretKey:'isolated-only-test-secret',
 url:'https://fixture.supabase.co',project:'hvkfreoagbrphwghjajw'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const session={user_id:owner,config:{url:db.url}};
const sha=n=>'sha256:'+n.repeat(64);
const shift={
 shift_id:shiftId,status:'RUNNING',
 plan_fingerprint:sha('d'),planned_start_at:'2026-11-18T15:34:30.489Z',
 planned_end_at:'infinity',closed_at:null,
 steps:Array.from({length:8},(_,i)=>({
  step_index:i+1,state:'QUEUED',proof_sha256:null,
  source_ref:null,completed_at:null
 }))
};
const readShifts={
 status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
 work_installation_authorized_by_read:false,
 production_changed:false,verified_human_hours_saved:null,
 shifts:[shift]
};
const jobs=[{
 internal_work_id:'maintenance:b7181e5b-a01c-4cb2-b191-10dea9dbe04f',
 origin_incident_id:'b7181e5b-a01c-4cb2-b191-10dea9dbe04f',
 owner_id:owner,origin_shift_id:oldShift,
 kind:'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 phase:'OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE',
 assignee:'Riley',independent_reviewer:'Quinn',
 source_ref:'https://github.com/maloney2323/Reality/pull/307',
 independent_review_receipt_sha256:sha('a'),frozen_reproduction_verified:false,
 repair_verified:false,original_customer_work_id:null,
 original_customer_job_completed:false,installation_authorized_by_read:false,
 external_action_authorized_by_read:false,production_changed:false
},{
 internal_work_id:'maintenance:05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
 origin_incident_id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
 owner_id:owner,origin_shift_id:oldShift,
 kind:'QUALIFIED_EVIDENCE_JOB_BLOCKED',
 phase:'OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION',
 assignee:'Taylor',independent_reviewer:'Quinn',
 source_ref:'https://github.com/maloney2323/Reality/pull/308',
 independent_review_receipt_sha256:sha('b'),frozen_reproduction_verified:false,
 repair_verified:false,original_customer_work_id:null,
 original_customer_job_completed:false,installation_authorized_by_read:false,
 external_action_authorized_by_read:false,production_changed:false
}];
const warrant={
 status:'VERIFIED_ACTIVE_OWNER_MAINTENANCE_WARRANT_SCOPE',
 mode:'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS',
 state:'ACTIVE',shift_id:shiftId,plan_fingerprint:sha('d'),
 source_scope:jobs.map((j,i)=>({
  step_index:i+2,maintenance_id:j.origin_incident_id,
  origin_shift_id:j.origin_shift_id,source_ref:j.source_ref,
  independent_review_receipt_sha256:j.independent_review_receipt_sha256
 }))
};
const maintenance={
 status:'OWNER_VERIFIED_INTERNAL_MAINTENANCE_READ_ONLY',
 owner_id:owner,read_only:true,count:2,items:jobs,
 active_maintenance_warrant:warrant,
 shift_started_by_read:false,owner_authority_granted_by_read:false,
 customer_jobs_completed_by_read:0,production_changed:false
};
function fetchFor(readMaintenance=maintenance,readShift=readShifts){
 const calls=[];
 return {calls,fetchImpl:async(url,opts)=>{
  const rpc=url.split('/rpc/')[1];
  calls.push({rpc,owner:JSON.parse(opts.body||'{}').p_owner_id});
  const lookup={
   reality_read_owner_employee_shifts_v1:readShift,
   reality_read_owner_internal_maintenance_v1:readMaintenance
  };
  if(!Object.hasOwn(lookup,rpc))
   return {ok:false,json:async()=>({message:'OPTIONAL_CONTEXT_NOT_AVAILABLE'})};
  return {ok:true,json:async()=>lookup[rpc]};
 }};
}
const base={session,env,db,now:new Date('2026-11-18T15:39:00Z')};
test('Reality can answer a conversational follow-up about the ALREADY authorized shift from independently checked source data',async()=>{
 const {calls,fetchImpl}=fetchFor();
 const observations=await readVerifiedEmployeeShiftForChat({
  ...base,message:'Reality what did Riley and Taylor do? Can we chat about the repairs?',fetchImpl
 });
 const note=observations.find(x=>x.event_kind==='owner_verified_maintenance_repair_conversation');
 assert.ok(note,'existing owner shift and internal incident ledger must reach model context');
 assert.equal(note.owner_current_signed_maintenance_shift_id,shiftId);
 assert.equal(note.owner_approval_already_recorded,true);
 assert.equal(note.unfinished_internal_repairs,2);
 assert.match(note.summary,/ALREADY SIGNED AND AUTHORIZED EXACTLY 2 EARLIER REPAIRS/);
 assert.match(note.summary,/NO SECOND APPROVAL IS NEEDED FOR THOSE EXACT REPAIRS/);
 assert.match(note.summary,/Riley/);
 assert.match(note.summary,/Taylor/);
 assert.match(note.summary,/Quinn/);
 assert.match(note.summary,/Do NOT claim tests, patch installation/);
 assert.equal(note.repair_complete,false);
 assert.equal(note.installation_authorized,false);
 assert.equal(note.production_changed,false);
 assert.ok(calls.some(c=>c.rpc==='reality_read_owner_internal_maintenance_v1'&&c.owner===owner));
});
test('an ordinary reply "okay" still has correct signed maintenance status, without reauthorizing',async()=>{
 const {fetchImpl}=fetchFor();
 const result=await readVerifiedEmployeeShiftForChat({
  ...base,message:'okay',fetchImpl
 });
 assert.equal(result.find(x=>x.event_kind==='owner_verified_maintenance_repair_conversation')
  ?.owner_approval_already_recorded,true);
});
test('unverified independent reviewer proof is not repeated as Reality-sent work',async()=>{
 const unverified={...maintenance,items:[{...jobs[0],
  independent_review_receipt_sha256:'unverified'},jobs[1]]};
 const {fetchImpl}=fetchFor(unverified);
 const result=await readVerifiedEmployeeShiftForChat({
  ...base,message:'Tell me about unfinished repairs',fetchImpl
 });
 assert.equal(result.some(x=>x.event_kind==='owner_verified_maintenance_repair_conversation'),
  false);
});
test('signed-in owner has no active shift: Reality must still distinguish asking permission from granting it',async()=>{
 const {fetchImpl}=fetchFor({...maintenance,active_maintenance_warrant:null},
  {...readShifts,shifts:[]});
 const result=await readVerifiedEmployeeShiftForChat({
  ...base,message:'Can Reality continue the maintenance repairs?',fetchImpl
 });
 const x=result.find(x=>x.event_kind==='owner_verified_maintenance_repair_conversation');
 assert.ok(x);
 assert.equal(x.owner_current_signed_maintenance_shift_id,null);
 assert.equal(x.owner_approval_already_recorded,false);
 assert.match(x.summary,/NO CURRENT EXACT SIGNED MAINTENANCE WARRANT IS VERIFIED/);
 assert.match(x.summary,/Verify current authority before asking for a new one/);
});
test('new third Riley incident must not be presented as part of two previously approved repairs',async()=>{
 const third={...jobs[0],
  internal_work_id:'maintenance:2e4babcd-f2c6-40db-a6af-db8c7dd7b3e8',
  origin_incident_id:'2e4babcd-f2c6-40db-a6af-db8c7dd7b3e8',
  origin_shift_id:shiftId,
  source_ref:'https://github.com/maloney2323/Reality/pull/211'};
 const {fetchImpl}=fetchFor({...maintenance,items:[third,...jobs],count:3});
 const result=await readVerifiedEmployeeShiftForChat({
  ...base,message:'What is the status of my team?',fetchImpl});
 const note=result.find(x=>x.event_kind==='owner_verified_maintenance_repair_conversation');
 assert.ok(note);
 assert.equal(note.owner_signed_repair_count,2);
 assert.equal(note.new_repair_count_outside_signed_warrant,1);
 assert.equal(note.owner_approval_already_recorded,true);
 assert.match(note.summary,/1 ADDITIONAL MAINTENANCE INCIDENT/);
 assert.match(note.summary,/NEW_INCIDENT_NOT_IN_EXISTING_WARRANT/);
 assert.match(note.summary,/EXACT_SIGNED_WARRANT_SCOPE/);
 assert.equal(note.installation_authorized,false);
});
test('different DB principal or nonpreview context can never read owner maintenance as Chat cognition',async()=>{
 const {calls,fetchImpl}=fetchFor();
 const x=await readVerifiedEmployeeShiftForChat({
  ...base,session:{...session,user_id:'not-a-valid-uuid'},
  message:'repair progress',fetchImpl
 });
 assert.deepEqual(x,[]);
 assert.equal(calls.length,0);
});
test('operational conversation is read-only; the original owner-click signed shift boundary remains authoritative',()=>{
 const source=readFileSync(new URL(
  '../src/reality-employee-shift-chat-context-v1.js',import.meta.url),'utf8');
 assert.match(source,/projectOwnerInternalMaintenanceContinuity/);
 assert.match(source,/reality_read_owner_internal_maintenance_v1/);
 assert.match(source,/event_kind:'owner_verified_maintenance_repair_conversation'/);
 assert.match(source,/Plain Chat words cannot/);
 assert.doesNotMatch(source,/reality_authorize_employee_maintenance_continuation_v1/);
 assert.doesNotMatch(source,/reality_admit_signed/);
});
