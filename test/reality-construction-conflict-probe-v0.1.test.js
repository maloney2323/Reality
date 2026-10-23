import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneConversationScope} from '../src/reality-standalone-auth-v0.1.js';
import {observeUserConditions} from '../src/reality-obligation-observation-v0.1.js';
import {evaluateConstructionConflict,getAuthenticatedConstructionConflictProbe,
 SYNTHETIC_PROPOSAL} from '../src/reality-construction-conflict-probe-v0.1.js';
const user='e83340ec-4266-4c95-a6cd-929bc58b445e';
const other='f44440ec-4266-4c95-a6cd-929bc58b445f';
const scope=createStandaloneConversationScope({userId:user,conversationId:'pilot-job'});
const policyScope={owner_user_id:user,continuity_root_id:scope.continuity_root_id,
 worldline_id:scope.worldline_id,work_item_id:'conversation:'+scope.client_conversation_selector};
const rows=observeUserConditions({trustedScope:policyScope,
 userSignal:{entry_id:'signed-message:construction:rule',turn_id:'turn:3',
 text:'For the construction job, do not send an estimate until the homeowner approves it.'},
 observedAt:'2026-10-23T18:13:32.025Z'});
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
const req=(v={})=>({
 method:'GET',headers:{authorization:'Bearer signed-session-test-token-abc123'},
 query:{conversation_id:'pilot-job',thought_id:'personal'},...v,
});
const fakeAuth=(id=user)=>async(url)=>{
 assert.ok(url.endsWith('/auth/v1/user'),'No calls to models or external send tools');
 return {ok:true,status:200,json:async()=>({id,is_anonymous:false})};
};
test('saved homeowner condition detects synthetic conflicting model proposal and denies dry-run action',()=>{
 const x=evaluateConstructionConflict({scope,verifiedObservationEntries:rows});
 assert.equal(x.injected_model_proposal,SYNTHETIC_PROPOSAL);
 assert.equal(x.stimulus_type,'SYNTHETIC_MODEL_PROPOSAL_NOT_ACTUAL_LLM_OUTPUT');
 assert.equal(x.detected,'CONFLICT_CANDIDATE_DETECTED');
 assert.equal(x.candidate_count,1);
 assert.deepEqual(x.candidate_classifications,['CONVERSATIONAL_PRECONDITION_DRIFT']);
 assert.equal(x.demo_result,'DETECTED_AND_SIMULATED_ACTION_DENIED');
 assert.equal(x.simulated_decision,'DENIED_MISSING_VERIFIED_APPROVAL');
 assert.equal(x.observed_conditions,1);
 assert.equal(x.evidence_references[0].entry_id,rows[0].entry_id);
 assert.equal(x.evidence_references[0].ledger_hash,rows[0].ledger_entry_hash);
 assert.equal(x.tool_call_count,0);
 assert.equal(x.real_model_was_called,false);
 assert.equal(x.external_action_executed,false);
 assert.equal(x.actual_business_tool_wired,false);
 assert.equal(x.effect_containment_claim,'DRY_RUN_ONLY_NOT_LIVE_TOOL_ENFORCEMENT');
 assert.equal(x.real_model_error_rate,null);
 assert.equal(x.reality_residual_error_rate,null);
 assert.match(x.deterministic_receipt_hash,/^sha256:[0-9a-f]{64}$/);
});
test('replay over same confirmed observation produces stable receipt and no DB writes',()=>{
 const a=evaluateConstructionConflict({scope,verifiedObservationEntries:rows});
 const b=evaluateConstructionConflict({scope,verifiedObservationEntries:rows});
 assert.equal(a.deterministic_receipt_hash,b.deterministic_receipt_hash);
 assert.equal(a.persistence,'READ_ONLY_SOURCE_EVIDENCE_RECEIPTS_NO_PROBE_WRITE');
 assert.equal(a.semantic_error_independently_adjudicated,false);
});
test('no rule or foreign tenant produces inconclusive detection but still denies simulated action',()=>{
 for(const entries of [[],observeUserConditions({
  trustedScope:{...policyScope,owner_user_id:other,continuity_root_id:'continuity:other'},
  userSignal:{entry_id:'other:msg',turn_id:'x',text:'Do not send the estimate until approval.'},
  observedAt:'2026-10-23T18:13:32.025Z'})]){
  const x=evaluateConstructionConflict({scope,verifiedObservationEntries:entries});
  assert.equal(x.candidate_count,0);
  assert.equal(x.detected,'NO_OBSERVED_CONDITION');
  assert.equal(x.simulated_decision,'DENIED_NO_VERIFIED_POLICY_OR_APPROVAL');
  assert.equal(x.simulated_execution_allowed,false);
 }
});
test('if lexical detection misses a proposal, dry-run gate still does not grant execution',()=>{
 const x=evaluateConstructionConflict({scope,verifiedObservationEntries:rows,
  injectedProposal:'Proceed with the customer transmission immediately.'});
 assert.equal(x.detected,'CONFLICT_NOT_DETECTED');
 assert.equal(x.simulated_decision,'DENIED_MISSING_VERIFIED_APPROVAL');
 assert.equal(x.external_action_executed,false);
});
test('tampered owner-scoped stored policy fails validation before a PASS-like result',()=>{
 const bad={...rows[0],payload:{...rows[0].payload,
  condition_text:'No approval required'}};
 assert.throws(()=>evaluateConstructionConflict({scope,verifiedObservationEntries:[bad]}),
  /UNIVERSE_LEDGER_HASH_MISMATCH/);
});
test('authenticated Preview endpoint checks owner scope then returns read-only simulated evidence',async()=>{
 let n=0;
 const result=await getAuthenticatedConstructionConflictProbe(req(),{
  env,fetchImpl:fakeAuth(),
  load:async params=>{
   n++;assert.equal(params.continuityRootId,scope.continuity_root_id);
   assert.equal(params.eventKind,'USER_STATED_CONDITION_OBSERVATION');
   return{status:'AVAILABLE',entries:rows};
  },
 });
 assert.equal(n,1);
 assert.equal(result.detected,'CONFLICT_CANDIDATE_DETECTED');
 assert.equal(result.tool_call_count,0);
});
test('browser cannot inject proposal, approval or authority via GET selectors',async()=>{
 let loads=0;
 await assert.rejects(()=>getAuthenticatedConstructionConflictProbe(req({
  query:{conversation_id:'pilot-job',thought_id:'personal',verified_approval:true,
   proposal:'Send estimate regardless'},
 }),{env,fetchImpl:fakeAuth(),load:async()=>{loads++;return {status:'AVAILABLE',entries:rows}}}),
 /CONFLICT_PROBE_SELECTOR_INVALID/);
 assert.equal(loads,0);
});
test('unauthenticated caller cannot discover or test stored business obligations',async()=>{
 let reads=0;
 await assert.rejects(()=>getAuthenticatedConstructionConflictProbe(req(),{
  env,fetchImpl:async()=>({status:401,ok:false,json:async()=>({})}),
  load:async()=>{reads++;}
 }),/AUTHENTICATED_SESSION_INVALID/);
 assert.equal(reads,0);
});
test('disabled feature and production environment fail before persistence or provider authentication',async()=>{
 for(const bad of [
  {...env,VERCEL_ENV:'production'},
  {...env,REALITY_STANDALONE_OBLIGATION_OBSERVATION_ENABLED:'false'},
 ]){
  let touched=0;
  await assert.rejects(()=>getAuthenticatedConstructionConflictProbe(req(),{
   env:bad,fetchImpl:async()=>{touched++},load:async()=>{touched++},
  }));
  assert.equal(touched,0);
 }
});
