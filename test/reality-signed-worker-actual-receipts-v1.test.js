import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectOwnerIncidentChatBriefing}
 from '../src/reality-owner-operational-incident-chat-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const owner='11111111-2222-4333-8444-555555555555';
const source={
 status:'OWNER_SIGNED_WORKER_RECOVERY_EVIDENCE_READ_ONLY',
 owner_id:owner,owner_scope_verified:true,read_only:true,
 execution_authorized_by_read:false,installation_authorized:false,
 production_changed:false,scheduler_dispatch_success_not_worker_proof:true,
 autonomous_self_repair_proven:false,
 incidents:[],incident_count:0,
 next_action:'Read independent worker receipt before concluding a repair.',
 last_scheduler_status:'succeeded'
};
const delivery=(status,minutes=1)=>({
 status:'OWNER_SIGNED_WORKER_ACTUAL_RUN_READ_ONLY',
 owner_id:owner,owner_scope_verified:true,read_only:true,
 latest_worker_status:status,
 latest_worker_stage:'WORKER_RESPONSE_PUBLICATION',
 last_actual_worker_started_at:status==='NO_SIGNED_WORKER_RUN_OBSERVED'?
  null:new Date(Date.now()-minutes*60000).toISOString(),
 last_actual_worker_finished_at:['COMPLETED','FAILED'].includes(status)?
  new Date().toISOString():null,
 last_scheduler_sql_dispatch_at:new Date().toISOString(),
 scheduler_success_alone_proves_execution:false,
 actual_worker_process_attested:status!=='NO_SIGNED_WORKER_RUN_OBSERVED',
 original_job_completed_by_read:false,
 repair_executed_by_read:false,
 installation_authorized:false,production_changed:false
});
test('the signed worker can prove its real process finished independently of cron dispatch',()=>{
 const x=projectOwnerIncidentChatBriefing({
  ownerId:owner,source,delivery:delivery('COMPLETED')
 });
 assert.equal(x.signed_worker_delivery.phase,'SIGNED_WORKER_PROCESS_COMPLETED');
 assert.equal(x.signed_worker_delivery.actual_worker_process_attested,true);
 assert.equal(x.signed_worker_delivery.scheduler_success_alone_proves_execution,false);
 assert.equal(x.installation_authorized,false);
});
test('cron success with no process attestation is not claimed as execution',()=>{
 const x=projectOwnerIncidentChatBriefing({
  ownerId:owner,source,delivery:delivery('NO_SIGNED_WORKER_RUN_OBSERVED')
 });
 assert.equal(x.signed_worker_delivery.phase,'SIGNED_WORKER_PROCESS_NOT_YET_ATTESTED');
 assert.equal(x.signed_worker_delivery.actual_worker_process_attested,false);
 assert.match(x.signed_worker_delivery.next_action,/no|not|worker/i);
});
test('a real failed worker records a precise stage instead of silently stopping',()=>{
 const x=projectOwnerIncidentChatBriefing({
  ownerId:owner,source,delivery:delivery('FAILED')
 });
 assert.equal(x.signed_worker_delivery.phase,'SIGNED_WORKER_FAILURE_RECORDED');
 assert.equal(x.signed_worker_delivery.latest_worker_stage,
  'WORKER_RESPONSE_PUBLICATION');
});
test('started but missing bounded completion receipt is never marked successful',()=>{
 const x=projectOwnerIncidentChatBriefing({
  ownerId:owner,source,delivery:delivery('STARTED',10)
 });
 assert.equal(x.signed_worker_delivery.phase,
  'SIGNED_WORKER_STALLED_OR_FINAL_RECEIPT_MISSING');
});
test('a forged completed worker proof or cross-owner receipt is rejected',()=>{
 for(const broken of [
  {...delivery('COMPLETED'),owner_id:'00000000-0000-4000-8000-000000000000'},
  {...delivery('COMPLETED'),scheduler_success_alone_proves_execution:true},
  {...delivery('COMPLETED'),repair_executed_by_read:true},
  {...delivery('COMPLETED'),actual_worker_process_attested:false},
  {...delivery('COMPLETED'),installation_authorized:true}
 ]){
  assert.throws(()=>projectOwnerIncidentChatBriefing({
   ownerId:owner,source,delivery:broken
  }),/OPERATIONAL_CHAT_OWNER_INCIDENT_PROOF_REQUIRED/);
 }
});
test('the existing signed worker records start and all terminal responses without replacing the scheduler',()=>{
 const sql=read('supabase/migrations/20261117_signed_worker_actual_run_receipts_v1.sql');
 const worker=read('api/reality/governed-employee-shift-worker.js');
 const broker=read('src/reality-governed-shift-boundary-v1.js');
 const chat=read('src/reality-owner-operational-incident-chat-v1.js');
 const ui=read('reality-chat-operational-incident-briefing-v1.js');
 assert.match(sql,/create table if not exists reality_internal.signed_worker_actual_runs_v1/);
 assert.match(sql,/SIGNED_WORKER_RUN_DUPLICATE_OR_MISSING/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/revoke execute on function public.reality_record_signed_worker_actual_run_v1/);
 assert.match(worker,/actualWorkerRunId=crypto.randomUUID\(\)/);
 assert.match(worker,/SIGNED_WORKER_RUN_STARTED/);
 assert.match(worker,/}finally\{/);
 assert.match(worker,/p_status:result,p_stage:stage/);
 assert.match(broker,/record_signed_worker_actual_run_v1/);
 assert.match(chat,/read_owner_signed_worker_actual_runs_v1/);
 assert.match(ui,/signed_worker_delivery/);
 assert.doesNotMatch(sql,/cron\.schedule\(/);
});
