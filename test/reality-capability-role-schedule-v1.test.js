import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scheduleOneStandingCapability as schedule,
 validateCapabilityRoleProposal as validate}
 from '../src/reality-capability-role-schedule-worker-v1.js';
import {projectOwnerCapabilityWorkspace as project}
 from '../api/reality/personal-capabilities.js';
import {buildRealityProposedEmployeeRoleDiscussionContext}
 from '../src/reality-employee-identity-roster-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const claimId='22222222-3333-4444-8555-666666666666';
const hash='a'.repeat(64);
const capabilityKey='research:'+hash;
const record={
 key:capabilityKey,title:'Investigate connector conformance across provider types',
 kind:'RESEARCH_OPPORTUNITY',source_url:'https://example.org/ideas',
 executable_job:false,installation_authorized:false,
 verified_missing_capability:false,
 next_proof:'Run isolated provider comparisons',last_seen_at:'2026-11-04T13:00:00Z'
};
const claim={
 status:'STANDING_CAPABILITY_ROLE_TRIAGE_CLAIMED',owner_id:owner,
 claim_id:claimId,capability_key:capabilityKey,evidence_fingerprint:hash,
 source_title:record.title,source_observation:record,
 source_last_seen_at:record.last_seen_at,
 scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1',
 model_triage_authorized:true,execution_authorized:false,
 new_original_jobs_created:0,installation_authorized:false,
 production_changed:false
};
const grant={
 status:'OWNER_STANDING_ROUTINE_DELEGATION_READ_ONLY',owner_id:owner,
 owner_scope_verified:true,read_only:true,currently_active:true,
 enabled:true,scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1',
 external_actions_authorized:false,installation_authorized:false,
 shift_execution_authorized:false,production_changed:false
};
const output={
 capability_key:capabilityKey,
 employee_function_id:'infrastructure_operations',
 reviewer_function_id:'quality_security_reliability',
 role_rationale:'The employee owns provider integrations and operational contracts.',
 investigation_scope:'Compare existing adapters with the same provider permissions in isolated tests.',
 independent_test_requirement:'Independently test approved and blocked operations using real provider readbacks.',
 evidence_limitations:'The source was observed historically and the current gap has not yet been reproduced.',
 estimate_minutes_low:60,estimate_minutes_high:180
};
const response=(data=output)=>({
 status:'completed',id:'resp_verified123',
 output_text:JSON.stringify(data)
});
const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-test',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk_test_fully_fake01234567890'
};
const db={strictSecrets:true,secretKey:'fake',project:'isolated-test'};
const roles=buildRealityProposedEmployeeRoleDiscussionContext({
 observedAt:new Date()
}).roles;
const stub=({claimValue=claim,grantValue=grant,responseValue=response()}={})=>{
 const calls=[];let modelCalls=0;
 const call=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_next_standing_capability_schedule_v1')return claimValue;
  if(name==='reality_read_owner_routine_delegation_v1')return grantValue;
  if(name==='reality_block_owner_capability_role_schedule_v1')return {
   status:'CAPABILITY_ROLE_CLAIM_FENCED_NO_REPLAY',
   execution_authorized:false,installation_authorized:false
  };
  if(name==='reality_record_owner_capability_role_schedule_v1')return {
   status:'EMPLOYEE_CAPABILITY_INVESTIGATION_SCHEDULED',owner_id:owner,
   claim_id:claimId,capability_key:capabilityKey,evidence_fingerprint:hash,
   assigned_employee:'Taylor',independent_reviewer:'Quinn',
   planned_inquiry_at:new Date().toISOString(),
   estimate_minutes_low:args.p_estimate_low,
   estimate_minutes_high:args.p_estimate_high,
   estimated_only_not_measured:true,
   independent_current_gap_proven:false,
   existing_governed_worker_required:true,
   execution_authorized:false,new_original_jobs_created:0,
   installation_authorized:false,production_changed:false
  };
  throw Error('UNSUPPORTED_RPC');
 };
 return {calls,call,
  invokeModel:async request=>{
   modelCalls++;
   assert.equal(request.tool_choice,'none');
   assert.equal(request.store,false);
   assert.equal(request.text.format.type,'json_schema');
   const values=request.text.format.schema.properties.employee_function_id.enum;
   assert.equal(values.length,roles.length);
   assert.deepEqual(values,roles.map(x=>x.function_id));
   return responseValue;
  },
  get modelCalls(){return modelCalls;}
 };
};
test('dynamic model role routing creates a durable evidence-only employee schedule',async()=>{
 const st=stub();
 const r=await schedule({db,env,call:st.call,invokeModel:st.invokeModel});
 assert.equal(st.modelCalls,1);
 assert.equal(r.status,'EMPLOYEE_CAPABILITY_INVESTIGATION_SCHEDULED');
 assert.equal(r.employee,'Taylor');
 assert.equal(r.reviewer,'Quinn');
 assert.equal(r.estimate_minutes_low,60);
 assert.equal(r.estimate_minutes_high,180);
 assert.equal(r.independently_verified_gap,false);
 assert.equal(r.scheduled_executable_jobs,0);
 assert.equal(r.new_original_jobs_created,0);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(st.calls.filter(x=>x.name==='reality_record_owner_capability_role_schedule_v1').length,1);
});
test('empty standing-grant inventory calls no model and creates no work',async()=>{
 const st=stub({claimValue:{
  status:'NO_NEW_STANDING_CAPABILITY_REQUIRING_ROLE_TRIAGE',
  model_triage_authorized:false,new_original_jobs_created:0,
  execution_authorized:false,installation_authorized:false,
  production_changed:false
 }});
 const x=await schedule({db,env,call:st.call,invokeModel:st.invokeModel});
 assert.equal(st.modelCalls,0);
 assert.equal(x.scheduled_executable_jobs,0);
 assert.equal(x.new_original_jobs_created,0);
});
test('revocation after a durable claim prevents model and exact work',async()=>{
 const st=stub({grantValue:{...grant,currently_active:false}});
 const x=await schedule({db,env,call:st.call,invokeModel:st.invokeModel});
 assert.equal(st.modelCalls,0);
 assert.equal(x.status,'CAPABILITY_ROLE_TRIAGE_FENCED_NO_AUTOMATIC_REPLAY');
 assert.equal(st.calls.some(c=>c.name==='reality_record_owner_capability_role_schedule_v1'),false);
 assert.equal(st.calls.some(c=>c.name==='reality_block_owner_capability_role_schedule_v1'),true);
});
test('cross-owner claim and forged authority are not accepted as schedule',async()=>{
 const bad=stub({claimValue:{...claim,owner_id:'not-owner',
  execution_authorized:true}});
 await assert.rejects(schedule({db,env,call:bad.call,invokeModel:bad.invokeModel}),
  /TRUSTED_OWNER_FEED_CLAIM_REQUIRED/);
 assert.equal(bad.modelCalls,0);
});
test('model cannot self-review, invent roles, or assert execution authority',()=>{
 for(const x of [
  {...output,reviewer_function_id:output.employee_function_id},
  {...output,employee_function_id:'made_up_employee'},
  {...output,execution_authorized:true},
  {...output,capability_key:'wrong'},
  {...output,estimate_minutes_high:9999}
 ]){
  assert.throws(()=>validate({response:response(x),claim,roles}),
   /CAPABILITY_ROLE_SCHEDULE_/);
 }
});
test('owner capabilities UI displays only a modeled preliminary estimate and existing verified job gates',()=>{
 const feed={
  status:'OWNER_GAP_INTAKE_RECONCILED',ok:true,owner_id:owner,
  read_only:true,work_started:false,production_changed:false,
  counts:{current_candidates:1,verified_current_gaps:0,
   governed_active_queue:0,independently_tested_candidates:0},
  items:[{...record,priority:2}]
 };
 const scheduleRead={
  status:'OWNER_CAPABILITY_EMPLOYEE_SCHEDULE_READ_ONLY',
  owner_id:owner,owner_scope_verified:true,read_only:true,
  count:1,new_original_jobs_created:0,execution_authorized_by_schedule:false,
  installation_authorized:false,production_changed:false,
  items:[{
   capability_key:capabilityKey,evidence_fingerprint:hash,
   phase:'INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF',
   employee:'Taylor',function_id:'infrastructure_operations',
   reviewer:'Quinn',reviewer_function_id:'quality_security_reliability',
   planned_inquiry_at:new Date().toISOString(),
   assigned_at:new Date().toISOString(),
   scope:output.investigation_scope,
   independent_test_requirement:output.independent_test_requirement,
   source_limitations:output.evidence_limitations,
   estimate_minutes_low:60,estimate_minutes_high:180,
   estimate_is_model_provisional_only:true,
   source_feed_fingerprint_unchanged:true,
   independent_current_gap_proven:false,
   existing_original_work_id:null,existing_governance_phase:null,
   execution_authorized_by_schedule:false,
   original_job_created_by_schedule:false,
   installation_authorized:false
  }]
 };
 const x=project({ownerId:owner,feed,grant,schedule:scheduleRead});
 assert.equal(x.scheduled_capability_investigations,1);
 assert.equal(x.existing_independently_proven_originals,0);
 assert.equal(x.items[0].assigned_employee,'Taylor');
 assert.equal(x.items[0].reviewing_employee,'Quinn');
 assert.deepEqual(x.items[0].estimated_hours,{low:1,high:3});
 assert.equal(x.items[0].executable_job,false);
 assert.equal(x.items[0].execution_authorized,false);
 assert.equal(x.items[0].estimate_confidence,
  'MODEL_PLANNING_RANGE_NOT_INDEPENDENTLY_VERIFIED');
 assert.throws(()=>project({ownerId:owner,feed,grant,
  schedule:{...scheduleRead,owner_id:'not-owner'}}),
  /CAPABILITY_SCHEDULE_OWNER_READBACK_UNVERIFIED/);
});
test('only existing original proof ledger may mark current gap verified; schedule cannot authorize execution',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261117_owner_capability_employee_schedule_v1.sql',
  import.meta.url),'utf8');
 const cron=readFileSync(new URL(
  '../supabase/migrations/20261117_existing_worker_capability_schedule_wake_v1.sql',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(sql,/verified_frozen_reproduction->>'status'='ORIGINAL_FROZEN_REPRODUCED_RED'/);
 assert.match(sql,/verified_frozen_reproduction->>'original_work_id'=q.original_work_id/);
 assert.match(sql,/on conflict do nothing returning \* into record_v/);
 assert.match(sql,/for update skip locked/);
 assert.match(sql,/STANDING_OWNER_GRANT_REVOKED/);
 assert.match(sql,/planned_inquiry_at=clock_timestamp/);
 assert.match(sql,/revoke execute on function public.reality_claim_next_standing_capability_schedule_v1/);
 assert.match(cron,/eligible_shift\.permitted/);
 assert.match(cron,/owner_capability_employee_schedule_v1/);
 assert.match(cron,/cron\.alter_job/);
 assert.doesNotMatch(cron,/cron\.schedule\(/);
 assert.match(worker,/scheduleOneStandingCapability/);
 assert.match(worker,/runOneStandingEmployeeDiscovery/);
 assert.doesNotMatch(sql,/UPDATE reality_internal\.genuine_capability_queue_v1/i);
});
