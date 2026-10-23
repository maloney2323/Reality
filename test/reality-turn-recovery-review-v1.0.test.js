import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyTurnRecovery,reviewOwnerTurn}
 from '../src/reality-turn-recovery-review-v1.0.js';

const id='34a9627b-a521-4cb1-9db4-9ab4e2d7d190';
const env={
 VERCEL_ENV:'preview',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test-only-not-real',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_testonlynotarealcredential222',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_STANDALONE_CHAT_ENABLED:'true',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-test-only-not-real-key-222',
 REALITY_OPENAI_MODEL:'gpt-test',
 REALITY_CAUSAL_SEQUENCE_ENABLED:'true',
};
const fence={status:'BUSY',active_turn_id:'turn-one',sequence_num:1};
const turn=(status,fields={})=>({status,turn_id:'turn-one',committed:false,...fields});
test('actual earlier interruption: user record only cannot be falsely declared safe',()=>{
 const x=classifyTurnRecovery({turn:turn('RECEIVED'),fence,turnId:'turn-one'});
 assert.equal(x.status,'INCOMPLETE_TURN_REVIEW_REQUIRED');
 assert.equal(x.allowed_to_retry_model,false);
 assert.equal(x.allowed_to_release_fence,false);
});
test('actual later interruption: processing and interruption receipt do not imply completion',()=>{
 const x=classifyTurnRecovery({turn:turn('INTERRUPTED',{evidence:{
  processing_receipt_entry_id:'receipt',interruption_recorded:true,
  assistant_message_entry_id:null}}),fence,turnId:'turn-one'});
 assert.equal(x.status,'INCOMPLETE_TURN_REVIEW_REQUIRED');
 assert.equal(x.allowed_to_release_fence,false);
});
test('no record but busy fence is inconsistent, not permission to rerun',()=>{
 const x=classifyTurnRecovery({turn:turn('NOT_RECEIVED'),fence,turnId:'turn-one'});
 assert.equal(x.status,'INCONSISTENT_LEDGER_AND_FENCE');
 assert.equal(x.allowed_to_retry_model,false);
});
test('a stored but uncommitted assistant reply cannot be published',()=>{
 const x=classifyTurnRecovery({turn:turn('RESPONSE_STORED_UNCOMMITTED'),
  fence,turnId:'turn-one'});
 assert.equal(x.status,'UNCOMMITTED_RESPONSE_REVIEW_REQUIRED');
 assert.equal(x.allowed_to_release_fence,false);
});
test('verified existing COMMITTED permits only separate strict reconciliation',()=>{
 const x=classifyTurnRecovery({turn:turn('COMMITTED',{committed:true,
   receipt:{verified_chain:true}}),fence,turnId:'turn-one'});
 assert.equal(x.status,'EXISTING_COMMIT_ELIGIBLE_FOR_VERIFIED_RECONCILIATION');
 assert.equal(x.allowed_to_release_fence,false);
 assert.equal(x.allowed_to_retry_model,false);
});
test('verified mismatched active-turn fence is a conflict',()=>{
 const x=classifyTurnRecovery({turn:turn('COMMITTED',{committed:true,
  receipt:{verified_chain:true}}),fence:{...fence,active_turn_id:'other'},
  turnId:'turn-one'});
 assert.equal(x.status,'CONFLICT_REVIEW_REQUIRED');
});
test('absent evidence and no processing lock gets narrow reviewed-new-turn classification',()=>{
 const x=classifyTurnRecovery({turn:turn('NOT_RECEIVED'),fence:{status:'NO_FENCE'},turnId:'turn-one'});
 assert.equal(x.status,'NO_DURABLE_TURN_EVIDENCE');
 assert.equal(x.allowed_to_retry_model,false);
});
test('authenticated read-only review never accepts caller root/owner, never runs model',async()=>{
 let modelCalls=0,checked=0;
 const result=await reviewOwnerTurn({query:{conversation_id:'conversation-one',turn_id:'turn-one'}},{
  env,verify:async()=>({user_id:id}),
  inspect:async({scope,turnId})=>{
   checked++;
   assert.equal(scope.authenticated_user_id,id);
   assert.equal(turnId,'turn-one');
   return turn('INTERRUPTED',{evidence:{processing_receipt_entry_id:'a',
    interruption_recorded:true,assistant_message_entry_id:null}});
  },
  inspectFence:async({scope})=>{
   assert.equal(scope.authenticated_user_id,id);
   return fence;
  },
  fetchImpl:async()=>{modelCalls++;throw Error('NO_NETWORK_EXPECTED')},
 });
 assert.equal(checked,1);
 assert.equal(modelCalls,0);
 assert.equal(result.model_call_outcome,'NOT_ESTABLISHED_BY_THIS_REVIEW');
 assert.equal(result.phase_evidence.committed_result_verified,false);
 assert.equal(result.no_database_mutation_performed_by_review,true);
});
test('cannot select foreign tenant using caller-provided root/owner',async()=>{
 let auth=0;
 await assert.rejects(reviewOwnerTurn({query:{
  conversation_id:'conversation-one',turn_id:'turn-one',owner_user_id:'someone-else'
 }},{env,verify:async()=>{auth++}}),/RECOVERY_REVIEW_SELECTOR_INVALID/);
 assert.equal(auth,0);
});
test('production environment cannot expose diagnostic endpoint',async()=>{
 await assert.rejects(reviewOwnerTurn({query:{conversation_id:'a',turn_id:'b'}},{
  env:{...env,VERCEL_ENV:'production'},verify:async()=>({user_id:id})
 }),/STANDALONE_PREVIEW_PROJECT_BINDING_INVALID/);
});
