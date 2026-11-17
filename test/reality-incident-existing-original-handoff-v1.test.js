import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceExistingOwnerIncidentOriginal as advance}
 from '../src/reality-incident-existing-original-handoff-v1.js';
import {projectOwnerIncidentChatBriefing}
 from '../src/reality-owner-operational-incident-chat-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const incident='22222222-3333-4444-8555-666666666666';
const obs='33333333-4444-4555-8666-777777777777';
const recovery='44444444-5555-4666-8777-888888888888';
const original='work:'+'a'.repeat(32);
const fingerprint='a'.repeat(64);
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-test'};
const db={strictSecrets:true,project:'isolated-test'};
const claim={
 status:'EXISTING_OWNER_INCIDENT_ORIGINAL_CLAIMED',owner_id:owner,
 incident_id:incident,observation_id:obs,original_work_id:original,
 source_error_fingerprint:fingerprint,original_job_created:false,
 repair_executed:false,installation_authorized:false,production_changed:false
};
const commit={
 status:'EXISTING_ORIGINAL_RECOVERY_OBLIGATION_PRESERVED',
 owner_id:owner,observation_id:obs,original_work_id:original,
 recovery_id:recovery,
 must_preserve_original_job:true,
 allow_safe_reconciliation_without_new_approval:true,
 owner_approval_for_new_install_still_required:true,
 retry_external_effects_authorized:false,
 model_generation_authorized:false,
 new_customer_job_created:false,original_job_completed:false,
 installation_authorized:false,production_changed:false
};
function mocks({claimed=claim,prior=commit}={}){
 const calls=[];
 const call=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_next_incident_original_handoff_v1')
   return claimed;
  if(name==='reality_commit_genuine_original_recovery_v1')
   return prior;
  if(name==='reality_record_incident_original_handoff_v1'){
   assert.deepEqual(args,{
    p_owner_id:owner,p_incident_id:incident,
    p_observation_id:obs,p_original_work_id:original,
    p_existing_recovery_id:recovery
   });
   return {
    status:'OWNER_INCIDENT_EXISTING_ORIGINAL_RECOVERY_PRESERVED',
    owner_id:owner,incident_id:incident,original_work_id:original,
    existing_recovery_id:recovery,proof_sha256:'sha256:'+'b'.repeat(64),
    original_job_created:false,repair_executed:false,
    installation_authorized:false,production_changed:false
   };
  }
  if(name==='reality_fail_incident_original_handoff_v1')
   return {status:'INCIDENT_ORIGINAL_HANDOFF_BLOCKED_NEEDS_REVIEW',
    installation_authorized:false,production_changed:false};
  throw Error('UNAUTHORIZED_RPC');
 };
 return {call,calls};
}
test('a matching independently approved existing original is committed through the ORIGINAL recovery ledger',async()=>{
 const m=mocks();
 const out=await advance({db,env,call:m.call});
 assert.equal(out.status,'OWNER_INCIDENT_EXISTING_ORIGINAL_RECOVERY_PRESERVED');
 assert.equal(out.original_work_id,original);
 assert.equal(out.existing_recovery_id,recovery);
 assert.equal(out.same_original_recovery_preserved,true);
 assert.equal(out.original_job_created,false);
 assert.equal(out.repair_executed,false);
 assert.equal(out.installation_authorized,false);
 assert.equal(out.production_changed,false);
 assert.deepEqual(m.calls.map(x=>x.name),[
  'reality_claim_next_incident_original_handoff_v1',
  'reality_commit_genuine_original_recovery_v1',
  'reality_record_incident_original_handoff_v1'
 ]);
});
test('no existing original warrant returns no work and does not invoke model or install',async()=>{
 const m=mocks({claimed:{
  status:'NO_EXISTING_OWNER_INCIDENT_ORIGINAL_ELIGIBLE',
  original_job_created:false,repair_executed:false,
  installation_authorized:false,production_changed:false
 }});
 const out=await advance({db,env,call:m.call});
 assert.equal(out.status,'NO_EXISTING_OWNER_INCIDENT_ORIGINAL_ELIGIBLE');
 assert.equal(out.original_job_created,false);
 assert.equal(m.calls.length,1);
});
test('unverified existing original is fenced, not retried or rewritten',async()=>{
 const m=mocks({prior:{...commit,owner_approval_for_new_install_still_required:false}});
 const out=await advance({db,env,call:m.call});
 assert.equal(out.status,'INCIDENT_EXISTING_ORIGINAL_PROOF_FAILED_OWNER_REVIEW');
 assert.equal(out.repair_executed,false);
 assert.equal(m.calls.at(-1).name,'reality_fail_incident_original_handoff_v1');
 assert.equal(m.calls.some(x=>x.name==='reality_record_incident_original_handoff_v1'),false);
});
test('model-forged owner and original are rejected before any recovery commit',async()=>{
 const m=mocks({claimed:{...claim,owner_id:'WRONG',original_job_created:true}});
 await assert.rejects(advance({db,env,call:m.call}),
  /INCIDENT_ORIGINAL_INDEPENDENT_CLAIM_MISMATCH/);
 assert.equal(m.calls.length,1);
});
test('owner Chat shows exact original handoff status and does not claim repair',()=>{
 const base={
  status:'OWNER_SIGNED_WORKER_RECOVERY_EVIDENCE_READ_ONLY',
  owner_id:owner,owner_scope_verified:true,read_only:true,
  execution_authorized_by_read:false,installation_authorized:false,
  production_changed:false,scheduler_dispatch_success_not_worker_proof:true,
  autonomous_self_repair_proven:false,incident_count:1,
  next_action:'Independent original evidence required',
  last_scheduler_status:'failed',
  incidents:[{
   incident_id:incident,phase:'EMPLOYEE_INVESTIGATION_SCHEDULED',
   error_summary:'ERROR: UNRESOLVED_PROVIDER_PERMISSION',
   failure_count:2,last_observed_at:'2026-11-17T12:23:00Z',
   assigned_employee:'Taylor',independent_reviewer:'Quinn',
   investigation_scope:'Investigate signed worker source contract',
   independent_test_requirement:'Reproduce the error independently',
   scheduler_dispatched_after_failure:false,
   operational_continuity_verified:false,
   operational_recovery_receipt_sha256:null,
   operational_recovery_attribution:null,
   autonomous_self_repair_proven:false,
   independently_verified_repaired:false
  }]
 };
 const handoff={
  status:'OWNER_INCIDENT_ORIGINAL_REPAIR_HANDOFF_READ_ONLY',
  owner_id:owner,owner_scope_verified:true,read_only:true,
  original_job_created:false,repair_executed:false,
  installation_authorized:false,production_changed:false,
  count:1,items:[{
   phase:'EMPLOYEE_INVESTIGATION_SCHEDULED',incident_id:incident,
   handoff_status:'ORIGINAL_WARRANT_AND_FROZEN_PROOF_REQUIRED',
   original_work_id:null,original_handoff_receipt_sha256:null,
   original_created_by_handoff:false,repair_executed_by_handoff:false,
   installation_authorized:false,production_changed:false,
   next_action:'Exact frozen failure and original warrant are missing.'
  }]
 };
 const projected=projectOwnerIncidentChatBriefing({
  ownerId:owner,source:base,handoff
 });
 assert.equal(projected.items[0].governed_original_handoff_status,
  'ORIGINAL_WARRANT_AND_FROZEN_PROOF_REQUIRED');
 assert.match(projected.items[0].next_action,/warrant/);
 assert.equal(projected.items[0].linked_existing_original_work_id,null);
 assert.equal(projected.items[0].self_repair_completed,false);
 const withOriginal=projectOwnerIncidentChatBriefing({
  ownerId:owner,source:base,handoff:{...handoff,items:[{
   ...handoff.items[0],
   handoff_status:'EXISTING_ORIGINAL_OBLIGATION_PRESERVED',
   original_work_id:original,
   original_handoff_receipt_sha256:'sha256:'+'f'.repeat(64),
   next_action:'Continue the original under existing approval and CI gates.'
  }]}
 });
 assert.equal(withOriginal.items[0].linked_existing_original_work_id,original);
 assert.equal(withOriginal.items[0].repair_executed_by_handoff,false);
 assert.equal(withOriginal.items[0].self_repair_completed,false);
 assert.throws(()=>projectOwnerIncidentChatBriefing({
  ownerId:owner,source:base,
  handoff:{...handoff,owner_id:'00000000-0000-4000-8000-000000000000'}
 }),/OPERATIONAL_CHAT_OWNER_INCIDENT_PROOF_REQUIRED/);
});
test('the existing watchdog and signed worker are the ONLY trigger and execution pathways',()=>{
 const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const sql=src('supabase/migrations/20261117_incident_existing_original_governed_handoff_v1.sql');
 const worker=src('api/reality/governed-employee-shift-worker.js');
 const broker=src('src/reality-governed-shift-boundary-v1.js');
 const chat=src('src/reality-owner-operational-incident-chat-v1.js');
 assert.match(sql,/reconcile_incident_existing_original_handoff_v1/);
 assert.match(sql,/reality_commit_genuine_original_recovery_v1/);
 assert.match(sql,/genuine_preview_install_approvals_v1/);
 assert.match(sql,/consumed_at is not null/);
 assert.match(sql,/independent_provider_readback_verified=true/);
 assert.match(sql,/cron\.alter_job/);
 assert.doesNotMatch(sql,/cron\.schedule\(/);
 assert.match(worker,/advanceExistingOwnerIncidentOriginal/);
 assert.match(worker,/incident_existing_original_handoff:incidentOriginalHandoff/);
 assert.match(broker,/commit_genuine_original_recovery_v1/);
 assert.match(chat,/read_owner_incident_original_handoff_v1/);
});
