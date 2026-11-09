import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessRealityNativeBatchReadiness,diagnoseRealityNativeCapabilityGap}
 from '../src/reality-riley-native-batch-readiness-v1.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const work='work:873a6e74fd14c6beacc9042dd8021dfc';
const source='https://github.com/maloney2323/Reality/issues/263';
const hash='sha256:'+'a'.repeat(64);
const p={status:'EXACT_NATIVE_ENGINEERING_PATCH_INDEPENDENTLY_TESTED_REVIEW_ONLY',
 original_work_id:work,shift_id:shift,owner_id:owner,source_ref:source,
 source_proof_sha256:hash,
 candidate_commit_sha:'e44ee294f21c73803a2bcdb5a9cb487f0f80fc85',
 candidate_artifact_sha256:'sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48',
 independent_passing_run_id:42525028367,
 provenance:'CHATGPT_REVIEWED_ENGINEERING_PATCH_AFTER_REJECTED_MODEL_DRAFT',
 native_install_to_settlement_accepted:false,
 owner_approval_ready:false,installation_authorized:false,
 original_job_completed:false,production_changed:false};
const job=(i,src,kind,phase,original=null)=>({
 source_step_index:i,source_ref:src,original_kind:kind,phase,
 original_work_id:original,source_proof_sha256:hash,
 independent_source_proof_verified:true
});
const graph={
 status:'UNIFIED_OWNER_JOB_CONTROL_READY',shift_id:shift,owner_id:owner,
 plan_fingerprint:'sha256:'+'f'.repeat(64),
 installation_authorized:false,production_changed:false,
 jobs:[
  job(2,source,'REAL_ENGINEERING_REPAIR_ORIGINAL',
   'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',work),
  job(3,'https://github.com/maloney2323/Reality/issues/185',
   'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL','NOT_ADMITTED'),
  job(4,'https://github.com/maloney2323/Reality/pull/57',
   'REAL_PR_REVIEW_ORIGINAL','PREPARED','work:'+'c'.repeat(32)),
  job(5,'https://github.com/maloney2323/Reality/issues/62',
   'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL','NOT_ADMITTED')
 ]};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
