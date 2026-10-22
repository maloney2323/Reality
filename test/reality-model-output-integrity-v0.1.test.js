import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation} from '../src/reality-world-observation-fabric-v0.1.js';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {TRUSTED_OBSERVATION_ADMISSION_VERSION as V}
 from '../src/reality-trusted-observation-admission-v0.1.js';
import {inspectModelOutputWithContinuity}
 from '../src/reality-model-output-integrity-v0.1.js';
import {createIntegritySpine,advanceIntegritySpine,INTEGRITY_STAGES}
 from '../src/reality-continuous-integrity-spine-v0.1.js';
process.env.REALITY_UNIVERSE_PERSISTENCE_KEY||='test-only-key';
const root='root:construction',t='2026-10-22T12:00:00Z';
function source(id,value,{key='estimate.amount',entity='estimate:job-a',
 at=t,seen=at,rootId=root,trusted=true,kind='FACT'}={}){
 const o=createObservation({source:'CUSTOMER_RECORD',domain:'BUSINESS',sourceRecordId:id,
  observedAt:seen,eventTime:at,eventType:'STRUCTURED_CLAIM',objectRefs:[entity],
  provenance:{continuity_root_id:rootId},
  contentOrMetadata:{epistemic_claims:[{target_state_key:key,claim_kind:kind,value}]}});
 return createUniverseEntry({entry_id:'source:'+id,continuity_root_id:rootId,
  worldline_id:'reality:primary',event_kind:'SOURCE_OBSERVATION',epistemic_kind:'OBSERVATION',
  assertion_time:seen,effective_time:at,source_ref:'CUSTOMER_RECORD',
  payload:{observation:o,source_attestation:{independently_source_read:trusted,observation_hash:o.observation_hash}},
  evidence_references:['source:external:receipt'],
  provenance:{source:trusted?V:'UNVERIFIED_USER_CONTEXT'}});
}
function inspect(answer,entries,{continuityRootId=root}={}){
 return inspectModelOutputWithContinuity({answer,ledgerEntries:entries,
  continuityRootId,observedAt:'2026-10-22T12:10:00Z',modelResponseId:'resp:synthetic'});
}
test('model says $14k while source-attested estimate says $12k: diagnostic links model and original evidence',()=>{
 const r=inspect('The approved estimate is $14,000.',[source('a',12000)]);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.findings.length,1);
 const x=r.findings[0];
 assert.equal(x.classification,'POTENTIAL_MATERIAL_DRIFT');
 assert.equal(x.model_claim_value,14000);
 assert.equal(x.observed_reference_value,12000);
 assert.deepEqual(x.source_receipt_refs,['source:a',r.findings[0].source_receipt_refs[1]]);
 assert.equal(x.verified_hallucination,false);
 assert.equal(r.model_drift_rate,null);
});
test('matching amount stays an observed comparison, not a proof of general correctness',()=>{
 const r=inspect('The approved estimate is $12,000.',[source('a',12000)]);
 assert.equal(r.findings.length,0);
 assert.equal(r.status,'LIMITED_CHECK_NO_FLAG');
 assert.equal(r.unassessed_answer_claims_possible,true);
});
test('cabinet colors are compared, while quoted, conditional or negated hypotheticals are excluded',()=>{
 const entries=[source('cab','white',{key:'cabinet.color',entity:'cabinet:job-a'})];
 assert.equal(inspect('The cabinets are gray.',entries).findings[0].classification,'POTENTIAL_MATERIAL_DRIFT');
 for(const answer of ['Maybe the cabinets are gray.', 'Do not order gray cabinets.',
  'What if the cabinets are gray?', 'The cabinets are not gray.',
  '> The cabinets are gray.', '```\nThe cabinets are gray.\n```']){
  assert.equal(inspect(answer,entries).findings.length,0,answer);
 }
});
test('model claim that email was sent without external execution evidence becomes review-required',()=>{
 const r=inspect('I sent the customer email.',[]);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.findings[0].classification,'UNVERIFIED_EXECUTION_CLAIM');
 assert.equal(r.findings[0].verified_hallucination,false);
 assert.equal(r.independent_truth_adjudication,'NOT_PERFORMED');
});
test('unattested supplied data cannot anchor contradiction proof',()=>{
 const r=inspect('The estimate is $14,000.',[source('forged',12000,{trusted:false})]);
 assert.equal(r.protected_reference_count,0);
 assert.equal(r.source_rejected_count,1);
 assert.equal(r.findings.length,0);
 assert.equal(r.status,'NO_TRUSTED_REFERENCE');
});
test('separate tenant and project records cannot create cross-scope drift',()=>{
 const r=inspect('The estimate is $14,000.',[
  source('other',12000,{rootId:'root:other'})]);
 assert.equal(r.source_rejected_count,1);
 assert.equal(r.findings.length,0);
});
test('contradictory source revisions stay contested; newer data is not automatically authorized',()=>{
 const entries=[
  source('old',12000),
  source('later',14000,{at:'2026-10-22T12:03:00Z',seen:'2026-10-22T12:03:00Z'}),
 ];
 const r=inspect('The estimate is $14,000.',entries);
 assert.equal(r.contested_reference_count,1);
 assert.equal(r.findings.length,0);
 assert.equal(r.protected_reference_count,0);
});
test('ambiguous multiple estimate entities are never silently conflated',()=>{
 const entries=[source('a',12000),source('b',9000,{entity:'estimate:job-b'})];
 assert.equal(inspect('The estimate is $14,000.',entries).findings.length,0);
});
test('model discrepancy is forwarded into COGNITION checkpoint using SAME Spine',()=>{
 const result=inspect('The approved estimate is $14,000.',[source('a',12000)]);
 let spine=createIntegritySpine({continuityRootId:root,runId:'turn:43',
  ledgerAnchorRef:'ledger:prior:verified',openedAt:t});
 for(const stage of INTEGRITY_STAGES.slice(0,4))
  spine=advanceIntegritySpine({trace:spine,stage,observedAt:t,
   sourceReceiptRefs:['source:'+stage],
   observedModelFindings:stage==='COGNITION'?result.findings:[]});
 assert.equal(spine.checkpoints[3].newly_observed_issues[0].origin_stage,'COGNITION');
 assert.equal(spine.checkpoints[3].newly_observed_issues[0].classification,'POTENTIAL_MATERIAL_DRIFT');
 assert.equal(spine.checkpoints[3].publication_eligible_from_this_check,false);
 assert.equal(spine.authority_granted,false);
});
