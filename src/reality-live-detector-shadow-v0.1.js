// Experimental read-only shadow connection to existing Reality Intelligence Spine.
// No external actions, no new ledger, no intervention, no declared drift rate.
// Only existing source-attested Continuity readback may construct a fact frame.
import {readGroundedEvidence} from './reality-reliability-evidence-v0.1.js';
import {buildInvariantFrame} from './reality-alignment-invariant-contract-v0.1.js';
import {buildSelectiveCognitiveAlignmentV02,assessCurrentTurnFocusV02}
 from './reality-selective-cognitive-alignment-v0.2.js';
import {assessDualAxisEvidence,EVIDENCE_CONTRACT_VERSION}
 from './reality-cognition-evidence-contracts-v0.1.js';

export const LIVE_DETECTOR_SHADOW_VERSION='reality-live-detector-shadow-v0.1';
const str=x=>typeof x==='string'?x.trim():'';
const isInstant=x=>str(x)&&Number.isFinite(Date.parse(x));
function scope(sourceHistory,grounded,asOf,worldId){
 const accepted = new Set(grounded.source_receipt_ids);
 const byId = new Map(sourceHistory.filter(x=>accepted.has(x?.event_id)).map(x=>[x.event_id,x]));
 // This current-frame projection uses only source-attested current facts.
 // Provenance and bitemporal stamps must both survive the durable readback.
 const records=[];
 for(const f of grounded.facts){
  const original=byId.get(f.evidence_ref);
  if(!original||!isInstant(original.assertion_time)||!isInstant(original.effective_time)||
    Date.parse(original.assertion_time)>Date.parse(asOf))throw Error('SHADOW_SOURCE_TIME_MISSING');
  records.push({
   key:f.key,value:f.value,world_id:worldId,
   source_receipt_id:f.evidence_ref,source_kind:'SERVER_SOURCE_ATTESTED_RECONCILED',
   system_time:original.assertion_time,
   valid_from:original.effective_time,
   valid_until:null,
  });
 }
 return records;
}
function detectAction(currentUserMessage){
 const message=str(currentUserMessage);
 if(/\b(?:email|send|release)\b.{0,90}\b(?:estimate|quote)\b|\b(?:estimate|quote)\b.{0,90}\b(?:send|email|release)\b/i.test(message))
  return 'SEND_ESTIMATE';
 if(/\b(?:dispatch|mobilize|mobilise|send the crew|crew dispatch)\b/i.test(message))
  return 'DISPATCH_CREW';
 if(/\b(?:order|purchase|buy)\b.{0,90}\b(?:materials|supplies)\b/i.test(message))
  return 'ORDER_MATERIALS';
 return null;
}
function unassessed(code){
 return Object.freeze({
  version:LIVE_DETECTOR_SHADOW_VERSION,status:code,
  independently_verified_error_count:null,drift_rate_pct:null,
  detector_false_positive_rate:null,detector_false_negative_rate:null,
  live_execution_authorized:false,automated_intervention:false,
 });
}
/** Runs ONLY after generation; independent old Spine candidate findings remain
 * untouched. Caller MUST supply server-owned Continuity and history adapter.
 * A copied or unauthenticated client "world" must not authorize any finding.
 * The shadow is a candidate annotation, not an authorization/repair trigger.
 */
