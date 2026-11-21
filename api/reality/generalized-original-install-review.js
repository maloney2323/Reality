// Authenticated Reality Chat's READ-ONLY generalized original-job
// installation review. Neither a Chat message nor viewing evidence can
// authorize an exact artifact. Owner consent is a separate signed action
// and stays disabled until independently verified release continuity.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {shiftRpc} from '../../src/reality-governed-shift-boundary-v1.js';

const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const RUN=/^[1-9][0-9]{4,}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export const maxDuration=20;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 let stage='SIGNED_OWNER_AUTH';
 try{
  if(req.method!=='GET'||Object.keys(req.query||{}).length)
   return res.status(405).json({
    ok:false,error:'GENERALIZED_REVIEW_READ_ONLY_EXPLICIT_INSTALL_APPROVAL_SEPARATE'});
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session?.user_id)
   return res.status(401).json({
    ok:false,error:'GENERALIZED_REVIEW_SIGNED_IN_OWNER_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  if(db?.strictSecrets!==true||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
     db.url!==session.config.url)
   throw Error('GENERALIZED_REVIEW_EXACT_ISOLATED_SERVICE_REQUIRED');
  stage='BASELINE_ORIGINAL_PROOF';
  const r=await shiftRpc(db,'reality_read_generalized_original_install_review_v1',
   {p_owner_id:session.user_id});
  if(r?.status==='NO_CURRENT_VERIFIED_ORIGINAL_INSTALL_REVIEW')
   return res.status(200).json({
    ok:true,status:r.status,owner_approval_ready:false,
    installation_authorized:false,original_job_completed:false,
    production_changed:false});
  if(r?.status!=='GENERALIZED_VERIFIED_ORIGINAL_INSTALL_REVIEW'||
     r.owner_id!==session.user_id||!WORK.test(r.original_work_id||'')||
     !HASH.test(r.candidate_artifact_sha256||'')||
     !SHA.test(r.candidate_commit_sha||'')||
     !SHA.test(r.expected_preinstall_blob_sha||'')||
     !SHA.test(r.expected_installed_blob_sha||'')||
     !RUN.test(String(r.independent_frozen_run_id||''))||
     !RUN.test(String(r.integrated_test_run_id||''))||
     typeof r.source_ref!=='string'||
     !/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/.test(r.source_ref)||
     !/^reality\/[a-zA-Z0-9/_-]{10,135}$/.test(r.exact_install_target_branch||'')||
     r.production_changed!==false||
     !['REVIEW_STAGED_NOT_INSTALL_READY','PREINSTALL_TRANSPORT_VERIFIED',
       'READY_FOR_EXACT_OWNER_APPROVAL','OWNER_APPROVED',
       'INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED',
       'ORIGINAL_SETTLED','EFFECT_UNVERIFIED'].includes(r.phase)||
     typeof r.owner_approval_ready!=='boolean'||
     typeof r.original_job_completed!=='boolean'||
     typeof r.installation_authorized!=='boolean')
   throw Error('GENERALIZED_REVIEW_CURRENT_OWNER_PROOF_DRIFT');
  // The recovery model's advisory finding is visible only through this
  // already authenticated, same-owner original readback. It cannot
  // manufacture another approval or claim a finished customer job.
  stage='ADVISORY_AND_PUBLICATION_READBACK';
  // Both auxiliary readbacks are owner-scoped and read-only. Run them in
  // parallel so mobile's bounded signed-owner request does not time out
  // after making three sequential Supabase RPC calls under heavy fan-out.
  const [diagnosis,rawPub]=await Promise.all([
   shiftRpc(db,'reality_read_general_original_fenced_investigation_state_v1',{})
    .catch(()=>null),
   shiftRpc(db,'reality_read_general_original_recovery_review_v1',{
    p_owner_id:session.user_id}).catch(()=>null)
  ]);
  const recovery=diagnosis?.status===
    'FENCED_ORIGINAL_RILEY_DIAGNOSIS_PERSISTED_TEST_REQUIRED'&&
   diagnosis.original_work_id===r.original_work_id&&
   diagnosis.model_findings_are_hypotheses===true&&
   diagnosis.independently_tested===false&&
   diagnosis.external_retry_authorized===false&&
   diagnosis.original_job_completed===false&&
   diagnosis.production_changed===false?
   {status:diagnosis.status,model_response_id:diagnosis.model_response_id,
    suspected_failure_stage:diagnosis.suspected_failure_stage,
    repair_proposal:diagnosis.repair_proposal,
    independent_test_plan:diagnosis.independent_test_plan,
    independently_tested:false,external_retry_authorized:false}:null;
  // A SECOND, exact one-use publication decision is offered only after
  // its own independently tested release proof is staged. It cannot reuse
  // the original consumed installation approval.
  const pub=rawPub?.status==='GENERAL_ORIGINAL_EXACT_RECOVERY_PUBLICATION_REVIEW'&&
   rawPub.original_work_id===r.original_work_id&&
   rawPub.attempt_id===r.attempt_id&&
   rawPub.candidate_commit_sha===r.candidate_commit_sha&&
   rawPub.candidate_artifact_sha256===r.candidate_artifact_sha256&&
   rawPub.original_job_completed===false&&rawPub.production_changed===false&&
   UUID.test(rawPub.recovery_publication_id||'')&&
   SHA.test(rawPub.expected_parent_commit_sha||'')&&
   /^sha256:[a-f0-9]{64}$/.test(rawPub.candidate_artifact_sha256||'')&&
   Number.isSafeInteger(rawPub.independent_recovery_test_run_id)&&
   rawPub.independent_recovery_test_run_id>10000&&
   SHA.test(rawPub.proof_commit_sha||'')?rawPub:null;
  const recoveryApprovalAvailable=pub?.phase==='READY_FOR_EXACT_RECOVERY_APPROVAL'&&
   pub.owner_approval_ready===true&&pub.owner_approval_id===null&&
   r.phase==='INSTALL_INTENT_FENCED'&&
   r.installation_authorized===true&&r.original_job_completed===false;
  return res.status(200).json({
   ok:true,...r,recovery_diagnosis:recovery,
   recovery_publication:pub,
   recovery_approval_action_available:recoveryApprovalAvailable===true,
   recovery_approval_action_endpoint:'/api/reality/general-original-recovery-approval',
   next_gate:recovery?'INDEPENDENT_REPAIR_TEST_BEFORE_RECOVERY_DECISION':
    r.owner_approval_ready?
    'EXACT_OWNER_APPROVAL_MAY_BE_PRESENTED_SEPARATELY':
    'RELEASE_TRANSPORT_AND_ORIGINAL_SETTLEMENT_CONTINUATION_PROOF_REQUIRED',
   owner_approval_action_available:(
    r.owner_approval_ready===true&&r.phase==='READY_FOR_EXACT_OWNER_APPROVAL'&&
    r.isolated_github_write_verified===true&&
    r.preview_auto_deploy_verified===true&&
    r.same_original_execution_and_settlement_contract_verified===true&&
    r.approval_receipt_id===null&&
    r.installation_authorized===false&&r.original_job_completed===false),
   approval_action_endpoint:'/api/reality/generalized-owner-install-approval',
   no_installation_effect_by_get:true
  });
 }catch{
  // No credentials or owner details in logs, just the bounded stage code.
  console.warn('REALITY_GENERALIZED_REVIEW_FAILURE',stage);
  return res.status(503).json({
   ok:false,error:'GENERALIZED_REVIEW_DURABLE_OWNER_READBACK_UNVERIFIED',
   owner_approval_ready:false,installation_authorized:false,
   original_job_completed:false,production_changed:false
  });
 }
}
