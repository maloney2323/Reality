// This job runs only AFTER a distinct GitHub Action has independently passed
// post-install offline probation. It cannot grant owner approval or settle.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const env=process.env;
const fail=x=>{throw Error('REALITY_PROBATION_RECORD_'+x)};
if(env.GITHUB_ACTIONS!=='true'||
 !['push','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||
 env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101')
 fail('SIGNED_ORIGINAL_WORKFLOW_REQUIRED');
const install=JSON.parse(readFileSync(
 'artifact/install/reality-owner-approved-preview-install.json','utf8'));
const monitor=JSON.parse(readFileSync(
 'artifact/monitor/reality-independent-installed-preview-activation.json','utf8'));
const installerRun=env.REALITY_RECOVERY_MODE==='true'?
 env.REALITY_RECOVERY_INSTALL_RUN_ID:env.GITHUB_RUN_ID;
const installerSha=env.REALITY_RECOVERY_MODE==='true'?
 env.REALITY_RECOVERY_SOURCE_SHA:env.GITHUB_SHA;
if(!/^[0-9]{8,17}$/.test(String(installerRun||''))||
 !/^[a-f0-9]{40}$/.test(String(installerSha||''))||
 (env.REALITY_RECOVERY_MODE==='true'&&
  (installerRun===env.GITHUB_RUN_ID||installerSha===env.GITHUB_SHA)))
 fail('RECOVERY_CANNOT_REPEAT_OLD_INSTALL');
if(install.original_work_id!==monitor.original_work_id||
 install.installed_commit_sha!==monitor.installed_commit_sha||
 install.artifact_sha256!==monitor.artifact_sha256||
 install.source_sha!==installerSha||
 monitor.source_sha!==installerSha||
 install.installer_run_id!==installerRun||
 monitor.independent_run_id!==env.GITHUB_RUN_ID||
 monitor.independent_runner_sha!==env.GITHUB_SHA||
 monitor.all_passed!==true||
 monitor.probation_isolated_monitoring_executions!==5||
 monitor.original_job_settled!==false||
 install.production_changed!==false)
 fail('INDEPENDENT_ACTIVATION_MONITOR_MISMATCH');
const issuer=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
issuer.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const r=await fetch(issuer,{cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
if(!r.ok)fail('GITHUB_SIGNED_IDENTITY_UNAVAILABLE');
const jwt=(await r.json()).value;
if(typeof jwt!=='string'||jwt.length<300)fail('SIGNED_RUN_MISSING');
const token=env.REALITY_INSTALL_READ_TOKEN;
if(typeof token!=='string'||token.length<20)
 fail('PROVIDER_READ_AUTHORITY_MISSING');
const url='https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit';
const response=await fetch(url,{method:'POST',cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
  'x-reality-github-provider-token':token},
 body:JSON.stringify({action:'installer_record_activation',
  scope:{repository_sha:env.GITHUB_SHA},install,monitor})});
const result=await response.json().catch(()=>null);
if(!response.ok||result?.ok!==true||
 result.status!=='ISOLATED_INSTALLED_PROBATION'||
 result.original_work_id!==install.original_work_id||
 result.installed_commit_sha!==install.installed_commit_sha||
 result.monitored_executions!==5||
 result.original_job_completed!==false||
 result.production_changed!==false)
 fail('SIGNED_PROBATION_PROVIDER_'+
  String(result?.error||'UNAVAILABLE').slice(0,95));
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-durable-preview-activation.json',
 JSON.stringify(result,null,2)+'\n');
console.log('REALITY_INSTALLED_AND_PROBATION_DURABLY_VERIFIED',JSON.stringify({
 original_work_id:result.original_work_id,phase:result.status,
 installed_commit_sha:result.installed_commit_sha,
 monitored_executions:result.monitored_executions,
 original_job_completed:false,production_changed:false
}));
