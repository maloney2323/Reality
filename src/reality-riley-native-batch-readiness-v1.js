// Reality owner shift readiness gate: one evidence-bound view across ALL
// selected jobs. It never creates work, approval, capability or settlement.
// A tested source patch is not a verified install+resumption protocol.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA256=/^sha256:[a-f0-9]{64}$/;
const SHA40=/^[a-f0-9]{40}$/;
const REPO=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9]\d*$/;
const NO={
 owner_approval_ready:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 new_shift_required:false
};
const fail=s=>{throw Error('REALITY_NATIVE_BATCH_READINESS_'+s)};
const credential=v=>typeof v==='string'&&v.length>=20&&v.length<=4096;
export function assessRealityNativeBatchReadiness({
 graph,reviewedPatch,env={},expectedProject='hvkfreoagbrphwghjajw'
}={}){
 if(graph?.status==='NO_CURRENT_AUTHORIZED_WORK'){
  return Object.freeze({...NO,status:'NO_CURRENT_SIGNED_SHIFT',
   blockers:Object.freeze(['NO_CURRENT_OWNER_AUTHORIZED_BATCH']),
   jobs:Object.freeze([]),exact_original_count:0,
   source_tasks_inspected:0,ready_for_new_install_approval:false});
 }
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    !UUID.test(graph.shift_id||'')||!UUID.test(graph.owner_id||'')||
    !SHA256.test(graph.plan_fingerprint||'')||
    graph.installation_authorized!==false||
    graph.production_changed!==false||
    !Array.isArray(graph.jobs)||graph.jobs.length<1||graph.jobs.length>4)
  fail('CURRENT_OWNER_FROZEN_WORK_GRAPH_REQUIRED');
 const seen=new Set(),jobs=[];
 for(const job of graph.jobs){
  if(!REPO.test(job?.source_ref||'')||seen.has(job.source_ref)||
    !Number.isInteger(job.source_step_index)||
    job.source_step_index<2||job.source_step_index>5||
    typeof job.original_kind!=='string'||typeof job.phase!=='string'||
    job.independent_source_proof_verified!==true||
    !SHA256.test(job.source_proof_sha256||''))
   fail('SOURCE_BOUND_WORK_NOT_INDEPENDENTLY_ADMITTED');
  seen.add(job.source_ref);
  if(job.original_work_id!=null&&!WORK.test(job.original_work_id))
   fail('INVALID_ORIGINAL_ID');
  jobs.push(Object.freeze({source_ref:job.source_ref,
   original_work_id:job.original_work_id??null,
   original_kind:job.original_kind,phase:job.phase}));
 }
 const engineering=graph.jobs.filter(j=>
  j.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL');
 if(engineering.length>1)fail('DUPLICATE_ENGINEERING_ORIGINAL');
 const reviewed=engineering.length===1&&
  engineering[0].phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'&&
  reviewedPatch?.status===
   'EXACT_NATIVE_ENGINEERING_PATCH_INDEPENDENTLY_TESTED_REVIEW_ONLY'&&
  reviewedPatch.owner_id===graph.owner_id&&
  reviewedPatch.shift_id===graph.shift_id&&
  reviewedPatch.original_work_id===engineering[0].original_work_id&&
  reviewedPatch.source_ref===engineering[0].source_ref&&
  reviewedPatch.source_proof_sha256===engineering[0].source_proof_sha256&&
  reviewedPatch.provenance===
   'CHATGPT_REVIEWED_ENGINEERING_PATCH_AFTER_REJECTED_MODEL_DRAFT'&&
  SHA40.test(reviewedPatch.candidate_commit_sha||'')&&
  SHA256.test(reviewedPatch.candidate_artifact_sha256||'')&&
  Number.isSafeInteger(reviewedPatch.independent_passing_run_id)&&
  reviewedPatch.independent_passing_run_id>10000&&
  reviewedPatch.owner_approval_ready===false&&
  reviewedPatch.native_install_to_settlement_accepted===false&&
  reviewedPatch.installation_authorized===false&&
  reviewedPatch.original_job_completed===false&&
  reviewedPatch.production_changed===false;
 if(reviewedPatch?.status==='EXACT_NATIVE_ENGINEERING_PATCH_INDEPENDENTLY_TESTED_REVIEW_ONLY'&&!reviewed)
  fail('REVIEWED_CANDIDATE_OWNER_SOURCE_PROOF_MISMATCH');
 // The worker can only use PREVIEW-scoped provider credentials. A production
 // token must never be copied, inferred from the connected account, or used
 // to make a preview job appear executable.
 const previewScope=env.VERCEL_ENV==='preview'&&
  env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF===expectedProject;
 const githubConfigured=previewScope&&credential(env.REALITY_GITHUB_TOKEN);
 const vercelConfigured=previewScope&&credential(env.REALITY_NATIVE_VERCEL_DEPLOY_TOKEN);
 const blockers=[];
 if(!reviewed)blockers.push('NATIVE_INDEPENDENT_TESTED_CANDIDATE_NOT_CURRENT');
 if(!githubConfigured)blockers.push('PREVIEW_GITHUB_WRITER_CREDENTIAL_MISSING');
 if(!vercelConfigured)blockers.push('PREVIEW_VERCEL_DEPLOY_CREDENTIAL_MISSING');
 // IMPORTANT: token configuration by itself NEVER proves permission to push,
 // deploy, install, or settle. The native exact-approval/installer and
 // independently resumed-original protocol must be verified live before
 // this gate can open. Do not replace these with feature flags.
 blockers.push('NATIVE_EXACT_APPROVAL_TO_ISOLATED_INSTALL_NOT_PROVEN');
 blockers.push('NATIVE_POSTINSTALL_SAME_ORIGINAL_RESUME_NOT_PROVEN');
 const pending=jobs.filter(j=>
  j.original_kind==='SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL'||
  (j.original_kind==='REAL_PR_REVIEW_ORIGINAL'&&j.phase!=='SETTLED'));
 if(pending.length)blockers.push('OTHER_SELECTED_JOBS_NOT_INDEPENDENTLY_SETTLED');
 return Object.freeze({...NO,
  status:'OWNER_SHIFT_EVIDENCE_VERIFIED_INSTALL_AND_FINAL_RECEIPTS_BLOCKED',
  shift_id:graph.shift_id,owner_id:graph.owner_id,
  ready_for_new_install_approval:false,
  native_reviewed_candidate_verified:reviewed,
  provider_credentials_configured_only:{
   github:!!githubConfigured,vercel:!!vercelConfigured,
   verified_write_permission:false,verified_deployment_permission:false
  },
  exact_original_count:jobs.filter(j=>j.original_work_id).length,
  source_tasks_inspected:jobs.length,
  jobs:Object.freeze(jobs),
  blockers:Object.freeze(blockers),
  next_safe_action:'CONNECT_RESTRICTED_PREVIEW_TRANSPORT_AND_PROVE_POSTAPPROVAL_SAME_ORIGINAL_SETTLEMENT'
 });
}