export async function inspectLiveDetectorShadow({
 enabled=false,continuityRuntime=null,worldId=null,
 continuityRootId=null,currentUserMessage,currentUserSourceRef,
 modelAnswer,modelResponseId=null,observedAt,
 priorTurns=[],authenticatedHistory=false,existingDetectorFindings=[],
}={}){
 if(!enabled)return unassessed('DISABLED');
 if(!str(worldId)||!str(continuityRootId)||!str(currentUserMessage)||
   !str(currentUserSourceRef)||!str(modelAnswer)||!isInstant(observedAt))
  return unassessed('SOURCE_SCOPE_OR_SIGNAL_UNAVAILABLE');
 if(!continuityRuntime?.enabled||typeof continuityRuntime.readback!=='function')
  return unassessed('DURABLE_CONTINUITY_UNAVAILABLE');
 if(!Array.isArray(existingDetectorFindings))
  return unassessed('ORIGINAL_DETECTOR_CANDIDATES_UNAVAILABLE');
 const sourceHistory=await continuityRuntime.readback();
 const grounded=readGroundedEvidence(sourceHistory,{worldId,asOf:observedAt});
 if(!grounded.source_receipt_ids.length)return unassessed('NO_ATTESTED_SOURCE_READBACK');
 const records=scope(sourceHistory,grounded,observedAt,worldId);
 if(!records.length)return unassessed('NO_ATTESTED_FACTS');
 const frame=buildInvariantFrame({
  records,asOf:observedAt,worldId,continuityRootId,
  activeObjective:'Answer current request subject to existing scoped source facts',
  sourceKind:'SERVER_SOURCE_ATTESTED_CURRENT_FACTS_ONLY',
 });
 const eligible=authenticatedHistory===true && Array.isArray(priorTurns)?priorTurns:[];
 const capsule=buildSelectiveCognitiveAlignmentV02({
  currentUserMessage,currentUserSourceRef,continuityRootId,frame,
  priorTurns:eligible,historySource:authenticatedHistory===true?
   'AUTHENTICATED_CONVERSATION_MESSAGES':'NOT_ATTESTED',
 });
 const focus=assessCurrentTurnFocusV02({
  capsule:capsule.capsule,modelAnswer,
 });
 const dual=assessDualAxisEvidence({
  currentUserMessage,modelAnswer,frame,
  action:detectAction(currentUserMessage),
  // A request, a precondition and an LLM answer are not execution authority.
  executionAuthorizationStatus:'UNKNOWN',
  focusCandidateCodes:focus.candidate_codes,
  existingDetectorFindings,
  currentUserSourceRef,
  sourceTimeline:null, // Benchmark Turn-N clock cannot be trusted in real chats.
 });
 return Object.freeze({
  version:LIVE_DETECTOR_SHADOW_VERSION,
  contract_version:EVIDENCE_CONTRACT_VERSION,
  status:'CANDIDATES_ONLY_UNADJUDICATED',
  model_response_id:modelResponseId,
  current_user_source_ref:currentUserSourceRef,
  source_world_id:worldId,
  source_frame_hash:frame.frame_hash,
  source_receipt_ids:grounded.source_receipt_ids.slice(0,20),
  source_facts_readback:grounded.facts.length,
  source_scope:'SERVER_CONTINUITY_SOURCE_ATTESTED',
  source_status:'SOURCE_ATTESTED_NOT_UNIVERSALLY_TRUE',
  prior_history_scope:authenticatedHistory===true?'SERVER_AUTHENTICATED':'CURRENT_TURN_ONLY',
  original_spine_findings_count:existingDetectorFindings.length,
  focus_candidate_codes:focus.candidate_codes,
  focus_candidate_status:focus.status,
  policy_axis:dual.policy_axis,
  conversational_axis:{
   status:dual.conversational_axis.status,
   possible_refusal_false_positive:dual.conversational_axis.possible_refusal_false_positive,
   skip_drift_due_to_refusal:false,
  },
  temporal_axis:{
   status:dual.temporal_axis.status,
   candidate_count:dual.temporal_axis.errors.length,
   // Turn-N claims without a trusted clock always abstain in production.
   time_claim_parser_coverage:'NARROW_EXPLICIT_TURN_REFERENCES_ONLY',
  },
  independently_verified_error_count:null,
  drift_rate_pct:null,detector_false_positive_rate:null,
  detector_false_negative_rate:null,
  verified_prevented_incidents:null,
  live_execution_authorized:false,
  automated_intervention:false,
  original_model_answer_unchanged:true,
 });
}
