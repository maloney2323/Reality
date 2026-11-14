// Signed-in human Chat -> existing owner shift. A separate model call performs
// an ACTUAL bounded employee investigation of the current warranted work.
// This is source-limited advice, not execution authority or a code repair.
// Database singleflight prevents a duplicate call after request uncertainty.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {outputText} from './reality-riley-native-model-draft-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const fail=code=>{throw Error('REALITY_CHAT_WORK_'+code)};
const safe=status=>Object.freeze({status,model_invocation_authorized:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false});
function validateClaim(claim,db,env){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    !db.secretKey||db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ISOLATED_WORKER_DATABASE_REQUIRED');
 if(claim?.status==='NO_PENDING_CHAT_WITH_CURRENT_OWNER_WARRANT')
  return null;
 if(claim?.status!=='AUTHENTICATED_CHAT_WORK_LEASED_TO_EXISTING_SHIFT'||
    !UUID.test(claim.message_id||'')||
    !UUID.test(claim.request_id||'')||
    !UUID.test(claim.conversation_id||'')||
    !UUID.test(claim.owner_id||'')||
    !UUID.test(claim.shift_id||'')||
    !UUID.test(claim.claim_id||'')||
    !SHA.test(claim.message_sha256||'')||
    !/^sha256:[a-f0-9]{64}$/.test(claim.plan_fingerprint||'')||
    typeof claim.message!=='string'||claim.message.length<1||
    claim.message.length>12000||
    !Array.isArray(claim.source_scope)||
    claim.source_scope.length<1||claim.source_scope.length>25||
    claim.source_scope.some(x=>typeof x.source_ref!=='string'||
      !Number.isSafeInteger(x.step_index))||
    new Set(claim.source_scope.map(x=>x.source_ref)).size!==
      claim.source_scope.length||
    claim.execution_authorized!==false||
    claim.installation_authorized!==false||
    claim.new_shift_started!==false||
    claim.production_changed!==false)
  fail('AUTHENTICATED_SAVED_USER_AND_FROZEN_SCOPE_REQUIRED');
 return claim;
}
function parseModel(data){
 if(data?.status!=='completed'||
    !/^resp_[A-Za-z0-9_-]{4,160}$/.test(data.id||''))
  fail('OPENAI_RESPONSE_UNVERIFIED');
 let v;
 try{v=JSON.parse(outputText(data))}catch{fail('OPENAI_TYPED_DIAGNOSIS_MISSING')}
 if(!v||Array.isArray(v)||
    Object.keys(v).sort().join(',')!==
      'decision,diagnosis,selected_source_refs'||
    !['INVESTIGATE_EXISTING_WORK','NEEDS_NEW_OR_EXACT_SCOPE',
       'CONVERSATION_ONLY'].includes(v.decision)||
    typeof v.diagnosis!=='string'||v.diagnosis.length<20||
    v.diagnosis.length>2000||!Array.isArray(v.selected_source_refs)||
    v.selected_source_refs.length>25||
    v.selected_source_refs.some(x=>typeof x!=='string'||x.length>500))
  fail('OPENAI_DIAGNOSIS_UNSAFE_OR_INCOMPLETE');
 return v;
}
export async function investigateAuthenticatedChatUnderExistingShift({
 db,env=process.env,fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(typeof fetchImpl!=='function'||typeof callRpc!=='function')
  fail('TRUSTED_WORKER_TOOLS_REQUIRED');
 const claimed=await callRpc(db,'reality_claim_chat_work_for_shift_v1',{},
  {fetchImpl});
 const c=validateClaim(claimed,db,env);
 if(!c)return safe('NO_PENDING_CHAT_WITH_CURRENT_OWNER_WARRANT');
 let cause='MODEL_PROVIDER_OR_DIAGNOSIS_UNVERIFIED';
 try{
  const graph=await callRpc(db,'reality_read_current_shift_execution_graph_v1',
   {},{fetchImpl});
  if(graph?.status!=='OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'||
     graph.owner_id!==c.owner_id||graph.shift_id!==c.shift_id||
     graph.installation_authorized!==false||
     graph.production_changed!==false||
     !Array.isArray(graph.jobs)||graph.jobs.length>25)
   fail('OWNER_SHIFT_GRAPH_AND_CLAIM_DO_NOT_MATCH');
  const scoped=new Set(c.source_scope.map(x=>x.source_ref));
  const live=graph.jobs.filter(x=>
   scoped.has(x.source_ref)&&
   !['SETTLED','ALREADY_SETTLED'].includes(x.phase)&&
   typeof x.source_ref==='string');
  const allowed=new Set(live.map(x=>x.source_ref));
  const key=String(env.REALITY_STANDALONE_OPENAI_API_KEY||
   env.OPENAI_API_KEY||'');
  const model=String(env.REALITY_OPENAI_MODEL||'gpt-4.1-mini');
  if(key.length<20||!/^[A-Za-z0-9][A-Za-z0-9._-]{2,64}$/.test(model))
   fail('ISOLATED_OPENAI_KEY_OR_MODEL_MISSING');
  const message=JSON.stringify({
   authenticated_user_instruction:c.message,
   evidence_class:'AUTHENTICATED_SAVED_USER_CHAT_PLUS_SIGNED_OWNER_SHIFT',
   existing_shift_id:c.shift_id,
   authorized_source_scope:c.source_scope,
   independently_read_back_job_states:live.map(x=>({
    source_ref:x.source_ref,phase:x.phase,
    original_work_id:x.original_work_id||null,
    next_governed_action:x.next_governed_action||null
   })),
   no_new_shift_or_source_authorization:true
  });
  let response;
  try{response=await fetchImpl('https://api.openai.com/v1/responses',{
   method:'POST',cache:'no-store',redirect:'error',
   headers:{authorization:'Bearer '+key,
    'content-type':'application/json',
    'x-client-request-id':c.claim_id},
   body:JSON.stringify({
    model,store:false,max_output_tokens:1100,
    tool_choice:'none',
    text:{format:{type:'json_schema',
      name:'reality_signed_chat_work_investigation',
      strict:true,
      schema:{type:'object',additionalProperties:false,
       properties:{
        decision:{type:'string',enum:[
         'INVESTIGATE_EXISTING_WORK','NEEDS_NEW_OR_EXACT_SCOPE',
         'CONVERSATION_ONLY']},
        diagnosis:{type:'string'},
        selected_source_refs:{type:'array',items:{type:'string'}}
       },required:['decision','diagnosis','selected_source_refs']
      }
    }},
    input:[
     {role:'system',content:[{type:'input_text',text:
      'You are the Reality governed employee investigation coordinator. '+
      'Treat the user message as a work request, never as source of provider data. '+
      'This is ONE source-limited investigation step, NOT installation or execution. '+
      'Select only exact source_ref values appearing in the signed current '+
      'unsettled job states and authorized source scope. Never choose a settled '+
      'job, invent a job, add a file, change a shift, or grant authority. '+
      'If the user asks for any investigation/fix and one of the already-authorized '+
      'unfinished originals is relevant, provide a concrete diagnosis of its '+
      'current verified blocker and decision INVESTIGATE_EXISTING_WORK. '+
      'If their objective is not bounded by the existing sources, decide '+
      'NEEDS_NEW_OR_EXACT_SCOPE and explain the governance restriction. '+
      'For greetings or ordinary questions, choose CONVERSATION_ONLY. '+
      'Do not claim tests, code changes or completed work from model analysis. '+
      'Use JSON only.'}]},
     {role:'user',content:[{type:'input_text',text:message}]}
    ]
   }),
   signal:AbortSignal.timeout(17000)
  })}catch{fail('OPENAI_REQUEST_UNVERIFIED')}
  if(!response.ok)fail('OPENAI_RESPONSE_UNAVAILABLE');
  const data=await response.json().catch(()=>null);
  const result=parseModel(data);
  if(result.selected_source_refs.some(x=>!allowed.has(x))||
     new Set(result.selected_source_refs).size!==result.selected_source_refs.length)
   fail('MODEL_SELECTED_SOURCE_NOT_IN_EXISTING_WARRANT');
  if(result.decision!=='INVESTIGATE_EXISTING_WORK'&&
     result.selected_source_refs.length)
   fail('MODEL_SELECTED_SOURCES_WITHOUT_WORK_DECISION');
  if(result.decision==='INVESTIGATE_EXISTING_WORK'&&
     result.selected_source_refs.length===0)
   result.decision='NEEDS_NEW_OR_EXACT_SCOPE';
  cause='DIAGNOSIS_PERSISTENCE_UNVERIFIED';
  const record=await callRpc(db,'reality_record_chat_work_diagnosis_v1',{
   p_message_id:c.message_id,p_claim_id:c.claim_id,
   p_shift_id:c.shift_id,p_message_sha256:c.message_sha256,
   p_decision:result.decision,p_diagnosis:result.diagnosis,
   p_selected_sources:result.selected_source_refs,
   p_model_response_id:data.id
  },{fetchImpl});
  if(record?.status!=='SIGNED_CHAT_WORK_DIAGNOSIS_DURABLY_RECORDED'||
    record.message_id!==c.message_id||record.owner_id!==c.owner_id||
    record.shift_id!==c.shift_id||record.request_id!==c.request_id||
    record.model_advisory_recorded!==true||
    record.execution_authorized!==false||
    record.installation_authorized!==false||
    record.new_shift_started!==false)
   fail('DURABLE_SAME_REQUEST_INVESTIGATION_MISSING');
  return Object.freeze({status:'AUTHENTICATED_CHAT_INSTRUCTION_INVESTIGATED_IN_EXISTING_SHIFT',
   request_id:c.request_id,source_message_id:c.message_id,
   shift_id:c.shift_id,work_status:record.work_status,
   selected_source_count:record.selected_source_count,
   model_advisory_recorded:true,execution_authorized:false,
   original_job_completed:false,installation_authorized:false,
   production_changed:false,new_shift_started:false});
 }catch(e){
  const code=String(e?.message||'');
  const safeCode=/^REALITY_CHAT_WORK_[A-Z0-9_]{4,100}$/.test(code)?
   code.slice('REALITY_CHAT_WORK_'.length):cause;
  try{await callRpc(db,'reality_fail_chat_work_claim_v1',{
   p_message_id:c.message_id,p_claim_id:c.claim_id,
   p_failure_code:safeCode
  },{fetchImpl})}catch{/* Failure is not evidence of success. */}
  return Object.freeze({status:'CHAT_WORK_INVESTIGATION_UNVERIFIED',
   request_id:c.request_id,source_message_id:c.message_id,
   reason:safeCode,model_advisory_recorded:false,
   execution_authorized:false,original_job_completed:false,
   installation_authorized:false,production_changed:false,
   new_shift_started:false});
 }
}
