import test from 'node:test';
import assert from 'node:assert/strict';
import { executeAuthorizedWork } from '../src/reality-governed-execution-engine-v0.1.js';
import { bindWorkToAuthenticatedGoal } from '../src/reality-execution-goal-grounding-v0.1.js';
import { issuePersonalWorkGroundingProof } from '../src/reality-personal-work-grounding-proof-v0.1.js';
import { issueFreshGoalExecutionAdmission } from '../src/reality-fresh-goal-execution-admission-v0.1.js';
import {
  createAuthorityPolicy, fingerprintApprovedWorkItem,
  autoAuthorize, issueBoundExecutionApproval,
} from '../src/reality-authority-v1.0.js';

// Test-only signing key; never a production credential. Every consequential
// connector invocation must carry server-minted, exact-work authorization.
process.env.REALITY_CHAT_RECEIPT_HMAC_KEY = 'test-only-execution-proof-signing-key-000000000000000000';
process.env.VERCEL_ENV='preview';
process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF='hvkfreoagbrphwghjajw';

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
  const state={
    principal_id:'test-user',continuity_root_id:'test:authenticated-root',
    world_id:'test:world',
    authority_source:'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK',
    transition_count:1,assistant_can_mutate_goals:false,
    semantic_reviewer_can_mutate_goals:false,external_execution_authorized:false,
    active_goal_id:'goal:test',active_goal:{
      goal_id:'goal:test',status:'ACTIVE',user_confirmed:true,
      external_execution_authorized:false,
      source_user_message_ref:'supabase:reality_chat_messages:source-test',
      last_transition_receipt_id:'goal-receipt:test',
    },recent_transition_receipts:[{
      event_id:'goal-receipt:test',confirmed_by_user:true,principal_id:'test-user',
    }],
  };
  const binding=bindWorkToAuthenticatedGoal({
    workItem:item,authoritativeState:state,serverVerifiedPrincipalId:'test-user',
  });
  assert.equal(binding.status,'BOUND_FOR_FRESHNESS_CHECK');
  const groundingProof=issuePersonalWorkGroundingProof({
    binding,conversationId:'test-conversation',principalId:'test-user',
  });
  const goalBoundPolicy={...policy,goal_binding:{
    version:'reality-personal-action-authority-v0.1',
    user_confirmation:'APPROVE_THIS_EXACT_WORK_ITEM',
    principal_id:'test-user',conversation_id:'test-conversation',
    goal_id:binding.goal_id,goal_revision:binding.goal_revision,
    goal_transition_receipt_id:binding.goal_transition_receipt_id,
    continuity_root_id:binding.continuity_root_id,
    world_id:binding.world_id,
    goal_source_user_message_ref:binding.goal_source_user_message_ref,
    work_item_fingerprint:binding.work_item_fingerprint,
  }};
  const serverFreshGoalAdmission=issueFreshGoalExecutionAdmission({
    workItem:item,groundingProof,latestAuthoritativeState:state,
    principalId:'test-user',conversationId:'test-conversation',
    policy:goalBoundPolicy,authorization,serverApprovalProof,
  });
  // A simulated DB adapter for these pure unit tests. Real execution uses
  // reality_begin_reserved_execution RPC under the existing goal epoch lock.
  const reservationId='00000000-0000-4000-8000-000000000201';
  let consumed=false;
  const reservationStore={
    async begin({reservationId:id}){
      if(id!==reservationId||consumed)throw Error('EXECUTION_RESERVATION_ALREADY_CONSUMED');
      consumed=true;
      return {status:'DISPATCHING',reservation_id:id,single_use_claim_consumed:true};
    },
    async settle({reservationId:id,outcome}){
      if(id!==reservationId||!consumed)throw Error('EXECUTION_RESERVATION_NOT_DISPATCHED');
      return {status:outcome,reservation_id:id};
    },
  };
  const serverSingleUseReservation={
    status:'RESERVED_NOT_DISPATCHED',reservation_id:reservationId,
    principal_id:'test-user',conversation_id:'test-conversation',
    policy_id:goalBoundPolicy.policy_id,
    work_fingerprint:binding.work_item_fingerprint,
  };
  return {authorization,serverApprovalProof,serverFreshGoalAdmission,
    serverSingleUseReservation,reservationStore};
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

test('a valid action signature alone cannot execute without fresh goal grounding',async()=>{
 let executed=false;
 const {authorization,serverApprovalProof}=approved();
 const r=await executeAuthorizedWork({
  workItem,workflowId:workItem.workflow_id,authorization,serverApprovalProof,
  connector:{execute:async()=>{executed=true}},
  independentVerifier:{verify:async()=>({verified:true,independent:true})},
 });
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.blocked_reason,'EXECUTION_FRESH_GOAL_ADMISSION_REQUIRED');
 assert.equal(executed,false);
});

test('changed, forged or expired goal admission cannot invoke connector writes',async()=>{
 const grant=approved();
 for(const admission of [
  {...grant.serverFreshGoalAdmission,goal_id:'attacker-goal'},
  {...grant.serverFreshGoalAdmission,expires_at:'2000-01-01T00:00:00.000Z'},
 ]){
  let executed=false;
  const r=await executeAuthorizedWork({
   workItem,workflowId:workItem.workflow_id,
   authorization:grant.authorization,serverApprovalProof:grant.serverApprovalProof,
   serverFreshGoalAdmission:admission,
   connector:{execute:async()=>{executed=true}},
   independentVerifier:{verify:async()=>({verified:true,independent:true})},
  });
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.blocked_reason,'EXECUTION_FRESH_GOAL_ADMISSION_SIGNATURE_INVALID');
  assert.equal(executed,false);
 }
});

