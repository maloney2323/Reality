// Exact authenticated original-job draft-PR proof in owner Continuity.
// Producer is ONLY the successful, single-use governed draft dispatcher.
// The read-side independently reconstructs the same original worldline.
// This file never grants installation authority, merges or replays a job.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource,
 validateContinuityChain} from './reality-continuity-spine-v2.0.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
import {loadAuthenticatedWarrantedUpgrade}
 from './reality-warranted-upgrade-candidate-loader-v0.1.js';

export const OWNER_UPGRADE_DRAFT_RECEIPT_VERSION='reality-owner-upgrade-draft-receipt-v0.1';
const WORK=/^work:[a-f0-9]{32}$/,SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const fail=x=>{throw Error(x)};
async function context({
 session,conversationId,originalWorkId,env,readGoal,createPersistence,
}){
 if(env?.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId)||
    !WORK.test(String(originalWorkId||'')))
  fail('UPGRADE_DRAFT_RECEIPT_AUTHENTICATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
    db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('UPGRADE_DRAFT_RECEIPT_EXACT_OWNER_DB_REQUIRED');
 const goal=await readGoal({session,conversationId,env});
 const active=goal?.state?.active_goal;
 if(goal?.principal_id!==session.user_id||goal?.conversation_id!==conversationId||
    active?.status!=='ACTIVE'||active?.user_confirmed!==true||
    active?.goal_id!==goal.state.active_goal_id||
    typeof active.last_transition_receipt_id!=='string'||
    !active.last_transition_receipt_id)
  fail('UPGRADE_DRAFT_RECEIPT_ORIGINAL_GOAL_CHANGED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,
  worldlineId:goal.scope.worldline,subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==goal.state.continuity_root_id||
    goal.state.world_id!==goal.scope.world)
  fail('UPGRADE_DRAFT_RECEIPT_OWNER_WORLDLINE_INVALID');
 const store=createPersistence({...db});
 const read=async()=>{
  const history=orderContinuityHistory(await store.reconstruct({
   continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id,
  }));
  const result=validateContinuityChain(history.map(e=>({
   ...e,prior_lineage_hash:e.prior_lineage_hash??
    e.provenance?.continuity_spine?.prior_lineage_hash??null,
  })));
  if(!result.valid)fail('UPGRADE_DRAFT_RECEIPT_CONTINUITY_CHAIN_INVALID');
  return history;
 };
 return {goal,spine,store,read};
}
const receiptEventId=(work,sha,warrant)=>
 continuityUuidFromSource('governed-upgrade-draft:'+work+':'+sha+':'+warrant);
