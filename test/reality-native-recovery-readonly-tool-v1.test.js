import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proveNativeOriginalReadOnlyModelTool}
 from '../src/reality-native-recovery-readonly-tool-v1.js';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const SOURCE='https://github.com/maloney2323/Reality/issues/263';
const HASH='sha256:'+'a'.repeat(64);
const PLAN='sha256:'+'b'.repeat(64);
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-preview',
 REALITY_OPENAI_MODEL:'gpt-5.4',
 REALITY_STANDALONE_OPENAI_API_KEY:'isolated-only-test-key-1234567890'};
const db={project:'isolated-preview',strictSecrets:true};
const source=(n,url,kind,phase,original)=>({
 source_step_index:n,source_ref:url,original_kind:kind,phase,
 original_work_id:original,source_proof_sha256:HASH,
 independent_source_proof_verified:true,
 original_job_completed_by_graph:false,
 capability_installation_authorized:false,
 provider_effect_claimed_by_graph:false,
 next_governed_action:'VERIFY_NATIVE_INSTALL_AND_RESUME_PATH_BEFORE_OWNER_APPROVAL'
});
function graph(){
 return {status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
  shift_id:SHIFT,owner_id:OWNER,plan_fingerprint:PLAN,selected_sources:4,
  completion_bound:true,execution_scope_from_owner_warrant_only:true,
  installation_authorized:false,original_job_completed_by_graph:false,
  production_changed:false,new_job_created:false,
  jobs:[
   source(2,SOURCE,'REAL_ENGINEERING_REPAIR_ORIGINAL',
    'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',WORK),
   source(3,'https://github.com/maloney2323/Reality/issues/185',
    'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL','NOT_ADMITTED',null),
   source(4,'https://github.com/maloney2323/Reality/pull/57',
    'REAL_PR_REVIEW_ORIGINAL','PREPARED','work:'+'d'.repeat(32)),
   source(5,'https://github.com/maloney2323/Reality/issues/62',
    'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL','NOT_ADMITTED',null)
  ]};
}
function fixture({drift=false,providerStatus=200,toolCall=true,claimStatus=null}={}){
 const calls=[],requests=[];
 const claim={status:claimStatus||'NATIVE_READONLY_TOOL_ATTEMPT_FENCED',
  claim_id:'44444444-5555-4666-8777-888888888888',
  shift_id:SHIFT,owner_id:OWNER,original_work_id:WORK,
  source_ref:SOURCE,source_proof_sha256:HASH,plan_fingerprint:PLAN,
  installation_authorized:false,original_job_completed:false,
  production_changed:false};
 const callRpc=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_current_native_readonly_tool_v1')return claim;
  if(name==='reality_read_current_shift_execution_graph_v1'){
   const g=graph();
   if(drift&&calls.filter(x=>x.name===name).length>=2)
    g.jobs[0].source_proof_sha256='sha256:'+'c'.repeat(64);
   return g;
  }
  if(name==='reality_finish_current_native_readonly_tool_v1'){
   return {status:args.p_state==='MODEL_TOOL_READBACK_VERIFIED'?
    'NATIVE_READONLY_MODEL_TOOL_RESPONSE_RECORDED':
    'NATIVE_READONLY_MODEL_TOOL_NOT_PROVEN',
    original_work_id:WORK,shift_id:SHIFT,
    model_tool_readback_verified:args.p_state==='MODEL_TOOL_READBACK_VERIFIED',
    installation_authorized:false,original_job_completed:false,
    production_changed:false};
  }
  throw Error('UNKNOWN_RPC_'+name);
 };
 const fetchImpl=async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');
  assert.equal(options.method,'POST');
  const payload=JSON.parse(options.body);requests.push(payload);
  if(providerStatus!==200)return {ok:false,status:providerStatus};
  if(requests.length===1){
   assert.equal(payload.tools?.[0]?.name,'reality_read_current_original_evidence');
   assert.equal(payload.tool_choice?.name,'reality_read_current_original_evidence');
   return {ok:true,json:async()=>({
    id:'resp_native_first_12345',status:'completed',
    output:toolCall?[{type:'function_call',
     name:'reality_read_current_original_evidence',call_id:'call_native_12345',
     arguments:'{}'}]:[{type:'message',content:[]}]
   })};
  }
  assert.equal(payload.previous_response_id,'resp_native_first_12345');
  assert.equal(payload.input?.[0]?.type,'function_call_output');
  assert.equal(payload.input[0].call_id,'call_native_12345');
  assert.match(payload.input[0].output,/INDEPENDENT_CURRENT_SERVICE_READBACK_FOR_MODEL/);
  return {ok:true,json:async()=>({
   id:'resp_native_follow_12345',status:'completed',
   output:[{type:'message',content:[{type:'output_text',text:'The installer and owner approval remain unproven.'}]}]
  })};
 };
 return {calls,requests,callRpc,fetchImpl};
}
test('exact owner-native source readback is returned through actual Responses function_call and durable receipt',async()=>{
 const f=fixture();
 const result=await proveNativeOriginalReadOnlyModelTool({
  db,env,fetchImpl:f.fetchImpl,callRpc:f.callRpc});
 assert.equal(result.status,'NATIVE_GOVERNED_MODEL_USED_READ_ONLY_TOOL');
 assert.equal(result.original_work_id,WORK);
 assert.equal(result.real_model_tool_call_verified,true);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.native_install_to_settlement_verified,false);
 assert.equal(f.requests.length,2);
 assert.equal(f.calls.filter(x=>x.name==='reality_read_current_shift_execution_graph_v1').length,3);
 const receipt=f.calls.find(x=>x.name==='reality_finish_current_native_readonly_tool_v1');
 assert.equal(receipt.args.p_state,'MODEL_TOOL_READBACK_VERIFIED');
 assert.match(receipt.args.p_tool_readback_sha256,/^sha256:[a-f0-9]{64}$/);
});
test('provider failure cannot publish a false native recovery or finish job',async()=>{
 const f=fixture({providerStatus:429});
 const result=await proveNativeOriginalReadOnlyModelTool({
  db,env,fetchImpl:f.fetchImpl,callRpc:f.callRpc});
 assert.equal(result.real_model_tool_call_verified,undefined);
 assert.equal(result.status,'NATIVE_TOOL_CALL_NOT_INDEPENDENTLY_VERIFIED');
 const receipt=f.calls.find(x=>x.name==='reality_finish_current_native_readonly_tool_v1');
 assert.equal(receipt.args.p_state,'MODEL_PROVIDER_RETRYABLE');
 assert.equal(receipt.args.p_error_code,'OPENAI_RATE_OR_QUOTA_REJECTED');
 assert.equal(receipt.args.p_tool_readback_sha256,null);
});
test('missing model tool call and source drift both fail closed',async()=>{
 for(const config of [{toolCall:false},{drift:true}]){
  const f=fixture(config);
  const result=await proveNativeOriginalReadOnlyModelTool({
   db,env,fetchImpl:f.fetchImpl,callRpc:f.callRpc});
  assert.equal(result.status,'NATIVE_TOOL_CALL_NOT_INDEPENDENTLY_VERIFIED');
  const done=f.calls.find(x=>x.name==='reality_finish_current_native_readonly_tool_v1');
  assert.notEqual(done.args.p_state,'MODEL_TOOL_READBACK_VERIFIED');
  assert.equal(result.original_job_completed,false);
 }
});
test('missing preview OpenAI key does not claim or spend money',async()=>{
 const f=fixture();
 const result=await proveNativeOriginalReadOnlyModelTool({
  db,env:{...env,REALITY_STANDALONE_OPENAI_API_KEY:''},
  fetchImpl:f.fetchImpl,callRpc:f.callRpc});
 assert.equal(result.status,'NATIVE_TOOL_MODEL_OR_KEY_NOT_CONFIGURED');
 assert.equal(f.calls.length,0);
});
test('already claimed or verified native tool receipt does not retry model work',async()=>{
 for(const status of ['NATIVE_READONLY_TOOL_ALREADY_VERIFIED',
   'NATIVE_TOOL_ATTEMPT_ALREADY_CLAIMED',
   'NATIVE_TOOL_PREVIOUS_PROVIDER_EFFECT_UNCERTAIN_NO_REPLAY']){
  const f=fixture({claimStatus:status});
  const result=await proveNativeOriginalReadOnlyModelTool({
   db,env,fetchImpl:f.fetchImpl,callRpc:f.callRpc});
  assert.equal(result.status,status);
  assert.equal(f.requests.length,0);
 }
});
test('isolated SQL is service-only, exact original-bound, and does not grant installation',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261109_governed_native_readonly_recovery_tool_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/current_user <> 'service_role'/);
 assert.match(sql,/v_inserted=0/);
 assert.match(sql,/v\.original_work_id|v_original\.original_work_id/);
 assert.match(sql,/CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL/);
 assert.match(sql,/grant execute on function public\.reality_finish_current_native_readonly_tool_v1/);
 assert.doesNotMatch(sql,/grant execute on function[^;]*authenticated/i);
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/proveNativeOriginalReadOnlyModelTool/);
 assert.match(worker,/native_readonly_model_tool_proof:/);
 assert.doesNotMatch(worker,/automaticallyInstallRileyWithoutOwnerApproval/);
});

