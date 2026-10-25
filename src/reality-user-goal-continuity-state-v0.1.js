// Source-linked user-goal CONTINUITY projection. Not a second truth database,
// intent classifier, authority gateway, or keyword-based detector.
// The existing Continuity spine owns durable events. Only authenticated user
// utterances can create goal evidence; previous assistant answers never do.
// Statuses remain unresolved until a meaning-aware, source-bound lifecycle
// reconciliation proves a specific user-authorized transition.
import {createHash} from 'node:crypto';
export const USER_GOAL_CONTINUITY_STATE_VERSION='reality-user-goal-continuity-state-v0.1';
const hash=x=>'goal:'+createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,32);
const has=x=>typeof x==='string'&&x.trim().length>0;
const deepFreeze=x=>{
 if(x&&typeof x==='object'){for(const v of Object.values(x))deepFreeze(v);Object.freeze(x);}
 return x;
};
function accept(r,root,world){
 return r?.version===USER_GOAL_CONTINUITY_STATE_VERSION &&
  r.continuity_root_id===root&&r.world_id===(world||null)&&
  Array.isArray(r.user_goal_evidence)&&r.user_goal_evidence.length<=24&&
  r.user_goal_evidence.every(x=>has(x.source_ref)&&has(x.text)&&has(x.goal_evidence_id)&&
   x.source_role==='USER_CHANNEL_UTTERANCE'&&
   x.lifecycle_status==='REQUIRES_SEMANTIC_RECONCILIATION');
}
export function buildUserGoalContinuityState({
 continuityRootId,worldId=null,verifiedConversationTurns=null,
 currentUserMessage,currentUserSourceRef,priorState=null,
 conversationHistoryMayBeIncomplete=false,
}={}){
 if(!has(continuityRootId)||!has(currentUserMessage)||!has(currentUserSourceRef))
  throw Error('USER_GOAL_CONTINUITY_SOURCE_REQUIRED');
 if(verifiedConversationTurns!==null&&(
  !Array.isArray(verifiedConversationTurns)||verifiedConversationTurns.length>240||
  verifiedConversationTurns.some(x=>!['user','assistant'].includes(x?.role)||
   !has(x.text)||!has(x.source_ref))))
  throw Error('USER_GOAL_CONTINUITY_UNTRUSTED_HISTORY');
 // An invalid, unrelated or cross-world snapshot is never reused.
 if(priorState!==null&&!accept(priorState,continuityRootId,worldId))
  throw Error('USER_GOAL_CONTINUITY_PRIOR_STATE_INVALID');
 const authorized=verifiedConversationTurns!==null;
 const before=priorState?.user_goal_evidence||[];
 const records=new Map();
 for(const x of before)records.set(x.source_ref,{...x});
 // No client-provided semantic labels. All user turns, regardless of topic,
 // are kept as interpretations to reconcile, not automatically new goals.
 if(authorized){
  for(const turn of verifiedConversationTurns){
   if(turn.role!=='user')continue;
   if(!records.has(turn.source_ref)){
    records.set(turn.source_ref,{
     goal_evidence_id:hash([continuityRootId,worldId,turn.source_ref]),
     source_ref:turn.source_ref,text:turn.text.slice(0,700),
     source_role:'USER_CHANNEL_UTTERANCE',
     lifecycle_status:'REQUIRES_SEMANTIC_RECONCILIATION',
     asserts_external_truth:false,
     grants_execution_authority:false,
    });
   }
  }
 }
 const candidate={
  goal_evidence_id:hash([continuityRootId,worldId,currentUserSourceRef]),
  source_ref:currentUserSourceRef,text:currentUserMessage.slice(0,700),
  // Current input originates from current authenticated channel for the
  // server pathway; without trusted prior history, mark reduced coverage.
  source_role:'USER_CHANNEL_UTTERANCE',
  lifecycle_status:'REQUIRES_SEMANTIC_RECONCILIATION',
  asserts_external_truth:false,
  grants_execution_authority:false,
 };
 records.set(candidate.source_ref,candidate);
 const all=[...records.values()];
 // Keep the original user objective candidate and the last 23 user turns.
 // Prior Continuity snapshots carry the original even after chat retrieval
 // truncates; no assistant-origin text can replace that anchor.
 const original=priorState?.original_user_goal_evidence_id?
  all.find(x=>x.goal_evidence_id===priorState.original_user_goal_evidence_id):
  all[0];
 if(!original)throw Error('USER_GOAL_CONTINUITY_EMPTY_SOURCE');
 const max=24;
 const tail=all.filter(x=>x.goal_evidence_id!==original.goal_evidence_id).slice(-(max-1));
 const retained=[original,...tail];
 return deepFreeze({
  version:USER_GOAL_CONTINUITY_STATE_VERSION,
  continuity_root_id:continuityRootId,world_id:worldId||null,
  original_user_goal_evidence_id:original.goal_evidence_id,
  original_user_goal_source_ref:original.source_ref,
  original_user_goal_candidate:original.text,
  current_user_evidence_id:candidate.goal_evidence_id,
  user_goal_evidence:retained,
  user_turn_evidence_seen_lower_bound:Math.max(all.length,priorState?.user_turn_evidence_seen_lower_bound||0),
  source_history_truncated:Boolean(conversationHistoryMayBeIncomplete)||
   Boolean(priorState?.source_history_truncated)||!authorized,
  goal_evidence_records_omitted_at_least:Math.max(0,all.length-retained.length,
   priorState?.goal_evidence_records_omitted_at_least||0),
  // Crucial: neither the intake classifier nor model suggestions get to
  // change these lifecycle states by silently inferring user approval.
  active_goals:[],
  temporarily_suspended_goals:[],
  completed_goals:[],
  superseded_goals:[],
  unresolved_user_goal_transitions:retained.map(x=>x.goal_evidence_id),
  lifecycle_reconciliation_status:'USER_INTENT_TRANSITIONS_NOT_SEMANTICALLY_RECONCILED',
  active_goal_claimed_verified:false,
  assistant_suggestions_can_change_goal:false,
  external_actions_authorized:false,
  independently_verified_goal_alignment:false,
 });
}
export function recoverPriorUserGoalState({
 continuityHistory,continuityRootId,worldId=null,
}={}){
 if(!Array.isArray(continuityHistory))throw Error('USER_GOAL_HISTORY_REQUIRED');
 // Append-only verified Continuity history, not text supplied in the
 // current request. Find newest canonical frame with same root and world.
 for(let i=continuityHistory.length-1;i>=0;i--){
  const event=continuityHistory[i];
  const frame=event?.payload?.frame;
  if(event?.payload?.event_type!=='CANONICAL_EPISTEMIC_FRAME')continue;
  if(!frame||frame.continuity_root_id!==continuityRootId||
    frame.world_id!==(worldId||null))continue;
  const state=frame.user_goal_continuity_state;
  if(!state)continue;
  if(!accept(state,continuityRootId,worldId))
   throw Error('USER_GOAL_DURABLE_STATE_INVALID');
  return state;
 }
 return null;
}