// Read-only self-diagnosis of WHY a tested native original cannot yet equip
// OpenAI with Reality's governed executable capabilities. This is a route
// classifier, NOT a model tool grant, capability-gap claim, installation,
// settled receipt, credential test, or authorization.
export function diagnoseRealityNativeCapabilityGap({graph,env={}}={}){
 const safe={installation_authorized:false,original_job_completed:false,
  production_changed:false,new_shift_required:false,
  automatic_installation_attempted:false};
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    !Array.isArray(graph.jobs))
  return Object.freeze({...safe,
   status:'NO_VERIFIED_NATIVE_ORIGINAL_CAPABILITY_DIAGNOSIS',
   source_original_work_id:null,blockers:Object.freeze([])});
 const native=graph.jobs.filter(x=>
  x.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
  x.source_ref==='https://github.com/maloney2323/Reality/issues/263');
 if(native.length!==1||!WORK.test(native[0].original_work_id||''))
  return Object.freeze({...safe,
   status:'NO_EXACT_NATIVE_REPAIR_ORIGINAL_TO_EQUIP',
   source_original_work_id:null,blockers:Object.freeze([])});
 const candidateTested=native[0].phase===
  'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL';
 const selected=String(env.REALITY_OPENAI_MODEL||'');
 // Match the actual enforced model allowlist in
 // reality-governed-tool-session-v1.js, not a generic API-key presence test.
 const modelEligible=/^(?:gpt-6|gpt-5\\.[4-9])(?:[._-].*)?$/i.test(selected);
 const blockers=[
  'SHIFT_ROLE_MODEL_REQUEST_EXPLICITLY_DISABLES_TOOLS',
  'NATIVE_ORIGINAL_TO_SIGNED_CAPABILITY_SESSION_NOT_VERIFIED',
  'NATIVE_POST_TOOL_SAME_ORIGINAL_SETTLEMENT_NOT_VERIFIED'
 ];
 if(!modelEligible)
  blockers.push('CONFIGURED_MODEL_NOT_ELIGIBLE_FOR_GOVERNED_TOOL_SESSION');
 return Object.freeze({...safe,
  status:candidateTested?
   'TESTED_NATIVE_REPAIR_NEEDS_GOVERNED_MODEL_TOOL_HANDOFF':
   'NATIVE_REPAIR_TOOL_HANDOFF_AWAITING_CANDIDATE_EVIDENCE',
  shift_id:graph.shift_id,
  source_original_work_id:native[0].original_work_id,
  candidate_independently_tested_phase:candidateTested,
  shift_role_model_mode:'ADVISORY_ONLY_NO_TOOLS',
  original_job_model_tool_mode:'SEPARATE_SIGNED_CONTINUITY_SESSION',
  governed_tool_session_model_compatible_configured:modelEligible,
  native_signed_tool_session_independently_verified:false,
  independently_verified_install_resume_receipt:false,
  blockers:Object.freeze(blockers),
  next_governed_repair:'CONNECT_SAME_NATIVE_ORIGINAL_TO_FENCED_CAPABILITY_SESSION_WITH_INDEPENDENT_READBACK'
 });
}
