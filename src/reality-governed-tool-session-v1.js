// One bounded OpenAI Responses capability-delivery cycle.
// Supports proactive additional_tools or client-executed tool_search.
// This module is intentionally server-only and DOES NOT self-authorize
// an original job, install a capability, resume an uncertain effect,
// declare final settlement, or create a production /tools endpoint.
export const GOVERNED_TOOL_SESSION_VERSION='reality-governed-openai-tool-session-v1';
const fail=x=>{throw Error('GOVERNED_TOOL_SESSION_'+x)};
const WORK=/^work:[a-f0-9]{32}$/;
const RESPONSE=/^resp_[A-Za-z0-9_-]{5,150}$/;
const MODEL=/^[a-zA-Z0-9._-]{3,110}$/;
const SCOPES=new Set(['PRE_EQUIP','DISCOVER_ON_DEMAND']);
const SEARCH={type:'tool_search',execution:'client',
 description:'Discover only independently verified tools allowed for this exact original job.',
 parameters:{
  type:'object',properties:{
   goal:{type:'string',description:'Capability needed for the original job'}
  },required:['goal'],additionalProperties:false
 }};
const resultText=x=>(x?.output||[]).flatMap(i=>i?.content||[])
 .filter(i=>i?.type==='output_text'&&typeof i.text==='string')
 .map(i=>i.text).join('').slice(0,3000);
