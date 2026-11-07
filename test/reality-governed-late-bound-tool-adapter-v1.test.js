import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {sealGovernedRecoveryHandoff,brokerGovernedRecoveryCapability}
 from '../src/reality-universal-governed-recovery-handoff-v1.js';
import {createGovernedLateBoundToolAdapter}
 from '../src/reality-governed-late-bound-tool-adapter-v1.js';

const KEY=randomBytes(32);
const OWNER='11111111-2222-4333-8444-555555555555';
const SHIFT='22222222-3333-4444-8555-666666666666';
const WORK='work:'+'a'.repeat(32);
const FAILURE='33333333-4444-4555-8666-777777777777';
const TIME='2026-11-06T18:01:00.000Z';
const SHA='9'.repeat(64);
const s={owner_id:OWNER,shift_id:SHIFT,original_work_id:WORK,
 goal_id:'goal:repair',continuity_root_id:'root:orig',worldline_id:'world:orig',
 source_identity_hash:SHA,ledger_head_hash:'a'.repeat(64),
 authorization_fingerprint:'b'.repeat(64),
 authorization_expires_at:'2026-11-06T20:00:00.000Z',
 target_environment:'ISOLATED_PREVIEW',
 allowed_capabilities:['github:read'],original_job_authorized:true,
 independently_settled:false,provider_effect_may_have_occurred:false,
 installation_authorized:false,production_changed:false};
const f={failure_id:FAILURE,owner_id:OWNER,shift_id:SHIFT,
 original_work_id:WORK,goal_id:s.goal_id,
 continuity_root_id:s.continuity_root_id,worldline_id:s.worldline_id,
 source_identity_hash:s.source_identity_hash,ledger_head_hash:s.ledger_head_hash,
 failed_valid_at:'2026-11-06T17:59:00.000Z',
 provider_evidence_sha256:'c'.repeat(64),capability_id:'repair_runner',
 blocker_class:'ENVIRONMENT_CONTEXT_DEFICIT',
 provider_observation_independently_verified:true,
 durable_failure_readback_verified:true,
 provider_effect_may_have_occurred:false,production_changed:false};
const envelope=sealGovernedRecoveryHandoff({currentScope:s,failure:f,
 signingKey:KEY,transactionTime:'2026-11-06T18:00:00.000Z'});
const broker=brokerGovernedRecoveryCapability({
 envelope,signingKey:KEY,currentScope:s,executionTime:TIME,
 registryReadback:{independently_verified:true,status:'ACTIVE',
  original_work_id:WORK,capability_id:f.capability_id,
  manifest:{capability_id:f.capability_id,
   schema_sha256:'d'.repeat(64),required_capabilities:['github:read'],
   external_permission_escalation:false,production_write_authorized:false}}
});
const canon=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canon):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])]));
const digest=x=>createHash('sha256').update(JSON.stringify(canon(x))).digest('hex');
const schema={type:'object',properties:{
 path:{type:'string',maxLength:120,description:'Read-only source path'}
},required:['path'],additionalProperties:false};
const tool={name:'inspect_source',description:'Read scoped source from an isolated runner',
 capability_id:'repair_runner',schema_sha256:digest(schema),parameters:schema};
const actualBroker=brokerGovernedRecoveryCapability({
 envelope,signingKey:KEY,currentScope:s,executionTime:TIME,
 registryReadback:{independently_verified:true,status:'ACTIVE',
  original_work_id:WORK,capability_id:f.capability_id,
  manifest:{capability_id:f.capability_id,schema_sha256:tool.schema_sha256,
   required_capabilities:['github:read'],
   external_permission_escalation:false,production_write_authorized:false}}
});
const checkpoint={independently_verified:true,
 original_work_id:WORK,owner_id:OWNER,goal_id:s.goal_id,
 failure_id:FAILURE,source_identity_hash:SHA,
 checkpoint_sha256:'e'.repeat(64),
 provider_effect_may_have_occurred:false,original_job_settled:false};
const fc={type:'function_call',name:'inspect_source',call_id:'call_abc123',
 arguments:JSON.stringify({path:'src/example.js'})};
