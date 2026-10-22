// Native, passive epistemic difference detector.
// Compares *explicitly structured* claims; natural-language text is never
// silently treated as verified fact. Detection is not adjudication or authority.
import { createHash } from 'node:crypto';

export const EPISTEMIC_DIFFERENCE_VERSION = 'reality-epistemic-difference-v0.1';
export const EPISTEMIC_DISCREPANCY_CLASSES = Object.freeze([
  'E_FACT_CONFLICT','E_DELTA','E_UNATTESTED','E_HYPOTHESIS',
]);
export const RECONCILIATIONS = Object.freeze([
  'REVISE_HISTORY','BRANCH_SPECULATIVE','REQUEST_RECEIPT','NO_OP',
]);
const text = value => typeof value === 'string' ? value.trim() : '';
const list = value => Array.isArray(value) ? value.filter(Boolean) : [];
const stable = value => value === null || typeof value !== 'object' ? value
  : Array.isArray(value) ? value.map(stable)
  : Object.fromEntries(Object.keys(value).sort().map(key => [key,stable(value[key])]));
const fingerprint = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const canonical = value => JSON.stringify(stable(value));
function timestamp(value,label) {
  if (!text(value) || !Number.isFinite(Date.parse(value))) throw Error(label+'_INVALID');
  return new Date(Date.parse(value)).toISOString();
}

export function createEpistemicDiscrepancyEvent({
  classification, targetStateKeys, ledgerRecordIds = [], incomingSignalId,
  effectiveTime, assertionTime, confidence = 1, recommendedReconciliation,
  previousValue = null, incomingValue = null, basis = 'EXPLICIT_TYPED_STATE_COMPARISON',
} = {}) {
  if (!EPISTEMIC_DISCREPANCY_CLASSES.includes(classification)) throw Error('EPISTEMIC_CLASSIFICATION_INVALID');
  if (!RECONCILIATIONS.includes(recommendedReconciliation)) throw Error('RECONCILIATION_INVALID');
  const keys = list(targetStateKeys).map(String);
  if (!keys.length || !keys.every(text)) throw Error('TARGET_STATE_KEYS_REQUIRED');
  if (!text(incomingSignalId)) throw Error('INCOMING_SIGNAL_ID_REQUIRED');
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw Error('DETECTOR_CONFIDENCE_INVALID');
  const body = {
    version: EPISTEMIC_DIFFERENCE_VERSION,
    // Legacy requested aliases: 'asserted' is VALID time here, 'recorded' is TRANSACTION time.
    // Unambiguous names are included for the bitemporal ledger.
    timestamp_asserted: timestamp(effectiveTime,'EFFECTIVE_TIME'),
    timestamp_recorded: timestamp(assertionTime,'ASSERTION_TIME'),
    classification,
    target_state_keys:keys,
    evidence_lineage:{
      ledger_record_ids:list(ledgerRecordIds).map(String),
      incoming_signal_id:incomingSignalId,
    },
    confidence,
    confidence_semantics:'DETERMINISTIC_MATCH_STRENGTH_NOT_FACTUAL_TRUTH_PROBABILITY',
    recommended_reconciliation:recommendedReconciliation,
    reconciliation_rule:'PROPOSE_APPEND_ONLY_EVENT_NEVER_MUTATE_PAST',
    basis,
    previous_value:previousValue,
    incoming_value:incomingValue,
    observation_only:true,
    enforcement_requested:false,
    blocks_intelligence:false,
    alters_authority:false,
    epistemic_truth_established:false,
  };
  return Object.freeze({
    discrepancy_id:'epistemic:'+fingerprint(body).slice(0,32),
    ...body,
  });
}

function claimKey(observation,claim) {
  // No comparing similarly named fields from different accounts, worlds,
  // entities, or Threads. Unscoped records must not be merged automatically.
  const root = text(observation?.provenance?.continuity_root_id);
  const entity = text(claim?.entity_ref) || list(observation?.object_refs).map(String)[0];
  const target = text(claim?.target_state_key);
  return root && entity && target ? canonical([root,entity,target]) : null;
}
function typedClaims(observation) {
  const claims=observation?.content_or_metadata?.epistemic_claims;
  return Array.isArray(claims) ? claims.filter(c=>c && typeof c==='object') : [];
}
const exploration = claim => ['HYPOTHESIS','COUNTERFACTUAL'].includes(claim?.claim_kind) ||
  claim?.epistemic_status === 'SPECULATIVE';
const nonliteral = claim => ['METAPHOR','ANALOGY','REFRAMING'].includes(claim?.claim_kind);
function newer(prev,incoming) {
  return Date.parse(incoming.event_time) > Date.parse(prev.observation.event_time);
}

