// Complete the original, owner-authorized GitHub work after a verified
// capability upgrade. This adapter executes ONLY an existing original
// create_issue work item, reconstructed from the SAME signed-in Continuity.
// It never converts issue description into code-repair authorization.
// Other work types must supply their own real, independently verified adapter.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {fingerprintApprovedWorkItem}
 from './reality-authority-v1.0.js';
import {loadAuthenticatedWarrantedUpgrade}
 from './reality-warranted-upgrade-candidate-loader-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {createContinuitySpine,validateContinuityChain}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
import {assertExactMaintainerIssue,checkForExistingMaintainerIssue,
 createPersonalGithubIssueBridge}
 from './reality-personal-github-execution-bridge-v0.1.js';
import {githubGet,githubWrite} from './reality-connector-github-v1.0.js';
export const OWNER_UPGRADE_ORIGINAL_GITHUB_WORK_VERSION='reality-owner-upgrade-original-github-work-v0.1';
const WORK=/^work:[a-f0-9]{32}$/,HASH=/^[a-f0-9]{64}$/,SHA=/^[a-f0-9]{40}$/;
const fail=code=>{throw Error(code)};
function assertContext({session,scope,plan,env}){
 if(env?.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(scope?.conversationId)||
    !WORK.test(String(scope?.workId||''))||
    scope.ownerId!==session.user_id||
    scope.conversationId!==plan?.conversation_id||
    plan.owner_id!==session.user_id||
    plan.original_work_id!==scope.workId||
    plan.goal_revision!==scope.goalRevision||
    plan.candidate_sha256!==scope.candidateSha||
    plan.github_head_sha!==scope.headSha||
    !HASH.test(String(scope.candidateSha||''))||
    !SHA.test(String(scope.headSha||'')))
  fail('ORIGINAL_RESUME_AUTHENTICATED_EXACT_SCOPE_REQUIRED');
}
export async function loadAuthenticatedOriginalUpgradeWork({
 session,scope,plan,env=process.env,
 loadTrusted=loadAuthenticatedWarrantedUpgrade,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 assertContext({session,scope,plan,env});
 const source=await loadTrusted({session,
  conversationId:scope.conversationId,originalWorkId:scope.workId,env});
 if(source?.persisted_and_reobserved!==true||
    source.owner_id!==session.user_id||
    source.conversation_id!==scope.conversationId||
    source.original_work_id!==scope.workId||
    source.original_goal_id!==plan.original_goal_id||
    source.goal_revision!==plan.goal_revision||
    source.candidate_hash!==scope.candidateSha||
    source.evidence_warrant_id!==plan.warrant_id||
    source.original_job_completed!==false)
  fail('ORIGINAL_RESUME_SIGNED_CAPABILITY_SOURCE_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ORIGINAL_RESUME_OWNER_DATABASE_REQUIRED');
 const goal=await readGoal({session,conversationId:scope.conversationId,env});
 const state=goal?.state?.active_goal;
 if(goal?.principal_id!==session.user_id||
    goal.conversation_id!==scope.conversationId||
    state?.goal_id!==plan.original_goal_id||
    state.last_transition_receipt_id!==plan.goal_revision||
    state.user_confirmed!==true||state.status!=='ACTIVE')
  fail('ORIGINAL_RESUME_ORIGINAL_GOAL_CHANGED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  subjectId:session.user_id});
 if(spine.continuity_root_id!==plan.continuity_root_id||
    spine.worldline_id!==plan.worldline_id)
  fail('ORIGINAL_RESUME_WORLDLINE_CHANGED');
 const history=orderContinuityHistory(await createPersistence({...db}).reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id}));
 const checked=validateContinuityChain(history.map(e=>({...e,
  prior_lineage_hash:e.prior_lineage_hash??
   e.provenance?.continuity_spine?.prior_lineage_hash??null})));
 if(checked.valid!==true)fail('ORIGINAL_RESUME_CONTINUITY_CHAIN_INVALID');
 const gap=history.filter(e=>e.event_id===source.blocked_checkpoint_receipt_id&&
  e.entity_type==='personal_capability_gap_checkpoint'&&
  e.epistemic_status==='VERIFIED'&&
  e.provenance?.source==='reality-capability-gap-detector-v1.0'&&
  e.provenance?.principal_id===session.user_id&&
  e.payload?.original_work_id===scope.workId&&
  e.payload?.blocker_classification==='MISSING_CAPABILITY_INDEPENDENTLY_VERIFIED');
 if(gap.length!==1)
  fail('ORIGINAL_RESUME_REAL_MISSING_CAPABILITY_GAP_REQUIRED');
 const handoffs=history.filter(e=>
  e.entity_type==='personal_discovered_work_handoff'&&
  e.payload?.work_id===scope.workId);
 if(handoffs.length!==1||
    handoffs[0].payload?.goal_id!==plan.original_goal_id||
    handoffs[0].payload?.goal_transition_receipt_id!==plan.goal_revision||
    handoffs[0].payload?.authority!=='NOT_GRANTED'||
    handoffs[0].payload?.external_action_performed!==false)
  fail('ORIGINAL_RESUME_ORIGINAL_WORK_SOURCE_NOT_UNIQUE');
 const original=assertExactMaintainerIssue(handoffs[0].payload.work_item);
 if(original.work_item_id!==scope.workId||
    handoffs[0].payload.work_fingerprint!==fingerprintApprovedWorkItem(original))
  fail('ORIGINAL_RESUME_EXACT_ORIGINAL_ACTION_CHANGED');
 // Already performed or uncertain GitHub effects are NEVER re-dispatched.
 if(history.some(e=>
   (e.entity_type==='personal_issue_execution_outcome'&&
    e.payload?.work_id===scope.workId)||
   (e.entity_type==='personal_original_job_settlement'&&
    e.payload?.original_work_id===scope.workId)))
  fail('ORIGINAL_RESUME_EXISTING_PROVIDER_EFFECT_NO_RETRY');
 return Object.freeze({original_work_item:original,
  original_source_receipt_id:handoffs[0].event_id,
  blocked_gap_receipt_id:gap[0].event_id,
  no_previous_provider_effect_verified:true});
}
function assertGrant({session,scope,plan,active,goal,resumeGrant}){
 if(active?.registered!==true||active.runtime_active!==true||
    active.independently_reobserved!==true||
    active.original_work_id!==scope.workId||
    active.candidate_sha256!==scope.candidateSha||
    active.capability_id!==plan.capability_id||
    active.customer_application_runtime_active!==false||
    goal?.principal_id!==session.user_id||
    goal.active_goal_id!==plan.original_goal_id||
    goal.goal_revision!==plan.goal_revision||
    goal.active!==true||goal.user_confirmed!==true||
    resumeGrant?.status!=='CONSUMED_ONCE'||
    resumeGrant?.operation!=='resume_original_work'||
    resumeGrant.original_work_id!==scope.workId||
    resumeGrant.owner_id!==session.user_id||
    resumeGrant.conversation_id!==scope.conversationId||
    resumeGrant.candidate_sha256!==scope.candidateSha||
    resumeGrant.head_sha!==scope.headSha||
    resumeGrant.goal_revision!==plan.goal_revision||
    resumeGrant.separate_from_install_authorization!==true||
    !validUuid(resumeGrant.grant_id))
  fail('ORIGINAL_RESUME_DISTINCT_CONSUMED_OWNER_GRANT_REQUIRED');
}
export async function resumeOriginalOwnerGithubWork({
 session,scope,plan,active,goal,resumeGrant,env=process.env,
 loadWork=loadAuthenticatedOriginalUpgradeWork,
 get=githubGet,write=githubWrite,
}={}){
 assertContext({session,scope,plan,env});
 assertGrant({session,scope,plan,active,goal,resumeGrant});
 const loaded=await loadWork({session,scope,plan,env});
 if(loaded?.no_previous_provider_effect_verified!==true)
  fail('ORIGINAL_RESUME_PRIOR_EFFECT_NOT_RECONCILED');
 const item=assertExactMaintainerIssue(loaded.original_work_item);
 if(item.work_item_id!==scope.workId)
  fail('ORIGINAL_RESUME_DIFFERENT_WORK_FORBIDDEN');
 // This final read-only duplicate check happens AFTER the single-use grant
 // is consumed, and BEFORE the effect; failed checks cannot release the grant.
 await checkForExistingMaintainerIssue(item,{get});
 const bridge=createPersonalGithubIssueBridge({get,write});
 // Network errors/timeout after here are unresolved. Caller must not retry.
 const response=await bridge.connector.execute({workItem:item});
 const issueNo=response?.observation?.number;
 if(!Number.isSafeInteger(issueNo)||issueNo<1||
    !/^[1-9]\d*$/.test(String(response?.providerExecutionId||'')))
  fail('ORIGINAL_RESUME_PROVIDER_RESULT_UNCERTAIN_NO_RETRY');
 return Object.freeze({
  original_work_id:scope.workId,owner_id:session.user_id,
  conversation_id:scope.conversationId,goal_revision:scope.goalRevision,
  candidate_sha256:scope.candidateSha,head_sha:scope.headSha,
  execution_id:'github-issue:'+response.providerExecutionId,
  provider_issue_number:issueNo,
  provider_execution_id:response.providerExecutionId,
  provider_claim_not_independent:true,
  original_job_completed:false,
 });
}
export async function observeOriginalOwnerGithubWork({
 session,scope,plan,resumed,resumeGrant,env=process.env,
 loadWork=loadAuthenticatedOriginalUpgradeWork,get=githubGet,
}={}){
 assertContext({session,scope,plan,env});
 if(resumed?.original_work_id!==scope.workId||
    resumed.owner_id!==session.user_id||
    resumed.conversation_id!==scope.conversationId||
    resumed.goal_revision!==scope.goalRevision||
    resumed.candidate_sha256!==scope.candidateSha||
    resumed.head_sha!==scope.headSha||
    resumed.provider_claim_not_independent!==true||
    resumeGrant?.status!=='CONSUMED_ONCE'||
    resumeGrant.original_work_id!==scope.workId||
    !Number.isSafeInteger(resumed.provider_issue_number)||
    resumed.provider_issue_number<1||
    !/^[1-9]\d*$/.test(String(resumed.provider_execution_id||''))||
    resumed.execution_id!=='github-issue:'+resumed.provider_execution_id)
  fail('ORIGINAL_RESUME_EXACT_PROVIDER_ISSUED_RECEIPT_REQUIRED');
 const loaded=await loadWork({session,scope,plan,env});
 const item=assertExactMaintainerIssue(loaded.original_work_item);
 const bridge=createPersonalGithubIssueBridge({get});
 const verification=await bridge.independentVerifier.verify({
  workItem:item,providerResult:{
   providerExecutionId:resumed.provider_execution_id,
   observation:{number:resumed.provider_issue_number},
  },
 });
 if(verification?.independent!==true||verification.verified!==true||
    verification.observedState?.verified!==true||
    verification.observedState?.issue_number!==resumed.provider_issue_number||
    verification.observedState?.issue_url!==
     'https://github.com/maloney2323/Reality/issues/'+resumed.provider_issue_number)
  fail('ORIGINAL_RESUME_PROVIDER_READBACK_NOT_VERIFIED');
 return Object.freeze({
  owner_id:session.user_id,conversation_id:scope.conversationId,
  original_work_id:scope.workId,work_id:scope.workId,
  original_goal_id:plan.original_goal_id,
  goal_revision:scope.goalRevision,
  candidate_sha256:scope.candidateSha,capability_sha256:scope.candidateSha,
  head_sha:scope.headSha,independent:true,
  // A GitHub tracking issue is an action outcome, never proof that the
  // underlying maintenance repair or business objective was completed.
  // The full-loop settlement gate must therefore reject this as a finished
  // original repair. A genuine repair-executor needs its own proof contract.
  original_job_completed:false,
  original_tracking_action_completed:true,
  underlying_maintenance_repair_completed:false,
  execution_receipt_id:resumed.execution_id,
  evidence_ref:verification.observedState.issue_url,
  original_action_operation:'github:create_issue',
  // This is completion of the EXACT original GitHub action ONLY.
  // It must not be generalized to maintenance root-cause repair.
  original_action_verified:true,
 });
}
