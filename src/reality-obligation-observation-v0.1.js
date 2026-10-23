// Reality Obligation Observation v0.1 — evidence-linked user conditions.
// This is a scoped, non-actuating projection of an instruction, NOT proof that
// a business condition is true, that an action occurred, or that approval exists.
import crypto from 'node:crypto';
import {createUniverseEntry,validateUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';
import {extractUserIntentAnchors,inspectConversationDrift} from './reality-continuous-integrity-spine-v0.1.js';

export const OBLIGATION_OBSERVATION_VERSION='reality-obligation-observation-v0.1';
export const OBLIGATION_OBSERVATION_KIND='USER_STATED_CONDITION_OBSERVATION';
const text=(x,code,max=2000)=>{
 if(typeof x!=='string'||!x.trim()||x.length>max)throw Error(code);
 return x.trim();
};
const digest=(v)=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const validTime=(x)=>{
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(x)||!Number.isFinite(Date.parse(x)))
  throw Error('OBLIGATION_OBSERVED_TIME_INVALID');
 return x;
};
function principal(scope){
 const owner=text(scope?.owner_user_id,'OBLIGATION_TRUSTED_PRINCIPAL_REQUIRED',256);
 const root=text(scope?.continuity_root_id,'OBLIGATION_TRUSTED_ROOT_REQUIRED',256);
 const worldline=text(scope?.worldline_id||'reality:primary','OBLIGATION_WORLDLINE_REQUIRED',256);
 const workId=text(scope?.work_item_id,'OBLIGATION_WORK_ITEM_REQUIRED',256);
 return {owner,root,worldline,workId};
}
// Must be supplied by an authenticated server-side caller after raw-signal
// verification. Never derive tenant/workspace/owner from chat or model output.
export function observeUserConditions({trustedScope,userSignal,observedAt}={}){
 const {owner,root,worldline,workId}=principal(trustedScope);
 const sourceRef=text(userSignal?.entry_id,'OBLIGATION_USER_ENTRY_REQUIRED',256);
 const userText=text(userSignal?.text,'OBLIGATION_USER_TEXT_REQUIRED',12000);
 const turnId=text(userSignal?.turn_id,'OBLIGATION_TURN_ID_REQUIRED',160);
 const stamp=validTime(observedAt);
 const anchors=extractUserIntentAnchors(userText,sourceRef,0);
 return Object.freeze(anchors.map((a,index)=>createUniverseEntry({
  entry_id:'obligation:observed:'+digest([root,worldline,owner,workId,sourceRef,turnId,index,a.action_text,a.condition_text]),
  continuity_root_id:root,worldline_id:worldline,
  event_kind:OBLIGATION_OBSERVATION_KIND,
  epistemic_kind:'OBSERVATION',
  assertion_time:stamp,effective_time:stamp,source_ref:sourceRef,
  evidence_references:[sourceRef],
  provenance:{source:'reality:authenticated-user-message',owner_user_id:owner,
   work_item_id:workId,observation_version:OBLIGATION_OBSERVATION_VERSION},
  payload:{
   obligation_observation_version:OBLIGATION_OBSERVATION_VERSION,
   original_user_text:a.original_user_text,
   action_text:a.action_text,condition_text:a.condition_text,
   authority_basis:'USER_STATED_INTENT_NOT_EXTERNAL_FACT',
   detection_basis:'EXPLICIT_CONDITIONAL_LANGUAGE',
   source_turn_id:turnId,source_user_message_entry_id:sourceRef,
   origin_status:'OBSERVED_INSTRUCTION_UNADJUDICATED',
   fulfillment_status:'UNKNOWN_NOT_EVALUATED',
   approval_status:'UNKNOWN_NOT_EVALUATED',
   status_transition_authorized:false,action_authorized:false,
   action_executed:false,drift_percentage:null,
  },
 })));
}
export function projectUserConditions({trustedScope,entries=[],limit=100}={}){
 const {owner,root,worldline,workId}=principal(trustedScope);
 if(!Array.isArray(entries)||entries.length>1000||!Number.isInteger(limit)||limit<1||limit>1000)
  throw Error('OBLIGATION_PROJECTION_BOUNDS_INVALID');
 const eligible=entries.filter(x=>x?.event_kind===OBLIGATION_OBSERVATION_KIND &&
  x?.continuity_root_id===root&&x?.worldline_id===worldline &&
  x?.provenance?.owner_user_id===owner&&x?.provenance?.work_item_id===workId);
 for(const e of eligible){
  validateUniverseEntry(e);
  if(e.payload?.obligation_observation_version!==OBLIGATION_OBSERVATION_VERSION||
    e.payload?.authority_basis!=='USER_STATED_INTENT_NOT_EXTERNAL_FACT'||
    e.payload?.status_transition_authorized!==false||
    e.payload?.action_authorized!==false||
    e.payload?.source_user_message_entry_id!==e.source_ref)
   throw Error('OBLIGATION_OBSERVATION_CONTRACT_VIOLATION');
 }
 const observations=eligible.slice().sort((a,b)=>String(a.assertion_time).localeCompare(String(b.assertion_time))||
  String(a.entry_id).localeCompare(String(b.entry_id))).slice(-limit);
 return Object.freeze({
  version:OBLIGATION_OBSERVATION_VERSION,root_id:root,work_item_id:workId,
  observed_conditions:observations.map(e=>Object.freeze({
   observation_entry_id:e.entry_id,observation_hash:e.ledger_entry_hash,
   user_source_ref:e.source_ref,original_user_text:e.payload.original_user_text,
   action_text:e.payload.action_text,condition_text:e.payload.condition_text,
   origin_status:e.payload.origin_status,approval_status:'UNKNOWN_NOT_EVALUATED',
   action_authorized:false,
  })),
  complete_history_verified:false,
  confirmed_open_obligation_count:null,
  action_authorized:false,
 });
}
// Reuses Reality's precondition-drift engine; no second competing detector.
// The owner-scoped projection is mandatory; it must derive from verified
// Universe records, not model-provided summaries or an arbitrary browser list.
export function assessProposalAgainstObservedConditions({
 trustedScope,entries=[],modelAnswer='',modelResponseId='untracked',
}={}){
 const {root}=principal(trustedScope);
 const view=projectUserConditions({trustedScope,entries});
 const priorTurns=view.observed_conditions.map(x=>({
  role:'user',text:x.original_user_text,source_ref:x.user_source_ref,
 }));
 const candidate=inspectConversationDrift({
  priorTurns,currentUserMessage:'',modelAnswer,continuityRootId:root,
  modelResponseId,
  historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',
 });
 return Object.freeze({
  version:OBLIGATION_OBSERVATION_VERSION,
  assessment_scope:'TENTATIVE_MODEL_PROPOSAL_CHECK_AGAINST_SERVER_OWNED_USER_CONDITIONS',
  observed_condition_count:view.observed_conditions.length,
  status:candidate.findings.some(f=>f.classification==='CONVERSATIONAL_PRECONDITION_DRIFT')
   ?'PROPOSAL_CONFLICT_CANDIDATE'
   :view.observed_conditions.length?'LIMITED_CHECK_NO_CONFLICT':'NO_OBSERVED_CONDITION',
  candidate_findings:candidate.findings,
  independent_approval_verification:'NOT_PERFORMED',
  action_executed:false,action_authorized:false,
  hallucination_rate:null,underlying_drift_rate:null,residual_drift_rate:null,
  detector_false_negative_rate:null,
 });
}
