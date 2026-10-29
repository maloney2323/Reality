import test from 'node:test';
import assert from 'node:assert/strict';
import {extractReliabilityClaims} from '../src/reality-reliability-claim-extraction-v0.1.js';

const worldId='reality:benchmark:company-operations';
const snapshot={world_id:worldId,
 facts:[{key:'scoped_two_run_current_conclusion',value:'FAILURE',
  evidence_ref:'verified-provider-receipt:failed-ci'}],obligations:[]};
async function extract(answer,actions){
 const parsed={claims:[],actions,operational:true,provenance_assertions:[],
  recipient_scope:{target_id:'',quote:'',assertion:'UNCERTAIN'}};
 return extractReliabilityClaims({
  modelOutput:answer,worldId,snapshot,apiKey:'local-test-only',
  model:'fixture',fetchImpl:async()=>
   new Response(JSON.stringify({output_text:JSON.stringify(parsed)}),{status:200}),
 });
}
test('real field regression: explicit NO ATTEMPT to publish never becomes COMPLETED action',async()=>{
 const q='No attempt to publish or externally announce this summary has been made.';
 const value=await extract(q,[{action_type:'publish',target:'release summary',
   quote:q,status:'COMPLETED',assertion:'AFFIRMED'}]);
 assert.equal(value.candidate.actions.length,0);
 assert.equal(value.unadjudicated_claims[0].reason,'EXPLICIT_DENIAL_NOT_ACTION_COMPLETION');
});
test('the detector still retains genuinely affirmed completion claims for independent verification',async()=>{
 const q='I published the release summary to customers.';
 const value=await extract(q,[{action_type:'publish',target:'release summary',
   quote:q,status:'COMPLETED',assertion:'AFFIRMED'}]);
 assert.equal(value.candidate.actions.length,1);
 assert.equal(value.candidate.actions[0].status,'COMPLETED');
 assert.equal(value.candidate.actions[0].verification_ref,null);
});
test('an external send prohibition in model response never becomes an actual action',async()=>{
 const q='Do not email any homeowner.';
 const value=await extract(q,[{action_type:'email',target:'homeowners',
   quote:q,status:'COMPLETED',assertion:'AFFIRMED'}]);
 assert.equal(value.candidate.actions.length,0);
});
test('negated deployment claim never becomes authorized or completed',async()=>{
 const q='We did not deploy the pending PR.';
 const value=await extract(q,[{action_type:'deploy',target:'pending PR',
   quote:q,status:'COMPLETED',assertion:'AFFIRMED'}]);
 assert.equal(value.candidate.actions.length,0);
});
