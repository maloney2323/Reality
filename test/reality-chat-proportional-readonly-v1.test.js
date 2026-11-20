import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isProportionalReadOnlyChat,generateProportionalReadOnlyReply,
 reconcileReadOnlyOperationalAnswer}
 from '../src/reality-chat-proportional-readonly-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conv='9d5b6de1-ecf0-42d8-a86a-b9c5396a4139';
const request='a6da2917-8573-40d8-80d8-305eedfb777a';
const source='supabase:reality_chat_messages:ea8a0442-41da-4aa6-a12f-6e2f17c12974';
const message='It seems we need some kind of authorization or verification engine. Is that correct?';
const args={message,conversationId:conv,requestId:request,
 ownerId:owner,sourceRef:source,
 verifiedPriorTurns:[{role:'user',text:'I want useful employee weekly jobs.',
  request_id:'c1d279ca-3fd1-414e-a8ee-e233264d3b72',
  source_ref:'supabase:reality_chat_messages:a0ed3d30-cc3d-42b2-837b-5e229068e82f'}],
 worldlineId:'personal:chat:'+'a'.repeat(64),
 ownerContext:{current_work_intake_status:'NEEDS_AUTHORIZED_SCOPE',
  worker_scope_limits_external_execution_only:true},
 verifiedUniverseObservations:[],apiKey:'sk-test-model-key-1234567890123456789'};
