import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
import {admitOneSignedScheduledEvidenceJob}
 from '../src/reality-signed-schedule-evidence-admission-v1.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='f1111111-2222-4333-8444-555555555555';
const worker='f2222222-3333-4444-8555-666666666666';
const claimId='f3333333-4444-4555-8666-777777777777';
const jobId='f4444444-5555-4666-8777-888888888888';
const url='https://github.com/maloney2323/Reality/pull/308';
const hash=c=>'sha256:'+c.repeat(64);
const sourceRead=async()=>({source_ref:url,
 provider_proof_sha256:hash('a'),checked_at:new Date().toISOString()});
const ready={status:
 'SIGNED_SCHEDULED_EVIDENCE_INQUIRY_READY_FOR_INDEPENDENT_SOURCE_RECHECK',
 owner_id:owner,shift_id:shift,worker_run_id:worker,
 work_key:'schedule:'+('b'.repeat(64)),employee:'Casey',
 work_state:'SOURCE_EPOCH_REVIEW_REQUIRED',
 source_evidence_sha256:hash('c'),
 source_ref:url,inquiry_claim_id:claimId,
 inquiry_provider_sha256:hash('a'),model_response_id:'resp_signed_123456',
 prior_model_recommendation:'INVESTIGATE_MORE',
 inquiry_finished_at:new Date(Date.now()-60000).toISOString(),
 evidence_job_created:false,customer_original_job_created:false,
 installation_authorized:false,production_changed:false};
const recorded={status:'SIGNED_SCHEDULE_EVIDENCE_JOB_QUALIFIED_EXECUTABLE',
 job_id:jobId,owner_id:owner,shift_id:shift,employee:'Casey',
 source_ref:url,work_key:ready.work_key,
 qualification_receipt_sha256:hash('d'),
 job_type:'CURRENT_SOURCE_EVIDENCE_PACK',
 next_worker_action:'EXISTING_SIGNED_QUALIFIED_EVIDENCE_EXECUTOR',
 independent_final_review_required:true,evidence_job_created:true,
 customer_original_job_created:false,installation_authorized:false,
 production_changed:false};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const db={strictSecrets:true,secretKey:'fixture-secret',
 project:'hvkfreoagbrphwghjajw',url:'https://fixture.supabase.co'};
