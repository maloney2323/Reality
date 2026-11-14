// Scheduled Reality worker -> exact owner-warranted corrective draft ->
// pre-existing protected Supabase GitHub broker -> isolated candidate CI.
// No browser input, no model-generated authority, no new shift, no install.
const SHA=/^[a-f0-9]{40}$/;
const BRANCH=/^reality\/[A-Za-z0-9/_-]{10,130}$/;
const validStatus=/^(?:AUTO_CORRECTIVE_|CORRECTIVE_|CANDIDATE_|ISOLATED_|NO_)[A-Z0-9_]{4,130}$/;
export async function continueRileyCorrectiveModelIntoIndependentCI({
 db,env=process.env,fetchImpl=fetch
}={}){
 const safe=(status)=>Object.freeze({status,original_job_completed:false,
  installation_authorized:false,production_changed:false,
  new_shift_started:false});
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    typeof db?.url!=='string'||!db.url.startsWith('https://')||
    typeof db.secretKey!=='string'||db.secretKey.length<24||
    typeof fetchImpl!=='function')
  return safe('ISOLATED_CORRECTIVE_CI_SERVICE_BOUNDARY_UNVERIFIED');
 const base_branch=String(env.VERCEL_GIT_COMMIT_REF||'');
 const base_sha=String(env.VERCEL_GIT_COMMIT_SHA||'');
 if(!BRANCH.test(base_branch)||base_branch.includes('..')||
    base_branch.includes('//')||base_branch.startsWith('reality/riley/')||
    !SHA.test(base_sha))
  return safe('ISOLATED_CORRECTIVE_CI_DEPLOYED_SOURCE_UNVERIFIED');
 let res;
 try{
  res=await fetchImpl(db.url+'/functions/v1/reality-riley-auto-corrective-ci-v1',{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
   body:JSON.stringify({action:'stage_or_check',base_branch,base_sha,version:1}),
   signal:AbortSignal.timeout(28000)
  });
 }catch{return safe('ISOLATED_CORRECTIVE_CI_BROKER_EFFECT_UNVERIFIED')}
 const r=await res.json().catch(()=>null);
 if(!r||Array.isArray(r)||typeof r!=='object'||
    r.original_job_completed!==false||
    r.installation_authorized!==false||r.production_changed!==false||
    typeof r.status!=='string'||!validStatus.test(r.status))
  return safe('ISOLATED_CORRECTIVE_CI_PROVIDER_READBACK_UNVERIFIED');
 if(!res.ok)return safe(r.status);
 if(r.independent_ci_verified===true&&(
    !/^work:[a-f0-9]{32}$/.test(r.original_work_id||'')||
    !/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9]\d*$/.test(
      r.independent_run_url||'')))
  return safe('ISOLATED_CORRECTIVE_CI_INDEPENDENT_PROOF_INVALID');
 return Object.freeze({...r,new_shift_started:false,
  original_job_completed:false,installation_authorized:false,
  production_changed:false});
}
