// One source- and time-linked epistemic contract for Reality's active turn.
// This is a canonical PROJECTION of existing Signal Cleaner + source-attested
// Continuity, not a new truth database, automatic semantic merger, or new guardrail.
import {createHash} from 'node:crypto';
export const CANONICAL_EPISTEMIC_FRAME_VERSION='reality-canonical-epistemic-frame-v0.1';
const sha=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const copy=x=>JSON.parse(JSON.stringify(x));
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
export function buildCanonicalEpistemicFrame({
 governedSignal,conversationContinuity,sourceAttestedSnapshot=null,
 userGoalContinuityState=null,userGoalLifecycle=null,userGoalStateContract=null,
 worldId=null,continuityRootId,observedAt,historyMayBeIncomplete=false,
}={}){
 if(!governedSignal?.packet?.packet_id||!nonempty(continuityRootId)||
    !Number.isFinite(Date.parse(observedAt))||
    !conversationContinuity?.conversation_evidence)
  throw Error('CANONICAL_EPISTEMIC_FRAME_INPUT_REQUIRED');
 const reports=conversationContinuity.conversation_evidence;
 if(!Array.isArray(reports.candidates)||reports.candidates.length>40||
    !['NOT_AVAILABLE','PROJECTED_TYPED_UNVERIFIED_REPORTS',
      'BOUNDED_CANDIDATES_EARLIER_RECORDS_OMITTED'].includes(reports.status))
  throw Error('CANONICAL_EPISTEMIC_CANDIDATES_INVALID');
 const seen=new Set();
 const reported_claims=reports.candidates.map(c=>{
  if(!nonempty(c.source_ref)||!nonempty(c.clause_id)||
     !nonempty(c.exact_user_text)||
     !Array.isArray(c.epistemic_modalities)||
     !c.epistemic_modalities.some(m=>['HEARSAY','UNCERTAIN'].includes(m)))
    throw Error('CANONICAL_EPISTEMIC_UNTRUSTED_CLAIM');
  const claim_id=sha([c.source_ref,c.clause_id]);
  if(seen.has(claim_id))throw Error('CANONICAL_EPISTEMIC_DUPLICATE_CLAIM');
  seen.add(claim_id);
  return {
   claim_id,source_ref:c.source_ref,clause_id:c.clause_id,
   exact_source_text:String(c.exact_user_text).slice(0,600),
   source_modalities:[...c.epistemic_modalities],
   epistemic_status:'REPORTED_OR_UNCERTAIN_NOT_INDEPENDENTLY_VERIFIED',
   source_is_evidence_of_utterance_only:true,
   factual_status:'UNKNOWN_UNTIL_INDEPENDENTLY_ATTESTED',
   action_authority:false,
  };
 });
 const obligations=(conversationContinuity.older_user_conditions||[]).slice(0,16)
  .map(c=>({
    source_ref:c.source_ref,exact_source_text:String(c.exact_user_text||'').slice(0,500),
    epistemic_status:'USER_CONDITION_CANDIDATE_NOT_RECONCILED',
    external_action_authority:false,
  }));
 const sourced=(sourceAttestedSnapshot?.facts||[]).slice(0,60).map(f=>{
  if(!nonempty(f.key)||!nonempty(f.evidence_ref)||!nonempty(sourceAttestedSnapshot?.world_id))
    throw Error('CANONICAL_EPISTEMIC_ATTESTED_SOURCE_INVALID');
  return {
   key:f.key,value:copy(f.value),source_receipt_id:f.evidence_ref,
   world_id:sourceAttestedSnapshot.world_id,
   epistemic_status:'SOURCE_ATTESTED_RECORD',
   supersession_must_be_reconciled:true,
  };
 });
 if(worldId&&sourceAttestedSnapshot?.world_id&&
   sourceAttestedSnapshot.world_id!==worldId)
  throw Error('CANONICAL_EPISTEMIC_CROSS_WORLD_FACT');
 if(userGoalStateContract&&(
    userGoalStateContract.goal_id!==userGoalLifecycle?.working_goal?.goal_evidence_id||
    userGoalStateContract.provenance?.origin_turn_id!==userGoalLifecycle?.working_goal?.source_ref||
    userGoalStateContract.source_user_authorization_verified!==false||
    userGoalStateContract.permits_external_execution!==false))
   throw Error('CANONICAL_GOAL_STATE_SOURCE_OR_AUTHORITY_INVALID');
 if(userGoalLifecycle&&(
    userGoalLifecycle.action_execution_authorized!==false||
    userGoalLifecycle.user_intent_semantically_verified!==false||
    userGoalLifecycle.permanent_goal_supersession_proven!==false))
   throw Error('CANONICAL_GOAL_LIFECYCLE_UNVERIFIED_AUTHORITY');
 if(userGoalContinuityState&&(
  userGoalContinuityState.continuity_root_id!==continuityRootId||
  userGoalContinuityState.world_id!==(worldId||null)||
  userGoalContinuityState.active_goal_claimed_verified!==false||
  userGoalContinuityState.external_actions_authorized!==false))
  throw Error('CANONICAL_GOAL_CONTINUITY_SCOPE_OR_AUTHORITY_INVALID');
 const incomplete=Boolean(historyMayBeIncomplete)||
  reports.status==='BOUNDED_CANDIDATES_EARLIER_RECORDS_OMITTED'||
  conversationContinuity.older_coverage==='BOUNDED_SOURCE_HISTORY_MORE_AVAILABLE'||
  conversationContinuity.history_source==='NOT_ATTESTED';
 const raw={
  version:CANONICAL_EPISTEMIC_FRAME_VERSION,
  continuity_root_id:continuityRootId,world_id:worldId||null,
  current_user_packet_id:governedSignal.packet.packet_id,
  system_as_of:new Date(observedAt).toISOString(),
  source_history_scope:conversationContinuity.history_source,
  prior_message_count:conversationContinuity.source_message_count||0,
  history_incomplete:incomplete,
  history_coverage:incomplete?'PARTIAL_OR_NOT_ATTESTED':'BOUNDED_SOURCE_LINKED',
  reported_claim_count_all_available:reports.total_candidates||0,
  // One frozen source projection shared by cognition and the reviewer; no separate parser.
  conversation_evidence:copy(reports),
  user_goal_trajectory:conversationContinuity.user_goal_trajectory?
    copy(conversationContinuity.user_goal_trajectory):null,
  // Canonical projection of user-channel goal evidence, retained from the
  // existing append-only Continuity ledger; lifecycle status is NOT inferred.
  user_goal_continuity_state:userGoalContinuityState?copy(userGoalContinuityState):null,
  user_goal_lifecycle_projection:userGoalLifecycle?copy(userGoalLifecycle):null,
  user_goal_state_contract:userGoalStateContract?copy(userGoalStateContract):null,
  reported_claims,unresolved_user_conditions:obligations,
  source_attested_facts:sourced,
  fact_reconciliation_policy:'NO_STATUS_PROMOTION_WITHOUT_AUTHENTICATED_SOURCE_RECEIPT',
  semantic_identity_resolution:'NOT_INFERRED_FROM_SIMILAR_WORDING',
  execution_authorized:false,
  independently_verified_answer_correctness:false,
 };
 return freeze({...raw,frame_hash:sha(raw)});
}
export async function recordCanonicalEpistemicFrame({
 frame,continuityRuntime,observedAt=frame?.system_as_of,
}={}){
 if(!frame?.frame_hash||frame.version!==CANONICAL_EPISTEMIC_FRAME_VERSION)
  throw Error('CANONICAL_EPISTEMIC_FRAME_REQUIRED');
 if(!continuityRuntime?.enabled||typeof continuityRuntime?.appendStage!=='function'||
    typeof continuityRuntime?.readback!=='function')
  return Object.freeze({status:'FRAME_NOT_DURABLY_ATTESTED',
   frame_hash:frame.frame_hash,source_receipt_id:null});
 if(frame.continuity_root_id!==continuityRuntime.spine.continuity_root_id)
  throw Error('CANONICAL_EPISTEMIC_ROOT_MISMATCH');
 const event=await continuityRuntime.appendStage({
  stage:'OBSERVATION',
  entityId:'canonical-epistemic:'+frame.current_user_packet_id,
  eventId:'canonical-epistemic:'+frame.continuity_root_id+':'+frame.current_user_packet_id,
  epistemicStatus:'UNVERIFIED',
  observedAt,
  payload:{
   event_type:'CANONICAL_EPISTEMIC_FRAME',
   frame,frame_hash:frame.frame_hash,
   independent_external_truth_not_promoted:true,
   execution_authorized:false,
  },
  provenance:{source:'reality_existing_signal_cleaner_and_source_attested_continuity'},
 });
 const history=await continuityRuntime.readback();
 const match=history.find(x=>x.event_id===event.event_id&&
   x.payload?.frame_hash===frame.frame_hash&&
   x.payload?.frame?.frame_hash===frame.frame_hash&&
   x.payload?.event_type==='CANONICAL_EPISTEMIC_FRAME');
 if(!match)throw Error('CANONICAL_EPISTEMIC_FRAME_READBACK_UNVERIFIED');
 return Object.freeze({status:'PERSISTED_AND_READBACK_VERIFIED',
   frame_hash:frame.frame_hash,source_receipt_id:event.event_id});
}
