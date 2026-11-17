import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requalifyOneChangedEmployeeSource}
 from '../src/reality-qualified-source-requalification-v1.js';
const uid={
 owner:'11111111-2222-4333-8444-555555555555',
 shift:'22222222-3333-4444-8555-666666666666',
 worker:'33333333-4444-4555-8666-777777777777',
 job:'44444444-5555-4666-8777-888888888888',
 lease:'55555555-6666-4777-8888-999999999999'
};
const ref='https://github.com/maloney2323/Reality/pull/308';
const sha=c=>'sha256:'+c.repeat(64);
const db={strictSecrets:true,secretKey:'test',project:'preview'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'preview'};
const claim={
 status:'CHANGED_QUALIFIED_SOURCE_SIGNED_REQUALIFICATION_CLAIMED',
 job_id:uid.job,owner_id:uid.owner,shift_id:uid.shift,
 employee:'Casey',source_ref:ref,
 claim_id:uid.lease,worker_run_id:uid.worker,
 original_title:'Source review',
 original_source_updated_at:'2026-11-17T15:30:00Z',
 first_source_sha256:sha('a'),changed_review_sha256:sha('b'),
 original_independent_receipt_sha256:sha('c'),
 requalification_attempts_remaining:1,
 installation_authorized:false,production_changed:false,
 original_customer_job_completed:false
};
const source={
 source_ref:ref,source_title:'Source review',
 provider_updated_at:'2026-11-17T15:45:00Z',
 checked_at:'2026-11-17T16:41:00Z',
 provider_proof_sha256:sha('b')
};
const receipt={
 status:'SAME_QUALIFIED_EVIDENCE_JOB_REQUALIFIED',
 job_id:uid.job,owner_id:uid.owner,shift_id:uid.shift,
 requalification_receipt_sha256:sha('d'),
 original_failed_receipt_preserved:true,
 execution_authorized_by_existing_shift:true,
 independent_final_verification_required:true,
 installation_authorized:false,production_changed:false,
 original_customer_job_completed:false
};
test('same existing qualified job requalifies only with third stable current source proof',async()=>{
 const calls=[];
 const call=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_changed_qualified_evidence_source_v1')return claim;
  if(name==='reality_record_changed_qualified_evidence_source_v1')return receipt;
  throw Error('UNKNOWN_RPC_'+name);
 };
 const r=await requalifyOneChangedEmployeeSource({
  db,env,shiftId:uid.shift,workerRunId:uid.worker,call,
  readSource:async()=>source,
  fetchImpl:async()=>{throw Error('NO_NETWORK')}
 });
 assert.equal(r.status,'SAME_QUALIFIED_EVIDENCE_JOB_REQUALIFIED');
 assert.equal(r.job_id,uid.job);
 assert.equal(r.old_failed_receipt_preserved,true);
 assert.equal(r.independent_final_verification_required,true);
 assert.equal(r.original_customer_job_completed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.code_self_repair_proven,false);
 assert.deepEqual(calls.map(x=>x.name),[
  'reality_claim_changed_qualified_evidence_source_v1',
  'reality_record_changed_qualified_evidence_source_v1'
 ]);
 assert.equal(calls[1].args.p_current_provider_sha256,sha('b'));
 assert.equal(calls[1].args.p_job_id,uid.job);
});
test('source changed again never qualifies, installs or settles same job',async()=>{
 const call=async(_db,name)=>{
  if(name==='reality_claim_changed_qualified_evidence_source_v1')return claim;
  if(name==='reality_record_changed_qualified_evidence_source_v1')return {
   status:'CHANGED_SOURCE_REQUALIFICATION_NOT_STABLE',job_id:uid.job,
   installation_authorized:false,production_changed:false,
   original_customer_job_completed:false
  };
  throw Error('FORBIDDEN');
 };
 const r=await requalifyOneChangedEmployeeSource({
  db,env,shiftId:uid.shift,workerRunId:uid.worker,call,
  readSource:async()=>({...source,provider_proof_sha256:sha('e')}),
  fetchImpl:async()=>{throw Error('NO_NETWORK')}
 });
 assert.equal(r.status,'CHANGED_SOURCE_REQUALIFICATION_NOT_STABLE');
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_customer_job_completed,false);
 assert.equal(r.code_self_repair_proven,false);
});
test('no changed source never triggers provider read',async()=>{
 const r=await requalifyOneChangedEmployeeSource({
  db,env,shiftId:uid.shift,workerRunId:uid.worker,
  call:async(_db,name)=>({
   status:'NO_CHANGED_SOURCE_REQUALIFICATION_READY',
   installation_authorized:false,production_changed:false
  }),
  readSource:()=>{throw Error('MUST_NOT_REOBSERVE');},
  fetchImpl:async()=>{throw Error('MUST_NOT_NETWORK')}
 });
 assert.equal(r.requalification_performed,false);
 assert.equal(r.code_self_repair_proven,false);
});
test('forged owner, authority, digest and worker identities are rejected',async()=>{
 const forged=[
  {...claim,owner_id:'forged'}, {...claim,installation_authorized:true},
  {...claim,first_source_sha256:claim.changed_review_sha256},
  {...claim,worker_run_id:'66666666-7777-4888-8999-aaaaaaaaaaaa'},
  {...claim,original_independent_receipt_sha256:'invalid'}
 ];
 for(const x of forged)
 await assert.rejects(requalifyOneChangedEmployeeSource({
  db,env,shiftId:uid.shift,workerRunId:uid.worker,
  call:async()=>x,
  readSource:()=>{throw Error('MUST_NOT_READ')},
  fetchImpl:()=>{throw Error('MUST_NOT_NETWORK')}
 }),/SAME_JOB_CHANGED_SOURCE_REQUALIFICATION_EXACT_FAILED_SOURCE_AND_WARRANT_REQUIRED/);
});
test('provider is unavailable: original failure remains blocked',async()=>{
 const r=await requalifyOneChangedEmployeeSource({
  db,env,shiftId:uid.shift,workerRunId:uid.worker,
  call:async()=>claim,readSource:async()=>{throw Error('OFFLINE');},
  fetchImpl:async()=>{throw Error('OFFLINE')}
 });
 assert.equal(r.status,'CHANGED_SOURCE_REQUALIFICATION_PROVIDER_BLOCKED');
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_customer_job_completed,false);
});
test('DB preserves old failed SHA in immutable history and enforces bounded signed route',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const sql=read('supabase/migrations/20261117_qualified_source_change_requalification_v1.sql');
 const readback=read('supabase/migrations/20261117_qualified_source_change_owner_readback_v2.sql');
 const worker=read('api/reality/governed-employee-shift-worker.js');
 const broker=read('src/reality-governed-shift-boundary-v1.js');
 assert.match(sql,/qualified_evidence_source_change_history_v1/);
 assert.match(sql,/original_independent_sha256 text not null/);
 assert.match(sql,/unique|job_id uuid primary key/);
 assert.match(sql,/p_current_provider_sha256<>job.reviewed_source_sha256/);
 assert.match(sql,/recovery_attempts=0/);
 assert.match(sql,/recovery_attempts=1/);
 assert.match(sql,/last_failure_reason='CURRENT_GITHUB_SOURCE_CHANGED_BETWEEN_SIGNED_WORKERS'/);
 assert.match(sql,/reconcile_stale_source_requalification_v1/);
 assert.match(sql,/revoke all on function public.reality_record_changed_qualified_evidence_source_v1/);
 assert.match(readback,/REQUALIFICATION_CLAIMED/);
 assert.match(readback,/recovery_receipt_sha256/);
 assert.match(worker,/requalifyOneChangedEmployeeSource/);
 assert.match(worker,/changed_source_same_job_requalification:changedSourceRequalification/);
 assert.match(broker,/claim_changed_qualified_evidence_source_v1/);
 assert.match(broker,/record_changed_qualified_evidence_source_v1/);
 assert.doesNotMatch(sql,/cron\.schedule\(/);
});
