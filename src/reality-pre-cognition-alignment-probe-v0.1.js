// PRE-Cognition Alignment Probe v0.1 (EXPERIMENT ONLY).
// A small source-scoped read projection over Reality's *existing* Universe/
// Continuity and user intent records. This module owns NO new truth ledger,
// authorization, verification, or production behavior.
// An orientation packet is not evidence that the model obeyed it.
import { extractUserIntentAnchors, inspectConversationDrift } from './reality-conversation-drift-integrity-v0.1.js';

export const PRE_COGNITION_ALIGNMENT_PROBE_VERSION='reality-pre-cognition-alignment-probe-v0.1';
const AUTHENTICATED_HISTORY='AUTHENTICATED_CONVERSATION_MESSAGES';
const BASIS='SOURCE_ATTESTED_NOT_UNIVERSAL_TRUTH';
const trim=v=>typeof v==='string'?v.trim():'';
const unique=xs=>[...new Set(xs)];

function validateTurn(t){
 if(!t||!['user','assistant'].includes(t.role)||
   !trim(t.source_ref)||typeof t.text!=='string')
  throw Error('ALIGNMENT_HISTORY_PROVENANCE_INVALID');
}
function limited(v,n=400){return trim(v).slice(0,n);}
function overlap(a,b){
 const aTokens=new Set((trim(a).toLowerCase().match(/[a-z]{3,}/g)||[])
   .filter(w=>!['could','would','what','about','there','will','from','that','this','please'].includes(w)));
 const bTokens=new Set(trim(b).toLowerCase().match(/[a-z]{3,}/g)||[]);
 return [...aTokens].filter(w=>bTokens.has(w)).length;
}
function isActionQuestion(s){
 return /\b(?:send|release|dispatch|publish|order|pay|transfer|cancel|approve|place|execute|submit)\b/i.test(s);
}

/**
 * This is called before generating an answer, using trusted upstream records.
 * Incoming chat history / descriptions MUST NOT be user-spoofable.
 *
 * trustedSourceHistory: only server-authenticated role+receipt history.
 * groundedEvidence: only a prior readGroundedEvidence() projection backed by
 * durable, validated source receipts. Otherwise evidence coverage = unknown.
 *
 * source_attested facts are not infallible. User intent is NOT world truth.
 * Revisions are versioned candidates requiring appropriate confirmation.
 */