function trustDraft({dispatch,source,session,conversationId,workId}){
 const plan=source;
 if(dispatch?.status!=='DRAFT_PR_VERIFIED_AND_RESERVATION_SETTLED'||
    dispatch?.draft_pr_verified!==true||
    dispatch?.reservation_status!=='VERIFIED'||
    dispatch?.provider_action_performed!==true||
    dispatch?.independent_post_pr_ci_verified!==false||
    dispatch?.capability_promoted!==false||
    dispatch?.original_job_resumed!==false||
    dispatch?.original_job_completed!==false||
    dispatch?.original_work_id!==workId||
    dispatch?.original_continuity_root_id!==plan.originalWorkItem?.continuity_root_id||
    dispatch?.original_worldline_id!==plan.originalWorkItem?.worldline_id||
    dispatch?.verification_hash!==plan.verifiedExperiment?.verification_hash||
    dispatch?.candidate_hash!==plan.evidence_warrant?.candidate_sha256||
    dispatch?.warrant_id!==plan.evidence_warrant_id||
    dispatch?.goal_revision!==plan.goal_revision||
    dispatch?.pinned_base_sha!==plan.evidence_warrant?.pinned_base_commit_sha||
    !SHA.test(String(dispatch?.github_commit_sha||''))||
    !/^reality\/build\/build-[a-f0-9]{32}$/.test(String(dispatch.github_branch||''))||
    !Number.isSafeInteger(dispatch?.github_pr_number)||
    dispatch.github_pr_number<1||
    dispatch.github_pr_url!==
      'https://github.com/maloney2323/Reality/pull/'+dispatch.github_pr_number||
    source.owner_id!==session.user_id||
    source.conversation_id!==conversationId||
    source.original_work_id!==workId||
    source.persisted_and_reobserved!==true)
  fail('UPGRADE_DRAFT_RECEIPT_EXACT_VERIFIED_DISPATCH_REQUIRED');
 return Object.freeze({
  version:OWNER_UPGRADE_DRAFT_RECEIPT_VERSION,
  owner_id:session.user_id,conversation_id:conversationId,
  original_work_id:workId,original_goal_id:source.original_goal_id,
  goal_revision:source.goal_revision,
  candidate_sha256:dispatch.candidate_hash,
  verification_hash:dispatch.verification_hash,
  warrant_id:source.evidence_warrant_id,
  pinned_base_sha:dispatch.pinned_base_sha,
  github_pr_number:dispatch.github_pr_number,
  github_pr_url:dispatch.github_pr_url,
  github_branch:dispatch.github_branch,
  github_commit_sha:dispatch.github_commit_sha,
  reservation_status:'VERIFIED',draft_pr_verified:true,
  production_merge_authorized:false,capability_installed:false,
  original_job_completed:false,
 });
}
function validateEvent(e,scope,workId,session,conversationId){
 return Boolean(e?.entity_type==='personal_upgrade_draft_pr_verified'&&
   e.epistemic_status==='VERIFIED'&&
   e.event_kind==='WORK'&&
   e.continuity_root_id===scope.spine.continuity_root_id&&
   e.worldline_id===scope.spine.worldline_id&&
   e.provenance?.source===OWNER_UPGRADE_DRAFT_RECEIPT_VERSION&&
   e.provenance?.principal_id===session.user_id&&
   e.provenance?.conversation_id===conversationId&&
   e.payload?.original_work_id===workId&&
   e.payload?.owner_id===session.user_id&&
   e.payload?.conversation_id===conversationId&&
   e.payload?.production_merge_authorized===false&&
   e.payload?.capability_installed===false&&
   e.payload?.original_job_completed===false);
}
export async function saveOwnerUpgradeDraftReceipt({
 session,conversationId,originalWorkId,dispatch,
 env=process.env,loadTrusted=loadAuthenticatedWarrantedUpgrade,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(typeof loadTrusted!=='function')fail('UPGRADE_DRAFT_RECEIPT_TRUSTED_SOURCE_REQUIRED');
 const scope=await context({session,conversationId,originalWorkId,env,readGoal,createPersistence});
 const source=await loadTrusted({session,conversationId,originalWorkId,env});
 if(source.goal_revision!==scope.goal.state.active_goal.last_transition_receipt_id||
    source.original_goal_id!==scope.goal.state.active_goal_id)
  fail('UPGRADE_DRAFT_RECEIPT_GOAL_REVISION_CHANGED');
 const payload=trustDraft({dispatch,source,session,conversationId,workId:originalWorkId});
 const id=receiptEventId(originalWorkId,payload.github_commit_sha,payload.warrant_id);
 const history=await scope.read();
 const exists=history.filter(e=>e.event_id===id);
 if(exists.length>1)fail('UPGRADE_DRAFT_RECEIPT_DUPLICATE');
 if(exists.length){
  if(!validateEvent(exists[0],scope,originalWorkId,session,conversationId)||
     JSON.stringify(exists[0].payload)!==JSON.stringify(payload))
   fail('UPGRADE_DRAFT_RECEIPT_CONFLICT');
  return Object.freeze({...payload,receipt_id:id,durably_recorded:true,
   independently_reobserved:true,already_recorded:true});
 }
 if(history.some(e=>e.entity_type==='personal_upgrade_draft_pr_verified'&&
     e.payload?.original_work_id===originalWorkId))
  fail('UPGRADE_DRAFT_RECEIPT_PRIOR_DIFFERENT_DRAFT_EXISTS');
 const last=history.at(-1);
 if(!last?.event_id||!last.lineage_hash||
    !history.some(e=>e.event_id===source.warrant_receipt_id))
  fail('UPGRADE_DRAFT_RECEIPT_ORIGINAL_WARRANT_CHAIN_REQUIRED');
 const at=new Date().toISOString();
 const node=appendContinuityNode({
  spine:scope.spine,stage:'WORK',entityId:originalWorkId,
  eventId:id,parentEventId:last.event_id,priorLineageHash:last.lineage_hash,
  assertionTime:at,effectiveTime:at,epistemicStatus:'VERIFIED',
  evidenceRefs:[payload.github_pr_url],
  payload,provenance:{source:OWNER_UPGRADE_DRAFT_RECEIPT_VERSION,
   principal_id:session.user_id,conversation_id:conversationId},
 });
 await scope.store.appendEvent({...node,entity_type:'personal_upgrade_draft_pr_verified'});
 const confirmed=await scope.read();
 const saved=confirmed.find(e=>e.event_id===id);
 if(!validateEvent(saved,scope,originalWorkId,session,conversationId)||
    saved.parent_event_id!==last.event_id||
    JSON.stringify(saved.payload)!==JSON.stringify(payload))
  fail('UPGRADE_DRAFT_RECEIPT_PROVIDER_READBACK_FAILED');
 return Object.freeze({...payload,receipt_id:id,durably_recorded:true,
  independently_reobserved:true,already_recorded:false});
}
export async function loadAuthenticatedVerifiedUpgradeDraftReceipt({
 session,conversationId,originalWorkId,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 const scope=await context({session,conversationId,originalWorkId,env,readGoal,createPersistence});
 const history=await scope.read();
 const current=history.filter(e=>e.entity_type==='personal_upgrade_draft_pr_verified'&&
  e.payload?.original_work_id===originalWorkId);
 if(current.length!==1||!validateEvent(current[0],scope,originalWorkId,session,conversationId))
  fail('UPGRADE_DRAFT_RECEIPT_OWNER_DURABLE_SOURCE_MISSING');
 const e=current[0];
 if(e.payload.goal_revision!==scope.goal.state.active_goal.last_transition_receipt_id||
    e.payload.original_goal_id!==scope.goal.state.active_goal_id||
    !SHA.test(String(e.payload.github_commit_sha||''))||
    !SHA.test(String(e.payload.pinned_base_sha||''))||
    !HASH.test(String(e.payload.candidate_sha256||''))||
    !HASH.test(String(e.payload.verification_hash||''))||
    typeof e.payload.warrant_id!=='string'||
    !e.payload.warrant_id.startsWith('warrant:')||
    e.payload.reservation_status!=='VERIFIED'||e.payload.draft_pr_verified!==true||
    e.payload.github_pr_url!==
     'https://github.com/maloney2323/Reality/pull/'+e.payload.github_pr_number||
    !/^reality\/build\/build-[a-f0-9]{32}$/.test(String(e.payload.github_branch||'')))
  fail('UPGRADE_DRAFT_RECEIPT_SCOPE_OR_EVIDENCE_CHANGED');
 return Object.freeze({...e.payload,receipt_id:e.event_id,
  durably_recorded:true,independently_reobserved:true});
}
