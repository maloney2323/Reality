// Resume the SAME owner-approved customer job in offline isolated execution.
// GitHub OIDC authorizes broker readback and one-time original-work claim.
import {readFileSync,writeFileSync,mkdirSync,existsSync,appendFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const env=process.env, repo='maloney2323/Reality';
const fail=x=>{throw Error('REALITY_ORIGINAL_RESUME_'+x)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const output=(v)=>{if(env.GITHUB_OUTPUT)appendFileSync(env.GITHUB_OUTPUT,'performed='+v+'\n')};
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
  env.GITHUB_REPOSITORY!==repo||
  env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||''))fail('ISOLATED_SIGNED_WORKFLOW_ONLY');
const token=env.GH_TOKEN;
if(typeof token!=='string'||token.length<20)fail('GITHUB_READ_TOKEN_REQUIRED');
async function github(path,readText=false){
 const r=await fetch('https://api.github.com/repos/'+repo+path,{cache:'no-store',
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28','user-agent':'Reality-original-job-resume-v1'}});
 if(!r.ok)fail('GITHUB_PROVIDER_READ_'+r.status);
 return readText?await r.text():await r.json();
}
async function broker(action,scope,proof){
 const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
 url.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
 const r=await fetch(url,{cache:'no-store',headers:{
  authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
 if(!r.ok)fail('SIGNED_GITHUB_WORKFLOW_IDENTITY_MISSING');
 const jwt=(await r.json()).value;
 if(typeof jwt!=='string'||jwt.length<300)fail('SIGNED_GITHUB_IDENTITY_INVALID');
 const b=await fetch('https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
   'x-reality-github-provider-token':token},
  body:JSON.stringify({action,scope:{repository_sha:env.GITHUB_SHA,...scope},
   ...(proof?{proof}:{})})});
 const result=await b.json().catch(()=>null);
 if(!b.ok||result?.ok!==true)fail('BROKER_'+String(result?.error||'REJECTED').slice(0,90));
 return result;
}
const ready=await broker('original_prepare');
if(['NO_ELIGIBLE_ORIGINAL','ALREADY_SETTLED','RESUMPTION_ALREADY_CLAIMED_NO_REPLAY'].includes(ready.status)){
 console.log('REALITY_ORIGINAL_RESUME_NO_NEW_WORK',ready.status);
 output('false');process.exit(0);
}
if(ready.status!=='ACCEPTED_FOR_ISOLATED_RESUMPTION'||
   ready.original_work_id!==ready.acceptance_receipt?.original_work_id||
   ready.acceptance_receipt?.full_probation_complete!==false||
   ready.acceptance_receipt?.original_job_completed!==false||
   ready.installed_commit_sha!==ready.acceptance_receipt?.installed_commit_sha||
   !/^[a-f0-9]{64}$/.test(ready.frozen_test_sha256||''))
 fail('DURABLE_ORIGINAL_ACCEPTANCE_INVALID');
const claim=await broker('original_claim',{trigger_id:ready.trigger_id});
if(claim.status!=='RESUMPTION_CLAIMED'||
 claim.original_work_id!==ready.original_work_id||
 claim.installed_commit_sha!==ready.installed_commit_sha||
 claim.original_job_completed!==false)fail('SINGLE_USE_ORIGINAL_CLAIM_REQUIRED');
const older=await github('/actions/runs/'+ready.original_failed_run_id);
const oldJob=await github('/actions/jobs/'+ready.original_failed_job_id);
if(older.id!==Number(ready.original_failed_run_id)||
 older.head_sha!==ready.original_source_sha||
 older.status!=='completed'||older.conclusion!=='failure'||
 oldJob.id!==Number(ready.original_failed_job_id)||
 oldJob.run_id!==older.id||oldJob.conclusion!=='failure')
 fail('ACTUAL_ORIGINAL_PROVIDER_FAILURE_REQUIRED');
const oldLog=await github('/actions/jobs/'+oldJob.id+'/logs',true);
if(!oldLog.includes('ERR_MODULE_NOT_FOUND')||
 !oldLog.includes('reality-ci-failure-evidence.mjs'))
 fail('ORIGINAL_PROVIDER_FAILURE_LOG_NOT_REPRODUCED');
const originalTest=readFileSync(ready.frozen_test_path);
if(sha(originalTest)!==ready.frozen_test_sha256)
 fail('IMMUTABLE_ORIGINAL_FROZEN_TEST_CHANGED');
async function installedFile(path){
 if(!/^(?:src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs|test\/reality-extensions\/[A-Za-z0-9._/-]+\.test\.js)$/.test(path)||
    path.includes('..')||existsSync(path))fail('INSTALLED_FILE_PATH_UNSAFE');
 const result=await github('/contents/'+path+'?ref='+ready.installed_commit_sha);
 if(result.path!==path||result.encoding!=='base64')fail('INSTALLED_SOURCE_MISSING');
 const contents=Buffer.from(result.content.replace(/\s/g,''),'base64');
 mkdirSync(dirname(path),{recursive:true});writeFileSync(path,contents,{flag:'wx'});
}
await installedFile(ready.source_path);
const generatedTest='test/reality-extensions/reality-ci-failure-evidence.test.js';
await installedFile(generatedTest);
const suite=[ready.frozen_test_path,generatedTest];
const command=['run','--rm','--network','none','--read-only','--cap-drop','ALL',
 '--security-opt','no-new-privileges','--memory','512m','--cpus','1',
 '--user','65534:65534','--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
 '-v',process.cwd()+':/work:ro','-w','/work','node:22','node',
 '--test','--test-reporter=tap',...suite];
const exec=spawnSync('docker',command,{encoding:'utf8',timeout:180000,maxBuffer:300000,
 env:{PATH:env.PATH,HOME:env.HOME}});
const log=String(exec.stdout||'')+'\n'+String(exec.stderr||'');
const last=n=>{const found=[...log.matchAll(new RegExp('^# '+n+' (\\d+)$','gm'))].at(-1);return found?Number(found[1]):0;};
if(exec.status!==0||last('tests')<7||last('fail')!==0||
 last('tests')!==last('pass'))fail('ORIGINAL_FROZEN_ACCEPTANCE_NOT_GREEN');
const module=await import('../'+ready.source_path);
if(typeof module.classifyVerifiedCiFailure!=='function')fail('INSTALLED_CAPABILITY_EXPORT_MISSING');
const evidence={
 owner_id:'owner:'+ready.owner_id,goal_id:ready.goal_id,
 original_work_id:ready.original_work_id,repository:repo,
 source:'GITHUB_ACTIONS_INDEPENDENT_PROVIDER_READBACK',
 provider_readback_verified:true,original_goal_verified:true,
 repository_base_sha:ready.original_source_sha,
 run_head_sha:ready.original_source_sha,latest_head_sha:ready.original_source_sha,
 run_id:older.id,job_id:oldJob.id,run_status:older.status,
 run_conclusion:older.conclusion,
 run_url:'https://github.com/'+repo+'/actions/runs/'+older.id,
 failure_log_sha256:sha(oldLog),error_code:'ERR_MODULE_NOT_FOUND',
 missing_capability_id:'reality.ci-failure-evidence-v1',
 current_capability_registry_status:'ABSENT',
 frozen_regression_manifest_ref:'first-ci-evidence-gap-v1',
 frozen_regression_sha256:ready.frozen_test_sha256,
 source_receipt_ref:'github:actions:run:'+older.id+':job:'+oldJob.id+':verified',
 superseding_success:null};
const disposition=module.classifyVerifiedCiFailure(evidence);
if(disposition?.decision!=='MISSING_CAPABILITY'||
 disposition?.original_work_id!==ready.original_work_id||
 disposition?.can_generate_candidate!==true||
 disposition?.installation_authorized!==false||
 disposition?.original_job_completed!==false||
 disposition?.production_changed!==false)
 fail('ACTUAL_ORIGINAL_PROVIDER_CLASSIFICATION_FAILED');
const proof={
 schema:'reality-original-job-execution-proof-v1',
 original_work_id:ready.original_work_id,
 trigger_id:ready.trigger_id,approval_id:ready.approval_id,
 artifact_sha256:ready.artifact_sha256,installed_commit_sha:ready.installed_commit_sha,
 github_run_id:env.GITHUB_RUN_ID,
 original_provider_run_id:older.id,original_provider_job_id:oldJob.id,
 original_provider_failure_verified:true,
 original_failure_log_sha256:sha(oldLog),
 classification:disposition.decision,
 frozen_suite_passed:true,frozen_suite_tests:last('tests'),
 frozen_suite_output_sha256:sha(log),
 isolated_execution:true,production_changed:false,
 provider_outcome_digest:sha(log+'|'+ready.installed_commit_sha+'|'+oldJob.id+'|'+disposition.decision),
 full_probation_complete:false,original_job_completed:true
};
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-original-resumption.json',JSON.stringify(proof,null,2)+'\n');
console.log('REALITY_ORIGINAL_JOB_PROVIDER_EXECUTION_PASSED',JSON.stringify({
 original_work_id:proof.original_work_id,installed_commit_sha:proof.installed_commit_sha,
 frozen_suite_tests:proof.frozen_suite_tests,classification:proof.classification,
 original_provider_run_id:proof.original_provider_run_id,production_changed:false,
 database_settlement_recorded:false
}));
output('true');
