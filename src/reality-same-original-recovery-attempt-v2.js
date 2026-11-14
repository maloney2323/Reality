// Existing authorized shift -> independently failed corrective CI -> a NEW
// durably fenced repair attempt on the SAME original. No new work authorization,
// installation, prod mutation or job settlement. The service-only DB selects
// all eligibility and enforces singleflight; the model only proposes one edit.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {sourceFromGitHub,validateCandidate,outputText}
 from './reality-riley-native-model-draft-v1.js';

const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const RUN=/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/([1-9]\d*)$/;
const REPO='https://api.github.com/repos/maloney2323/Reality';
const TARGET='src/reality-riley-service-original-runtime-v1.js';
const digest=data=>'sha256:'+createHash('sha256').update(data).digest('hex');
const safe=(status,extra={})=>Object.freeze({status,
 independent_tests_passed:false,new_shift_started:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,...extra});
const fail=code=>{throw Error('RECOVERY_'+code)};

export async function continueSameOriginalRecoveryAfterVerifiedFailure({
 db,env=process.env,fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  typeof fetchImpl!=='function'||typeof callRpc!=='function')
  return safe('RECOVERY_ISOLATED_SERVICE_BOUNDARY_UNVERIFIED');
 // An RPC call with ZERO user-controlled args: it independently selects the
 // only failed, unsettled owner-warranted original, or returns no work.
 let claim;
 try{claim=await callRpc(db,'reality_claim_same_original_recovery_attempt_v2',{},
  {fetchImpl})}
 catch{return safe('RECOVERY_ATOMIC_CLAIM_OR_DATABASE_UNVERIFIED')}
 if(claim?.model_invocation_authorized===false&&
   ['NO_VERIFIED_COMPLETION_WARRANT_RECOVERY',
    'NO_INDEPENDENT_FAILED_ORIGINAL_TO_RECOVER',
    'EXISTING_SAME_ORIGINAL_RECOVERY_NO_REPLAY',
    'RECOVERY_ATTEMPT_BUDGET_REQUIRES_OWNER_REVIEW'].includes(claim.status)&&
   claim.installation_authorized===false&&
   claim.original_job_completed===false&&
   claim.production_changed===false)
  return safe(claim.status,{
   ...(WORK.test(claim.original_work_id||'')?{original_work_id:claim.original_work_id}:{}),
   ...(UUID.test(claim.attempt_id||'')?{attempt_id:claim.attempt_id}:{}),
   ...(Number.isSafeInteger(claim.attempt_number)?{attempt_number:claim.attempt_number}:{}),
   ...(typeof claim.phase==='string'?{phase:claim.phase}:{})
  });
 if(claim?.status!=='SAME_ORIGINAL_RECOVERY_MODEL_LEASED'||
  claim.model_invocation_authorized!==true||
  claim.installation_authorized!==false||
  claim.original_job_completed!==false||
  claim.production_changed!==false||
  claim.new_shift_started!==false||
  !UUID.test(claim.shift_id||'')||!UUID.test(claim.owner_id||'')||
  !UUID.test(claim.attempt_id||'')||!UUID.test(claim.request_id||'')||
  !WORK.test(claim.original_work_id||'')||!HASH.test(claim.source_proof_sha256||'')||
  !HASH.test(claim.failed_candidate_sha256||'')||
  claim.source_path!==TARGET||!SHA.test(claim.failed_commit_sha||'')||
  !Number.isSafeInteger(claim.failed_run_id)||claim.failed_run_id<10000||
  !Number.isSafeInteger(claim.attempt_number)||
  claim.attempt_number<2||claim.attempt_number>8)
  return safe('RECOVERY_CLAIM_SCOPE_OR_SOURCE_UNVERIFIED');
 const commit=String(env.VERCEL_GIT_COMMIT_SHA||'');
 const key=String(env.REALITY_STANDALONE_OPENAI_API_KEY||
  env.OPENAI_API_KEY||'');
 const model=String(env.REALITY_OPENAI_MODEL||'');
 let stage='MODEL_PROVIDER_OR_SOURCE_UNVERIFIED';
 try{
  if(!SHA.test(commit)||key.length<20||
    !/^[a-z0-9][a-z0-9._-]{3,64}$/i.test(model))
   fail('PREVIEW_MODEL_CONFIGURATION_UNVERIFIED');
  // Re-observe the exact independent failed provider CI, not a model claim.
  stage='INDEPENDENT_NEGATIVE_PROOF_UNVERIFIED';
  const runResponse=await fetchImpl(REPO+'/actions/runs/'+claim.failed_run_id,{
   method:'GET',cache:'no-store',redirect:'error',
   headers:{accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-Same-Original-Recovery-v2'},
   signal:AbortSignal.timeout(10000)
  });
  if(!runResponse?.ok)fail('FAILED_CI_PROVIDER_READBACK_UNAVAILABLE');
  const run=await runResponse.json().catch(()=>null);
  if(run?.id!==claim.failed_run_id||
     run.head_sha!==claim.failed_commit_sha||
     run.status!=='completed'||run.conclusion!=='failure'||
     !['Reality — Isolated governed OpenAI gateway proof',
       'Reality independently tested auto-corrective candidate'].includes(run.name)||
     run.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+claim.failed_run_id||
     (run.head_repository?.full_name&&
       run.head_repository.full_name!=='maloney2323/Reality'))
   fail('INDEPENDENT_NEGATIVE_RUN_IDENTITY_DRIFT');
  const source=await sourceFromGitHub({commit,fetchImpl});
  // Model output cannot modify the owner warrant, job identity or source
  // path. It is an uninstalled proposed edit until independently tested.
  stage='MODEL_PROVIDER_OR_SOURCE_UNVERIFIED';
  const response=await fetchImpl('https://api.openai.com/v1/responses',{
   method:'POST',cache:'no-store',redirect:'error',
   headers:{authorization:'Bearer '+key,'content-type':'application/json',
    'x-client-request-id':claim.request_id},
   body:JSON.stringify({
    model,store:false,max_output_tokens:6000,
    text:{format:{type:'json_schema',name:'reality_same_original_recovery_patch_v2',
     strict:true,schema:{type:'object',additionalProperties:false,
      properties:{find:{type:'string'},replace:{type:'string'},reason:{type:'string'}},
      required:['find','replace','reason']}}},
    input:[
     {role:'system',content:[{type:'input_text',text:
      'You are Reality’s governed software-repair intelligence role. The existing owner-authorized original has failed an independent corrective CI test. '+
      'Do not create a new job, claim authority, install code, change production, falsify evidence, weaken any governance guard, or claim completed work. '+
      'Return exactly ONE minimal real source repair (find, replace, reason). The find block must occur exactly once in the supplied source. '+
      'Focus on the independently observed genuine handoff failure; avoid cosmetic status-only patches and preserve original-job ownership, execution gating, and final settlement checks.'}]},
     {role:'user',content:[{type:'input_text',text:
      'Same original work: '+claim.original_work_id+
      '\nAuthorized source: '+claim.source_ref+
      '\nRecovery attempt number: '+claim.attempt_number+
      '\nRejected CI run: '+run.html_url+
      '\nPrior rejected candidate SHA256: '+claim.failed_candidate_sha256+
      '\nActual failed CI conclusion: '+run.conclusion+
      '\nCurrent trusted file: '+TARGET+
      '\nCurrent source at deployed SHA '+commit+':\n'+source.text+
      '\nReturn only strict JSON source edit. This does not authorize execution or installation.'}]}
    ]
   }),signal:AbortSignal.timeout(24000)
  });
  if(!response?.ok)fail('OPENAI_RESPONSE_UNVERIFIED');
  const data=await response.json().catch(()=>null);
  if(data?.status!=='completed'||!/^resp_[A-Za-z0-9_-]{4,160}$/.test(data.id||''))
   fail('OPENAI_COMPLETED_RESPONSE_REQUIRED');
  stage='PROPOSED_SOURCE_REPAIR_UNVERIFIED';
  const patch=validateCandidate(outputText(data),source.text);
  const proposed=digest(Buffer.from(patch.proposed,'utf8'));
  stage='PATCH_DATABASE_READBACK_UNVERIFIED';
  const receipt=await callRpc(db,'reality_record_same_original_recovery_patch_v2',{
   p_attempt_id:claim.attempt_id,p_request_id:claim.request_id,
   p_source_path:TARGET,p_base_sha:commit,p_blob_sha:source.blob,
   p_source_file_sha256:source.file_hash,p_proposed_sha256:proposed,
   p_model_response_id:data.id,p_find:patch.patch.find,
   p_replace:patch.patch.replace,p_reason:patch.patch.reason,
   p_output_tokens:Number.isSafeInteger(data.usage?.output_tokens)?
    data.usage.output_tokens:0
  },{fetchImpl});
  if(receipt?.status!=='SAME_ORIGINAL_RECOVERY_PATCH_RECORDED'||
   receipt.attempt_id!==claim.attempt_id||
   receipt.attempt_number!==claim.attempt_number||
   receipt.original_work_id!==claim.original_work_id||
   receipt.shift_id!==claim.shift_id||
   receipt.model_response_id!==data.id||
   receipt.proposed_sha256!==proposed||
   receipt.independent_tests_passed!==false||
   receipt.new_shift_started!==false||
   receipt.installation_authorized!==false||
   receipt.original_job_completed!==false||
   receipt.production_changed!==false)
   fail('PATCH_DURABLE_RECEIPT_MISMATCH');
  return safe('SAME_ORIGINAL_RECOVERY_PATCH_RECORDED',{
   original_work_id:claim.original_work_id,shift_id:claim.shift_id,
   attempt_id:claim.attempt_id,attempt_number:claim.attempt_number,
   proposed_sha256:proposed,model_response_id:data.id,
   next_governed_action:'STAGE_AND_INDEPENDENTLY_TEST_SAME_ORIGINAL_PATCH'
  });
 }catch{
  // Uncertain provider/model result is NEVER automatically invoked again.
  try{await callRpc(db,'reality_mark_same_original_recovery_uncertain_v2',{
   p_attempt_id:claim.attempt_id,p_request_id:claim.request_id,
   p_reason:'RECOVERY_'+stage
  },{fetchImpl})}catch{}
  return safe('RECOVERY_PROVIDER_OR_EVIDENCE_UNVERIFIED_NO_REPLAY',{
   original_work_id:claim.original_work_id,attempt_id:claim.attempt_id,
   attempt_number:claim.attempt_number
  });
 }
}
