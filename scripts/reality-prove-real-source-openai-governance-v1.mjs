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

const target='benchmark-results/reality-real-source-openai-governance-v1.json';
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
const failureId=randomUUID();
const fixtureName='api/reality/governed-employee-shift-worker.js';
const workerName='src/reality-governed-employee-shift-worker-v1.js';
const readLiveSource=async()=>{
 const api=await fs.readFile(fixtureName,'utf8');
 const worker=await fs.readFile(workerName,'utf8');
 if(!api.includes('processGovernedEmployeeShiftTick(db);')||
    !worker.includes('executeQualifiedOriginals=null')||
    !worker.includes('TRUSTED_ORIGINAL_DRIVER_NOT_CONNECTED'))
  throw Error('REAL_REPOSITORY_BLOCKER_SOURCE_CHANGED');
 const relevant=worker.split('\n').filter((line,i,arr)=>
  /executeQualifiedOriginals|TRUSTED_ORIGINAL_DRIVER_NOT_CONNECTED/.test(line)||
  (i>0&&/executeQualifiedOriginals|TRUSTED_ORIGINAL_DRIVER_NOT_CONNECTED/.test(arr[i-1]))).join('\n');
 return {source:'REALITY API WORKER SOURCE:\n'+api+'\nREALITY SHARED WORKER VERIFIED EXCERPT:\n'+relevant,
  api_sha256:digest(api),worker_sha256:digest(worker)};
};
const pinned=await readLiveSource();
const commit=/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||'')?
 process.env.GITHUB_SHA:null;
const fixture=Object.freeze({path:fixtureName,source:pinned.source,
 provider:'REAL_GITHUB_WORKTREE_SOURCE_READBACK_NOT_DEPLOYMENT',
 test_assertion:'Determine from genuine Reality source whether the trusted original-job executor is supplied to the live API.',
 api_sha256:pinned.api_sha256,worker_sha256:pinned.worker_sha256});
const toolSchema={type:'object',properties:{
 path:{type:'string',maxLength:160,description:'Read exact real Reality worker source path (read only)'}
 },required:['path'],additionalProperties:false};
const tool={name:'inspect_riley_worker',
 description:'Inspect actual checked-out Reality source and independently pinned worker execution handoff.',
 capability_id:'riley_source_reader',
 schema_sha256:hash(toolSchema),parameters:toolSchema};
const current={owner_id:owner,shift_id:shift,original_work_id:job,
 goal_id:'goal:prove-dynamic-tool-delivery',
 continuity_root_id:'isolated:'+job,worldline_id:'isolated:'+job,
 source_identity_hash:digest(fixture.path+'|'+fixture.source),
 ledger_head_hash:digest('checkpoint|'+job),
 authorization_fingerprint:digest('test-only|'+job),
 authorization_expires_at:expiry,target_environment:'ISOLATED_PREVIEW',
 allowed_capabilities:['source:read'],original_job_authorized:true,
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
   schema_sha256:tool.schema_sha256,required_capabilities:['source:read'],
   external_permission_escalation:false,production_write_authorized:false}}});
const checkpoint={independently_verified:true,original_work_id:job,
 owner_id:owner,goal_id:current.goal_id,failure_id:failureId,
 source_identity_hash:current.source_identity_hash,
 checkpoint_sha256:digest('prefailure|'+job),
 provider_effect_may_have_occurred:false,original_job_settled:false};
