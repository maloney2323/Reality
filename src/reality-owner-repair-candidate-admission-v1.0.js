// After genuine owner-authorized investigation, independently reobserve the
// model-generated source and source-pinned frozen CI acceptance, then persist
// that EXACT candidate into the SINGLE constitutional Continuity journal.
// Stops at AWAITING_OWNER_APPROVAL. No API call here can install, claim owner
// authorization, or declare customer work complete.
import {createHash} from 'node:crypto';
import {listAuthenticatedUnfinishedWork} from './reality-personal-unfinished-work-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine} from './reality-continuity-spine-v2.0.js';
import {createGeneralConstitutionalCheckpointService}
 from './reality-general-constitutional-checkpoint-v1.0.js';
import {readExactModelRepairEvidence}
 from './reality-real-verified-repair-readback-v1.0.js';
import {createGovernedSelfImprovement,acceptGovernedObservation,
 proposeGovernedCandidate,verifySelfImprovementJournal}
 from './reality-governed-self-improvement-spine-v1.0.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
const fail=x=>{throw Error('REAL_OWNER_CANDIDATE_'+x)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const workId=x=>/^work:[0-9a-f]{32}$/.test(String(x||''));
async function context({session,env,listWork,readGoal,providerRead,
 expectedOriginalWorkId,issueNumber}){
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
  !session?.user_id||!session?.config?.url)
  fail('AUTHENTICATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config.url||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('EXACT_OWNER_DATABASE_REQUIRED');
 const jobs=await listWork({session,env});
 const matches=(jobs?.jobs||[]).filter(x=>
  x.state==='REAL_SOURCE_BACKED_REPAIR_PENDING'&&
  x.goal_still_current===true&&workId(x.original_work_id)&&
  x.original_work_id===expectedOriginalWorkId&&
  x.issue_url==='https://github.com/maloney2323/Reality/issues/'+issueNumber&&
  x.job_completed===false&&x.action_completed===true);
 if(matches.length!==1)fail('ONE_SIGNED_OWNER_ORIGINAL_WORK_REQUIRED');
 const job=matches[0];
 const latest=await readGoal({session,conversationId:job.conversation_id,env});
 if(latest.principal_id!==session.user_id||
  latest.conversation_id!==job.conversation_id||
  latest.state?.active_goal?.status!=='ACTIVE'||
  latest.state.active_goal.user_confirmed!==true||
  latest.state.active_goal.goal_id!==latest.state.active_goal_id||
  !latest.state.active_goal.last_transition_receipt_id||
  !latest.state.active_goal.source_user_message_ref)
  fail('CURRENT_OWNER_GOAL_REQUIRED');
 const spine=createContinuitySpine({
  continuityRootId:latest.scope.root,worldlineId:latest.scope.worldline,
  subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==latest.state.continuity_root_id)
  fail('CANONICAL_OWNER_ROOT_CHANGED');
 const proof=await providerRead({issueNumber,env});
 if(proof.independently_verified!==true||
  proof.original_failed_run_id!==job.original_provider_failed_run_id||
  proof.original_source_sha!==job.original_source_sha||
  proof.issue_number!==issueNumber||
  !proof.candidate_artifact_sha256)
  fail('ORIGINAL_FAILURE_OR_VERIFIED_CANDIDATE_CHANGED');
 const scope={
  owner_id:session.user_id,
  goal_id:latest.state.active_goal_id,
  original_work_id:job.original_work_id,
  goal_transition_receipt_ref:latest.state.active_goal.last_transition_receipt_id,
  goal_evidence_ref:latest.state.active_goal.source_user_message_ref,
  continuity_root_id:spine.continuity_root_id,
  worldline_id:spine.worldline_id,
  target_environment:'ISOLATED_PREVIEW',
  governance_kernel_hash:'sha256:'+sha(
   'reality-self-improvement-governance-release:'+env.VERCEL_GIT_COMMIT_SHA),
 };
 return {db,scope,job,proof};
}
function summary(state,checkpoint,proof,job){
 verifySelfImprovementJournal(state);
 if(state.phase!=='AWAITING_OWNER_APPROVAL'||
   state.candidate?.artifact_hash!==proof.candidate_artifact_sha256||
   state.sandbox_receipt?.artifact_hash!==state.candidate.artifact_hash||
   state.sandbox_receipt?.independent_tests_passed!==true||
   state.sandbox_receipt?.frozen_regression_passed!==true||
   state.sandbox_receipt?.governance_preserved!==true)
  fail('INDEPENDENT_CANDIDATE_NOT_READY_FOR_OWNER_APPROVAL');
 return Object.freeze({
  status:'EXACT_CANDIDATE_AWAITING_SIGNED_OWNER_INSTALL_APPROVAL',
  original_work_id:job.original_work_id,
  original_conversation_id:job.conversation_id,
  original_work_receipt_id:job.source_receipt_id,
  issue_url:job.issue_url,
  candidate_artifact_hash:state.candidate.artifact_hash,
  model_response_ref:proof.model_response_id,
  source_files:proof.files.map(f=>f.path),
  original_provider_failed_run_id:proof.original_failed_run_id,
  model_generation_run_id:proof.model_source_run_id,
  independent_test_run_id:proof.verified_sandbox_run_id,
  frozen_test_sha256:proof.frozen_test_sha256,
  review_commit_sha:proof.review_commit_sha,
  constitutional_checkpoint_hash:state.head_hash,
  constitutional_checkpoint_receipt_id:checkpoint.checkpoint_receipt_id,
  independent_readback_verified:checkpoint.independent_readback_verified===true,
  owner_installation_approved:false,installed:false,
  original_job_completed:false,production_changed:false,
 });
}
export async function prepareVerifiedOwnerRepairCandidate({
 session,expectedOriginalWorkId,issueNumber,env=process.env,
 listWork=listAuthenticatedUnfinishedWork,
 readGoal=readFreshPersonalGoalState,
 providerRead=readExactModelRepairEvidence,
 checkpointFactory=createGeneralConstitutionalCheckpointService,
}={}){
 const {db,scope,job,proof}=await context({
  session,env,listWork,readGoal,providerRead,expectedOriginalWorkId,
  issueNumber,
 });
 const checkpoint=checkpointFactory({
  session,conversationId:job.conversation_id,
  originalWorkId:job.original_work_id,
  originalWorkEvidenceRef:job.source_receipt_id,
  db,env,
 });
 let state;
 try{
  const previous=await checkpoint.readLatestCheckpoint();
  if(previous.persisted!==true||previous.independent_readback_verified!==true||
     previous.checkpoint_hash!==previous.state?.head_hash)
   fail('PREVIOUS_CHECKPOINT_NOT_VERIFIED');
  state=previous.state;
 }catch(error){
  if(error.message!=='GENERAL_CHECKPOINT_NO_PERSISTED_GENERAL_CHECKPOINT')
   throw error;
  state=createGovernedSelfImprovement({scope});
 }
 if(state.scope.owner_id!==scope.owner_id||
  state.scope.original_work_id!==scope.original_work_id||
  state.scope.goal_id!==scope.goal_id||
  state.scope.worldline_id!==scope.worldline_id)
  fail('PREVIOUS_JOURNAL_OWNER_OR_GOAL_CHANGED');
 const checkProvider=async({scope_hash,receipt})=>{
  const fresh=await providerRead({issueNumber,env});
  if(fresh.candidate_artifact_sha256!==proof.candidate_artifact_sha256||
   fresh.review_commit_sha!==proof.review_commit_sha||
   fresh.original_failed_run_id!==proof.original_failed_run_id||
   fresh.verified_sandbox_run_id!==proof.verified_sandbox_run_id)
   return {verified:false};
  return {
   verified:true,independent_provider_readback:true,
   original_work_id:job.original_work_id,scope_hash,
   evidence_ref:receipt.evidence_ref,evidence_hash:receipt.evidence_hash,
   attestation_ref:'github:provider:independent-repair-readback:'+fresh.review_commit_sha,
  };
 };
 if(state.phase==='DISCOVERING'){
  state=await acceptGovernedObservation(state,{
   kind:'GAP_CONFIRMED',
   owner_id:scope.owner_id,goal_id:scope.goal_id,
   original_work_id:job.original_work_id,
   continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
   evidence_ref:'github:actions:run:'+proof.original_failed_run_id,
   evidence_hash:sha([proof.original_source_sha,proof.frozen_test_sha256,
    proof.original_failed_run_id].join(':')),
   capability_id:'reality:missing-extension:issue:'+issueNumber,
   failure_refs:[proof.issue_url,
    'github:actions:run:'+proof.original_failed_run_id],
   verification_suite_ref:'github:frozen-regression:'+proof.frozen_test_sha256,
  },{verifyProvider:checkProvider});
  await checkpoint.persistCheckpoint(state);
 }
 if(state.phase==='GAP_CONFIRMED'){
  state=proposeGovernedCandidate(state,{
   files:proof.files,rationale:'Reality independently generated and tested '+proof.model_response_id,
   verification_plan_ref:'github:frozen-regression:'+proof.frozen_test_sha256,
   model_response_ref:proof.model_response_id,
  });
  if(state.candidate.artifact_hash!==proof.candidate_artifact_sha256)
   fail('MODEL_GENERATED_BYTES_CHANGED_AFTER_GITHUB_TEST');
  await checkpoint.persistCheckpoint(state);
 }
 if(state.phase==='CANDIDATE_READY'){
  state=await acceptGovernedObservation(state,{
   kind:'SANDBOX_VERIFIED',
   owner_id:scope.owner_id,goal_id:scope.goal_id,
   original_work_id:scope.original_work_id,
   continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
   evidence_ref:'github:actions:run:'+proof.verified_sandbox_run_id,
   evidence_hash:proof.independent_sandbox.log_sha256,
   artifact_hash:proof.candidate_artifact_sha256,
   independent_tests_passed:true,frozen_regression_passed:true,
   governance_preserved:true,
   verifier_run_ref:'github:actions:run:'+proof.verified_sandbox_run_id,
   external_action_performed:false,
   installation_authorized:false,original_job_completed:false,
  },{verifyProvider:checkProvider});
  await checkpoint.persistCheckpoint(state);
 }
 if(state.phase!=='AWAITING_OWNER_APPROVAL')
  fail('EXISTING_JOB_ALREADY_ADVANCED_OR_BLOCKED');
 const receipt=await checkpoint.readCheckpoint(state);
 return summary(state,receipt,proof,job);
}
