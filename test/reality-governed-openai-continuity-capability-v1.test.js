import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {sealGovernedRecoveryHandoff,brokerGovernedRecoveryCapability}
 from '../src/reality-universal-governed-recovery-handoff-v1.js';
import {createGovernedLateBoundToolAdapter}
 from '../src/reality-governed-late-bound-tool-adapter-v1.js';
import {createRealityGovernedOpenAIGateway}
 from '../src/reality-governed-openai-gateway-v1.js';

const KEY=randomBytes(32);
const OWNER='11111111-2222-4333-8444-555555555555';
const SHIFT='22222222-3333-4444-8555-666666666666';
const WORK='work:'+'a'.repeat(32);
const FAILURE='33333333-4444-4555-8666-777777777777';
const TIME='2026-11-08T06:11:00.000Z';
const SOURCE='9'.repeat(64);
const scope={owner_id:OWNER,shift_id:SHIFT,original_work_id:WORK,
 goal_id:'goal:repair',continuity_root_id:'root:original',
 worldline_id:'world:original',source_identity_hash:SOURCE,
 ledger_head_hash:'a'.repeat(64),authorization_fingerprint:'b'.repeat(64),
 authorization_expires_at:'2026-11-08T08:00:00.000Z',
 target_environment:'ISOLATED_PREVIEW',allowed_capabilities:['github:read'],
 original_job_authorized:true,independently_settled:false,
 provider_effect_may_have_occurred:false,installation_authorized:false,
 production_changed:false};
const failBase={failure_id:FAILURE,owner_id:OWNER,shift_id:SHIFT,
 original_work_id:WORK,goal_id:scope.goal_id,
 continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
 source_identity_hash:SOURCE,ledger_head_hash:scope.ledger_head_hash,
 failed_valid_at:'2026-11-08T06:09:00.000Z',
 provider_evidence_sha256:'c'.repeat(64),capability_id:'inspect_tool',
 blocker_class:'ENVIRONMENT_CONTEXT_DEFICIT',
 provider_observation_independently_verified:true,
 durable_failure_readback_verified:true,
 provider_effect_may_have_occurred:false,production_changed:false};
const canon=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canon):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])]));
const hash=x=>createHash('sha256').update(JSON.stringify(canon(x))).digest('hex');
const schema={type:'object',properties:{path:{type:'string',maxLength:120,
 description:'Only a scoped isolated read'}},required:['path'],additionalProperties:false};
const tool={name:'inspect_source',description:'Read scoped source',
 capability_id:'inspect_tool',schema_sha256:hash(schema),parameters:schema};
const manifest={capability_id:'inspect_tool',schema_sha256:tool.schema_sha256,
 required_capabilities:['github:read'],external_permission_escalation:false,
 production_write_authorized:false};
const checkpoint={independently_verified:true,original_work_id:WORK,
 owner_id:OWNER,goal_id:scope.goal_id,failure_id:FAILURE,
 source_identity_hash:SOURCE,checkpoint_sha256:'e'.repeat(64),
 provider_effect_may_have_occurred:false,original_job_settled:false};
const readTask=()=>({independently_verified:true,original_work_id:WORK,
 owner_id:OWNER,goal_id:scope.goal_id,
 objective:'Inspect existing source using verified Reality capability',
 installation_authorized:false,independently_settled:false,
 provider_effect_may_have_occurred:false,production_changed:false});
const search={type:'tool_search_call',execution:'client',
 call_id:'call_search_123',status:'completed',arguments:{goal:'Inspect source'}};
const func={type:'function_call',name:'inspect_source',call_id:'call_tool_456',
 arguments:JSON.stringify({path:'src/reality-example.js'})};
const response=(id,output)=>({ok:true,json:async()=>({
 id,status:'completed',output})});
