import test from 'node:test';
import assert from 'node:assert/strict';
import { retryAndVerifyOriginalWork } from '../src/reality-original-work-retry-v0.1.js';
import { runAutonomousClosurePass } from '../src/reality-autonomous-closure-orchestrator-v0.1.js';

const work = { id:'work:followup-1',continuity_root_id:'root:followup-1',worldline_id:'worldline:followup',status:'BLOCKED',missing_capabilities:['followup-verifier'],capability_contract:{verification_suite_ref:'suite:followup'} };
const registration = {state:'REGISTERED',capability_id:'followup-verifier'};
const reactivation = {state:'REACTIVATED',original_work_item_id:work.id,capability_id:'followup-verifier',continuation_token:'resume:followup'};
const authorization = {work_item_id:work.id,authorized_by:'owner',authorization_ref:'auth:original-work'};
const receipt = {status:'EXECUTED',original_work_item_id:work.id,retry_receipt_id:'receipt:attempt'};
const proof = {verified:true,independent:true,original_work_item_id:work.id,retry_receipt_id:receipt.retry_receipt_id,verification_ref:'provider-readback:followup'};
const base = {workItem:work,registration,reactivation};

test('capability reactivation does not claim the original work completed',async()=>{
  const x = await retryAndVerifyOriginalWork(base);
  assert.equal(x.status,'NOT_ATTEMPTED');
  assert.equal(x.original_work_item_id,work.id);
});
test('independent work authorization does not inherit from sandbox permission',async()=>{
  let attempts=0;
  const x=await retryAndVerifyOriginalWork({...base,authorization:{...authorization,work_item_id:'other'},runner:{retry:async()=>{attempts++;return receipt;},verify:async()=>proof}});
  assert.equal(x.status,'AWAITING_AUTHORIZATION');
  assert.equal(attempts,0);
});
test('registered capability can retry and verify the original work',async()=>{
  let checks=0;
  const x=await retryAndVerifyOriginalWork({...base,authorization,runner:{
    retry:async({workItem,continuationToken})=>{assert.equal(workItem.id,work.id);assert.equal(continuationToken,reactivation.continuation_token);checks++;return receipt;},
    verify:async({retryReceipt})=>{assert.equal(retryReceipt.retry_receipt_id,receipt.retry_receipt_id);checks++;return proof;},
  }});
  assert.equal(x.status,'VERIFIED');assert.equal(checks,2);
});
test('identity mismatch, unavailable readback, and unsupported success cannot close work',async()=>{
  for(const bad of [{...proof,verified:false},{...proof,independent:false},{...proof,original_work_item_id:'other'},{...proof,retry_receipt_id:'other'},{...proof,verification_ref:null}]){
    const x=await retryAndVerifyOriginalWork({...base,authorization,runner:{retry:async()=>receipt,verify:async()=>bad}});
    assert.equal(x.status,'EXECUTED_UNVERIFIED');
  }
});
test('provider failure is attributed to original-work retry rather than upgrade synthesis',async()=>{
  const x=await retryAndVerifyOriginalWork({...base,authorization,runner:{retry:async()=>{throw Error('PROVIDER_FAILURE')},verify:async()=>proof}});
  assert.equal(x.status,'RETRY_FAILED');assert.match(x.reason,/PROVIDER_FAILURE/);
});

async function integrated(runner=null,workAuth=null){
  return runAutonomousClosurePass({
    universe:{worldId:'world:followup',worldlineId:work.worldline_id,continuityRootId:work.continuity_root_id,particles:[{id:'p1',kind:'OBSERVED',claim:'missing capability'}],evidence:[{id:'e1',kind:'OBSERVED',claim:'missing followup verifier'}],capabilities:[],work:[work]},
    workItem:work,capabilityGap:{gap:'MISSING_CAPABILITY',subject:registration.capability_id},
    historicalFailureRefs:['failure:followup'],verificationSuiteRef:'suite:followup',
    authorization:{authorizationRef:'auth:sandbox',authorizedBy:'owner'},
    synthesis:{async run(){return {id:registration.capability_id};}},
    sandboxVerifier:{async verify(){return {frozen_regression:{passed:true},isolated_verification:{verified:true},capability_signature:'sig:followup'};}},
    mergeVerifier:{async verify(){return {approved:true};},async merge(){return {merged:true,scope:'IN_MEMORY_TEST'};}},
    capabilityRegistry:{register(){return {registered:true,registry_scope:'IN_MEMORY_TEST'};}},
    originalWorkRunner:runner,originalWorkAuthorization:workAuth,
  });
}
test('integrated capability loop reactivates without fabricating task completion',async()=>{
 const result=await integrated();assert.equal(result.state,'REACTIVATED');
 assert.equal(result.original_work.status,'NOT_ATTEMPTED');assert.equal(result.reactivation.original_work_item_id,work.id);
});
test('integrated capability loop closes only after matching independent retry readback',async()=>{
 const result=await integrated({retry:async()=>receipt,verify:async()=>proof},authorization);
 assert.equal(result.state,'ORIGINAL_WORK_VERIFIED');
 assert.equal(result.original_work.status,'VERIFIED');
 assert.equal(result.experiment.production_graph_write_permitted,false);
});
test('integrated retry with failed verification leaves original task unresolved',async()=>{
 const result=await integrated({retry:async()=>receipt,verify:async()=>({...proof,verified:false})},authorization);
 assert.equal(result.state,'REACTIVATED');
 assert.equal(result.original_work.status,'EXECUTED_UNVERIFIED');
});
