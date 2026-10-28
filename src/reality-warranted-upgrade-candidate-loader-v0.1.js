// The first *real* trusted upgrade candidate loader. No browser/model input
// supplies code, proof, goal authority or a warrant. All are reconstituted
// from the owner's existing immutable Continuity worldline.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine,validateContinuityChain}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {verifyUpgradeEvidenceWarrant}
 from './reality-upgrade-evidence-warrant-v0.1.js';
import {prepareGovernedAutonomousUpgrade}
 from './reality-governed-autonomous-upgrade-orchestrator-v0.1.js';
export const UPGRADE_CANDIDATE_LOADER_VERSION='reality-warranted-upgrade-candidate-loader-v0.1';
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const fail=c=>{throw Error(c)};
export function projectAuthenticatedWarrantedUpgrade({
 history,originalWorkId,ownerId,conversationId,
 activeGoalId,goalRevision,continuityRootId,worldlineId,
 env=process.env,now=Date.now(),
}={}){
 if(!Array.isArray(history)||!history.length||
    !WORK.test(String(originalWorkId||''))||
    !validUuid(ownerId)||!validUuid(conversationId)||
    !activeGoalId||!goalRevision||!continuityRootId||!worldlineId)
  fail('UPGRADE_LOADER_ORIGINAL_GOAL_SCOPE_REQUIRED');
 const ordered=orderContinuityHistory(history);
 const lineage=validateContinuityChain(ordered.map(e=>({
  ...e,
  prior_lineage_hash:e.prior_lineage_hash??
    e.provenance?.continuity_spine?.prior_lineage_hash??null,
 })));
 if(!lineage.valid)fail('UPGRADE_LOADER_CONTINUITY_LINEAGE_INVALID');
 if(ordered.some(e=>e.continuity_root_id!==continuityRootId||
   e.worldline_id!==worldlineId))
  fail('UPGRADE_LOADER_CROSS_WORLDLINE_EVENT');
 const checkpoints=ordered.filter(e=>
  e.entity_type==='personal_recovery_checkpoint'&&
  e.payload?.original_work_id===originalWorkId&&
  e.payload?.original_goal_id===activeGoalId&&
  e.payload?.job_completed===false);
 if(checkpoints.length!==1)fail('UPGRADE_LOADER_UNIQUE_BLOCKED_CHECKPOINT_REQUIRED');
 const checkpoint=checkpoints[0];
 if(!UUID.test(String(checkpoint.event_id||''))||
    checkpoint.event_kind!=='WORK'||
    checkpoint.payload?.new_external_action_authorized!==false)
  fail('UPGRADE_LOADER_UNTRUSTED_BLOCKED_CHECKPOINT');
 // Only the trusted independent sandbox-verifier service may append
 // these VERIFICATION events. No HTTP issuance endpoint is exposed.
 const sandboxEvents=ordered.filter(e=>
  e.entity_type==='personal_upgrade_sandbox_verified'&&
  e.payload?.original_work_id===originalWorkId);
 const warrants=ordered.filter(e=>
  e.entity_type==='personal_upgrade_evidence_warrant'&&
  e.payload?.original_work_id===originalWorkId);
 if(sandboxEvents.length!==1||warrants.length!==1)
  fail('UPGRADE_LOADER_VERIFIED_SANDBOX_AND_WARRANT_NOT_PERSISTED');
 const sandbox=sandboxEvents[0],warrantEvent=warrants[0];
 const verifiedExperiment=sandbox.payload?.verified_experiment;
 const verifierReceipt=sandbox.payload?.verifier_receipt;
 const warrant=warrantEvent.payload?.warrant;
 if(sandbox.event_kind!=='VERIFICATION'||sandbox.epistemic_status!=='VERIFIED'||
    warrantEvent.event_kind!=='VERIFICATION'||warrantEvent.epistemic_status!=='VERIFIED'||
    sandbox.payload?.original_goal_id!==activeGoalId||
    warrantEvent.payload?.original_goal_id!==activeGoalId||
    warrantEvent.payload?.sandbox_receipt_id!==sandbox.event_id||
    warrantEvent.payload?.blocked_checkpoint_id!==checkpoint.event_id||
    !UUID.test(String(sandbox.event_id||''))||
    ordered.indexOf(checkpoint)>=ordered.indexOf(sandbox)||
    ordered.indexOf(sandbox)>=ordered.indexOf(warrantEvent)||
    sandbox.provenance?.source!=='reality-independent-sandbox-verifier-v0.1'||
    warrantEvent.provenance?.source!=='reality-upgrade-warrant-issuer-v0.1'||
    sandbox.provenance?.principal_id!==ownerId||
    warrantEvent.provenance?.principal_id!==ownerId||
    sandbox.provenance?.conversation_id!==conversationId||
    warrantEvent.provenance?.conversation_id!==conversationId||
    sandbox.payload?.goal_revision!==goalRevision||
    warrantEvent.payload?.goal_revision!==goalRevision)
  fail('UPGRADE_LOADER_VERIFIER_EVENT_SOURCE_OR_GOAL_INVALID');
 if(ordered.some(e=>e.entity_type==='personal_original_job_settlement'&&
    e.payload?.original_work_id===originalWorkId&&
    e.payload?.original_job_completed===true))
  fail('UPGRADE_LOADER_ORIGINAL_WORK_ALREADY_COMPLETED');
 const originalWorkItem=Object.freeze({
  id:originalWorkId,
  continuity_root_id:continuityRootId,
  worldline_id:worldlineId,
  status:'BLOCKED',
 });
 const baseCommitSha=warrant?.pinned_base_commit_sha;
 const verified=verifyUpgradeEvidenceWarrant({
  warrant,experiment:verifiedExperiment,verifierReceipt,
  originalWorkItem,blockedCheckpointId:checkpoint.event_id,
  goalRevision,ownerId,conversationId,baseCommitSha,env,now,
 });
 if(!verified.valid)fail('UPGRADE_LOADER_WARRANT_'+verified.reason);
 const plan=prepareGovernedAutonomousUpgrade({
  verifiedExperiment,originalWorkItem,
 });
 if(plan.verified_candidate_hash!==verified.candidate_sha256||
    plan.verified_experiment_hash!==warrant.verification_hash)
  fail('UPGRADE_LOADER_VERIFIED_CANDIDATE_PLAN_MISMATCH');
 return Object.freeze({
  version:UPGRADE_CANDIDATE_LOADER_VERSION,
  owner_id:ownerId,conversation_id:conversationId,
  original_work_id:originalWorkId,
  original_goal_id:activeGoalId,goal_revision:goalRevision,
  originalWorkItem,verifiedExperiment,verifierReceipt,
  evidence_warrant:warrant,
  evidence_warrant_id:verified.warrant_id,
  candidate_hash:verified.candidate_sha256,
  blocked_checkpoint_receipt_id:checkpoint.event_id,
  sandbox_receipt_id:sandbox.event_id,
  warrant_receipt_id:warrantEvent.event_id,
  persisted_and_reobserved:true,
  verified_not_authorized:true,
  external_action_authorized:false,
  original_job_completed:false,
 });
}
export async function loadAuthenticatedWarrantedUpgrade({
 session,conversationId,originalWorkId,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 now=Date.now(),
}={}){
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId)||
    !WORK.test(String(originalWorkId||'')))
  fail('UPGRADE_LOADER_OWNER_AUTHENTICATION_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('UPGRADE_LOADER_ISOLATED_DB_SCOPE_REQUIRED');
 const goal=await readGoal({session,conversationId,env});
 const active=goal?.state?.active_goal;
 if(goal?.principal_id!==session.user_id||
    goal?.conversation_id!==conversationId||
    active?.status!=='ACTIVE'||active?.user_confirmed!==true||
    !goal.state?.active_goal_id||
    active.goal_id!==goal.state.active_goal_id||
    typeof active.last_transition_receipt_id!=='string'||
    !active.last_transition_receipt_id)
  fail('UPGRADE_LOADER_CONFIRMED_GOAL_CHANGED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,
  worldlineId:goal.scope.worldline,
  subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==goal.state.continuity_root_id||
    goal.state.world_id!==goal.scope.world)
  fail('UPGRADE_LOADER_CANONICAL_OWNER_SCOPE_MISMATCH');
 const history=await createPersistence({...db}).reconstruct({
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id,
 });
 return projectAuthenticatedWarrantedUpgrade({
  history,originalWorkId,ownerId:session.user_id,conversationId,
  activeGoalId:goal.state.active_goal_id,
  goalRevision:active.last_transition_receipt_id,
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id,
  env,now,
 });
}
