// Reality late-bound tool delivery & internal execution proxy.
// No browser endpoint, dynamic eval, production write, installation grant or
// replacement agent. The adapter produces Responses tool-search output or
// additional_tools only after independently verified, signed, same-job scope.
// A fresh fenced claim plus independent output readback is still required for
// EVERY tool call. A tool_search notification is never an execution warrant.
import {createHash} from 'node:crypto';
import {planZeroTouchSameJobContinuation}
 from './reality-universal-governed-recovery-handoff-v1.js';

export const GOVERNED_DYNAMIC_TOOL_VERSION='reality-governed-late-bound-dynamic-tool-v1';
const fail=why=>{throw Error('DYNAMIC_TOOL_'+why)};
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/;
const FN=/^[a-z][a-z0-9_]{2,63}$/;
const CALL=/^call_[A-Za-z0-9_-]{3,160}$/;
const frozen=x=>{
 if(x&&typeof x==='object'){
  Object.values(x).forEach(frozen);Object.freeze(x);
 }
 return x;
};
const order=x=>x===null||typeof x!=='object'?x:
 Array.isArray(x)?x.map(order):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,order(x[k])]));
const hash=x=>createHash('sha256').update(JSON.stringify(order(x))).digest('hex');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function schemaCheck(schema){
 if(!schema||schema.type!=='object'||schema.additionalProperties!==false||
  !schema.properties||typeof schema.properties!=='object'||
  Array.isArray(schema.properties)||!Array.isArray(schema.required)||
  Object.keys(schema.properties).length>12||
  schema.required.length>12||
  new Set(schema.required).size!==schema.required.length)
  fail('SCHEMA_NOT_BOUNDED');
 const names=Object.keys(schema.properties);
 if(schema.required.length!==names.length||
  names.some(n=>!/^[a-z][a-z0-9_]{0,50}$/.test(n))||
  schema.required.some(n=>!names.includes(n))||
  names.some(n=>{
   const p=schema.properties[n];
   return !p||!['string','integer','number','boolean'].includes(p.type)||
    (p.type==='string'&&(p.maxLength!==undefined&&
     (!Number.isInteger(p.maxLength)||p.maxLength<1||p.maxLength>2048)))||
    (p.type!=='string'&&p.maxLength!==undefined)||
    Object.keys(p).some(k=>!['type','description','maxLength'].includes(k))||
    (p.description!==undefined&&
     (typeof p.description!=='string'||p.description.length>180));
  })||
  Object.keys(schema).some(k=>
   !['type','properties','required','additionalProperties'].includes(k)))
  fail('SCHEMA_UNSUPPORTED_OR_UNSAFE');
 return schema;
}
function validateArgs(raw,schema){
 if(typeof raw!=='string'||Buffer.byteLength(raw)>8192)
  fail('MODEL_ARGUMENTS_UNBOUNDED');
 let args;try{args=JSON.parse(raw)}catch{fail('MODEL_ARGUMENTS_JSON_INVALID')}
 if(!args||typeof args!=='object'||Array.isArray(args))fail('MODEL_ARGUMENTS_OBJECT_REQUIRED');
 const names=Object.keys(args);
 if(names.some(n=>!Object.hasOwn(schema.properties,n))||
  schema.required.some(n=>!Object.hasOwn(args,n)))
  fail('MODEL_ARGUMENTS_SCHEMA_MISMATCH');
 for(const name of names){
  const p=schema.properties[name],v=args[name];
  const good=p.type==='string'?typeof v==='string'&&
    v.length<=(p.maxLength??2048):
   p.type==='integer'?Number.isSafeInteger(v):
   p.type==='number'?finite(v):typeof v==='boolean';
  if(!good)fail('MODEL_ARGUMENTS_SCHEMA_MISMATCH');
 }
 return frozen(args);
}
function safeOutput(output){
 if(!output||typeof output!=='object'||Array.isArray(output)||
  output.original_job_completed!==false||
  output.installation_authorized!==false||
  output.production_changed!==false||
  output.provider_effect_may_have_occurred!==false||
  output.external_action_performed!==false||
  output.verified!==true||typeof output.result!=='object'||
  output.result===null||Array.isArray(output.result)||
  Buffer.byteLength(JSON.stringify(output.result))>8192)
  fail('INDEPENDENT_SANDBOX_OUTPUT_UNVERIFIED');
 return frozen(output);
}

