import test from 'node:test';
import assert from 'node:assert/strict';
import { executeAuthorizedWork } from '../src/reality-governed-execution-engine-v0.1.js';
import {
  createAuthorityPolicy, fingerprintApprovedWorkItem,
  autoAuthorize, issueBoundExecutionApproval,
} from '../src/reality-authority-v1.0.js';

// Test-only signing key; never a production credential. Every consequential
// connector invocation must carry server-minted, exact-work authorization.
process.env.REALITY_CHAT_RECEIPT_HMAC_KEY = 'test-only-execution-proof-signing-key-000000000000000000';

const workItem={
  work_item_id:'work_item:test-1',
  workflow_id:'workflow:test-1',
  action:'Create the approved test issue.',
  connector:'github',
  operation:'create_issue',
  resource:'example/repository',
  inputs:{repository:'example/repository',title:'Approved test issue'},
  consequential:true,
  authority_required:['EXPLICIT_USER_AUTHORIZATION'],
};

function approved(item=workItem){
  const policy=createAuthorityPolicy({
    principalId:'test-user',mode:'auto',scopes:[{
      connector:item.connector,operation:item.operation,resource:item.resource,
      work_item_id:item.work_item_id,
      work_item_fingerprint:fingerprintApprovedWorkItem(item),
    }],
  });
  const authorization=autoAuthorize({policy,workItem:item});
  assert.ok(authorization,'the test must construct a persisted-policy-compatible approval');
  const serverApprovalProof=issueBoundExecutionApproval({
    policy,workItem:item,authorization,principalId:'test-user',
  });
  return {authorization,serverApprovalProof};
}

test('recognized connector write fails closed without server approval proof',async()=>{
  let invoked=false;
  const r=await executeAuthorizedWork({
    workItem,workflowId:workItem.workflow_id,
    connector:{execute:async()=>{invoked=true;throw new Error('MUST_NOT_EXECUTE')}},
    independentVerifier:{verify:async()=>({verified:false})},
  });
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.blocked_reason,'SERVER_WORK_APPROVAL_PROOF_MISSING');
  assert.equal(invoked,false);
});

test('authorized exact work executes and requires independent verification',async()=>{
  let executed=false,verified=false;
  const r=await executeAuthorizedWork({
    workItem,workflowId:workItem.workflow_id,...approved(),
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
    workItem,workflowId:workItem.workflow_id,...approved(),
    connector:{execute:async()=>({providerExecutionId:'probe-exec-2',observation:{state:'written'}})},
    independentVerifier:{verify:async()=>({verified:false,independent:false,basis:'missing-readback'})},
  });
  assert.equal(r.status,'UNRESOLVED');
  assert.equal(r.outcome.outcome_state,'UNRESOLVED');
  assert.equal(r.outcome.verified,false);
});

test('verifier self-asserting success without independent verification remains UNRESOLVED',async()=>{
  const r=await executeAuthorizedWork({
    workItem,workflowId:workItem.workflow_id,...approved(),
    connector:{execute:async()=>({
      providerExecutionId:'provider-self-report',
      observation:{state:'written'},
    })},
    independentVerifier:{verify:async()=>({
      verified:true,independent:false,basis:'same-executor-self-attestation',
      observedState:{state:'written'},
    })},
  });
  assert.equal(r.status,'UNRESOLVED');
  assert.equal(r.outcome.verified,false);
  assert.equal(r.outcome.independent,false);
  assert.equal(r.outcome.outcome_state,'UNRESOLVED');
});

test('missing independence attestation is not a verified external outcome',async()=>{
  const r=await executeAuthorizedWork({
    workItem,workflowId:workItem.workflow_id,...approved(),
    connector:{execute:async()=>({
      providerExecutionId:'provider-opaque',
      observation:{state:'written'},
    })},
    independentVerifier:{verify:async()=>({
      verified:true,basis:'unspecified-source',
      observedState:{state:'written'},
    })},
  });
  assert.equal(r.status,'UNRESOLVED');
  assert.equal(r.outcome.verified,false);
});

test('raw client authorization cannot bypass the server proof boundary',async()=>{
  let invoked=false;
  const {authorization}=approved();
  const r=await executeAuthorizedWork({
    workItem,workflowId:workItem.workflow_id,authorization,
    connector:{execute:async()=>{invoked=true}},
    independentVerifier:{verify:async()=>({verified:true,independent:true})},
  });
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.blocked_reason,'SERVER_WORK_APPROVAL_PROOF_MISSING');
  assert.equal(invoked,false);
});

test('signed approval cannot be reused for changed resource or inputs',async()=>{
  let invoked=false;
  const changed={...workItem,resource:'attacker/repository',
    inputs:{repository:'attacker/repository',title:'Unapproved new issue'}};
  const r=await executeAuthorizedWork({
    workItem:changed,workflowId:changed.workflow_id,...approved(),
    connector:{execute:async()=>{invoked=true}},
    independentVerifier:{verify:async()=>({verified:true,independent:true})},
  });
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.blocked_reason,'SERVER_WORK_APPROVAL_SCOPE_MISMATCH');
  assert.equal(invoked,false);
});

test('unknown connector operations remain forbidden rather than passing as safe internal work',async()=>{
  let invoked=false;
  const unknown={...workItem,connector:'test-probe',operation:'record_write'};
  const r=await executeAuthorizedWork({
    workItem:unknown,workflowId:unknown.workflow_id,
    connector:{execute:async()=>{invoked=true}},
    independentVerifier:{verify:async()=>({verified:true,independent:true})},
  });
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.blocked_reason,'GOAL_BOUNDARY_UNRECOGNIZED_CONNECTOR_OPERATION');
  assert.equal(invoked,false);
});
