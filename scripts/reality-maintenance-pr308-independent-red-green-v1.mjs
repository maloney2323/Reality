// Separate GitHub Actions verification of an exact, frozen Reality
// maintenance *handoff* regression. Both independent worktrees run the SAME
// test bytes. GREEN is not installation approval or the original business job.
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const preRepair='e9177227682c589b9308b17aa6b672e7501313f6';
const testPath='test/reality-frozen-regressions/reality-maintenance-pr308-requalification-ci-handoff-v1.test.js';
const sourcePath='src/reality-signed-maintenance-case-ci-executor-v1.js';
const branch='repair/maintenance-warrant-scope-handoff-20261119';
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const sha40=/^[a-f0-9]{40}$/;
const abort=reason=>{throw Error('SIGNED_MAINTENANCE_PR308_FROZEN_'+reason)};
if(process.env.GITHUB_ACTIONS!=='true'||
 process.env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 !['push','pull_request'].includes(process.env.GITHUB_EVENT_NAME))
 abort('ISOLATED_GITHUB_PROVIDER_REQUIRED');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!sha40.test(head)||head===preRepair)
 abort('CANDIDATE_HEAD_COMMIT_REQUIRED');
if(process.env.GITHUB_EVENT_NAME==='push'){
 if(process.env.GITHUB_REF!=='refs/heads/'+branch||
    process.env.GITHUB_SHA!==head)abort('EXACT_PUSH_BRANCH_AND_SHA_REQUIRED');
}else{
 const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
 if(event.pull_request?.head?.repo?.full_name!=='maloney2323/Reality'||
    event.pull_request.head.ref!==branch||
    event.pull_request.head.sha!==head||
    event.pull_request.base?.repo?.full_name!=='maloney2323/Reality'||
    event.pull_request.base.ref!=='reality/chat-direct-work-handoff-20261115')
  abort('EXACT_SIGNED_MAINTENANCE_PR_HEAD_REQUIRED');
}
const ancestor=spawnSync('git',['merge-base','--is-ancestor',preRepair,head],{
 encoding:'utf8',timeout:15000});
if(ancestor.status!==0)abort('HISTORICAL_PRE_REPAIR_SOURCE_NOT_ANCESTOR');
const frozenBytes=readFileSync(testPath);
const frozenText=frozenBytes.toString('utf8');
if(frozenBytes.length<2500||frozenBytes.length>15000||
 !frozenText.includes('PR308 previously requalified signed maintenance must advance to exact CI on same shift')||
 !frozenText.includes('reality_claim_registered_maintenance_action_v2')||
 !frozenText.includes('reality_promote_requalified_maintenance_to_ci_claim_v1')||
 !frozenText.includes('frozen PR308 regression: a completed requalification must not strand CI'))
 abort('FROZEN_CASE_TEST_IDENTITY_INVALID');
const testDigest=sha(frozenBytes);
const run=cwd=>spawnSync(process.execPath,
 ['--test','--test-reporter=tap',testPath],{
 cwd,timeout:90000,encoding:'utf8',maxBuffer:250000,
 env:{PATH:process.env.PATH,HOME:process.env.HOME,
  NODE_OPTIONS:'--no-warnings',CI:'true'}
});
const candidate=run(process.cwd());
const candidateText=String(candidate.stdout||'')+'\n'+String(candidate.stderr||'');
if(candidate.status!==0||
 !/^ok 1 - PR308 previously requalified signed maintenance must advance to exact CI on same shift$/m.test(candidateText)||
 !/^# tests 1$/m.test(candidateText)||
 !/^# pass 1$/m.test(candidateText)||
 !/^# fail 0$/m.test(candidateText))
 abort('SAME_FROZEN_CASE_CANDIDATE_NOT_GREEN');
const temp=mkdtempSync(join(tmpdir(),'reality-pr308-frozen-'));
const baseline=join(temp,'baseline');
let baselineRun;
try{
 execFileSync('git',['worktree','add','--detach',baseline,preRepair],{
  encoding:'utf8',timeout:40000});
 const testFolder=join(baseline,'test','reality-frozen-regressions');
 mkdirSync(testFolder,{recursive:true});
 copyFileSync(testPath,join(baseline,testPath));
 const baselineBytes=readFileSync(join(baseline,testPath));
 if(sha(baselineBytes)!==testDigest)
  abort('BASELINE_AND_CANDIDATE_FROZEN_TEST_BYTES_DIFFER');
 baselineRun=run(baseline);
}finally{
 spawnSync('git',['worktree','remove','--force',baseline],{
  encoding:'utf8',timeout:18000});
 rmSync(temp,{recursive:true,force:true});
}
const redText=String(baselineRun?.stdout||'')+'\n'+String(baselineRun?.stderr||'');
if(baselineRun?.status!==1||
 !/^not ok 1 - PR308 previously requalified signed maintenance must advance to exact CI on same shift$/m.test(redText)||
 !redText.includes('frozen PR308 regression: a completed requalification must not strand CI')||
 !/^# tests 1$/m.test(redText)||
 !/^# pass 0$/m.test(redText)||
 !/^# fail 1$/m.test(redText))
 abort('BASELINE_NOT_EXACT_REPRODUCED_FROZEN_FAILURE');
const evidence={
 schema:'reality-pr308-signed-maintenance-requalification-ci-frozen-red-green-v1',
 maintenance_id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
 original_shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce',
 source_ref:'https://github.com/maloney2323/Reality/pull/308',
 historical_pre_repair_commit:preRepair,
 candidate_commit:head,
 same_frozen_test_path:testPath,same_frozen_test_sha256:testDigest,
 baseline_source_sha256:sha(execFileSync('git',['show',preRepair+':'+sourcePath])),
 candidate_source_sha256:sha(readFileSync(sourcePath)),
 baseline_exit_code:baselineRun.status,
 baseline_failure_signature:'PR308_REQUALIFICATION_TO_CI_HANDOFF_MISSING',
 baseline_tap_sha256:sha(redText),
 candidate_exit_code:candidate.status,
 candidate_tap_sha256:sha(candidateText),
 independently_executable_handoff_red:true,
 candidate_handoff_green:true,
 pr308_original_source_epoch_failure_independently_reproduced:false,
 frozen_original_business_failure_verified:false,
 installed_code:false,repair_executed_in_production:false,
 exact_install_approval_verified:false,original_job_completed:false,
 production_changed:false,new_shift_started:false
};
if(evidence.baseline_source_sha256===evidence.candidate_source_sha256)
 abort('CANDIDATE_SOURCE_HAS_NO_ACTUAL_CHANGE');
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/maintenance-pr308-frozen-red-green.json',
 JSON.stringify(evidence,null,2)+'\n');
console.log('PR308_SIGNED_MAINTENANCE_FROZEN_REGRESSION',
 JSON.stringify({maintenance_id:evidence.maintenance_id,
 original_shift_id:evidence.original_shift_id,
 baseline_commit:preRepair,candidate_commit:head,
 baseline_red:true,candidate_green:true,
 frozen_test_sha256:testDigest,
 original_source_epoch_failure_reproduced:false,
 repair_executed_in_production:false,
 original_job_completed:false}));
