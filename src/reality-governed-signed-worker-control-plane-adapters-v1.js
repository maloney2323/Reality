// Trusted service-side Supabase/Vercel adapters for the independent release
// control plane. No LLM callbacks, browser credentials, arbitrary endpoints,
// automatic alias retries or owner-approval fabrication.
const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const BRANCH=/^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$/;
const HOST=/^[a-z0-9-]{6,145}\.vercel\.app$/;
const ID=/^[A-Za-z0-9_-]{8,80}$/;
const REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ROUTE='/api/reality/governed-employee-shift-worker';
const KEY=/^[A-Z][A-Z0-9_]{3,110}$/;
const projectRef=url=>{
 try{
  const u=new URL(url);
  const m=/^([a-z0-9]{16,32})\.supabase\.co$/.exec(u.hostname);
  return u.protocol==='https:'&&u.pathname==='/'&&
   !u.search&&!u.hash?m?.[1]??null:null;
 }catch{return null}
};
function validEnv(env,db){
 return env.VERCEL_ENV==='preview'&&
  env.REALITY_GOVERNED_RELEASE_SWITCH_TRIGGER_ENABLED==='true'&&
  env.REALITY_SIGNED_CAPABILITY_DELIVERY_ENABLED==='true'&&
  db?.strictSecrets===true&&
  typeof db.secretKey==='string'&&db.secretKey.length>=20&&
  db.project===projectRef(db.url)&&
  db.project===env.REALITY_RELEASE_CONTROL_DB_PROJECT_REF&&
  REPO.test(env.REALITY_VERIFIED_GITHUB_REPOSITORY||'')&&
  ID.test(env.REALITY_VERIFIED_VERCEL_PROJECT_ID||'')&&
  ID.test(env.REALITY_VERIFIED_VERCEL_TEAM_ID||'')&&
  typeof env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN==='string'&&
  env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN.length>=20&&
  Number.isSafeInteger(Number(env.REALITY_SIGNED_WORKER_CRON_JOB_ID))&&
  Number(env.REALITY_SIGNED_WORKER_CRON_JOB_ID)>0&&
  HOST.test(env.REALITY_SIGNED_WORKER_STABLE_ALIAS||'')&&
  !env.REALITY_SIGNED_WORKER_STABLE_ALIAS.startsWith('reality-git-')&&
  ID.test(env.REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID||'')&&
  SHA.test(env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||'')&&
  BRANCH.test(env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF||'')&&
  !env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF.includes('..');
}
async function requestJson(fetchImpl,url,init,timeout=7000){
 const controller=new AbortController();
 const t=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetchImpl(url,{
   ...init,signal:controller.signal,redirect:'error',
   cache:'no-store'
  });
  if(!response?.ok)throw Error('RELEASE_CONTROL_PROVIDER_REQUEST_NOT_OK');
  const data=await response.json();
  if(!data||typeof data!=='object'||Array.isArray(data))
   throw Error('RELEASE_CONTROL_PROVIDER_RESPONSE_INVALID');
  return data;
 }finally{clearTimeout(t)}
}
export function createTrustedSignedWorkerReleaseControlPlaneAdapters({
 env=process.env,db,fetchImpl=fetch
}={}){
 if(typeof fetchImpl!=='function'||!validEnv(env,db))
  return Object.freeze({
   status:'RELEASE_CONTROL_TRUSTED_PROVIDER_CONFIG_NOT_READY',
   ready:false,read_only:true,owner_approval_granted:false,
   provider_assignment_attempted:false
  });
 const team=encodeURIComponent(env.REALITY_VERIFIED_VERCEL_TEAM_ID);
 const api='https://api.vercel.com';
 const providerHeaders={
  Authorization:'Bearer '+env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN,
  Accept:'application/json'
 };
 const dbHeaders={
  apikey:db.secretKey,Authorization:'Bearer '+db.secretKey,
  'Content-Type':'application/json',Accept:'application/json'
 };
 const serviceRpc=async(name,payload)=>{
  // Static allowlist: never put caller input into an RPC pathname.
  if(!['reality_read_governed_worker_release_schedule_v1',
    'reality_claim_governed_signed_worker_release_v1',
    'reality_read_governed_signed_worker_release_approval_v1'].includes(name))
   throw Error('RELEASE_CONTROL_RPC_NOT_ALLOWLISTED');
  return requestJson(fetchImpl,db.url+'rest/v1/rpc/'+name,{
   method:'POST',headers:dbHeaders,body:JSON.stringify(payload)
  });
 };
 const deployment=async id=>{
  if(!ID.test(id||''))throw Error('RELEASE_DEPLOYMENT_ID_UNVERIFIED');
  const d=await requestJson(fetchImpl,
   api+'/v13/deployments/'+encodeURIComponent(id)+'?teamId='+team,
   {method:'GET',headers:providerHeaders});
  const info=d.deployment??d;
  const expectedRepo=env.REALITY_VERIFIED_GITHUB_REPOSITORY.split('/');
  if(info.id!==id||
    (info.project?.id??info.projectId)!==env.REALITY_VERIFIED_VERCEL_PROJECT_ID||
    info.meta?.githubOrg!==expectedRepo[0]||
    info.meta?.githubRepo!==expectedRepo[1]||
    !SHA.test(info.meta?.githubCommitSha||'')||
    !BRANCH.test(info.meta?.githubCommitRef||'')||
    info.state!=='READY'||info.target==='production')
   throw Error('RELEASE_PROVIDER_PROJECT_OR_COMMIT_UNVERIFIED');
  return info;
 };
 async function observeAlias(host){
  if(!HOST.test(host||''))throw Error('RELEASE_ALIAS_HOST_UNVERIFIED');
  const a=await requestJson(fetchImpl,
   api+'/v4/aliases/'+encodeURIComponent(host)+'?teamId='+team,
   {method:'GET',headers:providerHeaders});
  if(a.alias!==host||
    a.projectId!==env.REALITY_VERIFIED_VERCEL_PROJECT_ID||
    !ID.test(a.deploymentId||''))
   throw Error('RELEASE_ALIAS_PROJECT_BINDING_UNVERIFIED');
  const d=await deployment(a.deploymentId);
  return Object.freeze({
   provider:'VERCEL',independently_observed:true,
   project_verified:true,preview_only:true,alias:host,
   deployment_id:d.id,resolved_release_sha:d.meta.githubCommitSha,
   resolved_branch:d.meta.githubCommitRef
  });
 }
 async function readSchedule(){
  const info=await serviceRpc('reality_read_governed_worker_release_schedule_v1',{
   p_job_id:Number(env.REALITY_SIGNED_WORKER_CRON_JOB_ID)
  });
  if(info.status!=='GOVERNED_RELEASE_CRON_SCHEDULE_READ_ONLY'||
   info.job_id!==Number(env.REALITY_SIGNED_WORKER_CRON_JOB_ID)||
   info.provider!=='SUPABASE_PG_CRON'||
   info.active!==true||info.method!=='POST'||
   info.endpoint_path!==ROUTE||!HOST.test(info.host||'')||
   typeof info.schedule!=='string'||
   info.credential_values_exposed!==false)
   throw Error('RELEASE_SCHEDULE_INDEPENDENT_DB_READBACK_UNVERIFIED');
  // A parsed DB hostname is not sufficient: verify the actual provider
  // alias resolves to the configured project and a READY preview commit.
  const alias=await observeAlias(info.host);
  if(!alias.project_verified)throw Error('SCHEDULE_PROVIDER_UNVERIFIED');
  return Object.freeze({
   status:'GOVERNED_SCHEDULE_INDEPENDENTLY_READ',
   job_id:info.job_id,provider:'SUPABASE_PG_CRON',
   host:info.host,active:true,schedule:info.schedule,
   method:'POST',endpoint_path:ROUTE,
   credential_values_exposed:false,
   signed_worker_target_verified:true,
   branch_automanaged:info.host.startsWith('reality-git-'),
   dedicated_stable_release_alias:
    info.host===env.REALITY_SIGNED_WORKER_STABLE_ALIAS
  });
 }
 async function readApprovedRelease({
  owner_id,shift_id,release_sha,scheduled_alias,capability_key
 }={}){
  if(!UUID.test(owner_id||'')||!UUID.test(shift_id||'')||
   release_sha!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||
   scheduled_alias!==env.REALITY_SIGNED_WORKER_STABLE_ALIAS||
   !KEY.test(capability_key||''))
   throw Error('SIGNED_RELEASE_APPROVAL_READ_SCOPE_UNVERIFIED');
  const approval=await serviceRpc(
   'reality_read_governed_signed_worker_release_approval_v1',{
    p_owner_id:owner_id,p_shift_id:shift_id,
    p_release_sha:release_sha,p_scheduled_alias:scheduled_alias,
    p_capability_key:capability_key
   });
  return approval;
 }
 async function claimApprovedRelease({
  owner_id,shift_id,release_sha,release_ref,capability_key,
  scheduled_alias,previous_release_sha,previous_release_ref,
  independent_ci_run_id
 }={}){
  if(!UUID.test(owner_id||'')||!UUID.test(shift_id||'')||
   !SHA.test(release_sha||'')||!BRANCH.test(release_ref||'')||
   !SHA.test(previous_release_sha||'')||
   !BRANCH.test(previous_release_ref||'')||
   !KEY.test(capability_key||'')||
   scheduled_alias!==env.REALITY_SIGNED_WORKER_STABLE_ALIAS||
   release_sha!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||
   release_ref!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF||
   !Number.isSafeInteger(independent_ci_run_id)||
   independent_ci_run_id<1)
   throw Error('RELEASE_OWNER_CLAIM_EXACT_INPUT_UNVERIFIED');
  return serviceRpc('reality_claim_governed_signed_worker_release_v1',{
   p_owner_id:owner_id,p_shift_id:shift_id,p_release_sha:release_sha,
   p_release_ref:release_ref,p_capability_key:capability_key,
   p_scheduled_alias:scheduled_alias,
   p_previous_release_sha:previous_release_sha,
   p_previous_release_ref:previous_release_ref,
   p_independent_ci_run_id:independent_ci_run_id
  });
 }
 async function assignAlias({
  alias,release_sha,release_ref,owner_id,shift_id,capability_key,claim_id
 }={}){
  if(alias!==env.REALITY_SIGNED_WORKER_STABLE_ALIAS||
   release_sha!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||
   release_ref!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF||
   !UUID.test(owner_id||'')||!UUID.test(shift_id||'')||
   !UUID.test(claim_id||'')||!KEY.test(capability_key||''))
   throw Error('RELEASE_PROVIDER_ASSIGNMENT_SCOPE_UNVERIFIED');
  const id=env.REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID;
  const target=await deployment(id);
  if(target.meta.githubCommitSha!==release_sha||
   target.meta.githubCommitRef!==release_ref)
   throw Error('RELEASE_PROVIDER_PINNED_DEPLOYMENT_DRIFT');
  // Exactly one provider POST after the caller consumed a database-backed
  // one-use approval. No retry here, including on timeout.
  const result=await requestJson(fetchImpl,
   api+'/v2/deployments/'+encodeURIComponent(id)+'/aliases?teamId='+team,{
    method:'POST',headers:{...providerHeaders,
     'Content-Type':'application/json'},
    body:JSON.stringify({alias})
   });
  if(result.alias!==alias)throw Error('RELEASE_PROVIDER_ASSIGNMENT_ACK_UNVERIFIED');
  return Object.freeze({provider:'VERCEL',alias,release_sha,claim_id});
 }
 return Object.freeze({
  status:'TRUSTED_SIGNED_WORKER_RELEASE_ADAPTERS_CONFIGURED',
  ready:true,read_only:false,
  readSchedule,observeAlias,readApprovedRelease,claimApprovedRelease,assignAlias,
  owner_approval_granted:false,provider_assignment_attempted:false
 });
}
