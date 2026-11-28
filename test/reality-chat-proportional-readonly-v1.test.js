import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isProportionalReadOnlyChat,generateProportionalReadOnlyReply,
 reconcileReadOnlyOperationalAnswer,isExistingWorkContinuationReply,prepareExistingWorkContinuationReply}
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
test('ordinary conversation is routed before operational flags and never needs goal epoch',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const classify=api.indexOf('const readOnlyTurn=isProportionalReadOnlyChat');
 const gate=api.indexOf("fail('CHAT_ATOMIC_GOAL_PUBLICATION_REQUIRED'",classify);
 const conversation=api.indexOf("stage='READ_ONLY_BOUNDED_CONTEXT'",gate);
 const action=api.indexOf("stage='COGNITION_AND_RELIABILITY'",conversation);
 assert.ok(classify>=0&&gate>classify&&conversation>gate&&action>conversation);
 assert.match(api.slice(classify,gate),/if\(readOnlyTurn\)[\s\S]*resolvePrivateConversationDatabase\(session\)[\s\S]*else\{/);
 const lane=api.slice(conversation,action).split('// The signed human message entered')[0];
 assert.match(lane,/publishPrivateConversationReply/);
 assert.match(lane,/current_answer_persisted:Boolean\(publication\)/);
 assert.match(lane,/transient_answer_only:!publication/);
 assert.match(lane,/temporal_intelligence/);
 assert.doesNotMatch(lane,/readPrivateChatGoalPublicationEpoch\(|runLiveIntelligenceOrchestration\(|appendAuthenticatedUserGoalCommand\(/);
 assert.match(lane,/external_actions_authorized:false/);
});
test('read-only HTTP publication preserves exact saved turn while consequential actions retain old atomic CAS',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const helper=readFileSync(new URL('../src/reality-chat-proportional-readonly-v1.js',import.meta.url),'utf8');
 const model=readFileSync(new URL('../src/reality-model-gateway-v0.1.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261115020000_indexed_governed_wake_health_readback_v1.sql',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(api,/isProportionalReadOnlyChat/);
 assert.match(api,/generateProportionalReadOnlyReply/);
 assert.match(api,/READ_ONLY_CONVERSATION_PUBLICATION/);
 assert.match(api,/publishPrivateAssistantAtomically/);
 assert.match(api,/publishPrivateConversationReply/);
 // Both exact request readbacks validate the requested ID before owner RLS.
 assert.equal((api.match(/readPrivateChatRequest\(session,\{\s*conversationId,requestId:targetRequestId\}\)/g)||[]).length,2);
 assert.equal((api.match(/if\(!validUuid\(targetRequestId\)\)fail\('CHAT_REQUEST_ID_INVALID',400\)/g)||[]).length,2);
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

import {resolvePrivateConversationDatabase,publishPrivateConversationReply} from '../src/reality-private-chat-store-v0.1.js';
test('conversation persistence works with operational flags disabled and cannot cross owner project',async()=>{
 const project='abcdefghijklmnopqrst',url='https://'+project+'.supabase.co';
 const session={user_id:owner,config:{url}};
 const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,REALITY_UNIVERSE_PERSISTENCE_KEY:'fixture-only',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'false',REALITY_ATOMIC_GOAL_PUBLICATION_ENABLED:'false'};
 const db=resolvePrivateConversationDatabase(session,env);
 assert.equal(db.project,project);
 assert.equal(resolvePrivateConversationDatabase({...session,config:{url:'https://wrong.supabase.co'}},env),null);
 const reply=await publishPrivateConversationReply(session,{conversationId:conv,requestId:request,sourceRef:source,text:'Hello!',db},{
 fetchImpl:async(u,o)=>{assert.equal(u,url+'/rest/v1/rpc/reality_publish_conversational_reply_v1');
 const b=JSON.parse(o.body);assert.equal(b.p_user_id,owner);assert.equal(b.p_request_id,request);
 assert.equal(b.p_user_message_id,source.split(':').at(-1));assert.equal(b.p_content,'Hello!');
 assert.equal(Object.hasOwn(b,'p_expected_goal_revision'),false);
 return {ok:true,json:async()=>request};}});
 assert.equal(reply.conversational_reply_persisted,true);assert.equal(reply.execution_authorized,false);
});

test('read-only intelligence receives the same operational temporal projection at top level',async()=>{
 const horizon={schema:'reality-chat-operational-time-horizon-v1',
  present:{status:'CURRENT_READBACK_PARTIAL',obligations:[{shift_id:'11111111-2222-4333-8444-555555555555',
   existing_shift_authorized:true,original_work_id:'work:'+'a'.repeat(32),continuity_revision:3,
   operational_next_action:'QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY',
   current_events:[{interpretation:'WORKER_FINISHED_EVIDENCE_NOT_ACCEPTED'}],
   active_release_observation:{release_sha:'b'.repeat(40),approval_receipt_sha256:'sha256:'+'c'.repeat(64)}}]},
  past:{independent_original_settlements:[]},future:{next_action_is_not_execution_authority:true},
  read_only:true,execution_authorized:false,installation_authorized:false};
 const reply=await generateProportionalReadOnlyReply({...args,operationalTimeHorizon:horizon,
  runtime:async params=>{
   assert.equal(params.systemContext.operational_time_horizon,horizon);
   return {mode:'FAST',authority_granted:false,execution_authorized:false,
    answer:'No authorized active shift exists; you must formally start an authorized shift.'};
  }});
 assert.match(reply.answer,/existing owner-authorized shift/);
 assert.match(reply.answer,/Continuity revision 3/);
 assert.match(reply.answer,/worker invocation finished but its evidence is not yet accepted/);
 assert.match(reply.answer,/approval receipt sha256:/);
 assert.equal(reply.execution_authorized,false);
});


test('fast Chat preserves the same owner incident evidence as full cognition without another read or authority',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const lane=api.split("stage='READ_ONLY_BOUNDED_CONTEXT'")[1].split('// The signed human message entered')[0];
 assert.match(lane,/const incidentObservations=incidentChatUniverseObservations\(ctx\.values\.owner_handoff\)/);
 assert.match(lane,/const observations=\[\.\.\.incidentObservations,\.\.\.selfVisibilityObservations/);
 assert.match(lane,/owner_incident_evidence_status:ctx\.values\.owner_handoff\?'OWNER_SCOPED_READBACK':'UNAVAILABLE_NOT_ABSENCE'/);
 assert.match(lane,/owner_shift_continuity_incidents:ctx\.values\.owner_handoff\?\.shift_continuity_incidents/);
 assert.equal((lane.match(/readOwnerOperationalIncidentChatBriefing\(/g)||[]).length,1);
 assert.match(lane,/conversation_never_grants_execution_authority:true/);
 assert.match(lane,/external_actions_authorized:false/);
 assert.match(api,/incidentChatUniverseObservations\(operationalIncidentsReadback\)/);
});


test('empty operational extraction withholds the draft; ordinary conversation and supported facts survive',async()=>{
 const shift={owner_shift_authorization_recorded:true,shift_start_command_already_satisfied:true,
  shift_status:'AWAITING_EXACT_ORIGINAL_WORK',active_owner_shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce'};
 const run=async(answer,claims,operational)=>generateProportionalReadOnlyReply({...args,
  ownerContext:{currently_authorized_shift:shift},
  runtime:async()=>({mode:'FAST',authority_granted:false,execution_authorized:false,answer}),
  fetchImpl:async()=>({ok:true,json:async()=>({id:'resp_fixture',output_text:JSON.stringify({
   claims,actions:[],operational,provenance_assertions:[],recipient_scope:{target_id:'',quote:'',assertion:'UNCERTAIN'}})})})});
 const missed='The supplier credited our account yesterday.';
 const withheld=await run(missed,[],true);
 assert.equal(withheld.output_claim_assessment.status,'CLAIM_COVERAGE_UNVERIFIED');
 assert.equal(JSON.stringify(withheld).includes(missed),false);
 assert.match(withheld.answer,/withheld/);
 const conversational='We can discuss the available options.';
 assert.equal((await run(conversational,[],false)).answer,conversational);
 const supported='The shift status is AWAITING_EXACT_ORIGINAL_WORK.';
 assert.equal((await run(supported,[{key:'shift.shift_status',value:shift.shift_status,quote:supported,assertion:'AFFIRMED'}],true)).answer,supported);
});


test('assessed operational output requires server-provided receipt before publication; ordinary conversation skips the writer',async()=>{
 const shift={owner_shift_authorization_recorded:true,shift_start_command_already_satisfied:true,
  shift_status:'AWAITING_EXACT_ORIGINAL_WORK',active_owner_shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce'};
 const supported='The shift status is AWAITING_EXACT_ORIGINAL_WORK.';
 const runtime=async()=>({mode:'FAST',authority_granted:false,execution_authorized:false,answer:supported});
 const fetchImpl=async()=>({ok:true,json:async()=>({id:'resp_fixture',output_text:JSON.stringify({
  claims:[{key:'shift.shift_status',value:shift.shift_status,quote:supported,assertion:'AFFIRMED'}],actions:[],operational:true,provenance_assertions:[],recipient_scope:{target_id:'',quote:'',assertion:'UNCERTAIN'}})})});
 let calls=0;
 const recordClaimAssessment=async({answer,assessment})=>{calls++;assert.equal(answer,supported);assert.equal(assessment.status,'EXTRACTED_ASSERTIONS_SOURCE_COMPARED');return {...assessment,readback_verified:true,ledger_receipt_id:'receipt'};};
 const props={...args,ownerContext:{currently_authorized_shift:shift},runtime,fetchImpl};
 const r=await generateProportionalReadOnlyReply({...props,recordClaimAssessment});
 assert.equal(r.answer,supported);assert.equal(r.output_claim_assessment.durable_continuity_receipt_verified,true);assert.equal(calls,1);
 const failed=await generateProportionalReadOnlyReply({...props,recordClaimAssessment:async()=>{throw Error('readback unavailable')}});
 assert.equal(failed.output_claim_assessment.durable_continuity_receipt_verified,false);assert.equal(JSON.stringify(failed).includes(supported),false);
 const ordinary=await generateProportionalReadOnlyReply({...args,runtime:async()=>({mode:'FAST',authority_granted:false,execution_authorized:false,answer:'Hello!'}),recordClaimAssessment});
 assert.equal(ordinary.answer,'Hello!');assert.equal(calls,1);
});


test('shift cognition bounds presentation history without truncating the authenticated authority ledger',()=>{
 const source=readFileSync(new URL('../src/reality-employee-shift-chat-context-v1.js',import.meta.url),'utf8');
 assert.match(source,/buildRealityShiftConversationBrief\(read\.shifts\.slice\(0,5\),\[\],now\)/);
 assert.match(source,/ownerId:session\.user_id,shifts:read\.shifts/);
 const api=readFileSync(new URL('../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 assert.match(api,/try\{recovery_diagnosis=diagnoseRealityEmployeeRecovery/);
});
test('failed extraction retains exact authenticated shift status but never releases model draft',async()=>{
 const shift={owner_shift_authorization_recorded:true,shift_start_command_already_satisfied:true,
  shift_status:'AWAITING_EXACT_ORIGINAL_WORK',active_owner_shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce'};
 const draft='The supplier credited our account yesterday.';let recorded;
 const result=await generateProportionalReadOnlyReply({...args,ownerContext:{currently_authorized_shift:shift},
  runtime:async()=>({mode:'FAST',authority_granted:false,execution_authorized:false,answer:draft}),
  fetchImpl:async()=>{const e=Error('provider private body');e.name='TimeoutError';throw e;},
  recordClaimAssessment:async a=>{recorded=a;return {...a.assessment,readback_verified:true,ledger_receipt_id:'receipt'};}});
 assert.match(result.answer,/awaiting exact original work/);assert.match(result.answer,/withheld/);
 assert.equal(result.answer.includes(draft),false);assert.equal(recorded.assessment.extraction_failure_code,'RELIABILITY_EXTRACTION_TIMEOUT');
 assert.equal(recorded.assessment.extraction_completeness_verified,false);
 assert.equal(recorded.assessment.released_source_facts.length,2);
 assert.equal(recorded.answer,result.answer);assert.equal(JSON.stringify(recorded).includes('provider private body'),false);
 assert.equal(result.execution_authorized,false);
});


test('timeout preserves verified guarded original even when shift briefing unavailable',async()=>{
 const draft='The supplier credited our account yesterday.';let recorded;
 const original='work:'+'d'.repeat(32),shift='12345678-1234-4234-8234-123456789abc',guard='sha256:'+'a'.repeat(64);
 const horizon={present:{obligations:[{shift_id:shift,original_work_id:original,continuity_revision:3,
  existing_shift_authorized:true,guard_receipt_sha256:guard,operational_next_action:'QUALIFY_DISTINCT_RECOVERY_EVIDENCE',
  read_only:true,execution_authorized:false,installation_authorized:false,production_changed:false}]}};
 const r=await generateProportionalReadOnlyReply({...args,operationalTimeHorizon:horizon,
  runtime:async()=>({mode:'FAST',authority_granted:false,execution_authorized:false,answer:draft}),
  fetchImpl:async()=>{const e=Error('timeout');e.name='TimeoutError';throw e;},
  recordClaimAssessment:async a=>{recorded=a;return {...a.assessment,readback_verified:true,ledger_receipt_id:'receipt'};}});
 assert.match(r.answer,/Continuity revision 3/);assert.ok(r.answer.includes(original));assert.ok(r.answer.includes(shift));
 assert.match(r.answer,/recorded next action is qualify distinct recovery evidence/);
 assert.equal(r.answer.includes(draft),false);assert.equal(recorded.assessment.released_source_facts.length,5);
 assert.deepEqual(recorded.assessment.released_source_fact_refs,[guard]);assert.equal(recorded.assessment.extraction_completeness_verified,false);
 assert.equal(recorded.answer,r.answer);assert.equal(r.execution_authorized,false);
});
test('fast shift briefing does not wait for optional serial audits',()=>{
 const source=readFileSync(new URL('../src/reality-employee-shift-chat-context-v1.js',import.meta.url),'utf8');
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 assert.ok(source.indexOf('if(briefOnly===true)return observations;')>source.indexOf('const observations=[Object.freeze({'));
 assert.ok(source.indexOf('if(briefOnly===true)return observations;')<source.indexOf("'reality_read_owner_internal_maintenance_v1'"));
 assert.match(api,/id:'active_shift',timeoutMs:5000,read:\(\)=>readVerifiedEmployeeShiftForChat\(\{session,message:text,db:isolated,briefOnly:true\}\)/);
});
test('generalized settlement exclusion requires independent inventory reconciliation',async()=>{
 const {ownerSettledOriginalSourceRefs}=await import('../api/reality/personal-governed-employee-shift.js');
 const source='https://github.com/maloney2323/Reality/issues/789';
 const settled={phase:'SETTLED',source_ref:source,original_work_id:'work:'+'d'.repeat(32),source_proof_sha256:'sha256:'+'a'.repeat(64),
  original_job_completed:true,code_repair_completed:true,production_changed:false,original_settlement_receipt_ref:'supabase:governed_original_independent_final_receipts_v1:12345678-1234-4234-8234-123456789abc'};
 const run=refs=>ownerSettledOriginalSourceRefs({ownerId:owner,db:{},call:async(_db,rpc)=>({
  reality_read_owner_riley_pr_review_v1:{status:'OWNER_PR_REVIEW_ORIGINAL_READBACK',production_changed:false,jobs:[]},
  reality_read_owner_shift_failure_triage_143_v1:{status:'OWNER_SCOPED_VERIFIED_SHIFT_FAILURE_TRIAGE',production_changed:false,jobs:[]},
  reality_read_owner_riley_repair_original_v1:{status:'OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK',production_changed:false,does_not_authorize_new_work:true,jobs:[settled]},
  reality_read_owner_additional_settled_shift_sources_v1:{status:'OWNER_ADDITIONAL_SETTLED_SOURCES_INDEPENDENTLY_RECONCILED',owner_id:owner,source_refs:refs,settled_source_count:refs.length,work_creation_authorized:false,shift_authorized:false,installation_authorized:false,production_changed:false}
 })[rpc]});
 assert.deepEqual(await run([source]),[source]);
 await assert.rejects(run([]),/SHIFT_NATIVE_SETTLED_ORIGINAL_RECEIPT_UNVERIFIED/);
});

test('real revision-4 false recovery report cannot escape under omitted or partially correct extraction',async()=>{
 const message='Investigate why your existing authorized shift has stopped progressing after independently reaching Continuity revision 4. Determine how to resolve the two interrupted review invocations and restore automatic continuation of the five previously approved review scopes for PR #307. Perform permitted corrective actions autonomously.';
 const draft='The authorized shift remains open. Testing confirms the recovery steps can safely resume and complete the interrupted review invocations without replay side effects or duplicate executions. The governed employee shift worker autonomously identified both interrupted invocation IDs and fenced their redelivery. These actions restored system readiness to continue automatic continuation. Recovery of interrupted review invocations cleared blockers preventing further progress. Automatic continuation of the five approved review scopes for PR #307 is now enabled pending normal independent verification completion. Verified completed: safe reissue of invocations, fenced claim governance adherence, isolated recovery test success.';
 const shift={owner_shift_authorization_recorded:true,shift_start_command_already_satisfied:true,shift_status:'AWAITING_EXACT_ORIGINAL_WORK',active_owner_shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce'};
 const horizon={present:{obligations:[{shift_id:shift.active_owner_shift_id,original_work_id:'work:'+'d'.repeat(32),continuity_revision:4,existing_shift_authorized:true,guard_receipt_sha256:'sha256:'+'a'.repeat(64),operational_next_action:'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',read_only:true,execution_authorized:false,installation_authorized:false,production_changed:false}]}};
 for(const [operational,claims,context] of [
  [false,[],true],[true,[],true],
  [true,[{key:'original.'+'work:'+'d'.repeat(32)+'.continuity_revision',value:4,quote:'The authorized shift remains open.',assertion:'AFFIRMED'}],true],
  [false,[],false]
 ]){
  let written;
  const r=await generateProportionalReadOnlyReply({...args,message,
   ownerContext:context?{currently_authorized_shift:shift}:null,operationalTimeHorizon:context?horizon:null,
   runtime:async()=>({mode:'FAST',authority_granted:false,execution_authorized:false,answer:draft}),
   fetchImpl:async()=>({ok:true,json:async()=>({id:'resp_fixture',output_text:JSON.stringify({claims,actions:[],operational,provenance_assertions:[],recipient_scope:{target_id:'',quote:'',assertion:'UNCERTAIN'}})})}),
   recordClaimAssessment:async a=>{written=a;return {...a.assessment,readback_verified:true,ledger_receipt_id:'receipt'};}});
  assert.match(r.answer,/withheld/);assert.doesNotMatch(r.answer,/safe reissue|restored system readiness|cleared blockers|is now enabled|isolated recovery test success/);
  assert.equal(written.assessment.publication_contract,'SOURCE_RENDERED_OPERATIONAL_REPORT');
  assert.equal(written.answer,r.answer);assert.equal(r.execution_authorized,false);
  if(context)assert.match(r.answer,/Continuity revision 4/);else assert.doesNotMatch(r.answer,/Continuity revision 4/);
 }
});


test('existing work continuation acknowledgement does not require the action publication pipeline or grant authority',()=>{
 const message='Resume your existing authorized work. Use your existing governed capabilities to investigate and resolve the release qualification blocker.';
 assert.equal(isExistingWorkContinuationReply({message}),true);
 for(const message of ['Install the release','Start a new shift','Can you explain the original job?'])assert.equal(isExistingWorkContinuationReply({message}),false);
 assert.equal(isExistingWorkContinuationReply({message,goalCommand:'replace_goal'}),false);
 const input={ownerId:owner,conversationId:conv,requestId:request,sourceRef:source};
 const item={request_id:request,source_ref:source,status:'CLAIMED',shift_id:owner,execution_authorized_by_chat:false,installation_authorized:false,production_changed:false};
 const handoff={status:'OWNER_CHAT_WORK_INTAKE_READBACK',source:'AUTHENTICATED_OWNER_SCOPED_SERVICE_READBACK',owner_id:owner,conversation_id:conv,new_shift_started:false,installation_authorized:false,production_changed:false,items:[item]};
 const result=prepareExistingWorkContinuationReply({...input,handoff});
 assert.match(result.answer,/claimed your instruction/);assert.match(result.answer,/not verified yet/);
 assert.equal(result.execution_authorized,false);assert.equal(result.work_handoff.status,'CLAIMED');
 for(const invalid of [{...handoff,owner_id:conv},{...handoff,items:[item,item]},{...handoff,items:[{...item,request_id:conv}]},{...handoff,items:[{...item,installation_authorized:true}]}]){
  const missing=prepareExistingWorkContinuationReply({...input,handoff:invalid});assert.match(missing.answer,/could not confirm/);assert.equal(missing.work_handoff,null);
 }
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 assert.ok(api.includes('})||continuationReply;'));assert.ok(api.includes('continuationReply?prepareExistingWorkContinuationReply'));
});
