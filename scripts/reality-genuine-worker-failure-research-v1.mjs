// OpenAI is invoked ONLY through Reality's existing governed model gateway,
// on source-authenticated, owner-bound UNSOLVED worker failures. Suggestions
// are advisory. The Genuine Capability Engine alone may build after frozen RED.
import {readFileSync,writeFileSync} from 'node:fs';
import {invokeRealityModel} from '../src/reality-model-gateway-v0.1.js';
import {planOriginalJobRecovery} from '../src/reality-original-job-never-abandon-v1.js';
const evidence=JSON.parse(readFileSync('artifact/genuine-worker-failure-evidence.json','utf8'));
const modelHandoff={
 schema:'reality-genuine-worker-failure-governed-research-v1',
 observation_id:evidence.observation_id||null,
 original_work_id:evidence.original_work_id||null,
 provider_evidence_sha256:evidence.provider_evidence_sha256||null,
 research_status:'NO_MODEL_RESEARCH_REQUIRED',
 model_response_id:null,advisory_hypothesis:null,
 model_findings_are_hypotheses:true,
 frozen_missing_capability_verified:false,
 independent_repair_tests_passed:false,
 owner_installation_approval_granted:false,
 source_verified_for_new_capability:false,
 executable_patch_produced:false,
 new_customer_job_created:false,installation_authorized:false,
 original_job_completed:false,production_changed:false
};
if(evidence.schema!=='reality-genuine-worker-failure-evidence-v1'||
 evidence.model_invoked!==false||evidence.production_changed!==false||
 evidence.original_job_completed!==false||
 evidence.installation_authorized!==false)
 throw Error('GENUINE_RESEARCH_SIGNED_SOURCE_RECEIPT_INVALID');
// The diagnosis keeps the existing original-job responsibility visible.
 // A stored failure is never permission to create another customer job.
if(evidence.status==='SIGNED_WORKER_FAILURE_RECORDED'){
 modelHandoff.recovery_plan=planOriginalJobRecovery({observation:evidence});
}
if(evidence.status==='SIGNED_WORKER_FAILURE_RECORDED'&&
 evidence.finding==='SIGNED_FAILED_WORKER_NEEDS_INDEPENDENT_DIAGNOSIS'){
 if(!/^work:[a-f0-9]{32}$/.test(String(evidence.original_work_id||''))||
    !/^[a-f0-9]{64}$/.test(String(evidence.provider_evidence_sha256||''))||
    !Number.isSafeInteger(evidence.failed_run_id)||evidence.failed_run_id<1||
    !Number.isSafeInteger(evidence.failed_job_id)||evidence.failed_job_id<1||
    evidence.independent_github_readback!==true)
  throw Error('GENUINE_RESEARCH_SOURCE_PROOF_MISSING');
 if(typeof process.env.OPENAI_API_KEY!=='string'||
    process.env.OPENAI_API_KEY.length<20){
  modelHandoff.research_status='EXISTING_GOVERNED_OPENAI_PROVIDER_NOT_CONNECTED';
 }else try{
  const packetId='github-worker-failure:'+evidence.failed_run_id+':'+evidence.failed_job_id;
  const receipt='reality:signed-failure-observation:'+evidence.observation_id;
  const governedSignal={
   cleaner_version:'reality-signed-provider-intake-v1',
   packet:{packet_id:packetId,
    raw_content_digest:'sha256:'+evidence.provider_evidence_sha256},
   fragments:[{
    fragment_id:packetId+':failure',
    cleaned_text:'Reality signed worker failed to resume the authorized original job. Diagnose possible reasons and propose safe independent checks; do not retry an operation, approve an installation, or claim success.',
    intake_observation:{markers:{direct_action_cue_present:false,
      explicit_prohibition:true}}
   }],
   transformation_receipt:{receipt_id:receipt,meaning_change_claimed:false,
    source:'GITHUB_SIGNED_PROVIDER_JOB_AND_DURABLE_ORIGINAL_WORK'},
   lineage:{original_work_id:evidence.original_work_id,
    provider_run_id:evidence.failed_run_id,
    failed_job_id:evidence.failed_job_id,
    source_proof_sha256:evidence.provider_evidence_sha256,
    original_job_completed:false,production_changed:false}
  };
  const response=await invokeRealityModel({
   governedSignal,
   systemContext:{
    worker_recovery:{
     owner_goal_and_original_work_verified:true,
     source:'EXISTING_REALITY_GENUINE_CAPABILITY_ENGINE',
     original_work_id:evidence.original_work_id,
     provider_run_id:evidence.failed_run_id,
     failed_job_id:evidence.failed_job_id,
     provider_failure_proof_sha256:evidence.provider_evidence_sha256,
     failure_class:'SIGNED_WORKER_RESUME_STAGE_FAILED_ROOT_CAUSE_UNKNOWN',
     original_job_completed:false,
     frozen_capability_gap_verified:false,
     independent_tests_run_for_new_repair:false,
     installation_authorized:false,
     requested_analysis:'Give likely causes and bounded non-mutating verification tests. Do not assert the missing capability is proven. All code generation and installation must follow the existing owner-governed frozen acceptance lifecycle.'
    }},
   model:process.env.REALITY_REPAIR_MODEL||'gpt-5.6',
   apiKey:process.env.OPENAI_API_KEY,
   maxOutputTokens:450
  });
  if(response.authority_granted!==false||
      response.execution_authorized!==false||
      typeof response.answer!=='string'||response.answer.length>25000)
   throw Error('GENUINE_RESEARCH_MODEL_SCOPE_UNTRUSTED');
  modelHandoff.research_status='GOVERNED_OPENAI_HYPOTHESES_ONLY';
  modelHandoff.model_response_id=response.response_id||null;
  modelHandoff.advisory_hypothesis=response.answer.slice(0,6000);
 }catch{
  // A model outage never changes the original job, discards provider proof
  // or permits unattended code installation.
  modelHandoff.research_status='GOVERNED_MODEL_INVOCATION_UNAVAILABLE';
 }
}
writeFileSync('artifact/genuine-worker-failure-model-diagnosis.json',
 JSON.stringify(modelHandoff,null,2)+'\n');
console.log('REALITY_GOVERNED_FAILURE_RESEARCH_STATUS',JSON.stringify({
 original_work_id:modelHandoff.original_work_id,
 status:modelHandoff.research_status,
 model_response_recorded:Boolean(modelHandoff.model_response_id),
 independent_gap_verified:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false}));
