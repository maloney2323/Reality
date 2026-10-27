// Gap 3: authenticate → server re-observe → exact approval → atomic lease
// → one provider effect → independent provider readback → Continuity outcome.
// Preview only. NO background dispatch. RUN requires a fresh user click.
import {runRealityStewardshipPass} from './reality-stewardship-pass-v1.0.js';
import {trustedDiscovery,listPersonalDiscoveredWorkHandoffs}
 from './reality-personal-discovered-work-handoff-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {bindWorkToAuthenticatedGoal} from './reality-execution-goal-grounding-v0.1.js';
import {issuePersonalWorkGroundingProof} from './reality-personal-work-grounding-proof-v0.1.js';
import {prepareAuthenticatedPersonalExecution}
 from './reality-personal-execution-admission-service-v0.1.js';
import {reserveAuthenticatedPersonalExecution}
 from './reality-personal-execution-reservation-service-v0.1.js';
import {executeAuthorizedWork}
 from './reality-governed-execution-engine-v0.1.js';
import {fingerprintApprovedWorkItem} from './reality-authority-v1.0.js';
import {createPersonalGithubIssueBridge,checkForExistingMaintainerIssue,
 assertExactMaintainerIssue} from './reality-personal-github-execution-bridge-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';

export const PERSONAL_ISSUE_DISPATCH_VERSION='reality-personal-issue-dispatch-v0.1';
const fail=code=>{throw Error(code)};
export function assertPersonalDispatchEnvironment({session,conversationId,env}={}){
 if(env?.VERCEL_ENV!=='preview'||env?.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
  !validUuid(session?.user_id)||!validUuid(conversationId))
  fail('PERSONAL_DISPATCH_SIGNED_IN_DURABLE_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session?.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('PERSONAL_DISPATCH_ISOLATED_DATABASE_BOUNDARY_INVALID');
 return db;
}
// A fresh approval NEVER authorizes re-trying a prior provider attempt,
// including when a new Actions run changes its discovered work_id.
// Compare stable workflow failure key as well as the exact work source ID.
export function assertNoPriorPersonalIssueAttempt({
 history=[],discoveredWorkId,workKey,
}={}){
 if(!/^work:[a-f0-9]{32}$/.test(String(discoveredWorkId||''))||
  typeof workKey!=='string'||!workKey.startsWith('workflow-failure:'))
  fail('PERSONAL_DISPATCH_PREVIOUS_ATTEMPT_SCOPE_INVALID');
 const related=new Set([discoveredWorkId]);
 for(const event of history){
  if(event.entity_type==='personal_discovered_work_handoff'&&
     event.payload?.work_key===workKey&&
     /^work:[a-f0-9]{32}$/.test(String(event.payload?.work_id||'')))
   related.add(event.payload.work_id);
 }
 if(history.some(event=>
    event.entity_type==='personal_issue_execution_outcome'&&
    related.has(event.payload?.work_id)))
  fail('PERSONAL_DISPATCH_PREVIOUS_ATTEMPT_RECONCILIATION_REQUIRED_NO_RETRY');
 return true;
}
export async function ensureNoPriorPersonalIssueAttempt({
 session,conversationId,env,discoveredWorkId,workKey,
 persistenceFactory=createUniversePostgresPersistence,
}={}){
 const db=assertPersonalDispatchEnvironment({session,conversationId,env});
 const {personalGoalScope}=await import('./reality-personal-goal-readback-v0.1.js');
 const scope=personalGoalScope({userId:session.user_id,conversationId});
 const spine=createContinuitySpine({
  continuityRootId:scope.root,worldlineId:scope.worldline,
  subjectId:session.user_id,
 });
 const events=orderContinuityHistory(await persistenceFactory({...db}).reconstruct({
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id,
 }));
 return assertNoPriorPersonalIssueAttempt({
  history:events,discoveredWorkId,workKey,
 });
}
export async function preparePersonalIssueDispatch({
 session,conversationId,discoveredWorkId,env=process.env,
 discover=runRealityStewardshipPass,
 listHandoffs=listPersonalDiscoveredWorkHandoffs,
 readGoal=readFreshPersonalGoalState,
 prepare=prepareAuthenticatedPersonalExecution,
 issueProof=issuePersonalWorkGroundingProof,
 ensureNoPrior=ensureNoPriorPersonalIssueAttempt,
}={}){
 assertPersonalDispatchEnvironment({session,conversationId,env});
 if(!/^work:[a-f0-9]{32}$/.test(String(discoveredWorkId||'')))
  fail('PERSONAL_DISPATCH_WORK_ID_INVALID');
 // A browser-selected ID is NOT an executable work item. Re-run provider
 // discovery on the server and check the exact persisted source receipt.
 const observed=await discover({owner:'maloney2323',repo:'Reality'});
 const source=observed?.work?.find(x=>x.work_id===discoveredWorkId);
 if(!source)fail('PERSONAL_DISPATCH_SOURCE_CHANGED_REPREPARE');
 const workItem=assertExactMaintainerIssue(trustedDiscovery(source));
 const fingerprint=fingerprintApprovedWorkItem(workItem);
 const prior=await listHandoffs({session,conversationId,env});
 const saved=prior?.items?.find(x=>
  x.work_id===discoveredWorkId&&x.work_fingerprint===fingerprint&&
  x.goal_still_current===true&&validUuid(x.continuity_receipt_id));
 if(!saved)fail('PERSONAL_DISPATCH_DURABLE_SOURCE_AND_GOAL_RECEIPT_REQUIRED');
 // A prior UNRESOLVED or VERIFIED provider attempt must be reconciled,
 // never bypassed by new owner approval or changing discovery observations.
 await ensureNoPrior({
  session,conversationId,env,discoveredWorkId,
  workKey:source.work_key,
 });
 const latest=await readGoal({session,conversationId,env});
 if(latest.principal_id!==session.user_id||latest.conversation_id!==conversationId)
  fail('PERSONAL_DISPATCH_AUTHENTICATED_GOAL_READBACK_REQUIRED');
 const binding=bindWorkToAuthenticatedGoal({
  workItem,authoritativeState:latest.state,
  serverVerifiedPrincipalId:session.user_id,
 });
 if(binding.status!=='BOUND_FOR_FRESHNESS_CHECK')
  fail(binding.reason||'PERSONAL_DISPATCH_ACTIVE_USER_GOAL_REQUIRED');
 const groundingProof=issueProof({
  binding,conversationId,principalId:session.user_id,env,
 });
 // Reads approved policy from isolated Supabase and issues fresh server-only
 // action + goal attestations, both scoped to the exact work fingerprint.
 const admitted=await prepare({
  session,conversationId,workItem,groundingProof,env,
 });
 if(admitted.status!=='GOAL_AND_ACTION_ADMITTED_PENDING_EXECUTION_LEASE'||
  admitted.work_item_fingerprint!==fingerprint||
  admitted.goal_id!==binding.goal_id||
  !admitted.internal?.serverApprovalProof||
  !admitted.internal?.serverFreshGoalAdmission||
  !admitted.internal?.authorization)
  fail('PERSONAL_DISPATCH_FRESH_ADMISSION_NOT_VERIFIED');
 return Object.freeze({status:'EXACT_SOURCE_AND_USER_APPROVAL_ADMITTED',
  work_item:workItem,source_receipt_id:saved.continuity_receipt_id,
  goal_id:binding.goal_id,work_fingerprint:fingerprint,
  action_policy_id:admitted.action_policy_id,
  internal:{groundingProof,admitted},
  external_action_performed:false});
}
export async function recordPersonalIssueExecutionOutcome({
 session,conversationId,workId,sourceReceiptId,goalId,reservationId,
 executionResult,env=process.env,
 persistenceFactory=createUniversePostgresPersistence,
}={}){
 const db=assertPersonalDispatchEnvironment({session,conversationId,env});
 if(!/^work:[a-f0-9]{32}$/.test(String(workId||''))||
  !validUuid(sourceReceiptId)||!validUuid(reservationId))
  fail('PERSONAL_DISPATCH_OUTCOME_ID_INVALID');
 const {personalGoalScope}=await import('./reality-personal-goal-readback-v0.1.js');
 const scope=personalGoalScope({userId:session.user_id,conversationId});
 const spine=createContinuitySpine({
  continuityRootId:scope.root,worldlineId:scope.worldline,
  subjectId:session.user_id,
 });
 const store=persistenceFactory({...db});
 const history=orderContinuityHistory(await store.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id,
 }));
 if(!history.some(x=>x.event_id===sourceReceiptId&&
   x.payload?.work_id===workId&&
   x.entity_type==='personal_discovered_work_handoff'))
  fail('PERSONAL_DISPATCH_SOURCE_EVENT_LINEAGE_MISSING');
 const tail=history.at(-1);
 if(!tail?.lineage_hash)fail('PERSONAL_DISPATCH_CONTINUITY_TAIL_MISSING');
 const eid=continuityUuidFromSource('personal-issue-execution-outcome:'+reservationId);
 if(history.some(x=>x.event_id===eid))
  fail('PERSONAL_DISPATCH_OUTCOME_ALREADY_RECORDED_NO_REPLAY');
 const verified=executionResult?.status==='VERIFIED'&&
  executionResult.outcome?.verified===true&&
  executionResult.verification?.independent===true&&
  executionResult.reservation_settlement?.status==='VERIFIED';
 const payload={
  version:PERSONAL_ISSUE_DISPATCH_VERSION,
  work_id:workId,goal_id:goalId,source_receipt_id:sourceReceiptId,
  reservation_id:reservationId,
  execution_id:executionResult?.execution?.execution_id||null,
  provider_issue_number:executionResult?.verification?.observedState?.issue_number||null,
  provider_issue_url:executionResult?.verification?.observedState?.issue_url||null,
  provider_failure_stage:executionResult?.provider_failure_stage||null,
  provider_failure_code:executionResult?.provider_failure_code||null,
  unverified_provider_issue_number:executionResult?.unverified_provider_claim?.issue_number||null,
  external_action_attempted:['EXECUTED','OUTCOME_UNCERTAIN'].includes(
   executionResult?.execution?.execution_state),
  outcome_state:verified?'VERIFIED_OUTCOME':'UNRESOLVED',
  independently_verified:verified,
  reservation_state:executionResult?.reservation_settlement?.status||
   executionResult?.reservation_state||'NOT_SETTLED',
  no_automatic_retry:true,
 };
 const at=new Date().toISOString();
 const node=appendContinuityNode({
  spine,stage:'OUTCOME',entityId:workId,eventId:eid,
  parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
  effectiveTime:at,assertionTime:at,epistemicStatus:verified?'VERIFIED':'UNKNOWN',
  evidenceRefs:verified?[payload.provider_issue_url]:[],
  payload,provenance:{source:PERSONAL_ISSUE_DISPATCH_VERSION,
   principal_id:session.user_id,conversation_id:conversationId},
 });
 await store.appendEvent({...node,entity_type:'personal_issue_execution_outcome'});
 const confirmed=orderContinuityHistory(await store.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id,
 }));
 const saved=confirmed.find(x=>x.event_id===eid);
 if(!saved||saved.parent_event_id!==tail.event_id||
  saved.payload?.reservation_id!==reservationId||
  saved.payload?.work_id!==workId||
  saved.payload?.outcome_state!==payload.outcome_state)
  fail('PERSONAL_DISPATCH_OUTCOME_READBACK_NOT_VERIFIED');
 return Object.freeze({receipt_id:eid,independently_verified:verified,
  outcome_state:payload.outcome_state,provider_issue_url:payload.provider_issue_url,
  failure_stage:payload.provider_failure_stage,
  failure_code:payload.provider_failure_code,
  unverified_provider_issue_number:payload.unverified_provider_issue_number});
}
export async function runPersonalIssueDispatch({
 session,conversationId,discoveredWorkId,
 confirmation,env=process.env,
 prepare=preparePersonalIssueDispatch,
 reserve=reserveAuthenticatedPersonalExecution,
 execute=executeAuthorizedWork,
 bridgeFactory=createPersonalGithubIssueBridge,
 checkDuplicate=checkForExistingMaintainerIssue,
 recordOutcome=recordPersonalIssueExecutionOutcome,
}={}){
 assertPersonalDispatchEnvironment({session,conversationId,env});
 if(confirmation!=='EXECUTE_THIS_ONE_EXACT_APPROVED_GITHUB_ISSUE')
  fail('PERSONAL_DISPATCH_NEW_EXPLICIT_EXECUTION_CONFIRMATION_REQUIRED');
 // No credential, no reservation, no attempt. Never use a production token
 // or the ChatGPT GitHub plugin as a hidden credential fallback.
 if(typeof env.REALITY_GITHUB_TOKEN!=='string'||!env.REALITY_GITHUB_TOKEN.trim())
  fail('PERSONAL_DISPATCH_PREVIEW_GITHUB_WRITE_CREDENTIAL_REQUIRED');
 const ready=await prepare({session,conversationId,discoveredWorkId,env});
 await checkDuplicate(ready.work_item);
 const granted=await reserve({
  session,conversationId,workItem:ready.work_item,
  groundingProof:ready.internal.groundingProof,env,
 });
 if(granted.status!=='SINGLE_USE_RESERVED_PENDING_DISPATCH'||
  granted.action_policy_id!==ready.action_policy_id||
  granted.work_item_fingerprint!==ready.work_fingerprint||
  !validUuid(granted.reservation_id)||!granted.internal?.store||
  !granted.internal?.reservation)
  fail('PERSONAL_DISPATCH_ATOMIC_LEASE_NOT_VERIFIED');
 const bridges=bridgeFactory();
 let result;
 try{
  result=await execute({
   workItem:ready.work_item,workflowId:ready.work_item.workflow_id,
   authorization:granted.internal.authorization,
   serverApprovalProof:granted.internal.serverApprovalProof,
   serverFreshGoalAdmission:granted.internal.serverFreshGoalAdmission,
   serverSingleUseReservation:granted.internal.reservation,
   reservationStore:granted.internal.store,
   connector:bridges.connector,independentVerifier:bridges.independentVerifier,
   requestSummary:'One explicitly authorized source-backed Reality tracking issue',
   requestFingerprint:ready.work_fingerprint,
  });
 }catch{
  // After obtaining a one-time reservation, a broken adapter may leave the
  // provider result unknown. Stop, reconcile and never auto-retry.
  return Object.freeze({status:'UNRESOLVED',
   reason:'PERSONAL_DISPATCH_PROVIDER_EFFECT_UNCERTAIN_NO_RETRY',
   reservation_id:granted.reservation_id,verified:false,
   external_action_may_have_occurred:true,no_automatic_retry:true});
 }
 if(result.status==='BLOCKED')
  return Object.freeze({status:'BLOCKED',reason:result.blocked_reason,
   reservation_id:granted.reservation_id,no_automatic_retry:true,
   external_action_performed:false});
 // A successful provider read-back alone cannot claim a durable result.
 // After reservation settlement, independently persist and re-read outcome.
 try{
  const outcome=await recordOutcome({
   session,conversationId,workId:discoveredWorkId,env,
   sourceReceiptId:ready.source_receipt_id,
   goalId:ready.goal_id,reservationId:granted.reservation_id,
   executionResult:result,
  });
  return Object.freeze({
   status:outcome.independently_verified?'VERIFIED':'UNRESOLVED',
   work_id:discoveredWorkId,reservation_id:granted.reservation_id,
   outcome_receipt_id:outcome.receipt_id,
   verified:outcome.independently_verified,
   provider_issue_url:outcome.provider_issue_url,
   provider_failure_stage:outcome.failure_stage||null,
   provider_failure_code:outcome.failure_code||null,
   unverified_provider_issue_number:outcome.unverified_provider_issue_number||null,
   external_action_performed:outcome.independently_verified?true:null,
   external_action_may_have_occurred:!outcome.independently_verified,
   no_automatic_retry:true,
  });
 }catch{
  // The action may already exist. Never auto-repeat to repair bookkeeping.
  return Object.freeze({status:'UNRESOLVED',
   reason:'PERSONAL_DISPATCH_OUTCOME_CONTINUITY_UNCONFIRMED_NO_RETRY',
   reservation_id:granted.reservation_id,
   verified:false,external_action_may_have_occurred:true,
   no_automatic_retry:true});
 }
}