const txt='Source inspected using governed Reality tool. No settlement yet.';
function fixture({missing=false,approved=false,scopeReader=null,
 checkpointReader=null,taskReader=null,claimStatus='EXACT_TOOL_CALL_FENCED_CLAIMED',
 providerResponder=null}={}){
 const failure={...failBase,blocker_class:missing?'MISSING_INSTRUMENT':
  'ENVIRONMENT_CONTEXT_DEFICIT'};
 const envelope=sealGovernedRecoveryHandoff({
  currentScope:scope,failure,signingKey:KEY,
  transactionTime:'2026-11-08T06:10:00.000Z'});
 const sourceEvidence={independently_verified:true,original_work_id:WORK,
  capability_id:'inspect_tool',source_identity_hash:SOURCE,
  provider_evidence_sha256:failure.provider_evidence_sha256,
  reproduced_failure:true,frozen_suite_sha256:'d'.repeat(64),
  external_action_performed:false};
 const candidate={independently_verified:true,original_work_id:WORK,
  capability_id:'inspect_tool',source_identity_hash:SOURCE,
  provider_evidence_sha256:failure.provider_evidence_sha256,
  frozen_suite_sha256:sourceEvidence.frozen_suite_sha256,
  artifact_sha256:'f'.repeat(64),isolation:'NO_NETWORK_NO_SECRETS',
  sandbox_tests_passed:true,production_changed:false,manifest};
 const approval={independently_verified:true,original_work_id:WORK,
  owner_id:OWNER,artifact_sha256:candidate.artifact_sha256,
  exact_owner_approval:true,approved_environment:'ISOLATED_PREVIEW'};
 const installedReadback=missing&&approved?{
  independently_verified:true,original_work_id:WORK,
  artifact_sha256:candidate.artifact_sha256,environment:'ISOLATED_PREVIEW',
  activated:true,provider_effect_may_have_occurred:false
 }:null;
 const brokerResult=brokerGovernedRecoveryCapability({
  envelope,signingKey:KEY,currentScope:scope,executionTime:TIME,
  registryReadback:{independently_verified:true,
   original_work_id:WORK,capability_id:'inspect_tool',
   status:missing?'ABSENT':'ACTIVE',manifest:missing?undefined:manifest},
  ...(missing?{frozenReproduction:sourceEvidence,candidate,
   installationApproval:approved?approval:null}:{})
 });
 const readCurrentScope=scopeReader|| (async()=>scope);
 const readCheckpoint=checkpointReader|| (async()=>checkpoint);
 const readOriginalTask=taskReader|| (async()=>readTask());
 const claims=[],sandboxCalls=[],receipts=[],providerCalls=[];
 const lateBoundAdapter=createGovernedLateBoundToolAdapter({
  envelope,signingKey:KEY,readCurrentScope,readCheckpoint,
  brokerResult,installedReadback,tool,
  executeSandbox:async x=>{sandboxCalls.push(x);return {found:'source'};},
  independentVerifier:async()=>({verified:true,original_job_completed:false,
   installation_authorized:false,production_changed:false,
   provider_effect_may_have_occurred:false,external_action_performed:false,
   result:{kind:'GITHUB_SOURCE_REVIEW',line_count:12}}),
  acquireFencedClaim:async x=>{
   claims.push(x);
   return {status:claimStatus,original_work_id:x.original_work_id,
    execution_identity_sha256:x.execution_identity_sha256,
    claim_sha256:'f'.repeat(64),provider_effect_may_have_occurred:false,
    installation_authorized:false,production_changed:false};
  },
  recordAndReadback:async x=>{
   receipts.push(x);
   return {independently_verified:true,receipt_ref:'receipt:isolated:verified',
    original_work_id:x.original_work_id,
    execution_identity_sha256:x.execution_identity_sha256,
    verified_result_hash:x.verified_result_hash,
    claim_sha256:x.claim_sha256,production_changed:false,
    installation_authorized:false};
  }
 });
 const fetchImpl=async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');
  const payload=JSON.parse(options.body);
  providerCalls.push(payload);
  if(providerResponder)return providerResponder({payload,index:providerCalls.length});
  if(providerCalls.length===1)return response('resp_verified_123',[search]);
  if(providerCalls.length===2)return response('resp_verified_456',[func]);
  return response('resp_verified_789',[{type:'message',
   content:[{type:'output_text',text:txt}]}]);
 };
 const gateway=createRealityGovernedOpenAIGateway({
  apiKey:'isolated-test-openai-key',model:'gpt-6',fetchImpl
 });
 const args={envelope,signingKey:KEY,brokerResult,installedReadback,
  readCurrentScope,readCheckpoint,readOriginalTask,lateBoundAdapter,
  now:()=>TIME,mode:'DISCOVER_ON_DEMAND'};
 return {gateway,args,brokerResult,claims,sandboxCalls,receipts,providerCalls};
}
test('Reality signed Continuity and capability enter same OpenAI session; actual scoped tool call receives fenced receipt',async()=>{
 const t=fixture();
 const result=await t.gateway.originalJobCapabilitySession(t.args);
 assert.equal(t.providerCalls.length,3);
 assert.equal(t.claims.length,1);
 assert.equal(t.sandboxCalls.length,1);
 assert.equal(t.sandboxCalls[0].allow_network,false);
 assert.equal(t.sandboxCalls[0].allow_secrets,false);
 assert.equal(t.receipts.length,1);
 assert.equal(result.status,'VERIFIED_TOOL_RESULT_RETURNED_TO_SAME_MODEL_CONVERSATION');
 assert.equal(result.gateway_version,'reality-governed-openai-gateway-read-only-v1');
 assert.equal(result.governed_original_job_scope,true);
 assert.equal(result.original_work_id,WORK);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.awaiting_original_job_independent_settlement,true);
 assert.equal(result.model_provider_requests_verified,3);
 assert.equal(result.verified_original_checkpoint_sha256,checkpoint.checkpoint_sha256);
 const first=JSON.parse(t.providerCalls[0].input[0].content);
 assert.equal(first.reality_governance.continuity_root_id,scope.continuity_root_id);
 assert.equal(first.reality_governance.worldline_id,scope.worldline_id);
 assert.equal(first.reality_governance.ledger_head_hash,scope.ledger_head_hash);
 assert.equal(first.reality_governance.available_capability_id,'inspect_tool');
 assert.equal(first.reality_governance.capability_schema_sha256,tool.schema_sha256);
 assert.equal(t.providerCalls[1].previous_response_id,'resp_verified_123');
 assert.equal(t.providerCalls[2].previous_response_id,'resp_verified_456');
 assert.equal(t.providerCalls[2].input[0].type,'function_call_output');
});
test('verified missing capability without exact-artifact owner approval never reaches OpenAI',async()=>{
 const t=fixture({missing:true,approved:false});
 assert.equal(t.brokerResult.status,'EXACT_ARTIFACT_APPROVAL_REQUIRED');
 await assert.rejects(t.gateway.originalJobCapabilitySession(t.args),
 /GOVERNED_RECOVERY_GOVERNED_CAPABILITY_NOT_INSTALLED_OR_REBOUND/);
 assert.equal(t.providerCalls.length,0);
 assert.equal(t.sandboxCalls.length,0);
});
test('approved newly verified isolated capability is eligible only with independent install readback',async()=>{
 const t=fixture({missing:true,approved:true});
 assert.equal(t.brokerResult.status,'APPROVED_CANDIDATE_REQUIRES_INSTALL_READBACK');
 const result=await t.gateway.originalJobCapabilitySession(t.args);
 assert.equal(result.status,'VERIFIED_TOOL_RESULT_RETURNED_TO_SAME_MODEL_CONVERSATION');
 assert.equal(result.original_job_completed,false);
 assert.equal(t.sandboxCalls.length,1);
 const broken=fixture({missing:true,approved:true});
 broken.args.installedReadback={...broken.args.installedReadback,activated:false};
 await assert.rejects(broken.gateway.originalJobCapabilitySession(broken.args),
 /GOVERNED_RECOVERY_GOVERNED_CAPABILITY_NOT_INSTALLED_OR_REBOUND/);
 assert.equal(broken.providerCalls.length,0);
});
test('owner and worldline drift stops model before request',async()=>{
 const t=fixture({scopeReader:async()=>({...scope,worldline_id:'world:other'})});
 await assert.rejects(t.gateway.originalJobCapabilitySession(t.args),
 /GOVERNED_RECOVERY_OWNER_GOAL_OR_AUTHORIZATION_DRIFT/);
 assert.equal(t.providerCalls.length,0);
});
test('ledger drift after first model response discards output before tool discovery',async()=>{
 let checks=0;
 const t=fixture({scopeReader:async()=>{
  checks++;
  return checks>=4?{...scope,ledger_head_hash:'0'.repeat(64)}:scope;
 }});
 await assert.rejects(t.gateway.originalJobCapabilitySession(t.args),
 /GOVERNED_RECOVERY_LEDGER_TIP_CHANGED_RECONCILIATION_REQUIRED/);
 assert.equal(t.providerCalls.length,1);
 assert.equal(t.sandboxCalls.length,0);
});
test('unknown provider tool cannot bypass verified Reality tool-name and schema',async()=>{
 const t=fixture({providerResponder:({index})=>
  index===1?response('resp_verified_123',[search]):
  response('resp_verified_456',[{...func,name:'delete_repo'}])});
 await assert.rejects(t.gateway.originalJobCapabilitySession(t.args),
 /DYNAMIC_TOOL_TRUSTED_MODEL_FUNCTION_CALL_REQUIRED/);
 assert.equal(t.sandboxCalls.length,0);
});
test('failed fenced claim cannot execute sandbox or return unverified tool output',async()=>{
 const t=fixture({claimStatus:'ALREADY_CLAIMED_NO_REPLAY'});
 await assert.rejects(t.gateway.originalJobCapabilitySession(t.args),
 /DYNAMIC_TOOL_GLOBAL_ATOMIC_FENCED_CLAIM_REQUIRED/);
 assert.equal(t.providerCalls.length,2);
 assert.equal(t.sandboxCalls.length,0);
 assert.equal(t.receipts.length,0);
});
test('independently settled task is blocked before any OpenAI inference',async()=>{
 const t=fixture({taskReader:async()=>({...readTask(),independently_settled:true})});
 await assert.rejects(t.gateway.originalJobCapabilitySession(t.args),
 /REALITY_OPENAI_GATEWAY_ORIGINAL_CONTINUITY_SCOPE_OR_TASK_DRIFT/);
 assert.equal(t.providerCalls.length,0);
});
