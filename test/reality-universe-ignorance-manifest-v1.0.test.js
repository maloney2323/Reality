import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation}
 from '../src/reality-world-observation-fabric-v0.1.js';
import {createUniverseEntry,validateUniverseEntry,assertAppendOnly}
 from '../src/reality-universe-persistence-contract-v1.0.js';
import {TRUSTED_OBSERVATION_ADMISSION_VERSION as TRUSTED}
 from '../src/reality-trusted-observation-admission-v0.1.js';
import {assessUniverseCoordinate,createUniverseIgnoranceManifest,
 verifyUniverseIgnoranceManifest,makeIgnoranceUniverseEntry,createDetectorCapabilityGap}
 from '../src/reality-universe-ignorance-manifest-v1.0.js';

const root='pilot:juan',world='reality:primary';
const asOf='2026-10-23T20:00:00.000Z';
const scope={continuity_root_id:root,worldline_id:world,
 entity_ref:'job:willow-ridge',state_key:'inspection.status',as_of:asOf};
const baseOptions={scope,requiredValue:'PASSED',requiredEvidenceKind:'SIGNED_INSPECTOR_APPROVAL'};
function evidence(name,value,extra={}){
 const id=extra.id||name;
 const observedAt=extra.observedAt||'2026-10-23T13:00:00.000Z';
 const eventTime=extra.eventTime||'2026-10-23T12:00:00.000Z';
 const entity=extra.entity||scope.entity_ref;
 const key=extra.key||scope.state_key;
 const recordRoot=extra.root||root;
 const observation=createObservation({
  source:extra.source||name,domain:'BUSINESS',
  sourceRecordId:id,observedAt,eventTime,
  eventType:'STATE_ASSERTION',objectRefs:[entity],
  provenance:{continuity_root_id:recordRoot},
  contentOrMetadata:{epistemic_claims:[
   {target_state_key:key,claim_kind:'FACT',value}]},
 });
 return createUniverseEntry({
  entry_id:'source:'+id,
  continuity_root_id:recordRoot,worldline_id:extra.world||world,
  event_kind:'SOURCE_OBSERVATION',epistemic_kind:'OBSERVATION',
  assertion_time:observedAt,effective_time:eventTime,
  source_ref:extra.source||name,
  payload:{observation,source_attestation:{
   independently_source_read:extra.verified!==false,
   observation_hash:observation.observation_hash,
   verification_ref:'source-readback:'+id}},
  evidence_references:['source-readback:'+id],
  provenance:{source:extra.admitted===false?'USER_ASSERTED':TRUSTED},
 });
}
function build(rows,options={}){
 const assessment=assessUniverseCoordinate({...baseOptions,ledgerEntries:rows,...options});
 const manifest=createUniverseIgnoranceManifest({
  assessment,consequentialActions:['DISPATCH_CREW','RELEASE_MILESTONE_PAYMENT'],
  requiredEvidence:'Read authenticated city inspection PASS record and prove job scope',
  discoveryProbe:{operation:'GET_INSPECTION_STATUS',access:'READ_ONLY',authorized:false},
 });
 return {assessment,manifest};
}
test('crew PASSED versus city PENDING becomes conflicting receipt without arbitrary trust weights',()=>{
 const {assessment,manifest}=build([
  evidence('CREW_CHAT','PASSED'),evidence('CITY_PORTAL','PENDING')]);
 assert.equal(assessment.epistemic_state,'CONFLICTING');
 assert.equal(manifest.epistemic_state,'CONFLICTING');
 assert.deepEqual(new Set(manifest.supporting_sources.map(s=>s.asserted_value)),
  new Set(['PASSED','PENDING']));
 assert.equal(manifest.supporting_sources.length,2);
 assert.equal(manifest.customer_action_authorized,false);
 assert.equal(manifest.scoped_execution_gate_wired,false);
 assert.deepEqual(manifest.permitted_intelligence,
  ['REASON','DRAFT','ANALYZE','PROPOSE_ALTERNATIVES']);
 assert.deepEqual(manifest.consequential_action_review_required,
  ['DISPATCH_CREW','RELEASE_MILESTONE_PAYMENT']);
 assert.equal(manifest.reconciliation_protocol.discovery_probe.authorization_status,
  'NOT_GRANTED_BY_MANIFEST');
 assert.equal(verifyUniverseIgnoranceManifest(manifest).valid,true);
});
test('absence of verifiable source yields UNKNOWN but drafting remains possible',()=>{
 const {assessment,manifest}=build([]);
 assert.equal(assessment.epistemic_state,'UNKNOWN');
 assert.equal(manifest.epistemic_state,'UNKNOWN');
 assert.equal(manifest.permitted_intelligence.includes('DRAFT'),true);
 assert.equal(manifest.supporting_sources.length,0);
 assert.equal(assessment.condition_evaluation,'NOT_VERIFIED');
});
test('a single matching source record still cannot grant execution or independent truth',()=>{
 const {assessment,manifest}=build([evidence('CITY_PORTAL','PASSED')]);
 assert.equal(assessment.epistemic_state,'SOURCE_CONSISTENT_NOT_GROUND_TRUTH');
 assert.equal(assessment.condition_evaluation,'NOT_VERIFIED');
 assert.equal(manifest.epistemic_state,'EVIDENCE_INSUFFICIENT_FOR_EXECUTION');
 assert.equal(manifest.competence_promotion,'NOT_AUTHORIZED');
 assert.equal(manifest.independent_outcome_verified,false);
});
test('an observed PENDING never satisfies the required PASS precondition',()=>{
 const {assessment,manifest}=build([evidence('CITY_PORTAL','PENDING')]);
 assert.equal(assessment.unverified_business_precondition,true);
 assert.equal(manifest.customer_action_authorized,false);
});
test('tenant, job, worldline, future source and unauthenticated records cannot overwrite own coordinate',()=>{
 const foreign=evidence('FOREIGN','PASSED',{root:'pilot:other'});
 const different=evidence('OTHER_JOB','PASSED',{entity:'job:oak-terrace'});
 const worldline=evidence('OTHER_WORLD','PASSED',{world:'reality:different'});
 const future=evidence('FUTURE','PASSED',{observedAt:'2026-10-25T13:00:00Z'});
 const forged=evidence('SPOOF','PASSED',{admitted:false});
 const unverified=evidence('NO_RECEIPT','PASSED',{verified:false});
 const a=assessUniverseCoordinate({...baseOptions,
  ledgerEntries:[foreign,different,worldline,future,forged,unverified]});
 assert.equal(a.epistemic_state,'UNKNOWN');
 assert.equal(a.related_attested_source_count,0);
 assert.equal(a.source_rejected_count,6);
});
test('hash mutation on a source record cannot become new trusted evidence',()=>{
 const genuine=evidence('CITY_PORTAL','PENDING');
 const forged={...genuine,payload:{...genuine.payload,
  observation:{...genuine.payload.observation,
    content_or_metadata:{epistemic_claims:[{
      target_state_key:'inspection.status',claim_kind:'FACT',value:'PASSED'}]}}}};
 const a=assessUniverseCoordinate({...baseOptions,ledgerEntries:[forged]});
 assert.equal(a.epistemic_state,'UNKNOWN');
 assert.equal(a.source_rejected_count,1);
});
test('persistable Universe manifest is append-only and retains source references',()=>{
 const {manifest}=build([evidence('CITY_PORTAL','PENDING')]);
 const entry=makeIgnoranceUniverseEntry({manifest});
 assert.equal(validateUniverseEntry(entry).valid,true);
 assert.equal(entry.event_kind,'IGNORANCE_MANIFEST_OBSERVED');
 assert.equal(entry.epistemic_kind,'UNCERTAINTY');
 assert.equal(entry.payload.manifest.manifest_id,manifest.manifest_id);
 assert.equal(entry.evidence_references.length,2);
 assert.equal(assertAppendOnly([entry],entry).allowed,false);
 const tampered={...entry,payload:{...entry.payload,interpretation:'AUTHORIZED'}};
 assert.throws(()=>assertAppendOnly([entry],tampered),/UNIVERSE_LEDGER_HASH_MISMATCH/);
});
test('identical evidence produces stable manifest ID, original source readbacks not rewritten',()=>{
 const source=[evidence('CREW_CHAT','PASSED'),evidence('CITY_PORTAL','PENDING')];
 const first=build(source);
 const second=build([...source].reverse());
 assert.equal(first.manifest.manifest_id,second.manifest.manifest_id);
 assert.equal(first.manifest.manifest_receipt_hash,second.manifest.manifest_receipt_hash);
});
test('manifest tampering or write-capable probe is refused',()=>{
 const {manifest,assessment}=build([]);
 assert.throws(()=>verifyUniverseIgnoranceManifest({
  ...manifest,customer_action_authorized:true}),/IGNORANCE_MANIFEST_INTEGRITY_OR_AUTHORITY_INVALID/);
 assert.throws(()=>createUniverseIgnoranceManifest({
  assessment,consequentialActions:['DISPATCH_CREW'],
  requiredEvidence:'Inspector PASS',discoveryProbe:{
   operation:'SET_INSPECTION_APPROVED',access:'WRITE',authorized:true,
  },
 }),/IGNORANCE_DISCOVERY_PROBE_NOT_PROVEN_SAFE/);
});
test('same schema represents warehouse stock uncertainty without construction hardcoding',()=>{
 const s={...scope,entity_ref:'warehouse:bin-7',state_key:'inventory.on_hand'};
 const a=assessUniverseCoordinate({
  scope:s,requiredValue:20,ledgerEntries:[
   evidence('WMS',18,{entity:'warehouse:bin-7',key:'inventory.on_hand'}),
   evidence('CYCLE_COUNT',22,{entity:'warehouse:bin-7',key:'inventory.on_hand'}),
  ]});
 assert.equal(a.epistemic_state,'CONFLICTING');
});
test('synthetic escaped detector fault becomes a bounded candidate internal capability gap',()=>{
 const gap=createDetectorCapabilityGap({
  continuityRootId:root,benchmarkId:'construction-25-drift-v1',
  faultProbeId:'fabricated-estimate-completion',
  expectedClassification:'UNVERIFIED_EXECUTION_CLAIM',
  observedClassifications:[],evaluationReceiptRef:'sha256:fixture-run-0001',
  assessedAt:asOf,
 });
 assert.equal(gap.epistemic_state,'CANDIDATE_COVERAGE_GAP');
 assert.equal(gap.test_origin,'FROZEN_SYNTHETIC_FAULT_NOT_LIVE_OPENAI_FAILURE');
 assert.equal(gap.competence_promotion,'NOT_AUTHORIZED');
 assert.equal(gap.autonomous_deploy,false);
 assert.equal(gap.reconciliation_protocol.independent_new_corpus_required,true);
});
test('an unrelated warning cannot satisfy the expected failure class',()=>{
 const gap=createDetectorCapabilityGap({
  continuityRootId:root,benchmarkId:'construction-25-drift-v1',
  faultProbeId:'third-party-claims-it-was-sent',
  expectedClassification:'UNVERIFIED_EXECUTION_CLAIM',
  observedClassifications:['CONVERSATIONAL_REVISION_REQUIRES_REVIEW'],
  evaluationReceiptRef:'sha256:fixture-run-0002',assessedAt:asOf,
 });
 assert.equal(gap.epistemic_state,'CANDIDATE_COVERAGE_GAP');
});
