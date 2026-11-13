import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRileyServiceOriginalRuntime}
 from '../src/reality-riley-service-original-runtime-v1.js';
import {createRileyTrustedOriginalDriver}
 from '../src/reality-riley-trusted-original-driver-bridge-v1.js';

const OWNER='11111111-2222-4333-8444-555555555555';
const SHIFT='22222222-3333-4444-8555-666666666666';
const TRIGGER='33333333-4444-4555-8666-777777777777';
const CONVO='44444444-5555-4666-8777-888888888888';
const SOURCE_EVENT='55555555-6666-4777-8888-999999999999';
const WORK='work:'+'a'.repeat(32);
const SRC='https://github.com/maloney2323/Reality/issues/263';
const DIGEST='sha256:'+'c'.repeat(64);
const db={url:'https://isolated.supabase.co',
 secretKey:'isolated-fake-service-key',project:'isolatedproj'};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project,
 VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),
 REALITY_GITHUB_TOKEN:'example-github-read-token-value'};
const ctx={
 status:'SHIFT_ORIGINAL_TRUSTED_CONTEXT_READY',
 shift_id:SHIFT,owner_id:OWNER,conversation_id:CONVO,
 goal_id:'goal:owner-accepted-live-repair-263',
 original_work_id:WORK,trigger_id:TRIGGER,
 original_work_event_id:SOURCE_EVENT,source_ref:SRC,
 source_proof_sha256:DIGEST,source_step_index:2,
 owner_scope_verified:true,source_checked:true,
 original_job_settled:false,execution_claim_consumed:false,
 installation_authorized:false,production_changed:false,
};
const args={owner_id:OWNER,shift_id:SHIFT,trigger_id:TRIGGER,
 original_work_id:WORK,source_ref:SRC,source_proof_sha256:DIGEST,
 claim_id:null,read_only:true,preflight_only:true};
function makeJob(){
 return {original_work_id:WORK,original_source_event_id:SOURCE_EVENT,
  owner_id:OWNER,conversation_id:CONVO,
  original_job_settled:false,goal_still_authorized:true,
  work_item:{work_item_id:WORK,workflow_id:'workflow:'+WORK,
   connector:null,consequential:false},
  connector:{execute:async()=>({providerExecutionId:'isolated-source'})},
  independent_verifier:{verify:async()=>({
   original_work_id:WORK,independent:true,independently_verified:true,
   evidence_kind:'OBSERVED_FAILURE',blocker_class:'MISSING_INSTRUMENT',
   provider_effect_may_have_occurred:false,external_action_performed:false
  })},
 };
}
function configured({context=ctx,job=makeJob(),runnerOutcome=null}={}){
 const calls=[],sourceCalls=[];
 const factory=createRileyServiceOriginalRuntime({
  db,env,fetchImpl:async()=>({ok:true}),
  callRpc:async(_db,name,payload)=>{
   calls.push({name,payload});
   if(name==='reality_read_shift_original_execution_context_v1')return context;
   if(name==='reality_read_owner_employee_shifts_v1')return readback();
   if(name==='reality_read_owner_genuine_loop_v1')return ledger();
   throw Error('UNEXPECTED_'+name);
  },
  loadSourceAdapters:opts=>{
   sourceCalls.push(opts);
   return {
    loadAuthorizedInternalJob:async x=>{
     assert.equal(x.original_work_id,WORK);
     assert.equal(x.owner_id,OWNER);
     assert.equal(x.conversation_id,CONVO);
     assert.equal(x.read_only,true);
     return job;
    },
    makeProviderReadback:()=>async()=>({})
   };
  },
  makeOriginalRunner:options=>async originalRequest=>{
   assert.equal(options.session.user_id,OWNER);
   assert.equal(options.conversationId,CONVO);
   assert.equal(originalRequest.originalWorkId,WORK);
   return runnerOutcome||{
    original_work_id:WORK,execution_status:'UNRESOLVED',
    capability_response:'GENUINE_CAPABILITY_GAP_DURABLY_QUEUED',
    original_job_completed:false,new_job_created:false,
    production_changed:false
   };
  }
 });
 return {factory,calls,sourceCalls};
}
function readback(){
 const steps=Array.from({length:8},(_,i)=>({
  step_index:i+1,state:i===1?'SOURCE_CHECKED':i===5?'AWAITING_EXACT_WORK':'QUEUED',
  source_ref:i===1?SRC:null,
  proof_sha256:i===1?DIGEST:null
 }));
 return {status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  work_installation_authorized_by_read:false,
  verified_human_hours_saved:null,production_changed:false,
  shifts:[{shift_id:SHIFT,status:'AWAITING_EXACT_ORIGINAL_WORK',
   planned_start_at:'2026-11-07T13:00:00Z',
   planned_end_at:'2026-11-07T17:00:00Z',
   plan_fingerprint:'sha256:'+'d'.repeat(64),
   steps}]};
}
function ledger(){return {status:'OWNER_GOVERNED_LOOP_READBACK',
 owner_installation_authorized_by_read:false,
 external_action_performed:false,production_changed:false,
 jobs:[{original_work_id:WORK,source_issue_number:263,
  environment:'ISOLATED_PREVIEW',owner_install_approved:false,
  independently_settled:false,phase:'PENDING_FROZEN_REPRODUCTION'}]}}
