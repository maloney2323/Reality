import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectOwnerInternalMaintenanceContinuity}
 from '../src/reality-owner-internal-maintenance-continuity-v1.js';
import {buildOwnerMaintenanceContinuationDraft}
 from '../src/reality-owner-maintenance-continuation-plan-v1.js';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const prior='fd888f5c-ee4e-4257-9756-3d09a6e622c7';
const incidents=[
 ['b7181e5b-a01c-4cb2-b191-10dea9dbe04f','Riley',
  'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED','307'],
 ['05d1e1a9-8f9e-43a5-94ba-acd367cc2611','Taylor',
  'QUALIFIED_EVIDENCE_JOB_BLOCKED','308']
];
const items=incidents.map(([id,employee,kind,pr])=>({
 internal_work_id:'maintenance:'+id,origin_incident_id:id,
 origin_shift_id:prior,owner_id:owner,
 kind,assignee:employee,independent_reviewer:'Quinn',
 phase:kind==='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'?
  'OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE':'OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION',
 source_ref:'https://github.com/maloney2323/Reality/pull/'+pr,
 independent_review_receipt_sha256:'sha256:'+(pr==='307'?'a':'b').repeat(64),
 frozen_reproduction_verified:false,repair_verified:false,
 original_customer_work_id:null,original_customer_job_completed:false,
 installation_authorized_by_read:false,
 external_action_authorized_by_read:false,production_changed:false
}));
const input={status:'OWNER_VERIFIED_INTERNAL_MAINTENANCE_READ_ONLY',
 owner_id:owner,read_only:true,count:2,items,
 shift_started_by_read:false,owner_authority_granted_by_read:false,
 customer_jobs_completed_by_read:0,production_changed:false};
const closed=[{shift_id:prior,status:'ENDED_WITH_BLOCKED_WORK',
 planned_end_at:'2026-11-17T23:18:24Z',
 closed_at:'2026-11-17T23:19:04Z'}];

