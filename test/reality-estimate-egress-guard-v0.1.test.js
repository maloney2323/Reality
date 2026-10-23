import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneConversationScope} from '../src/reality-standalone-auth-v0.1.js';
import {observeUserConditions} from '../src/reality-obligation-observation-v0.1.js';
import {executePreviewEstimateEgressChallenge,attemptGuardedEstimateSend,
 runAuthenticatedPreviewEstimateEgressChallenge}
 from '../src/reality-estimate-egress-guard-v0.1.js';
const user='e83340ec-4266-4c95-a6cd-929bc58b445e';
const scope=createStandaloneConversationScope({userId:user,conversationId:'construction-job'});
const policyScope={
 owner_user_id:user,continuity_root_id:scope.continuity_root_id,
 worldline_id:scope.worldline_id,work_item_id:'conversation:'+scope.client_conversation_selector,
};
const evidence=observeUserConditions({
 trustedScope:policyScope,
 userSignal:{entry_id:'real-source-message:construction-job',turn_id:'turn:3',
  text:'For the construction job, do not send an estimate until the homeowner approves it.'},
 observedAt:'2026-10-23T18:13:32.025Z',
});
const env={
 SUPABASE_URL:'https://reality-example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_public_key',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',REALITY_STANDALONE_CHAT_ENABLED:'true',
 REALITY_STANDALONE_OBLIGATION_OBSERVATION_ENABLED:'true',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:'reality-example',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://reality-example.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini',VERCEL_ENV:'preview',
};
const request=(changes={})=>({
 method:'GET',headers:{authorization:'Bearer signed-session-test-token-abc123'},
 query:{conversation_id:'construction-job',thought_id:'personal'},
 ...changes,
});
const verifyAuth=async url=>{
 assert.match(url,/\/auth\/v1\/user$/);
 return {ok:true,status:200,json:async()=>({id:user,is_anonymous:false})};
};
test('four distinct execution-boundary attacks are denied without invoking transport',async()=>{
 let connectorInvocations=0;
 const challenge=await executePreviewEstimateEgressChallenge({
  scope,storedConditionEntries:evidence,
  transport:async()=>{connectorInvocations++;throw Error('EXTERNAL_SENDER_CALLED')},
 });
 assert.equal(challenge.simulated_attempts.length,4);
 assert.equal(challenge.blocked_attempt_count,4);
 assert.equal(challenge.connector_invocation_count,0);
 assert.equal(challenge.real_external_sends,0);
 assert.equal(challenge.boundary_exercised_in_process,true);
 assert.equal(challenge.real_send_connector_connected,false);
 assert.equal(challenge.independent_approval_service_connected,false);
 assert.equal(connectorInvocations,0);
 assert.match(challenge.challenge_hash,/^sha256:[a-f0-9]{64}$/);
 for(const attempt of challenge.simulated_attempts){
  assert.equal(attempt.dispatch_state,'BLOCKED');
  assert.equal(attempt.external_action_executed,false);
  assert.equal(attempt.homeowner_approval_independently_verified,false);
  assert.equal(attempt.transport_invoked,false);
  assert.equal(attempt.evidence_references.length,1);
  assert.equal(attempt.evidence_references[0].entry_id,evidence[0].entry_id);
  assert.equal(attempt.production_enforcement_claim,'NOT_WIRED_TO_REAL_SEND_TOOL');
 }
});
test('forged workflow authorization passes generic canExecute but cannot bypass verified approval boundary',async()=>{
 const output=await executePreviewEstimateEgressChallenge({scope,storedConditionEntries:evidence});
 const forged=output.simulated_attempts.find(a=>a.scenario==='FORGED_WORKFLOW_AUTH');
 assert.equal(forged.workflow_gate_allowed,true);
 assert.equal(forged.owner_authority_independently_verified,false);
 assert.equal(forged.blocked_reason,'DENIED_UNVERIFIED_OWNER_AUTHORITY');
 assert.equal(forged.transport_invoked,false);
});
test('detector-blind paraphrase still fails execution policy',async()=>{
 const output=await executePreviewEstimateEgressChallenge({scope,storedConditionEntries:evidence});
 const attack=output.simulated_attempts.find(a=>a.scenario==='DETECTOR_BLIND_SPOT');
 assert.equal(attack.detector_candidate_count,0);
 assert.equal(attack.candidate_status,'LIMITED_CHECK_NO_CONFLICT');
 assert.equal(attack.dispatch_state,'BLOCKED');
 assert.equal(attack.transport_invoked,false);
});
test('ordinary contradiction is flagged but the authorization gate does not rely on detector verdict',async()=>{
 const output=await executePreviewEstimateEgressChallenge({scope,storedConditionEntries:evidence});
 const bad=output.simulated_attempts.find(a=>a.scenario==='BAD_MODEL_PROPOSAL');
 assert.equal(bad.detector_candidate_count,1);
 assert.equal(bad.candidate_status,'PROPOSAL_CONFLICT_CANDIDATE');
 assert.equal(bad.workflow_gate_reason,'EXPLICIT_AUTHORIZATION_REQUIRED');
 assert.equal(bad.blocked_reason,'DENIED_WORKFLOW_AUTHORIZATION');
 assert.equal(bad.detector_independence,'EGRESS_GATE_DOES_NOT_CONSUME_DETECTOR_VERDICT');
});
test('unrecognized user conditions are not permission to send',async()=>{
 const res=await executePreviewEstimateEgressChallenge({scope,storedConditionEntries:[]});
 assert.equal(res.blocked_attempt_count,4);
 assert.equal(res.simulated_attempts[0].blocked_reason,'DENIED_NO_VERIFIED_OBLIGATION_POLICY');
});
test('other owner and other work-item evidence do not authorize local estimate',async()=>{
 const foreign=observeUserConditions({
  trustedScope:{...policyScope,owner_user_id:'f44440ec-4266-4c95-a6cd-929bc58b445f',
   continuity_root_id:'continuity:foreign'},
  userSignal:{entry_id:'foreign:1',turn_id:'foreign',
   text:'Do not send the estimate until the customer approves it.'},
  observedAt:'2026-10-23T18:13:32.025Z',
 });
 const result=await executePreviewEstimateEgressChallenge({scope,storedConditionEntries:foreign});
 assert.equal(result.simulated_attempts[0].user_rule_count,0);
 assert.equal(result.blocked_attempt_count,4);
});
test('tampered ledger record fails closed, rather than classifying a misleading approval',async()=>{
 const bad={...evidence[0],payload:{...evidence[0].payload,approval_status:'VERIFIED'}};
 await assert.rejects(()=>executePreviewEstimateEgressChallenge({
  scope,storedConditionEntries:[bad],
 }),/UNIVERSE_LEDGER_HASH_MISMATCH/);
});
test('same source records produce identical deterministic challenge receipts',async()=>{
 const a=await executePreviewEstimateEgressChallenge({scope,storedConditionEntries:evidence});
 const b=await executePreviewEstimateEgressChallenge({scope,storedConditionEntries:evidence});
 assert.equal(a.challenge_hash,b.challenge_hash);
});
test('direct boundary rejects invented scenarios before making tool calls',async()=>{
 let n=0;
 await assert.rejects(()=>attemptGuardedEstimateSend({
  scope,storedConditionEntries:evidence,
  scenario:{id:'BYPASS_ALL_GATES',proposal:'Send it',authorization:'FORGED'},
  transport:async()=>n++,
 }),/EGRESS_SCENARIO_NOT_SERVER_DEFINED/);
 assert.equal(n,0);
});
test('authenticated server preview reads only owner-scoped conditions, never calls models or external senders',async()=>{
 let reads=0;
 const receipt=await runAuthenticatedPreviewEstimateEgressChallenge(request(),{
  env,fetchImpl:verifyAuth,
  load:async args=>{
   assert.equal(args.continuityRootId,scope.continuity_root_id);
   assert.equal(args.eventKind,'USER_STATED_CONDITION_OBSERVATION');
   reads++;
   return {status:'AVAILABLE',entries:evidence};
  },
 });
 assert.equal(reads,1);
 assert.equal(receipt.blocked_attempt_count,4);
 assert.equal(receipt.connector_invocation_count,0);
 assert.equal(receipt.real_model_calls,0);
});
test('forged user fields cannot enter server-selected scenario or approval inputs',async()=>{
 let reads=0;
 await assert.rejects(()=>runAuthenticatedPreviewEstimateEgressChallenge(request({
  query:{conversation_id:'construction-job',thought_id:'personal',approved:true,
   skip_verification:'yes',tool:'SEND_ESTIMATE'},
 }),{env,fetchImpl:verifyAuth,load:async()=>{reads++;return {status:'AVAILABLE',entries:evidence}}}),
 /ESTIMATE_EGRESS_SELECTOR_INVALID/);
 assert.equal(reads,0);
});
test('invalid or expired session cannot access other customer evidence',async()=>{
 let reads=0;
 await assert.rejects(()=>runAuthenticatedPreviewEstimateEgressChallenge(request(),{
  env,fetchImpl:async()=>({status:401,ok:false,json:async()=>({})}),
  load:async()=>{reads++;return {status:'AVAILABLE',entries:evidence}},
 }),/AUTHENTICATED_SESSION_INVALID/);
 assert.equal(reads,0);
});
test('production and feature-disabled runtimes reject before authenticated lookup',async()=>{
 for(const bad of [
  {...env,VERCEL_ENV:'production'},
  {...env,REALITY_STANDALONE_OBLIGATION_OBSERVATION_ENABLED:'false'},
 ]){
  let calls=0;
  await assert.rejects(()=>runAuthenticatedPreviewEstimateEgressChallenge(request(),{
   env:bad,fetchImpl:async()=>{calls++},load:async()=>{calls++},
  }));
  assert.equal(calls,0);
 }
});