test('non-preview connector execution fails closed even with an old signed admission',async()=>{
 const grant=approved();
 const previous=process.env.VERCEL_ENV;
 try{
  process.env.VERCEL_ENV='production';
  let executed=false;
  const r=await executeAuthorizedWork({
   workItem,workflowId:workItem.workflow_id,...grant,
   connector:{execute:async()=>{executed=true}},
   independentVerifier:{verify:async()=>({verified:true,independent:true})},
  });
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.blocked_reason,'EXECUTION_GOAL_ADMISSION_PREVIEW_ONLY');
  assert.equal(executed,false);
 }finally{process.env.VERCEL_ENV=previous}
});

test('even fresh goal plus signed approval is blocked without durable single-use reservation',async()=>{
 const grant=approved();
 delete grant.reservationStore;
 delete grant.serverSingleUseReservation;
 let invoked=false;
 const r=await executeAuthorizedWork({
  workItem,workflowId:workItem.workflow_id,...grant,
  connector:{execute:async()=>{invoked=true}},
  independentVerifier:{verify:async()=>({verified:true,independent:true})},
 });
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.blocked_reason,'EXECUTION_DURABLE_SINGLE_USE_RESERVATION_REQUIRED');
 assert.equal(invoked,false);
});

test('duplicate dispatch of one reservation cannot execute a second provider effect',async()=>{
 const grant=approved();let count=0;
 const params={workItem,workflowId:workItem.workflow_id,...grant,
  connector:{execute:async()=>{count++;return {observation:{state:'written'}}}},
  independentVerifier:{verify:async()=>({verified:true,independent:true})},
 };
 const first=await executeAuthorizedWork(params);
 const second=await executeAuthorizedWork(params);
 assert.equal(first.status,'VERIFIED');
 assert.equal(second.status,'BLOCKED');
 assert.equal(second.blocked_reason,'EXECUTION_RESERVATION_ALREADY_CONSUMED');
 assert.equal(count,1);
});

test('racing dispatch attempts on same reservation are serialized by trusted DB begin',async()=>{
 const grant=approved();let count=0;
 const params={workItem,workflowId:workItem.workflow_id,...grant,
  connector:{execute:async()=>{count++;return {observation:{state:'written'}}}},
  independentVerifier:{verify:async()=>({verified:true,independent:true})},
 };
 const results=await Promise.all([executeAuthorizedWork(params),executeAuthorizedWork(params)]);
 assert.equal(results.filter(x=>x.status==='VERIFIED').length,1);
 assert.equal(results.filter(x=>x.status==='BLOCKED').length,1);
 assert.equal(count,1);
});

test('connector timeout consumes reservation, records UNCERTAIN and never auto retries',async()=>{
 const grant=approved();let count=0,uncertain=false;
 const settle=grant.reservationStore.settle;
 grant.reservationStore.settle=async args=>{
  uncertain=args.outcome==='UNCERTAIN';
  return settle(args);
 };
 const params={workItem,workflowId:workItem.workflow_id,...grant,
  connector:{execute:async()=>{count++;throw Error('NETWORK_TIMEOUT')}},
  independentVerifier:{verify:async()=>{throw Error('SHOULD_NOT_VERIFY')}},
 };
 const first=await executeAuthorizedWork(params);
 const second=await executeAuthorizedWork(params);
 assert.equal(first.status,'UNRESOLVED');
 assert.equal(first.outcome.no_automatic_retry,true);
 assert.equal(first.reservation_state,'UNCERTAIN');
 assert.equal(uncertain,true);
 assert.equal(second.status,'BLOCKED');
 assert.equal(count,1);
});

test('changed goal epoch at dispatch leaves provider untouched and reservation unspent',async()=>{
 const grant=approved();let count=0;
 grant.reservationStore.begin=async()=>{throw Error('EXECUTION_DISPATCH_GROUNDING_CHANGED')};
 const r=await executeAuthorizedWork({
  workItem,workflowId:workItem.workflow_id,...grant,
  connector:{execute:async()=>{count++}},
  independentVerifier:{verify:async()=>({verified:true,independent:true})},
 });
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.blocked_reason,'EXECUTION_DISPATCH_GROUNDING_CHANGED');
 assert.equal(count,0);
});

test('lost settlement readback never turns a provider result into verified durable outcome',async()=>{
 const grant=approved();let count=0;
 grant.reservationStore.settle=async()=>{throw Error('DATABASE_UNAVAILABLE')};
 const r=await executeAuthorizedWork({
  workItem,workflowId:workItem.workflow_id,...grant,
  connector:{execute:async()=>{count++;return {observation:{state:'written'}}}},
  independentVerifier:{verify:async()=>({
   verified:true,independent:true,verification_id:'independent:mock-readback',
  })},
 });
 assert.equal(count,1);
 assert.equal(r.status,'UNRESOLVED');
 assert.equal(r.blocked_reason,'EXECUTION_SETTLEMENT_UNCONFIRMED_NO_RETRY');
 assert.equal(r.outcome.verified,false);
 assert.equal(r.outcome.no_automatic_retry,true);
});
