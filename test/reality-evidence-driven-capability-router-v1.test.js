import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planGovernedCapabilitiesFromOwnerReceipts,
 invokeOneRegisteredSignedCapability}
 from '../src/reality-evidence-driven-capability-router-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const UUID='18121212-1111-4111-8111-999988887777';
const HASH='sha256:'+'7'.repeat(64);
const scope={
 handoff_id:UUID,source_ref:'https://github.com/forge-sample/service/pull/872',
 state:'SOURCE_RECHECKED',work_scope_approved:true,
 owner_approval_receipt:HASH,source_rechecked_at:'2026-11-21T13:40:00Z',
 independent_frozen_ci_after_approval_verified:false,
 next_action:'EXECUTE_NEW_INDEPENDENT_CASE_SPECIFIC_FROZEN_CI'
};
const base={
 status:'SIGNED_OWNER_SHIFT_HANDOFF_HEALTH_READ_ONLY',
 owner_id:owner,shift_id:shift,read_only:true,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false,
 original_claim_count:0,original_independent_final_receipt_count:0,
 repair_scope:scope,
 maintenance_handoffs:[
  {
   source_ref:'https://github.com/forge-sample/service/pull/873',
   status:'REPAIR_NEEDS_CASE_SPECIFIC_FROZEN_CI_OR_SOURCE_REQUALIFICATION',
   next_action:'RUN_CASE_SPECIFIC_FROZEN_RED_AND_RECHECK_SOURCE'
  },
  {
   source_ref:'https://github.com/forge-sample/service/pull/874',
   status:'REPAIR_INDEPENDENTLY_VERIFIED_PREVIEW_ONLY',
   independent_install_verified_at:'2026-11-21T13:30:00Z',
   next_action:'RECONCILE_SEPARATE_ORIGINAL_JOB_ACCEPTANCE'
  }
 ]
};
test('planner uses arbitrary source receipts, never a fixed PR or customer',()=>{
 const p=planGovernedCapabilitiesFromOwnerReceipts({
  health:base,ownerId:owner,shiftId:shift,
  registeredActionKeys:['RUN_CASE_SPECIFIC_FROZEN_RED_AND_RECHECK_SOURCE']
 });
 assert.equal(p.status,'GOVERNED_SOURCE_RECEIPT_CAPABILITY_PLAN');
 assert.equal(p.candidate_count,2);
 assert.equal(p.missing_capability_count,1);
 assert.equal(p.executable_registered_count,1);
 assert.equal(p.owner_decision_count,0);
 assert.equal(p.source_actions[0].source_ref,scope.source_ref);
 assert.equal(p.source_actions[0].next_actor,'REALITY');
 assert.equal(p.source_actions[0].execution_route,'REGISTERED_CAPABILITY_MISSING');
 assert.equal(p.source_actions[1].source_ref,base.maintenance_handoffs[0].source_ref);
 assert.equal(p.source_actions[1].execution_route,'REGISTERED_CAPABILITY_AVAILABLE');
 assert.equal(p.original_job_completed,false);
 assert.equal(p.executor_invoked,false);
});
test('unrelated non-code connected business source uses the same obligation engine',()=>{
 const h={...base,repair_scope:null,maintenance_handoffs:[
  {source_ref:'https://crm.example.org/orders/4435',
   status:'REPAIR_NEEDS_CASE_SPECIFIC_FROZEN_CI_OR_SOURCE_REQUALIFICATION',
   next_action:'READ_AND_VERIFY_VENDOR_DOCUMENT'}]};
 const p=planGovernedCapabilitiesFromOwnerReceipts({
  health:h,ownerId:owner,shiftId:shift,
  registeredActionKeys:['READ_AND_VERIFY_VENDOR_DOCUMENT']});
 assert.equal(p.candidate_count,1);
 assert.equal(p.executable_registered_count,1);
 assert.equal(p.source_actions[0].next_action,'READ_AND_VERIFY_VENDOR_DOCUMENT');
 assert.equal(p.source_actions[0].source_ref,'https://crm.example.org/orders/4435');
});
test('new source ID requires no code or handler changes',()=>{
 const h={...base,repair_scope:{...scope,
  source_ref:'https://github.com/another-org/another-repo/pull/99992'},
  maintenance_handoffs:[]};
 const p=planGovernedCapabilitiesFromOwnerReceipts({
  health:h,ownerId:owner,shiftId:shift,registeredActionKeys:[]});
 assert.equal(p.candidate_count,1);
 assert.equal(p.source_actions[0].source_ref,
  'https://github.com/another-org/another-repo/pull/99992');
});
test('no original claims cannot trigger a fake customer settlement',()=>{
 const h={...base,repair_scope:null,maintenance_handoffs:[
  base.maintenance_handoffs[2]]};
 const p=planGovernedCapabilitiesFromOwnerReceipts({
  health:h,ownerId:owner,shiftId:shift,registeredActionKeys:[]});
 assert.equal(p.candidate_count,0);
 assert.equal(p.original_job_completed,false);
});
test('an owner-click work order is never executed without an owner scope approval',()=>{
 const h={...base,repair_scope:{...scope,state:'PREPARED',
  work_scope_approved:false,owner_approval_receipt:null,
  next_action:'OWNER_APPROVE_EXACT_INVESTIGATION_AND_TESTING'},
  maintenance_handoffs:[]};
 const p=planGovernedCapabilitiesFromOwnerReceipts({
  health:h,ownerId:owner,shiftId:shift,registeredActionKeys:[
   'OWNER_APPROVE_EXACT_INVESTIGATION_AND_TESTING']});
 assert.equal(p.source_actions[0].execution_route,'OWNER_CLICK_REQUIRED');
 assert.equal(p.owner_decision_count,1);
 assert.equal(p.executable_registered_count,0);
});
test('planner refuses forged owner, shift, auth and source URLs',()=>{
 for(const forged of [
  {...base,owner_id:shift},
  {...base,shift_id:owner},
  {...base,installation_authorized:true},
  {...base,production_changed:true},
  {...base,original_job_completed:true}
 ])
  assert.throws(()=>planGovernedCapabilitiesFromOwnerReceipts({
   health:forged,ownerId:owner,shiftId:shift}),
   /GOVERNED_CAPABILITY_ROUTER_SIGNED_OWNER_WORK_LEDGER_REQUIRED/);
 const malformed={...base,repair_scope:{...scope,
  source_ref:'https://evil.example/path?token=secret'},
  maintenance_handoffs:[]};
 assert.equal(planGovernedCapabilitiesFromOwnerReceipts({
  health:malformed,ownerId:owner,shiftId:shift
 }).candidate_count,0);
});
const wake={status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',owner_id:owner,
 shift_id:shift,installation_authorized:false,production_changed:false};
