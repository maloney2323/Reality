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
  presentOpenObligationIds=null,
}={}) {
  const validity=verifyIntegritySpine(trace);
  if(!validity.valid)throw Error(validity.reason);
  if(stage!==INTEGRITY_STAGES[trace.checkpoints.length])throw Error('SPINE_STAGE_SEQUENCE_INVALID');
  const sources=names(sourceReceiptRefs,'SPINE_SOURCE_RECEIPTS_INVALID');
  if(!sources.length)throw Error('SPINE_SOURCE_RECEIPT_REQUIRED');
  if(!Array.isArray(typedObservations))throw Error('SPINE_TYPED_OBSERVATIONS_INVALID');
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
