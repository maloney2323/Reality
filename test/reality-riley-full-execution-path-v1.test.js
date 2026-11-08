import test from 'node:test';
import assert from 'node:assert/strict';
import {processGovernedEmployeeShiftTick}
 from '../src/reality-governed-employee-shift-worker-v1.js';
import {createRileyTrustedOriginalDriver}
 from '../src/reality-riley-trusted-original-driver-bridge-v1.js';
import {createRileyServiceOriginalRuntime}
 from '../src/reality-riley-service-original-runtime-v1.js';

const OWNER='11111111-2222-4333-8444-555555555555';
const SHIFT='22222222-3333-4444-8555-666666666666';
const TRIGGER='33333333-4444-4555-8666-777777777777';
const OTHER_TRIGGER='66666666-7777-4888-9999-aaaaaaaaaaaa';
const CONVO='44444444-5555-4666-8777-888888888888';
const SOURCE_EVENT='55555555-6666-4777-8888-999999999999';
const WORK='work:'+'a'.repeat(32);
const OTHER_WORK='work:'+'b'.repeat(32);
const SOURCE='https://github.com/maloney2323/Reality/issues/263';
const OTHER='https://github.com/maloney2323/Reality/issues/143';
const SHA='sha256:'+'c'.repeat(64);
const OTHER_SHA='sha256:'+'d'.repeat(64);
const db={url:'https://isolated.supabase.co',
 secretKey:'isolated-service-not-real',project:'isolatedproj'};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const expectedReceipt={status:'SHIFT_TICK_OUTCOMES_RECORDED_RECHECK_MORE_AUTHORIZED_WORK'};
function shiftRead(){
 return {status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  work_installation_authorized_by_read:false,
  verified_human_hours_saved:null,production_changed:false,shifts:[{
   shift_id:SHIFT,status:'AWAITING_EXACT_ORIGINAL_WORK',
   planned_start_at:'2026-11-07T13:00:00Z',
   planned_end_at:'2026-11-07T17:00:00Z',
   plan_fingerprint:'sha256:'+'e'.repeat(64),
   steps:Array.from({length:8},(_,i)=>({
    step_index:i+1,
    state:i===1||i===2?'SOURCE_CHECKED':
     i===5?'AWAITING_EXACT_WORK':'QUEUED',
    source_ref:i===1?SOURCE:i===2?OTHER:null,
    proof_sha256:i===1?SHA:i===2?OTHER_SHA:null
   }))
  }]};
}
function ledger(){
 const j=(work,issue)=>({
  original_work_id:work,source_issue_number:issue,
  independently_settled:false,owner_install_approved:false,
  environment:'ISOLATED_PREVIEW',phase:'PENDING_FROZEN_REPRODUCTION'
 });
 return {status:'OWNER_GOVERNED_LOOP_READBACK',
  owner_installation_authorized_by_read:false,
  external_action_performed:false,production_changed:false,
  jobs:[j(WORK,263),j(OTHER_WORK,143)]};
}
const c=(work,trigger,source,digest,index)=>({
 shift_id:SHIFT,owner_id:OWNER,original_work_id:work,trigger_id:trigger,
 source_event_id:SOURCE_EVENT,source_ref:source,source_proof_sha256:digest,
 source_step_index:index,current_owner_scope_verified:true,
 independently_settled:false,installation_authorized:false,production_changed:false
});
const eligibility={status:'EXISTING_SHIFT_ORIGINALS_INDEPENDENTLY_RECONCILED',
 shift_id:SHIFT,execution_authorized:false,installation_authorized:false,
 production_changed:false,candidate_count:2,candidates:[
  c(OTHER_WORK,OTHER_TRIGGER,OTHER,OTHER_SHA,3),
  c(WORK,TRIGGER,SOURCE,SHA,2)
 ]};
