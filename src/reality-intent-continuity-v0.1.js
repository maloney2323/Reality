// Intent Continuity Contract v0.1
// Observes *possible* human topic shifts without judging a person or silently
// replacing, closing, or authorizing any work item. Pure contract; no IO.
import crypto from 'node:crypto';
import {createUniverseEntry,validateUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';

export const INTENT_CONTINUITY_VERSION='reality-intent-continuity-v0.1';
export const INTENT_RELATIONS=Object.freeze([
 'SAME_OBJECTIVE','RELATED_IDEA','POSSIBLE_DETOUR','PRIORITY_CHANGE_REQUEST','UNCERTAIN'
]);
const FOLLOW_UPS=Object.freeze({
 SAME_OBJECTIVE:'CONTINUE_ORIGINAL_OBJECTIVE',
 RELATED_IDEA:'CAPTURE_LINKED_IDEA_AND_CONTINUE',
 POSSIBLE_DETOUR:'CAPTURE_NEW_WORKSTREAM_CANDIDATE_AND_PRESERVE_ORIGINAL',
 PRIORITY_CHANGE_REQUEST:'OFFER_EXPLICIT_PRIORITY_CHOICE',
 UNCERTAIN:'PRESERVE_CURRENT_OBJECTIVE_AND_ASK_ONLY_IF_MATERIAL',
});
const text=(value,code,max=1000)=>{
 if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(code);
 return value.trim();
};
const optional=(value,max=1000)=>
 typeof value==='string'?value.trim().slice(0,max):'';
const boundedConfidence=x=>Number.isFinite(x)&&x>=0&&x<=1?x:null;
const iso=(value)=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value)||
    !Number.isFinite(Date.parse(value)))throw Error('INTENT_OBSERVED_AT_INVALID');
 return value;
};
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function buildIntentContinuityObservation({
 trustedScope,activeObjective,verifiedCheckpoint=null,userSignal,
 interpretation={},observedAt,
}={}){
 // The caller must supply a server-verified owner/root, not model-provided IDs.
 const root=text(trustedScope?.continuity_root_id,'INTENT_TRUSTED_ROOT_REQUIRED',256);
 const owner=text(trustedScope?.owner_user_id,'INTENT_TRUSTED_OWNER_REQUIRED',256);
 const worldline=text(trustedScope?.worldline_id||'reality:primary','INTENT_WORLDLINE_REQUIRED',256);
 const workId=text(activeObjective?.work_item_id,'INTENT_ACTIVE_WORK_REQUIRED',256);
 const objective=text(activeObjective?.objective,'INTENT_ACTIVE_OBJECTIVE_REQUIRED',4000);
 const state=text(activeObjective?.state,'INTENT_ACTIVE_STATE_REQUIRED',40);
 if(state==='COMPLETED')throw Error('INTENT_ACTIVE_WORK_ALREADY_COMPLETED');
 const signalId=text(userSignal?.source_ref,'INTENT_USER_SIGNAL_REF_REQUIRED',256);
 const turnId=text(userSignal?.turn_id,'INTENT_TURN_ID_REQUIRED',128);
 // Do not use the user/model's suggested root, owner, checkpoint or state.
 const signalExcerpt=optional(userSignal?.text,2000);
 const relation=INTENT_RELATIONS.includes(interpretation?.relation)
  ?interpretation.relation:'UNCERTAIN';
 const confidence=boundedConfidence(interpretation?.confidence);
 const checkpoint=verifiedCheckpoint?.readback_verified===true &&
   typeof verifiedCheckpoint?.entry_id==='string' &&
   /^[0-9a-f]{64}$/.test(verifiedCheckpoint?.ledger_entry_hash||'')
   ?Object.freeze({
      entry_id:text(verifiedCheckpoint.entry_id,'INTENT_CHECKPOINT_ID_REQUIRED',256),
      ledger_entry_hash:verifiedCheckpoint.ledger_entry_hash,
      readback_verified:true,
     }):null;
 const timestamp=iso(observedAt);
 const entryId='reality:intent:observation:'+digest({root,worldline,owner,workId,signalId,turnId});
 const candidate={relation,confidence,reason:optional(interpretation?.reason,500),
   suggested_objective:optional(interpretation?.suggested_objective,700)};
 const payload={
  intent_continuity_version:INTENT_CONTINUITY_VERSION,
  observation_only:true,interpretation_is_tentative:true,
  original_work_item_id:workId,original_objective:objective,original_state:state,
  original_objective_preserved:true,original_obligations_preserved:true,
  verified_checkpoint:checkpoint,
  new_signal:{source_ref:signalId,turn_id:turnId,excerpt:signalExcerpt},
  candidate,
  proposed_follow_up:FOLLOW_UPS[relation],
  confirmed_priority_change:false,
  authorized_transition:false,external_action_executed:false,
  state_mutation_permitted:false,
  // No human drift percentage from a single tentative semantic classification.
  user_drift_rate:null,
 };
 return createUniverseEntry({
  entry_id:entryId,continuity_root_id:root,worldline_id:worldline,
  event_kind:'INTENT_CONTINUITY_OBSERVATION',epistemic_kind:'INTERPRETATION',
  assertion_time:timestamp,effective_time:timestamp,
  source_ref:signalId,payload,
  evidence_references:[signalId,...(checkpoint?[checkpoint.entry_id]:[])],
  provenance:{owner_user_id:owner,work_item_id:workId,source:'USER_SIGNAL_OBSERVED',
   interpretation_authority:'CANDIDATE_ONLY'},
 });
}

export function projectIntentContinuity({trustedScope,activeObjective,observations=[]}={}){
 const root=text(trustedScope?.continuity_root_id,'INTENT_TRUSTED_ROOT_REQUIRED',256);
 const owner=text(trustedScope?.owner_user_id,'INTENT_TRUSTED_OWNER_REQUIRED',256);
 const workId=text(activeObjective?.work_item_id,'INTENT_ACTIVE_WORK_REQUIRED',256);
 const objective=text(activeObjective?.objective,'INTENT_ACTIVE_OBJECTIVE_REQUIRED',4000);
 const state=text(activeObjective?.state,'INTENT_ACTIVE_STATE_REQUIRED',40);
 if(!Array.isArray(observations))throw Error('INTENT_OBSERVATIONS_INVALID');
 const own=observations.filter(e=>e?.event_kind==='INTENT_CONTINUITY_OBSERVATION' &&
  e?.continuity_root_id===root && e?.provenance?.owner_user_id===owner &&
  e?.payload?.original_work_item_id===workId);
 for(const entry of own)validateUniverseEntry(entry);
 const chronological=own.slice().sort((a,b)=>
  a.assertion_time.localeCompare(b.assertion_time)||a.entry_id.localeCompare(b.entry_id));
 const latest=chronological.at(-1)||null;
 return Object.freeze({
  continuity_root_id:root,original_work_item_id:workId,objective,
  state,obligations_remain_active:state!=='COMPLETED',
  last_observation_entry_id:latest?.entry_id||null,
  possible_detours:chronological.filter(e=>
   ['RELATED_IDEA','POSSIBLE_DETOUR','PRIORITY_CHANGE_REQUEST'].includes(e.payload?.candidate?.relation))
   .map(e=>Object.freeze({evidence_entry_id:e.entry_id,
    source_ref:e.source_ref,relation:e.payload.candidate.relation,
    suggested_objective:e.payload.candidate.suggested_objective})),
  priority_changed_by_observation:false,action_authorized:false,
  // A fully recovered work item requires server-verified continuity history;
  // these observations cannot independently establish complete coverage.
  complete_history_verified:false,
 });
}
