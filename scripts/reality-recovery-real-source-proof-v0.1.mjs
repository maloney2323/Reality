// REAL repository-source recovery acceptance: baseline missing exports,
// repaired module import, original work identity preserved in the upgrade
// plan. No writes to Github, customer data, or production.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {runAutonomousClosurePass} from '../src/reality-autonomous-closure-orchestrator-v1.0.js';
const BASELINE='0bb6172f9b4922da859cf5fb5fa322d98e8f92fc';
const OLD_MODULE='src/reality-autonomous-capability-loop-v1.0.js';
const ORIGINAL=['authorizeWorldlineMerge','registerVerifiedCapability','reactivationPlan','handleSynthesisFailure'];
const fail=message=>{throw Error(message)};
const baseline=execFileSync('git',['show',BASELINE+':'+OLD_MODULE],
 {encoding:'utf8',maxBuffer:1_000_000});
const current=readFileSync(new URL('../'+OLD_MODULE,import.meta.url),'utf8');
const missingInBaseline=ORIGINAL.filter(x=>!new RegExp('export\\s+(?:async\\s+)?function\\s+'+x+'\\s*\\(').test(baseline));
const missingNow=ORIGINAL.filter(x=>!new RegExp('export\\s+(?:async\\s+)?function\\s+'+x+'\\s*\\(').test(current));
if(missingInBaseline.length!==4||missingNow.length)
 fail('RECOVERY_REAL_SOURCE_BEFORE_AFTER_NOT_VERIFIED');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(sha))fail('RECOVERY_REAL_COMMIT_ID_UNVERIFIED');
const workId='work:'+createHash('sha256')
 .update('github:maloney2323/Reality:fix-missing-recovery-v1-exports')
 .digest('hex').slice(0,32);
const original={
 id:workId,continuity_root_id:'root:recovery-v1-imports',
 worldline_id:'worldline:recovery-v1-imports',
 status:'BLOCKED',missing_capabilities:['recovery.v1.complete-control-plane'],
 capability_contract:{verification_suite_ref:'github-actions:recovery-real-source'},
};
const universe={
 worldId:'world:recovery-v1-imports',
 continuityRootId:original.continuity_root_id,
 worldlineId:original.worldline_id,
 work:[{id:workId,status:'BLOCKED',
  missing_capabilities:['recovery.v1.complete-control-plane']}],
 capabilities:[],particles:[],evidence:[],
};
const planned=await runAutonomousClosurePass({
 universe,workItem:original,
 historicalFailureRefs:['github:src:recovery-v1-linkage:baseline'],
 verificationSuiteRef:'github-actions:recovery-real-source',
 inputSchema:{type:'object'},outputSchema:{type:'object'},
});
if(planned.state!=='AWAITING_AUTHORIZATION'||
 planned.gap?.work_item_id!==workId||
 planned.experiment?.work_item_id!==workId||
 planned.experiment?.production_graph_write_permitted!==false)
 fail('RECOVERY_REAL_ORIGINAL_WORK_NOT_PRESERVED');
const proof={
 proof_version:'reality-recovery-real-source-v0.1',
 tested_repository:'maloney2323/Reality',
 baseline_commit:BASELINE,
 repaired_commit:sha,
 original_work_id:workId,
 genuine_before_after_source_gap:'FOUR_MISSING_EXPORTS_REPAIRED',
 original_missing_exports:missingInBaseline,
 repaired_missing_exports:missingNow,
 actual_module_import:'PASSED',
 verified_control_plane_state:planned.state,
 work_id_preserved:true,
 sandbox_production_write_permitted:false,
 independently_observed_ci:'CURRENT_JOB_MUST_PASS',
 // Critical honesty boundary:
 real_customer_authorization:false,
 github_external_upgrade_by_reality:false,
 original_job_executed:false,
 original_job_completed:false,
 recovery_continuity_settlement:'NOT_YET_PERFORMED',
};
writeFileSync('reality-recovery-real-source-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof,null,2));
