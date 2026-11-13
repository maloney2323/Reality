// One failure-backed corrective model pass. Same Riley original, shift, owner,
// and source SHA. A trusted GitHub failure is required before requesting OpenAI.
// No GitHub write, installation, approval, or final receipt in this function.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {sourceFromGitHub,validateCandidate,outputText,expectedGraph}
 from './reality-riley-native-model-draft-v1.js';
const REPO='https://api.github.com/repos/maloney2323/Reality';
const URL='https://github.com/maloney2323/Reality/issues/263';
const TARGET='src/reality-riley-service-original-runtime-v1.js';
const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const fail=s=>{throw Error('RILEY_CORRECTIVE_MODEL_'+s)};
const digest=s=>'sha256:'+createHash('sha256').update(s).digest('hex');

export async function reviseCurrentRileyNativeRepair({
 db,graph,env=process.env,fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    typeof fetchImpl!=='function'||typeof callRpc!=='function')
  fail('TRUSTED_PREVIEW_REQUIRED');
 const original=expectedGraph(graph);
 const commit=String(env.VERCEL_GIT_COMMIT_SHA||'');
 const key=String(env.REALITY_STANDALONE_OPENAI_API_KEY||env.OPENAI_API_KEY||'');
 const model=String(env.REALITY_OPENAI_MODEL||'');
 if(!SHA.test(commit)||key.length<20||
    !/^[a-z0-9][a-z0-9._-]{3,64}$/i.test(model))
  return {status:'RILEY_CORRECTIVE_MODEL_PREVIEW_CONFIG_UNVERIFIED',
   independent_tests_passed:false,installation_authorized:false,
   original_job_completed:false,production_changed:false};
 // The service RPC independently checks the existing frozen test failure,
 // original source, exact owner warrant and original model response.
 const claim=await callRpc(db,'reality_claim_same_riley_native_model_revision_v1',{
  p_shift_id:graph.shift_id,p_original_work_id:original.original_work_id
 },{fetchImpl});
 if(claim?.status==='SAME_ORIGINAL_REVISION_ALREADY_ATTEMPTED_NO_REPLAY'&&
    claim.original_work_id===original.original_work_id&&
    claim.shift_id===graph.shift_id&&
    claim.model_invocation_authorized===false)
  return {...claim};
 if(claim?.status!=='SAME_ORIGINAL_MODEL_CORRECTION_LEASED'||
    claim.original_work_id!==original.original_work_id||
    claim.shift_id!==graph.shift_id||claim.owner_id!==graph.owner_id||
    claim.source_proof_sha256!==original.source_proof_sha256||
    claim.model_invocation_authorized!==true||
    claim.original_job_completed!==false||
    claim.installation_authorized!==false||
    claim.production_changed!==false||
    !UUID.test(claim.request_id||'')||
    !SHA.test(claim.failing_commit_sha||'')||
    !Number.isSafeInteger(claim.failing_run_id)||
    claim.failing_run_id<10000||
    !/^resp_[A-Za-z0-9_-]{4,160}$/.test(claim.initial_model_response_id||''))
  fail('FROZEN_FAILURE_LEASE_UNVERIFIED');
 try{
  // Provider evidence, NOT the model, supplies the verdict.
  const url=REPO+'/actions/runs/'+claim.failing_run_id;
  let runReply;
  try{runReply=await fetchImpl(url,{
   method:'GET',cache:'no-store',redirect:'error',
   headers:{accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-Independent-Riley-Model-Correction-v1'},
   signal:AbortSignal.timeout(10000)
  })}catch{fail('FROZEN_GITHUB_RUN_READ_UNVERIFIED')}
  if(!runReply?.ok)fail('FROZEN_GITHUB_RUN_READ_UNVERIFIED');
  const run=await runReply.json().catch(()=>null);
  if(run?.id!==claim.failing_run_id||
     run.head_sha!==claim.failing_commit_sha||
     run.status!=='completed'||run.conclusion!=='failure'||
     run.name!=='Reality — Isolated governed OpenAI gateway proof'||
     run.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+claim.failing_run_id)
   fail('GITHUB_FROZEN_FAILURE_MISMATCH');
  const source=await sourceFromGitHub({commit,fetchImpl});
  let response;
  try{response=await fetchImpl('https://api.openai.com/v1/responses',{
   method:'POST',cache:'no-store',redirect:'error',
   headers:{authorization:'Bearer '+key,'content-type':'application/json',
    'x-client-request-id':claim.request_id},
   body:JSON.stringify({
    model,store:false,max_output_tokens:6000,
    text:{format:{
     type:'json_schema',name:'reality_corrected_riley_source_patch',
     strict:true,schema:{type:'object',additionalProperties:false,
      properties:{find:{type:'string'},replace:{type:'string'},reason:{type:'string'}},
      required:['find','replace','reason']}
    }},
    input:[
     {role:'system',content:[{type:'input_text',text:
      'You are the governed Riley software-engineering ROLE. One prior OpenAI repair was independently rejected. '+
      'You have NO permission to execute, install, change production, fabricate owner approval or settle any job. '+
      'Provide EXACTLY ONE self-contained JSON source patch with find, replace, reason. '+
      'The find block must occur EXACTLY ONCE in the source below, and replacement must preserve valid original-job execution. '+
      'The independent frozen run failed 2 tests: full shift original returned EXECUTION_PROVIDER_EFFECT_UNKNOWN instead of '+
      'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF, and trusted original runtime threw '+
      'RILEY_SERVICE_ORIGINAL_ORIGINAL_JOB_ALREADY_SETTLED on a valid unsettled job. '+
      'The rejected patch introduced scope?.original_job_settled !== false, but scope is a bounded argument that '+
      'does NOT contain original_job_settled. Never repeat that check or infer a missing field is false. '+
      'The actual trusted source_context has original_job_settled, and the current owner ledger also verifies unsettled work. '+
      'Keep all existing owner, goal, source, claim and provider-effect safety gates. '+
      'Do not invent test results. Fix the proven defect and improve safe continuation only where source supports it.'}]},
     {role:'user',content:[{type:'input_text',text:
      'Same authorized source issue: '+URL+
      '\nOriginal work: '+original.original_work_id+
      '\nOriginal model response: '+claim.initial_model_response_id+
      '\nIndependent failing run: '+run.html_url+
      '\nExact source path: '+TARGET+
      '\nCurrent isolated source at SHA '+commit+':\n'+source.text+
      '\nReturn only strict JSON find/replace/reason. No installation, new job or receipt.'}]}
    ]
   }),signal:AbortSignal.timeout(24000)
  })}catch{fail('OPENAI_PROVIDER_UNVERIFIED')}
  if(!response?.ok)fail('OPENAI_PROVIDER_UNVERIFIED');
  const data=await response.json().catch(()=>null);
  if(data?.status!=='completed'||
    !/^resp_[A-Za-z0-9_-]{4,160}$/.test(data.id||''))
   fail('OPENAI_COMPLETED_RESPONSE_REQUIRED');
  const patch=validateCandidate(outputText(data),source.text);
  if(/scope\?\.original_job_settled/.test(patch.patch.replace))
   fail('PRIOR_FAILED_UNDEFINED_SCOPE_REINTRODUCED');
  const proposedHash=digest(Buffer.from(patch.proposed,'utf8'));
  const recorded=await callRpc(db,'reality_record_same_riley_native_model_revision_v1',{
   p_original_work_id:original.original_work_id,p_request_id:claim.request_id,
   p_source_path:TARGET,p_base_sha:commit,p_blob_sha:source.blob,
   p_proposed_sha256:proposedHash,p_model_response_id:data.id,
   p_find:patch.patch.find,p_replace:patch.patch.replace,
   p_reason:patch.patch.reason,
   p_output_tokens:Number.isSafeInteger(data.usage?.output_tokens)?
    data.usage.output_tokens:0
  },{fetchImpl});
  if(recorded?.status!=='SAME_ORIGINAL_CORRECTED_MODEL_DRAFT_AWAITING_FROZEN_TEST'||
     recorded.shift_id!==graph.shift_id||
     recorded.original_work_id!==original.original_work_id||
     recorded.proposed_sha256!==proposedHash||
     recorded.model_response_id!==data.id||
     recorded.independent_tests_passed!==false||
     recorded.installation_authorized!==false||
     recorded.original_job_completed!==false||
     recorded.production_changed!==false)
   fail('CORRECTED_SOURCE_DRAFT_RECEIPT_UNVERIFIED');
  return recorded;
 }catch(e){
  try{await callRpc(db,'reality_mark_same_riley_native_model_revision_uncertain_v1',{
   p_original_work_id:original.original_work_id,p_request_id:claim.request_id
  },{fetchImpl})}catch{}
  const str=String(e?.message||'');
  return {status:/^RILEY_(?:CORRECTIVE_MODEL|NATIVE_MODEL)_[A-Z0-9_]{4,125}$/.test(str)?
   str:'RILEY_CORRECTIVE_MODEL_PROVIDER_OR_SCOPE_UNVERIFIED',
   original_work_id:original.original_work_id,independent_tests_passed:false,
   installation_authorized:false,original_job_completed:false,
   production_changed:false};
 }
}