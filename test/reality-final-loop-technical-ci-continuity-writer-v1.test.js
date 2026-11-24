import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {attachVerifiedTechnicalCiToContinuity as attach}
 from '../src/reality-final-loop-technical-ci-continuity-writer-v1.js';
const sha=x=>'sha256:'+x.repeat(64);
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const root='36f0ad48-f391-549f-8622-66cd493977e7';
const work='work:315562fe1bd66b30a48bb9be4f1d162a';
const source='https://github.com/maloney2323/Reality/pull/307';
const head='ef66038297480f5da9444072e5e79f5c59b27184';
const release='d81f6c0e64360fc33d3d61668a2c84fc7c4e647b';
const run='12345678-1234-4123-8123-123456789abc';
const project='isolated-recovery';
const proposal={status:'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE',
 read_only:true,contract_candidate:{contract_id:sha('a'),owner_id:owner,
  shift_id:shift,continuity_root_id:root,obligation_id:work,
  source_ref:source,source_revision:head}};
const p={status:'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING',
 independent_technical_ci_verified:true,frozen_technical_red_verified:true,
 original_business_case_red_verified:false,
 business_original_warrant_verified:false,
 original_job_completed:false,production_changed:false,
 execution_authorized:false,contract_id:sha('a'),
 owner_id:owner,shift_id:shift,obligation_id:work,source_ref:source,
 source_revision:head,maintenance_id:'b7181e5b-a01c-4cb2-b191-10dea9dbe04f',
 github_artifact_digest:sha('b'),github_artifact_id:4562,
 github_run_id:1234,github_job_id:5678,
 github_release_sha:release,
 signed_case_spec_git_blob_sha:'a'.repeat(40),
 existing_diagnostic_receipt_sha256:sha('e')};
const db={strictSecrets:true,project};
const env={VERCEL_ENV:'preview',
 REALITY_FINAL_LOOP_PROOF_RECOVERY_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
 REALITY_SIGNED_WORKER_RELEASE_ATTESTATION_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:project,
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project};
const wake={status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift};
const signedRecovery={contract_id:sha('a'),contract_frozen:true,
 freeze_receipt_sha256:sha('f')};
const args={db,env,wake,workerRunId:run,contractProposal:proposal,
 signedRecovery,technicalCiProviderProof:p};
