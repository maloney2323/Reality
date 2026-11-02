// Independent post-install preview activation monitor. Reads installed bytes
// from GitHub, executes only in an offline, read-only, credential-free sandbox.
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {deriveGenuineActivationSuite} from '../src/reality-genuine-activation-suite-v1.js';
const env=process.env;
const fail=x=>{throw Error('REALITY_ACTIVATION_MONITOR_'+x)};
const sha=b=>createHash('sha256').update(b).digest('hex');
const source='artifact/install/reality-owner-approved-preview-install.json';
if(env.GITHUB_ACTIONS!=='true'||
 env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 env.OPENAI_API_KEY||env.SUPABASE_SECRET_KEY)
 fail('INDEPENDENT_PREVIEW_RUNNER_REQUIRED');
const evidence=JSON.parse(readFileSync(source,'utf8'));
const acceptedBranch=/^feature\/reality-qualified-install-[a-f0-9]{12}$/;
const acceptedFile=/^(?:src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs|test\/reality-extensions\/[A-Za-z0-9._/-]+\.test\.(?:js|mjs))$/;
if(evidence.schema!=='reality-owner-approved-preview-source-install-v1'||
 evidence.source_sha!==(env.REALITY_RECOVERY_SOURCE_SHA||env.GITHUB_SHA)||
 !acceptedBranch.test(evidence.installed_branch)||
 !/^[a-f0-9]{40}$/.test(evidence.installed_commit_sha)||
 !/^[a-f0-9]{64}$/.test(evidence.artifact_sha256)||
 !Array.isArray(evidence.file_sha256)||
 evidence.file_sha256.length<2||evidence.file_sha256.length>12||
 evidence.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'||
 (env.REALITY_RECOVERY_INSTALL_RUN_ID&&
  evidence.installer_run_id!==env.REALITY_RECOVERY_INSTALL_RUN_ID)||
 evidence.source_installation_verified!==true||
 evidence.production_changed!==false||evidence.original_job_completed!==false)
 fail('INSTALLED_APPROVAL_AND_SOURCE_INVALID');
const token=env.REALITY_INSTALL_READ_TOKEN;
if(typeof token!=='string'||token.length<20)fail('GITHUB_READ_TOKEN_REQUIRED');
async function github(path){
 const r=await fetch('https://api.github.com/repos/maloney2323/Reality'+path,{
 redirect:'error',cache:'no-store',
 headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
  'user-agent':'Reality-independent-preview-monitor-v1',
  'x-github-api-version':'2022-11-28'}});
 if(!r.ok)fail('GITHUB_INDEPENDENT_READ_'+r.status);
 return r.json();
}
const ref=await github('/git/ref/heads/'+evidence.installed_branch);
if(ref?.object?.sha!==evidence.installed_commit_sha)
 fail('PINNED_INSTALLED_COMMIT_CHANGED');
for(const file of evidence.file_sha256){
 if(!acceptedFile.test(file.path)||file.path.includes('..')||
  file.path.includes('//')||! /^[a-f0-9]{64}$/.test(file.sha256)||
  existsSync(file.path))
  fail('INSTALLED_MODEL_FILE_OUTSIDE_ALLOWED_NEW_PATHS');
 const stored=await github('/contents/'+file.path+'?ref='+evidence.installed_commit_sha);
 if(stored?.path!==file.path||stored.encoding!=='base64'||
  typeof stored.content!=='string')fail('INSTALLED_GITHUB_BYTES_MISSING');
 const content=Buffer.from(stored.content.replace(/\s/g,''),'base64');
 if(sha(content)!==file.sha256)fail('INDEPENDENT_INSTALLED_BYTES_NOT_EQUAL');
 mkdirSync(dirname(file.path),{recursive:true});
 writeFileSync(file.path,content,{flag:'wx'});
}
const activation=deriveGenuineActivationSuite(evidence);
const testPath=activation.frozen_test_path;
const suite=activation.tests;
const observations=[];
for(let i=0;i<5;i++){
 const docker=['run','--rm','--network','none','--read-only',
 '--cap-drop','ALL','--security-opt','no-new-privileges',
 '--memory','512m','--cpus','1','--user','65534:65534',
 '--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
 '-v',process.cwd()+':/work:ro','-w','/work',
 'node:22','node','--test','--test-reporter=tap',...suite];
 const start=Date.now();
 const run=spawnSync('docker',docker,{encoding:'utf8',timeout:160000,
  maxBuffer:200000,env:{PATH:env.PATH,HOME:env.HOME}});
 const elapsed=Date.now()-start;
 const output=String(run.stdout||'')+'\n'+String(run.stderr||'');
 const last=k=>{
  const v=[...output.matchAll(new RegExp('^# '+k+' (\\d+)$','gm'))].at(-1);
  return v?Number(v[1]):0;
 };
 const observation={round:i+1,exit_code:run.status,tests:last('tests'),
  passed:last('pass'),failed:last('fail'),elapsed_ms:elapsed,
  output_hash_sha256:sha(output),schema_violations:0,
  sandbox_network_disabled:true,executor_privileges_dropped:true};
 observations.push(observation);
 if(observation.exit_code!==0||observation.tests<1||
    observation.tests!==observation.passed||observation.failed!==0)
  break;
}
const allPassed=observations.length===5&&observations.every(x=>
 x.exit_code===0&&x.failed===0&&x.tests===x.passed&&x.tests>=44);
const report={
 schema:'reality-independent-installed-preview-activation-v1',
 original_work_id:evidence.original_work_id,
 approval_id:evidence.approval_id,
 artifact_sha256:evidence.artifact_sha256,
 source_sha:evidence.source_sha,
 install_branch:evidence.installed_branch,
 installed_commit_sha:evidence.installed_commit_sha,
 file_sha256:evidence.file_sha256,
 independent_run_id:env.GITHUB_RUN_ID,
 independent_runner_sha:env.GITHUB_SHA,
 original_frozen_test_path:testPath,
 probation_window_target:50,
 probation_isolated_monitoring_executions:observations.length,
 probation_live_business_executions:0,
 observations,
 all_passed:allPassed,
 original_job_preview_acceptance_reproduced:allPassed,
 probation_status:allPassed?'ACTIVE':'QUARANTINED',
 production_changed:false,
 original_job_settled:false
};
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-independent-installed-preview-activation.json',
 JSON.stringify(report,null,2)+'\n');
console.log('REALITY_INDEPENDENT_POST_INSTALL_MONITOR',JSON.stringify({
 original_work_id:report.original_work_id,
 installed_commit_sha:report.installed_commit_sha,
 observations:observations.map(x=>({pass:x.passed,tests:x.tests,elapsed_ms:x.elapsed_ms})),
 all_passed:allPassed,probation_status:report.probation_status,
 original_job_settled:false,production_changed:false}));
if(!allPassed)process.exitCode=2;
