import test from 'node:test';
import assert from 'node:assert/strict';
import { createObservation } from '../src/reality-world-observation-fabric-v0.1.js';
import { inspectEpistemicDifferences, createEpistemicDiscrepancyEvent } from '../src/reality-epistemic-difference-detector-v0.1.js';
import { reconstructUniverse } from '../src/reality-universe-reconstruction-v0.1.js';
const t0='2026-10-20T10:00:00Z', t1='2026-10-21T10:00:00Z';
function obs(id,value,{
 at=t0,seen=at,claim_kind='FACT',target='invoice.amount',
 entity='invoice:17',root='root:owner1',source='INVOICE_SYSTEM',extra={},
}={}) {
 return createObservation({
  source,domain:'BUSINESS',sourceRecordId:id,observedAt:seen,eventTime:at,
  eventType:'STRUCTURED_CLAIM',objectRefs:[entity],
  provenance:{continuity_root_id:root},
  contentOrMetadata:{epistemic_claims:[{target_state_key:target,value,claim_kind,...extra}]},
 });
}

test('typed same-effective-time conflicting values create a traceable diagnostic, not a truth verdict',()=>{
 const a=obs('a',90),b=obs('b',100,{seen:t1});
 const r=inspectEpistemicDifferences({observations:[a,b]});
 assert.equal(r.contradictions.length,1);
 const x=r.contradictions[0];
 assert.equal(x.classification,'E_FACT_CONFLICT');
 assert.equal(x.timestamp_asserted,'2026-10-20T10:00:00.000Z');
 assert.equal(x.timestamp_recorded,'2026-10-21T10:00:00.000Z');
 assert.deepEqual(x.target_state_keys,['invoice.amount']);
 assert.deepEqual(x.evidence_lineage.ledger_record_ids,[a.observation_id]);
 assert.equal(x.evidence_lineage.incoming_signal_id,b.observation_id);
 assert.equal(x.recommended_reconciliation,'NO_OP');
 assert.equal(x.epistemic_truth_established,false);
 assert.equal(x.enforcement_requested,false);
 assert.equal(r.intervention_count,0);
 assert.equal(r.truth_promotions,0);
});
test('Universe reconstruction actually exposes evidence-linked contradictions',()=>{
 const a=obs('a',90),b=obs('b',100,{seen:t1});
 const r=reconstructUniverse({observations:[a,b],now:t1});
 assert.equal(r.contradictions.length,1);
 assert.deepEqual(r.contradictions,[...r.epistemic_discrepancies]);
 assert.equal(r.detector_summary.mode,'OBSERVATION_ONLY');
 assert.equal(r.detector_summary.intervention_count,0);
});
test('legitimate fact update is E_DELTA, not E_FACT_CONFLICT',()=>{
 const a=obs('old','PENDING'),b=obs('new','COMPLETED',{at:t1});
 const x=inspectEpistemicDifferences({observations:[a,b]});
 assert.deepEqual(x.contradictions,[]);
 assert.equal(x.epistemic_discrepancies[0].classification,'E_DELTA');
 assert.equal(x.epistemic_discrepancies[0].reconciliation_rule,'PROPOSE_APPEND_ONLY_EVENT_NEVER_MUTATE_PAST');
});
test('a completion claim requires independently verified receipt reference supplied by the verifier',()=>{
 const x=obs('claim','COMPLETED',{claim_kind:'EXECUTION_COMPLETION',
  extra:{verification_receipt_id:'self-reported-receipt'}});
 const r=inspectEpistemicDifferences({observations:[x]});
 assert.equal(r.epistemic_discrepancies[0].classification,'E_UNATTESTED');
 assert.equal(r.epistemic_discrepancies[0].recommended_reconciliation,'REQUEST_RECEIPT');
 assert.equal(r.intervention_count,0);
 const approved=inspectEpistemicDifferences({observations:[x],verifiedReceiptIds:['self-reported-receipt']});
 assert.deepEqual(approved.epistemic_discrepancies,[]);
});
test('different principals or entities with equal state keys are never compared',()=>{
 const cases=[
 [obs('a',1),obs('b',2,{root:'root:owner2',seen:t1})],
 [obs('c',1),obs('d',2,{entity:'invoice:18',seen:t1})],
 ];
 for(const observations of cases)
  assert.equal(inspectEpistemicDifferences({observations}).contradictions.length,0);
});
test('unscoped or unstructured signals are not guessed into a semantic truth verdict',()=>{
 const noRoot=obs('a',90,{root:''}),b=obs('b',100,{root:'',seen:t1});
 const unstructured=createObservation({source:'USER',domain:'BUSINESS',sourceRecordId:'free',
  eventType:'MESSAGE',observedAt:t0,eventTime:t0,
  contentOrMetadata:{message:'What if the invoice were a spaceship?'}});
 const r=inspectEpistemicDifferences({observations:[noRoot,b,unstructured]});
 assert.equal(r.typed_claims_examined,2);
 assert.equal(r.unscoped_or_invalid_claims,2);
 assert.deepEqual(r.epistemic_discrepancies,[]);
});
test('detector event identity is stable and does not grant action authority',()=>{
 const params={classification:'E_HYPOTHESIS',targetStateKeys:['plan.pivot'],
  incomingSignalId:'signal:one',effectiveTime:t0,assertionTime:t1,
  recommendedReconciliation:'NO_OP'};
 const a=createEpistemicDiscrepancyEvent(params),b=createEpistemicDiscrepancyEvent(params);
 assert.deepEqual(a,b);
 assert.equal(Object.hasOwn(a,'action_authorized'),false);
 assert.equal(a.alters_authority,false);
 assert.throws(()=>createEpistemicDiscrepancyEvent({...params,confidence:2}),/DETECTOR_CONFIDENCE_INVALID/);
});
