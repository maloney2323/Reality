// Resume the SAME owner-approved customer job in offline isolated execution.
// GitHub OIDC authorizes broker readback and one-time original-work claim.
import {readFileSync,writeFileSync,mkdirSync,existsSync,appendFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {deriveOriginalResumeContract} from '../src/reality-genuine-original-resume-contract-v1.js';
import {verifyReconciliationProviderEvidence} from '../src/reality-original-provider-relationship-v1.js';
const env=process.env, repo='maloney2323/Reality';
const fail=x=>{throw Error('REALITY_ORIGINAL_RESUME_'+x)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const output=(v)=>{if(env.GITHUB_OUTPUT)appendFileSync(env.GITHUB_OUTPUT,'performed='+v+'\n')};
if(env.GITHUB_ACTIONS!=='true'||!['push','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||
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
// An exact, historically verified Universe witness is a safe no-effect
// terminal observation, NOT proof that this newly approved job settled.
if(ready.status==='HISTORICAL_RECONCILIATION_ALREADY_SATISFIED'){
 if(!/^work:[a-f0-9]{32}$/.test(ready.original_work_id||'')||
    !/^work:[a-f0-9]{32}$/.test(ready.previous_repairing_original_work_id||'')||
    !/^work:[a-f0-9]{32}$/.test(ready.previous_reconciliation_target_work_id||'')||
    ready.independent_database_readback!==true||
    ready.current_job_execution_claimed!==false||
    ready.original_job_completed!==false||
    ready.installation_replay_authorized!==false||
    ready.production_changed!==false)
  fail('HISTORICAL_NO_TARGET_WITNESS_INVALID');
 console.log('REALITY_HISTORICAL_UNIVERSE_ALREADY_SATISFIED',JSON.stringify({
  current_original_work_id:ready.original_work_id,
  historical_repairing_original_work_id:ready.previous_repairing_original_work_id,
  historical_target_work_id:ready.previous_reconciliation_target_work_id,
  previously_verified:true,current_original_job_completed:false,
  original_execution_replayed:false,production_changed:false}));
 output('false');process.exit(0);
}
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
// Verify the extension protocol and any independent target evidence BEFORE
// consuming the one-time original-work claim. #201 must never replay #178.
const contract=deriveOriginalResumeContract(ready);
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
 !oldLog.includes(contract.source_path.split('/').at(-1)))
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
const generatedTest=contract.companion_test_path;
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
// Execute model-produced code only inside a network-disabled, read-only,
// secret-free container. Neither an imported module nor a model can authorize
// installation, a Universe write, or customer settlement.
const evaluationInput=contract.requires_reconciliation_evidence?
 ready.reconciliation_evidence:
 contract.requires_pre_settlement_denial?{
 // The actual owner-bound work has NOT resumed or settled yet.
 // We must demonstrate that the installed verifier refuses to call it complete.
 owner_id:ready.owner_id,goal_id:ready.goal_id,
 original_work_id:ready.original_work_id,artifact_hash:ready.artifact_sha256,
 signed_owner_approval:{
  verified:true,consumed_once:true,
  owner_id:ready.owner_id,original_work_id:ready.original_work_id,
  artifact_hash:ready.artifact_sha256,
  origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  reservation_ref:'supabase:owner:single-use:'+ready.approval_id,
 },
 sandbox:{independently_verified:true,artifact_hash:ready.artifact_sha256,
  frozen_regression_passed:true,governance_preserved:true},
 installation:{independent_provider_readback:true,
  original_work_id:ready.original_work_id,artifact_hash:ready.artifact_sha256,
  installed_commit_sha:ready.installed_commit_sha,production_changed:false,
  installed_branch:ready.install_branch},
 // Never synthesize a successful execution or settlement from unperformed work.
 resumption:null,settlement:null
 }:{
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
// The signed broker provides a separately verified target and owner scope.
// For a previously failed workflow, also read the exact provider job graph
// and immutable settlement artifact before the repaired extension evaluates it.
if(contract.requires_reconciliation_evidence){
 const target=ready.reconciliation_evidence?.provider;
 const runId=target?.run_id;
 if(!Number.isSafeInteger(runId)||runId<1)
  fail('RECONCILIATION_TARGET_RUN_REQUIRED');
 const [providerRun,providerJobs,providerArtifacts]=await Promise.all([
  github('/actions/runs/'+runId),
  github('/actions/runs/'+runId+'/jobs?per_page=100'),
  github('/actions/runs/'+runId+'/artifacts?per_page=100')
 ]);
 evaluationInput.provider=verifyReconciliationProviderEvidence(
  target,providerRun,providerJobs,providerArtifacts);
 console.log('REALITY_RECONCILIATION_PROVIDER_RELATIONSHIP_VERIFIED',
  JSON.stringify({historical_run_id:runId,
   resume_job_success:true,settlement_job_success:true,
   unrelated_job_failure_verified:
     evaluationInput.provider.unrelated_job_failure_verified,
   settlement_artifact_digest_verified:true}));
}
const evaluationCode=
 'import * as module from '+JSON.stringify('file:///work/'+contract.source_path)+';'+
 'const f=module['+JSON.stringify(contract.export_name)+'];'+
 'if(typeof f!=="function")process.exit(42);'+
 'const evidence=JSON.parse(process.argv[1]);'+
 'const out=f(evidence);'+
 'process.stdout.write("REALITY_RESULT="+JSON.stringify(out)+"\\n");';
const evaluation=spawnSync('docker',[
 'run','--rm','--network','none','--read-only','--cap-drop','ALL',
 '--security-opt','no-new-privileges','--memory','256m','--cpus','1',
 '--user','65534:65534','--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
 '-v',process.cwd()+':/work:ro','-w','/work','node:22',
 'node','--input-type=module','-e',evaluationCode,JSON.stringify(evaluationInput)
],{encoding:'utf8',timeout:40000,maxBuffer:100000,
 env:{PATH:env.PATH,HOME:env.HOME}});
const lines=String(evaluation.stdout||'').split('\\n').filter(x=>x.startsWith('REALITY_RESULT='));
if(evaluation.status!==0||lines.length!==1)fail('ISOLATED_EXTENSION_EVALUATION_FAILED');
const disposition=JSON.parse(lines[0].slice('REALITY_RESULT='.length));
const preSettlementDenial=contract.requires_pre_settlement_denial===true&&
 disposition?.verified===false&&
 disposition?.status!=='VERIFIED_SETTLED'&&
 disposition?.production_changed!==true;
const actualDecision=contract.requires_pre_settlement_denial?
  (preSettlementDenial?'PRE_SETTLEMENT_DENIED':'INVALID_PRE_SETTLEMENT_CLAIM'):
 contract.requires_reconciliation_evidence?
  disposition?.status:disposition?.decision;
if(actualDecision!==contract.required_decision||
 (!contract.requires_pre_settlement_denial&&
  (contract.requires_reconciliation_evidence?
   disposition?.original_work_id!==contract.reconciliation_target_work_id:
   (disposition?.original_work_id!==ready.original_work_id||
    disposition?.can_generate_candidate!==true)))||
 (!contract.requires_pre_settlement_denial&&disposition?.installation_authorized!==false)||
 (contract.requires_pre_settlement_denial?
   disposition?.production_changed===true:
   disposition?.production_changed!==false))
 fail('PROVIDER_BACKED_EXTENSION_RESULT_UNVERIFIED');
if(contract.requires_reconciliation_evidence&&(
 disposition?.reconciliation?.status!=='PROPOSED_NOT_APPENDED'||
 disposition?.universe_settlement_verified!==false||
 disposition?.original_job_completed_in_universe!==false))
 fail('RECONCILIATION_PROPOSAL_NOT_AN_AUTHORITATIVE_SETTLEMENT');
// Single-use claim is consumed only AFTER provider evidence, unchanged
// frozen suite, offline extension evaluation and the exact business decision
// pass. A failed real-world holdout cannot burn the original job's claim.
const claim=await broker('original_claim',{trigger_id:ready.trigger_id});
if(claim.status!=='RESUMPTION_CLAIMED'||
 claim.original_work_id!==ready.original_work_id||
 claim.installed_commit_sha!==ready.installed_commit_sha||
 claim.original_job_completed!==false)fail('SINGLE_USE_ORIGINAL_CLAIM_REQUIRED');
const proof={
 schema:'reality-original-job-execution-proof-v1',
 original_work_id:ready.original_work_id,
 trigger_id:ready.trigger_id,approval_id:ready.approval_id,
 artifact_sha256:ready.artifact_sha256,installed_commit_sha:ready.installed_commit_sha,
 github_run_id:env.GITHUB_RUN_ID,
 original_provider_run_id:older.id,original_provider_job_id:oldJob.id,
 original_provider_failure_verified:true,
 original_failure_log_sha256:sha(oldLog),
 classification:actualDecision,
 extension_protocol:contract.protocol,
 reconciliation_target_original_work_id:contract.reconciliation_target_work_id,
 frozen_suite_passed:true,frozen_suite_tests:last('tests'),
 frozen_suite_output_sha256:sha(log),
 isolated_execution:true,production_changed:false,
 provider_outcome_digest:sha(log+'|'+ready.installed_commit_sha+'|'+oldJob.id+'|'+actualDecision),
 pre_settlement_denial_verified:preSettlementDenial,
 full_probation_complete:false,original_job_completed:!contract.requires_reconciliation_evidence&&
  !contract.requires_pre_settlement_denial
};
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-original-resumption.json',JSON.stringify(proof,null,2)+'\n');
console.log('REALITY_ORIGINAL_JOB_PROVIDER_EXECUTION_PASSED',JSON.stringify({
 original_work_id:proof.original_work_id,installed_commit_sha:proof.installed_commit_sha,
 frozen_suite_tests:proof.frozen_suite_tests,classification:proof.classification,extension_protocol:proof.extension_protocol,
 original_provider_run_id:proof.original_provider_run_id,production_changed:false,
 database_settlement_recorded:false
}));
output('true');
