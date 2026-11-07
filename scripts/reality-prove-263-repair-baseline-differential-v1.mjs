// Independent A/B proof of the REAL #263 frozen regression.
// Runs the exact frozen acceptance test against the original pinned Reality
// baseline and the current repaired checkout. Source-only: no DB claims,
// owner identity, runtime secrets, installation or artificial settlement.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
const ISSUE='https://github.com/maloney2323/Reality/issues/263';
const BASELINE='d63d15b08fe61d88d4d365f0dbb5816ee79ef471';
const SOURCE='src/reality-governed-employee-shift-worker-v1.js';
const FROZEN='test/reality-frozen-regressions/riley-live-original-shift-dispatch.test.js';
const REPORT='benchmark-results/reality-riley-263-differential-repair-proof-v1.json';
const failureName='a qualified step-six shift reaches trusted original-job handoff, not just a wake';
const hash=x=>createHash('sha256').update(x).digest('hex');
const run=(name,args,cwd)=>spawnSync(name,args,{cwd,encoding:'utf8',timeout:80000,maxBuffer:3e6});
const root=process.cwd();
const baselineDir='/tmp/reality-263-frozen-baseline';
let report={
 version:'reality-riley-frozen-263-differential-repair-proof-v1',
 issue_url:ISSUE,source_path:SOURCE,frozen_test:FROZEN,
 pinned_baseline_sha:BASELINE,candidate_sha:null,
 source_snapshot_sha256:null,frozen_test_sha256:null,
 baseline_reproduced_failure:false,candidate_frozen_tests_passed:false,
 failure_identity:null,baseline_exit_code:null,candidate_exit_code:null,
 independent_differential_proven:false,original_customer_job_settled:false,
 owner_shift_claimed:false,installation_authorized:false,
 production_changed:false
};
let error=null;
try {
 const head=run('git',['rev-parse','HEAD'],root);
 if(head.status!==0||!/^[a-f0-9]{40}$/.test(head.stdout.trim()))throw Error('CANDIDATE_COMMIT_UNVERIFIED');
 report.candidate_sha=head.stdout.trim();
 const [frozen,source]=await Promise.all([
  readFile(join(root,FROZEN)),readFile(join(root,SOURCE))]);
 report.frozen_test_sha256=hash(frozen);
 report.source_snapshot_sha256=hash(source);
 // Exactly this frozen regression is used for BOTH candidate and historical baseline.
 const add=run('git',['worktree','add','--detach',baselineDir,BASELINE],root);
 if(add.status!==0)throw Error('FROZEN_BASELINE_CHECKOUT_FAILED');
 await mkdir(join(baselineDir,'test/reality-frozen-regressions'),{recursive:true});
 await copyFile(join(root,FROZEN),join(baselineDir,FROZEN));
 const old=run('node',['--test',FROZEN],baselineDir);
 const candidate=run('node',['--test',FROZEN],root);
 report.baseline_exit_code=old.status;
 report.candidate_exit_code=candidate.status;
 const failedLine=old.stdout.split('\n').find(line=>
  line.startsWith('not ok ')&&line.includes(failureName))||null;
 report.failure_identity=failedLine?failureName:null;
 report.baseline_reproduced_failure=old.status!==0&&
  old.signal===null&&Boolean(failedLine);
 report.candidate_frozen_tests_passed=candidate.status===0&&
  candidate.signal===null&&
  candidate.stdout.includes('# fail 0')&&
  candidate.stdout.includes(failureName);
 report.independent_differential_proven=report.baseline_reproduced_failure&&
  report.candidate_frozen_tests_passed;
 if(!report.independent_differential_proven)
  throw Error('BASELINE_FAILURE_TO_REPAIRED_CANDIDATE_NOT_PROVEN');
} catch(e){error=String(e?.message||'UNVERIFIED_DIFFERENTIAL').slice(0,140);}
report={...report,status:report.independent_differential_proven?
 'PINNED_BASELINE_FAILS_REPAIRED_CANDIDATE_PASSES':
 'ORIGINAL_REPAIR_REGRESSION_NOT_INDEPENDENTLY_PROVEN',
 failure_reason:error};
await mkdir('benchmark-results',{recursive:true});
await writeFile(REPORT,JSON.stringify(report,null,2)+'\n');
console.log('REALITY_RILEY_263_FROZEN_DIFFERENTIAL',JSON.stringify({
 status:report.status,baseline_sha:BASELINE,
 candidate_sha:report.candidate_sha,
 baseline_reproduced_failure:report.baseline_reproduced_failure,
 candidate_frozen_tests_passed:report.candidate_frozen_tests_passed,
 actual_customer_job_receipt:false,error
}));
if(error)process.exitCode=1;
