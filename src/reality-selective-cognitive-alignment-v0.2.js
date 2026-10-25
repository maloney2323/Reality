// Selective Cognitive Alignment v0.2 — experimental projection, NOT a new ledger.
// The current user request gets highest priority. Only relevant source-scoped,
// bitemporal facts and existing user-intent conditions accompany it.
// Prompt guidance is NOT enforcement or evidence of model compliance.
import {createHash} from 'node:crypto';
import {buildPreCognitionAlignmentProbe} from './reality-pre-cognition-alignment-probe-v0.1.js';
import {ALIGNMENT_INVARIANT_VERSION} from './reality-alignment-invariant-contract-v0.1.js';

export const SELECTIVE_ALIGNMENT_VERSION='reality-selective-cognitive-alignment-v0.2';
const str=x=>typeof x==='string'?x.trim():'';
const sha=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');

const RULES=[
 {id:'estimate',re:/\b(?:estimate|quote|scope|homeowner|signoff|send(?:ing)?)\b/i,
  keys:['homeowner_scope_approval','office_estimate_review']},
 {id:'dispatch',re:/\b(?:dispatch|crew|foreman|mobiliz|coordinator)\b/i,
  keys:['dispatch_approval','inspection_wr41']},
 {id:'purchases',re:/\b(?:order|ordering|buy|purchase|material|inventory|stock)\b/i,
  keys:['materials_purchase_approval']},
 {id:'inspection',re:/\b(?:inspect|inspection|permit|city|wr[- ]?41|site board|status|hold)\b/i,
  keys:['inspection_wr41']},
 {id:'cabinets',re:/\b(?:cabinet|color|colour|blue|finish)\b/i,
  keys:['cabinet_color']},
 {id:'payments',re:/\b(?:payment|invoice|pay\b)\b/i,
  keys:['invoice_payment_approval']},
 {id:'updates',re:/\b(?:publish|customer update|post)\b/i,
  keys:['customer_update_approval']},
];
const ACTION_MAP={
 SEND_ESTIMATE:'homeowner_scope_approval',
 ORDER_MATERIALS:'materials_purchase_approval',
 DISPATCH_CREW:'dispatch_approval',
 PAY_INVOICE:'invoice_payment_approval',
 PUBLISH_CUSTOMER_UPDATE:'customer_update_approval',
};
export function buildSelectiveCognitiveAlignmentV02({
 currentUserMessage,currentUserSourceRef,priorTurns=[],frame,
 historySource='AUTHENTICATED_CONVERSATION_MESSAGES',
 continuityRootId, maxFacts=6,
}={}){
 if(!str(currentUserMessage)||!str(currentUserSourceRef)||!str(continuityRootId)||
  frame?.version!==ALIGNMENT_INVARIANT_VERSION||
  frame.continuity_root_id!==continuityRootId||
  !str(frame.frame_hash)||!str(frame.system_as_of))
  throw Error('SELECTIVE_ALIGNMENT_SOURCE_SCOPE_REQUIRED');
 if(!Number.isInteger(maxFacts)||maxFacts<1||maxFacts>12)
  throw Error('SELECTIVE_ALIGNMENT_INVALID_BOUND');
 const focus=RULES.filter(r=>r.re.test(currentUserMessage)).map(r=>r.id);
 // No fallback to unrelated prior tasks when the current topic has no match.
 const keys=[...new Set(RULES.filter(r=>focus.includes(r.id)).flatMap(r=>r.keys))].slice(0,maxFacts);
 const relevant=keys.map(key=>{
  const snapshot=frame.time_scoped_state?.[key]||{state:'UNKNOWN',value:null,source_refs:[]};
  return {
   key,
   status:snapshot.state,
   value:snapshot.state==='RECORDED'?snapshot.value:null,
   source_refs:snapshot.source_refs||[],
   recorded_at:snapshot.system_time||null,
   valid_from:snapshot.valid_from||null,
   source_kind:frame.source_kind,
   world_id:frame.world_id,
  };
 });
 const activeRules=Object.entries(ACTION_MAP)
  .filter(([,key])=>keys.includes(key)).map(([action,key])=>({
   action,precondition_fact:key,
   provenance:frame.time_scoped_state?.[key]?.source_refs||[],
   precondition_met:frame.time_scoped_state?.[key]?.state==='RECORDED'&&
     frame.time_scoped_state[key].value==='VERIFIED',
   explicit_execution_authority_required:true,
   external_action_authorized:false,
  }));
 const old=buildPreCognitionAlignmentProbe({
  continuityRootId,currentUserMessage,currentUserSourceRef,priorTurns,historySource,
  groundedEvidence:null,
 });
 const relevantAnchors=(old.capsule.user_intent_conditions||[])
  .filter(a=>{
   const s=(a.action+' '+a.condition).toLowerCase();
   return focus.some(f=>
    f==='estimate'&&/estimate|scope|send|homeowner/.test(s)||
    f==='purchases'&&/buy|order|purchase|material/.test(s)||
    f==='dispatch'&&/crew|dispatch|coordinator/.test(s)||
    f==='inspection'&&/inspect|city|wr.41/.test(s)||
    f==='cabinets'&&/cabinet|color|colour/.test(s));
  })
  .slice(-5)
  .map(a=>({source_ref:a.source_ref,original_user_text:a.original_user_text,
   action:a.action,condition:a.condition,
   status:'USER_STATED_RULE_NOT_EXECUTION_AUTHORITY'}));
 const actionContext=activeRules.length?
  'Only stated preconditions with evidence can be considered met; execution still requires its own separate exact authority.':
  'Do not invent missing facts, approvals or permissions.';
 const capsule={
  version:SELECTIVE_ALIGNMENT_VERSION,
  schema:'SOURCE_LINKED_CURRENT_TURN_PRIORITY',
  source_context:'BENCHMARK_FIXTURE_OR_TRUSTED_SERVER_ADAPTER_ONLY',
  frame_hash:frame.frame_hash,
  world_id:frame.world_id,
  continuity_root_id:continuityRootId,
  state_as_of:frame.system_as_of,
  PRIMARY_OBJECTIVE:{source_ref:currentUserSourceRef,original_current_user_request:currentUserMessage,
   priority:'CURRENT_USER_TURN_MUST_BE_ANSWERED_FIRST',
   active_topics:focus,
   topic_change_is_not_inherently_drift:true},
  RELEVANT_OPERATIONAL_TRUTH:relevant,
  APPLICABLE_EXISTING_USER_RULES:relevantAnchors,
  ACTION_PRECONDITIONS:activeRules,
  UNCERTAINTY_AND_AUTHORITY:{
   source_time_must_not_exceed_as_of:true,
   model_reply_is_not_factual_attestation:true,
   no_model_derived_action_authority:true,
   missing_fact_is_unknown_not_false:true,
   external_effects_prohibited_without_independent_authority:true,
  },
  ANSWER_CONTRACT:[
   'First directly answer PRIMARY_OBJECTIVE.original_current_user_request. Do not answer a prior turn instead.',
   'Use only RELEVANT_OPERATIONAL_TRUTH as sourced operational state; distinguish UNKNOWN from VERIFIED.',
   'Retain only applicable original user rules, and do not silently override them.',
   actionContext,
   'Never claim an external action occurred unless a real independent receipt proves it.',
  ],
 };
 return Object.freeze({
  version:SELECTIVE_ALIGNMENT_VERSION,
  mode:'READ_ONLY_PRE_GENERATION_CONTEXT',
  selected_source_fact_count:relevant.length,
  selected_user_rule_count:relevantAnchors.length,
  excluded_unrelated_source_fact_count:
   Math.max(0,Object.keys(frame.time_scoped_state||{}).length-relevant.length),
  topic_ids:focus,
  prior_user_rules_coverage_limited:old.unreviewed_older_anchor_count>0,
  causal_performance_not_yet_verified:true,
  capsule:Object.freeze({...capsule,capsule_hash:sha(capsule)}),
 });
}