const executionContext={
 status:'SHIFT_ORIGINAL_TRUSTED_CONTEXT_READY',
 shift_id:SHIFT,owner_id:OWNER,conversation_id:CONVO,
 goal_id:'goal:existing-owner-authorized-repair-263',
 original_work_id:WORK,trigger_id:TRIGGER,original_work_event_id:SOURCE_EVENT,
 source_ref:SOURCE,source_proof_sha256:SHA,source_step_index:2,
 owner_scope_verified:true,source_checked:true,original_job_settled:false,
 execution_claim_consumed:false,installation_authorized:false,production_changed:false
};
const reconciliation={
 status:'EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED',
 governed_existing_work_status:'EXISTING_AUTHORIZED_ORIGINAL_REUSED_READ_ONLY',
 shift_id:SHIFT,governed_original_work_id:WORK,governed_trigger_id:TRIGGER,
 shift_observation_source_ref:SOURCE,
 shift_observation_proof_sha256:SHA,
 governed_cycle_dispatched_by_shift:false,model_invoked_by_shift:false,
 new_customer_job_created:false,installation_authorized:false,
 production_changed:false
};
const wake={
 status:'EXISTING_REALITY_CAPABILITY_WAKE_RECORDED',
 shift_id:SHIFT,original_work_id:WORK,worker_execution_acknowledged:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false
};
function harness({failPreflight=false,finalVerified=false}={}){
 const calls=[];
 const rpc=async({name,args})=>{
  calls.push({name,args});
  if(name==='reality_read_eligible_shift_originals_v1')return eligibility;
  if(name==='reality_claim_exact_shift_original_v1')return {
   status:'EXACT_EXISTING_SHIFT_ORIGINAL_CLAIMED',
   shift_id:SHIFT,owner_id:OWNER,original_work_id:WORK,trigger_id:TRIGGER,
   claim_id:'77777777-8888-4999-aaaa-bbbbbbbbbbbb',
   original_execution_completed:false,owner_installation_authorized:false,
   production_changed:false
  };
  if(name==='reality_record_exact_shift_original_outcome_v1')return {
   status:'SHIFT_ORIGINAL_OUTCOME_DURABLY_RECORDED',
   shift_id:SHIFT,original_work_id:WORK,
   claim_id:args.p_claim_id,last_execution_status:args.p_status,
   original_job_settled:false,installation_authorized:false,
   production_changed:false
  };
  if(name==='reality_reconcile_exact_shift_original_receipt_v1')return {
   status:finalVerified?'EXACT_ORIGINAL_RECEIPT_INDEPENDENTLY_RECONCILED':
    'NO_INDEPENDENT_ORIGINAL_RECEIPT_YET',
   shift_id:SHIFT,original_work_id:WORK,
   installation_authorized:false,production_changed:false
  };
  throw Error('unexpected rpc '+name);
 };
 const sourceAdapter={
  loadAuthorizedInternalJob:async x=>({
   original_work_id:WORK,original_source_event_id:SOURCE_EVENT,
   owner_id:OWNER,conversation_id:CONVO,original_job_settled:false,
   goal_still_authorized:true,work_item:{
    work_item_id:WORK,workflow_id:'workflow:'+WORK,
    connector:null,consequential:false
   },connector:{execute:async()=>({})},
   independent_verifier:{verify:async()=>{
    if(failPreflight)throw Error('source changed before claim');
    return {original_work_id:WORK,independent:true,independently_verified:true,
     evidence_kind:'OBSERVED_FAILURE',blocker_class:'MISSING_INSTRUMENT',
     provider_effect_may_have_occurred:false,external_action_performed:false};
   }}
  }),
  makeProviderReadback:()=>async()=>({})
 };
 const service=createRileyServiceOriginalRuntime({
  db,env,fetchImpl:async()=>({ok:true}),
  callRpc:async(_db,name,args)=>{
   if(name==='reality_read_owner_employee_shifts_v1')return shiftRead();
   if(name==='reality_read_owner_genuine_loop_v1')return ledger();
   if(name==='reality_read_shift_original_execution_context_v1')return executionContext;
   throw Error('unexpected service source '+name);
  },
  loadSourceAdapters:()=>sourceAdapter,
  makeOriginalRunner:()=>async({originalWorkId})=>({
   original_work_id:originalWorkId,
   execution_status:'UNRESOLVED',
   capability_response:'GENUINE_CAPABILITY_GAP_DURABLY_QUEUED',
   original_job_completed:false,new_job_created:false,
   production_changed:false
  })
 });
 const driver=createRileyTrustedOriginalDriver({
  db,
  loadShiftReadback:service.loadShiftReadback,
  loadOwnerLedgerReadback:service.loadOwnerLedgerReadback,
  loadTrustedAuthorizedOriginal:service.loadTrustedAuthorizedOriginal,
  runOriginal:service.runOriginal,
  callRpc:rpc,now:()=>new Date('2026-11-07T14:00:00Z')
 });
 const workerFetch=async url=>({
  ok:true,json:async()=>url.endsWith('reality_close_employee_shift_v1')?
   {status:'NO_SHIFT_DUE_FOR_CLOSE'}:
   url.endsWith('reality_reconcile_employee_shift_original_v1')?
   reconciliation:
   {status:'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED',shift_id:SHIFT}
 });
 return {calls,worker:()=>processGovernedEmployeeShiftTick(db,{
  fetchImpl:workerFetch,wakeCapability:async()=>wake,
  executeQualifiedOriginals:driver
 })};
}
test('full shift step-six connects existing original to SINGLE claim, real service loader, durable outcome, independent receipt gate',async()=>{
 const h=harness();
 const result=await h.worker();
 assert.equal(result.status,'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED');
 assert.equal(result.original_job_driver.status,expectedReceipt.status);
 assert.equal(result.original_job_driver.original_work_id,WORK);
 assert.equal(result.original_job_driver.attempted,1);
 assert.equal(result.original_job_driver.independently_settled,0);
 assert.deepEqual(result.original_job_driver.outcomes.map(x=>x.original_work_id),[WORK]);
 assert.equal(result.original_job_driver.outcomes[0].status,
  'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF');
 assert.equal(result.original_job_driver.outcomes[0].original_job_settled,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.job_completed,false);
 assert.deepEqual(h.calls.map(x=>x.name),[
  'reality_read_eligible_shift_originals_v1',
  'reality_read_eligible_shift_originals_v1',
  'reality_claim_exact_shift_original_v1',
  'reality_record_exact_shift_original_outcome_v1',
  'reality_reconcile_exact_shift_original_receipt_v1'
 ]);
 assert.deepEqual(h.calls[2].args,{
  p_shift_id:SHIFT,p_original_work_id:WORK,p_trigger_id:TRIGGER
 });
 assert.equal(h.calls.some(x=>x.args?.p_original_work_id===OTHER_WORK),false);
});
test('failed source preflight must not claim even if wake and eligibility look real',async()=>{
 const h=harness({failPreflight:true});
 const result=await h.worker();
 assert.equal(result.original_job_driver.attempted,0);
 assert.equal(result.original_job_driver.independently_settled,0);
 assert.equal(result.original_job_driver.outcomes[0].status,
  'ORIGINAL_TRUSTED_PREFLIGHT_BLOCKED_NO_CLAIM');
 assert.equal(h.calls.some(x=>x.name==='reality_claim_exact_shift_original_v1'),false);
 assert.equal(result.job_completed,false);
});
test('independent receipt only counted when separately reconciled',async()=>{
 const h=harness({finalVerified:true});
 const r=await h.worker();
 assert.equal(r.original_job_driver.independently_settled,1);
 assert.equal(r.original_job_driver.outcomes[0].original_job_settled,true);
 assert.equal(r.job_completed,false);
 assert.equal(r.installation_authorized,false);
});
