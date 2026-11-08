// Reality employee Riley: one real, owner-warranted model code draft for #263.
// Uses the shared OpenAI intelligence dependency, not an independent agent.
// This NEVER executes generated code, installs a capability, writes to GitHub,
// changes production, claims a new original, or issues a settlement receipt.
// Identity and duplicate prevention are enforced by service-role database RPCs.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';

const BASE='https://api.github.com/repos/maloney2323/Reality';
const TARGET='src/reality-riley-service-original-runtime-v1.js';
const ISSUE_URL='https://github.com/maloney2323/Reality/issues/263';
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const fail=x=>{throw Error('RILEY_NATIVE_MODEL_'+x)};
const sha256=buf=>'sha256:'+createHash('sha256').update(buf).digest('hex');
const blobSha=buf=>createHash('sha1').update('blob '+buf.length+'\0')
 .update(buf).digest('hex');
function outputText(response){
 return typeof response?.output_text==='string'?response.output_text:
  (response?.output||[]).flatMap(p=>p?.content||[])
   .filter(p=>p?.type==='output_text'&&typeof p.text==='string')
   .map(p=>p.text).join('\n');
}
function validateCandidate(output,source){
 let patch;
 try{patch=JSON.parse(output)}catch{fail('MODEL_JSON_NOT_VALID')}
 if(!patch||Array.isArray(patch)||
    Object.keys(patch).sort().join(',')!=='find,reason,replace'||
    typeof patch.find!=='string'||typeof patch.replace!=='string'||
    typeof patch.reason!=='string'||
    patch.find.length<20||patch.find.length>12000||
    patch.replace.length>16000||patch.replace===patch.find||
    patch.reason.length<8||patch.reason.length>1500)
  fail('MODEL_CODE_CHANGE_NOT_BOUNDED');
 const pos=source.indexOf(patch.find);
 if(pos<0||source.indexOf(patch.find,pos+1)>=0)
  fail('MODEL_EXACT_SOURCE_BLOCK_UNVERIFIED');
 const proposed=source.slice(0,pos)+patch.replace+
  source.slice(pos+patch.find.length);
 if(proposed.length>75000||proposed===source)
  fail('MODEL_PROPOSED_SOURCE_INVALID');
 // The only permitted model effect is to propose a source edit in a private
 // record. No model output is a command, authorization, or independent test.
 return Object.freeze({patch,proposed});
}
async function sourceFromGitHub({commit,fetchImpl}){
 const url=BASE+'/contents/'+TARGET+'?ref='+commit;
 let reply;
 try{reply=await fetchImpl(url,{
  method:'GET',cache:'no-store',redirect:'error',
  headers:{accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Owner-Scoped-Native-Repair-Source-v1'},
  signal:AbortSignal.timeout(10000)
 })}catch{fail('EXACT_GITHUB_SOURCE_UNAVAILABLE')}
 if(!reply?.ok)fail('EXACT_GITHUB_SOURCE_UNVERIFIED');
 const value=await reply.json().catch(()=>null);
 if(value?.path!==TARGET||value.encoding!=='base64'||
    typeof value.content!=='string'||!SHA.test(value.sha||'')||
    !Number.isSafeInteger(value.size)||value.size<400||
    value.size>55000)
  fail('EXACT_GIT_SOURCE_META_INVALID');
 const bytes=Buffer.from(value.content.replace(/\s/g,''),'base64');
 if(bytes.length!==value.size||blobSha(bytes)!==value.sha)
  fail('EXACT_GIT_SOURCE_BLOB_INVALID');
 return Object.freeze({text:bytes.toString('utf8'),blob:value.sha,
  file_hash:sha256(bytes)});
}
function expectedGraph(graph){
 const native=graph?.jobs?.filter(x=>
  x.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
  x.source_ref===ISSUE_URL&&x.phase==='SOURCE_ADMITTED'&&
  x.independent_source_proof_verified===true);
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    !UUID.test(graph.shift_id||'')||
    !UUID.test(graph.owner_id||'')||
    !Array.isArray(native)||native.length!==1||
    !WORK.test(native[0].original_work_id||'')||
    graph.engineering_ready!==true||
    graph.installation_authorized!==false||
    graph.production_changed!==false)
  fail('CURRENT_OWNER_REPAIR_GRAPH_REQUIRED');
 return native[0];
}
export async function draftCurrentRileyNativeRepair({
 db,graph,env=process.env,fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||
    !db?.strictSecrets||db.project!==
      env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    typeof callRpc!=='function'||typeof fetchImpl!=='function')
  fail('OWNER_SERVICE_PREVIEW_REQUIRED');
 const original=expectedGraph(graph);
 const commit=String(env.VERCEL_GIT_COMMIT_SHA||'');
 const apiKey=String(env.REALITY_STANDALONE_OPENAI_API_KEY||
  env.OPENAI_API_KEY||'');
 const model=String(env.REALITY_OPENAI_MODEL||'');
 if(!SHA.test(commit)||apiKey.length<20||
    !/^[a-z0-9][a-z0-9._-]{3,64}$/i.test(model))
  return Object.freeze({status:'NATIVE_MODEL_PREVIEW_PROVIDER_CONFIG_UNVERIFIED',
   original_work_id:original.original_work_id,
   installation_authorized:false,original_job_completed:false,
   production_changed:false});
 // One native original receives at most ONE provider request until
 // independently reconciled, even across retries and worker processes.
 const claim=await callRpc(db,
  'reality_claim_current_riley_native_model_draft_v1',{
   p_shift_id:graph.shift_id,
   p_original_work_id:original.original_work_id
  },{fetchImpl});
 if(claim?.status==='EXISTING_NATIVE_MODEL_ATTEMPT_NO_REPLAY'&&
    claim.original_work_id===original.original_work_id&&
    claim.shift_id===graph.shift_id&&
    claim.model_invocation_authorized===false)
  return Object.freeze({...claim});
 if(claim?.status!=='NATIVE_ORIGINAL_MODEL_DRAFT_LEASED'||
    claim.original_work_id!==original.original_work_id||
    claim.shift_id!==graph.shift_id||
    claim.owner_id!==graph.owner_id||
    claim.source_ref!==ISSUE_URL||
    claim.source_proof_sha256!==original.source_proof_sha256||
    claim.model_invocation_authorized!==true||
    !UUID.test(claim.request_id||'')||
    claim.installation_authorized!==false||
    claim.original_job_completed!==false)
  fail('ATOMIC_MODEL_LEASE_UNVERIFIED');
 let reason='MODEL_PROVIDER_UNVERIFIED';
 try{
  const source=await sourceFromGitHub({commit,fetchImpl});
  let reply;
  try{reply=await fetchImpl('https://api.openai.com/v1/responses',{
   method:'POST',cache:'no-store',redirect:'error',
   headers:{authorization:'Bearer '+apiKey,
    'content-type':'application/json',
    'x-client-request-id':claim.request_id},
   body:JSON.stringify({
    model,store:false,max_output_tokens:6000,
    text:{format:{
     type:'json_schema',name:'reality_riley_native_source_patch',
     strict:true,
     schema:{
      type:'object',additionalProperties:false,
      properties:{
       find:{type:'string',description:'Exact original contiguous source text copied verbatim.'},
       replace:{type:'string',description:'Replacement source code for that exact single block.'},
       reason:{type:'string',description:'What observed failure this code change addresses.'}
      },required:['find','replace','reason']
     }
    }},
    input:[
     {role:'system',content:[{type:'input_text',text:
      'You are Riley, one software-engineering ROLE in the governed Reality employee shift. '+
      'You have NO authority to install, run code, create a new job or change production. '+
      'Review the current real source file and the original issue #263. '+
      'Propose ONE minimal existing-file edit, strictly JSON with exact keys find,replace,reason. '+
      'find must be a copied verbatim continuous source block occurring once. '+
      'replace must be a safe changed source block. '+
      'Address the missing bridge between an already owner-authorized Riley-native original '+
      'and Reality governed code generation, tests and same-job resumption WITHOUT bypassing '+
      'the Universe-based executor for native jobs, manufacturing a Universe event, '+
      'granting model authority or declaring tests passed. '+
      'Do not remove existing security checks. If uncertain, produce no invented test results.'}]},
     {role:'user',content:[{type:'input_text',text:
      'Frozen owner job: '+original.original_work_id+
      '\nIssue: '+ISSUE_URL+
      '\nRead-only source path: '+TARGET+
      '\nCurrent source at isolated commit '+commit+':\n'+source.text+
      '\nReturn only the JSON source edit; do not claim execution or approval.'}]}
    ]
   }),signal:AbortSignal.timeout(23000)
  })}catch{fail('OPENAI_PROVIDER_UNVERIFIED')}
  if(!reply?.ok)fail('OPENAI_PROVIDER_UNVERIFIED');
  let data;try{data=await reply.json()}catch{fail('OPENAI_RESULT_UNVERIFIED')}
  if(data?.status!=='completed'||!/^resp_[A-Za-z0-9_-]{4,160}$/.test(data.id||''))
   fail('OPENAI_RESPONSE_NOT_COMPLETED');
  reason='MODEL_OUTPUT_UNSAFE_OR_INVALID';
  const edited=validateCandidate(outputText(data),source.text);
  const proposedHash=sha256(Buffer.from(edited.proposed,'utf8'));
  reason='MODEL_DRAFT_PERSISTENCE_UNVERIFIED';
  const durable=await callRpc(db,
   'reality_record_current_riley_native_model_draft_v1',{
    p_original_work_id:original.original_work_id,
    p_request_id:claim.request_id,
    p_file_path:TARGET,p_base_commit_sha:commit,
    p_source_blob_sha:source.blob,p_source_sha256:source.file_hash,
    p_proposed_sha256:proposedHash,p_model_response_id:data.id,
    p_find:edited.patch.find,p_replace:edited.patch.replace,
    p_reason:edited.patch.reason.slice(0,1500),
    p_output_tokens:Number.isSafeInteger(data.usage?.output_tokens)?
     data.usage.output_tokens:0
   },{fetchImpl});
  if(durable?.status!=='MODEL_WRITTEN_REPAIR_DRAFT_RECORDED_AWAITING_INDEPENDENT_TEST'||
     durable.shift_id!==graph.shift_id||
     durable.original_work_id!==original.original_work_id||
     durable.proposed_sha256!==proposedHash||
     durable.model_response_id!==data.id||
     durable.independent_tests_passed!==false||
     durable.installation_authorized!==false||
     durable.original_job_completed!==false||
     durable.production_changed!==false)
   fail('DURABLE_MODEL_EDIT_READBACK_UNVERIFIED');
  return Object.freeze(durable);
 }catch(e){
  try{await callRpc(db,'reality_mark_riley_native_model_draft_uncertain_v1',{
   p_original_work_id:original.original_work_id,
   p_request_id:claim.request_id,p_reason:reason
  },{fetchImpl})}catch{/* Persisted uncertainty never becomes success. */}
  const safe=/^RILEY_NATIVE_MODEL_[A-Z0-9_]{5,105}$/.test(String(e?.message||''))?
   e.message:'RILEY_NATIVE_MODEL_PROVIDER_OR_SOURCE_UNVERIFIED';
  return Object.freeze({status:safe,
   original_work_id:original.original_work_id,
   independent_tests_passed:false,installation_authorized:false,
   original_job_completed:false,production_changed:false});
 }
}