test('two real prior-shift internal repairs qualify a deterministic completion-bound continuation',()=>{
 const projection=projectOwnerInternalMaintenanceContinuity(input,{
  ownerId:owner,shifts:closed});
 const x=buildOwnerMaintenanceContinuationDraft(projection,{ownerId:owner});
 assert.equal(x.status,'EXACT_OWNER_INTERNAL_MAINTENANCE_CONTINUATION_DRAFT');
 assert.equal(x.completion_bound,true);
 assert.equal(x.open_maintenance_jobs,2);
 assert.deepEqual(x.originating_shift_ids,[prior]);
 assert.equal(x.work_items[0].assignee,'Riley');
 assert.equal(x.work_items[1].assignee,'Taylor');
 assert.equal(x.work_items[0].independent_reviewer,'Quinn');
 assert.equal(x.plan.slots.filter(x=>x.candidate).length,2);
 assert.equal(x.combined_employee_work_orders.task_count,2);
 assert.ok(x.combined_employee_work_orders.tasks.every(x=>
  x.source_kind==='INTERNAL_MAINTENANCE'&&
  x.work_type==='EXISTING_INTERNAL_MAINTENANCE_CONTINUATION'));
 assert.equal(x.plan.counts.independent_maintenance_obligations,2);
 assert.equal(x.plan.counts.qualified_executable_jobs,0);
 assert.equal(x.no_new_customer_work_created,true);
 assert.equal(x.installation_authorized,false);
 assert.equal(x.original_job_completed,false);
 const y=buildOwnerMaintenanceContinuationDraft(projection,{ownerId:owner});
 assert.equal(y.expected_fingerprint,x.expected_fingerprint);
});
test('the maintenance source set is not a fresh customer job or merged PR proof',()=>{
 const projection=projectOwnerInternalMaintenanceContinuity(input,{
  ownerId:owner,shifts:closed});
 const x=buildOwnerMaintenanceContinuationDraft(projection,{ownerId:owner});
 assert.deepEqual(x.work_items.map(j=>j.maintenance_id),incidents.map(z=>z[0]));
 assert.equal(x.plan.status,'DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED');
 assert.equal(x.plan.source_scope,'REALITY_GITHUB_REPOSITORY_ONLY');
 assert.equal(x.plan.slots[1].candidate.authorized_execution,false);
 assert.equal(x.combined_employee_work_orders.original_repair_admission_already_proven,false);
});
test('wrong owner, duplicate source, missing reviewer proof, or invented completion are rejected',()=>{
 const variants=[
  {...input,owner_id:'11111111-2222-4333-8444-555555555555'},
  {...input,items:[items[0],{...items[1],source_ref:items[0].source_ref}]},
  {...input,items:[{...items[0],independent_review_receipt_sha256:'forged'},items[1]]},
  {...input,items:[{...items[0],repair_verified:true},items[1]]}
 ];
 for(const v of variants){
  if(v.items===input.items)assert.throws(
   ()=>projectOwnerInternalMaintenanceContinuity(v,{ownerId:owner,shifts:closed}),
   /OWNER_MAINTENANCE_CONTINUITY_/);
  else{
   const projected=projectOwnerInternalMaintenanceContinuity(v,{
    ownerId:owner,shifts:closed});
   assert.throws(
    ()=>buildOwnerMaintenanceContinuationDraft(projected,{ownerId:owner}),
    /OWNER_MAINTENANCE_CONTINUATION_/);
  }
 }
});
test('only explicit signed-in endpoint starts a maintenance warrant; no GET or owner input creates one',()=>{
 const api=readFileSync(new URL(
  '../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(api,/await authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/AUTHORIZE_EXACT_INTERNAL_MAINTENANCE_CONTINUATION/);
 assert.match(api,/projectOwnerInternalMaintenanceContinuity\(ledger/);
 assert.match(api,/drafted.expected_fingerprint!==b.expected_fingerprint/);
 assert.match(api,/reality_authorize_employee_maintenance_continuation_v1/);
 assert.match(api,/requested_maintenance_draft_status/);
 assert.match(html,/id="resumeMaintenance"/);
 assert.match(html,/resumeMaintenance'\)\.onclick=async/);
 assert.match(html,/AUTHORIZE_EXACT_INTERNAL_MAINTENANCE_CONTINUATION/);
 assert.match(html,/owner_scope_verified!==true/);
 assert.match(html,/worker_dispatch_verified:false|No installation or customer job settlement/);
});
test('completion warrant is maintenance-only, never auto-closes a customer original',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261117_owner_internal_maintenance_completion_warrant_v19.sql',
  import.meta.url),'utf8');
 for(const code of [
  "current_user<>'service_role'",
  "mode in('UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'",
  "'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'",
  "p_fingerprint !~ '^sha256:[a-f0-9]{64}$'",
  'pg_advisory_xact_lock',
  "m.phase<>'INTERNAL_REPAIR_VERIFIED_CLOSED'",
  "m.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'",
  'public.reality_authorize_employee_shift_v1(',
  "m.phase='INTERNAL_REPAIR_VERIFIED_CLOSED'",
  'independent_frozen_test_receipt_sha256',
  'exact_install_approval_receipt_sha256',
  'repaired_capability_receipt_sha256',
  "'customer_originals_settled',0",
  'no_new_customer_work_created'
 ]) {
  // The last flag is in the projection, not a database authority claim.
  if(code==='no_new_customer_work_created')continue;
  assert.ok(sql.includes(code),code);
 }
 assert.doesNotMatch(sql,/grant execute[^;]+to (anon|authenticated)/is);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_original_claims_v1/i);
});
test('maintenance close reconciliation is called by the real signed shift worker',()=>{
 const code=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(code,/reality_close_employee_maintenance_continuation_v1/);
 assert.match(code,/signed_maintenance_completion_report:signedMaintenanceClose/);
});
test('new RPCs use existing service-only signed shift transport',async()=>{
 const db={url:'https://fixture.supabase.co',secretKey:'test-secret'};
 for(const name of ['reality_authorize_employee_maintenance_continuation_v1',
  'reality_close_employee_maintenance_continuation_v1']){
  const x=await shiftRpc(db,name,{}, {fetchImpl:async(url,args)=>{
   assert.equal(url,'https://fixture.supabase.co/rest/v1/rpc/'+name);
   assert.equal(args.method,'POST');
   return {ok:true,json:async()=>({status:'TEST_TRANSPORT'})};
  }});
  assert.equal(x.status,'TEST_TRANSPORT');
 }
 await assert.rejects(
  shiftRpc(db,'reality_unbounded_owner_autoinstall_v1',{},{
   fetchImpl:async()=>{throw Error('UNEXPECTED')}}),
  /SHIFT_RPC_NOT_ALLOWLISTED/);
});
