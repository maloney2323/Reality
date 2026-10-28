// Durable end-of-loop receipt for the SAME original owner work and worldline.
// Only the trusted closure coordinator calls this AFTER separate grants,
// verified installation, active capability and independently observed outcome.
// A settlement is evidence of the independently verified job, not approval.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource,
 validateContinuityChain} from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';

export const OWNER_UPGRADE_JOB_SETTLEMENT_VERSION='reality-owner-upgrade-original-job-settlement-v0.1';
const WORK=/^work:[a-f0-9]{32}$/,SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const fail=x=>{throw Error(x)};
const stable=o=>o===null||typeof o!=='object'?o:
 Array.isArray(o)?o.map(stable):Object.fromEntries(Object.keys(o).sort().map(k=>[k,stable(o[k])]));
const canonical=o=>JSON.stringify(stable(o));
async function open({session,scope,plan,env,readGoal,createPersistence}){
 if(env?.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(scope?.conversationId)||
    !WORK.test(String(scope?.workId||''))||
    scope.ownerId!==session.user_id||
    scope.conversationId!==plan?.conversation_id||
    plan?.owner_id!==session.user_id||
    plan?.original_work_id!==scope.workId||
    plan?.goal_revision!==scope.goalRevision||
    plan?.candidate_sha256!==scope.candidateSha||
    plan?.github_head_sha!==scope.headSha||
    plan?.original_job_completed!==false||
    !HASH.test(String(scope.candidateSha||''))||
    !SHA.test(String(scope.headSha||'')))
  fail('UPGRADE_SETTLEMENT_EXACT_OWNER_SCOPE_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('UPGRADE_SETTLEMENT_OWNER_DATABASE_REQUIRED');
 const goal=await readGoal({session,conversationId:scope.conversationId,env});
 const active=goal?.state?.active_goal;
 if(goal?.principal_id!==session.user_id||
    goal?.conversation_id!==scope.conversationId||
    goal?.state?.active_goal_id!==plan.original_goal_id||
    active?.goal_id!==plan.original_goal_id||
    active?.status!=='ACTIVE'||active?.user_confirmed!==true||
    active?.last_transition_receipt_id!==plan.goal_revision)
  fail('UPGRADE_SETTLEMENT_ORIGINAL_GOAL_CHANGED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==plan.continuity_root_id||
    spine.worldline_id!==plan.worldline_id)
  fail('UPGRADE_SETTLEMENT_ORIGINAL_WORLDLINE_MISMATCH');
 const persistence=createPersistence({...db});
 const read=async()=>{
  const history=orderContinuityHistory(await persistence.reconstruct({
   continuityRootId:spine.continuity_root_id,
   worldlineId:spine.worldline_id,
  }));
  const chain=validateContinuityChain(history.map(e=>({
   ...e,prior_lineage_hash:e.prior_lineage_hash??
    e.provenance?.continuity_spine?.prior_lineage_hash??null,
  })));
  if(!chain.valid)fail('UPGRADE_SETTLEMENT_CONTINUITY_INVALID');
  return history;
 };
 return {read,spine,persistence};
}
function material({scope,plan,installed,active,outcome,session}){
 if(installed?.independent!==true||installed.installed!==true||
    installed.original_work_id!==scope.workId||
    installed.candidate_sha256!==scope.candidateSha||
    installed.head_sha!==scope.headSha||
    !SHA.test(String(installed.merge_commit_sha||''))||
    installed.production_deployment_performed!==false||
    active?.registered!==true||active.runtime_active!==true||
    active?.independently_reobserved!==true||
    active.original_work_id!==scope.workId||
    active.candidate_sha256!==scope.candidateSha||
    active.merge_commit_sha!==installed.merge_commit_sha||
    active.capability_id!==plan.capability_id||
    outcome?.independent!==true||
    outcome.original_job_completed!==true||
    outcome.original_work_id!==scope.workId||
    outcome.work_id!==scope.workId||
    outcome.owner_id!==session.user_id||
    outcome.conversation_id!==scope.conversationId||
    outcome.goal_revision!==scope.goalRevision||
    outcome.original_goal_id!==plan.original_goal_id||
    outcome.capability_sha256!==scope.candidateSha||
    outcome.head_sha!==scope.headSha||
    typeof outcome.execution_receipt_id!=='string'||
    !outcome.execution_receipt_id||outcome.execution_receipt_id.length>240||
    typeof outcome.evidence_ref!=='string'||
    !outcome.evidence_ref||outcome.evidence_ref.length>240)
  fail('UPGRADE_SETTLEMENT_ACTUAL_INSTALL_AND_WORK_REQUIRED');
 return Object.freeze({
  version:OWNER_UPGRADE_JOB_SETTLEMENT_VERSION,
  owner_id:session.user_id,conversation_id:scope.conversationId,
  original_work_id:scope.workId,original_goal_id:plan.original_goal_id,
  goal_revision:scope.goalRevision,
  continuity_root_id:plan.continuity_root_id,worldline_id:plan.worldline_id,
  candidate_sha256:scope.candidateSha,head_sha:scope.headSha,
  capability_id:plan.capability_id,
  merge_commit_sha:installed.merge_commit_sha,
  execution_receipt_id:outcome.execution_receipt_id,
  evidence_ref:outcome.evidence_ref,
  original_job_completed:true,independent:true,
  production_deployment_performed:false,
 });
}
function verifies(ev,payload,session){
 return ev?.entity_type==='personal_original_job_settlement'&&
  ev.event_kind==='OUTCOME'&&ev.epistemic_status==='VERIFIED'&&
  ev.provenance?.source===OWNER_UPGRADE_JOB_SETTLEMENT_VERSION&&
  ev.provenance?.principal_id===session.user_id&&
  ev.payload?.original_work_id===payload.original_work_id&&
  canonical(ev.payload)===canonical(payload);
}
export async function appendVerifiedOwnerUpgradeJobSettlement({
 session,scope,plan,installed,active,outcome,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 const ctx=await open({session,scope,plan,env,readGoal,createPersistence});
 const payload=material({scope,plan,installed,active,outcome,session});
 const history=await ctx.read();
 const id=continuityUuidFromSource('owner-upgrade-job-settlement:'+
  scope.workId+':'+scope.candidateSha+':'+outcome.execution_receipt_id);
 const existing=history.filter(e=>e.entity_type==='personal_original_job_settlement'&&
  e.payload?.original_work_id===scope.workId);
 if(existing.length){
  if(existing.length!==1||existing[0].event_id!==id||
     !verifies(existing[0],payload,session))
   fail('UPGRADE_SETTLEMENT_CONFLICTING_PRIOR_COMPLETION');
  return Object.freeze({receipt_id:id,payload,already_recorded:true});
 }
 // A draft-PR proof and immutable warrant must exist in this exact lineage.
 if(!history.some(e=>e.entity_type==='personal_upgrade_draft_pr_verified'&&
   e.payload?.original_work_id===scope.workId&&
   e.payload?.candidate_sha256===scope.candidateSha&&
   e.payload?.github_commit_sha===scope.headSha)||
    !history.some(e=>e.entity_type==='personal_upgrade_evidence_warrant'&&
     e.payload?.original_work_id===scope.workId))
  fail('UPGRADE_SETTLEMENT_ORIGINAL_APPROVAL_LINEAGE_MISSING');
 const last=history.at(-1);
 if(!last?.event_id||!last.lineage_hash)
  fail('UPGRADE_SETTLEMENT_CONTINUITY_TAIL_INVALID');
 const at=new Date().toISOString();
 const node=appendContinuityNode({
  spine:ctx.spine,stage:'OUTCOME',entityId:scope.workId,
  eventId:id,parentEventId:last.event_id,
  priorLineageHash:last.lineage_hash,assertionTime:at,effectiveTime:at,
  epistemicStatus:'VERIFIED',payload,
  evidenceRefs:[outcome.evidence_ref],
  provenance:{source:OWNER_UPGRADE_JOB_SETTLEMENT_VERSION,
   principal_id:session.user_id,conversation_id:scope.conversationId},
 });
 await ctx.persistence.appendEvent({...node,entity_type:'personal_original_job_settlement'});
 const after=await ctx.read(),saved=after.find(e=>e.event_id===id);
 if(!verifies(saved,payload,session)||saved.parent_event_id!==last.event_id)
  fail('UPGRADE_SETTLEMENT_DURABLE_READBACK_FAILED');
 return Object.freeze({receipt_id:id,payload,already_recorded:false});
}
export async function readVerifiedOwnerUpgradeJobSettlement({
 session,scope,plan,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 const ctx=await open({session,scope,plan,env,readGoal,createPersistence});
 const history=await ctx.read();
 const done=history.filter(e=>e.entity_type==='personal_original_job_settlement'&&
  e.payload?.original_work_id===scope.workId);
 if(done.length!==1)fail('UPGRADE_SETTLEMENT_ORIGINAL_JOB_RECEIPT_MISSING');
 const ev=done[0],p=ev.payload;
 if(!verifies(ev,p,session)||
    p.original_goal_id!==plan.original_goal_id||
    p.goal_revision!==scope.goalRevision||
    p.continuity_root_id!==plan.continuity_root_id||
    p.worldline_id!==plan.worldline_id||
    p.candidate_sha256!==scope.candidateSha||
    p.head_sha!==scope.headSha||
    !p.execution_receipt_id||!p.evidence_ref||
    p.original_job_completed!==true)
  fail('UPGRADE_SETTLEMENT_READBACK_SCOPE_CHANGED');
 return Object.freeze({...p,settlement_receipt_id:ev.event_id,
  independently_reobserved:true});
}
