// Executable, source-bound technical recovery proof. Uses real Git history and
// the SAME frozen assertions in historical RED vs corrected GREEN worktrees.
// This does not install/approve a repair, attest a missing business-original
// claim, call an LLM, or write any Reality database or GitHub repository.
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,
 rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const fail=x=>{throw Error('REALITY_RECOVERY_FROZEN_CASE_CI_'+x)};
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const TEST=/^test\/reality-frozen-regressions\/reality-final-loop-[a-z0-9-]+\.test\.js$/;
const TARGET=/^src\/reality-final-loop-[a-z0-9-]+\.js$/;
const SPEC=/^reality-final-loop-recovery-case-specs\/[a-z0-9-]+\.json$/;
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const command=(exe,args,{cwd=process.cwd(),timeout=25000}={})=>{
 const run=spawnSync(exe,args,{cwd,encoding:'utf8',timeout,
  maxBuffer:800000,env:{...process.env,NODE_OPTIONS:'--no-warnings'}});
 return {status:run.status,signal:run.signal,
  text:String(run.stdout||'')+'\n'+String(run.stderr||'')};
};
const git=(args,opts)=>{const r=command('git',args,opts);
 if(r.status!==0||r.signal)fail('GIT_REVISION_OR_ISOLATION_UNVERIFIED');
 return r.text.trim()};
const check=(condition,code)=>{if(!condition)fail(code)};
function stats(result,{red,name}){
 check(result.signal===null,'TEST_TIMEOUT_OR_SIGNAL');
 const n=type=>{const m=result.text.match(new RegExp('^# '+type+' (\\d+)$','m'));
  return m?Number(m[1]):null};
 const tests=n('tests'),passed=n('pass'),failed=n('fail');
 check(tests!==null&&tests>=4&&tests===passed+failed,'TEST_COUNT_UNVERIFIED');
 if(red){
  check(result.status!==0&&failed===1&&
    result.text.includes('not ok 1 - '+name)&&
    /AssertionError|ERR_ASSERTION/.test(result.text),
   'HISTORICAL_RED_NOT_EXACT_CASE_ASSERTION');
 }else check(result.status===0&&failed===0&&passed===tests,
   'CORRECTED_GREEN_INDEPENDENT_TEST_NOT_PASSING');
 return {tests,passed,failed,exit_code:result.status,log_sha256:sha(result.text)};
}
const file=process.argv[2]||
 'reality-final-loop-recovery-case-specs/pr307-uncertain-provider-technical-recovery-v1.json';
check(SPEC.test(file)&&!file.includes('..'),'FROZEN_CASE_PATH_INVALID');
check(process.env.GITHUB_ACTIONS==='true'&&
 process.env.GITHUB_REPOSITORY==='maloney2323/Reality'&&
 ['push','pull_request'].includes(process.env.GITHUB_EVENT_NAME)&&
 SHA.test(process.env.GITHUB_SHA||'')&&
 process.env.GITHUB_HEAD_REF!=='forked-untrusted',
 'GITHUB_SIGNED_REPOSITORY_RUN_REQUIRED');
const commit=git(['rev-parse','HEAD']);
const trustedBranch='feature/final-loop-governed-qualification-handoff-20261123';
check(SHA.test(commit),'CURRENT_GITHUB_COMMIT_IDENTITY_MISMATCH');
if(process.env.GITHUB_EVENT_NAME==='push'){
 check(commit===process.env.GITHUB_SHA,'CURRENT_GITHUB_COMMIT_IDENTITY_MISMATCH');
 check(process.env.GITHUB_REF==='refs/heads/'+trustedBranch,'PREVIEW_BRANCH_ONLY');
}else{
 // The cross-layer suite runs on the merge result. The frozen artifact
 // separately tests the exact immutable PR head, never relabels a merge.
 const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
 const pr=event.pull_request;
 check(pr?.head?.repo?.full_name===process.env.GITHUB_REPOSITORY&&
  pr?.base?.repo?.full_name===process.env.GITHUB_REPOSITORY&&
  pr.head.repo.id===event.repository?.id&&pr.base.repo.id===event.repository?.id&&
  SHA.test(pr.head.sha||'')&&SHA.test(pr.base.sha||'')&&
  pr.head.ref===process.env.GITHUB_HEAD_REF&&pr.base.ref===process.env.GITHUB_BASE_REF&&
  (pr.head.ref===trustedBranch||pr.base.ref===trustedBranch),
  'PR_HEAD_ONLY');
 check(commit===pr.head.sha&&
  git(['rev-parse',process.env.GITHUB_SHA+'^1'])===pr.base.sha&&
  git(['rev-parse',process.env.GITHUB_SHA+'^2'])===pr.head.sha,
  'CURRENT_GITHUB_COMMIT_IDENTITY_MISMATCH');
}
const raw=readFileSync(file,'utf8'),spec=JSON.parse(raw);
check(spec&&typeof spec==='object'&&!Array.isArray(spec)&&
 spec.schema==='reality-final-loop-sourcebound-frozen-recovery-v1'&&
 SOURCE.test(spec.source_ref||'')&&
 SHA.test(spec.source_head_sha||'')&&
 UUID.test(spec.owner_id||'')&&UUID.test(spec.shift_id||'')&&
 UUID.test(spec.continuity_root_id||'')&&UUID.test(spec.maintenance_id||'')&&
 WORK.test(spec.original_work_id||'')&&
 HASH.test(spec.independent_baseline_receipt_sha256||'')&&
 HASH.test(spec.independent_prior_ci_diagnostic_receipt_sha256||'')&&
 SHA.test(spec.historical_code_commit_sha||'')&&
 SHA.test(spec.corrected_code_commit_sha||'')&&
 TEST.test(spec.frozen_test_path||'')&&TARGET.test(spec.target_source_path||'')&&
 spec.scope==='PR307_LINKED_TECHNICAL_RECOVERY_HANDOFF_ONLY'&&
 spec.historical_failure_kind===
  'UNCERTAIN_PROVIDER_CI_OUTCOME_PREEMPTED_BY_CAPABILITY_ACQUISITION'&&
 typeof spec.expected_red_test_name==='string'&&
 spec.expected_red_test_name.length>=60&&
 typeof spec.historical_defect_marker==='string'&&
 spec.historical_defect_marker.length>25&&
 typeof spec.corrected_guard_marker==='string'&&
 spec.corrected_guard_marker.length>25&&
 spec.independently_verified_original_customer_admission===false&&
 spec.case_specific_original_business_red_proven===false&&
 spec.model_generated_verdict_allowed===false&&
 spec.original_job_completed===false&&
 spec.installation_authorized===false&&spec.production_changed===false,
 'FROZEN_RECOVERY_CASE_SOURCE_PROOF_FIELDS_INVALID');
