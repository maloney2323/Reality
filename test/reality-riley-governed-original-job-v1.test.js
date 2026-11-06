import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 establishRileyExistingJobScope,runRileyOriginalJobViaReality
} from '../src/reality-riley-governed-original-job-v1.js';

const OWNER='11111111-2222-4333-8444-555555555555';
const SHIFT='66666666-7777-4888-8999-aaaaaaaaaaaa';
const WORK='work:'+'b'.repeat(32);
const SOURCE='https://github.com/maloney2323/Reality/issues/349';
const PROVIDER='https://github.com/maloney2323/Reality/actions/runs/42199999123';
const HASH='sha256:'+'f'.repeat(64);
const scope={owner_id:OWNER,goal_id:'reality-riley-goal',
 original_work_id:WORK,continuity_root_id:'root:riley',
 worldline_id:'worldline:riley',goal_transition_receipt_ref:'goal:transition',
 goal_evidence_ref:'goal:owner',governance_kernel_hash:HASH,
 target_environment:'ISOLATED_PREVIEW'};
const original={original_work_id:WORK,owner_id:OWNER,
 goal_id:scope.goal_id,original_job_authorized:true,
 independently_qualified:true,independently_settled:false,
 provider_effect_may_have_occurred:false,production_changed:false,
 environment:'ISOLATED_PREVIEW',source_issue_number:349,
 installation_authorized:false};
const item={work_item_id:WORK,workflow_id:'reality:software-quality',
 action:'Investigate the original internal source',connector:null,
 operation:'read',consequential:false};
function shifts(status='AWAITING_EXACT_ORIGINAL_WORK'){
 return {
  status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  work_installation_authorized_by_read:false,
  verified_human_hours_saved:null,production_changed:false,
  shifts:[{shift_id:SHIFT,plan_fingerprint:HASH,status,
   steps:Array.from({length:8},(_,i)=>({
    step_index:i+1,
    state:i===1?'SOURCE_CHECKED':i===5?'AWAITING_EXACT_WORK':'QUEUED',
    source_ref:i===1?SOURCE:null,proof_sha256:i===1?HASH:null
   }))}]
 };
}
const ledger=()=>({
 status:'OWNER_GOVERNED_LOOP_READBACK',
 owner_installation_authorized_by_read:false,
 external_action_performed:false,production_changed:false,
 jobs:[{original_work_id:WORK,source_issue_number:349,
  environment:'ISOLATED_PREVIEW',independently_settled:false,
  owner_install_approved:false}]
});
const props=()=>({shiftReadback:shifts(),ownerLedgerReadback:ledger(),ownerId:OWNER,shiftId:SHIFT,
 qualifiedOriginal:original,scope,workItem:item});
