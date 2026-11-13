// Reality-owned ONE inert preview push, via the existing GitHub broker token.
// This only tests the existing GitHub Actions and Git→Vercel auto-deploy path.
// It cannot approve, install or settle any native engineering candidate.
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const fail=x=>{throw Error('NATIVE263_AUTO_DEPLOY_PROBE_'+x)};
const safe=(status,extra={})=>Object.freeze({
 status,original_work_id:WORK,shift_id:SHIFT,
 installation_authorized:false,source_installed:false,
 original_job_completed:false,production_changed:false,
 actual_vercel_deployment_verified:false,
 ...extra
});
export async function executeNative263GovernedPreviewAutoDeployTrigger({
 db,env=process.env,graph,sourcePreflight,installWarrant,
 liveInstallerFence,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  typeof db.secretKey!=='string'||db.secretKey.length<25||
  graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  graph.shift_id!==SHIFT||graph.installation_authorized!==false||
  graph.production_changed!==false||
  !Array.isArray(graph.jobs)||
  graph.jobs.filter(j=>j.original_work_id===WORK&&
   j.phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'&&
   j.independent_source_proof_verified===true).length!==1||
  sourcePreflight?.status!=='NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED'||
  sourcePreflight.original_work_id!==WORK||
  sourcePreflight.existing_file_baseline_verified!==true||
  installWarrant?.status!=='EXACT_NATIVE263_OWNER_WARRANT_STAGED_INSTALL_BLOCKED'||
  installWarrant.original_work_id!==WORK||
  installWarrant.installation_authorized!==false||
  installWarrant.owner_approval_ready!==false||
  liveInstallerFence?.status!=='NATIVE263_EXACT_OWNER_APPROVAL_SERVICE_FENCE_LIVE_VERIFIED'||
  liveInstallerFence.installation_authorized!==false||
  liveInstallerFence.source_installed!==false)
  fail('SAME_ORIGINAL_PREAPPROVAL_AND_SOURCE_SCOPE_REQUIRED');
 let r;
 try{
  r=await fetchImpl(db.url+
   '/functions/v1/reality-native263-preview-auto-deploy-trigger-v1',{
    method:'POST',cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(17500),
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     accept:'application/json','content-type':'application/json'},
    body:'{"version":1,"action":"probe_existing_preview_auto_deploy"}'
   });
 }catch{return safe('REALITY_PREVIEW_AUTO_DEPLOY_BROKER_UNREACHABLE')}
 let d;try{d=await r.json()}catch{
  return safe('REALITY_PREVIEW_AUTO_DEPLOY_RESPONSE_INVALID');
 }
 if(!d||typeof d!=='object'||Array.isArray(d)||
    d.original_work_id!==WORK||d.shift_id!==SHIFT||
    d.installation_authorized!==false||d.source_installed!==false||
    d.original_job_completed!==false||d.production_changed!==false)
  fail('BROKER_ORIGINAL_SCOPE_OR_EFFECT_CLAIM_INVALID');
 if(!r.ok)return safe('REALITY_PREVIEW_AUTO_DEPLOY_FENCED_OR_BLOCKED');
 if(!['REALITY_GOVERNED_PREVIEW_GIT_PUSH_VERIFIED',
  'ACTIVE_PREVIEW_PROBE_ALREADY_FENCED_NO_REPOST',
  'REALITY_GOVERNED_PREVIEW_GIT_PUSH_BLOCKED'].includes(d.status))
  return safe('REALITY_PREVIEW_AUTO_DEPLOY_UNEXPECTED_PROVIDER_STATUS');
 if(d.git_write_verified===true&&
    !/^[a-f0-9]{40}$/.test(d.github_commit_sha||''))
  fail('VERIFIED_GIT_PUSH_REQUIRES_EXACT_PROVIDER_COMMIT');
 return safe(d.status,{
  github_push_verified:d.git_write_verified===true,
  github_commit_sha:d.github_commit_sha||null,
  github_http_status:d.github_http_status||null,
  github_actions_trigger_verified:false,
  actual_vercel_deployment_verified:false,
  probe_file:'evidence/native263-active-preview-auto-deploy-probe-20261112.json',
  approval_still_required:true
 });
}
