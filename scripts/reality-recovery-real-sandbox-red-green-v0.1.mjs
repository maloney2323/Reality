// Real isolated historical repository red→green repair proof.
// The candidate is an already verified deterministic repair template,
// NOT autonomously invented LLM code or authorized production promotion.
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,copyFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base='0bb6172f9b4922da859cf5fb5fa322d98e8f92fc';
const workId='work:'+createHash('sha256')
 .update('github:maloney2323/Reality:fix-missing-recovery-v1-exports')
 .digest('hex').slice(0,32);
const source='src/reality-autonomous-capability-loop-v1.0.js';
const orchestrator='src/reality-autonomous-closure-orchestrator-v1.0.js';
const testPath='test/reality-recovery-v1-linkage.test.js';
const temp=mkdtempSync(join(tmpdir(),'reality-recovery-'));
const sandbox=join(temp,'checkout');
const fail=msg=>{throw Error(msg)};
let registered=false;
try{
 execFileSync('git',['worktree','add','--detach',sandbox,base],{
  cwd:root,stdio:'pipe',maxBuffer:2_000_000,
 });
 registered=true;
 const importProbe="import('./"+orchestrator+"').then(()=>console.log('MODULE_IMPORT_OK'))";
 const oldRun=spawnSync(process.execPath,['--input-type=module','-e',importProbe],
  {cwd:sandbox,encoding:'utf8',timeout:30000});
 if(oldRun.status===0||!/does not provide an export named/.test(oldRun.stderr||'')||
    !/authorizeWorldlineMerge|registerVerifiedCapability|reactivationPlan|handleSynthesisFailure/.test(oldRun.stderr||''))
  fail('RECOVERY_ACTUAL_HISTORICAL_IMPORT_FAILURE_NOT_REPRODUCED');
 // Copy the actual previously verified repair into an isolated Git worktree.
 // No GitHub provider POST, capability promotion, external side effects.
 for(const p of [source,orchestrator,testPath]){
  if(!existsSync(join(root,p)))fail('RECOVERY_VERIFIED_CANDIDATE_MISSING');
  copyFileSync(join(root,p),join(sandbox,p));
 }
 const repairedRun=spawnSync(process.execPath,['--input-type=module','-e',importProbe],
  {cwd:sandbox,encoding:'utf8',timeout:30000});
 if(repairedRun.status!==0||
    !(repairedRun.stdout||'').includes('MODULE_IMPORT_OK'))
  fail('RECOVERY_REPAIRED_MODULE_IMPORT_FAILED');
 const tests=spawnSync(process.execPath,['--test',testPath],{
  cwd:sandbox,encoding:'utf8',timeout:60000,
 });
 if(tests.status!==0||
    !/# fail 0/.test(tests.stdout||'')||
    !/# pass 9/.test(tests.stdout||''))
  fail('RECOVERY_SAME_ORIGINAL_WORK_REGRESSIONS_NOT_PASSED');
 const receipt={
  proof_version:'reality-real-sandbox-recovery-v0.1',
  real_historical_baseline_commit:base,
  original_work_id:workId,
  baseline_module_import:'REPRODUCED_FAILURE',
  original_missing_capability:'FOUR_REQUIRED_RECOVERY_V1_EXPORTS',
  repair_method:'DETERMINISTIC_REPLAY_OF_VERIFIED_SOURCE_PATCH',
  isolated_workspace:true,
  proposed_upgrade_applied_in_sandbox:true,
  repaired_module_import:'PASS',
  same_work_regressions:'PASS',
  test_summary:'9 passing recovery linkage tests',
  capability_promoted_to_production:false,
  real_world_user_authorization_for_promotion:false,
  novel_code_generation_by_reality:false,
  live_customer_job_resumed:false,
  original_operational_job_completed:false,
  external_provider_write_performed:false,
 };
 writeFileSync(join(root,'reality-recovery-real-sandbox-proof.json'),
  JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt,null,2));
}finally{
 if(registered){
  const result=spawnSync('git',['worktree','remove','--force',sandbox],
   {cwd:root,encoding:'utf8',timeout:30000});
  if(result.status!==0)console.warn('SANDBOX_CLEANUP_PENDING');
 }
 rmSync(temp,{recursive:true,force:true});
}
