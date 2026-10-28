// Real fresh original user-goal readback for resumed owner work. This read-only
// adapter checks authenticated current user intent and existing settlement
// against the original signed-in Continuity worldline before any resume grant.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine}
 from './reality-continuity-spine-v2.0.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
export const OWNER_UPGRADE_FRESH_GOAL_VERSION='reality-owner-upgrade-fresh-goal-v0.1';
const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error(x)};
export async function readOwnerOriginalWorkGoalBeforeResume({
 session,conversationId,scope,plan,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(env?.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId)||
    conversationId!==scope?.conversationId||
    !WORK.test(String(scope?.workId||''))||
    session.user_id!==scope.ownerId||
    plan?.owner_id!==session.user_id||
    plan?.conversation_id!==conversationId||
    plan?.original_work_id!==scope.workId||
    plan?.goal_revision!==scope.goalRevision)
  fail('UPGRADE_FRESH_GOAL_AUTHENTICATED_SCOPE_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('UPGRADE_FRESH_GOAL_OWNER_DB_REQUIRED');
 const latest=await readGoal({session,conversationId,env});
 const goal=latest?.state?.active_goal;
 if(latest?.principal_id!==session.user_id||
    latest?.conversation_id!==conversationId||
    latest?.state?.active_goal_id!==plan.original_goal_id||
    goal?.goal_id!==plan.original_goal_id||
    goal?.last_transition_receipt_id!==plan.goal_revision||
    goal?.status!=='ACTIVE'||goal?.user_confirmed!==true)
  fail('UPGRADE_FRESH_GOAL_CURRENT_OWNER_INTENT_CHANGED');
 const spine=createContinuitySpine({
  continuityRootId:latest.scope.root,worldlineId:latest.scope.worldline,
  subjectId:session.user_id});
 if(spine.continuity_root_id!==plan.continuity_root_id||
    spine.worldline_id!==plan.worldline_id)
  fail('UPGRADE_FRESH_GOAL_ORIGINAL_WORLDLINE_CHANGED');
 const history=orderContinuityHistory(await createPersistence({...db}).reconstruct({
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id}));
 const prior=history.filter(e=>e.entity_type==='personal_original_job_settlement'&&
  e.payload?.original_work_id===scope.workId);
 if(prior.length)fail('UPGRADE_FRESH_GOAL_ALREADY_SETTLED_NO_RETRY');
 if(!history.some(e=>e.entity_type==='personal_upgrade_runtime_verified'&&
    e.payload?.original_work_id===scope.workId&&
    e.payload?.candidate_sha256===scope.candidateSha))
  fail('UPGRADE_FRESH_GOAL_ACTIVATION_NOT_IN_ORIGINAL_CONTINUITY');
 return Object.freeze({
  principal_id:session.user_id,conversation_id:conversationId,
  active_goal_id:goal.goal_id,goal_revision:goal.last_transition_receipt_id,
  active:true,user_confirmed:true,original_job_completed:false,
  original_work_id:scope.workId,
  from_authenticated_continuity:true,
  external_action_performed:false,
 });
}
