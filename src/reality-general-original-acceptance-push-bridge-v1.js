// Existing signed completion-bound worker calls the separately governed
// one-shot GitHub source-PATH push transport preflight. The Edge broker
// enforces immutable owner shift, exact original and one-use DB fence.
// No caller-specified source, branch, authorization, installation or settlement.
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const safe=(status,more={})=>Object.freeze({
 status,independent_push_acceptance_verified:false,
 installation_authorized:false,source_installed:false,
 original_job_completed:false,production_changed:false,...more
});
export async function verifyGeneralOriginalAcceptancePushTransport({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   typeof db.url!=='string'||!db.url.startsWith('https://')||
   typeof db.secretKey!=='string'||db.secretKey.length<25||
   typeof fetchImpl!=='function')
  return safe('GENERAL_ORIGINAL_CI_PUSH_SIGNED_PREVIEW_WORKER_REQUIRED');
 let response,result;
 try{
  response=await fetchImpl(db.url+
   '/functions/v1/reality-governed-original-acceptance-push-probe-v1',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(19000),
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
   body:'{"version":1,"action":"prove_isolated_original_acceptance_push_transport"}'
  });
  result=await response.json();
 }catch{return safe('GENERAL_ORIGINAL_CI_PUSH_PROVIDER_UNREACHABLE')}
 if(!result||typeof result!=='object'||Array.isArray(result)||
  result.installation_authorized!==false||
  result.source_installed!==false||
  result.original_job_completed!==false||
  result.production_changed!==false)
  return safe('GENERAL_ORIGINAL_CI_PUSH_RESPONSE_AUTHORITY_DRIFT');
 if(!response.ok)return safe('GENERAL_ORIGINAL_CI_PUSH_SERVICE_OR_PROVIDER_UNVERIFIED');
 if(result.status==='EXACT_ISOLATED_PUSH_AND_CI_INDEPENDENTLY_VERIFIED'&&
   result.independent_push_acceptance_verified===true&&
   WORK.test(result.original_work_id||'')&&
   SHA.test(result.github_commit_sha||'')&&
   Number.isSafeInteger(result.push_ci_run_id)&&result.push_ci_run_id>10000)
  return safe(result.status,{independent_push_acceptance_verified:true,
   original_work_id:result.original_work_id,
   github_commit_sha:result.github_commit_sha,push_ci_run_id:result.push_ci_run_id});
 if(['NO_CURRENT_AUTHORIZED_PUSH_PROBE',
   'EXACT_ISOLATED_SOURCE_PATH_PUSH_PROVIDER_VERIFIED',
   'GOVERNED_PUSH_INDEPENDENT_ACCEPTANCE_PENDING_OR_UNVERIFIED',
   'EXACT_ISOLATED_PUSH_FENCED_OR_UNVERIFIED',
   'ONE_SHOT_GITHUB_PUSH_EFFECT_UNVERIFIED_NO_RETRY',
   'ISOLATED_PREFLIGHT_SOURCE_OR_BRANCH_DRIFT_NO_EFFECT',
   'ISOLATED_GITHUB_BROKER_CREDENTIAL_UNVERIFIED'].includes(result.status))
  return safe(result.status);
 return safe('GENERAL_ORIGINAL_CI_PUSH_UNCLASSIFIED_VERDICT');
}