export function buildPreCognitionAlignmentProbe({
 continuityRootId,currentUserMessage,currentUserSourceRef='current:signal',
 priorTurns=[],historySource='NOT_ATTESTED',groundedEvidence=null,
 activeObjective=null,maxIntentAnchors=12,
}={}){
 if(!trim(continuityRootId)||!trim(currentUserMessage) ||!trim(currentUserSourceRef))
  throw Error('ALIGNMENT_ROOT_SIGNAL_REQUIRED');
 if(!Array.isArray(priorTurns)||priorTurns.length>80||
   !Number.isInteger(maxIntentAnchors)||maxIntentAnchors<1||maxIntentAnchors>20)
  throw Error('ALIGNMENT_BOUNDS_EXCEEDED');

 const authenticated=historySource===AUTHENTICATED_HISTORY;
 const eligible=authenticated?priorTurns:[];
 for(const t of eligible)validateTurn(t);
 const allAnchors=[];
 for(let i=0;i<eligible.length;i++){
  if(eligible[i].role!=='user')continue;
  allAnchors.push(...extractUserIntentAnchors(
   eligible[i].text,eligible[i].source_ref,i));
 }
 allAnchors.push(...extractUserIntentAnchors(
   currentUserMessage,currentUserSourceRef,eligible.length));
 // Bounded but does not silently imply all historical obligations were seen.
 const truncated=allAnchors.length>maxIntentAnchors;
 const selected=allAnchors.slice(-maxIntentAnchors);
 const anchored=selected.map(a=>Object.freeze({
  anchor_id:a.anchor_id,source_ref:a.source_ref,
  action:a.action_text,condition:a.condition_text,
  original_user_text:a.original_user_text,
  state:'USER_STATED_INTENT_RETAINED',
  externally_verified:false, // these are authentic user instructions, not completed world actions
  model_may_override:false,
 }));
 const risk=selected.filter(a=>overlap(a.action_text,currentUserMessage)>=1);
 const revisionProbe=inspectConversationDrift({
  priorTurns:eligible,historySource:authenticated?AUTHENTICATED_HISTORY:'NOT_ATTESTED',
  currentUserMessage,modelAnswer:'',continuityRootId,
  currentUserSourceRef,modelResponseId:'PRE_GENERATION_NO_MODEL_OUTPUT',
 });
 const revisions=revisionProbe.revision_candidates||[];
 const isReliableEvidence=groundedEvidence?.epistemic_basis===BASIS &&
  Array.isArray(groundedEvidence?.source_receipt_ids)&&
  groundedEvidence.source_receipt_ids.length>0;
 const facts=isReliableEvidence && Array.isArray(groundedEvidence.facts)
  ?groundedEvidence.facts.slice(0,12).filter(x=>trim(x.key)&&trim(x.evidence_ref))
   .map(x=>({key:x.key,value:x.value,source_receipt_id:x.evidence_ref}))
  :[];
 const obligations=isReliableEvidence && Array.isArray(groundedEvidence.obligations)
  ?groundedEvidence.obligations.slice(0,12)
   .filter(x=>trim(x.id)&&trim(x.evidence_ref))
   .map(x=>({id:x.id,active:x.active===true,source_receipt_id:x.evidence_ref}))
  :[];
 const validObjective=activeObjective?.record_type==='LEDGER_OBJECTIVE'&&
  trim(activeObjective?.source_ref)&&trim(activeObjective?.description)&&
  activeObjective?.status==='ACTIVE';
 const objective=validObjective?{
  description:limited(activeObjective.description,500),
  source_ref:activeObjective.source_ref,status:'ACTIVE',
 } : null;

 // No approval or execution authorization can be inferred from a user request,
 // a conversation paraphrase, or missing evidence.
 const cautionCodes=unique([
  ...(truncated?['UNREVIEWED_HISTORICAL_USER_CONDITIONS']:[]),
  ...(revisions.length?['USER_INTENT_REVISION_REQUIRES_REVIEW']:[]),
  ...(risk.length&&isActionQuestion(currentUserMessage)
    ?['ACTIVE_USER_CONDITION_REQUIRES_RECONCILIATION']:[]),
  ...(!isReliableEvidence?['NO_ATTESTED_OPERATIONAL_FACT_SNAPSHOT']:[]),
 ]);
 const capsule=Object.freeze({
  version:PRE_COGNITION_ALIGNMENT_PROBE_VERSION,
  continuity_root_id:continuityRootId,
  checkpoint:'BEFORE_MODEL_GENERATION',
  scope:'BOUNDED_SOURCE_SCOPED_PRE_COGNITION_ORIENTATION',
  active_objective:objective,
  user_intent_conditions:anchored,
  source_attested_facts:facts,
  source_attested_obligations:obligations,
  source_evidence_receipt_ids:isReliableEvidence
   ?groundedEvidence.source_receipt_ids.slice(0,20):[],
  historical_authentication:authenticated?'SERVER_ATTESTED_ADAPTER':'NO_AUTHENTICATED_HISTORY',
  user_revision_candidates:revisions,
  caution_codes:cautionCodes,
  must_not_infer:{
   external_approval:true,completion:true,authorization:true,
   assistant_history_as_user_truth:true,missing_facts_as_false:true,
  },
  guidance:[
   'Answer the CURRENT user question; do not repeat an unrelated earlier answer.',
   'User-stated conditions remain active unless a genuine revision is established; a model reply cannot silently rewrite them.',
   'Use source-attested facts with timestamps and scope; when missing, state uncertainty rather than inventing them.',
   'If a plan conflicts with an active condition, reconcile before proposing it. Do not claim any external action occurred.',
  ],
 });
 return Object.freeze({
  version:PRE_COGNITION_ALIGNMENT_PROBE_VERSION,
  status:anchored.length||objective||facts.length?'ORIENTATION_AVAILABLE':'NO_SOURCE_GROUNDED_ORIENTATION',
  prior_user_turns_inspected:eligible.filter(x=>x.role==='user').length,
  user_intent_anchors_extracted:allAnchors.length,
  anchors_in_capsule:anchored.length,
  unreviewed_older_anchor_count:Math.max(0,allAnchors.length-anchored.length),
  relevant_conditions:risk.length,
  earlier_user_revision_candidates:revisions.length,
  independent_action_approval_verified:false,
  external_actions_authorized:false,
  live_model_improvement_not_measured:true,
  capsule,
 });
}

// Use the SAME after-answer detector for both A and B lanes of a matched test.
export function compareAfterCognition({
 priorTurns=[],currentUserMessage,modelAnswer,continuityRootId,
 currentUserSourceRef='current:signal',historySource='NOT_ATTESTED',
}={}){
 return inspectConversationDrift({
  priorTurns,currentUserMessage,modelAnswer,continuityRootId,
  currentUserSourceRef,historySource,
  modelResponseId:'POST_GENERATION_EXPERIMENT',
 });
}
