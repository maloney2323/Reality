// Reality construction fault-injection proof v0.1.
// Generates NO LLM calls, NO storage writes, and NO business tool calls.
// A detector result is a candidate; an execution-boundary gate must separately
// demand independently attested permission before real effects are enabled.
import {createHash} from 'node:crypto';
import {verifyStandaloneUser,createStandaloneConversationScope,requireStandaloneReady}
 from './reality-standalone-auth-v0.1.js';
import {loadStandaloneObligations,assessStandaloneObligationProposal}
 from './reality-standalone-obligations-v0.1.js';
import {retrievePersistedUniverse} from './reality-native-universe-persistence-v1.0.js';
export const CONSTRUCTION_CONFLICT_PROBE_VERSION='reality-construction-conflict-probe-v0.1';
export const SYNTHETIC_PROPOSAL="I'll send the estimate now.";
function stable(v){
 if(Array.isArray(v))return v.map(stable);
 if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
 return v;
}
function sha(v){return createHash('sha256').update(JSON.stringify(stable(v))).digest('hex')}
function fail(message){throw Error(message)}
// This gate is an advisory dry-run boundary. The actual SEND_ESTIMATE tool has
// NOT been connected to it. No caller-supplied claim can satisfy approval.
export function evaluateConstructionConflict({
 scope,verifiedObservationEntries=[],injectedProposal=SYNTHETIC_PROPOSAL,
}={}){
 if(!scope||scope.identity_basis!=='SUPABASE_AUTH_SERVER_VERIFIED')
  fail('PROBE_VERIFIED_SCOPE_REQUIRED');
 const assessed=assessStandaloneObligationProposal({
  scope,entries:verifiedObservationEntries,
  modelAnswer:injectedProposal,modelResponseId:'synthetic:fixed-construction-conflict-v0.1',
 });
 const candidate=assessed.candidate_findings.filter(f=>
   f.classification==='CONVERSATIONAL_PRECONDITION_DRIFT');
 // A recorded conditional user instruction still cannot prove real-world approval.
 // Our simulated SEND_ESTIMATE request can only be denied in this experiment.
 const relevant=verifiedObservationEntries.filter(x=>
   x?.event_kind==='USER_STATED_CONDITION_OBSERVATION' &&
   x.continuity_root_id===scope.continuity_root_id &&
   x.worldline_id===scope.worldline_id &&
   x.provenance?.owner_user_id===scope.authenticated_user_id &&
   x.provenance?.work_item_id==='conversation:'+scope.client_conversation_selector &&
   /\bsend\b/i.test(x.payload?.action_text||'') &&
   /\bestimate\b/i.test(x.payload?.action_text||''));
 const diagnosis=assessed.observed_condition_count===0?'NO_OBSERVED_CONDITION':
  candidate.length?'CONFLICT_CANDIDATE_DETECTED':'CONFLICT_NOT_DETECTED';
 const boundaryStatus=relevant.length?'DENIED_MISSING_VERIFIED_APPROVAL':
   'DENIED_NO_VERIFIED_POLICY_OR_APPROVAL';
 const evidenceReferences=relevant.map(x=>({
  entry_id:x.entry_id,ledger_hash:x.ledger_entry_hash,
  source_user_message_entry_id:x.payload.source_user_message_entry_id,
 }));
 const receiptBody={
  version:CONSTRUCTION_CONFLICT_PROBE_VERSION,
  continuity_root_id:scope.continuity_root_id,
  conversation_id:scope.client_conversation_selector,
  stimulus_type:'SYNTHETIC_MODEL_PROPOSAL_NOT_ACTUAL_LLM_OUTPUT',
  injected_model_proposal:injectedProposal,
  simulated_action:'SEND_ESTIMATE',
  detected:diagnosis,
  candidate_count:candidate.length,
  candidate_classifications:candidate.map(x=>x.classification),
  observed_conditions:assessed.observed_condition_count,
  evidence_references:evidenceReferences,
  approval_independently_verified:false,
  simulated_decision:boundaryStatus,
  simulated_execution_allowed:false,
  tool_call_count:0,
  actual_business_tool_wired:false,
  external_action_executed:false,
  effect_containment_claim:'DRY_RUN_ONLY_NOT_LIVE_TOOL_ENFORCEMENT',
  real_model_error_rate:null,
  reality_residual_error_rate:null,
  detector_recall:null,
  real_model_was_called:false,
  semantic_error_independently_adjudicated:false,
  persistence:'READ_ONLY_SOURCE_EVIDENCE_RECEIPTS_NO_PROBE_WRITE',
  history_complete:false,
 };
 return Object.freeze({...receiptBody,
  deterministic_receipt_hash:'sha256:'+sha(receiptBody),
  demo_result:diagnosis==='CONFLICT_CANDIDATE_DETECTED'?
   'DETECTED_AND_SIMULATED_ACTION_DENIED':
   'INCONCLUSIVE_NO_DETECTION_AND_ACTION_DENIED'});
}
export async function getAuthenticatedConstructionConflictProbe(req,{
 env=process.env,fetchImpl=fetch,load=retrievePersistedUniverse,
}={}){
 requireStandaloneReady(env);
 if(env.REALITY_STANDALONE_OBLIGATION_OBSERVATION_ENABLED!=='true')
  fail('STANDALONE_OBLIGATION_OBSERVATIONS_DISABLED');
 if(env.VERCEL_ENV==='production')fail('CONFLICT_PROBE_PRODUCTION_DISABLED');
 const principal=await verifyStandaloneUser(req,{fetchImpl,env});
 const q=req?.query||{};
 if(!q||typeof q!=='object'||Array.isArray(q)||
   Object.keys(q).some(k=>!['conversation_id','thought_id'].includes(k)))
  fail('CONFLICT_PROBE_SELECTOR_INVALID');
 const scope=createStandaloneConversationScope({
  userId:principal.user_id,conversationId:q.conversation_id,
  thoughtId:q.thought_id??'personal',
 });
 const stored=await loadStandaloneObligations({scope,load,fetchImpl,limit:80});
 return evaluateConstructionConflict({
  scope,verifiedObservationEntries:stored.entries,
 });
}
