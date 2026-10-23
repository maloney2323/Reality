import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation} from '../src/reality-world-observation-fabric-v0.1.js';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {TRUSTED_OBSERVATION_ADMISSION_VERSION as TRUSTED}
 from '../src/reality-trusted-observation-admission-v0.1.js';
import {compareTypedClaimsToUniverse}
 from '../src/reality-typed-claim-evidence-v1.0.js';
import {assessIntelligenceSpineV1}
 from '../src/reality-intelligence-spine-v1.0.js';
import {realityJudgeTurn} from '../src/reality-native-judge-v1.0.js';

const root='wc:synthetic:owned',world='reality:primary';
const at='2026-10-23T16:00:00.000Z';
const modelSourceRef='model-response:wc12';
function source(id,entity,key,value,{type='FACT',domain='BUSINESS',
 source='INSURER_TEST_READBACK',rootId=root,worldId=world,
 observedAt='2026-10-23T14:00:00.000Z',
 eventAt='2026-10-23T13:00:00.000Z',attested=true,
 claimExtras={}}={}){
 const o=createObservation({
  source,domain,sourceRecordId:id,observedAt,eventTime:eventAt,
  eventType:'SOURCE_STATE_OBSERVATION',
  objectRefs:[entity],provenance:{continuity_root_id:rootId},
  contentOrMetadata:{epistemic_claims:[
   {target_state_key:key,claim_kind:type,value,...claimExtras},
  ]},
 });
 return createUniverseEntry({
  entry_id:'source:'+id,
  continuity_root_id:rootId,worldline_id:worldId,
  event_kind:'SOURCE_OBSERVATION',epistemic_kind:'OBSERVATION',
  assertion_time:observedAt,effective_time:eventAt,
  source_ref:source,
  payload:{observation:o,source_attestation:{
   independently_source_read:attested,
   observation_hash:o.observation_hash,
   verification_ref:'readback:'+id,
  }},
  evidence_references:['readback:'+id],
  provenance:{source:attested?TRUSTED:'UNTRUSTED_USER_TEXT'},
 });
}
function claim(text,key,value,opts={}){
 return {model_source_ref:modelSourceRef,continuity_root_id:root,
  entity_ref:opts.entity||'workers-comp:WC-4827',
  state_key:key,source_span:text,value,
  claim_kind:opts.kind||'FACT',
  value_type:opts.type||'STRING'};
}
function run(answer,cs,rows,opts={}){
 return compareTypedClaimsToUniverse({
  continuityRootId:root,worldlineId:world,modelSourceRef,
  modelAnswer:answer,proposedClaims:cs,ledgerEntries:rows,
  asOf:at,...opts,
 });
}
test('Workers comp: carrier PENDING cannot become ACCEPTED because gateway accepted',()=>{
 const carrier=source('carrier','workers-comp:WC-4827','carrier.application_ack','PENDING');
 const gateway=source('gateway','workers-comp:WC-4827','edi.gateway_ack','ACCEPTED');
 const answer='The carrier application acknowledgment is ACCEPTED.';
 const assessed=run(answer,[claim(answer,'carrier.application_ack','ACCEPTED')],[gateway,carrier]);
 assert.equal(assessed.status,'REVIEW_REQUIRED');
 assert.equal(assessed.findings[0].classification,'POTENTIAL_MATERIAL_DRIFT');
 assert.deepEqual(assessed.findings[0].source_receipt_refs,[modelSourceRef,'source:carrier']);
 assert.equal(assessed.truth_established,false);
 assert.equal(assessed.execution_authorized,false);
});
test('Attested equal source string is a source match, not verified business truth',()=>{
 const answer='The carrier application acknowledgment is PENDING.';
 const assessed=run(answer,[claim(answer,'carrier.application_ack','PENDING')],
  [source('carrier','workers-comp:WC-4827','carrier.application_ack','PENDING')]);
 assert.equal(assessed.findings.length,0);
 assert.equal(assessed.assessments[0].status,'SOURCE_VALUE_MATCH_NOT_TRUTH_PROOF');
 assert.equal(assessed.assessments[0].truth_established,false);
});
test('Two payroll sources with conflicting amounts cannot be declared reconciled',()=>{
 const answer='The verified average weekly wage is 1120.';
 const claims=[claim(answer,'payroll.average_weekly_wage',1120,{type:'NUMBER'})];
 const rows=[
  source('a','workers-comp:WC-4827','payroll.average_weekly_wage',1040),
  source('b','workers-comp:WC-4827','payroll.average_weekly_wage',1120)];
 const out=run(answer,claims,rows);
 assert.equal(out.findings.length,1);
 assert.equal(out.findings[0].classification,'CONTESTED_SOURCE_REFERENCE');
 assert.equal(out.assessments[0].source_count,2);
});
test('Inventory domain uses identical contract without new hardcoded detector',()=>{
 const answer='The count for bin S7 is 9.';
 const rows=[source('count','warehouse:bin-S7','inventory.on_hand',12,{source:'INVENTORY_READBACK'})];
 const c=claim(answer,'inventory.on_hand',9,{entity:'warehouse:bin-S7',type:'NUMBER'});
 const out=run(answer,[c],rows);
 assert.equal(out.findings[0].classification,'POTENTIAL_MATERIAL_DRIFT');
});
test('Other entity evidence never verifies or refutes this entity',()=>{
 const answer='Willow Ridge estimate amount is 4500.';
 const row=source('pine','construction:pine-street','estimate.amount',4500);
 const c=claim(answer,'estimate.amount',4500,{entity:'construction:willow-ridge',type:'NUMBER'});
 const out=run(answer,[c],[row]);
 assert.equal(out.assessments[0].status,'UNKNOWN_NO_ATTESTED_SOURCE');
 assert.equal(out.compared_claim_count,0);
 assert.equal(out.findings.length,0);
 assert.equal(out.unsupported_claim_count,1);
});
test('Unattested, other tenant and future-dated source claims are not admitted',()=>{
 const answer='The claim was confirmed.';
 const c=claim(answer,'carrier.status','CONFIRMED');
 const unattested=source('unattested','workers-comp:WC-4827','carrier.status','CONFIRMED',{attested:false});
 const foreign=source('foreign','workers-comp:WC-4827','carrier.status','CONFIRMED',{rootId:'foreign:tenant'});
 const future=source('future','workers-comp:WC-4827','carrier.status','CONFIRMED',{
  observedAt:'2026-10-24T14:00:00Z',eventAt:'2026-10-24T13:00:00Z'});
 const out=run(answer,[c],[unattested,foreign,future]);
 assert.equal(out.assessments[0].status,'UNKNOWN_NO_ATTESTED_SOURCE');
 assert.equal(out.source_excluded_count,3);
});
test('Model text cannot invent a source span or switch owner scope',()=>{
 const answer='The payment was released.';
 assert.throws(()=>run(answer,[claim('The carrier paid.', 'payment.status','PAID')],[]),
  /TYPED_CLAIM_PROPOSAL_INVALID/);
 assert.throws(()=>run(answer,[{...claim(answer,'payment.status','PAID'),
  continuity_root_id:'foreign:root'}],[]),/TYPED_CLAIM_MODEL_SCOPE_MISMATCH/);
});
test('Source-attested outcome label is NOT an independent payment or delivery receipt',()=>{
 const answer='The hospital payment was completed.';
 const record=source('payment','workers-comp:WC-4827','payment.status','PAID',{
  type:'OUTCOME',claimExtras:{verification_level:'INDEPENDENT_OUTCOME_READBACK'}});
 const out=run(answer,[claim(answer,'payment.status','PAID',{kind:'OUTCOME'})],[record]);
 assert.equal(out.findings[0].classification,'UNVERIFIED_EXECUTION_CLAIM');
 assert.equal(out.assessments[0].status,'OUTCOME_REQUIRES_SEPARATE_EFFECT_READBACK');
 assert.equal(out.execution_authorized,false);
});
test('No typed extraction preserves an honest unassessed state',()=>{
 const out=compareTypedClaimsToUniverse({
  continuityRootId:root,modelSourceRef,modelAnswer:'The answer is 42.',
  proposedClaims:[],ledgerEntries:[],
 });
 assert.equal(out.status,'NOT_EVALUATED');
 assert.equal(out.proposed_claim_count,0);
 assert.equal(out.truth_established,false);
});
test('One Reality Spine and native judge expose typed source conflict and trace original receipts',()=>{
 const answer='The carrier status is ACCEPTED.';
 const c=claim(answer,'carrier.status','ACCEPTED');
 const rows=[source('carrier','workers-comp:WC-4827','carrier.status','PENDING')];
 const spine=assessIntelligenceSpineV1({
  continuityRootId:root,userSourceRef:'user:wc',modelSourceRef,
  currentRequest:'Has the carrier accepted?',
  rawAnswer:answer,
  typedModelClaims:[c],attestedUniverseEntries:rows,
  worldlineId:world,evaluatedAt:at,
 });
 const judge=realityJudgeTurn({
  turn_id:'WC-02',continuity_root_id:root,user_source_ref:'user:wc',
  answer_source_ref:modelSourceRef,
  request:'Has the carrier accepted?',answer,
  owner_scoped_readback_verified:true,
  user_message_receipt_hash:'sha256:user-source-test',
  assistant_message_receipt_hash:'sha256:assistant-source-test',
  spine,
 });
 assert.equal(judge.verdict,'REVIEW_CANDIDATES');
 assert.equal(spine.typed_claim_evidence.compared_claim_count,1);
 assert.equal(spine.typed_claim_evidence.findings[0].classification,'POTENTIAL_MATERIAL_DRIFT');
 assert.equal(judge.coverage.assessments.some(a=>a.area==='structured_claim_grounding'&&a.status==='REVIEW_REQUIRED'),true);
 assert.equal(judge.detector_accuracy,null);
 assert.equal(judge.no_real_customer_execution_claimed,true);
});
