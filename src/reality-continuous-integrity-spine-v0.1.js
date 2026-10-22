// Reality Continuous Integrity Spine v0.1 — a handoff contract, NOT another detector.
// Existing typed epistemic comparison is reused at any relevant layer.
// This module cannot adjudicate truth, mutate the Continuity Ledger, grant
// authority, block production execution, or claim an independently verified ROI.
import {createHash} from 'node:crypto';
import {inspectEpistemicDifferences, EPISTEMIC_DIFFERENCE_VERSION}
  from './reality-epistemic-difference-detector-v0.1.js';

export const INTEGRITY_SPINE_VERSION='reality-continuous-integrity-spine-v0.1';
export const INTEGRITY_STAGES=Object.freeze([
  'SIGNAL_CLEANER','UNIVERSE','CONTINUITY','COGNITION',
  'VERIFIER','PUBLICATION','EXECUTION','OUTCOME',
]);
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const unique=xs=>[...new Set(xs)];
function canonical(x) {
  if(Array.isArray(x))return x.map(canonical);
  if(x!==null && typeof x==='object')return Object.fromEntries(
    Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
  return x;
}
function sha(x){return 'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex')}
function names(xs,code) {
  if(!Array.isArray(xs)||xs.some(x=>!nonempty(x)))throw Error(code);
  return unique(xs);
}
function time(v) {
  if(!nonempty(v)||!Number.isFinite(Date.parse(v)))throw Error('SPINE_TIME_INVALID');
  return new Date(v).toISOString();
}
function hashCheckpoint(body){return sha(body)}
export function createIntegritySpine({
  continuityRootId,worldlineId='reality:primary',runId,ledgerAnchorRef,
  requiredOpenObligationIds=[],openedAt='2026-10-22T12:00:00.000Z',
}={}) {
  if(![continuityRootId,worldlineId,runId,ledgerAnchorRef].every(nonempty))
    throw Error('SPINE_ANCHORED_SCOPE_REQUIRED');
  const root={
    version:INTEGRITY_SPINE_VERSION,continuity_root_id:continuityRootId,
    worldline_id:worldlineId,run_id:runId,ledger_anchor_ref:ledgerAnchorRef,
    required_open_obligation_ids:names(requiredOpenObligationIds,'SPINE_OBLIGATIONS_INVALID'),
    opened_at:time(openedAt),
    checkpoints:[],
    detector_origin:EPISTEMIC_DIFFERENCE_VERSION,
    detection_scope:'TYPED_CLAIMS_AND_EXPLICIT_OBLIGATION_COVERAGE_ONLY',
    semantic_truth_evaluated:false,
    authority_granted:false,
    state_mutated:false,
    publication_authorized:false,
    execution_authorized:false,
  };
  return Object.freeze({...root,trace_hash:sha(root)});
}
export function verifyIntegritySpine(trace) {
  if(!trace || trace.version!==INTEGRITY_SPINE_VERSION ||
     !Array.isArray(trace.checkpoints)||!nonempty(trace.trace_hash) ||
     !nonempty(trace.continuity_root_id)||!nonempty(trace.worldline_id) ||
     !nonempty(trace.ledger_anchor_ref)||!nonempty(trace.run_id))return {valid:false,reason:'SPINE_INVALID'};
  const {trace_hash,...data}=trace;
  if(sha(data)!==trace_hash)return {valid:false,reason:'SPINE_HASH_MISMATCH'};
  let last=null;
  for(let i=0;i<trace.checkpoints.length;i++){
    const cp=trace.checkpoints[i];
    const {checkpoint_hash,...body}=cp;
    if(cp.stage!==INTEGRITY_STAGES[i]||
       cp.continuity_root_id!==trace.continuity_root_id||
       cp.worldline_id!==trace.worldline_id||
       cp.ledger_anchor_ref!==trace.ledger_anchor_ref||
       cp.parent_checkpoint_hash!==last||
       sha(body)!==checkpoint_hash)
      return {valid:false,reason:'SPINE_CHECKPOINT_CHAIN_INVALID'};
    last=checkpoint_hash;
  }
  if(trace.semantic_truth_evaluated!==false ||
     trace.authority_granted!==false ||
     trace.state_mutated!==false ||
     trace.publication_authorized!==false ||
     trace.execution_authorized!==false)
    return {valid:false,reason:'SPINE_UNAUTHORIZED_PROMOTION'};
  return {valid:true,checkpoints:trace.checkpoints.length,terminal_hash:last};
}
function classification(x) {
  switch(x.classification) {
    case 'E_FACT_CONFLICT':return 'CONFLICT_NEEDS_ADJUDICATION';
    case 'E_DELTA':return 'REVISION_REQUIRES_EVIDENCE';
    case 'E_UNATTESTED':return 'UNVERIFIED_COMPLETION_OR_CLAIM';
    case 'E_HYPOTHESIS':return 'SPECULATION_NOT_ESTABLISHED_FACT';
    default:return 'UNKNOWN_UNVERIFIED_SIGNAL';
  }
}
export function advanceIntegritySpine({
  trace,stage,observedAt='2026-10-22T12:00:00.000Z',
  sourceReceiptRefs=[],typedObservations=[],
  presentOpenObligationIds=null,observedModelFindings=[],
}={}) {
  const validity=verifyIntegritySpine(trace);
  if(!validity.valid)throw Error(validity.reason);
  if(stage!==INTEGRITY_STAGES[trace.checkpoints.length])throw Error('SPINE_STAGE_SEQUENCE_INVALID');
  const sources=names(sourceReceiptRefs,'SPINE_SOURCE_RECEIPTS_INVALID');
  if(!sources.length)throw Error('SPINE_SOURCE_RECEIPT_REQUIRED');
  if(!Array.isArray(typedObservations))throw Error('SPINE_TYPED_OBSERVATIONS_INVALID');
  if(!Array.isArray(observedModelFindings))throw Error('SPINE_MODEL_FINDINGS_INVALID');
  if(observedModelFindings.length && stage!=='COGNITION')throw Error('SPINE_MODEL_FINDINGS_WRONG_STAGE');
  for(const x of typedObservations){
    if(x?.provenance?.continuity_root_id!==trace.continuity_root_id ||
       (x?.provenance?.worldline_id &&
         x.provenance.worldline_id!==trace.worldline_id))
      throw Error('SPINE_CROSS_SCOPE_OBSERVATION_REJECTED');
  }
  const diag=typedObservations.length
    ? inspectEpistemicDifferences({observations:typedObservations,verifiedReceiptIds:[]})
    : null;
  const coverage=presentOpenObligationIds===null
    ? 'NOT_EVALUATED'
    : 'EXPLICIT_WORKING_VIEW_EVALUATED';
  const present=presentOpenObligationIds===null
    ? []:names(presentOpenObligationIds,'SPINE_PRESENT_OBLIGATIONS_INVALID');
  const missing=coverage==='NOT_EVALUATED'?[]
    :trace.required_open_obligation_ids.filter(id=>!present.includes(id));
  const created=(diag?.epistemic_discrepancies||[]).map(e=>({
    issue_id:'integrity:'+sha([trace.continuity_root_id,stage,e.discrepancy_id]).slice(7,39),
    origin_stage:stage,classification:classification(e),
    detector_event_id:e.discrepancy_id,
    target_state_keys:e.target_state_keys,
    source_observation_ids:[...e.evidence_lineage.ledger_record_ids,
      e.evidence_lineage.incoming_signal_id],
    epistemic_truth_established:false,
    independently_adjudicated:false,
    resolves_automatically:false,
  }));
  for(const id of missing){
    created.push({
      issue_id:'integrity:'+sha([trace.continuity_root_id,stage,'OBLIGATION',id]).slice(7,39),
      origin_stage:stage,classification:'OPEN_OBLIGATION_ABSENT_FROM_WORKING_VIEW',
      work_item_id:id,epistemic_truth_established:false,
      independently_adjudicated:false,resolves_automatically:false,
    });
  }
  for(const issue of observedModelFindings){
    if(!nonempty(issue?.issue_id)||!['POTENTIAL_MATERIAL_DRIFT','UNVERIFIED_EXECUTION_CLAIM','CONTESTED_SOURCE_REFERENCE','CONVERSATIONAL_PRECONDITION_DRIFT','CONVERSATIONAL_REVISION_REQUIRES_REVIEW','CONVERSATIONAL_RETROSPECTIVE_DRIFT'].includes(issue.classification)||
       issue.origin_stage!==stage||issue.independently_adjudicated!==false||
       !Array.isArray(issue.source_receipt_refs)||!issue.source_receipt_refs.length||
       !issue.source_receipt_refs.every(nonempty))throw Error('SPINE_MODEL_FINDING_UNTRUSTED');
    // Observed adapter findings are NOT independent factual verdicts.
    created.push({issue_id:issue.issue_id,classification:issue.classification,
      origin_stage:stage,source_receipt_refs:[...issue.source_receipt_refs],
      target_state_keys:issue.target_state_key?[issue.target_state_key]:[],
      epistemic_truth_established:false,independently_adjudicated:false,
      resolves_automatically:false});
  }
  const priorIssues=trace.checkpoints.at(-1)?.unresolved_issues||[];
  const existing=new Set(priorIssues.map(x=>x.issue_id));
  const unresolved=[...priorIssues,...created.filter(x=>!existing.has(x.issue_id))];
  const cp={
    checkpoint_version:INTEGRITY_SPINE_VERSION,
    stage,continuity_root_id:trace.continuity_root_id,
    worldline_id:trace.worldline_id,
    ledger_anchor_ref:trace.ledger_anchor_ref,
    observed_at:time(observedAt),
    source_receipt_refs:sources,
    parent_checkpoint_hash:validity.terminal_hash,
    typed_claims_examined:diag?.typed_claims_examined||0,
    typed_discrepancies_observed:diag?.epistemic_discrepancies.length||0,
    skipped_typed_claims:diag?.unscoped_or_invalid_claims||0,
    obligation_coverage:coverage,
    missing_open_obligation_ids:missing,
    newly_observed_issues:created,
    unresolved_issues:unresolved,
    publication_eligible_from_this_check:unresolved.every(x=>
      x.classification==='SPECULATION_NOT_ESTABLISHED_FACT'),
    detector_mode:'OBSERVATION_ONLY',
    independent_truth_verdict:'NOT_PERFORMED',
    lifecycle_mutation:'NONE',
    authority_granted:false,
    external_action:'NOT_EXECUTED_BY_SPINE',
  };
  const checkpoint=Object.freeze({...cp,checkpoint_hash:hashCheckpoint(cp)});
  const {trace_hash:_old,...body}=trace;
  const next={...body,checkpoints:[...trace.checkpoints,checkpoint]};
  return Object.freeze({...next,trace_hash:sha(next)});
}
export function summarizeIntegritySpine(trace) {
  const validity=verifyIntegritySpine(trace);
  if(!validity.valid)throw Error(validity.reason);
  const current=trace.checkpoints.at(-1);
  return Object.freeze({
    version:INTEGRITY_SPINE_VERSION,
    continuity_root_id:trace.continuity_root_id,
    latest_stage:current?.stage||'NOT_STARTED',
    checkpoint_count:trace.checkpoints.length,
    open_diagnostic_issues:current?.unresolved_issues.length||0,
    open_issue_origins:(current?.unresolved_issues||[]).map(x=>({
      issue_id:x.issue_id,origin_stage:x.origin_stage,
      classification:x.classification,
    })),
    // This trace has no independent recall measurement. Zero flags isn't 0% drift.
    drift_escape_rate:null,
    hallucination_rate:null,
    false_negative_rate:null,
    verified_customer_roi:null,
    independent_truth_adjudication:'NOT_PERFORMED',
    effective_authority:'NONE',
    persistence:'NOT_PERSISTED_BY_THIS_MODULE',
    action_enforcement:'NOT_WIRED',
  });
}


