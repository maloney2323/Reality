import test from 'node:test';
import assert from 'node:assert/strict';
import {discloseUnverifiedSourceScope} from './reality-source-scope-uncertainty-v0.1.js';
const evidence=[
 {id:'scale',source:'signed_scale',authority:'PHYSICAL_AUTHORITY',text:'Net weight 1080kg.'},
 {id:'capacity',source:'equipment_registry',authority:'CONTROL_AUTHORITY',text:'Max net weight 1000kg.'},
];
const packet={question:'Can this shipment proceed?',evidence};
const candidate={disposition:'BLOCK',evidence_ids:['scale','capacity'],
 reasoning:'Recorded payload exceeds the recorded net weight limit by 80kg.',
 uncertainty_acknowledged:false,claims_authority:false};
const run=(c=candidate,p=packet,opts={})=>discloseUnverifiedSourceScope({
 publicPacket:p,candidateDecision:c,...opts,
});
test('record-bounded block can truthfully disclose lack of live source verification',()=>{
 const o=run();assert.equal(o.status,'DISCLOSED_SCOPE_LIMIT');
 assert.equal(o.candidate.disposition,'BLOCK');
 assert.equal(o.candidate.uncertainty_acknowledged,true);
 assert.equal(o.candidate.original_uncertainty_acknowledged,false);
 assert.match(o.candidate.reasoning,/no independent live source-system readback/);
 assert.deepEqual(o.candidate.evidence_ids,candidate.evidence_ids);
 assert.equal(o.receipt.changed,true);
 assert.equal(o.receipt.independent_source_truth_verified,false);
});
test('unknown policy never earns an ALLOW via a scope disclosure',()=>{
 const o=run({...candidate,disposition:'ALLOW'});
 assert.equal(o.candidate,null);assert.equal(o.receipt.permitted,false);
});
test('already honest uncertainty is preserved unchanged',()=>{
 const c={...candidate,uncertainty_acknowledged:true};
 const o=run(c);
 assert.equal(o.status,'UNCHANGED');
 assert.deepEqual(o.candidate,c);
 assert.equal(o.receipt.changed,false);
});
test('cannot modify or fabricate evidence references',()=>{
 for(const ids of [['scale','fiction'],['scale','scale'],[],[]]){
  const r=run({...candidate,evidence_ids:ids});
  assert.equal(r.candidate,null);
 }
});
test('claims of independent source verification and guaranteed certainty prevent artificial calibration',()=>{
 for(const reason of [
  'I independently verified the system.',
  'This outcome is guaranteed correct.',
  'There is zero uncertainty.',
  'The record is 100% certain.',
  'I checked the live registry.'
 ]){
  const o=run({...candidate,reasoning:reason});
  assert.equal(o.candidate,null,reason);
 }
});
test('cannot add missing scope when live independent readback already exists',()=>{
 const o=run(candidate,packet,{independentSourceReadbackVerified:true});
 assert.equal(o.candidate,null);
 assert.equal(o.receipt.reason,'NO_MISSING_SOURCE_SCOPE_TO_DISCLOSE');
});
test('authority claims and absent reasoning still fail closed',()=>{
 assert.equal(run({...candidate,claims_authority:true}).candidate,null);
 assert.equal(run({...candidate,reasoning:''}).candidate,null);
});
test('cannot normalize malformed or duplicated source evidence',()=>{
 const p={...packet,evidence:[evidence[0],evidence[0]]};
 assert.throws(()=>run(candidate,p),/VALID_PUBLIC_FACTS_REQUIRED/);
});
test('request-evidence and history-preservation advice can carry honest scope uncertainty',()=>{
 for(const disposition of ['REQUEST_EVIDENCE','BRANCH_HISTORY','ESCALATE']){
  const o=run({...candidate,disposition});
  assert.equal(o.candidate.disposition,disposition);
  assert.equal(o.candidate.original_task_completed,undefined);
  assert.equal(o.receipt.external_action_executed,false);
 }
});