test('trusted service derives owner, goal, conversation from current DB context and preflights source BEFORE claim',async()=>{
 const {factory,calls,sourceCalls}=configured();
 const loaded=await factory.loadTrustedAuthorizedOriginal(args);
 assert.equal(loaded.source_context.owner_id,OWNER);
 assert.equal(loaded.source_context.conversation_id,CONVO);
 assert.equal(loaded.qualifiedOriginal.original_work_id,WORK);
 assert.equal(loaded.workItem.connector,null);
 assert.equal(loaded.source_adapter_read_only,true);
 assert.equal(calls.length,1);
 assert.equal(calls[0].name,'reality_read_shift_original_execution_context_v1');
 assert.equal(sourceCalls.length,1);
 assert.equal(sourceCalls[0].session.user_id,OWNER);
 assert.equal(sourceCalls[0].env,env);
 assert.equal(loaded.preclaim_verified_source_digest,DIGEST);
});
test('custom trusted original execution uses existing source-backed Reality runner and does not certify settlement',async()=>{
 const {factory}=configured();
 const job=await factory.loadTrustedAuthorizedOriginal(args);
 const output=await factory.runOriginal({...job,
  ownerId:OWNER,shiftId:SHIFT,
  shiftReadback:readback(),ownerLedgerReadback:ledger()});
 assert.equal(output.status,'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF');
 assert.equal(output.original_work_id,WORK);
 assert.equal(output.existing_reality_governed_executor_used,true);
 assert.equal(output.no_new_original_job_created,true);
 assert.equal(output.original_job_settled,false);
 assert.equal(output.independently_verified_final_receipt,false);
 assert.equal(output.installation_authorized_by_employee,false);
 assert.equal(output.production_changed,false);
});
test('source mismatch, lost goal, invalid provider proof cannot consume a job claim',async()=>{
 const badContexts=[
  {...ctx,owner_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},
  {...ctx,conversation_id:'invalid'},
  {...ctx,original_work_id:'work:'+'b'.repeat(32)},
  {...ctx,execution_claim_consumed:true},
  {...ctx,original_job_settled:true},
  {...ctx,installation_authorized:true},
  {...ctx,source_proof_sha256:'sha256:'+'b'.repeat(64)},
  {...ctx,source_ref:'https://github.com/maloney2323/Reality/issues/178'}
 ];
 for(const bad of badContexts){
  const {factory,sourceCalls}=configured({context:bad});
  await assert.rejects(factory.loadTrustedAuthorizedOriginal(args),
   /RILEY_SERVICE_ORIGINAL_/);
  assert.equal(sourceCalls.length,0);
 }
 const bad={...makeJob(),original_source_event_id:
  '66666666-7777-4888-9999-aaaaaaaaaaaa'};
 await assert.rejects(configured({job:bad}).factory.loadTrustedAuthorizedOriginal(args),
  /CURRENT_CONTINUITY_ORIGINAL_PRECLAIM_MISMATCH/);
});
test('server code wires the trusted original adapter, never a fake model-selected job',()=>{
 const api=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(api,/createRileyServiceOriginalRuntime/);
 assert.match(api,/createRileyTrustedOriginalDriver/);
 assert.match(api,/loadTrustedAuthorizedOriginal:originalAdapters\.loadTrustedAuthorizedOriginal/);
 assert.match(api,/processGovernedEmployeeShiftTick\(db,\{[\s\S]*executeQualifiedOriginals/);
 assert.match(api,/REALITY_EMPLOYEE_SHIFT_WORKER_TOKEN/);
 assert.doesNotMatch(api,/owner_approve_qualified_preview|install_capability/i);
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261107_riley_trusted_shift_execution_context_v1.sql',
  import.meta.url),'utf8');
 for(const marker of [
  "current_user<>'service_role'",
  "reality_read_shift_capability_wake_v1",
  'original_work_event_id',
  'goal_publication_epochs',
  'genuine_independent_final_receipts_v1',
  'governed_employee_original_claims_v1',
  'execution_claim_consumed',
  'grant execute on function public.reality_read_shift_original_execution_context_v1'
 ])assert.match(sql,new RegExp(marker));
 assert.doesNotMatch(sql,/insert into|update reality_internal/i);
});
test('do not run original without exactly owner-bound executable shift and goal continuity',async()=>{
 const {factory}=configured();
 const job=await factory.loadTrustedAuthorizedOriginal(args);
 for(const bad of [
  {...job,source_context:{...job.source_context,shift_id:CONVO}},
  {...job,scope:{...job.scope,owner_id:CONVO}}
 ]){
  await assert.rejects(factory.runOriginal({...bad,
   ownerId:OWNER,shiftId:SHIFT,
   shiftReadback:readback(),ownerLedgerReadback:ledger()}),
   /CURRENT_TRUSTED_ORIGINAL_POSTCLAIM_SCOPE_REQUIRED/);
 }
});
test('trusted original runtime refuses production or missing durable goal state',()=>{
 for(const bad of [
  {...env,VERCEL_ENV:'production'},
  {...env,REALITY_UNIVERSE_PERSISTENCE_ENABLED:'false'},
  {...env,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'other'}
 ])assert.throws(()=>createRileyServiceOriginalRuntime({
  db,env:bad,loadSourceAdapters:()=>({})
 }),/PREVIEW_SERVICE_DATABASE_BOUNDARY_REQUIRED/);
});

