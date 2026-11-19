// Independent GitHub Actions execution of a claim-bound maintenance diagnostic.
// It deliberately does NOT convert a passing generic regression suite or
// an ordinary failing CI run into the owner's case-specific frozen RED.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha256=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const BRANCH='refs/heads/repair/maintenance-warrant-scope-handoff-20261119';
const fail=x=>{throw Error('SIGNED_CASE_CI_'+x)};
const env=process.env;
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_REF!==BRANCH||!SHA.test(env.GITHUB_SHA||'')||
 env.GITHUB_EVENT_NAME!=='push')
 fail('EXACT_ISOLATED_SIGNED_ACTIONS_RUN_REQUIRED');
const diff=spawnSync('git',['diff','--name-only','HEAD^','HEAD','--',
 'reality-maintenance-ci-triggers/'],{encoding:'utf8',timeout:6000});
if(diff.status!==0)fail('GIT_TRIGGER_CHANGESET_UNAVAILABLE');
const changed=String(diff.stdout||'').trim().split('\n').filter(Boolean);
if(changed.length!==1||
 !/^reality-maintenance-ci-triggers\/[a-f0-9-]{36}\.json$/.test(changed[0])){
 console.log('NO_CLAIM_BOUND_MAINTENANCE_CI_TRIGGER_ON_SOURCE_PUSH');
 process.exit(0);
}
const path=changed[0];
const item=JSON.parse(readFileSync(path,'utf8'));
if(item?.schema!=='reality-signed-maintenance-case-ci-trigger-v1'||
 !UUID.test(item.maintenance_id||'')||!UUID.test(item.shift_id||'')||
 !UUID.test(item.worker_run_id||'')||
 path!=='reality-maintenance-ci-triggers/'+item.maintenance_id+'.json'||
 !SOURCE.test(item.source_ref||'')||
 !HASH.test(item.source_epoch_receipt_sha256||'')||
 !['HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES',
   'HISTORICAL_SOURCE_EPOCH_MISMATCH_INDEPENDENTLY_REOBSERVED'].includes(
     item.historical_failure_kind)||
 item.frozen_ci_red_verified!==false||
 item.repair_executed!==false||
 item.original_job_completed!==false||
 item.installation_authorized!==false||
 item.production_changed!==false||
 Object.keys(item).sort().join(',')!==
 'frozen_ci_red_verified,historical_failure_kind,installation_authorized,maintenance_id,original_job_completed,production_changed,repair_executed,schema,shift_id,source_epoch_receipt_sha256,source_ref,worker_run_id')
 fail('TRIGGER_SOURCE_OR_UNVERIFIED_AUTHORITY_INVALID');
const scope=JSON.stringify(item,null,2)+'\n';
if(readFileSync(path,'utf8')!==scope)fail('TRIGGER_BYTES_NOT_EXACT');
const suites=item.historical_failure_kind===
 'HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES'?
 ['test/reality-shift-business-qualification-review-v1.test.js',
  'test/reality-frozen-regressions/reality-maintenance-baseline-original-failure-v1.test.js',
  'test/reality-registered-signed-maintenance-executor-v1.test.js']:
 ['test/reality-qualified-source-requalification-v1.test.js',
  'test/reality-registered-signed-maintenance-executor-v1.test.js'];
for(const file of suites)if(!/^(?:test\/)[a-z0-9_./-]+\.test\.js$/.test(file))
 fail('CASE_SUITE_PATH_NOT_ALLOWLISTED');
const run=spawnSync(process.execPath,['--test','--test-reporter=tap',...suites],{
 timeout:140000,maxBuffer:300000,encoding:'utf8',
 env:{PATH:env.PATH,HOME:env.HOME,CI:'true',NODE_OPTIONS:'--no-warnings'}});
const output=String(run.stdout||'')+'\n'+String(run.stderr||'');
console.log(output.slice(-18000));
const n=x=>{const m=[...output.matchAll(new RegExp('^# '+x+' (\\d+)$','gm'))].at(-1);
 return m?Number(m[1]):0};
const receipt={
 schema:'reality-maintenance-claim-bound-ci-diagnostic-v1',
 shift_id:item.shift_id,maintenance_id:item.maintenance_id,
 source_ref:item.source_ref,
 signed_worker_run_id:item.worker_run_id,
 source_epoch_receipt_sha256:item.source_epoch_receipt_sha256,
 source_proof_kind:item.historical_failure_kind,
 github_workflow_run_id:env.GITHUB_RUN_ID,
 repository_commit_sha:env.GITHUB_SHA,
 trigger_blob_sha256:sha256(scope),diagnostic_suites:suites,
 test_exit_code:run.status,tests:n('tests'),passed:n('pass'),failed:n('fail'),
 stdout_stderr_sha256:sha256(output),
 case_specific_original_failure_reproduced:false,
 executable_frozen_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false
};
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/maintenance-case-ci-diagnostic.json',
 JSON.stringify(receipt,null,2)+'\n');
console.log('REALITY_MAINTENANCE_SIGNED_CI_DIAGNOSTIC',JSON.stringify({
 maintenance_id:receipt.maintenance_id,shift_id:receipt.shift_id,
 tests:receipt.tests,passed:receipt.passed,failed:receipt.failed,
 status:run.status===0?
  'DIAGNOSTIC_SUITE_PASSED_CASE_RED_STILL_REQUIRED':
  'DIAGNOSTIC_SUITE_FAILED_NEEDS_EXACT_ORIGINAL_REPRODUCTION',
 executable_frozen_ci_red_verified:false,repair_executed:false
}));
if(run.status!==0||receipt.tests<1||receipt.failed>0)process.exitCode=2;