test('whole batch recognizes one verified reviewed candidate but never treats four source checks as completion',()=>{
 const r=assessRealityNativeBatchReadiness({graph,reviewedPatch:p,env});
 assert.equal(r.status,'OWNER_SHIFT_EVIDENCE_VERIFIED_INSTALL_AND_FINAL_RECEIPTS_BLOCKED');
 assert.equal(r.shift_id,shift);assert.equal(r.owner_id,owner);
 assert.equal(r.native_reviewed_candidate_verified,true);
 assert.equal(r.exact_original_count,2);
 assert.equal(r.source_tasks_inspected,4);
 assert.deepEqual(r.blockers,[
  'PREVIEW_GITHUB_WRITER_CREDENTIAL_MISSING',
  'PREVIEW_VERCEL_DEPLOY_CREDENTIAL_MISSING',
  'NATIVE_EXACT_APPROVAL_TO_ISOLATED_INSTALL_NOT_PROVEN',
  'NATIVE_POSTINSTALL_SAME_ORIGINAL_RESUME_NOT_PROVEN',
  'OTHER_SELECTED_JOBS_NOT_INDEPENDENTLY_SETTLED'
 ]);
 assert.equal(r.ready_for_new_install_approval,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.new_shift_required,false);
});
test('a configured token is never treated as proven GitHub write or provider installation authority',()=>{
 const r=assessRealityNativeBatchReadiness({graph,reviewedPatch:p,
  env:{...env,REALITY_GITHUB_TOKEN:'fake-preview-only-credential123',
   REALITY_NATIVE_VERCEL_DEPLOY_TOKEN:'fake-preview-deploy-credential123'}});
 assert.equal(r.provider_credentials_configured_only.github,true);
 assert.equal(r.provider_credentials_configured_only.vercel,true);
 assert.equal(r.provider_credentials_configured_only.verified_write_permission,false);
 assert.equal(r.provider_credentials_configured_only.verified_deployment_permission,false);
 assert.equal(r.ready_for_new_install_approval,false);
 assert.ok(r.blockers.includes('NATIVE_POSTINSTALL_SAME_ORIGINAL_RESUME_NOT_PROVEN'));
});
test('a production token cannot silently satisfy the isolated preview credential gate',()=>{
 const r=assessRealityNativeBatchReadiness({graph,reviewedPatch:p,
  env:{...env,VERCEL_ENV:'production',
   REALITY_GITHUB_TOKEN:'fake-production-credential123456',
   REALITY_NATIVE_VERCEL_DEPLOY_TOKEN:'fake-production-deploy-credential123456'}});
 assert.equal(r.provider_credentials_configured_only.github,false);
 assert.ok(r.blockers.includes('PREVIEW_GITHUB_WRITER_CREDENTIAL_MISSING'));
 assert.equal(r.ready_for_new_install_approval,false);
});
test('source hash, original owner, exact reviewed artifact and candidate commit cannot drift',()=>{
 for(const candidate of [
  {...p,owner_id:'11111111-2222-4333-8444-555555555555'},
  {...p,source_proof_sha256:'sha256:'+'b'.repeat(64)},
  {...p,original_work_id:'work:'+'d'.repeat(32)},
  {...p,candidate_commit_sha:'not-a-sha'},
  {...p,installation_authorized:true}
 ]){
  assert.throws(()=>assessRealityNativeBatchReadiness({
   graph,reviewedPatch:candidate,env
  }),/REALITY_NATIVE_BATCH_READINESS_REVIEWED_CANDIDATE_OWNER_SOURCE_PROOF_MISMATCH/);
 }
});
test('duplicate sources and unverifiable status fail closed without installation or batch replay',()=>{
 const bad={...graph,jobs:[...graph.jobs.slice(0,3),
  {...graph.jobs[3],source_ref:graph.jobs[0].source_ref}]};
 assert.throws(()=>assessRealityNativeBatchReadiness({
  graph:bad,reviewedPatch:p,env
 }),/SOURCE_BOUND_WORK_NOT_INDEPENDENTLY_ADMITTED/);
 const x=assessRealityNativeBatchReadiness({
  graph:{status:'NO_CURRENT_AUTHORIZED_WORK'},reviewedPatch:null,env
 });
 assert.equal(x.status,'NO_CURRENT_SIGNED_SHIFT');
 assert.equal(x.new_shift_required,false);
 assert.equal(x.ready_for_new_install_approval,false);
});
test('owner GET includes one verified exact native preview readiness, no approval mutation',()=>{
 const api=readFileSync(new URL(
  '../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(api,/assessRealityNativeBatchReadiness/);
 assert.match(api,/reviewedPatch:riley_native_reviewed_patch/);
 assert.match(api,/riley_native_batch_readiness,/);
 assert.match(api,/native_install_to_settlement_accepted:false/);
 assert.doesNotMatch(api,/reality_owner_approve_current_riley_native_patch_v1/);
 assert.doesNotMatch(worker,/automaticallyInstallRileyWithoutOwnerApproval/);
});
test('Reality itself identifies missing native model-tool bridge without minting permissions',()=>{
 const diagnosis=diagnoseRealityNativeCapabilityGap({graph,env:{
  ...env,REALITY_OPENAI_MODEL:'gpt-4.1-mini'}});
 assert.equal(diagnosis.status,
  'TESTED_NATIVE_REPAIR_NEEDS_GOVERNED_MODEL_TOOL_HANDOFF');
 assert.equal(diagnosis.source_original_work_id,work);
 assert.equal(diagnosis.shift_id,shift);
 assert.equal(diagnosis.shift_role_model_mode,'ADVISORY_ONLY_NO_TOOLS');
 assert.equal(diagnosis.native_signed_tool_session_independently_verified,false);
 assert.equal(diagnosis.governed_tool_session_model_compatible_configured,false);
 assert.ok(diagnosis.blockers.includes(
  'CONFIGURED_MODEL_NOT_ELIGIBLE_FOR_GOVERNED_TOOL_SESSION'));
 assert.equal(diagnosis.automatic_installation_attempted,false);
 assert.equal(diagnosis.original_job_completed,false);
 assert.equal(diagnosis.new_shift_required,false);
 const readiness=assessRealityNativeBatchReadiness({
  graph,reviewedPatch:p,env:{...env,REALITY_OPENAI_MODEL:'gpt-4.1-mini'}
 });
 assert.equal(readiness.capability_handoff_diagnosis.source_original_work_id,work);
 assert.equal(readiness.ready_for_new_install_approval,false);
});
test('Reality distinguishes eligible model selection from proven signed tool execution',()=>{
 const x=diagnoseRealityNativeCapabilityGap({
  graph,env:{...env,REALITY_OPENAI_MODEL:'gpt-5.4'}});
 assert.equal(x.governed_tool_session_model_compatible_configured,true);
 assert.equal(x.native_signed_tool_session_independently_verified,false);
 assert.ok(x.blockers.includes(
  'NATIVE_ORIGINAL_TO_SIGNED_CAPABILITY_SESSION_NOT_VERIFIED'));
 assert.equal(x.installation_authorized,false);
 const y=diagnoseRealityNativeCapabilityGap({
  graph:{status:'NO_CURRENT_AUTHORIZED_WORK'},env});
 assert.equal(y.status,'NO_VERIFIED_NATIVE_ORIGINAL_CAPABILITY_DIAGNOSIS');
 assert.equal(y.source_original_work_id,null);
 assert.equal(y.new_shift_required,false);
});
test('the actual worker reports capability self-diagnosis on each wake',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/diagnoseRealityNativeCapabilityGap\(/);
 assert.match(worker,/native_capability_handoff_diagnosis:nativeCapabilityDiagnosis/);
 assert.match(worker,/RILEY_NATIVE_CAPABILITY_HANDOFF_NOT_CONNECTED/);
 assert.doesNotMatch(worker,/automaticallyInstallRileyWithoutOwnerApproval/);
});