test('frozen #263: settlement may change after source admission but before original-job execution',async()=>{
 const {factory}=configured();
 const admitted=await factory.loadTrustedAuthorizedOriginal(args);
 const changed={...admitted,
  source_context:{...admitted.source_context,original_job_settled:true}};
 await assert.rejects(
  factory.runOriginal({...changed,ownerId:OWNER,shiftId:SHIFT,
   shiftReadback:readback(),ownerLedgerReadback:ledger()}),
  /RILEY_SERVICE_ORIGINAL_CURRENT_TRUSTED_ORIGINAL_POSTCLAIM_SCOPE_REQUIRED/);
});
test('frozen #263: changed source owner execution authority cannot be reused at handoff',async()=>{
 const {factory}=configured();
 const admitted=await factory.loadTrustedAuthorizedOriginal(args);
 const changed={...admitted,source_context:{
  ...admitted.source_context,installation_authorized:true}};
 await assert.rejects(
  factory.runOriginal({...changed,ownerId:OWNER,shiftId:SHIFT,
   shiftReadback:readback(),ownerLedgerReadback:ledger()}),
  /RILEY_SERVICE_ORIGINAL_CURRENT_TRUSTED_ORIGINAL_POSTCLAIM_SCOPE_REQUIRED/);
});

test('the narrow runner scope is never treated as authoritative settlement evidence',()=>{
 const source=readFileSync(new URL(
  '../src/reality-riley-service-original-runtime-v1.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/scope\?\.original_job_settled|scope\.original_job_settled/);
 assert.match(source,/source_context\.original_job_settled!==false/);
 assert.match(source,/source_context\.installation_authorized!==false/);
});