const single=(response,type)=>{
 const items=(response.output||[]).filter(x=>x.type===type);
 if(items.length>1)fail('MULTIPLE_PROVIDER_ACTIONS_NOT_AUTHORIZED');
 return items[0]||null;
};
function readResponse(r){
 if(!r||!RESPONSE.test(r.id||'')||
  !['completed','in_progress'].includes(r.status)||
  !Array.isArray(r.output)||r.output.length>12)
  fail('PROVIDER_RESPONSE_SHAPE_UNVERIFIED');
 return r;
}
export async function runGovernedToolSession({
 mode='DISCOVER_ON_DEMAND',
 readOriginalTask,lateBoundAdapter,
 model,apiKey,fetchImpl=fetch,
 verifiedContinuityContext=null,
 now=()=>new Date().toISOString()
}={}){
 if(!SCOPES.has(mode)||typeof readOriginalTask!=='function'||
  typeof lateBoundAdapter?.describe!=='function'||
  typeof lateBoundAdapter?.forToolSearch!=='function'||
  typeof lateBoundAdapter?.dispatch!=='function'||
  !MODEL.test(model||'')||
  !/^(?:gpt-6|gpt-5\.[4-9])(?:[._-].*)?$/i.test(model)||
  typeof apiKey!=='string'||apiKey.length<12||
  typeof fetchImpl!=='function'||typeof now!=='function')
  fail('TRUSTED_MODEL_AND_SERVER_ADAPTER_REQUIRED');
 const task=await readOriginalTask();
 if(task?.independently_verified!==true||
  !WORK.test(task.original_work_id||'')||
  typeof task.owner_id!=='string'||!task.owner_id||
  typeof task.goal_id!=='string'||!task.goal_id||
  typeof task.objective!=='string'||!task.objective.trim()||
  task.objective.length>5000||
  task.installation_authorized!==false||
  task.provider_effect_may_have_occurred!==false||
  task.production_changed!==false||
  task.independently_settled!==false)
  fail('CURRENT_SIGNED_ORIGINAL_TASK_REQUIRED');
 const job=task.original_work_id;
 if(verifiedContinuityContext!==null&&(
   verifiedContinuityContext.independently_verified!==true||
   verifiedContinuityContext.original_work_id!==job||
   verifiedContinuityContext.goal_id!==task.goal_id||
   !/^[a-f0-9]{64}$/.test(verifiedContinuityContext.source_identity_hash||'')||
   !/^[a-f0-9]{64}$/.test(verifiedContinuityContext.ledger_head_hash||'')||
   !/^[a-f0-9]{64}$/.test(verifiedContinuityContext.checkpoint_sha256||'')||
   !/^[a-f0-9]{64}$/.test(verifiedContinuityContext.capability_schema_sha256||'')||
   typeof verifiedContinuityContext.continuity_root_id!=='string'||
   typeof verifiedContinuityContext.worldline_id!=='string'||
   !verifiedContinuityContext.continuity_root_id||
   !verifiedContinuityContext.worldline_id||
   typeof verifiedContinuityContext.capability_id!=='string'||
   !/^[a-z][a-z0-9._-]{2,90}$/.test(verifiedContinuityContext.capability_id)||
   JSON.stringify(verifiedContinuityContext).length>2000
  ))fail('VERIFIED_CONTINUITY_CONTEXT_REQUIRED');
 // Caution: the returned job's context is read-only task data, not a grant.
 // Only the server's signed envelope and the call-level lease grant tools.
 const context=JSON.stringify({
  original_work_id:job,goal_id:task.goal_id,objective:task.objective,
  // The central Reality gateway supplies this from current independent
  // Continuity/broker readback. The model cannot mint, edit or elevate it.
  ...(verifiedContinuityContext?{reality_governance:{
   continuity_root_id:verifiedContinuityContext.continuity_root_id,
   worldline_id:verifiedContinuityContext.worldline_id,
   source_identity_hash:verifiedContinuityContext.source_identity_hash,
   ledger_head_hash:verifiedContinuityContext.ledger_head_hash,
   checkpoint_sha256:verifiedContinuityContext.checkpoint_sha256,
   available_capability_id:verifiedContinuityContext.capability_id,
   capability_schema_sha256:verifiedContinuityContext.capability_schema_sha256,
   authority:'Reality validates permissions, tool results and settlement',
  }}:{}),
  rules:'Use only governed tools. Do not claim installation or settlement. Unverified model conclusions are proposals.'
 });
 let requests=0;
 const ask=async payload=>{
  if(++requests>3)fail('MODEL_CONTINUATION_BUDGET_EXHAUSTED');
  const response=await fetchImpl('https://api.openai.com/v1/responses',{
   method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(25000),
   headers:{authorization:'Bearer '+apiKey,
    'content-type':'application/json'},
   body:JSON.stringify({model,parallel_tool_calls:false,
    max_output_tokens:650,...payload})
  });
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body)fail('MODEL_PROVIDER_UNAVAILABLE');
  return readResponse(body);
 };
 let first;
 if(mode==='PRE_EQUIP'){
  const prepared=await lateBoundAdapter.describe({executionTime:now()});
  if(prepared.original_work_id!==job||
   prepared.status!=='LATE_BOUND_TOOL_AVAILABLE_AT_MODEL_BOUNDARY'||
   prepared.additional_tools?.role!=='developer')
   fail('PROACTIVE_TOOL_SCHEMA_UNVERIFIED');
  first=await ask({input:[
   prepared.additional_tools,
   {role:'user',content:context}
  ]});
 }else first=await ask({input:[{role:'user',content:context}],
  tools:[SEARCH]});
 let active=first,searchDispatched=false,providerToolCalls=0;
 if(mode==='DISCOVER_ON_DEMAND'){
  const search=single(first,'tool_search_call');
  if(!search)return Object.freeze({status:'MODEL_DID_NOT_REQUEST_TOOL_DISCOVERY',
   original_work_id:job,model_text:resultText(first),
   provider_requests:requests,original_job_completed:false});
  const loaded=await lateBoundAdapter.forToolSearch({
   searchCall:search,executionTime:now()});
  active=await ask({previous_response_id:first.id,input:[loaded]});
  searchDispatched=true;
 }
 const functionCall=single(active,'function_call');
 if(!functionCall)
  return Object.freeze({status:'MODEL_DID_NOT_CALL_GOVERNED_TOOL',
   original_work_id:job,model_text:resultText(active),
   tool_search_completed:searchDispatched,provider_requests:requests,
   original_job_completed:false});
 const executed=await lateBoundAdapter.dispatch({
  functionCall,executionTime:now(),providerResponseId:active.id
 });
 if(executed?.status!=='GOVERNED_TOOL_CALL_INDEPENDENTLY_VERIFIED'||
  executed.original_work_id!==job||
  executed.response_input?.call_id!==functionCall.call_id||
  executed.original_job_completed!==false)
  fail('DURABLE_SAME_JOB_TOOL_RESULT_UNVERIFIED');
 providerToolCalls++;
 // Same Responses conversation / response chain. Only the tool result is
 // returned; worker settlement and original-job continuation belong to
 // the separately trusted governed executor and independent receipt provider.
 const next=await ask({previous_response_id:active.id,
  input:[executed.response_input]});
 if(single(next,'function_call')||single(next,'tool_search_call'))
  return Object.freeze({status:'ADDITIONAL_MODEL_TOOL_WORK_REQUIRES_NEW_GOVERNED_CHECKPOINT',
   original_work_id:job,provider_requests:requests,
   independent_tool_receipt:executed.independent_receipt_ref,
   tool_calls_verified:providerToolCalls,
   original_job_completed:false,installation_authorized:false,
   production_changed:false});
 return Object.freeze({
  version:GOVERNED_TOOL_SESSION_VERSION,
  status:'VERIFIED_TOOL_RESULT_RETURNED_TO_SAME_MODEL_CONVERSATION',
  original_work_id:job,provider_requests:requests,
  tool_search_completed:searchDispatched,
  independent_tool_receipt:executed.independent_receipt_ref,
  tool_calls_verified:providerToolCalls,
  model_text:resultText(next),model_response_id:next.id,
  awaiting_original_job_independent_settlement:true,
  original_job_completed:false,installation_authorized:false,
  production_changed:false
 });
}
