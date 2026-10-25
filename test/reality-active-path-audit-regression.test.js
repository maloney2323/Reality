import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRealityAnswer} from '../src/reality-semantic-review-v0.1.js';
import {extractReliabilityClaims} from '../src/reality-reliability-claim-extraction-v0.1.js';
import {inspectConversationDrift} from '../src/reality-conversation-drift-integrity-v0.1.js';
const snapshot={world_id:'audit',source_receipt_ids:['source'],facts:[{key:'ci',value:'FAILURE',evidence_ref:'source'}],obligations:[]};
async function semantic(quote) {
 return reviewRealityAnswer({currentUserMessage:'Prepare a draft without publishing.',modelAnswer:quote,worldId:'audit',sourceSnapshot:snapshot,apiKey:'offline',model:'fixture',
 fetchImpl:async()=>new Response(JSON.stringify({output_text:JSON.stringify({addresses_current_request:true,issues:[],claims:[],actions:[{action_type:'publish',target:'summary',status:'COMPLETED',quote}]})}),{status:200})});
}
for(const quote of ['No attempt to publish or externally announce this summary has been made.','We did not deploy the pending PR.','Do not email any homeowner.']) {
 test('both extraction paths reject misclassified denial: '+quote,async()=>{
  const a=await semantic(quote);
  assert.equal(a.candidate.actions.length,0);
  assert.equal(a.review.unassessed_claims[0].reason,'EXPLICIT_DENIAL_NOT_ACTION_COMPLETION');
  const b=await extractReliabilityClaims({modelOutput:quote,worldId:'audit',snapshot,apiKey:'offline',model:'fixture',fetchImpl:async()=>new Response(JSON.stringify({output_text:JSON.stringify({claims:[],actions:[{action_type:'publish',target:'summary',status:'COMPLETED',assertion:'AFFIRMED',quote}],operational:true,provenance_assertions:[],recipient_scope:{target_id:'',quote:'',assertion:'UNCERTAIN'}})}),{status:200})});
  assert.equal(b.candidate.actions.length,0);
 });
}
for(const quote of ['I published the release summary to customers.','I did not publish the summary, but I emailed it to customers.','I did not publish the summary. I emailed it to customers.']) {
 test('affirmed or mixed actions remain subject to verification: '+quote,async()=>{
  const r=await semantic(quote);assert.equal(r.candidate.actions.length,1);
  assert.equal(r.candidate.actions[0].verification_ref,null);
 });
}
test('no anchors is an explicit coverage gap, never a clean drift result',()=>{
 const r=inspectConversationDrift({continuityRootId:'audit',currentUserMessage:"We are NOT cancelling construction; we are cancelling ONLY the draft announcement.",modelAnswer:'The cancellation is on hold.'});
 assert.equal(r.coverage.status,'INSUFFICIENT_ANCHOR_COVERAGE');
 assert.equal(r.coverage.general_semantic_drift_assessed,false);
 assert.equal(r.coverage.no_findings_proves_no_drift,false);
 assert.equal(r.drift_rate,null);
});

