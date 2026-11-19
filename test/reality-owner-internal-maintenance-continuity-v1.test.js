import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
import {projectOwnerInternalMaintenanceContinuity}
 from '../src/reality-owner-internal-maintenance-continuity-v1.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const origin='fd888f5c-ee4e-4257-9756-3d09a6e622c7';
const active='9460cfff-937a-4105-9093-2e41ab39a950';
const hash='sha256:'+'a'.repeat(64);
const maintenance=[
 {internal_work_id:'maintenance:b7181e5b-a01c-4cb2-b191-10dea9dbe04f',
  origin_incident_id:'b7181e5b-a01c-4cb2-b191-10dea9dbe04f',
  origin_shift_id:origin,owner_id:owner,
  kind:'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',assignee:'Riley',
  independent_reviewer:'Quinn',
  source_ref:'https://github.com/maloney2323/Reality/pull/307',
  phase:'OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE',
  independent_review_receipt_sha256:hash,
  frozen_reproduction_verified:false,repair_verified:false,
  original_customer_work_id:null,original_customer_job_completed:false,
  installation_authorized_by_read:false,
  external_action_authorized_by_read:false,production_changed:false},
 {internal_work_id:'maintenance:05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
  origin_incident_id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
  origin_shift_id:origin,owner_id:owner,
  kind:'QUALIFIED_EVIDENCE_JOB_BLOCKED',assignee:'Taylor',
  independent_reviewer:'Quinn',
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  phase:'OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION',
  independent_review_receipt_sha256:hash,
  frozen_reproduction_verified:false,repair_verified:false,
  original_customer_work_id:null,original_customer_job_completed:false,
  installation_authorized_by_read:false,
  external_action_authorized_by_read:false,production_changed:false}
];
const readback={status:'OWNER_VERIFIED_INTERNAL_MAINTENANCE_READ_ONLY',
 owner_id:owner,read_only:true,count:2,items:maintenance,
 shift_started_by_read:false,owner_authority_granted_by_read:false,
 customer_jobs_completed_by_read:0,production_changed:false};
