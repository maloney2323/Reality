import test from 'node:test';
import assert from 'node:assert/strict';
import { executeAuthorizedWork } from '../src/reality-governed-execution-engine-v0.1.js';

const workItem = Object.freeze({
  work_item_id: 'wi-example-1', workflow_id: 'wf-example-1',
  action: 'create external record', connector: 'test-provider',
  operation: 'record_write', consequential: true,
});
const authorization = Object.freeze({
  authorization_id: 'auth-example-1', authorized: true,
  workflow_id: workItem.workflow_id,
  allowed_operations: [{connector:workItem.connector, operation:workItem.operation, work_item_id:workItem.work_item_id}]
});

function harness(changeVerification = x => x, providerResult = {
  observation: { record_id: 'provider-record-1' },
  providerExecutionId: 'provider-execution-1',
}) {
  let executed = 0;
  return {
    get executed() { return executed; },
    execute: () => executeAuthorizedWork({
      workItem, workflowId: workItem.workflow_id, authorization,
      requestFingerprint: 'req-fingerprint-1',
      connector: {
        execute: async () => { executed++; return providerResult; }
      },
      independentVerifier: {
        verify: async ({workItem:wi, authorization:auth, execution, providerResult:result}) => changeVerification({
          verified:true, independent:true, method:'EXTERNAL_PROVIDER_READBACK',
          executionId:execution.execution_id,
          providerExecutionId:result.providerExecutionId,
          workItemId:wi.work_item_id, authorizationId:auth.authorization_id,
          readbackObservationId:'external-observation-1',
          basis:'Independent external provider readback receipt',
          observedState:{record_id:'provider-record-1'}, mismatch:false
        })
      }
    })
  };
}

test('exact independently-bound external readback permits verified outcome', async()=>{
  const run=harness(); const result=await run.execute();
  assert.equal(run.executed,1);
  assert.equal(result.status,'VERIFIED');
  assert.equal(result.outcome.outcome_state,'VERIFIED_OUTCOME');
  assert.equal(result.outcome.independent_readback_bound,true);
  assert.equal(result.outcome.readback_observation_id,'external-observation-1');
});

const forgeries=[
  ['unverified opinion',v=>({...v,verified:false})],
  ['self-verification',v=>({...v,independent:false})],
  ['missing independent flag',({independent,...rest})=>rest],
  ['no independent provider readback',v=>({...v,method:'MODEL_JUDGMENT'})],
  ['missing method',({method,...rest})=>rest],
  ['wrong provider execution',v=>({...v,providerExecutionId:'other-execution'})],
  ['missing provider execution binding',({providerExecutionId,...rest})=>rest],
  ['wrong work item',v=>({...v,workItemId:'other-work-item'})],
  ['wrong authorization',v=>({...v,authorizationId:'other-auth'})],
  ['wrong execution',v=>({...v,executionId:'other-execution'})],
  ['missing readback observation',({readbackObservationId,...rest})=>rest],
  ['empty readback observation',v=>({...v,readbackObservationId:''})],
  ['missing observed state',v=>({...v,observedState:null})],
  ['missing basis',v=>({...v,basis:''})],
  ['recorded mismatch',v=>({...v,mismatch:'provider disagrees'})],
];
for(const [title, mutate] of forgeries){
  test('fail closed: '+title,async()=>{
    const result=await harness(mutate).execute();
    assert.equal(result.status,'UNRESOLVED');
    assert.equal(result.outcome.outcome_state,'UNRESOLVED');
    assert.equal(result.outcome.verified,false);
    assert.equal(result.outcome.independent_readback_bound,false);
  });
}

test('provider execution id must be returned from the connector itself',async()=>{
  const result=await harness(x=>x,{observation:{record_id:'provider-record-1'}}).execute();
  assert.equal(result.status,'UNRESOLVED');
});

test('unauthorized action never calls external connector',async()=>{
  let calls=0;
  const result=await executeAuthorizedWork({
    workItem, workflowId:workItem.workflow_id,authorization:null,
    connector:{execute:async()=>{calls++;return {providerExecutionId:'should-not-run'}}},
    independentVerifier:{verify:async()=>({verified:true,independent:true})}
  });
  assert.equal(result.status,'BLOCKED');
  assert.equal(calls,0);
});
