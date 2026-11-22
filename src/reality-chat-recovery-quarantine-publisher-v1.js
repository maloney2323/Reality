// Existing signed worker -> service-only protected broker staging of an
// untrusted, model-generated recovery candidate. One-shot, isolated PR only.
// The trigger, candidate, original and authority are selected in the database;
// no user/client/model may supply a GitHub write or installation scope.
const SHA=/^[a-f0-9]{40}$/;
const BRANCH=/^(?:repair|reality)\/[A-Za-z0-9/_-]{10,160}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const safe=(status,extra={})=>Object.freeze({
 status,source_installed:false,independent_ci_verified:false,
 feature_acceptance_verified:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 new_shift_started:false,...extra
});
export async function stageNextSignedChatRecoveryQuarantine({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  db.url!=='https://'+db.project+'.supabase.co'||
  typeof db.secretKey!=='string'||db.secretKey.length<24||
  !SHA.test(env.VERCEL_GIT_COMMIT_SHA||'')||
  !BRANCH.test(env.VERCEL_GIT_COMMIT_REF||'')||
  env.VERCEL_GIT_COMMIT_REF.includes('..')||
  env.VERCEL_GIT_COMMIT_REF.includes('//')||
  env.VERCEL_GIT_COMMIT_REF.startsWith('reality/chat-recovery/')||
  env.VERCEL_GIT_COMMIT_REF.startsWith('reality/chat-development/')||
  env.VERCEL_GIT_COMMIT_REF.startsWith('reality/riley/')||
  typeof fetchImpl!=='function')
  return safe('SIGNED_RECOVERY_QUARANTINE_PREVIEW_BOUNDARY_UNVERIFIED');
 let response,result;
 try{
  response=await fetchImpl(db.url+
   '/functions/v1/reality-chat-recovery-quarantine-broker-v1',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(45000),
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
   body:JSON.stringify({action:'stage_signed_chat_recovery_quarantine',
    base_branch:env.VERCEL_GIT_COMMIT_REF,
    base_sha:env.VERCEL_GIT_COMMIT_SHA})
  });
  result=await response.json();
 }catch{return safe('SIGNED_RECOVERY_QUARANTINE_EFFECT_UNVERIFIED_NO_REPLAY')}
 if(!result||Array.isArray(result)||typeof result!=='object'||
    typeof result.status!=='string'||
    !/^[A-Z][A-Z0-9_]{8,130}$/.test(result.status)||
    result.source_installed!==false||
    result.feature_acceptance_verified!==false||
    result.independent_ci_verified!==false||
    result.installation_authorized!==false||
    result.original_job_completed!==false||
    result.production_changed!==false||
    result.new_shift_started!==false)
  return safe('SIGNED_RECOVERY_QUARANTINE_RESPONSE_UNTRUSTED');
 if(!response.ok)
  return safe('SIGNED_RECOVERY_QUARANTINE_SERVICE_OR_PROVIDER_UNVERIFIED');
 if(result.status==='SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_RECEIPTED'){
  if(!WORK.test(result.original_work_id||'')||
     !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}-[a-f0-9]{12}$/i.test(
       result.trigger_id||'')||
     !HASH.test(result.quarantine_receipt_sha256||'')||
     !SHA.test(result.artifact_commit_sha||'')||
     !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(
      result.pr_url||'')||
     result.provider_readback_verified!==true)
    return safe('SIGNED_RECOVERY_QUARANTINE_PROVIDER_PROOF_UNTRUSTED');
  return safe(result.status,{
   original_work_id:result.original_work_id,trigger_id:result.trigger_id,
   quarantine_receipt_sha256:result.quarantine_receipt_sha256,
   artifact_commit_sha:result.artifact_commit_sha,
   pr_url:result.pr_url,provider_readback_verified:true
  });
 }
 return safe(result.status);
}