const search={type:'tool_search_call',execution:'client',call_id:'call_search_456',
 status:'completed'};
function fixture({scope=s,claimStatus='EXACT_TOOL_CALL_FENCED_CLAIMED',
 brokenIndependent=false,executionError=false,brokerResult=actualBroker,
 checkpointReadback=checkpoint}={}){
 const calls=[],seen=[];
 const adapter=createGovernedLateBoundToolAdapter({
  envelope,signingKey:KEY,
  readCurrentScope:async()=>scope,
  readCheckpoint:async()=>checkpointReadback,
  brokerResult,tool,
  executeSandbox:async input=>{
   calls.push(input);
   if(executionError)throw Error('NETWORK_UNCERTAIN');
   return {sandbox_file:'source-backed-result',path:input.args.path};
  },
  independentVerifier:async input=>{
   seen.push(input);
   return {verified:!brokenIndependent,original_job_completed:false,
    installation_authorized:false,production_changed:false,
    provider_effect_may_have_occurred:false,external_action_performed:false,
    result:{line_count:12,kind:'isolated-readback'}};
  },
  acquireFencedClaim:async input=>({
   status:claimStatus,original_work_id:input.original_work_id,
   execution_identity_sha256:input.execution_identity_sha256,
   claim_sha256:'f'.repeat(64),
   provider_effect_may_have_occurred:false,installation_authorized:false,
   production_changed:false
  }),
  recordAndReadback:async input=>({
   independently_verified:true,receipt_ref:'receipt:isolated:test',
   original_work_id:input.original_work_id,
   execution_identity_sha256:input.execution_identity_sha256,
   verified_result_hash:input.verified_result_hash,
   claim_sha256:input.claim_sha256,
   production_changed:false,installation_authorized:false
  })
 });
 return {adapter,calls,seen};
}
test('late-bound schema becomes visible via supported Responses additional_tools boundary',async()=>{
 const {adapter}=fixture();
 const result=await adapter.describe({executionTime:TIME});
 assert.equal(result.status,'LATE_BOUND_TOOL_AVAILABLE_AT_MODEL_BOUNDARY');
 assert.equal(result.provider_request_already_in_progress_modified,false);
 assert.equal(result.additional_tools.role,'developer');
 assert.equal(result.additional_tools.type,'additional_tools');
 assert.equal(result.additional_tools.tools[0].name,'inspect_source');
 assert.equal(result.additional_tools.tools[0].strict,true);
 assert.equal(result.additional_tools.tools[0].defer_loading,undefined);
 assert.equal(result.original_job_completed,false);
});
test('client tool-search returns exact verified schema and call ID, no model authority',async()=>{
 const {adapter}=fixture();
 const result=await adapter.forToolSearch({searchCall:search,executionTime:TIME});
 assert.equal(result.type,'tool_search_output');
 assert.equal(result.call_id,search.call_id);
 assert.equal(result.execution,'client');
 assert.equal(result.tools[0].name,'inspect_source');
 assert.equal(result.tools[0].defer_loading,true);
 await assert.rejects(adapter.forToolSearch({searchCall:{...search,execution:'server'},
  executionTime:TIME}),/TRUSTED_PROVIDER_SEARCH_CALL_REQUIRED/);
});
test('same-job tool execution uses a fenced claim, independent verifier and durable receipt',async()=>{
 const {adapter,calls,seen}=fixture();
 const result=await adapter.dispatch({functionCall:fc,
  executionTime:TIME,providerResponseId:'resp_abcdefgh'});
 assert.equal(calls.length,1);
 assert.equal(seen.length,1);
 assert.equal(calls[0].allow_network,false);
 assert.equal(calls[0].allow_secrets,false);
 assert.equal(calls[0].production_write_permitted,false);
 assert.equal(calls[0].original_work_id,WORK);
 assert.equal(result.status,'GOVERNED_TOOL_CALL_INDEPENDENTLY_VERIFIED');
 assert.equal(result.response_input.type,'function_call_output');
 assert.equal(result.response_input.call_id,fc.call_id);
 assert.equal(JSON.parse(result.response_input.output).result.line_count,12);
 assert.equal(result.original_job_completed,false);
});
test('invalid schema, mismatched hash and elevated registry cannot enter model manifest',async()=>{
 assert.throws(()=>createGovernedLateBoundToolAdapter({
  ...factoryMinimal(),
  tool:{...tool,schema_sha256:'1'.repeat(64)}
 }),/SCHEMA_CONTENT_HASH_MISMATCH/);
 const optional={...tool,parameters:{...schema,required:[]}};
 assert.throws(()=>createGovernedLateBoundToolAdapter({
  ...factoryMinimal(),tool:optional
 }),/SCHEMA_UNSUPPORTED_OR_UNSAFE/);
 const bad={...tool,parameters:{...schema,additionalProperties:true}};
 assert.throws(()=>createGovernedLateBoundToolAdapter({
  ...factoryMinimal(),tool:bad
 }),/SCHEMA_NOT_BOUNDED/);
 const {adapter}=fixture({scope:{...s,allowed_capabilities:['github:write']}});
 await assert.rejects(adapter.describe({executionTime:TIME}),/DRIFT/);
});
function factoryMinimal(){
 return {envelope,signingKey:KEY,brokerResult:actualBroker,tool,
  readCurrentScope:async()=>s,readCheckpoint:async()=>checkpoint,
  executeSandbox:async()=>({}),independentVerifier:async()=>({}),
  acquireFencedClaim:async()=>({}),recordAndReadback:async()=>({})};
}
test('no execution for mismatched model name, unbounded arguments or missing claim',async()=>{
 const {adapter,calls}=fixture();
 for(const changed of [
  {...fc,name:'delete_repo'},
  {...fc,arguments:JSON.stringify({path:'ok',unknown:true})},
  {...fc,arguments:JSON.stringify({path:'x'.repeat(2000)})},
  {...fc,arguments:'{'}, {...fc,call_id:'non_provider_call'}
 ]){
  await assert.rejects(adapter.dispatch({functionCall:changed,
   executionTime:TIME,providerResponseId:'resp_abcdefgh'}),/DYNAMIC_TOOL_/);
 }
 assert.equal(calls.length,0);
 const stopped=fixture({claimStatus:'ALREADY_CLAIMED_NO_REPLAY'});
 await assert.rejects(stopped.adapter.dispatch({functionCall:fc,
  executionTime:TIME,providerResponseId:'resp_abcdefgh'}),
 /GLOBAL_ATOMIC_FENCED_CLAIM_REQUIRED/);
 assert.equal(stopped.calls.length,0);
});
test('stale scope, forged broker decision and mismatched checkpoint all stop before tool call',async()=>{
 const cases=[
  fixture({scope:{...s,authorization_expires_at:'2026-11-06T17:00:00.000Z'}}),
  fixture({scope:{...s,ledger_head_hash:'4'.repeat(64)}}),
  fixture({checkpointReadback:{...checkpoint,original_work_id:'work:'+'b'.repeat(32)}}),
  fixture({brokerResult:{...actualBroker,status:'APPROVED_CANDIDATE_REQUIRES_INSTALL_READBACK'}})
 ];
 for(const f of cases){
  await assert.rejects(f.adapter.dispatch({functionCall:fc,
   executionTime:TIME,providerResponseId:'resp_abcdefgh'}));
  assert.equal(f.calls.length,0);
 }
});
test('independent verification failure and sandbox uncertainty cannot produce a success tool result',async()=>{
 const a=fixture({brokenIndependent:true});
 await assert.rejects(a.adapter.dispatch({functionCall:fc,
  executionTime:TIME,providerResponseId:'resp_abcdefgh'}),/INDEPENDENT_SANDBOX_OUTPUT_UNVERIFIED/);
 const b=fixture({executionError:true});
 await assert.rejects(b.adapter.dispatch({functionCall:fc,
  executionTime:TIME,providerResponseId:'resp_abcdefgh'}),/SANDBOX_EFFECT_UNKNOWN_RECONCILIATION_REQUIRED/);
 assert.equal(b.calls.length,1);
});
