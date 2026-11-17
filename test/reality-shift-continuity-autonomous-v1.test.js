import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseContinuityModelInvestigation,investigateOneSignedShiftContinuityIncident}
 from '../src/reality-shift-continuity-auto-investigation-v1.js';
import {projectOwnerIncidentChatBriefing,incidentChatUniverseObservations}
 from '../src/reality-owner-operational-incident-chat-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const shift='22222222-3333-4444-8555-666666666666';
const incident='33333333-4444-4555-8666-777777777777';
const lease='44444444-5555-4666-8777-888888888888';
const hash=s=>'sha256:'+s.repeat(64);
const roles=[
 {function_id:'diagnose_engineering',employee_name:'Riley',
  role:'Engineering',responsibilities:'Investigate software defects and repairs'},
 {function_id:'quality_reviewer',employee_name:'Quinn',
  role:'QA',responsibilities:'Independently reproduce failures and test candidates'},
 {function_id:'operations',employee_name:'Taylor',
  role:'Operations',responsibilities:'Investigate business workflows'}
];
const proposal={
 employee_function_id:'diagnose_engineering',
 reviewer_function_id:'quality_reviewer',
 diagnosis:'Source evidence confirms a stale signed-employee claim, but the precise code root cause is not independently verified.',
 proposed_upgrade:'Introduce a governed singleflight claim-reconciliation test and a verified worker wake contract without permitting production changes.',
 independent_test_requirement:'Reproduce the exact stalled original in a preview transaction and independently verify worker receipt and original source identity.',
 limitations:'The shift allows evidence-only diagnosis, not a software deployment or new customer-job authorization.'
};
const modelResponse=(value=proposal)=>({
 status:'completed',id:'resp_test_shift_continuity_000123',
 output_text:JSON.stringify(value)
});
const claim={
 status:'SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
 owner_id:owner,shift_id:shift,incident_id:incident,lease_id:lease,
 kind:'EMPLOYEE_INQUIRY_CLAIM_STALE',
 error_summary:'Source-backed signed employee claim exceeded the bounded worker execution window.',
 evidence_sha256:hash('a'),
 first_detected_at:'2026-11-17T15:40:00Z',
 source_claim_id:'55555555-6666-4777-8888-999999999999',
 scope:'SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
 model_inquiry_authorized:true,new_original_jobs_created:0,
 execution_authorized:false,installation_authorized:false,production_changed:false
};
const db={strictSecrets:true,secretKey:'fixture',project:'isolation-test'};
const env={
 VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolation-test',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk_not_a_real_key_for_sandbox_testing',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini'
};
function fixture({claimed=claim,model=modelResponse()}={}){
 const calls=[];
 const call=async(_db,method,args)=>{
  calls.push({method,args});
  if(method==='reality_claim_next_shift_continuity_investigation_v1')
   return claimed;
  if(method==='reality_record_shift_continuity_investigation_v1')
   return{
    status:'SHIFT_CONTINUITY_INVESTIGATION_RECORDED',
    owner_id:owner,shift_id:shift,incident_id:incident,
    assigned_employee:'Riley',independent_reviewer:'Quinn',
    investigation_receipt_sha256:hash('b'),
    independent_repair_verified:false,new_original_jobs_created:0,
    execution_authorized:false,installation_authorized:false,
    production_changed:false
   };
  if(method==='reality_block_shift_continuity_investigation_v1')
   return{
    status:'CONTINUITY_INVESTIGATION_BLOCKED_NEEDS_PROOF',
    execution_authorized:false,installation_authorized:false,
    production_changed:false
   };
  throw Error('FORBIDDEN_METHOD '+method);
 };
 return{call,calls,model};
}
const invoke=async(payload,claim)=>{
 assert.equal(payload.store,false);
 assert.equal(payload.tool_choice,'none');
 assert.equal(payload.text.format.type,'json_schema');
 assert.equal(claim.owner_id,owner);
 assert.match(payload.input[0].content[0].text,/not.*installed|installation/i);
 return modelResponse();
};
test('signed shift automatically assigns source-bound observed failure to employee plus separate reviewer',async()=>{
 const f=fixture();
 const x=await investigateOneSignedShiftContinuityIncident({
  db,env,shiftId:shift,call:f.call,invokeModel:invoke,
  fetchImpl:async()=>{throw Error('NO_EXTERNAL_PROVIDER_REQUIRED')},
  rolesBuilder:()=>({roles})
 });
 assert.equal(x.status,'SHIFT_CONTINUITY_INVESTIGATION_RECORDED');
 assert.equal(x.assigned_employee,'Riley');
 assert.equal(x.independent_reviewer,'Quinn');
 assert.equal(x.original_job_created,false);
 assert.equal(x.self_repair_proven,false);
 assert.equal(x.installation_authorized,false);
 assert.deepEqual(f.calls.map(y=>y.method),[
  'reality_claim_next_shift_continuity_investigation_v1',
  'reality_record_shift_continuity_investigation_v1'
 ]);
 assert.equal(f.calls[1].args.p_incident_id,incident);
 assert.equal(f.calls[1].args.p_evidence_sha256,hash('a'));
});
test('empty shift or incident produces no model invocation and no new job',async()=>{
 const f=fixture({claimed:{
  status:'NO_DETECTED_SHIFT_CONTINUITY_INCIDENT',
  model_inquiry_authorized:false,execution_authorized:false,
  installation_authorized:false,production_changed:false
 }});
 const r=await investigateOneSignedShiftContinuityIncident({
  db,env,shiftId:shift,call:f.call,
  fetchImpl:async()=>{throw Error('NOT_CALLED')},
  invokeModel:()=>{throw Error('NOT_CALLED')},rolesBuilder:()=>({roles})
 });
 assert.equal(r.status,'NO_DETECTED_SHIFT_CONTINUITY_INCIDENT');
 assert.equal(f.calls.length,1);
});
test('model cannot select same reviewer or invent approvals',()=>{
 assert.throws(()=>parseContinuityModelInvestigation(modelResponse({
  ...proposal,reviewer_function_id:'diagnose_engineering'
 }),roles),/SHIFT_CONTINUITY_INDEPENDENT_EMPLOYEE_REVIEWER_REQUIRED/);
 assert.throws(()=>parseContinuityModelInvestigation(modelResponse({
  ...proposal,installation_authorized:true
 }),roles),/SHIFT_CONTINUITY_MODEL_SCHEMA_INVALID/);
});
test('stale owner and forged capability install permission are rejected before model',async()=>{
 for(const bad of [
  {...claim,owner_id:'INVALID'},
  {...claim,installation_authorized:true},
  {...claim,evidence_sha256:'NOT_SHA'},
  {...claim,shift_id:'66666666-7777-4888-8999-aaaaaaaaaaaa'}
 ]){
  const f=fixture({claimed:bad});
  await assert.rejects(investigateOneSignedShiftContinuityIncident({
   db,env,shiftId:shift,call:f.call,
   fetchImpl:()=>{throw Error('SHOULD_NOT_FETCH')},
   invokeModel:()=>{throw Error('SHOULD_NOT_MODEL')},
   rolesBuilder:()=>({roles})
  }),/SHIFT_CONTINUITY_SOURCE_BOUND_INCIDENT_LEASE_UNVERIFIED/);
  assert.equal(f.calls.length,1);
 }
});
test('model/proof failure creates exact blocked owner receipt, not an unverified upgrade',async()=>{
 const f=fixture();
 const x=await investigateOneSignedShiftContinuityIncident({
  db,env,shiftId:shift,call:f.call,
  fetchImpl:()=>{throw Error('NOT_CALLED')},
  invokeModel:()=>modelResponse({...proposal,production_changed:true}),
  rolesBuilder:()=>({roles})
 });
 assert.equal(x.status,'SHIFT_CONTINUITY_INVESTIGATION_BLOCKED');
 assert.equal(x.installation_authorized,false);
 assert.equal(f.calls.at(-1).method,'reality_block_shift_continuity_investigation_v1');
});
const source={
 status:'OWNER_SIGNED_WORKER_RECOVERY_EVIDENCE_READ_ONLY',
 owner_id:owner,owner_scope_verified:true,read_only:true,
 execution_authorized_by_read:false,installation_authorized:false,
 production_changed:false,scheduler_dispatch_success_not_worker_proof:true,
 autonomous_self_repair_proven:false,incident_count:0,
 next_action:'Monitor exact source-backed evidence.',
 last_scheduler_status:'succeeded',incidents:[]
};
const readback={
 status:'OWNER_SHIFT_CONTINUITY_INCIDENTS_READ_ONLY',
 owner_id:owner,owner_scope_verified:true,read_only:true,
 execution_authorized:false,installation_authorized:false,
 production_changed:false,self_repair_proven:false,count:1,
 items:[{
  incident_id:incident,shift_id:shift,kind:'EMPLOYEE_INQUIRY_CLAIM_STALE',
  phase:'INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',
  error_summary:claim.error_summary,
  evidence_sha256:hash('a'),
  first_detected_at:'2026-11-17T15:40:00Z',
  last_observed_at:'2026-11-17T15:40:00Z',
  assigned_employee:'Riley',independent_reviewer:'Quinn',
  diagnosis:proposal.diagnosis,proposed_upgrade:proposal.proposed_upgrade,
  independent_test_requirement:proposal.independent_test_requirement,
  limitations:proposal.limitations,
  investigation_receipt_sha256:hash('b'),
  recovery_receipt_sha256:null,recovered_at:null,
  resolved_worker_run_id:null,resolved_inquiry_claim_id:null,
  recovery_attribution:null,
  next_action:'Independently reproduce the source-backed failure before any upgrade.',
  repair_executed:false,installation_authorized:false,
  production_changed:false
 }]
};
test('owner Chat receives evidence-bound stall upgrade proposal but never a repair success claim',()=>{
 const b=projectOwnerIncidentChatBriefing({
  ownerId:owner,source,continuity:readback
 });
 assert.equal(b.shift_continuity_count,1);
 assert.equal(b.shift_continuity_incidents[0].proposed_upgrade,proposal.proposed_upgrade);
 assert.equal(b.shift_continuity_incidents[0].self_repair_proven,false);
 const observations=incidentChatUniverseObservations(b);
 assert.equal(observations.length,1);
 assert.match(observations[0].summary,/not verified root cause|not independently/i);
 assert.equal(observations[0].self_repair_proven,false);
 assert.throws(()=>projectOwnerIncidentChatBriefing({
  ownerId:owner,source,continuity:{...readback,owner_id:shift}
 }),/OPERATIONAL_CHAT_OWNER_INCIDENT_PROOF_REQUIRED/);
 assert.throws(()=>projectOwnerIncidentChatBriefing({
  ownerId:owner,source,
  continuity:{...readback,items:[{...readback.items[0],repair_executed:true}]}
 }),/OPERATIONAL_CHAT_OWNER_INCIDENT_PROOF_REQUIRED/);
});
test('watchdog, worker and Chat use existing signed infrastructure and no new authority',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const schema=read('supabase/migrations/20261117_owner_shift_continuity_stall_incidents_v1.sql');
 const provenance=read('supabase/migrations/20261117_shift_continuity_independent_resumption_v1.sql');
 const worker=read('api/reality/governed-employee-shift-worker.js');
 const broker=read('src/reality-governed-shift-boundary-v1.js');
 const chat=read('reality-chat-operational-incident-briefing-v1.js');
 assert.match(schema,/observe_owner_shift_continuity_stalls_v1/);
 assert.match(schema,/reality_claim_next_shift_continuity_investigation_v1/);
 assert.match(schema,/three cron checks queued zero worker requests/);
 assert.match(schema,/now_at-interval '4 minutes'/);
 assert.match(schema,/reality_internal\.owner_shift_continuity_incidents_v1/);
 assert.doesNotMatch(schema,/cron\.schedule\(/);
 assert.match(provenance,/verify_owner_shift_stall_resumption_v1/);
 assert.match(provenance,/t\.finished_at between r\.started_at and r\.finished_at/);
 assert.match(worker,/investigateOneSignedShiftContinuityIncident/);
 assert.match(worker,/shift_continuity_incident_investigation:shiftContinuityInvestigation/);
 assert.match(broker,/read_owner_shift_continuity_incidents_v1/);
 assert.match(chat,/Discuss this stall in Chat/);
});