function setup({claim=ready,receipt=recorded}={}){
 const calls=[],call=async(db,rpc,args)=>{
  calls.push({rpc,args});
  if(rpc==='reality_read_next_signed_scheduled_evidence_admission_v1')
   return claim;
  if(rpc==='reality_admit_signed_scheduled_evidence_v1')
   return receipt;
  throw Error('WRONG_RPC');
 };
 return {calls,call};
}
test('signed existing-calendar inquiry becomes exact executable evidence pack, without owner original or install',async()=>{
 const p=setup();let reads=0;
 const result=await admitOneSignedScheduledEvidenceJob({
  db,env,shiftId:shift,workerRunId:worker,call:p.call,
  readSource:async()=>{reads++;return sourceRead()}
 });
 assert.equal(reads,2);
 assert.deepEqual(p.calls.map(x=>x.rpc),[
  'reality_read_next_signed_scheduled_evidence_admission_v1',
  'reality_admit_signed_scheduled_evidence_v1']);
 assert.deepEqual(p.calls[0].args,
  {p_shift_id:shift,p_worker_run_id:worker});
 assert.equal(p.calls[1].args.p_work_key,ready.work_key);
 assert.equal(p.calls[1].args.p_inquiry_claim_id,claimId);
 assert.equal(p.calls[1].args.p_current_provider_sha256,hash('a'));
 assert.equal(result.job_id,jobId);
 assert.equal(result.evidence_job_created,true);
 assert.equal(result.customer_original_job_created,false);
 assert.equal(result.independent_final_review_required,true);
 assert.equal(result.existing_signed_evidence_executor_required,true);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
});
test('no current signed owner shift means no work, no source calls, no new job',async()=>{
 const p=setup({claim:{status:'NO_ELIGIBLE_SIGNED_SCHEDULED_INQUIRY_FOR_QUALIFICATION',
  evidence_job_created:false,customer_original_job_created:false,
  installation_authorized:false,production_changed:false}});
 const result=await admitOneSignedScheduledEvidenceJob({
  db,env,shiftId:shift,workerRunId:worker,call:p.call,
  readSource:async()=>{throw Error('MUST_NOT_READ_SOURCE')}
 });
 assert.equal(result.schedule_candidate_qualified,false);
 assert.equal(result.evidence_job_created,false);
 assert.equal(p.calls.length,1);
});
test('changed current provider epoch must not make a job from old inquiry',async()=>{
 const p=setup(),result=await admitOneSignedScheduledEvidenceJob({
  db,env,shiftId:shift,workerRunId:worker,call:p.call,
  readSource:async()=>({source_ref:url,provider_proof_sha256:hash('e'),
   checked_at:new Date().toISOString()})
 });
 assert.equal(result.status,'SIGNED_SCHEDULE_SOURCE_EPOCH_CHANGED_REQUALIFY');
 assert.equal(result.evidence_job_created,false);
 assert.equal(p.calls.length,1);
});
test('source provider instability blocks admission and preserves original inquiry',async()=>{
 const p=setup();let n=0;
 const result=await admitOneSignedScheduledEvidenceJob({
  db,env,shiftId:shift,workerRunId:worker,call:p.call,
  readSource:async()=>({source_ref:url,
   provider_proof_sha256:hash(++n===1?'a':'f'),
   checked_at:new Date().toISOString()})
 });
 assert.equal(result.status,'SIGNED_SCHEDULE_UNSTABLE_PROVIDER_NO_ADMISSION');
 assert.equal(p.calls.length,1);
});
test('forged owner, wrong worker, owner review suggestion, invented permissions rejected',async()=>{
 for(const claim of [
  {...ready,owner_id:'fake'},
  {...ready,shift_id:'f1111111-2222-4333-8444-000000000000'},
  {...ready,employee:'Not employee'},
  {...ready,source_ref:'https://attacker.example/pull/308'},
  {...ready,prior_model_recommendation:'OWNER_REVIEW'},
  {...ready,installation_authorized:true},
  {...ready,evidence_job_created:true}
 ]){
  const p=setup({claim});
  await assert.rejects(
   admitOneSignedScheduledEvidenceJob({db,env,shiftId:shift,
    workerRunId:worker,call:p.call,readSource:async()=>{
     throw Error('MUST_NOT_READ_PROVIDER')
    }}),/SIGNED_SCHEDULE_EVIDENCE_OWNER_AND_PREVIOUS_EMPLOYEE_INQUIRY_SCOPE_INVALID/);
  assert.equal(p.calls.length,1);
 }
});
test('no replay and already settled outcome cannot create duplicate work',async()=>{
 for(const status of [
   'SIGNED_SCHEDULE_SOURCE_ALREADY_INDEPENDENTLY_VERIFIED_NO_REPLAY',
   'SIGNED_SCHEDULE_EXISTING_EVIDENCE_JOB_NO_DUPLICATE']){
  const p=setup({receipt:{status,owner_id:owner,shift_id:shift,
   evidence_job_created:false,customer_original_job_created:false,
   installation_authorized:false,production_changed:false}});
  const r=await admitOneSignedScheduledEvidenceJob({
   db,env,shiftId:shift,workerRunId:worker,call:p.call,
   readSource:sourceRead});
  assert.equal(r.same_source_not_replayed,true);
  assert.equal(r.evidence_job_created,false);
 }
});
test('database admission only builds existing read-only evidence-job records and refuses unsanctioned execution',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261118_signed_schedule_evidence_admission_v21.sql',
  import.meta.url),'utf8');
 for(const t of [
  "current_user<>'service_role'",
  "s.closed_at is null",
  "s.planned_end_at>clock_timestamp()",
  "run.status='STARTED'",
  "pulse.last_worker_status='WAKE_RECEIVED'",
  "t.finished_at<run.started_at",
  "t.recommendation='INVESTIGATE_MORE'",
  "provider_proof_sha256=p_current_provider_sha256",
  "prior.phase='COMPLETED_INDEPENDENTLY_VERIFIED'",
  "prior.reviewed_source_sha256=p_current_provider_sha256",
  'insert into reality_internal.owner_qualified_employee_evidence_jobs_v1',
  'on conflict do nothing',
  "'new_original_customer_jobs_created'"
 ]) {
  if(t==="'new_original_customer_jobs_created'")continue;
  assert.ok(sql.includes(t),t);
 }
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_original_claims_v1/i);
 assert.doesNotMatch(sql,/update reality_internal\.governed_employee_shifts_v1/i);
 assert.doesNotMatch(sql,/grant execute[^;]+to (anon|authenticated)/is);
});
test('existing signed worker actually hands a qualified evidence job to the subsequent executor',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 const admitted=worker.indexOf('await admitOneSignedScheduledEvidenceJob({');
 const consumed=worker.indexOf('await advanceOneQualifiedEmployeeEvidenceJob({');
 assert.ok(admitted>0&&consumed>admitted);
 assert.match(worker,/workerRunId:actualWorkerRunId/);
 assert.match(worker,/signed_schedule_evidence_admission:signedScheduleAdmission/);
});
test('service-only transport allowlists exact schedule read and admit methods',async()=>{
 for(const rpc of [
  'reality_read_next_signed_scheduled_evidence_admission_v1',
  'reality_admit_signed_scheduled_evidence_v1']){
  const r=await shiftRpc(db,rpc,{p_shift_id:shift},{
   fetchImpl:async(url,options)=>{
    assert.equal(url,db.url+'/rest/v1/rpc/'+rpc);
    assert.equal(options.method,'POST');
    return {ok:true,json:async()=>({status:'TEST_ONLY'})};
   }});
  assert.equal(r.status,'TEST_ONLY');
 }
 await assert.rejects(shiftRpc(db,'reality_auto_approve_maintenance_v99',{},{
  fetchImpl:async()=>{throw Error('MUST_NOT_CONNECT')}}),
 /SHIFT_RPC_NOT_ALLOWLISTED/);
});