/**
 * Returns events only for typed, scoped claims. No LLM classification and
 * never an output filter. If there is insufficient structure, keep the raw
 * observation and report how many claims were skipped.
 */
export function inspectEpistemicDifferences({observations = [],verifiedReceiptIds = []} = {}) {
  if (!Array.isArray(observations)) throw Error('OBSERVATIONS_ARRAY_REQUIRED');
  const receipts=new Set(list(verifiedReceiptIds).map(String));
  const ordered=observations.slice().filter(Boolean).sort((a,b)=>{
    const byTime=Date.parse(a.observed_at)-Date.parse(b.observed_at);
    return (Number.isFinite(byTime)?byTime:0) || String(a.observation_id).localeCompare(String(b.observation_id));
  });
  const priorByKey=new Map(),events=[],seen=new Set();
  let examined=0,skipped=0;
  const publish = event => {if(!seen.has(event.discrepancy_id)){seen.add(event.discrepancy_id);events.push(event);}};
  for (const observation of ordered) {
    for (const claim of typedClaims(observation)) {
      examined++;
      if (nonliteral(claim)) continue;
      const key=claimKey(observation,claim);
      const signalId=text(observation.observation_id);
      if (!key || !signalId || !Number.isFinite(Date.parse(observation.event_time)) ||
          !Number.isFinite(Date.parse(observation.observed_at)) ||
          !Object.hasOwn(claim,'value')) { skipped++; continue; }
      const common={
        targetStateKeys:[claim.target_state_key],incomingSignalId:signalId,
        effectiveTime:observation.event_time,assertionTime:observation.observed_at,
        incomingValue:claim.value,
      };
      if (exploration(claim)) {
        publish(createEpistemicDiscrepancyEvent({
          ...common,classification:'E_HYPOTHESIS',
          recommendedReconciliation:'NO_OP',basis:'EXPLICIT_EXPLORATION',
        }));
        continue; // Never promote speculative hypotheses to attested baseline.
      }
      const completion=claim.claim_kind==='EXECUTION_COMPLETION';
      const validReceipt=text(claim.verification_receipt_id) && receipts.has(claim.verification_receipt_id);
      if (completion && !validReceipt || claim.evidence_required===true && !list(claim.evidence_refs).length) {
        publish(createEpistemicDiscrepancyEvent({
          ...common,classification:'E_UNATTESTED',
          recommendedReconciliation:'REQUEST_RECEIPT',basis:completion
            ? 'INDEPENDENT_COMPLETION_RECEIPT_NOT_FOUND':'EVIDENCE_REQUIRED_BUT_UNAVAILABLE',
        }));
        continue; // An unsupported completion is never the latest attested fact.
      }
      const previous=priorByKey.get(key);
      if (previous && canonical(previous.claim.value)!==canonical(claim.value)) {
        const evolving=newer(previous,observation) ||
          claim.claim_kind==='GOAL_REVISION' && text(claim.change_reason) !== '';
        publish(createEpistemicDiscrepancyEvent({
          ...common,ledgerRecordIds:[previous.observation.observation_id],
          previousValue:previous.claim.value,
          classification:evolving?'E_DELTA':'E_FACT_CONFLICT',
          recommendedReconciliation:evolving?'REVISE_HISTORY':'NO_OP',
          basis:evolving?'NEW_EFFECTIVE_TIME_OR_EXPLICIT_GOAL_REVISION':'CONFLICTING_VALUES_AT_SAME_EFFECTIVE_TIME',
        }));
      }
      // Later received assertion of an earlier effective time must not
      // silently replace the latest known effective-state projection.
      if (!previous || Date.parse(observation.event_time)>=Date.parse(previous.observation.event_time)) {
        priorByKey.set(key,{observation,claim});
      }
    }
  }
  const contradictions=events.filter(e=>e.classification==='E_FACT_CONFLICT');
  return Object.freeze({
    detector_version:EPISTEMIC_DIFFERENCE_VERSION,
    mode:'OBSERVATION_ONLY',
    observation_count:ordered.length,
    typed_claims_examined:examined,
    unscoped_or_invalid_claims:skipped,
    epistemic_discrepancies:Object.freeze(events),
    contradictions:Object.freeze(contradictions),
    intervention_count:0,
    authority_mutations:0,
    truth_promotions:0,
    limitations:[
      'Only explicit typed claims are compared; natural language is not semantically adjudicated',
      'Deterministic differences do not establish which external-world claim is true',
      'No persistence or automatic correction performed by this detector',
    ],
  });
}