await fs.mkdir(dir,{recursive:true});
const claimPath=path.join(dir,'isolated-live-tool-fenced-claim.json');
const receiptPath=path.join(dir,'isolated-live-tool-readback.json');
let providerCalls=0,verifiedToolCalls=0,executionCount=0,claimCount=0;
let actualCall=null,actualResponseId=null,latestScope=current;
const controls={wrong_tool_rejected:false,scope_drift_rejected:false,replayed_call_rejected:false};
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
 const body=await response.json();
 for(const item of body?.output||[])
  if(item?.type==='function_call'){actualCall=item;actualResponseId=body.id;}
 trace.push({event:'OPENAI_REAL_RESPONSE',response_id:body.id,
  output_types:(body.output||[]).map(x=>x.type),status:body.status});
 return {ok:response.ok,json:async()=>body};
};
const adapter=createGovernedLateBoundToolAdapter({
 envelope,signingKey:key,tool,brokerResult,
 readCurrentScope:async()=>structuredClone(latestScope),
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
  claimCount++;
  trace.push({event:'LOCAL_ISOLATED_FENCE_RECORDED',
   execution_identity_sha256:input.execution_identity_sha256});
  return claim;
 },
 executeSandbox:async input=>{
  if(input.args.path!==fixtureName||input.allow_network!==false||
   input.allow_secrets!==false||input.production_write_permitted!==false||
   input.original_work_id!==job)
   throw Error('ISOLATED_TOOL_EXECUTION_FORBIDDEN');
  const latest=await readLiveSource();
  if(latest.source!==fixture.source||latest.api_sha256!==fixture.api_sha256||
     latest.worker_sha256!==fixture.worker_sha256)
    throw Error('REAL_SOURCE_CHANGED_SINCE_PINNED_CHECKOUT');
  executionCount++;
  trace.push({event:'REAL_REPO_SOURCE_READ',
   tool_name:input.tool_name,source_sha256:digest(fixture.source),
   source_commit:commit});
  return {path:fixture.path,source:latest.source,
   source_sha256:digest(latest.source),
   test_assertion:fixture.test_assertion,
   api_sha256:latest.api_sha256,worker_sha256:latest.worker_sha256};
 },
 independentVerifier:async input=>{
  const obs=input.observed;
  const latest=await readLiveSource();
  if(obs?.source_sha256!==digest(latest.source)||
   obs.path!==fixture.path||obs.source!==latest.source||
   obs.api_sha256!==latest.api_sha256||
   obs.worker_sha256!==latest.worker_sha256||
   input.original_work_id!==job||input.tool_schema_sha256!==tool.schema_sha256)
   throw Error('INDEPENDENT_REAL_SOURCE_READBACK_INVALID');
  verifiedToolCalls++;
  trace.push({event:'INDEPENDENT_REAL_SOURCE_READBACK_VERIFIED'});
  return {verified:true,original_job_completed:false,
   installation_authorized:false,production_changed:false,
   provider_effect_may_have_occurred:false,
   external_action_performed:false,
   result:{source:fixture.source,source_sha256:digest(fixture.source),
    api_sha256:fixture.api_sha256,worker_sha256:fixture.worker_sha256,
    source_commit:commit,
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
   objective:'For the real Reality source-backed issue #263, investigate whether the authenticated API connects the trusted original-job driver. You MUST use tool_search, then call the read-only inspect_riley_worker on '+fixtureName+' to inspect genuine Git checkout source and relevant worker implementation. Explain how processGovernedEmployeeShiftTick receives (or does not receive) executeQualifiedOriginals, and what happens when it is null. No installation or job settlement claims.',
   installation_authorized:false,
   provider_effect_may_have_occurred:false,production_changed:false,
   independently_settled:false})
 });
 if(outcome.status!=='VERIFIED_TOOL_RESULT_RETURNED_TO_SAME_MODEL_CONVERSATION'||
    outcome.tool_search_completed!==true||verifiedToolCalls!==1||
    executionCount!==1||claimCount!==1||providerCalls!==3||
    !/executeQualifiedOriginals|TRUSTED_ORIGINAL_DRIVER_NOT_CONNECTED|driver.{0,50}not.{0,30}connect|no.{0,25}driver/i.test(outcome.model_text||''))
   throw Error('REAL_REPO_SOURCE_MODEL_DIAGNOSIS_NOT_PROVEN');
 if(!actualCall||!actualResponseId)throw Error('NO_REAL_TOOL_CALL_CAPTURED');
 try{await adapter.dispatch({functionCall:{...actualCall,name:'install_unapproved'},
  providerResponseId:actualResponseId,executionTime:new Date().toISOString()});}
 catch(e){controls.wrong_tool_rejected=/TRUSTED_MODEL_FUNCTION_CALL_REQUIRED/.test(e.message);}
 latestScope={...current,allowed_capabilities:['production:write']};
 try{await adapter.describe({executionTime:new Date().toISOString()});}
 catch(e){controls.scope_drift_rejected=/DRIFT/.test(e.message);}
 latestScope=current;
 try{await adapter.dispatch({functionCall:actualCall,
  providerResponseId:actualResponseId,executionTime:new Date().toISOString()});}
 catch(e){controls.replayed_call_rejected=/EEXIST/.test(String(e.message||''))&&
   executionCount===1&&claimCount===1;}
 if(Object.values(controls).some(v=>!v))
  throw Error('REAL_GOVERNANCE_NEGATIVE_CONTROLS_FAILED');
}catch(e){error=String(e.message||'PROOF_ERROR').slice(0,300);}
const report={
 version:'reality-live-late-bound-tool-provider-proof-v1',
 kind:'REAL_REPO_SOURCE_PLUS_REAL_OPENAI_WITH_EPHEMERAL_TEST_SCOPE',
 passed:error===null,
 status:error===null?'REAL_SOURCE_OPENAI_GOVERNED_TOOL_LOOP_PROVEN':
  'REAL_OPENAI_DYNAMIC_TOOL_LOOP_UNPROVEN',
 error_code:error,
 model:'gpt-5.4',original_work_id:job,
 synthetic_original_authorization:true,
 real_customer_original_authorization:false,
 source_commit:commit,source_issue:'https://github.com/maloney2323/Reality/issues/263',
 source_file:fixtureName,source_sha256:digest(fixture.source),
 api_sha256:fixture.api_sha256,worker_sha256:fixture.worker_sha256,
 controls,source_execution_count:executionCount,local_claim_count:claimCount,
 independent_fixture_verification_count:verifiedToolCalls,
 provider_request_count:providerCalls,
 result_receipt_ref:outcome?.independent_tool_receipt??null,
 model_response_id:outcome?.model_response_id??null,
 model_answer:outcome?.model_text??null,
 trace,
 actual_repo_code_inspected:true,live_riley_worker_connected:false,
 realtime_owner_job_settled:false,
 independently_verified_customer_final_receipt:false,
 capability_installed:false,production_changed:false
};
await fs.writeFile(target,JSON.stringify(report,null,2));
console.log('REALITY_REAL_SOURCE_OPENAI_GOVERNANCE_PROOF',JSON.stringify({
 status:report.status,passed:report.passed,
 provider_request_count:providerCalls,
 verified_tool_calls:verifiedToolCalls,
 independent_receipt_ref:report.result_receipt_ref,
 real_customer_job_settled:false,controls,
 error_code:error
}));
if(error)process.exitCode=1;