test('exact new service-only native recovery RPCs pass the worker allowlist, unrelated arbitrary RPC is denied',async()=>{
 const seen=[];
 const fetchImpl=async(url,opts)=>{
  seen.push({url,method:opts.method});
  return {ok:true,json:async()=>({status:'TEST_PROVIDER_READBACK_ONLY'})};
 };
 for(const name of ['reality_claim_current_native_readonly_tool_v1',
  'reality_finish_current_native_readonly_tool_v1']){
  const r=await shiftRpc({url:'https://isolated-preview.supabase.co',
   secretKey:'service-key-test'},name,{}, {fetchImpl});
  assert.equal(r.status,'TEST_PROVIDER_READBACK_ONLY');
  assert.equal(seen.at(-1).url,'https://isolated-preview.supabase.co/rest/v1/rpc/'+name);
  assert.equal(seen.at(-1).method,'POST');
 }
 await assert.rejects(()=>shiftRpc({url:'https://isolated-preview.supabase.co',
  secretKey:'service-key-test'},'reality_owner_install_without_approval_v1',{},
  {fetchImpl}),/SHIFT_RPC_NOT_ALLOWLISTED/);
 assert.equal(seen.length,2);
});

test('owner proof comes from service-only readback and appears in Live Activity without false installation',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261109_owner_native_model_tool_proof_readback_v1.sql',
  import.meta.url),'utf8');
 const api=readFileSync(new URL(
  '../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 const rpc=readFileSync(new URL(
  '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/grant execute on function public.reality_read_owner_native_readonly_tool_proof_v1/);
 assert.doesNotMatch(sql,/grant execute[^;]*authenticated/i);
 assert.match(rpc,/read_owner_native_readonly_tool_proof_v1/);
 assert.match(api,/riley_native_model_tool_proof=proof/);
 assert.match(api,/tool_scope==='READ_ONLY_CURRENT_ORIGINAL_EVIDENCE'/);
 assert.match(ui,/id="rileyNativeModelToolProof"/);
 assert.match(ui,/function renderNativeModelToolProof/);
 assert.match(ui,/renderNativeModelToolProof\(readback,current\)/);
 assert.match(ui,/NOT yet installed, automatically resumed or independently settled/);
});