const read={
 status:'RECOVERY_TECHNICAL_CI_SOURCE_BOUND_OBSERVATION_RECORDED',
 contract_id:sha('a'),obligation_id:work,source_ref:source,
 source_revision:head,owner_id:owner,shift_id:shift,
 github_run_id:p.github_run_id,github_artifact_id:p.github_artifact_id,
 github_artifact_digest:p.github_artifact_digest,
 github_release_sha:release,
 observation_receipt_sha256:sha('d'),
 business_original_red_verified:false,original_job_completed:false,
 execution_authorized:false,production_changed:false
};
test('exact isolated signed worker stores external technical CI once then reconciles independent readback',async()=>{
 const seen=[];
 const r=await attach({...args,call:async(_db,method,payload)=>{
  seen.push({method,payload});
  if(method==='reality_read_final_loop_technical_ci_observation_v1')
   return seen.filter(x=>x.method===method).length===1?
    {status:'RECOVERY_TECHNICAL_CI_NOT_DURABLY_OBSERVED'}:read;
  if(method==='reality_record_final_loop_technical_ci_observation_v1')
   return {status:'RECOVERY_TECHNICAL_CI_OBSERVATION_ATOMICALLY_RECORDED',
    contract_id:sha('a'),obligation_id:work,
    github_artifact_digest:sha('b'),observation_receipt_sha256:sha('d'),
    business_original_red_verified:false,
    original_job_completed:false,execution_authorized:false};
  throw Error('unexpected '+method);
 }});
 assert.deepEqual(seen.map(x=>x.method),[
  'reality_read_final_loop_technical_ci_observation_v1',
  'reality_record_final_loop_technical_ci_observation_v1',
  'reality_read_final_loop_technical_ci_observation_v1']);
 assert.equal(seen[1].payload.p_proof.github_artifact_digest,sha('b'));
 assert.equal(r.status,'RECOVERY_TECH_CI_OBSERVATION_DURABLY_RECONCILED');
 assert.equal(r.technical_observation_recorded,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.original_business_red_verified,false);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.independent_next_action_executed,false);
});
test('existing exact receipt is idempotent: never issue another write',async()=>{
 const seen=[];
 const r=await attach({...args,call:async(_db,method)=>{
  seen.push(method);return read;
 }});
 assert.equal(r.status,'RECOVERY_TECH_CI_DURABLE_OBSERVATION_ALREADY_RECONCILED');
 assert.deepEqual(seen,['reality_read_final_loop_technical_ci_observation_v1']);
});
test('shared benchmark cannot write or attach a receipt',async()=>{
 let called=0;
 const r=await attach({...args,db:{strictSecrets:true,project:'hvkfreoagbrphwghjajw'},
  call:async()=>{called++;throw Error('do not call')}});
 assert.equal(called,0);
 assert.equal(r.status,'RECOVERY_TECH_CI_PROVIDER_PROOF_READY_ISOLATED_ATTESTATION_REQUIRED');
 assert.equal(r.technical_observation_recorded,false);
});
test('uncertain write never repeats and does not self-certify',async()=>{
 const seen=[];
 const r=await attach({...args,call:async(_db,method)=>{
  seen.push(method);
  if(method==='reality_read_final_loop_technical_ci_observation_v1')
   return {status:'RECOVERY_TECHNICAL_CI_NOT_DURABLY_OBSERVED'};
  throw Error('provider timeout after effect unknown');
 }});
 assert.equal(r.status,'RECOVERY_TECH_CI_WRITE_OUTCOME_UNCERTAIN_NO_REPLAY');
 assert.deepEqual(seen,['reality_read_final_loop_technical_ci_observation_v1',
  'reality_record_final_loop_technical_ci_observation_v1']);
 assert.equal(r.technical_observation_recorded,false);
 assert.equal(r.original_job_completed,false);
});
test('missing external proof, changed source and mutable owner response do not create a receipt',async()=>{
 const changes=[
  {technicalCiProviderProof:{...p,independent_technical_ci_verified:false}},
  {technicalCiProviderProof:{...p,source_ref:
   'https://github.com/maloney2323/Reality/pull/308'}},
  {technicalCiProviderProof:{...p,original_business_case_red_verified:true}},
  {technicalCiProviderProof:{...p,original_job_completed:true}},
  {signedRecovery:{...signedRecovery,contract_frozen:false}}
 ];
 for(const change of changes){
  let calls=0;
  const r=await attach({...args,...change,call:async()=>{
   calls++;throw Error('do not write')}});
  assert.equal(calls,0);
  assert.equal(r.technical_observation_recorded,false);
  assert.equal(r.original_job_completed,false);
 }
});
test('post-write conflicting provider artifact does not verify the attachment',async()=>{
 let n=0;
 const r=await attach({...args,call:async(_db,method)=>{
  if(method==='reality_read_final_loop_technical_ci_observation_v1')
   return ++n===1?{status:'RECOVERY_TECHNICAL_CI_NOT_DURABLY_OBSERVED'}:
    {...read,github_artifact_digest:sha('0')};
  return {status:'RECOVERY_TECHNICAL_CI_OBSERVATION_ATOMICALLY_RECORDED',
   contract_id:sha('a'),obligation_id:work,github_artifact_digest:sha('b'),
   observation_receipt_sha256:sha('d'),
   original_job_completed:false,execution_authorized:false,
   business_original_red_verified:false};
 }});
 assert.equal(r.status,'RECOVERY_TECH_CI_POSTWRITE_READBACK_MISMATCH');
 assert.equal(r.technical_observation_recorded,false);
});
test('new isolated SQL observation schema is service-only, source-bound, and no business-RED promotion',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261124041000_final_loop_technical_ci_continuity_observation_v1.sql',
  import.meta.url),'utf8');
 for(const expected of [
  'final_loop_recovery_contracts_v1(contract_id)',
  'final_loop_technical_ci_observations_v1',
  'reality_read_final_loop_technical_ci_observation_v1',
  'reality_record_final_loop_technical_ci_observation_v1',
  'owner_internal_maintenance_jobs_v1',
  'signed_maintenance_executor_claims_v1',
  'signed_worker_actual_runs_v1','final_loop_pr_source_plans_v1',
  'reality_read_current_final_loop_proof_envelope_v1',
  'reality_read_final_loop_shared_continuity_guard_v1',
  'current_user<>\'service_role\'',
  'original_business_red_proven=false','ENABLE ROW LEVEL SECURITY'])
  assert.ok(sql.includes(expected),expected);
 assert.doesNotMatch(sql,/GRANT EXECUTE ON FUNCTION[^;]+TO authenticated/is);
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/attachVerifiedTechnicalCiToContinuity/);
 assert.match(worker,/final_loop_technical_ci_continuity_attachment:finalLoopTechnicalCiContinuityAttachment/);
});
