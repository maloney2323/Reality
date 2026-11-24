// Functional goal contract frozen outside the model candidate.
// Executed in the independent no-network, no-secret runtime. Provider
// fixtures exercise the actual existing signed Chat entrypoint and its
// negative authority paths; live installation proof remains separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {investigateAuthenticatedChatUnderExistingShift} from '../src/reality-signed-chat-to-work-v1.js';
const uid=n=>'11111111-2222-4333-8444-'+String(n).padStart(12,'0');
const owner=uid(1),shift=uid(2),message=uid(3),request=uid(4),conversation=uid(5),claim=uid(6);
const source='https://github.com/maloney2323/Reality/issues/101';
const flags={execution_authorized:false,installation_authorized:false,new_shift_started:false,production_changed:false,original_job_completed:false};
const db={strictSecrets:true,secretKey:'fixture-not-a-real-secret',project:'isolated-fixture'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project,OPENAI_API_KEY:'fixture-not-a-real-api-key',REALITY_OPENAI_MODEL:'gpt-4.1-mini'};
const lease={status:'SIGNED_MAINTENANCE_CHAT_INVESTIGATION_LEASED_TO_EXISTING_SHIFT',message_id:message,request_id:request,conversation_id:conversation,
 owner_id:owner,shift_id:shift,claim_id:claim,message_sha256:'a'.repeat(64),plan_fingerprint:'sha256:'+'b'.repeat(64),
 message:'Investigate the existing source and preserve the original work.',source_scope:[{source_ref:source,step_index:0}],...flags};
function setup(overrides={},selected=[source]){
 const seen=[],calls=[];
 return {seen,calls,db,env,fetchImpl:async(url,opts)=>{
  seen.push(url);assert.equal(url,'https://api.openai.com/v1/responses');
  const body=JSON.parse(opts.body);assert.equal(body.tool_choice,'none');assert.equal(body.store,false);
  assert.equal(opts.headers['x-client-request-id'],claim);
  const scope=JSON.parse(body.input[1].content[0].text);
  assert.equal(scope.existing_shift_id,shift);assert.equal(scope.no_new_shift_or_source_authorization,true);
  assert.deepEqual(scope.authorized_source_scope,lease.source_scope);
  return {ok:true,json:async()=>({status:'completed',id:'resp_fixture_actual',output_text:JSON.stringify({
   decision:'INVESTIGATE_EXISTING_WORK',diagnosis:'The exact existing source requires independent review before execution.',selected_source_refs:selected})})};
 },callRpc:async(_db,name,args)=>{
  calls.push({name,args});
  switch(name){
   case 'reality_claim_chat_work_for_shift_v1':return {status:'NO_PENDING_CHAT_WITH_CURRENT_OWNER_WARRANT'};
   case 'reality_claim_signed_maintenance_chat_investigation_v1':return {...lease,...overrides};
   case 'reality_read_current_shift_execution_graph_v1':return {status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',owner_id:owner,shift_id:shift,installation_authorized:false,production_changed:false,
    jobs:[{source_ref:source,phase:'SOURCE_ADMITTED',original_work_id:'work:'+'c'.repeat(32)}]};
   case 'reality_record_chat_work_diagnosis_v1':
    assert.equal(args.p_message_id,message);assert.equal(args.p_claim_id,claim);assert.equal(args.p_shift_id,shift);
    assert.deepEqual(args.p_selected_sources,[source]);
    return {status:'SIGNED_CHAT_WORK_DIAGNOSIS_DURABLY_RECORDED',message_id:message,owner_id:owner,shift_id:shift,request_id:request,
     model_advisory_recorded:true,work_status:'INVESTIGATED_SCOPED',selected_source_count:1,...flags};
   case 'reality_fail_chat_work_claim_v1':return {status:'FAILURE_RECORDED'};
   default:assert.fail('Unexpected action '+name);
  }
 }};
}
test('signed maintenance Chat continuation reaches actual existing governed investigation and durable same-source diagnosis',async()=>{
 const f=setup(),r=await investigateAuthenticatedChatUnderExistingShift(f);
 assert.equal(r.status,'AUTHENTICATED_CHAT_INSTRUCTION_INVESTIGATED_IN_EXISTING_SHIFT');
 assert.equal(r.source_message_id,message);assert.equal(r.shift_id,shift);
 assert.equal(r.model_advisory_recorded,true);assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);assert.equal(r.execution_authorized,false);assert.equal(r.new_shift_started,false);
 assert.equal(f.seen.length,1);
 assert.equal(f.calls.filter(x=>x.name==='reality_record_chat_work_diagnosis_v1').length,1);
});
test('authority drift must not reach model or diagnosis persistence',async()=>{
 for(const changed of [{installation_authorized:true},{execution_authorized:true},{production_changed:true},{new_shift_started:true},{original_job_completed:true}]){
  const f=setup(changed);await assert.rejects(investigateAuthenticatedChatUnderExistingShift(f));
  assert.equal(f.seen.length,0);assert.equal(f.calls.some(x=>x.name==='reality_record_chat_work_diagnosis_v1'),false);
 }
});
test('provider suggested sources outside the signed current original are rejected',async()=>{
 const f=setup({},['https://github.com/maloney2323/Reality/issues/102']);
 const r=await investigateAuthenticatedChatUnderExistingShift(f);
 assert.equal(r.status,'CHAT_WORK_INVESTIGATION_UNVERIFIED');
 assert.equal(r.original_job_completed,false);assert.equal(r.installation_authorized,false);
 assert.ok(f.calls.some(x=>x.name==='reality_fail_chat_work_claim_v1'));
 assert.ok(!f.calls.some(x=>x.name==='reality_record_chat_work_diagnosis_v1'));
});
