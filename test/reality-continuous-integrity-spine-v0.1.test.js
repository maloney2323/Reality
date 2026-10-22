import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation} from '../src/reality-world-observation-fabric-v0.1.js';
import {createIntegritySpine,advanceIntegritySpine,verifyIntegritySpine,
 summarizeIntegritySpine,INTEGRITY_STAGES} from '../src/reality-continuous-integrity-spine-v0.1.js';

const root='construction:owner:1',at='2026-10-22T12:00:00Z';
const start=()=>createIntegritySpine({continuityRootId:root,runId:'turn:43',
 ledgerAnchorRef:'ledger:verified:latest',openedAt:at,
 requiredOpenObligationIds:['cabinet:confirm','estimate:review']});
function step(trace,stage,options={}){
 return advanceIntegritySpine({trace,stage,observedAt:at,
  sourceReceiptRefs:['source:'+stage],...options});
}
function claim(id,value,{atTime=at,observedAt=at,kind='FACT',
 field='cabinet.color',rootId=root,extra={}}={}){
 return createObservation({source:'CUSTOMER_RECORD',domain:'BUSINESS',
  sourceRecordId:id,observedAt,eventTime:atTime,eventType:'STRUCTURED_CLAIM',
  objectRefs:['construction:job:1'],provenance:{continuity_root_id:rootId},
  contentOrMetadata:{epistemic_claims:[{target_state_key:field,value,
   claim_kind:kind,...extra}]}});
}
test('one trace follows eight ordered layer checkpoints without ledger copies or authority promotion',()=>{
 let t=start();
 for(const stage of INTEGRITY_STAGES){
  t=step(t,stage,{presentOpenObligationIds:['cabinet:confirm','estimate:review']});
  assert.equal(verifyIntegritySpine(t).valid,true);
 }
 assert.equal(t.checkpoints.length,8);
 assert.deepEqual(t.checkpoints.map(x=>x.stage),INTEGRITY_STAGES);
 assert.equal(t.state_mutated,false);
 assert.equal(t.authority_granted,false);
 assert.equal(t.checkpoints[7].external_action,'NOT_EXECUTED_BY_SPINE');
 const s=summarizeIntegritySpine(t);
 assert.equal(s.drift_escape_rate,null);
 assert.equal(s.verified_customer_roi,null);
 assert.equal(s.action_enforcement,'NOT_WIRED');
 assert.equal(s.persistence,'NOT_PERSISTED_BY_THIS_MODULE');
});
test('a model-origin conflicting typed claim is discovered at COGNITION and survives every subsequent layer',()=>{
 let t=start();
 for(const stage of INTEGRITY_STAGES.slice(0,3))t=step(t,stage);
 const approved=claim('approved','white');
 const proposed=claim('model-proposed','gray',{observedAt:'2026-10-22T12:01:00Z'});
 t=step(t,'COGNITION',{typedObservations:[approved,proposed]});
 const candidate=t.checkpoints[3].newly_observed_issues[0];
 assert.equal(candidate.classification,'CONFLICT_NEEDS_ADJUDICATION');
 assert.equal(candidate.origin_stage,'COGNITION');
 assert.equal(t.checkpoints[3].publication_eligible_from_this_check,false);
 for(const stage of INTEGRITY_STAGES.slice(4))t=step(t,stage);
 assert.equal(t.checkpoints[7].unresolved_issues[0].issue_id,candidate.issue_id);
 assert.equal(summarizeIntegritySpine(t).open_issue_origins[0].origin_stage,'COGNITION');
 assert.equal(t.checkpoints[7].independent_truth_verdict,'NOT_PERFORMED');
});
test('later reported change is never mistaken for independently approved revision',()=>{
 let t=start();
 for(const stage of INTEGRITY_STAGES.slice(0,3))t=step(t,stage);
 const original=claim('approved','white');
 const later=claim('reported-change','gray',{
  atTime:'2026-10-22T12:05:00Z',observedAt:'2026-10-22T12:05:00Z'});
 t=step(t,'COGNITION',{typedObservations:[original,later]});
 assert.equal(t.checkpoints[3].newly_observed_issues[0].classification,'REVISION_REQUIRES_EVIDENCE');
 assert.equal(t.checkpoints[3].independent_truth_verdict,'NOT_PERFORMED');
});
test('unsupported execution-completion assertion is not independently verified by a string receipt',()=>{
 let t=start();
 for(const stage of INTEGRITY_STAGES.slice(0,5))t=step(t,stage);
 t=step(t,'PUBLICATION',{typedObservations:[claim('executor','COMPLETED',{
  kind:'EXECUTION_COMPLETION',field:'email.delivery_status',
  extra:{verification_receipt_id:'model-claims-it-sent'}})]});
 assert.equal(t.checkpoints[5].newly_observed_issues[0].classification,
  'UNVERIFIED_COMPLETION_OR_CLAIM');
 assert.equal(t.checkpoints[5].publication_eligible_from_this_check,false);
});
test('missing open obligation in bounded cognition view becomes traceable potential continuity drift',()=>{
 let t=start();
 for(const stage of INTEGRITY_STAGES.slice(0,2))t=step(t,stage);
 t=step(t,'CONTINUITY',{presentOpenObligationIds:['cabinet:confirm']});
 assert.deepEqual(t.checkpoints[2].missing_open_obligation_ids,['estimate:review']);
 assert.equal(t.checkpoints[2].newly_observed_issues[0].classification,
  'OPEN_OBLIGATION_ABSENT_FROM_WORKING_VIEW');
 assert.equal(t.checkpoints[2].obligation_coverage,'EXPLICIT_WORKING_VIEW_EVALUATED');
 t=step(t,'COGNITION',{presentOpenObligationIds:['cabinet:confirm','estimate:review']});
 assert.equal(t.checkpoints[3].unresolved_issues.length,1,
  'an observation later appearing does not silently close recorded concern');
});
test('unsupplied working-view coverage is unknown, never a zero miss count',()=>{
 const t=step(start(),'SIGNAL_CLEANER');
 assert.equal(t.checkpoints[0].obligation_coverage,'NOT_EVALUATED');
 assert.deepEqual(t.checkpoints[0].missing_open_obligation_ids,[]);
 assert.equal(summarizeIntegritySpine(t).false_negative_rate,null);
});
test('same detector is reused without pretending a hypothesis is an established contradiction',()=>{
 let t=start();
 for(const stage of INTEGRITY_STAGES.slice(0,3))t=step(t,stage);
 t=step(t,'COGNITION',{typedObservations:[claim('what-if','purple',{kind:'HYPOTHESIS'})]});
 assert.equal(t.checkpoints[3].newly_observed_issues[0].classification,
  'SPECULATION_NOT_ESTABLISHED_FACT');
 assert.equal(t.checkpoints[3].publication_eligible_from_this_check,true);
});
test('tampered chain, altered hash, invalid stage ordering, cross-world source and missing receipts are rejected',()=>{
 const orig=start(),t=step(orig,'SIGNAL_CLEANER');
 assert.throws(()=>step(t,'COGNITION'),/SPINE_STAGE_SEQUENCE_INVALID/);
 assert.throws(()=>step(orig,'SIGNAL_CLEANER',{sourceReceiptRefs:[]}),/SPINE_SOURCE_RECEIPT_REQUIRED/);
 const bad=JSON.parse(JSON.stringify(t));
 bad.checkpoints[0].stage='EXECUTION';
 assert.deepEqual(verifyIntegritySpine(bad).valid,false);
 assert.throws(()=>step(bad,'UNIVERSE'),/SPINE_HASH_MISMATCH/);
 const hacked={...t,authority_granted:true};
 assert.equal(verifyIntegritySpine(hacked).valid,false);
 assert.throws(()=>step(orig,'SIGNAL_CLEANER',{typedObservations:[
  claim('injected','red',{rootId:'different:customer'})]}),
 /SPINE_CROSS_SCOPE_OBSERVATION_REJECTED/);
});
