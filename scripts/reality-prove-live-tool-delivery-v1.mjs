// Bounded, real OpenAI provider proof of client-discovered tool delivery.
// Synthetic scope, source fixture, ephemeral signing key and LOCAL durable
// claim/receipt. NEVER call this a customer original-job settlement.
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {sealGovernedRecoveryHandoff,brokerGovernedRecoveryCapability}
 from '../src/reality-universal-governed-recovery-handoff-v1.js';
import {createGovernedLateBoundToolAdapter}
 from '../src/reality-governed-late-bound-tool-adapter-v1.js';
import {runGovernedToolSession}
 from '../src/reality-governed-tool-session-v1.js';

const target='benchmark-results/reality-live-late-bound-tool-proof-v1.json';
const dir=path.dirname(target);
const digest=x=>createHash('sha256').update(typeof x==='string'?x:
 JSON.stringify(x)).digest('hex');
const canonical=v=>v===null||typeof v!=='object'?v:
 Array.isArray(v)?v.map(canonical):
 Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
const hash=v=>digest(JSON.stringify(canonical(v)));
const start=new Date(),startIso=start.toISOString();
const earlier=new Date(start.getTime()-60*1000).toISOString();
const expiry=new Date(start.getTime()+8*60*1000).toISOString();
const key=randomBytes(32),owner=randomUUID(),shift=randomUUID();
const job='work:'+randomBytes(16).toString('hex');
const failureId=randomUUID(),fixtureName='src/reality-extensions/riley-original-dispatch.mjs';
const fixture=Object.freeze({path:fixtureName,
 source:'export function dispatchOriginal(){return {status:"WOKE_ONLY",original_execution_ack:false};}\n',
 provider:'GITHUB_PINNED_FIXTURE_NOT_LIVE_JOB',
 test_assertion:'dispatchOriginal() must produce an original execution acknowledgment.'});
const toolSchema={type:'object',properties:{
 path:{type:'string',maxLength:160,description:'Read one pinned isolated source fixture path'}
 },required:['path'],additionalProperties:false};
const tool={name:'inspect_riley_source',
 description:'Inspect the isolated Riley original-job dispatch source and identify whether it actually executes.',
 capability_id:'riley_source_reader',
 schema_sha256:hash(toolSchema),parameters:toolSchema};
const current={owner_id:owner,shift_id:shift,original_work_id:job,
 goal_id:'goal:prove-dynamic-tool-delivery',
 continuity_root_id:'isolated:'+job,worldline_id:'isolated:'+job,
 source_identity_hash:digest(fixture.path+'|'+fixture.source),
 ledger_head_hash:digest('checkpoint|'+job),
 authorization_fingerprint:digest('test-only|'+job),
 authorization_expires_at:expiry,target_environment:'ISOLATED_PREVIEW',
 allowed_capabilities:['fixture:read'],original_job_authorized:true,
 independently_settled:false,provider_effect_may_have_occurred:false,
 installation_authorized:false,production_changed:false};
const fail={failure_id:failureId,owner_id:owner,shift_id:shift,
 original_work_id:job,goal_id:current.goal_id,
 continuity_root_id:current.continuity_root_id,
 worldline_id:current.worldline_id,
 source_identity_hash:current.source_identity_hash,
 ledger_head_hash:current.ledger_head_hash,
 failed_valid_at:earlier,provider_evidence_sha256:digest('fixture-failure|'+job),
 capability_id:'riley_source_reader',blocker_class:'ENVIRONMENT_CONTEXT_DEFICIT',
 provider_observation_independently_verified:true,
 durable_failure_readback_verified:true,
 provider_effect_may_have_occurred:false,production_changed:false};
const envelope=sealGovernedRecoveryHandoff({
 currentScope:current,failure:fail,signingKey:key,transactionTime:startIso});
const brokerResult=brokerGovernedRecoveryCapability({
 envelope,signingKey:key,currentScope:current,executionTime:startIso,
 registryReadback:{independently_verified:true,status:'ACTIVE',
  original_work_id:job,capability_id:'riley_source_reader',
  manifest:{capability_id:'riley_source_reader',
   schema_sha256:tool.schema_sha256,required_capabilities:['fixture:read'],
   external_permission_escalation:false,production_write_authorized:false}}});
