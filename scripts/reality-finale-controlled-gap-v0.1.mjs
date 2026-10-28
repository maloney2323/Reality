// Controlled, explicitly NONCUSTOMER finale: real baseline failure on
// isolated branch, grounded in Reality's shipped autonomous capability loop.
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {detectCapabilityGap,confirmCapabilityGap,createSandboxExperiment}
  from '../src/reality-autonomous-capability-loop-v1.0.js';

const sha=s=>createHash('sha256').update(s).digest('hex');
const workId='work:'+sha('Reality:2026-10-28:controlled-estimate-approval-finale-v1').slice(0,32);
const target='src/reality-extensions/construction-estimate-approval-gate.mjs';
const test='test/reality-finale-estimate-approval-gate.test.mjs';
const out='finale-evidence';
mkdirSync(out,{recursive:true});
if(existsSync(target))throw Error('CONTROLLED_FINALE_NOT_A_REAL_MISSING_CAPABILITY');
const res=spawnSync(process.execPath,['--test',test],{encoding:'utf8',timeout:30000});
const diagnostic=String(res.stdout||'')+'\n'+String(res.stderr||'');
if(res.error||res.status===0||
 !diagnostic.includes('ERR_MODULE_NOT_FOUND')||
 !diagnostic.includes('construction-estimate-approval-gate.mjs'))
 throw Error('CONTROLLED_BASELINE_FAILURE_NOT_VERIFIED');
const workItem={
 id:workId,continuity_root_id:'root:'+sha(workId).slice(0,32),
 worldline_id:'worldline:finale:'+sha(workId+'world').slice(0,32),
 capability_contract:'evaluateEstimateRelease',
 work_key:'construction:estimate:approval:gate',
};
const detected=detectCapabilityGap({consequence:{
 gap:'MISSING_CAPABILITY',subject:'construction-estimate-approval-gate',
},workItem,capabilities:[]});
if(!detected||detected.work_item_id!==workId||detected.state!=='GAP_DETECTED')
 throw Error('REALITY_GAP_DETECTION_FAILED');
const confirmed=confirmCapabilityGap(detected,{
 historicalFailureRefs:['controlled:git:test:ERR_MODULE_NOT_FOUND:'+sha(diagnostic)],
 verificationSuiteRef:test,
 inputSchema:'typed estimate id, homeowner approval, approval evidence and owner review',
 outputSchema:'HOLD/READY_FOR_AUTHORIZATION with no send authority',
});
const experiment=createSandboxExperiment({
 confirmedGap:confirmed,attempt:1,primaryWorldlineId:workItem.worldline_id,
});
const evidence={
 version:'reality-controlled-finale-baseline-v0.1',
 test_kind:'CONTROLLED_FAILURE_INJECTION_NONCUSTOMER',
 original_work_id:workId,original_customer_job_id:'work:24cda9611404e9bcb47909976067605c',
 current_source_sha:process.env.GITHUB_SHA||null,
 missing_target:target,real_red_test_exit:res.status,
 actual_failure:'ERR_MODULE_NOT_FOUND',
 goal:'Enforce homeowner-approval-before-estimate authorization without send',
 gap_id:confirmed.gap_id,
 evidence_hash:sha(res.stderr),
 experiment_hash:experiment.experiment_hash,
 experiment_state:experiment.state,
 target_does_not_exist:true,owner_install_authorization:false,
 original_customer_job_completed:false,isolated_job_completed:false,
};
writeFileSync(out+'/baseline.json',JSON.stringify(evidence,null,2)+'\n');
writeFileSync(out+'/experiment.json',JSON.stringify(experiment,null,2)+'\n');
console.log(JSON.stringify(evidence));
