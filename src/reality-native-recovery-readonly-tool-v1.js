// Trusted, read-only proof of a REAL native original obtaining a Reality tool.
// A model function_call is NOT an execution warrant, code repair, installation,
// capability invention, full Continuity session, or customer-job settlement.
// Service-role atomic DB claim limits provider spending and uncertain retries.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {assertRealityUnifiedShiftGraph}
 from './reality-shift-unified-execution-controller-v1.js';

export const NATIVE_READONLY_RECOVERY_TOOL_VERSION=
 'reality-native-original-readonly-model-tool-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9-]{36}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const RESPONSE=/^resp_[a-zA-Z0-9_-]{5,150}$/;
const CALL=/^call_[a-zA-Z0-9_-]{4,150}$/;
const SOURCE='https://github.com/maloney2323/Reality/issues/263';
const TOOL='reality_read_current_original_evidence';
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const deny=x=>{throw Error('NATIVE_READONLY_RECOVERY_TOOL_'+x)};
const safe=(status,more={})=>Object.freeze({
 version:NATIVE_READONLY_RECOVERY_TOOL_VERSION,status,
 installation_authorized:false,original_job_completed:false,
 independent_final_receipt:false,production_changed:false,...more
});
const permittedModel=x=>/^(?:gpt-6|gpt-5\.[4-9])(?:[._-].*)?$/i.test(x||'');
function nativeFromGraph(graph,claimed=null){
 const g=assertRealityUnifiedShiftGraph(graph);
 if(g.status!=='UNIFIED_OWNER_JOB_CONTROL_READY')deny('NO_CURRENT_OWNER_GRAPH');
 const jobs=g.jobs.filter(x=>x.source_ref===SOURCE&&
  x.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
  x.phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL');
 if(jobs.length!==1||!WORK.test(jobs[0].original_work_id||'')||
    jobs[0].independent_source_proof_verified!==true||
    !SHA.test(jobs[0].source_proof_sha256||'')||
    g.installation_authorized!==false||g.production_changed!==false)
  deny('CURRENT_TESTED_ORIGINAL_SCOPE_REQUIRED');
 const j=jobs[0];
 if(claimed&&(g.shift_id!==claimed.shift_id||
   g.owner_id!==claimed.owner_id||
   g.plan_fingerprint!==claimed.plan_fingerprint||
   j.original_work_id!==claimed.original_work_id||
   j.source_proof_sha256!==claimed.source_proof_sha256))
  deny('SHIFT_OR_ORIGINAL_SOURCE_DRIFT');
 return {shift_id:g.shift_id,owner_id:g.owner_id,
  plan_fingerprint:g.plan_fingerprint,
  original_work_id:j.original_work_id,source_ref:j.source_ref,
  source_proof_sha256:j.source_proof_sha256,
  phase:j.phase,independent_source_proof_verified:true};
}
function parseResponse(r){
 if(!r||!RESPONSE.test(r.id||'')||
   r.status!=='completed'||!Array.isArray(r.output)||
   r.output.length>12)
  deny('OPENAI_RESPONSE_SHAPE_UNVERIFIED');
 return r;
}
async function ask(fetchImpl,apiKey,payload){
 let reply;
 try{
  reply=await fetchImpl('https://api.openai.com/v1/responses',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(12000),
   headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},
   body:JSON.stringify(payload)
  });
 }catch{deny('OPENAI_PROVIDER_OR_TIMEOUT_UNVERIFIED')}
 if(!reply?.ok){
  const code=Number(reply?.status);
  deny(code===401||code===403?'OPENAI_CREDENTIAL_OR_MODEL_REJECTED':
   code===429?'OPENAI_RATE_OR_QUOTA_REJECTED':
   code===400||code===404||code===422?'OPENAI_MODEL_TOOL_REQUEST_REJECTED':
   'OPENAI_PROVIDER_UNAVAILABLE');
 }
 let data;try{data=await reply.json()}catch{deny('OPENAI_JSON_UNAVAILABLE')}
 return parseResponse(data);
}
export async function proveNativeOriginalReadOnlyModelTool({
 db,env=process.env,fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    typeof callRpc!=='function'||typeof fetchImpl!=='function')
  deny('ISOLATED_SERVICE_OWNER_BOUNDARY_REQUIRED');
 const model=String(env.REALITY_OPENAI_MODEL||'');
 const apiKey=String(env.REALITY_STANDALONE_OPENAI_API_KEY||'');
 if(!permittedModel(model)||apiKey.length<20)
  return safe('NATIVE_TOOL_MODEL_OR_KEY_NOT_CONFIGURED');
 let claim;
 try{
  claim=await callRpc(db,'reality_claim_current_native_readonly_tool_v1',{},
   {fetchImpl});
 }catch(e){
  return safe('NATIVE_TOOL_ATOMIC_CLAIM_UNAVAILABLE');
 }
 if(claim?.status!=='NATIVE_READONLY_TOOL_ATTEMPT_FENCED')
  return safe(/^[A-Z0-9_]{5,100}$/.test(claim?.status||'')?
   claim.status:'NATIVE_TOOL_CLAIM_RESULT_UNVERIFIED');
 if(!UUID.test(claim.claim_id||'')||
  !WORK.test(claim.original_work_id||'')||
  !SHA.test(claim.source_proof_sha256||'')||
  claim.source_ref!==SOURCE||
  claim.installation_authorized!==false||
  claim.original_job_completed!==false||
  claim.production_changed!==false)
  deny('SERVICE_CLAIM_SCOPE_UNVERIFIED');
 const verify=async()=>{
  const latest=await callRpc(db,'reality_read_current_shift_execution_graph_v1',{},
   {fetchImpl});
  return nativeFromGraph(latest,claim);
 };
 let firstId=null,callId=null,lastId=null,toolHash=null;
 let error='OPENAI_PROVIDER_OR_SCOPE_UNVERIFIED',phase='MODEL_PROVIDER_RETRYABLE';
 try{
  const before=await verify();
  const first=await ask(fetchImpl,apiKey,{
   model,parallel_tool_calls:false,max_output_tokens:400,
   tool_choice:{type:'function',name:TOOL},
   tools:[{type:'function',name:TOOL,
    description:'Read the current owner-authorized native original source and tested candidate status. Read-only; no installation or new work.',
    strict:true,parameters:{type:'object',properties:{},
     additionalProperties:false,required:[]}}],
   input:[{role:'system',content:
    'You are Reality diagnosing one already-authorized engineering original. '+
    'You must call the supplied read-only Reality tool to inspect exact service-role work evidence. '+
    'Never treat model text as authority, installation or independent settlement.'},
    {role:'user',content:
    'Use the Reality tool for the same native original. Current work id: '+
    before.original_work_id+'; source: '+SOURCE+
    '. Identify remaining installation/continuation gates after the tool output.'}]
  });
  firstId=first.id;
  const calls=first.output.filter(x=>x.type==='function_call');
  if(calls.length!==1||calls[0].name!==TOOL||
    !CALL.test(calls[0].call_id||'')||
    calls[0].arguments!=='{}'||
    first.output.some(x=>x.type==='tool_search_call'))
   deny('MODEL_DID_NOT_CALL_EXACT_READ_ONLY_TOOL');
  callId=calls[0].call_id;
  const after=await verify();
  const toolEvidence={...after,
   status:'INDEPENDENT_CURRENT_SERVICE_READBACK_FOR_MODEL',
   read_only:true,tool_scope:'SOURCE_AND_TESTED_CANDIDATE_ONLY',
   same_original_job:true,installation_authorized:false,
   original_job_completed:false,independent_final_receipt:false,
   permission_to_install:false,production_changed:false,
   next_gate:'EXACT_OWNER_APPROVAL_AND_ISOLATED_INSTALL_RESUME_NOT_YET_PROVEN'};
  const output=JSON.stringify(toolEvidence);
  toolHash=sha(output);
  const finish=await ask(fetchImpl,apiKey,{
   model,parallel_tool_calls:false,max_output_tokens:500,
   previous_response_id:first.id,
   input:[{type:'function_call_output',call_id:callId,output}]
  });
  lastId=finish.id;
  if(lastId===firstId||finish.output.some(x=>
    x.type==='function_call'||x.type==='tool_search_call'))
   deny('MODEL_FOLLOWUP_TOOL_SCOPE_OR_ID_UNVERIFIED');
  // An actual response chain plus a freshly verified server-side readback
  // is stronger than a guessed capability diagnosis, but NOT original
  // execution or final settlement.
  await verify();
  phase='MODEL_TOOL_READBACK_VERIFIED';error=null;
 }catch(e){
  const s=String(e?.message||'');
  error=/^NATIVE_READONLY_RECOVERY_TOOL_[A-Z0-9_]{5,90}$/.test(s)?
   s.slice('NATIVE_READONLY_RECOVERY_TOOL_'.length):
   'READ_ONLY_MODEL_OR_SERVICE_UNVERIFIED';
  if(error==='SHIFT_OR_ORIGINAL_SOURCE_DRIFT'||
     error==='CURRENT_TESTED_ORIGINAL_SCOPE_REQUIRED'||
     error==='NO_CURRENT_OWNER_GRAPH')
   phase='CURRENT_SCOPE_DRIFT_BLOCKED';
 }
 let receipt;
 try{
  receipt=await callRpc(db,'reality_finish_current_native_readonly_tool_v1',{
   p_original_work_id:claim.original_work_id,p_claim_id:claim.claim_id,
   p_state:phase,p_first_response_id:firstId,
   p_function_call_id:callId,p_final_response_id:lastId,
   p_tool_readback_sha256:toolHash,p_error_code:error
  },{fetchImpl});
 }catch{
  return safe('NATIVE_TOOL_DURABLE_FINAL_READBACK_UNAVAILABLE',
   {original_work_id:claim.original_work_id});
 }
 if(phase==='MODEL_TOOL_READBACK_VERIFIED'&&
   receipt?.status==='NATIVE_READONLY_MODEL_TOOL_RESPONSE_RECORDED'&&
   receipt.original_work_id===claim.original_work_id&&
   receipt.shift_id===claim.shift_id&&
   receipt.model_tool_readback_verified===true&&
   receipt.installation_authorized===false&&
   receipt.original_job_completed===false&&
   receipt.production_changed===false)
  return safe('NATIVE_GOVERNED_MODEL_USED_READ_ONLY_TOOL',
   {shift_id:claim.shift_id,original_work_id:claim.original_work_id,
    real_model_tool_call_verified:true,
    current_source_readback_sha256:toolHash,
    provider_first_response_id:firstId,provider_final_response_id:lastId,
    native_install_to_settlement_verified:false});
 return safe('NATIVE_TOOL_CALL_NOT_INDEPENDENTLY_VERIFIED',
  {original_work_id:claim.original_work_id,
   model_tool_failure_reason:error,
   native_install_to_settlement_verified:false});
}
