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
 if(['GENERALIZED_PREVIEW_AUTO_DEPLOY_GITHUB_VERCEL_STATUS_VERIFIED',
     'GENERALIZED_VERCEL_APP_CORRELATED_EXACT_DEPLOY_STATUS_VERIFIED'].includes(j.status)&&
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
   vercel_deployment_url:j.vercel_deployment_url,
   ...(j.status==='GENERALIZED_VERCEL_APP_CORRELATED_EXACT_DEPLOY_STATUS_VERIFIED'&&
    Number.isSafeInteger(j.official_vercel_app_check_run_id)&&j.official_vercel_app_check_run_id>0&&
    Number.isSafeInteger(j.official_vercel_app_id)&&j.official_vercel_app_id>0?
    {official_vercel_app_check_run_id:j.official_vercel_app_check_run_id,
     official_vercel_app_id:j.official_vercel_app_id}: {})
  });
 if(j.status==='VERCEL_PROVIDER_CREATOR_IDENTITY_NOT_ATTESTED'){
  const login=String(j.public_status_actor_login||'');
  const type=String(j.public_status_actor_type||'');
  return safe(j.status,{
   public_status_actor_login:login.length>=1&&login.length<=64&&
    [...login].every(c=>'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_[]-'.includes(c))?
    login:null,
   public_status_actor_type:['Bot','User','Organization'].includes(type)?type:null,
   public_check_surface:['PRESENT','EMPTY','UNAVAILABLE'].includes(j.public_check_surface)?
    j.public_check_surface:'UNAVAILABLE',
   public_vercel_app_check_candidates:Array.isArray(j.public_vercel_app_check_candidates)?
    j.public_vercel_app_check_candidates.filter(z=>
      z&&typeof z==='object'&&
      (z.app_slug===null||/^[a-z0-9-]{1,60}$/.test(z.app_slug))&&
      (z.check_name===null||/^[a-zA-Z0-9 _:/.-]{1,100}$/.test(z.check_name))&&
      typeof z.head_match==='boolean'
    ).slice(0,5):[]
  });
 }
 if(['NO_CURRENT_ORIGINAL_DEPLOYMENT_RECEIPT_NEEDED',
      'GENERALIZED_DEPLOY_NO_ACTIVE_OWNER_SHIFT',
      'VERCEL_OFFICIAL_INTEGRATION_STATUS_NOT_UNAMBIGUOUS',
      'VERCEL_OFFICIAL_SUCCESS_APP_IDENTITY_NOT_YET_VERIFIED',
      'VERCEL_PROVIDER_STATUS_NOT_SUCCESS',
      'VERCEL_PROVIDER_OFFICIAL_DEPLOYMENT_URL_MISMATCH',
      'VERCEL_PROVIDER_CREATOR_TYPE_NOT_BOT',
      'VERCEL_PROVIDER_CREATOR_LOGIN_NOT_ATTESTED',
      'VERCEL_PROVIDER_CREATOR_IDENTITY_NOT_ATTESTED',
      'VERCEL_PROVIDER_STATUS_ID_NOT_VERIFIED',
      'VERCEL_STATUS_CREATOR_PRESENT_BUT_UNTRUSTED',
      'VERCEL_OFFICIAL_APP_CHECK_SURFACE_UNVERIFIED',
      'VERCEL_OFFICIAL_APP_AND_SUCCESS_STATUS_CORRELATION_MISSING'].includes(j.status))
  return safe(j.status);
 return safe('GENERALIZED_DEPLOY_PROVIDER_STATUS_NOT_ACCEPTED');
}
