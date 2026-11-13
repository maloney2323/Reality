// Canonical Reality boundary for read-only employee model advice.
// The model is a reasoning dependency, NOT a source of job authority, memory,
// capability approval, installation, or independent verification.
// Read-only shift context is checked against service-role provider readback
// before AND after inference. Original-job tool execution needs a separate
// capability/Continuity adapter and cannot use this advisory-only route.
import {planZeroTouchSameJobContinuation}
 from './reality-universal-governed-recovery-handoff-v1.js';
import {runGovernedToolSession}
 from './reality-governed-tool-session-v1.js';

export const REALITY_GOVERNED_OPENAI_GATEWAY_VERSION =
 'reality-governed-openai-gateway-read-only-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SRC=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9]\d{0,15}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const fail=s=>{throw Error('REALITY_OPENAI_GATEWAY_'+s);};
function verifiedContext(x,requested) {
 if(x?.status!=='CURRENT_OWNER_SHIFT_PROVIDER_READBACK_VERIFIED'||
   x.readback_source!=='REALITY_OWNER_SCOPED_SHIFT_DB'||
   x.owner_id!==requested.owner_id||
   x.shift_id!==requested.shift_id||
   x.step_index!==requested.step_index||
   x.source_ref!==requested.source_ref||
   x.step_state!=='CLAIMED'||
   x.shift_status!=='RUNNING'||
   !SHA.test(x.shift_plan_fingerprint||'')||
   x.current_authorized_shift!==true||
   x.original_job_completed!==false||
   x.installation_authorized!==false||
   x.production_changed!==false)
  fail('CURRENT_SHIFT_SCOPE_READBACK_REQUIRED');
 return x;
}
function requestScope(x) {
 if(!UUID.test(x?.owner_id||'')||
    !UUID.test(x?.shift_id||'')||
    !UUID.test(x?.claim_id||'')||
    !Number.isInteger(x?.step_index)||x.step_index<2||x.step_index>5||
    !SRC.test(x?.source_ref||'')||
    x.shift_step_claimed!==true||
    x.read_only!==true||
    x.installation_authorized!==false||
    x.production_changed!==false||
    x.provider?.source_url!==x.source_ref||
    x.provider.provider_checked!==true||
    x.provider.read_only!==true||
    x.provider.production_changed!==false)
  fail('CLAIMED_READ_ONLY_SCOPE_REQUIRED');
 return x;
}
function safeReason(status) {
 return status===400||status===422?'OPENAI_REQUEST_OPTIONS_REJECTED':
  status===401||status===403?'OPENAI_CREDENTIAL_OR_MODEL_ACCESS_REJECTED':
  status===404?'OPENAI_MODEL_OR_ENDPOINT_NOT_FOUND':
  status===429?'OPENAI_RATE_OR_QUOTA_LIMIT':
  status>=500&&status<=599?'OPENAI_PROVIDER_SERVER_FAILURE':
  'OPENAI_RESPONSE_UNAVAILABLE';
}
export function createRealityGovernedOpenAIGateway({
 apiKey,model,readCurrentShift=null,readCurrentOriginal=null,fetchImpl=fetch
}={}) {
 if(typeof apiKey!=='string'||apiKey.length<12||
    typeof model!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,70}$/.test(model)||
    (readCurrentShift!==null&&typeof readCurrentShift!=='function')||
    (readCurrentOriginal!==null&&typeof readCurrentOriginal!=='function')||
    typeof fetchImpl!=='function')
  fail('TRUSTED_SERVER_MODEL_AND_SCOPE_ADAPTERS_REQUIRED');
 return Object.freeze({
  version:REALITY_GOVERNED_OPENAI_GATEWAY_VERSION,

  // One real PR-review original is admitted by the existing service-role
  // atomic claim. This read-only inference grants NO capability/installation
  // permissions. It must re-read the durable claim AND the exact GitHub PR
  // head before and after OpenAI; neither the model nor browser selects work.
  async originalJobReadOnlyInference({
   scope,sourceHeadSha,request,readCurrentSource
  }={}) {
   if(typeof readCurrentOriginal!=='function'||
      typeof readCurrentSource!=='function'||
      !UUID.test(scope?.owner_id||'')||
      !UUID.test(scope?.shift_id||'')||
      !UUID.test(scope?.claim_id||'')||
      !/^work:[a-f0-9]{32}$/.test(scope?.original_work_id||'')||
      !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(scope?.source_ref||'')||
      !SHA.test(scope?.source_proof_sha256||'')||
      !/^[a-f0-9]{40}$/.test(sourceHeadSha||''))
    fail('EXACT_OWNER_REVIEW_ORIGINAL_SCOPE_REQUIRED');
   if(!request||request.model!==model||
      request.tool_choice!=='none'||Object.hasOwn(request,'tools')||
      Object.hasOwn(request,'previous_response_id')||
      !Array.isArray(request.input)||request.input.length!==2||
      request.input[0]?.role!=='system'||request.input[1]?.role!=='user'||
      !Number.isSafeInteger(request.max_output_tokens)||
      request.max_output_tokens<1||request.max_output_tokens>1200||
      JSON.stringify(request).length>18000)
    fail('ORIGINAL_REVIEW_READ_ONLY_MODEL_REQUEST_REQUIRED');
   const verify=async()=>{
    const state=await readCurrentOriginal(Object.freeze({...scope}));
    if(state?.status!=='OWNER_ORIGINAL_REVIEW_CURRENT_FOR_MODEL'||
       state.readback_source!=='REALITY_SERVICE_ROLE_ORIGINAL_DB'||
       state.owner_id!==scope.owner_id||
       state.shift_id!==scope.shift_id||
       state.claim_id!==scope.claim_id||
       state.original_work_id!==scope.original_work_id||
       state.source_ref!==scope.source_ref||
       state.source_proof_sha256!==scope.source_proof_sha256||
       state.phase!=='CLAIMED'||
       state.shift_status!=='RUNNING'&&
        state.shift_status!=='AWAITING_EXACT_ORIGINAL_WORK'||
       !SHA.test(state.shift_plan_fingerprint||'')||
       state.model_response_id!==null||
       state.installation_authorized!==false||
       state.original_job_completed!==false||
       state.production_changed!==false)
     fail('ORIGINAL_REVIEW_CLAIM_OR_SHIFT_NOT_CURRENT');
    const observed=await readCurrentSource(Object.freeze({...scope}));
    if(observed?.source_ref!==scope.source_ref||
       observed?.head_sha!==sourceHeadSha||
       observed?.independently_read!==true||
       observed?.read_only!==true||
       observed?.production_changed!==false)
     fail('ORIGINAL_REVIEW_GITHUB_SOURCE_HEAD_DRIFT');
    return Object.freeze({plan_hash:state.shift_plan_fingerprint});
   };
   const before=await verify();
   let response;
   try {
    response=await fetchImpl('https://api.openai.com/v1/responses',{
     method:'POST',redirect:'error',cache:'no-store',
     signal:AbortSignal.timeout(20000),
     headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},
     body:JSON.stringify(request)
    });
   }catch{
    return Object.freeze({status:'UNAVAILABLE',
     reason:'OPENAI_REQUEST_OR_TIMEOUT_UNVERIFIED'});
   }
   if(!response?.ok)
    return Object.freeze({status:'UNAVAILABLE',reason:safeReason(Number(response?.status))});
   let data;
   try{data=await response.json()}catch{
    return Object.freeze({status:'UNAVAILABLE',
     reason:'OPENAI_PROVIDER_RESULT_UNVERIFIED'});
   }
   // Do not accept a tool invocation or model-proclaimed provider receipt.
   if(data?.status!=='completed'||!Array.isArray(data.output)||
      data.output.length>12||
      data.output.some(x=>['function_call','tool_search_call'].includes(x?.type))||
      !/^resp_[A-Za-z0-9_-]{4,160}$/.test(data.id||''))
    return Object.freeze({status:'UNAVAILABLE',
     reason:'OPENAI_PROVIDER_RESULT_UNVERIFIED'});
   const after=await verify();
   if(after.plan_hash!==before.plan_hash)
    fail('ORIGINAL_REVIEW_SHIFT_PLAN_CHANGED_DURING_INFERENCE');
   return Object.freeze({status:'CURRENT_ORIGINAL_REVIEW_ADVISORY_UNTRUSTED',
    data,original_work_id:scope.original_work_id,
    original_job_completed:false,installation_authorized:false,
    production_changed:false,
    full_continuity_verified:false,model_granted_authority:false});
  },
  // This second mode is the ONLY gateway method that may expose a capability
  // to a model, and it runs through the existing independently verified
  // Continuity/broker + fenced sandbox adapter, never employee prompt text.
  // The caller must be the trusted original-job service, not Reality Chat.
  async originalJobCapabilitySession({
   envelope,signingKey,brokerResult,installedReadback=null,
   readCurrentScope,readCheckpoint,readOriginalTask,lateBoundAdapter,
   now=()=>new Date().toISOString(),mode='DISCOVER_ON_DEMAND'
  }={}) {
   if(typeof readCurrentScope!=='function'||
      typeof readCheckpoint!=='function'||
      typeof readOriginalTask!=='function'||
      typeof lateBoundAdapter?.describe!=='function'||
      typeof lateBoundAdapter?.forToolSearch!=='function'||
      typeof lateBoundAdapter?.dispatch!=='function'||
      typeof now!=='function'||
      !['PRE_EQUIP','DISCOVER_ON_DEMAND'].includes(mode))
    fail('TRUSTED_ORIGINAL_CONTINUITY_AND_CAPABILITY_ADAPTERS_REQUIRED');
   const requested=envelope?.body?.scope;
   if(!requested||envelope?.body?.handoff_purpose!==
      'ASSESS_AND_PREPARE_ORIGINAL_RECOVERY')
    fail('SIGNED_ORIGINAL_CONTINUITY_HANDOFF_REQUIRED');
   let providerRequests=0;
   async function verifyBoundary(){
    // All observations are trusted SERVICE readbacks at this exact instant,
    // not objects supplied by a browser, issue, employee or model response.
    const [current,checkpoint,task]=await Promise.all([
     readCurrentScope(),readCheckpoint(),readOriginalTask()
    ]);
    const plan=planZeroTouchSameJobContinuation({
     envelope,signingKey,currentScope:current,executionTime:now(),
     brokerResult,checkpointReadback:checkpoint,installedReadback
    });
    if(plan.status!=='SAME_ORIGINAL_JOB_READY_FOR_GOVERNED_CONTINUATION'||
       plan.tool_scope!=='EPHEMERAL_ORIGINAL_JOB_ONLY'||
       plan.original_work_id!==requested.original_work_id||
       plan.owner_id!==requested.owner_id||
       plan.goal_id!==requested.goal_id||
       plan.original_job_completed===true||
       task?.independently_verified!==true||
       task.original_work_id!==plan.original_work_id||
       task.owner_id!==plan.owner_id||task.goal_id!==plan.goal_id||
       task.installation_authorized!==false||
       task.provider_effect_may_have_occurred!==false||
       task.production_changed!==false||task.independently_settled!==false)
     fail('ORIGINAL_CONTINUITY_SCOPE_OR_TASK_DRIFT');
    return Object.freeze({
     task,checkpoint_sha256:plan.checkpoint_sha256,
     capability_id:plan.verified_tool_manifest.capability_id,
     capability_schema_sha256:plan.verified_tool_manifest.schema_sha256
    });
   }
   // Prevent even initial model inference unless exact signed original work
   // and approved/rebound tool are still eligible for the current checkpoint.
   const initial=await verifyBoundary();
   const guardedFetch=async(url,options)=>{
    if(url!=='https://api.openai.com/v1/responses'||
       options?.method!=='POST'||!options?.body)
     fail('PROVIDER_HOST_OR_REQUEST_OUTSIDE_GATEWAY');
    await verifyBoundary();
    const response=await fetchImpl(url,options);
    // Drift after a provider response invalidates its output. The model
    // cannot continue on a stale job, ledger tip, authorization or tool.
    await verifyBoundary();
    providerRequests++;
    return response;
   };
   const result=await runGovernedToolSession({
    mode,model,apiKey,fetchImpl:guardedFetch,now,
    verifiedContinuityContext:Object.freeze({
     independently_verified:true,
     original_work_id:requested.original_work_id,goal_id:requested.goal_id,
     continuity_root_id:requested.continuity_root_id,
     worldline_id:requested.worldline_id,
     source_identity_hash:requested.source_identity_hash,
     ledger_head_hash:requested.ledger_head_hash,
     checkpoint_sha256:initial.checkpoint_sha256,
     capability_id:initial.capability_id,
     capability_schema_sha256:initial.capability_schema_sha256
    }),
    readOriginalTask:async()=>{
     const checked=await verifyBoundary();
     return checked.task;
    },lateBoundAdapter
   });
   // A session result is model data, NOT settlement. Even a verified tool
   // call requires the existing original runner to finish/settle the job.
   if(result?.original_work_id!==requested.original_work_id||
      result.original_job_completed!==false)
    fail('ORIGINAL_JOB_RESULT_MISMATCH_OR_FALSE_SETTLEMENT');
   return Object.freeze({...result,
    gateway_version:REALITY_GOVERNED_OPENAI_GATEWAY_VERSION,
    governed_original_job_scope:true,
    verified_original_checkpoint_sha256:initial.checkpoint_sha256,
    model_provider_requests_verified:providerRequests,
    model_granted_authority:false,
    original_job_completed:false,production_changed:false});
  },
  async readOnlyShiftAdvisory({scope,request}={}) {
   if(typeof readCurrentShift!=='function')
    fail('SHIFT_SCOPE_ADAPTER_REQUIRED');
   requestScope(scope);
   if(!request||request.model!==model||
     request.tool_choice!=='none'||Object.hasOwn(request,'tools')||
     Object.hasOwn(request,'previous_response_id')||
     !Number.isSafeInteger(request.max_output_tokens)||
     request.max_output_tokens<1||request.max_output_tokens>1200||
     !Array.isArray(request.input)||request.input.length!==2||
     request.input[0]?.role!=='system'||request.input[1]?.role!=='user'||
     JSON.stringify(request).length>14000)
    fail('ADVISORY_ONLY_MODEL_REQUEST_REQUIRED');
   // This is a shift readback, NOT a full Continuity goal/worldline proof.
   // We deliberately do not grant tools here or claim employee drift control
   // is complete until the original-job Continuity adapters are connected.
   const before=verifiedContext(await readCurrentShift(scope),scope);
   let provider;
   try {
    provider=await fetchImpl('https://api.openai.com/v1/responses',{
     method:'POST',redirect:'error',cache:'no-store',
     signal:AbortSignal.timeout(18000),
     headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},
     body:JSON.stringify(request)
    });
   }catch {
    return Object.freeze({status:'UNAVAILABLE',reason:'OPENAI_REQUEST_OR_TIMEOUT_UNVERIFIED'});
   }
   if(!provider?.ok)
    return Object.freeze({status:'UNAVAILABLE',reason:safeReason(Number(provider?.status))});
   let data;
   try {data=await provider.json();}catch{
    return Object.freeze({status:'UNAVAILABLE',reason:'OPENAI_PROVIDER_RESULT_UNVERIFIED'});
   }
   if(data?.status!=='completed'||!Array.isArray(data.output)||
      data.output.length>12||
      data.output.some(x=>['function_call','tool_search_call'].includes(x?.type))||
      typeof data.id!=='string'||!/^resp_[a-zA-Z0-9_-]{4,160}$/.test(data.id))
    return Object.freeze({status:'UNAVAILABLE',reason:'OPENAI_PROVIDER_RESULT_UNVERIFIED'});
   // Recheck after the provider call. If the owner shift, source, or step
   // changes while the model reasons, discard its answer, do not persist
   // its stale advice or authorize any further action.
   const after=verifiedContext(await readCurrentShift(scope),scope);
   if(after.shift_plan_fingerprint!==before.shift_plan_fingerprint)
    fail('SHIFT_PLAN_DRIFT_RECHECK_REQUIRED');
   return Object.freeze({status:'UNTRUSTED_ADVISORY_ONLY',
    data,original_job_completed:false,installation_authorized:false,
    production_changed:false,governance_boundary:'CURRENT_SHIFT_RECHECKED',
    full_continuity_verified:false,model_issued_tool_authority:false});
  }
 });
}