test('Riley inherits trusted Reality original-job identity and zero new authority',()=>{
 const bound=establishRileyExistingJobScope(props());
 assert.equal(bound.employee_name,'Riley');
 assert.equal(bound.owner_id,OWNER);
 assert.equal(bound.original_work_id,WORK);
 assert.equal(bound.original_goal_id,scope.goal_id);
 assert.equal(bound.source_ref,SOURCE);
 assert.equal(bound.install_approval_from_employee,false);
 assert.equal(bound.production_write_authorized,false);
 assert.equal(bound.final_settlement_not_yet_verified,true);
});
test('settled, unqualified, foreign and unbound source work is rejected BEFORE executing',()=>{
 const cases=[
  {qualifiedOriginal:{...original,independently_settled:true}},
  {ownerLedgerReadback:{...ledger(),jobs:[{...ledger().jobs[0],independently_settled:true}]}},
  {ownerLedgerReadback:{...ledger(),jobs:[]}},
  {ownerLedgerReadback:{...ledger(),owner_installation_authorized_by_read:true}},
  {qualifiedOriginal:{...original,original_job_authorized:false}},
  {qualifiedOriginal:{...original,independently_qualified:false}},
  {qualifiedOriginal:{...original,installation_authorized:true}},
  {qualifiedOriginal:{...original,provider_effect_may_have_occurred:true}},
  {qualifiedOriginal:{...original,source_issue_number:178}},
  {qualifiedOriginal:{...original,original_work_id:'work:'+'c'.repeat(32)}},
  {qualifiedOriginal:{...original,owner_id:'33333333-4444-4555-8666-777777777777'}},
  {scope:{...scope,goal_id:'different'}},
  {scope:{...scope,target_environment:'production'}},
  {shiftReadback:shifts('ENDED_READ_ONLY')},
  {workItem:{...item,connector:'github',consequential:true}},
  {workItem:{...item,work_item_id:'work:'+'e'.repeat(32)}},
 ];
 for(const variant of cases){
  assert.throws(()=>establishRileyExistingJobScope({...props(),...variant}),
   /RILEY_ORIGINAL_|SHIFT_INDEPENDENT_READBACK_INVALID/);
 }
});
test('existing Reality governed executor routes Riley gap to shared Capability Engine once',async()=>{
 let hits=0,persisted=0,providerReads=0;
 const failure={
  original_work_id:WORK,independently_verified:true,
  independent:true,verified:false,evidence_kind:'OBSERVED_FAILURE',
  blocker_class:'MISSING_INSTRUMENT',capability_id:'real_source_validator',
  source_ref:PROVIDER,verification_suite_ref:'frozen:source:verification-v1',
  external_action_performed:false,provider_effect_may_have_occurred:false,
  no_automatic_retry:false
 };
 const engine={run:async({originalWorkId,scope:calledScope,expectedFailure})=>{
  hits++;
  assert.equal(originalWorkId,WORK);
  assert.equal(calledScope.owner_id,OWNER);
  assert.equal(expectedFailure.source_ref,PROVIDER);
  return {status:'OWNER_APPROVAL_REQUIRED',original_work_id:WORK,
   capability_phase:'AWAITING_OWNER_APPROVAL',
   owner_action_required:true,installation_authorized:false,
   original_job_completed:false};
 }};
 const result=await runRileyOriginalJobViaReality({...props(),
  authorization:{authorization_id:'internal:read-only'},
  connector:{execute:async()=>{providerReads++;return {
   providerExecutionId:'internal:read-only',observation:{source_ref:PROVIDER}}}},
  independentVerifier:{verify:async()=>failure},
  engine,
  persistAndReadback:async request=>{
   persisted++;
   assert.equal(request.original_work_id,WORK);
   assert.equal(request.execution_not_yet_settled,true);
   assert.equal(request.no_new_job,true);
   return {...request,independently_verified:true,
    receipt_ref:'supabase:riley:shared-continuity:verified'};
  }
 });
 assert.equal(hits,1);
 assert.equal(persisted,1);
 assert.equal(providerReads,1);
 assert.equal(result.status,'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF');
 assert.equal(result.repair_handoff_status,'OWNER_APPROVAL_REQUIRED');
 assert.equal(result.repair_owner_approval_required,true);
 assert.equal(result.shared_capability_engine_used,true);
 assert.equal(result.original_work_id,WORK);
 assert.equal(result.installation_authorized_by_employee,false);
 assert.equal(result.original_job_settled,false);
 assert.equal(result.independently_verified_final_receipt,false);
 assert.equal(result.no_new_original_job_created,true);
 assert.equal(result.verified_human_hours_saved,null);
});
test('uncertain provider errors do not trigger automatic repair or replay',async()=>{
 let dispatches=0,repairs=0;
 const result=await runRileyOriginalJobViaReality({...props(),
  authorization:{authorization_id:'internal:read-only'},
  connector:{execute:async()=>{dispatches++;throw Error('NETWORK_UNCERTAIN')}},
  independentVerifier:{verify:async()=>{throw Error('NOT_ALLOWED')}},
  engine:{run:async()=>{repairs++;throw Error('MUST_NOT_RUN')}},
  persistAndReadback:async()=>{throw Error('MUST_NOT_PERSIST')}
 });
 assert.equal(dispatches,1);
 assert.equal(repairs,0);
 assert.equal(result.original_execution_status,'UNRESOLVED');
 assert.equal(result.status,'ORIGINAL_JOB_UNRESOLVED_NO_UNSAFE_RETRY');
 assert.equal(result.automatic_provider_retry_performed,false);
 assert.equal(result.capability_installed,undefined);
 assert.equal(result.original_job_settled,false);
});
test('missing trusted capability adapter refuses any execution',async()=>{
 let executed=0;
 await assert.rejects(runRileyOriginalJobViaReality({...props(),
  authorization:{authorization_id:'internal:read-only'},
  connector:{execute:async()=>{executed++}},
  independentVerifier:{verify:async()=>({})},
  persistAndReadback:async()=>({})}),
 /RILEY_ORIGINAL_SHARED_REALITY_DRIVER_REQUIRED/);
 assert.equal(executed,0);
});
test('employee handoff composes EXISTING foundational execution and capability engines',()=>{
 const bridge=readFileSync(new URL('../src/reality-riley-governed-original-job-v1.js',import.meta.url),'utf8');
 assert.match(bridge,/import \{executeAuthorizedWork\}/);
 assert.match(bridge,/createGenuineCapabilityExecutionHandoff/);
 assert.match(bridge,/assertShiftReadback/);
 assert.match(bridge,/OWNER_GOVERNED_LOOP_READBACK/);
 assert.match(bridge,/EXACT_LEDGER_JOB_NOT_ELIGIBLE/);
 assert.match(bridge,/original_job_authorized!==true/);
 assert.match(bridge,/independently_settled!==false/);
 assert.doesNotMatch(bridge,/process\.env\.OPENAI_API_KEY/);
 assert.doesNotMatch(bridge,/https:\/\/api\.openai\.com/);
});
