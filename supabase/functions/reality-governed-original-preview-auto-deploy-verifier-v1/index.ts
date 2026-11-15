// Read-only provider evidence for the exact previous GitHub canary commit.
// Proves the official GitHub/Vercel integration completed deployment and
// durably records that without creating owner consent or installing code.
// A GitHub green TEST is not equivalent to Vercel deployment verification.
const API='https://api.github.com/repos/maloney2323/Reality';
const SHA=/^[a-f0-9]{40}$/;
const VERCEL_DEPLOYMENT_URL=/^https:\/\/vercel\.com\/[a-zA-Z0-9_-]+\/reality\/[a-zA-Z0-9_-]{10,100}$/;
const BRANCH=/^reality\/[a-zA-Z0-9/_-]{10,135}$/;
const SOURCE=/^src\/[a-zA-Z0-9/_-]+\.js$/;
const PROBE=/^evidence\/reality-governed-original-canary-[a-f0-9-]{36}\.json$/;
const fail=s=>{throw Error('GENERALIZED_PREVIEW_DEPLOY_'+s)};
function safe(status,extra={},http=200){
 return new Response(JSON.stringify({
  status,preview_auto_deploy_verified:false,owner_approval_ready:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,...extra
 }),{status:http,headers:{'content-type':'application/json',
 'cache-control':'no-store','x-content-type-options':'nosniff'}});
}
async function rpc(api,key,name,input={}){
 if(!['reality_read_generalized_original_auto_deploy_scope_v1',
       'reality_record_generalized_original_auto_deploy_receipt_v1',
       'reality_record_generalized_original_auto_deploy_app_receipt_v2'].includes(name))
  fail('NOT_ALLOWED_SERVICE_RPC');
 const r=await fetch(api+'/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(13000),
  headers:{apikey:key,authorization:'Bearer '+key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(input)});
 if(!r.ok)fail('OWNER_SHIFT_SERVICE_PROOF_REJECTED');
 const v=await r.json().catch(()=>null);
 if(!v||typeof v!=='object'||Array.isArray(v))
  fail('DURABLE_EVIDENCE_READBACK_MISSING');
 return v;
}
async function github(token,route){
 const r=await fetch(API+route,{
  method:'GET',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(14000),
  headers:{authorization:'Bearer '+token,
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-governed-original-deploy-verifier'}});
 if(!r.ok)fail('GITHUB_INDEPENDENT_PROVIDER_EVIDENCE_UNAVAILABLE');
 const body=await r.json().catch(()=>null);
 if(!body||typeof body!=='object'||Array.isArray(body))
  fail('GITHUB_PROVIDER_EVIDENCE_INVALID');
 return body;
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||req.headers.get('content-type')!=='application/json')
   return safe('SIGNED_SERVICE_EXACT_POST_REQUIRED',{},405);
  if(await req.text()!=='{"version":1,"action":"verify_same_original_preview_auto_deploy"}')
   return safe('DEPLOY_PROOF_EXACT_ACTION_REQUIRED',{},400);
  const key=req.headers.get('apikey')||'';
  if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
   return safe('SERVICE_ROLE_AUTHENTICATION_REQUIRED',{},403);
  const url=Deno.env.get('SUPABASE_URL')||'';
  let u;try{u=new URL(url)}catch{return safe('SERVICE_PROJECT_UNVERIFIED',{},503)}
  if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||
     u.pathname!=='/'||u.search||u.hash)
   return safe('SERVICE_PROJECT_UNVERIFIED',{},503);
  const db=u.origin;
  const proof=await rpc(db,key,'reality_read_generalized_original_auto_deploy_scope_v1');
  if(['NO_CURRENT_ORIGINAL_DEPLOYMENT_RECEIPT_NEEDED',
       'GENERALIZED_DEPLOY_NO_ACTIVE_OWNER_SHIFT'].includes(proof.status))
   return safe(proof.status);
  if(proof.status!=='EXACT_PREAPPROVAL_ORIGINAL_VERCEL_STATUS_ELIGIBLE'||
     !/^work:[a-f0-9]{32}$/.test(proof.original_work_id||'')||
     !/^[a-f0-9-]{36}$/.test(proof.attempt_id||'')||
     !/^[a-f0-9-]{36}$/.test(proof.shift_id||'')||
     !SHA.test(proof.canary_commit_sha||'')||
     !SHA.test(proof.unchanged_source_blob_sha||'')||
     !SHA.test(proof.inert_probe_blob_sha||'')||
     !BRANCH.test(proof.target_branch||'')||
     proof.target_branch.startsWith('reality/riley/')||
     SOURCE.test(proof.original_source_path||'')===false||
     PROBE.test(proof.inert_probe_path||'')===false||
     proof.installation_authorized!==false||
     proof.original_job_completed!==false||
     proof.production_changed!==false)
    fail('CURRENT_EXACT_CANARY_AND_UNINSTALLED_ORIGINAL_REQUIRED');
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)return safe('GITHUB_INDEPENDENT_PROVIDER_CREDENTIAL_UNVERIFIED');
  // Vercel must have reported the same immutable canary SHA through its
  // GitHub App, independently of Reality's own test conclusions.
  const [status,gitRef,src,probe]=await Promise.all([
   github(token,'/commits/'+proof.canary_commit_sha+'/status'),
   github(token,'/git/ref/heads/'+proof.target_branch),
   github(token,'/contents/'+proof.original_source_path+'?ref='+
    proof.canary_commit_sha),
   github(token,'/contents/'+proof.inert_probe_path+'?ref='+
    proof.canary_commit_sha)
  ]);
  if(status.sha!==proof.canary_commit_sha||
     !Array.isArray(status.statuses)||
     !SHA.test(gitRef.object?.sha||'')||
     gitRef.ref!=='refs/heads/'+proof.target_branch||
     src.path!==proof.original_source_path||
     src.sha!==proof.unchanged_source_blob_sha||
     probe.path!==proof.inert_probe_path||
     probe.sha!==proof.inert_probe_blob_sha)
   fail('CANARY_SOURCE_AND_VERCEL_COMMIT_READBACK_DRIFT');
  const named=status.statuses.filter(x=>x?.context==='Vercel');
  if(named.length!==1)
   return safe('VERCEL_OFFICIAL_INTEGRATION_STATUS_NOT_UNAMBIGUOUS');
  const vercel=named[0];
  if(vercel.state!=='success')
   return safe('VERCEL_PROVIDER_STATUS_NOT_SUCCESS');
  if(!VERCEL_DEPLOYMENT_URL.test(vercel.target_url||''))
   return safe('VERCEL_PROVIDER_OFFICIAL_DEPLOYMENT_URL_MISMATCH');
  // The GitHub/Vercel integration has two recognized provenance forms:
  // the Vercel GitHub App bot, or Vercel's own named service user.
  // Other users, similarly named bots and arbitrary green statuses fail.
  const officialBot=vercel.creator?.type==='Bot'&&
   vercel.creator.login==='vercel[bot]';
  const officialServiceUser=vercel.creator?.type==='User'&&
   vercel.creator.login==='vercel';
  let officialAppCheck=null;
  if(!officialBot&&!officialServiceUser){
   // An official Vercel GitHub App check is an independently issued
   // GitHub object whose app.slug cannot be set by a normal commit actor.
   // It complements, never REPLACES, the exact Vercel deployment-success
   // status and the original source-readback.
   const checks=await github(token,'/commits/'+proof.canary_commit_sha+
    '/check-runs?per_page=100');
   if(!Array.isArray(checks.check_runs))
    return safe('VERCEL_OFFICIAL_APP_CHECK_SURFACE_UNVERIFIED');
   const vercelChecks=checks.check_runs.filter(c=>
    c.head_sha===proof.canary_commit_sha&&
    c.name==='Vercel Preview Comments'&&
    c.status==='completed'&&c.conclusion==='success'&&
    c.app?.slug==='vercel'&&
    Number.isSafeInteger(c.app.id)&&c.app.id>0&&
    Number.isSafeInteger(c.id)&&c.id>0);
   if(vercelChecks.length!==1)
    return safe('VERCEL_OFFICIAL_APP_AND_SUCCESS_STATUS_CORRELATION_MISSING');
   officialAppCheck=vercelChecks[0];
  }
  if(!Number.isSafeInteger(vercel.id)||vercel.id<=0)
   return safe('VERCEL_PROVIDER_STATUS_ID_NOT_VERIFIED');
  // Source check at current GitHub head protects against an unrelated
  // interim source installation while the immutable canary was deploying.
  const live=await github(token,'/contents/'+proof.original_source_path+
   '?ref='+encodeURIComponent(proof.target_branch));
  if(live.sha!==proof.unchanged_source_blob_sha||
     live.path!==proof.original_source_path)
   fail('GITHUB_OWNER_SOURCE_CHANGED_DURING_DEPLOYMENT_PROOF');
  const attestationRpc=officialAppCheck?
   'reality_record_generalized_original_auto_deploy_app_receipt_v2':
   'reality_record_generalized_original_auto_deploy_receipt_v1';
  const attestationArgs=officialAppCheck?{
   p_attempt_id:proof.attempt_id,
   p_canary_commit_sha:proof.canary_commit_sha,
   p_github_vercel_status_id:vercel.id,
   p_vercel_app_check_run_id:officialAppCheck.id,
   p_vercel_app_id:officialAppCheck.app.id,
   p_vercel_deployment_url:vercel.target_url
  }:{
   p_attempt_id:proof.attempt_id,
   p_canary_commit_sha:proof.canary_commit_sha,
   p_github_vercel_status_id:vercel.id,
   p_github_vercel_creator:vercel.creator.login,
   p_vercel_deployment_url:vercel.target_url
  };
  const saved=await rpc(db,key,attestationRpc,attestationArgs);
  if(saved.status!==(officialAppCheck?
      'GENERALIZED_VERCEL_APP_CORRELATED_EXACT_DEPLOY_STATUS_VERIFIED':
      'GENERALIZED_PREVIEW_AUTO_DEPLOY_GITHUB_VERCEL_STATUS_VERIFIED')||
     saved.attempt_id!==proof.attempt_id||
     saved.original_work_id!==proof.original_work_id||
     saved.shift_id!==proof.shift_id||
     saved.canary_commit_sha!==proof.canary_commit_sha||
     saved.vercel_deployment_url!==vercel.target_url||
     (officialAppCheck&&(saved.official_vercel_app_check_run_id!==officialAppCheck.id||
       saved.official_vercel_app_id!==officialAppCheck.app.id))||
     saved.preview_auto_deploy_verified!==true||
     saved.isolated_github_write_verified!==true||
     saved.same_original_execution_and_settlement_contract_verified!==false||
     saved.owner_approval_ready!==false||
     saved.installation_authorized!==false||
     saved.original_job_completed!==false||
     saved.production_changed!==false)
   fail('PROVIDER_DEPLOY_STATUS_NOT_ATOMICALLY_RECORDED');
  return safe(saved.status,{
   original_work_id:proof.original_work_id,
   shift_id:proof.shift_id,attempt_id:proof.attempt_id,
   canary_commit_sha:proof.canary_commit_sha,
   github_vercel_status_id:vercel.id,
   ...(officialAppCheck?{official_vercel_app_check_run_id:officialAppCheck.id,
     official_vercel_app_id:officialAppCheck.app.id}:{}),
   vercel_deployment_url:vercel.target_url,
   preview_auto_deploy_verified:true,
   isolated_github_write_verified:true
  });
 }catch(e){
  const value=e instanceof Error?e.message:'';
  const status=/^GENERALIZED_PREVIEW_DEPLOY_[A-Z0-9_]{5,105}$/.test(value)?
   value.slice('GENERALIZED_PREVIEW_DEPLOY_'.length):
   'ORIGINAL_GIT_VERIFIED_DEPLOYMENT_READBACK_UNAVAILABLE';
  return safe(status,{},503);
 }
});