test('closed shift remains immutable; its signed maintenance persists as unfinished work',()=>{
 const shifts=[{shift_id:origin,status:'ENDED_WITH_BLOCKED_WORK',
  closed_at:'2026-11-17T23:19:04Z',planned_end_at:'2026-11-17T23:18:24Z'}];
 const x=projectOwnerInternalMaintenanceContinuity(readback,{ownerId:owner,shifts});
 assert.equal(x.status,'OWNER_UNFINISHED_INTERNAL_MAINTENANCE_PRESERVED');
 assert.equal(x.open_count,2);
 assert.deepEqual(x.origin_shift_ids,[origin]);
 assert.equal(x.items[0].assignee,'Riley');
 assert.equal(x.items[1].assignee,'Taylor');
 assert.equal(x.next_action,'EXACT_AUTHENTICATED_COMPLETION_BOUND_SHIFT_REQUIRED');
 assert.equal(x.original_shifts_reopened,false);
 assert.equal(x.no_new_shift_started,true);
 assert.equal(x.owner_authority_granted,false);
 assert.equal(x.repair_completed_by_read,false);
 assert.equal(x.customer_job_completed,false);
 assert.equal(x.production_changed,false);
});
test('signed current completion-bound shift can observe previous work, never create jobs by read',()=>{
 const shifts=[{shift_id:active,status:'RUNNING',closed_at:null,
  planned_end_at:'infinity'}];
 const x=projectOwnerInternalMaintenanceContinuity(readback,{ownerId:owner,shifts});
 assert.equal(x.current_shift_id,active);
 assert.equal(x.next_action,
  'VERIFY_ACTIVE_SHIFT_EXACT_MAINTENANCE_SCOPE');
 assert.equal(x.open_count,2);
 assert.equal(x.no_new_shift_started,true);
});
test('tampered reviewer, owner, receipt or false success is never shown as verified work',()=>{
 const bad=[
  {...readback,owner_id:'11111111-2222-4333-8444-555555555555'},
  {...readback,owner_authority_granted_by_read:true},
  {...readback,count:99},
  {...readback,items:[{...maintenance[0],repair_verified:'yes'}],count:1},
  {...readback,items:[{...maintenance[0],assignee:'Quinn'}],count:1},
  {...readback,items:[{...maintenance[0],origin_shift_id:'unverified'}],count:1},
  {...readback,items:[{...maintenance[0],production_changed:true}],count:1},
  {...readback,items:[{...maintenance[0],independent_review_receipt_sha256:'claimed'}],count:1},
  {...readback,items:[maintenance[0],maintenance[0]]}
 ];
 for(const x of bad)assert.throws(
  ()=>projectOwnerInternalMaintenanceContinuity(x,{ownerId:owner,shifts:[]}),
  /OWNER_MAINTENANCE_CONTINUITY_/);
});
test('service-only trusted read uses existing shared RPC and owner ID',async()=>{
 const db={url:'https://fixture.supabase.co',secretKey:'test-secret'};
 const result=await shiftRpc(db,'reality_read_owner_internal_maintenance_v1',
  {p_owner_id:owner},{fetchImpl:async(url,options)=>{
   assert.equal(url,'https://fixture.supabase.co/rest/v1/rpc/reality_read_owner_internal_maintenance_v1');
   assert.equal(options.method,'POST');
   assert.equal(JSON.parse(options.body).p_owner_id,owner);
   return {ok:true,json:async()=>readback};
  }});
 assert.equal(result.count,2);
});
test('owner shift API and existing UI render maintenance without minting authority',()=>{
 const api=readFileSync(new URL(
  '../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(api,/projectOwnerInternalMaintenanceContinuity\(/);
 assert.match(api,/reality_read_owner_internal_maintenance_v1/);
 assert.match(api,/internal_maintenance_continuity_status/);
 assert.match(ui,/id="realityUnfinishedMaintenance"/);
 assert.match(ui,/renderUnfinishedMaintenanceContinuity\(data\)/);
 assert.match(ui,/EXACT_AUTHENTICATED_COMPLETION_BOUND_SHIFT_REQUIRED|completion-bound shift is required/);
 assert.match(ui,/No verified repair receipt yet/);
 assert.doesNotMatch(ui,/original_shifts_reopened:true|owner_authority_granted:true/);
});

test('owner readback projects signed executor receipts without claiming code repair',()=>{
 const claimed={...maintenance[0],
  signed_executor_action:'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
  signed_executor_state:'COMPLETED',signed_executor_attempt_count:1,
  ci_dispatch_receipt_sha256:hash,
  ci_github_trigger_commit_sha:'a'.repeat(40),
  ci_independent_diagnostic_receipt_sha256:hash,
  ci_independent_artifact_digest:hash,
  ci_independent_github_run_id:44633511608};
 const requalified={...maintenance[1],
  signed_executor_action:'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI',
  signed_executor_state:'COMPLETED',signed_executor_attempt_count:1,
  source_requalification_receipt_sha256:hash};
 const proof={...readback,items:[claimed,requalified]};
 const result=projectOwnerInternalMaintenanceContinuity(proof,{
  ownerId:owner,shifts:[]});
 assert.equal(result.open_count,2);
 assert.equal(result.items[0].ci_independent_diagnostic_receipt_sha256,hash);
 assert.equal(result.items[0].ci_independent_github_run_id,44633511608);
 assert.equal(result.items[1].source_requalification_receipt_sha256,hash);
 assert.equal(result.items[1].repair_verified,false);
 assert.equal(result.customer_job_completed,false);
 for(const changed of [
  {...claimed,ci_independent_github_run_id:-1},
  {...claimed,ci_dispatch_receipt_sha256:null},
  {...claimed,ci_independent_diagnostic_receipt_sha256:'fabricated'},
  {...claimed,signed_executor_state:'SETTLED'},
  {...requalified,signed_executor_action:'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'}
 ]){
  assert.throws(()=>projectOwnerInternalMaintenanceContinuity(
   {...readback,items:[changed],count:1},{ownerId:owner,shifts:[]}),
    /OWNER_MAINTENANCE_CONTINUITY_/);
 }
});
test('owner service receipt migration joins only same owner maintenance claim',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261120000000_owner_maintenance_executor_receipt_chat_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/c\.maintenance_id=m\.incident_id and c\.owner_id=m\.owner_id/);
 assert.match(sql,/ci_independent_diagnostic_receipt_sha256/);
 assert.match(sql,/source_requalification_receipt_sha256/);
 assert.match(sql,/ci_dispatch_receipt_sha256/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/\bUPDATE reality_internal\b|\bINSERT INTO reality_internal\b/i);
});
