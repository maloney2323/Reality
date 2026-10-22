
import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation,WORLD_OBSERVATION_FABRIC_VERSION,LEGACY_WORLD_OBSERVATION_FABRIC_VERSION}
 from '../src/reality-world-observation-fabric-v0.1.js';
import {verifyObservationEnvelope} from '../src/reality-trusted-observation-admission-v0.1.js';
import {inspectEpistemicDifferences} from '../src/reality-epistemic-difference-detector-v0.1.js';
const old='2026-10-20T10:00:00Z',later='2026-10-21T10:00:00Z';
function invoice(amount,{when=old,version=WORLD_OBSERVATION_FABRIC_VERSION}={}){
 return createObservation({
  observationVersion:version,source:'INVOICE_SYSTEM',domain:'BUSINESS',
  sourceRecordId:'invoice:17',eventType:'INVOICE_AMOUNT',
  observedAt:when,eventTime:when,objectRefs:['invoice:17'],
  provenance:{continuity_root_id:'root:builder'},
  contentOrMetadata:{epistemic_claims:[
   {target_state_key:'invoice.amount',claim_kind:'FACT',value:amount}
  ]},
 });
}
test('same source record has stable source identity but distinct, immutable revisions',()=>{
 const first=invoice(90),changed=invoice(100,{when:later});
 assert.equal(first.source_record_id,changed.source_record_id);
 assert.notEqual(first.observation_id,changed.observation_id);
 assert.notEqual(first.observation_hash,changed.observation_hash);
 assert.equal(verifyObservationEnvelope(first,{continuityRootId:'root:builder'}).valid,true);
 assert.equal(verifyObservationEnvelope(changed,{continuityRootId:'root:builder'}).valid,true);
 assert.equal(invoice(90).observation_id,first.observation_id);
});
test('same invoice revision is detected as legitimate E_DELTA, not silently deduplicated',()=>{
 const result=inspectEpistemicDifferences({
  observations:[invoice(90),invoice(100,{when:later})],
 });
 assert.equal(result.typed_claims_examined,2);
 assert.equal(result.contradictions.length,0);
 assert.equal(result.epistemic_discrepancies[0].classification,'E_DELTA');
});
test('same effective time with conflicting revisions is a fact conflict, not proven falsehood',()=>{
 const x=invoice(90),y=invoice(100);
 const r=inspectEpistemicDifferences({observations:[x,y]});
 assert.equal(r.contradictions.length,1);
 assert.equal(r.contradictions[0].epistemic_truth_established,false);
});
test('historical v0.1 observations remain verifiable without rewriting old hashes',()=>{
 const oldEntry=invoice(90,{version:LEGACY_WORLD_OBSERVATION_FABRIC_VERSION});
 assert.equal(oldEntry.observation_version,'0.1.0');
 assert.equal(verifyObservationEnvelope(oldEntry,{continuityRootId:'root:builder'}).valid,true);
 const current=invoice(90);
 assert.notEqual(oldEntry.observation_id,current.observation_id);
});
test('malformed or forged legacy observation fails provenance verification',()=>{
 const oldEntry=invoice(90,{version:LEGACY_WORLD_OBSERVATION_FABRIC_VERSION});
 assert.throws(()=>verifyObservationEnvelope({...oldEntry,content_or_metadata:{epistemic_claims:[]}},
  {continuityRootId:'root:builder'}),/TRUSTED_OBSERVATION_ENVELOPE_INTEGRITY_FAILED/);
 assert.throws(()=>createObservation({
  observationVersion:'unknown',source:'INVOICE_SYSTEM',domain:'BUSINESS',
  sourceRecordId:'x',eventType:'X',
 }),/OBSERVATION_VERSION_UNSUPPORTED/);
});