const checkpoint={independently_verified:true,original_work_id:job,
 owner_id:owner,goal_id:current.goal_id,failure_id:failureId,
 source_identity_hash:current.source_identity_hash,
 checkpoint_sha256:digest('prefailure|'+job),
 provider_effect_may_have_occurred:false,original_job_settled:false};
await fs.mkdir(dir,{recursive:true});
const claimPath=path.join(dir,'isolated-live-tool-fenced-claim.json');
const receiptPath=path.join(dir,'isolated-live-tool-readback.json');
let providerCalls=0,verifiedToolCalls=0;
const trace=[];
const fetchImpl=async(url,opts)=>{
 if(url!=='https://api.openai.com/v1/responses')throw Error('MODEL_ENDPOINT_NOT_ALLOWED');
 providerCalls++;
 const req=JSON.parse(opts.body);
 trace.push({event:'REAL_MODEL_REQUEST',sequence:providerCalls,
  prior_response_id:req.previous_response_id??null,
  tools:(req.tools??[]).map(x=>x.type),
  additional_tools:(req.input??[]).some(x=>x.type==='additional_tools')});
 const response=await fetch(url,opts);
 // Model status and output structure are retained, not prompts/credentials.
 return response;
};
const adapter=createGovernedLateBoundToolAdapter({
 envelope,signingKey:key,tool,brokerResult,
 readCurrentScope:async()=>structuredClone(current),
 readCheckpoint:async()=>structuredClone(checkpoint),
 acquireFencedClaim:async input=>{
  const claim={status:'EXACT_TOOL_CALL_FENCED_CLAIMED',
   original_work_id:job,claim_sha256:digest('fence|'+input.execution_identity_sha256),
   execution_identity_sha256:input.execution_identity_sha256,
   provider_effect_may_have_occurred:false,
   installation_authorized:false,production_changed:false};
  // Exclusive on-disk claim. Not a service-role/database lease.
  const fd=await fs.open(claimPath,'wx',0o600);
  try{await fd.writeFile(JSON.stringify(claim));}finally{await fd.close();}
  const reread=JSON.parse(await fs.readFile(claimPath,'utf8'));
  if(reread.execution_identity_sha256!==input.execution_identity_sha256)
   throw Error('LOCAL_FENCE_READBACK_MISMATCH');
  trace.push({event:'LOCAL_ISOLATED_FENCE_RECORDED',
   execution_identity_sha256:input.execution_identity_sha256});
  return claim;
 },
 executeSandbox:async input=>{
  if(input.args.path!==fixtureName||input.allow_network!==false||
   input.allow_secrets!==false||input.production_write_permitted!==false||
   input.original_work_id!==job)
   throw Error('ISOLATED_TOOL_EXECUTION_FORBIDDEN');
  trace.push({event:'ISOLATED_REGISTERED_TOOL_INVOKED',
   tool_name:input.tool_name,source_sha256:digest(fixture.source)});
  // The only executor in this proof returns the independently pinned fixture.
  // It cannot fetch external code or evaluate generated source.
  return {path:fixture.path,source:fixture.source,
   source_sha256:digest(fixture.source),
   test_assertion:fixture.test_assertion};
 },
 independentVerifier:async input=>{
  const obs=input.observed;
  if(obs?.source_sha256!==digest(fixture.source)||
   obs.path!==fixture.path||obs.source!==fixture.source||
   input.original_work_id!==job||input.tool_schema_sha256!==tool.schema_sha256)
   throw Error('INDEPENDENT_FIXTURE_READBACK_INVALID');
  verifiedToolCalls++;
  trace.push({event:'INDEPENDENT_PINNED_FIXTURE_VERIFIED'});
  return {verified:true,original_job_completed:false,
   installation_authorized:false,production_changed:false,
   provider_effect_may_have_occurred:false,
   external_action_performed:false,
   result:{source:fixture.source,source_sha256:digest(fixture.source),
    test_assertion:fixture.test_assertion,original_job_settled:false}};
 },
 recordAndReadback:async input=>{
  const record={...input,
   independently_verified:true,production_changed:false,
   installation_authorized:false,receipt_ref:'isolated-local-proof:'+randomUUID()};
  const tmp=receiptPath+'.pending';
  await fs.writeFile(tmp,JSON.stringify(record),{mode:0o600});
  await fs.rename(tmp,receiptPath);
  const loaded=JSON.parse(await fs.readFile(receiptPath,'utf8'));
  if(loaded.verified_result_hash!==input.verified_result_hash||
   loaded.execution_identity_sha256!==input.execution_identity_sha256)
   throw Error('ISOLATED_RECEIPT_READBACK_MISMATCH');
  trace.push({event:'ISOLATED_LOCAL_RESULT_RECEIPT_READBACK',
   receipt_ref:loaded.receipt_ref});
  return loaded;
 }
});
let outcome=null,error=null;
try{
 if(!process.env.OPENAI_API_KEY||process.env.OPENAI_API_KEY.length<12)
  throw Error('REAL_OPENAI_API_KEY_UNAVAILABLE');
 outcome=await runGovernedToolSession({
  mode:'DISCOVER_ON_DEMAND',model:'gpt-5.4',
  apiKey:process.env.OPENAI_API_KEY,
  lateBoundAdapter:adapter,fetchImpl,
  readOriginalTask:async()=>({
   independently_verified:true,original_work_id:job,
   owner_id:owner,goal_id:current.goal_id,
   objective:'In this isolated source verification exercise you must inspect the Riley source code with an available tool before answering. Use tool_search to find the source inspection tool, then call that function on '+fixtureName+'. Explain whether the code only wakes a job or actually executes it. The tool is required to answer from source evidence.',
   installation_authorized:false,
   provider_effect_may_have_occurred:false,production_changed:false,
   independently_settled:false})
 });
 if(outcome.status!=='VERIFIED_TOOL_RESULT_RETURNED_TO_SAME_MODEL_CONVERSATION'||
    outcome.tool_search_completed!==true||verifiedToolCalls!==1||
    providerCalls!==3||!/WOKE_ONLY|wakes?|acknowledg/i.test(outcome.model_text||''))
   throw Error('REAL_MODEL_DYNAMIC_TOOL_DELIVERY_NOT_PROVEN');
}catch(e){error=String(e.message||'PROOF_ERROR').slice(0,300);}
const report={
 version:'reality-live-late-bound-tool-provider-proof-v1',
 kind:'SYNTHETIC_ISOLATED_FIXTURE_WITH_REAL_OPENAI_MODEL',
 passed:error===null,
 status:error===null?'REAL_OPENAI_DYNAMIC_TOOL_LOOP_PROVEN_ISOLATED':
  'REAL_OPENAI_DYNAMIC_TOOL_LOOP_UNPROVEN',
 error_code:error,
 model:'gpt-5.4',original_work_id:job,
 synthetic_original_authorization:true,
 real_customer_original_authorization:false,
 source_fixture_sha256:digest(fixture.source),
 independent_fixture_verification_count:verifiedToolCalls,
 provider_request_count:providerCalls,
 result_receipt_ref:outcome?.independent_tool_receipt??null,
 model_response_id:outcome?.model_response_id??null,
 model_answer:outcome?.model_text??null,
 trace,
 live_riley_worker_connected:false,
 realtime_owner_job_settled:false,
 independently_verified_customer_final_receipt:false,
 capability_installed:false,production_changed:false
};
await fs.writeFile(target,JSON.stringify(report,null,2));
console.log('REALITY_ISOLATED_LIVE_PROVIDER_TOOL_PROOF',JSON.stringify({
 status:report.status,passed:report.passed,
 provider_request_count:providerCalls,
 verified_tool_calls:verifiedToolCalls,
 independent_receipt_ref:report.result_receipt_ref,
 real_customer_job_settled:false,
 error_code:error
}));
if(error)process.exitCode=1;
