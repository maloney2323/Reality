// The current authenticated owner shift may VERIFY a Vercel deployment
// status from its earlier one-use inert GitHub canary. This makes no new
// job, cannot install an upgrade and cannot grant a model permission.
const SHA=/^[a-f0-9]{40}$/;
const safe=(status,details={})=>Object.freeze({
 status,preview_auto_deploy_verified:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,...details
});
export async function verifyGeneralizedOriginalPreviewAutoDeploy({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    typeof db.url!=='string'||!db.url.startsWith('https://')||
    typeof db.secretKey!=='string'||db.secretKey.length<25||
    typeof fetchImpl!=='function')
  return safe('GENERALIZED_DEPLOY_TRUSTED_ISOLATED_SERVICE_REQUIRED');
 let r,j;
 try{
  r=await fetchImpl(db.url+
   '/functions/v1/reality-governed-original-preview-auto-deploy-verifier-v1',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(19000),
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
   body:'{"version":1,"action":"verify_same_original_preview_auto_deploy"}'
  });
  j=await r.json();
 }catch{return safe('GENERALIZED_DEPLOY_VERIFIER_PROVIDER_UNAVAILABLE')}
 if(!j||typeof j!=='object'||Array.isArray(j)||
    j.installation_authorized!==false||
    j.original_job_completed!==false||
    j.production_changed!==false||
    typeof j.preview_auto_deploy_verified!=='boolean')
  return safe('GENERALIZED_DEPLOY_PROOF_OR_AUTHORITY_UNVERIFIED');
 if(!r.ok)return safe('GENERALIZED_DEPLOY_PROVIDER_NOT_YET_VERIFIED');
 if(j.status==='GENERALIZED_PREVIEW_AUTO_DEPLOY_GITHUB_VERCEL_STATUS_VERIFIED'&&
    j.preview_auto_deploy_verified===true&&
    j.isolated_github_write_verified===true&&
    /^work:[a-f0-9]{32}$/.test(j.original_work_id||'')&&
    SHA.test(j.canary_commit_sha||'')&&
    Number.isSafeInteger(j.github_vercel_status_id)&&
    /^https:\/\/vercel\.com\/[a-zA-Z0-9_-]+\/reality\/[a-zA-Z0-9_-]{10,100}$/
     .test(j.vercel_deployment_url||''))
  return safe(j.status,{
   preview_auto_deploy_verified:true,
   original_work_id:j.original_work_id,
   canary_commit_sha:j.canary_commit_sha,
   vercel_deployment_url:j.vercel_deployment_url
  });
 if(['NO_CURRENT_ORIGINAL_DEPLOYMENT_RECEIPT_NEEDED',
      'GENERALIZED_DEPLOY_NO_ACTIVE_OWNER_SHIFT',
      'VERCEL_OFFICIAL_INTEGRATION_STATUS_NOT_UNAMBIGUOUS',
      'VERCEL_OFFICIAL_SUCCESS_APP_IDENTITY_NOT_YET_VERIFIED'].includes(j.status))
  return safe(j.status);
 return safe('GENERALIZED_DEPLOY_PROVIDER_STATUS_NOT_ACCEPTED');
}
