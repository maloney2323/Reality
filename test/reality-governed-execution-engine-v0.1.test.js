import test from 'node:test';
import assert from 'node:assert/strict';
import { executeAuthorizedWork } from '../src/reality-governed-execution-engine-v0.1.js';

const workItem={
  work_item_id:'work_item:test-1',
  workflow_id:'workflow:test-1',
  action:'Write the approved test record.',
  connector:'test-probe',
  operation:'record_write',
  consequential:true,
  authority_required:['EXPLICIT_USER_AUTHORIZATION'],
};

function auth(){return {
  authorization_id:'auth:test-1',
  workflow_id:'workflow:test-1',
  principal:'test-user',
  allowed_operations:[{connector:'test-probe',operation:'record_write',work_item_id:'work_item:test-1'}],
  authorized:true,
  status:'ACTIVE',
};}

test('execution fails closed without matching authority',async()=>{
 const r=await executeAuthorizedWork({
   workItem,workflowId:workItem.workflow_id,
   connector:{execute:async()=>{throw new Error('MUST_NOT_EXECUTE')}},
   independentVerifier:{verify:async()=>({verified:false})},
 });
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.blocked_reason,'EXPLICIT_AUTHORIZATION_REQUIRED');
});

test('authorized work executes and requires independent verification',async()=>{
 let executed=false,verified=false;
 const r=await executeAuthorizedWork({
   workItem,workflowId:workItem.workflow_id,authorization:auth(),
   connector:{execute:async()=>{executed=true;return {
     providerExecutionId:'probe-exec-1',
     observation:{record_id:'probe-record-1',state:'written'},
   }}},
   independentVerifier:{verify:async({providerResult})=>{verified=true;return {
     verified:providerResult.observation?.state==='written',
     independent:true,
     basis:'independent-readback',
     observedState:{record_id:'probe-record-1',state:'written'},
   }}},
 });
 assert.equal(executed,true);
 assert.equal(verified,true);
 assert.equal(r.status,'VERIFIED');
 assert.equal(r.execution.execution_state,'EXECUTED');
 assert.equal(r.verification.independent,true);
 assert.equal(r.outcome.outcome_state,'VERIFIED_OUTCOME');
});

test('executor success without independent verification cannot become verified outcome',async()=>{
 const r=await executeAuthorizedWork({
   workItem,workflowId:workItem.workflow_id,authorization:auth(),
   connector:{execute:async()=>({providerExecutionId:'probe-exec-2',observation:{state:'written'}})},
   independentVerifier:{verify:async()=>({verified:false,independent:false,basis:'missing-readback'})},
 });
 assert.equal(r.status,'UNRESOLVED');
 assert.equal(r.outcome.outcome_state,'UNRESOLVED');
 assert.equal(r.outcome.verified,false);
});