test('conversation and planning do not need a work approval or a new engine',()=>{
 for(const q of [
  message,
  'Can you tell me if our employees have a full week of work?',
  'Can you build it? Or are you missing the capability to build right now?',
  'Can you deploy the application?',
  'Could you explain how to fix the shift handoff?',
  'What is your governed opinion on whether this can be built?',
  'I think we need to fill the employee categories with useful work each week.',
  'Why does Reality keep asking for authorization to answer me?',
  'Show me the current job backlog and explain its readiness.'
 ])assert.equal(isProportionalReadOnlyChat({message:q}),true,q);
});
test('actual action requests, explicit goal mutation and web research retain governed action path',()=>{
 for(const q of [
  'Reality, build an employee dashboard now',
  'Please install the verified repair',
  'Deploy the application now',
  'Go ahead and start the authorized shift',
  'Approve this exact installation',
  'Run the workers now'
 ])assert.equal(isProportionalReadOnlyChat({message:q}),false,q);
 assert.equal(isProportionalReadOnlyChat({message,goalCommand:'replace_goal'}),false);
 assert.equal(isProportionalReadOnlyChat({message,publicResearch:true}),false);
});
test('ability question gets a verified model response without assuming any build authority',async()=>{
 const q='Can you build it? Or are you missing the capability to build right now?';
 assert.equal(isProportionalReadOnlyChat({message:q}),true);
 let invoked=0;
 const response=await generateProportionalReadOnlyReply({...args,message:q,
  runtime:async params=>{
   invoked++;
   assert.equal(params.message,q);
   assert.equal(params.systemContext.governance_proportionality.mode,
    'READ_ONLY_CONVERSATION');
   assert.equal(params.systemContext.governance_proportionality.execution_authorized,false);
   assert.equal(params.systemContext.governance_proportionality.installation_authorized,false);
   assert.equal(params.publicResearchEnabled,false);
   return {mode:'FAST',authority_granted:false,execution_authorized:false,
    answer:'I can help prepare a tested candidate, but live install readiness is not proven.'};
  }
 });
 assert.equal(invoked,1);
 assert.match(response.answer,/not proven/);
 assert.equal(response.execution_authorized,false);
 assert.equal(response.installation_authorized,false);
});
test('existing Signal Cleaner and model receive exact saved question and owner history without worker write',async()=>{
 let calls=0;
 const result=await generateProportionalReadOnlyReply({...args,
  runtime:async params=>{
   calls++;
   assert.equal(params.message,message);
   assert.equal(params.cognitionEffort,'CONVERSATION');
   assert.equal(params.publicResearchEnabled,false);
   assert.equal(params.systemContext.current_owner_request_id,request);
   assert.equal(params.systemContext.exact_authenticated_user_source_ref,source);
   assert.equal(params.systemContext.conversation_continuity.recent_exchanges.length,1);
   assert.equal(params.systemContext.governance_proportionality.installation_authorized,false);
   assert.equal(params.systemContext.governance_proportionality.missing_worker_authorization_does_not_forbid_a_chat_answer,true);
   assert(params.governedSignal.packet.packet_id);
   return {mode:'FAST',authority_granted:false,execution_authorized:false,
    answer:'No. Reality already has governance. It should answer and plan without new authorization.',model:'gpt-4.1-mini'};
  }
 });
 assert.equal(calls,1);
 assert.match(result.answer,/should answer/);
 assert.equal(result.external_actions_authorized,false);
 assert.equal(result.execution_authorized,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.semantic_correctness_independently_verified,false);
});
test('authenticated Chat rejects fictional sandbox results and redundant shift authorization',async()=>{
 const shift={owner_shift_authorization_recorded:true,
  shift_start_command_already_satisfied:true,
  shift_status:'AWAITING_EXACT_ORIGINAL_WORK',
  active_owner_shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce'};
 const cases=[
  'Sandbox deployment simulation completed successfully. All independent acceptance tests passed.',
  'Owner approval has been recorded here in chat. Please confirm installation again.',
  'No authorized active shift exists; you must formally start an authorized shift.',
  'I will now execute a sandbox deployment simulation and publish results.'
 ];
 for(const claim of cases){
  const checked=reconcileReadOnlyOperationalAnswer({
   answer:claim,ownerContext:{currently_authorized_shift:shift}
  });
  assert.equal(checked.disposition,'UNSUPPORTED_OPERATIONAL_CLAIM_REPLACED_WITH_OWNER_SCOPED_TRUTH');
  assert.match(checked.answer,/existing owner-authorized shift/);
  assert.match(checked.answer,/did not run a sandbox simulation/);
  assert.match(checked.answer,/does not need a second start/);
  assert.doesNotMatch(checked.answer,/simulation completed successfully/);
 }
 const valid=reconcileReadOnlyOperationalAnswer({answer:'The existing shift is still open; the test artifact has not been independently verified.',
  ownerContext:{currently_authorized_shift:shift}});
 assert.equal(valid.disposition,'CONVERSATIONAL_CLAIMS_UNCHANGED');
 const result=await generateProportionalReadOnlyReply({...args,
  ownerContext:{currently_authorized_shift:shift},
  runtime:async()=>({mode:'FAST',authority_granted:false,
   execution_authorized:false,answer:cases[0]})
 });
 assert.match(result.answer,/did not run a sandbox simulation/);
 assert.equal(result.execution_authorized,false);
 assert.equal(result.installation_authorized,false);
});
test('assistant cannot publish an action receipt or a forged authority through read-only cognition',async()=>{
 for(const bad of [
  {mode:'FAST',authority_granted:true,execution_authorized:false,answer:'Hi'},
  {mode:'FAST',authority_granted:false,execution_authorized:true,answer:'Hi'},
  {mode:'DEEP',authority_granted:false,execution_authorized:false,answer:'Hi'},
  {mode:'FAST',authority_granted:false,execution_authorized:false,answer:''},
 ]){
  await assert.rejects(()=>generateProportionalReadOnlyReply({...args,
   runtime:async()=>bad
  }),/CHAT_READ_ONLY_MODEL_OUTPUT_OR_EXECUTION_BOUNDARY_UNVERIFIED/);
 }
});
test('owner session and genuine saved message are prerequisites to any model call',async()=>{
 let calls=0;
 for(const changed of [
  {...args,requestId:'fake'},
  {...args,sourceRef:'claimed'},
  {...args,ownerId:'fake'},
  {...args,apiKey:''},
 ]){
  await assert.rejects(()=>generateProportionalReadOnlyReply({
   ...changed,runtime:async()=>{calls++}
  }),/CHAT_READ_ONLY_TRUSTED_CURRENT_TURN_REQUIRED/);
 }
 assert.equal(calls,0);
});
test('unavailable goal-state provider produces transparent non-durable advisory, not silent Chat failure',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const read=api.indexOf("stage='READ_ONLY_OWNER_GOAL_EPOCH'");
 const model=api.indexOf("stage='READ_ONLY_MODEL_COGNITION'",read);
 const transient=api.indexOf('if(!goalEpoch){',model);
 const atomic=api.indexOf("stage='READ_ONLY_ATOMIC_ASSISTANT_PUBLICATION'",transient);
 assert.ok(read>=0&&model>read&&transient>model&&atomic>transient,
  'temporary answer must use the existing model and remain before atomic publication');
 const branch=api.slice(read,atomic);
 assert.ok(branch.includes('if(Number(epochError?.status)!==503)throw epochError;'));
 assert.match(branch,/readPrivateChatGoalPublicationEpoch/);
 assert.match(branch,/current_answer_persisted:false/);
 assert.match(branch,/goal_publication_atomicity:'UNAVAILABLE'/);
 assert.match(branch,/transient_answer_only:true/);
 assert.match(branch,/installation_authorized:false/);
 assert.match(branch,/reply_recovery_requires_exact_saved_request:true/);
 assert.doesNotMatch(branch,/queueOwnerGovernedBuild|approveOwnerInstall|executeOneRegisteredMaintenanceAction/);
 assert.match(ui,/REALITY · TEMPORARY ANSWER · NOT SAVED · NO EXECUTION/);
 assert.ok(ui.includes('if(transientAnswer){'));
 assert.ok(ui.includes('No work was authorized. Retry this same saved reply'));
 assert.ok(ui.includes('outcome.original_request_id===message.request_id'));
 assert.ok(ui.includes('outcome.execution?.installation_authorized===false'));
});