const env={VERCEL_ENV:'preview'};
const ACTION='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED';
test('registered handler actually executes once for signed warrant and preserves real receipt',async()=>{
 let calls=0;
 const r=await invokeOneRegisteredSignedCapability({
  wake,graph,env,action:ACTION,authorityBasis:'SIGNED_EXISTING_WARRANT',
  handler:async()=>{
   calls++;
   return {status:'SIGNED_MAINTENANCE_CASE_CI_DISPATCH_CONFIRMED_RED_NOT_VERIFIED',
    installation_authorized:false,repair_executed:false,
    original_job_completed:false,production_changed:false,
    github_trigger_commit_sha:'a'.repeat(40),
    case_ci_dispatch_confirmed:true};
  }
 });
 assert.equal(calls,1);
 assert.equal(r.router_status,'REGISTERED_CAPABILITY_HANDLER_INVOKED');
 assert.equal(r.case_ci_dispatch_confirmed,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
});
test('missing adapter, forged signed wake, cross-tenant scope and production do not invoke',async()=>{
 let calls=0;
 const handler=async()=>{calls++;throw Error('should never execute')};
 const inputs=[
  {wake:{...wake,status:'NOT_A_SIGNED_WAKE'}},
  {graph:{...graph,owner_id:'not-an-owner'}},
  {graph:{...graph,installation_authorized:true}},
  {authorityBasis:'APPROVED_EXACT_SOURCE_SCOPE'},
  {env:{VERCEL_ENV:'production'}},
 ];
 for(const x of inputs){
  const r=await invokeOneRegisteredSignedCapability({
   wake,graph,env,authorityBasis:'SIGNED_EXISTING_WARRANT',
   action:ACTION,handler,...x});
  assert.equal(r.executor_invoked,false);
  assert.equal(r.status,'REGISTERED_CAPABILITY_SIGNED_AUTHORITY_NOT_VERIFIED');
 }
 const missing=await invokeOneRegisteredSignedCapability({
  wake,graph,env,authorityBasis:'SIGNED_EXISTING_WARRANT',action:ACTION});
 assert.equal(missing.status,'REGISTERED_CAPABILITY_EXECUTOR_NOT_CONNECTED');
 assert.equal(missing.next_actor,'REALITY');
 assert.equal(calls,0);
});
test('unsafe or fabricated provider result can never become a completed job',async()=>{
 const r=await invokeOneRegisteredSignedCapability({
  wake,graph,env,authorityBasis:'SIGNED_EXISTING_WARRANT',action:ACTION,
  handler:async()=>({status:'SETTLED',repair_executed:true,
   installation_authorized:true,original_job_completed:true,
   production_changed:true})
 });
 assert.equal(r.status,'REGISTERED_CAPABILITY_EXECUTION_RECEIPT_UNVERIFIED');
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
});
test('the signed worker routes a real registered capability and reports missing others',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/await invokeOneRegisteredSignedCapability\(/);
 assert.match(worker,/planGovernedCapabilitiesFromOwnerReceipts\(/);
 assert.match(worker,/governed_capability_plan:governedCapabilityPlan/);
 const module=readFileSync(new URL(
  '../src/reality-evidence-driven-capability-router-v1.js',import.meta.url),'utf8');
 assert.doesNotMatch(module,/#211|#307|#308|maloney2323|Reality\/pull\/211/);
});
