// The existing signed owner-authorized shift can continue a SEPARATELY
// approved exact original. It never creates that owner approval or selects a
// model candidate; the privileged isolated broker queries durable governance.
const SHA=/^[a-f0-9]{40}$/;
const safe=(status,extra={})=>Object.freeze({
 status,source_installed:false,original_job_completed:false,
 production_changed:false,...extra
});
export async function continueGeneralOwnerApprovedOriginalInstall({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   typeof db.url!=='string'||!db.url.startsWith('https://')||
   typeof db.secretKey!=='string'||db.secretKey.length<25)
  return safe('GENERAL_INSTALL_SIGNED_ISOLATED_WORKER_REQUIRED');
 let response,result;
 try{
  response=await fetchImpl(db.url+
    '/functions/v1/reality-governed-general-original-installer-v1',{
    method:'POST',cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(20000),
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
      'content-type':'application/json',accept:'application/json'},
    body:'{"version":1,"action":"execute_previously_owner_approved_original_install"}'
   });
  result=await response.json();
 }catch{return safe('GENERAL_INSTALL_PRIVILEGED_PROVIDER_UNVERIFIED')}
 if(!result||typeof result!=='object'||Array.isArray(result)||
    result.original_job_completed!==false||
    result.production_changed!==false||
    result.source_installed!==true&&result.source_installed!==false)
  return safe('GENERAL_INSTALL_PROVIDER_AUTHORITY_DRIFT');
 if(!response.ok)return safe('GENERAL_INSTALL_SIGNED_PROVIDER_BLOCKED');
 if(result.status==='GENERAL_ORIGINAL_EXACT_SOURCE_INSTALLED_AWAITING_INDEPENDENT_SETTLEMENT'&&
    result.source_installed===true&&
    /^work:[a-f0-9]{32}$/.test(result.original_work_id||'')&&
    SHA.test(result.installed_commit_sha||''))
  return safe(result.status,{
   source_installed:true,original_work_id:result.original_work_id,
   installed_commit_sha:result.installed_commit_sha,
   next_gate:'INDEPENDENT_SAME_ORIGINAL_POSTINSTALL_CI_AND_DEPLOYMENT_RECEIPTS'
  });
 if(['GENERAL_INSTALL_AWAITING_EXACT_OWNER_APPROVAL',
      'GENERAL_INSTALL_AUTHORIZED_SHIFT_NOT_CURRENT',
      'GENERAL_INSTALL_INTENT_ALREADY_FENCED_READBACK_ONLY',
      'GENERAL_INSTALL_SOURCE_ALREADY_INSTALLED_POSTINSTALL_MONITORING',
      'GENERAL_INSTALL_ALREADY_FENCED_NO_PROVIDER_EFFECT_CONFIRMED',
      'GENERAL_INSTALL_FENCED_EFFECT_UNCERTAIN_NO_SECOND_WRITE',
      'GENERAL_INSTALL_FENCED_PROVIDER_EFFECT_UNCERTAIN_GET_ONLY',
      'GENERAL_INSTALL_FENCED_REF_UPDATE_NOT_VERIFIED_NO_RETRY',
      'GENERAL_INSTALL_FENCED_POSTWRITE_BRANCH_DRIFT_GET_ONLY',
      'GENERAL_INSTALL_FENCED_PARENT_COMMIT_DRIFT_NO_WRITE',
      'GENERAL_INSTALL_REAL_GITHUB_CREDENTIAL_NOT_VERIFIED',
      'GENERAL_INSTALL_CURRENT_SOURCE_OR_FROZEN_CANDIDATE_DRIFT'].includes(result.status))
  return safe(result.status,{
   source_installed:result.source_installed===true,
   installation_authorized:result.installation_authorized===true
  });
 return safe('GENERAL_INSTALL_UNRECOGNIZED_GOVERNED_PROVIDER_RESPONSE');
}