test('read-only HTTP publication uses existing atomic owner-goal CAS and exact RLS, not a new action engine',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const helper=readFileSync(new URL('../src/reality-chat-proportional-readonly-v1.js',import.meta.url),'utf8');
 const model=readFileSync(new URL('../src/reality-model-gateway-v0.1.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261115020000_indexed_governed_wake_health_readback_v1.sql',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(api,/isProportionalReadOnlyChat/);
 assert.match(api,/generateProportionalReadOnlyReply/);
 assert.match(api,/READ_ONLY_ATOMIC_ASSISTANT_PUBLICATION/);
 assert.match(api,/publishPrivateAssistantAtomically/);
 assert.match(api,/READ_ONLY_EXACT_REPLY_RLS_READBACK/);
 assert.match(api,/readPrivateChatRequest\(session,\{conversationId,requestId\}\)/);
 assert.match(api,/external_actions_authorized:false/);
 assert.match(api,/wantsWorkerHealth\?/);
 assert.match(helper,/runRealityCognitiveRuntime/);
 assert.match(model,/PROPORTIONAL INTELLIGENCE GOVERNANCE CONTRACT/);
 assert.match(sql,/ORDER BY d\.runid DESC LIMIT 1/);
 assert.match(sql,/created >= clock_timestamp\(\)-interval '30 minutes'/);
 assert.doesNotMatch(sql,/ORDER BY d\.start_time DESC/);
 assert.match(index,/recovered_from_exact_owner_readback:true/);
 assert.match(index,/data\.read_only_conversation===true/);
 assert.match(index,/status\('Reply saved\.'\)/);
 assert.match(index,/if\(!saved\?\.ok\|\|saved\.saved!==true\)throw intakeError/);
});
