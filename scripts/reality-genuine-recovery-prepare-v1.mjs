// Safe, source-backed recovery of an already-consumed owner approval.
// Never retries installation. Only the signed service-side state chooses work.
import {appendFileSync} from 'node:fs';
const env=process.env;
const fail=x=>{throw Error('GENUINE_MONITOR_RECOVERY_PREPARE_'+x)};
const REPO='maloney2323/Reality',BRANCH='feature/reality-general-capability-engine-20261101';
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=='refs/heads/'+BRANCH||
 !/^[a-f0-9]{40}$/.test(String(env.GITHUB_SHA||'')))fail('SIGNED_WORKFLOW_CONTEXT_REQUIRED');
if(!env.REALITY_INSTALL_READ_TOKEN||!env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)
 fail('SIGNED_PROVIDER_AUTH_MISSING');
const u=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
u.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const id=await fetch(u,{cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
if(!id.ok)fail('SIGNED_IDENTITY_UNAVAILABLE');
const jwt=(await id.json()).value;
if(typeof jwt!=='string'||jwt.length<300)fail('SIGNED_IDENTITY_INVALID');
const response=await fetch('https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
 'x-reality-github-provider-token':env.REALITY_INSTALL_READ_TOKEN},
 body:JSON.stringify({action:'installer_recover_prepare',
 scope:{repository_sha:env.GITHUB_SHA}})});
const result=await response.json().catch(()=>null);
if(!response.ok||result?.ok!==true)fail('SIGNED_RECOVERY_BROKER_'+
 String(result?.error||'UNAVAILABLE').slice(0,80));
if(result.status==='NO_CONSUMED_INSTALL_AWAITING_RECONCILIATION'){
 appendFileSync(env.GITHUB_OUTPUT,'recover=false\n');
 console.log('REALITY_NO_CONSUMED_APPROVAL_TO_RECOVER');process.exit(0);
}
if(result.status!=='CONSUMED_APPROVAL_READY_FOR_INDEPENDENT_RECOVERY'||
 !/^work:[a-f0-9]{32}$/.test(result.original_work_id)||
 !/^[0-9]{8,17}$/.test(result.installer_run_id)||
 !/^[a-f0-9]{40}$/.test(result.installer_source_sha)||
 !/^[a-f0-9]{64}$/.test(result.artifact_sha256)||
 !/^[a-f0-9]{40}$/.test(result.installed_commit_sha)||
 result.recovery_run_id!==env.GITHUB_RUN_ID||
 result.recovery_source_sha!==env.GITHUB_SHA||
 result.installation_replay_authorized!==false||
 result.original_job_completed!==false||result.production_changed!==false)
 fail('PREPARED_RECOVERY_SCOPE_INCONSISTENT');
for(const [k,v] of [
 ['recover','true'],['installer_run_id',result.installer_run_id],
 ['installer_source_sha',result.installer_source_sha],
 ['original_work_id',result.original_work_id],
 ['installed_commit_sha',result.installed_commit_sha],
 ['artifact_hash',result.artifact_sha256]]){
 appendFileSync(env.GITHUB_OUTPUT,k+'='+v+'\n');
}
console.log('REALITY_CONSUMED_INSTALL_RECOVERY_PREPARED',JSON.stringify({
 original_work_id:result.original_work_id,
 installer_run_id:result.installer_run_id,
 installed_commit_sha:result.installed_commit_sha,
 original_job_completed:false,production_changed:false}));
