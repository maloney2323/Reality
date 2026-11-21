import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scheduleOneStandingOperationalRecovery}
 from '../src/reality-capability-role-schedule-worker-v1.js';
import {projectOwnerCapabilityWorkspace as project}
 from '../api/reality/personal-capabilities.js';
const owner='11111111-2222-4333-8444-555555555555';
const id='22222222-3333-4444-8555-666666666666';
const hash='f'.repeat(64);
const key='incident:'+hash;
const grant={
 status:'OWNER_STANDING_ROUTINE_DELEGATION_READ_ONLY',
 owner_id:owner,owner_scope_verified:true,read_only:true,
 enabled:true,currently_active:true,
 scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1',
 external_actions_authorized:false,
 installation_authorized:false,
 shift_execution_authorized:false,
 production_changed:false
};
const incident={
 key,title:'Investigate Reality scheduled worker failure',
 kind:'WORKER_EXECUTION_FAILURE',
 evidence_summary:'ERROR: OWNER_SCOPE_PERMISSION_REQUIRED',
 cron_jobid:7,failed_run_count:6,
 verified_missing_capability:false,
 executable_job:false,installation_authorized:false
};
const claim={
 status:'STANDING_OWNER_WORKER_INCIDENT_CLAIMED',
 owner_id:owner,claim_id:id,
 capability_key:key,evidence_fingerprint:hash,
 source_title:incident.title,source_observation:incident,
 scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1',
 model_triage_authorized:true,
 new_original_jobs_created:0,execution_authorized:false,
 installation_authorized:false,production_changed:false
};
const proposal={
 capability_key:key,
 employee_function_id:'infrastructure_operations',
 reviewer_function_id:'quality_security_reliability',
 role_rationale:'The operations role is responsible for worker connectivity and scheduled service reliability.',
 investigation_scope:'Reproduce the scheduled worker permission error in an isolated project and compare service-role and cron identities.',
 independent_test_requirement:'Run a separate non-mutating cron proof and require a current signed-worker response before recording recovery.',
 evidence_limitations:'A successful cron call is only dispatch evidence and cannot prove the model or repair completed.',
 estimate_minutes_low:30,estimate_minutes_high:120
};
const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-test',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk_testing_not_real_12345678'
};
const db={strictSecrets:true,secretKey:'fake',project:'isolated-test'};
const stub=({claimValue=claim,grantValue=grant}={})=>{
 let generated=0;const calls=[];
 return {
  calls,get generated(){return generated;},
  call:async (_db,name,args)=>{
   calls.push(name);
   if(name==='reality_claim_next_standing_worker_recovery_v1')
    return claimValue;
   if(name==='reality_read_owner_routine_delegation_v1')
    return grantValue;
   if(name==='reality_record_owner_worker_recovery_plan_v1')
    return {
     status:'EMPLOYEE_CAPABILITY_INVESTIGATION_SCHEDULED',
     owner_id:owner,claim_id:id,capability_key:key,
     evidence_fingerprint:hash,
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
   if(name==='reality_block_owner_worker_recovery_plan_v1')
    return {status:'WORKER_RECOVERY_INCIDENT_FENCED_NO_REPLAY'};
   throw Error('UNAUTHORIZED_RPC');
  },
  invokeModel:async payload=>{
   generated++;
   assert.equal(payload.store,false);
   assert.equal(payload.tool_choice,'none');
   assert.ok(JSON.stringify(payload).includes('WORKER_EXECUTION_FAILURE'));
   return {id:'resp_testIncident001',status:'completed',
    output_text:JSON.stringify(proposal)};
  }
 };
};
test('watchdog incident automatically becomes scoped employee-led investigation and independent review',async()=>{
 const st=stub();
 const x=await scheduleOneStandingOperationalRecovery({
  db,env,call:st.call,invokeModel:st.invokeModel
 });
 assert.equal(st.generated,1);
 assert.equal(x.status,'EMPLOYEE_CAPABILITY_INVESTIGATION_SCHEDULED');
 assert.equal(x.employee,'Taylor');
 assert.equal(x.reviewer,'Quinn');
 assert.equal(x.independently_verified_gap,false);
 assert.equal(x.new_original_jobs_created,0);
 assert.equal(x.execution_authorized,false);
 assert.equal(x.installation_authorized,false);
 assert.ok(st.calls.includes('reality_record_owner_worker_recovery_plan_v1'));
 assert.ok(!st.calls.includes('reality_record_owner_capability_role_schedule_v1'));
});
test('no active incident does not call the model or manufacture repair',async()=>{
 const st=stub({claimValue:{
  status:'NO_STANDING_WORKER_INCIDENT',model_triage_authorized:false,
  new_original_jobs_created:0,execution_authorized:false,
  installation_authorized:false,production_changed:false
 }});
 const x=await scheduleOneStandingOperationalRecovery({
  db,env,call:st.call,invokeModel:st.invokeModel
 });
 assert.equal(st.generated,0);
 assert.equal(x.status,'NO_STANDING_WORKER_INCIDENT');
 assert.equal(x.installation_authorized,false);
});
test('owner revocation prevents incident model call and blocks unverified lease',async()=>{
 const st=stub({grantValue:{...grant,currently_active:false}});
 const x=await scheduleOneStandingOperationalRecovery({
  db,env,call:st.call,invokeModel:st.invokeModel
 });
 assert.equal(st.generated,0);
 assert.equal(x.status,'CAPABILITY_ROLE_TRIAGE_FENCED_NO_AUTOMATIC_REPLAY');
 assert.ok(st.calls.includes('reality_block_owner_worker_recovery_plan_v1'));
});
test('owner UI exposes current status and a next step without confusing dispatch with verified execution',()=>{
 const health={
  status:'OWNER_SIGNED_WORKER_RECOVERY_EVIDENCE_READ_ONLY',
  owner_id:owner,owner_scope_verified:true,read_only:true,
  standing_grant_active:true,
  last_scheduler_status:'succeeded',
  last_scheduler_check_at:'2026-11-17T12:24:00Z',
  last_scheduler_success_at:'2026-11-17T12:24:00Z',
  scheduler_dispatch_success_not_worker_proof:true,
  current_capability_investigations_scheduled:1,
  incidents:[{
   phase:'LEASED_FOR_INVESTIGATION',
   error_summary:'ERROR: OWNER_SCOPE_PERMISSION_REQUIRED',
   failure_count:6,last_observed_at:'2026-11-17T12:23:00Z',
   assigned_employee:null,independent_reviewer:null,
   investigation_scope:null,independent_test_requirement:null,
   scheduler_dispatched_after_failure:true,
   independently_verified_repaired:false
  }],
  incident_count:1,
  next_action:'Reality must independently qualify the current failure.',
  execution_authorized_by_read:false,
  installation_authorized:false,production_changed:false
 };
 const feed={
  status:'OWNER_GAP_INTAKE_RECONCILED',ok:true,owner_id:owner,
  read_only:true,work_started:false,production_changed:false,
  counts:{current_candidates:0,verified_current_gaps:0,
   governed_active_queue:0,independently_tested_candidates:0},
  items:[]
 };
 const x=project({ownerId:owner,feed,grant,workerHealth:health});
 assert.equal(x.worker_progress.incident_count,1);
 assert.match(x.worker_progress.next_action,/independently qualify/);
 assert.equal(x.worker_progress.incidents[0].independently_verified_repaired,false);
 assert.equal(x.worker_progress.scheduler_dispatch_success_not_worker_proof,true);
 assert.equal(x.jobs_created_by_read,0);
 assert.throws(()=>project({ownerId:owner,feed,grant,
  workerHealth:{...health,owner_id:'other'}}),
  /WORKER_RECOVERY_OWNER_OR_PROOF_UNVERIFIED/);
});
test('existing watchdog and signed shift worker remain separate; no new scheduler or silent authorizations',()=>{
 const root=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
 const sql=root('supabase/migrations/20261117_owner_worker_self_observation_and_recovery_v1.sql');
 const repair=root('supabase/migrations/20261117_restore_signed_worker_cron_scope_v1.sql');
 const worker=root('api/reality/governed-employee-shift-worker.js');
 const ui=root('reality-capability-workspace-v1.js');
 assert.match(sql,/cron\.alter_job\(/);
 assert.match(sql,/observe_owner_worker_cron_failures_v1/);
 assert.match(sql,/WORKER_RECOVERY_CLAIM_SERVICE_ONLY/);
 assert.match(sql,/reality_claim_next_standing_worker_recovery_v1/);
 assert.match(sql,/EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1/);
 assert.doesNotMatch(sql,/cron\.schedule\(/);
 assert.match(repair,/SIGNED_WAKE_RECOVERY_NO_AUTHORITY_PROOF/);
 assert.match(worker,/scheduleOneStandingOperationalRecovery/);
 assert.match(worker,/operational_self_recovery_investigation/);
 assert.match(ui,/What Reality is doing/);
 assert.match(ui,/Check work progress/);
 assert.match(ui,/window\.setInterval/);
});