// Conversation drift is part of the Continuity Spine, not a new independent
// detector. This initial parser is deliberately conservative; it identifies
// explicit user-stated conditions and later assistant intent shifts only.
export const CONVERSATIONAL_CONTINUITY_VERSION='reality-conversation-continuity-v0.3';
function terms(s){
 const stop=new Set(['the','a','an','to','of','for','by','on','at','with','my','our','your','their','that','this','it','them','please','we','i','you','will','can','could','would','shall','should','must','not','dont','do','only','after','before','until','unless','once','if','when','now','then']);
 const stem=w=>{
  const aliases={sending:'send',sent:'send',ordering:'order',ordered:'order',signs:'sign',signed:'sign',signing:'sign',approved:'approve',approves:'approve',approving:'approve',approval:'approve',materials:'material'};
  if(aliases[w])return aliases[w];
  if(w.endsWith('ies')&&w.length>4)return w.slice(0,-3)+'y';
  if(w.endsWith('ing')&&w.length>6)return w.slice(0,-3);
  if(w.endsWith('ed')&&w.length>5)return w.slice(0,-2);
  if(w.endsWith('s')&&w.length>4)return w.slice(0,-1);
  return w;
 };
 return (String(s||'').toLowerCase().replace(/\u2019/g,"'").match(/[a-z0-9]+/g)||[])
  .map(stem).filter(w=>w.length>1&&!stop.has(w));
}
function anchorsFromUser(message,ref,turnIndex){
 const anchors=[];
 for(const clause of String(message||'').split(/(?<=[.?!])\s+|\n+/)){
  const t=clause.trim();
  if(!t||/^[>"']/.test(t))continue;
  const forms=[
   /^(?:please\s+)?(?:do\s+not|don't|never|must\s+not|should\s+not)\s+(.+?)\s+(?:until|before|unless)\s+([^.;!?]+)/i,
   /^(?:please\s+)?(?:only\s+|you\s+may\s+only\s+|we\s+can\s+only\s+)(.+?)\s+(?:after|if|when|once)\s+([^.;!?]+)/i,
   /^(?:please\s+)?(?:wait\s+to|hold\s+off\s+on)\s+(.+?)\s+(?:until|after)\s+([^.;!?]+)/i,
  ];
  const match=forms.map(f=>t.match(f)).find(Boolean);
  if(!match)continue;
  const action=match[1].trim(),condition=match[2].trim();
  const a=terms(action),c=terms(condition);
  if(a.length<2||!c.length)continue;
  anchors.push({
   anchor_id:'conversation:'+sha([ref,turnIndex,action,condition]).slice(7,39),
   source_ref:ref,turn_index:turnIndex,original_user_text:t.slice(0,600),
   action_text:action,condition_text:condition,
   action_tokens:a,condition_tokens:c,
   authority:'USER_STATED_INTENT_NOT_EXTERNAL_FACT',
  });
 }
 return anchors;
}
function matchesAction(candidate,anchor){
 const words=terms(candidate);
 return words.includes(anchor.action_tokens[0])&&
  anchor.action_tokens.slice(1).some(x=>words.includes(x));
}
function nonAssertive(t){
 return /^(?:>|["'])/.test(t.trim())||
 /(?:^|[.?!]\s*)(?:if|what\s+if|suppose|hypothetically)\b/i.test(t)||
 /\b(?:perhaps|maybe|might|could|should|would|consider|example|hypothetical)\b/i.test(t);
}
function negativeAction(t,anchor){
 const v=anchor.action_tokens[0];
 return new RegExp("\\b(?:do not|don't|never|won't|will not|cannot|can't|not going to|avoid|hold off on)\\s+(?:\\w+\\s+){0,2}"+v+"\\b",'i').test(t);
}
function retainsCondition(t,anchor){
 const parts=t.split(/\b(?:after|until|once|unless|when|only if|provided that|if)\b/i);
 if(parts.length<2)return false;
 return parts.slice(1).some(x=>{
  const observed=terms(x),c=anchor.condition_tokens;
  return c.length===1?observed.includes(c[0]):
   c.filter(token=>observed.includes(token)).length>=Math.min(2,c.length);
 });
}
function possibleRevision(t,anchor){
 return /\b(?:actually|instead|change|override|no longer|you can now|go ahead|forget the earlier|remove the restriction)\b/i.test(t)&&
   matchesAction(t,anchor);
}
export function inspectConversationDrift({
 priorTurns=[],currentUserMessage='',modelAnswer='',continuityRootId,
 modelResponseId='untracked',currentUserSourceRef='current:user:signal',
 historySource='NOT_ATTESTED',
}={}){
 if(!nonempty(continuityRootId))return Object.freeze({
  version:CONVERSATIONAL_CONTINUITY_VERSION,status:'NO_CONTINUITY_ROOT',
  assessment_scope:'NOT_EVALUATED',anchors:[],findings:[],
  semantic_recall:null,detector_false_negative_rate:null});
 if(!Array.isArray(priorTurns)||typeof currentUserMessage!=='string'||typeof modelAnswer!=='string')
  throw Error('CONVERSATION_DRIFT_INPUT_INVALID');
 if(priorTurns.length>80)throw Error('CONVERSATION_HISTORY_BOUNDS_EXCEEDED');
 const authenticated=historySource==='AUTHENTICATED_CONVERSATION_MESSAGES';
 const eligible=authenticated?priorTurns:[],anchors=[],seen=new Set();
 for(let i=0;i<eligible.length;i++){
  const turn=eligible[i];
  if(!['user','assistant'].includes(turn?.role)||typeof turn?.text!=='string'||
     !nonempty(turn?.source_ref))throw Error('CONVERSATION_HISTORY_PROVENANCE_INVALID');
  if(turn.role!=='user')continue;
  for(const anchor of anchorsFromUser(turn.text,turn.source_ref,i))
   if(!seen.has(anchor.anchor_id)){seen.add(anchor.anchor_id);anchors.push(anchor)}
 }
 for(const anchor of anchorsFromUser(currentUserMessage,currentUserSourceRef,eligible.length))
  if(!seen.has(anchor.anchor_id)){seen.add(anchor.anchor_id);anchors.push(anchor)}
 const findings=[],revisions=[];
 for(const anchor of anchors){
  if(anchor.source_ref!==currentUserSourceRef&&possibleRevision(currentUserMessage,anchor)){
   revisions.push({anchor_id:anchor.anchor_id,status:'REVISION_PROPOSED_NOT_ADJUDICATED'});
   findings.push({
    issue_id:'conversation-drift:'+sha([continuityRootId,anchor.anchor_id,modelResponseId,'revision']).slice(7,39),
    classification:'CONVERSATIONAL_REVISION_REQUIRES_REVIEW',
    origin_stage:'COGNITION',source_receipt_refs:[anchor.source_ref,currentUserSourceRef],
    anchor_id:anchor.anchor_id,original_user_text:anchor.original_user_text,
    observed_model_text:currentUserMessage.slice(0,400),
    reason:'Customer revised a previously expressed condition; version history must be preserved',
    independently_adjudicated:false,verified_hallucination:false,
   });
   continue;
  }
  for(const clause of modelAnswer.split(/(?<=[.?!])\s+|\n+/)){
   const t=clause.trim();
   if(!t||nonAssertive(t)||!matchesAction(t,anchor)||
      negativeAction(t,anchor)||retainsCondition(t,anchor))continue;
   // Flag only an expressed proposal/commitment, not a casual topic mention.
   if(!/\b(?:i(?:'ll| will| am going to| plan to)|we(?:'ll| will| can| are going to)|let's|go ahead and|proceed to|ready to|now|next step is to|scheduled to|you can)\b/i.test(t))continue;
   findings.push({
    issue_id:'conversation-drift:'+sha([continuityRootId,anchor.anchor_id,modelResponseId,t]).slice(7,39),
    classification:'CONVERSATIONAL_PRECONDITION_DRIFT',
    origin_stage:'COGNITION',source_receipt_refs:[anchor.source_ref,'model-response:'+modelResponseId],
    anchor_id:anchor.anchor_id,original_user_text:anchor.original_user_text,
    expected_condition:anchor.condition_text,proposed_action:anchor.action_text,
    observed_model_text:t.slice(0,400),
    reason:'Assistant proposes an action but no longer carries the user-stated condition',
    independently_adjudicated:false,verified_hallucination:false,
   });
   break;
  }
 }
 return Object.freeze({
  version:CONVERSATIONAL_CONTINUITY_VERSION,
  status:findings.length?'EARLY_CONVERSATION_DRIFT_RISK':
   anchors.length?'LIMITED_CONVERSATION_CHECK_NO_FLAG':'NO_EXTRACTABLE_CONVERSATION_ANCHOR',
  assessment_scope:'EXPLICIT_USER_CONDITIONAL_INTENT_AND_AFFIRMATIVE_ACTION_PROPOSALS_ONLY',
  history_scope:authenticated?'AUTHENTICATED_PRIOR_TURNS_PLUS_CURRENT':'CURRENT_USER_TURN_ONLY',
  observed_prior_turn_count:eligible.length,anchor_count:anchors.length,
  anchors,revision_candidates:revisions,findings,
  unknown_semantic_claims_possible:true,
  semantic_recall:null,drift_rate:null,false_positive_rate:null,
  authoritative_state_mutated:false,action_authorized:false,
 });
}


// RETROSPECTIVE CONTINUITY REPLAY
// Re-examines *historical assistant turns* against only those user intent
// constraints that predated each assistant reply. It is a replay adapter to the
// existing conversation-drift logic, not another independent detector.
// A later user's revision never rewrites the meaning of an earlier turn.
// No prior detection receipts => "previous detection unknown", not "missed".
export const CONTINUITY_TRAJECTORY_REPLAY_VERSION='reality-continuity-trajectory-replay-v0.1';
export function replayConversationTrajectory({
  priorTurns=[],historySource='NOT_ATTESTED',continuityRootId,
  currentUserMessage='',currentUserSourceRef='current:user:signal',
  priorDetectionReceipts=[],maxAssistantTurns=16,
}={}){
  if(!nonempty(continuityRootId)||historySource!=='AUTHENTICATED_CONVERSATION_MESSAGES'){
    return Object.freeze({
      version:CONTINUITY_TRAJECTORY_REPLAY_VERSION,
      status:'NO_AUTHENTICATED_TRAJECTORY',
      assessment_scope:'NOT_EVALUATED',historical_assistant_turns_checked:0,
      prior_turn_coverage:'NOT_ESTABLISHED',findings:[],recovery_candidates:[],
      independent_truth_adjudication:'NOT_PERFORMED',
    });
  }
  if(!Array.isArray(priorTurns)||!Array.isArray(priorDetectionReceipts) ||
     !Number.isInteger(maxAssistantTurns)||maxAssistantTurns<1||maxAssistantTurns>40)
    throw Error('TRAJECTORY_REPLAY_INPUT_INVALID');
  if(priorTurns.length>80)throw Error('TRAJECTORY_HISTORY_BOUNDS_EXCEEDED');
  for(const t of priorTurns){
    if(!['user','assistant'].includes(t?.role)||!nonempty(t?.source_ref)||
       typeof t?.text!=='string')
      throw Error('TRAJECTORY_TURN_SOURCE_INVALID');
  }
  const lastAssists=priorTurns.map((t,i)=>t.role==='assistant'?i:null)
    .filter(i=>i!==null).slice(-maxAssistantTurns);
  const receiptIndex=new Set();
  for(const e of priorDetectionReceipts){
    if(e?.classification!=='CONVERSATIONAL_PRECONDITION_DRIFT'||
       typeof e.original_user_text!=='string'||typeof e.observed_model_text!=='string')continue;
    receiptIndex.add(sha([
      continuityRootId,e.original_user_text.trim().toLowerCase(),
      e.observed_model_text.trim().toLowerCase(),
    ]));
  }
  const findings=[],recoveryCandidates=[],candidateKeys=new Set();
  for(const i of lastAssists){
    const turn=priorTurns[i];
    // Use ONLY earlier history to prevent future-authority leakage.
    const prior=inspectConversationDrift({
      priorTurns:priorTurns.slice(0,i),
      currentUserMessage:'',modelAnswer:turn.text,
      continuityRootId,modelResponseId:'historical:'+turn.source_ref,
      historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',
    });
    for(const x of prior.findings.filter(y=>y.classification==='CONVERSATIONAL_PRECONDITION_DRIFT')){
      const material=[continuityRootId,x.original_user_text.trim().toLowerCase(),
        x.observed_model_text.trim().toLowerCase()];
      const cmp=sha(material);
      if(candidateKeys.has(cmp))continue;
      candidateKeys.add(cmp);
      const priorReceipt=receiptIndex.has(cmp);
      findings.push(Object.freeze({
        issue_id:'trajectory:'+sha([continuityRootId,turn.source_ref,
          x.source_receipt_refs[0],x.observed_model_text]).slice(7,39),
        classification:'CONVERSATIONAL_RETROSPECTIVE_DRIFT',
        origin_stage:'COGNITION',
        // Turns in the supplied chronologically ordered history are 1-based.
        apparent_origin_turn:i+1,
        origin_turn_ref:turn.source_ref,
        original_user_turn_ref:x.source_receipt_refs[0],
        original_user_text:x.original_user_text,
        observed_model_text:x.observed_model_text,
        expected_condition:x.expected_condition,
        proposed_action:x.proposed_action,
        source_receipt_refs:[x.source_receipt_refs[0],turn.source_ref],
        retrospective_detection_turn:priorTurns.length+1,
        previously_recorded_detection:priorReceipt,
        discovery_status:priorReceipt?
          'PRIOR_DIAGNOSTIC_RECEIPT_FOUND':'NOT_FOUND_IN_SUPPLIED_DIAGNOSTIC_RECEIPTS',
        // Unknown completeness => no "first ever caught"/"missed" claim.
        prior_detection_completeness:'NOT_PROVEN',
        independently_adjudicated:false,verified_hallucination:false,
      }));
    }
  }
  return Object.freeze({
    version:CONTINUITY_TRAJECTORY_REPLAY_VERSION,
    status:findings.some(x=>!x.previously_recorded_detection)
      ? 'RETROSPECTIVE_DRIFT_CANDIDATES'
      :findings.length?'PRIOR_DRIFT_CANDIDATES_RECONFIRMED'
      :'LIMITED_REPLAY_NO_DRIFT_FLAGGED',
    assessment_scope:'REPLAY_OF_EXPLICIT_CONDITION_AND_ACTION_MEANING_ONLY',
    historical_assistant_turns_checked:lastAssists.length,
    prior_turn_coverage:'BOUNDED_AUTHENTICATED_WINDOW_NOT_FULL_HISTORY',
    findings,recovery_candidates:recoveryCandidates,
    independent_truth_adjudication:'NOT_PERFORMED',
    detector_recall:null,false_negative_rate:null,verified_customer_roi:null,
    authority_granted:false,
  });
}

// An apparent recovery is not proof the customer goal or an external action
// has been satisfied; it is merely a model *restatement* of original intent.
export function inspectTrajectoryRecovery({replay,modelAnswer=''}={}){
  if(!replay||!Array.isArray(replay.findings)||typeof modelAnswer!=='string')
    throw Error('TRAJECTORY_RECOVERY_INPUT_INVALID');
  const answers=modelAnswer.split(/(?<=[.?!])\s+|\n+/).map(x=>x.trim());
  return Object.freeze({
    status:replay.findings.length?'RECONCILIATION_ASSESSED':'NO_REPLAY_ISSUES',
    assessments:replay.findings.map(issue=>{
      const anchor={action_tokens:terms(issue.proposed_action),
        condition_tokens:terms(issue.expected_condition)};
      const actionStatements=answers.filter(x=>matchesAction(x,anchor));
      const restated=actionStatements.some(x=>
        !nonAssertive(x)&&retainsCondition(x,anchor));
      const continued=actionStatements.some(x=>
        !nonAssertive(x)&&!negativeAction(x,anchor)&&!retainsCondition(x,anchor)&&
        /\b(?:i(?:'ll| will)|we(?:'ll| will| can)|let's|go ahead|proceed|now|next step)\b/i.test(x));
      return Object.freeze({
        issue_id:issue.issue_id,apparent_origin_turn:issue.apparent_origin_turn,
        assessment:restated?'MODEL_RESTATED_USER_CONDITION_UNVERIFIED':
          continued?'DRIFT_RISK_CONTINUES':'RECOVERY_NOT_DEMONSTRATED',
        independently_verified:false,
      });
    }),
    canonical_continuity_state_changed:false,
    independent_outcome_verification:'NOT_PERFORMED',
  });
}