check(readFileSync(spec.frozen_test_path,'utf8')
  .includes("test('"+spec.expected_red_test_name+"'"),
 'FROZEN_TEST_CASE_ASSERTION_MISSING');
git(['merge-base','--is-ancestor',spec.historical_code_commit_sha,commit]);
git(['merge-base','--is-ancestor',spec.corrected_code_commit_sha,commit]);
const hist=git(['show',spec.historical_code_commit_sha+':'+spec.target_source_path]);
const current=readFileSync(spec.target_source_path,'utf8');
check(hist.includes(spec.historical_defect_marker)&&
 !hist.includes(spec.corrected_guard_marker)&&
 current.includes(spec.corrected_guard_marker)&&
 current.indexOf(spec.corrected_guard_marker)<
  current.indexOf(spec.historical_defect_marker),
 'SOURCE_BEFORE_AFTER_REPAIR_NOT_PINNED');
const frozen=readFileSync(spec.frozen_test_path);
check(frozen.length>1500&&frozen.length<15000,
 'FROZEN_CASE_TEST_UNBOUNDED');
const temp=mkdtempSync(join(tmpdir(),'reality-frozen-case-'));
const worktree=join(temp,'historical');
let historical,corrected;
try{
 git(['worktree','add','--detach',worktree,spec.historical_code_commit_sha]);
 const target=join(worktree,spec.frozen_test_path);
 mkdirSync(dirname(target),{recursive:true});
 copyFileSync(spec.frozen_test_path,target);
 check(readFileSync(target).equals(frozen),
  'SAME_FROZEN_TEST_HISTORICAL_COPY_UNVERIFIED');
 historical=command(process.execPath,['--test','--test-reporter=tap',
  spec.frozen_test_path],{cwd:worktree,timeout:90000});
 corrected=command(process.execPath,['--test','--test-reporter=tap',
  spec.frozen_test_path],{timeout:90000});
}finally{
 command('git',['worktree','remove','--force',worktree],{timeout:20000});
 rmSync(temp,{recursive:true,force:true});
}
const red=stats(historical,{red:true,name:spec.expected_red_test_name});
const green=stats(corrected,{red:false,name:spec.expected_red_test_name});
const receipt={
 schema:'reality-final-loop-technical-frozen-case-ci-result-v1',
 source_ref:spec.source_ref,source_head_sha:spec.source_head_sha,
 original_work_id:spec.original_work_id,maintenance_id:spec.maintenance_id,
 shift_id:spec.shift_id,continuity_root_id:spec.continuity_root_id,
 independent_baseline_receipt_sha256:spec.independent_baseline_receipt_sha256,
 independent_prior_ci_diagnostic_receipt_sha256:
  spec.independent_prior_ci_diagnostic_receipt_sha256,
 source_ledger_receipts_pinned_not_independently_rechecked:true,
 frozen_case_spec_sha256:sha(raw),frozen_test_sha256:sha(frozen),
 target_source_path:spec.target_source_path,
 historical_code_commit_sha:spec.historical_code_commit_sha,
 corrected_code_commit_sha:commit,
 git_historical_source_sha256:sha(hist),
 git_corrected_source_sha256:sha(current),
 source_code_pinned_to_git_history:true,
 github_run_id:process.env.GITHUB_RUN_ID||null,
 historical_red:red,corrected_green:green,
 historical_exact_assertion_failed:true,
 same_frozen_test_on_both_commits:true,
 independent_test_runner:'GITHUB_ACTIONS_NODE_22',
 signed_database_independent_proof_receipt_recorded:false,
 case_specific_original_business_red_proven:false,
 business_original_warrant_verified:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,recovery_execution_completed:false
};
mkdirSync('artifact',{recursive:true});
const output='artifact/reality-final-loop-technical-frozen-case-'+
 spec.maintenance_id+'.json';
writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
console.log('REALITY_FROZEN_TECHNICAL_RECOVERY_RED_GREEN_VERIFIED',JSON.stringify({
 original_work_id:spec.original_work_id,source_ref:spec.source_ref,
 historical_red_failures:red.failed,corrected_green_passes:green.passed,
 frozen_test_sha256:receipt.frozen_test_sha256,
 receipt_sha256:sha(JSON.stringify(receipt)),
 business_original_red_proven:false,
 signed_database_receipt_recorded:false,original_job_completed:false
}));