// Only a trusted service can construct this factory. The callbacks must
// resolve the current owner/goal/ledger/lease from authoritative sources;
// they cannot be user, model, issue-text or browser-supplied objects.
export function createGovernedLateBoundToolAdapter({
 envelope,signingKey,readCurrentScope,readCheckpoint,
 brokerResult,installedReadback=null,
 tool,executeSandbox,independentVerifier,
 acquireFencedClaim,recordAndReadback
}={}){
 if(typeof readCurrentScope!=='function'||typeof readCheckpoint!=='function'||
  typeof executeSandbox!=='function'||typeof independentVerifier!=='function'||
  typeof acquireFencedClaim!=='function'||typeof recordAndReadback!=='function'||
  !tool||!FN.test(tool.name||'')||
  typeof tool.description!=='string'||tool.description.length>240||
  !HASH.test(tool.schema_sha256||'')||
  !WORK.test(envelope?.body?.scope?.original_work_id||''))
  fail('TRUSTED_INTERNAL_ADAPTERS_REQUIRED');
 const schema=schemaCheck(tool.parameters);
 if(hash(schema)!==tool.schema_sha256)
  fail('SCHEMA_CONTENT_HASH_MISMATCH');
 const definition=frozen({
  type:'function',name:tool.name,description:tool.description,
  strict:true,parameters:structuredClone(schema)
 });
 const job=envelope.body.scope.original_work_id;
 async function ready(at){
  const [scope,checkpoint]=await Promise.all([readCurrentScope(),readCheckpoint()]);
  const plan=planZeroTouchSameJobContinuation({
   envelope,signingKey,currentScope:scope,executionTime:at,
   brokerResult,checkpointReadback:checkpoint,installedReadback
  });
  if(plan.original_work_id!==job||
   plan.verified_tool_manifest.capability_id!==tool.capability_id||
   plan.verified_tool_manifest.schema_sha256!==tool.schema_sha256||
   plan.tool_scope!=='EPHEMERAL_ORIGINAL_JOB_ONLY')
   fail('VERIFIED_TOOL_NOT_BOUND_TO_SAME_JOB');
  return plan;
 }
 async function describe({executionTime}={}){
  const plan=await ready(executionTime);
  return frozen({status:'LATE_BOUND_TOOL_AVAILABLE_AT_MODEL_BOUNDARY',
   original_work_id:job,continuity_preserved:true,
   provider_request_already_in_progress_modified:false,
   additional_tools:{
    type:'additional_tools',role:'developer',tools:[structuredClone(definition)]
   },
   tool_name:definition.name,tool_schema_sha256:tool.schema_sha256,
   original_job_completed:false,production_changed:false,
   permit_on_next_model_continuation:true,
   continuation_checkpoint_sha256:plan.checkpoint_sha256});
 }
 async function forToolSearch({searchCall,executionTime}={}){
  if(searchCall?.type!=='tool_search_call'||
   searchCall.execution!=='client'||!CALL.test(searchCall.call_id||'')||
   searchCall.status!=='completed')
   fail('TRUSTED_PROVIDER_SEARCH_CALL_REQUIRED');
  await ready(executionTime);
  return frozen({type:'tool_search_output',execution:'client',
   call_id:searchCall.call_id,status:'completed',
   tools:[{...structuredClone(definition),defer_loading:true}]});
 }
 async function dispatch({
  functionCall,executionTime,providerResponseId
 }={}){
  if(functionCall?.type!=='function_call'||
   functionCall.name!==definition.name||
   !CALL.test(functionCall.call_id||'')||
   typeof providerResponseId!=='string'||
   !/^resp_[A-Za-z0-9_-]{5,150}$/.test(providerResponseId))
   fail('TRUSTED_MODEL_FUNCTION_CALL_REQUIRED');
  const args=validateArgs(functionCall.arguments,schema);
  const plan=await ready(executionTime);
  // Database/global single-use lease with provider readback, not an
  // in-memory lock. The idempotency key ties provider call to original work.
  const executionIdentity=hash({
   original_work_id:job,provider_response_id:providerResponseId,
   call_id:functionCall.call_id,tool_schema_sha256:tool.schema_sha256,
   checkpoint:plan.checkpoint_sha256,args
  });
  const claim=await acquireFencedClaim(frozen({
   original_work_id:job,owner_id:plan.owner_id,goal_id:plan.goal_id,
   call_id:functionCall.call_id,provider_response_id:providerResponseId,
   tool_schema_sha256:tool.schema_sha256,
   execution_identity_sha256:executionIdentity,
   original_authority_unchanged:true
  }));
  if(claim?.status!=='EXACT_TOOL_CALL_FENCED_CLAIMED'||
   claim.original_work_id!==job||
   claim.execution_identity_sha256!==executionIdentity||
   !HASH.test(claim.claim_sha256||'')||
   claim.provider_effect_may_have_occurred!==false||
   claim.installation_authorized!==false||
   claim.production_changed!==false)
   fail('GLOBAL_ATOMIC_FENCED_CLAIM_REQUIRED');
  // Run only an already registered isolated adapter. NEVER evaluate model
  // code here or dynamically create public /tools routes from model text.
  let observed;
  try{
   observed=await executeSandbox(frozen({
    original_work_id:job,tool_name:tool.name,
    tool_schema_sha256:tool.schema_sha256,args,
    claim_sha256:claim.claim_sha256,
    execution_identity_sha256:executionIdentity,
    isolated:true,allow_network:false,allow_secrets:false,
    production_write_permitted:false
   }));
  }catch{
   // Uncertain effects stop this call. No blind automatic retry.
   fail('SANDBOX_EFFECT_UNKNOWN_RECONCILIATION_REQUIRED');
  }
  const checked=safeOutput(await independentVerifier(frozen({
   original_work_id:job,tool_schema_sha256:tool.schema_sha256,
   execution_identity_sha256:executionIdentity,
   claim_sha256:claim.claim_sha256,observed
  })));
  const receipt=await recordAndReadback(frozen({
   original_work_id:job,execution_identity_sha256:executionIdentity,
   claim_sha256:claim.claim_sha256,verified_result_hash:hash(checked.result),
   same_job:true,installation_authorized:false
  }));
  if(receipt?.independently_verified!==true||
   receipt.original_work_id!==job||
   receipt.execution_identity_sha256!==executionIdentity||
   receipt.verified_result_hash!==hash(checked.result)||
   receipt.claim_sha256!==claim.claim_sha256||
   receipt.production_changed!==false||
   receipt.installation_authorized!==false)
   fail('DURABLE_TOOL_OUTPUT_RECEIPT_UNVERIFIED');
  return frozen({
   status:'GOVERNED_TOOL_CALL_INDEPENDENTLY_VERIFIED',
   original_work_id:job,execution_identity_sha256:executionIdentity,
   independent_receipt_ref:receipt.receipt_ref??null,
   response_input:{
    type:'function_call_output',call_id:functionCall.call_id,
    output:JSON.stringify({ok:true,result:checked.result,
     independent_receipt_ref:receipt.receipt_ref??null})
   },
   original_job_completed:false,production_changed:false
  });
 }
 return Object.freeze({version:GOVERNED_DYNAMIC_TOOL_VERSION,
  describe,forToolSearch,dispatch});
}
