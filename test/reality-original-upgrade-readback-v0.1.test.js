import test from 'node:test';
import assert from 'node:assert/strict';
import {projectOriginalCapabilityReadiness,ORIGINAL_WORK}
 from '../src/reality-original-upgrade-readback-v0.1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const goal='goal:owner:original';
const hash='7ba3cc3273c2301c6902b6b3b3d6d0247e8b6abe0398467656e5e2ca93648128';
const branch='experiment/reality-live-durable-adversarial-20261025';
const github=()=>({pr156_merged:true,pr157_merged:true,current_executor_sha256:hash,
 successful_live_run:true,issue_number:143,issue_state:'open',
 issue_title:'Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures'});
const acceptance=()=>({entity_type:'personal_original_repair_owner_acceptance',
 epistemic_status:'VERIFIED',payload:{owner_id:owner,original_goal_id:goal,
 original_work_id:ORIGINAL_WORK,owner_confirmation:'ACCEPT_VERIFIED_CORRECTION_EVIDENCE_ONLY',
 owner_accepted_source_correction:true,github_write_authorized:false}});
const warrant=()=>({entity_type:'personal_upgrade_evidence_warrant',
 payload:{original_work_id:ORIGINAL_WORK,warrant:{owner_id:owner,promotion_authorized:false}}});
const registration=()=>({event_id:'registry:original',entity_type:'personal_original_executor_capability_registered',
 epistemic_status:'VERIFIED',payload:{owner_id:owner,original_goal_id:goal,original_work_id:ORIGINAL_WORK,
 source_sha256:hash,owner_confirmation:'ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY',
 target_branch:branch,runtime_activation_verified:true,registration_readback_verified:true}});
const settlement=()=>({event_id:'settlement:original',entity_type:'personal_original_job_final_settlement',
 epistemic_status:'VERIFIED',payload:{owner_id:owner,original_goal_id:goal,original_work_id:ORIGINAL_WORK,
 registration_receipt_id:'registry:original',
 outcome:'HISTORICAL_SOURCE_ALREADY_FIXED_INDEPENDENTLY_RECONCILED',
 original_job_completed:true,independently_verified:true,
 external_repair_performed_by_reality:false,original_issue_number:143}});
const project=(events,provider=github())=>projectOriginalCapabilityReadiness({
 events,github:provider,ownerId:owner,goalId:goal,
});
test('already merged capability without registry is NOT active or settled',()=>{
 const r=project([acceptance(),warrant()]);
 assert.equal(r.github_verified,true);
 assert.equal(r.preexisting_owner_evidence_acceptance_verified,true);
 assert.equal(r.prior_warrant_does_not_authorize_installation,true);
 assert.equal(r.owner_capability_registry_registered,false);
 assert.equal(r.full_original_job_completed,false);
 assert.equal(r.next_action,'AWAIT_EXPLICIT_OWNER_ACTIVATION_AND_DURABLE_REGISTRATION');
});
test('wrong owner or proposed receipt never counts',()=>{
 let wrong=registration();wrong.payload.owner_id='00000000-0000-4000-8000-000000000000';
 assert.equal(project([acceptance(),wrong]).owner_capability_registry_registered,false);
 assert.equal(project([{...registration(),epistemic_status:'CLAIMED'}]).owner_capability_registry_registered,false);
});
test('wrong source hash prevents activating code',()=>{
 let bad=registration();bad.payload.source_sha256='bad';
 assert.equal(project([acceptance(),bad]).owner_capability_registry_registered,false);
});
test('registered is separate from settled',()=>{
 const r=project([acceptance(),registration()]);
 assert.equal(r.owner_capability_registry_registered,true);
 assert.equal(r.full_original_job_completed,false);
 assert.equal(r.next_action,'RESUME_AND_DURABLY_SETTLE_ORIGINAL_JOB');
});
test('settlement must reference registered receipt',()=>{
 let wrong=settlement();wrong.payload.registration_receipt_id='other';
 assert.equal(project([acceptance(),registration(),wrong]).full_original_job_completed,false);
});
test('settlement cannot invent a Reality source repair',()=>{
 let wrong=settlement();wrong.payload.external_repair_performed_by_reality=true;
 assert.equal(project([acceptance(),registration(),wrong]).full_original_job_completed,false);
});
test('verified reconciled outcome may settle with matching receipt',()=>{
 const r=project([acceptance(),registration(),settlement()]);
 assert.equal(r.full_original_job_completed,true);
 assert.equal(r.next_action,'FINISHED_VERIFIED');
});
test('missing actual GitHub verification fails closed even with receipts',()=>{
 const provider=github();provider.current_executor_sha256='changed';
 const r=project([acceptance(),registration(),settlement()],provider);
 assert.equal(r.github_verified,false);
 assert.equal(r.full_original_job_completed,false);
 assert.equal(r.owner_capability_registry_registered,false);
 assert.equal(r.next_action,'RECHECK_LIVE_GITHUB_AND_INSTALLED_BYTES');
});
test('no owner evidence is never treated as approved installation',()=>{
 const r=project([]);
 assert.equal(r.preexisting_owner_evidence_acceptance_verified,false);
 assert.equal(r.approval_to_install_inferred,false);
 assert.equal(r.next_action,'SOURCE_ACCEPTANCE_REQUIRED');
});
test('reject missing authenticated scope inputs',()=>{
 assert.throws(()=>projectOriginalCapabilityReadiness({events:[],github:github()}),
  /ORIGINAL_UPGRADE_PROJECTION_INPUT_INVALID/);
});
