import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 parseContinuityModelInvestigation,investigateOneSignedShiftContinuityIncident,
 GOVERNED_RECOVERY_ACTIONS,GOVERNED_RECOVERY_CLASSES
} from '../src/reality-shift-continuity-auto-investigation-v1.js';

const owner='11111111-2222-4333-8444-555555555555';
const shift='22222222-3333-4444-8555-666666666666';
const incident='33333333-4444-4555-8666-777777777777';
const lease='44444444-5555-4666-8777-888888888888';
const sha='sha256:'+'a'.repeat(64);
const roles=[
 {function_id:'operations',employee_name:'Taylor',role:'Operations',
  responsibilities:'Operational continuity and business source qualification'},
 {function_id:'reviewer',employee_name:'Quinn',role:'Quality',
  responsibilities:'Independent verification'}
];
const proposal={
 employee_function_id:'operations',reviewer_function_id:'reviewer',
 diagnosis:'Repeated signed worker wakes show no newly admitted business original, but the evidence does not establish a software defect.',
 proposed_upgrade:'Reinspect existing owner Continuity qualifications and validate the canonical original admission path before touching any executor.',
 independent_test_requirement:'Verify the current owner source and registered executor independently, then require one canonical original receipt.',
 limitations:'The current maintenance shift does not authorize new customer work or automatic installation of an unrelated repair.',
 blocker_class:'MISSING_SOURCE_EVIDENCE',
 next_governed_action:'REQUALIFY_EXISTING_CONTINUITY_SOURCE',
 resume_acceptance_condition:'The existing signed shift records independently qualified original work and a final verified original receipt.'
};
const response=(value=proposal)=>({
 status:'completed',id:'resp_test_guided_recovery_9876',output_text:JSON.stringify(value)
});
const claim={
 status:'SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
 owner_id:owner,shift_id:shift,incident_id:incident,lease_id:lease,
 evidence_sha256:sha,kind:'SIGNED_SHIFT_REPEATED_NO_PROGRESS',
 error_summary:'Signed worker repeatedly reports missing canonical owner original-work lineage without verified original progress.',
 scope:'SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
 model_inquiry_authorized:true,new_original_jobs_created:0,
 execution_authorized:false,installation_authorized:false,
 production_changed:false
};
const db={strictSecrets:true,secretKey:'not-a-real-key',project:'isolated-test'};
const env={
 VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-test',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk_not_a_real_key_for_frozen_test',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini'
};
test('strict signed-shift LLM recovery rejects unregistered actions and extra authority',()=>{
 assert.ok(GOVERNED_RECOVERY_CLASSES.includes('MISSING_OWNER_AUTHORITY'));
 assert.ok(GOVERNED_RECOVERY_ACTIONS.includes('REQUEST_EXACT_OWNER_APPROVAL'));
 assert.equal(parseContinuityModelInvestigation(response(),roles,{guidedRecovery:true})
  .next_governed_action,'REQUALIFY_EXISTING_CONTINUITY_SOURCE');
 assert.throws(()=>parseContinuityModelInvestigation(response({
  ...proposal,next_governed_action:'INSTALL_REPAIR_WITHOUT_APPROVAL'
 }),roles,{guidedRecovery:true}),/GOVERNED_RECOVERY_ROUTE_UNVERIFIED/);
 assert.throws(()=>parseContinuityModelInvestigation(response({
  ...proposal,execution_authorized:true
 }),roles,{guidedRecovery:true}),/MODEL_SCHEMA_INVALID/);
 assert.throws(()=>parseContinuityModelInvestigation(response({
  ...proposal,resume_acceptance_condition:'just wake again'
 }),roles,{guidedRecovery:true}),/DIAGNOSIS_AND_TEST_SPEC_UNVERIFIED/);
});
test('repeated no-progress incident consults real owner Continuity preflight, saves route and retains authority',async()=>{
 const calls=[];let seenPayload=null;
 const call=async(_db,rpc,args)=>{
  calls.push({rpc,args});
  if(rpc==='reality_claim_next_shift_continuity_investigation_v1')
   return claim;
  if(rpc==='reality_read_owner_multi_original_shift_preflight_v1')
   return{status:'OWNER_MULTI_ORIGINAL_SHIFT_INDEPENDENT_PREFLIGHT',
    owner_id:owner,current_shift_id:shift,current_shift_status:'AWAITING_EXACT_ORIGINAL_WORK',
    read_only:true,model_execution_authorized:false,owner_approval_granted:false,
    source_bound_originals:0,independently_qualified_originals_for_executor_preflight:0,
    pending_exact_chat_admission_approvals:0,
    prioritized_source_preflight:[{
     intake_family:'EMPLOYEE_SCHEDULE',
     acceptance_gate:'CANONICAL_ORIGINAL_ADMISSION_REQUIRED',
     route_state:'OWNER_GOAL_ORIGINAL_AND_INDEPENDENT_SOURCE_QUALIFICATION_REQUIRED',
     governed_next_action:'INDEPENDENTLY_VERIFY_CURRENT_SOURCE_AND_OWNER_BUSINESS_OBLIGATION',
     original_work_id:null
    }]};
  if(rpc==='reality_record_shift_continuity_investigation_v1')
   return{status:'SHIFT_CONTINUITY_INVESTIGATION_RECORDED',
    owner_id:owner,shift_id:shift,incident_id:incident,
    assigned_employee:'Taylor',independent_reviewer:'Quinn',
    investigation_receipt_sha256:sha,independent_repair_verified:false,
    new_original_jobs_created:0,execution_authorized:false,
    installation_authorized:false,production_changed:false};
  throw Error('UNEXPECTED_RPC '+rpc);
 };
 const out=await investigateOneSignedShiftContinuityIncident({
  db,env,shiftId:shift,call,rolesBuilder:()=>({roles}),
  invokeModel:async payload=>{seenPayload=payload;return response()},
  fetchImpl:async()=>{throw Error('NO_PROVIDER_WRITE_ALLOWED')}
 });
 assert.equal(out.status,'SHIFT_CONTINUITY_INVESTIGATION_RECORDED');
 assert.equal(out.next_action,'REQUALIFY_EXISTING_CONTINUITY_SOURCE');
 assert.equal(out.blocker_class,'MISSING_SOURCE_EVIDENCE');
 assert.equal(out.original_work_resumed,false);
 assert.equal(out.self_repair_proven,false);
 assert.equal(out.installation_authorized,false);
 assert.equal(out.action_dispatched_by_model,false);
 assert.deepEqual(calls.map(x=>x.rpc),[
  'reality_claim_next_shift_continuity_investigation_v1',
  'reality_read_owner_multi_original_shift_preflight_v1',
  'reality_record_shift_continuity_investigation_v1'
 ]);
 assert.match(calls[2].args.p_proposed_upgrade,/GOVERNED_ACTION:REQUALIFY_EXISTING_CONTINUITY_SOURCE/);
 assert.match(calls[2].args.p_independent_test_requirement,/Resume condition/);
 assert.match(JSON.stringify(seenPayload.input),/CANONICAL_ORIGINAL_ADMISSION_REQUIRED/);
 assert.equal(seenPayload.tool_choice,'none');
 assert.equal(seenPayload.store,false);
});
test('signed worker routes a repeated blocker to a service-only incident without fabricating an original',()=>{
 const source=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const boundary=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261121203000_signed_shift_repeated_blocker_recovery_v1.sql',import.meta.url),'utf8');
 assert.match(boundary,/observe_signed_shift_no_progress_v1/);
 assert.match(source,/reality_observe_signed_shift_no_progress_v1/);
 assert.match(source,/p_worker_run_id:actualWorkerRunId/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/signed_worker_actual_runs_v1/);
 assert.match(sql,/last_worker_status='WAKE_RECEIVED'/);
 assert.match(sql,/consecutive_count<2/);
 assert.match(sql,/SIGNED_SHIFT_REPEATED_NO_PROGRESS/);
 assert.match(sql,/ON CONFLICT\(owner_id,shift_id,kind,evidence_key\)/);
 assert.match(sql,/reality_internal\.governed_original_independent_final_receipts_v1/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.reality_observe_signed_shift_no_progress_v1/);
 assert.doesNotMatch(sql,/INSERT INTO reality_internal\.governed_employee_original_claims_v1/i);
 assert.doesNotMatch(sql,/SECURITY DEFINER|owner_approval_granted',true/i);
});
