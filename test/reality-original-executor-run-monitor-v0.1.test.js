import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectOriginalExecutorRun,projectAcceptedOriginalExecutorRun,projectLiveOriginalExecutorRun} from '../src/reality-original-executor-run-monitor-v0.1.js';
const work='work:24cda9611404e9bcb47909976067605c';
const run=()=>({
 id:40755665295,name:'Reality ORIGINAL Autonomous Executor Synthesis v0.1',
 head_branch:'feature/governed-autonomous-self-upgrading-v01-20261027',
 head_sha:'75e6e88eda55930c5fbb4a6a4bbc7899892a8caf',
 status:'completed',event:'push',conclusion:'failure',
 html_url:'https://github.com/maloney2323/Reality/actions/runs/40755665295',
 repository:{full_name:'maloney2323/Reality'},
 head_repository:{full_name:'maloney2323/Reality'},
});
const job=(name,conclusion,status='completed')=>({name,conclusion,status});
const generate='reality-model-generates-original-executor';
const sandbox='independent-secretless-executor-verifier';
const correct='reality-model-corrects-failed-original-executor';
const retest='independent-secretless-correction-retest';
test('failed original executor is explicitly rejected and cannot issue warrant',()=>{
 const v=projectOriginalExecutorRun({run:run(),jobs:[job(generate,'success'),job(sandbox,'failure')]});
 assert.equal(v.original_work_id,work);
 assert.equal(v.status,'REALITY_EXECUTOR_REJECTED_CORRECTION_PENDING');
 assert.equal(v.owner_warrant_issued,false);
 assert.equal(v.original_job_completed,false);
 assert.equal(v.installed_capability,false);
});
test('genuine independent first-pass and self-correction success are distinct',()=>{
 const first=projectOriginalExecutorRun({run:run(),jobs:[job(generate,'success'),job(sandbox,'success')]});
 assert.equal(first.status,'REALITY_GENERATED_EXECUTOR_INDEPENDENTLY_TESTED');
 const corrected=projectOriginalExecutorRun({run:run(),jobs:[
  job(generate,'success'),job(sandbox,'failure'),
  job(correct,'success'),job(retest,'success')
 ]});
 assert.equal(corrected.status,'REALITY_SELF_CORRECTED_EXECUTOR_INDEPENDENTLY_TESTED');
 assert.equal(corrected.corrected_independent_sandbox_passed,true);
 assert.equal(corrected.original_job_completed,false);
});
test('model correction failure and test failure remain visibly blocked',()=>{
 const v=projectOriginalExecutorRun({run:run(),jobs:[
  job(generate,'success'),job(sandbox,'failure'),
  job(correct,'success'),job(retest,'failure'),
 ]});
 assert.equal(v.status,'REALITY_CORRECTED_EXECUTOR_REJECTED');
});
test('wrong repository, job, event or SHA cannot impersonate Reality run',()=>{
 const x=run();x.repository.full_name='attacker/Reality';
 assert.throws(()=>projectOriginalExecutorRun({run:x,jobs:[job(generate,'success'),job(sandbox,'success')]}));
 const y=run();y.head_sha='INVALID';
 assert.throws(()=>projectOriginalExecutorRun({run:y,jobs:[job(generate,'success'),job(sandbox,'success')]}));
 assert.throws(()=>projectOriginalExecutorRun({run:run(),jobs:[job(generate,'success'),job('fake-finish','success')]}));
});

test('Reality frozen ten-case model executor evidence requires actual exact green run and cannot imply owner installation',()=>{
 const r=run();
 r.id=40759263421;
 r.name='Reality ORIGINAL Model Executor Independently Verified Behavioral Recheck v0.4';
 r.head_sha='b9949f726d2d2cebee80bdf654767a7d0e0ba038';
 r.html_url='https://github.com/maloney2323/Reality/actions/runs/40759263421';
 r.path='maloney2323/Reality/.github/workflows/reality-original-model-executor-behavioral-recheck-v0.4.yml@refs/heads/feature/governed-autonomous-self-upgrading-v01-20261027';
 r.conclusion='success';
 const j={name:'verify-model-corrected-original-executor',status:'completed',conclusion:'success'};
 const x=projectAcceptedOriginalExecutorRun({run:r,jobs:[j]});
 assert.equal(x.original_work_id,work);
 assert.equal(x.candidate_sha256,'d06ed111a121a4e1a93fb8bcfd47623e2cb60ba6a22e940ec31e0ac5b568d31d');
 assert.equal(x.independent_behavioral_cases_passed,10);
 assert.equal(x.owner_warrant_issued,false);
 assert.equal(x.original_job_completed,false);
 assert.equal(x.installed_capability,false);
 assert.throws(()=>projectAcceptedOriginalExecutorRun({run:{...r,conclusion:'failure'},jobs:[j]}));
 assert.throws(()=>projectAcceptedOriginalExecutorRun({run:r,jobs:[{...j,conclusion:'failure'}]}));
 assert.throws(()=>projectAcceptedOriginalExecutorRun({run:{...r,head_sha:'f'.repeat(40)},jobs:[j]}));
});

test('real model generated executor on original GitHub current source is read-only, with NO upgrade install or job completion',()=>{
 const r=run();
 r.id=40760732281;
 r.name='Reality ORIGINAL Live GitHub Read-Only Execution Proof v0.1';
 r.head_sha='3f49896c8d31925a8294e320a3b821923db3e758';
 r.html_url='https://github.com/maloney2323/Reality/actions/runs/40760732281';
 r.path='.github/workflows/reality-original-live-github-readonly-v0.1.yml';
 r.conclusion='success';
 const j={name:'actual-original-github-readonly',status:'completed',conclusion:'success'};
 const v=projectLiveOriginalExecutorRun({run:r,jobs:[j]});
 assert.equal(v.original_work_id,work);
 assert.equal(v.live_github_read_only_execution_verified,true);
 assert.equal(v.original_source_already_fixed_before_model_install,true);
 assert.equal(v.original_repair_performed_by_reality,false);
 assert.equal(v.owner_warrant_issued,false);
 assert.equal(v.installed_capability,false);
 assert.equal(v.original_job_completed,false);
 assert.throws(()=>projectLiveOriginalExecutorRun({run:{...r,conclusion:'failure'},jobs:[j]}));
 assert.throws(()=>projectLiveOriginalExecutorRun({run:r,jobs:[{...j,conclusion:'failure'}]}));
 assert.throws(()=>projectLiveOriginalExecutorRun({run:{...r,head_sha:'f'.repeat(40)},jobs:[j]}));
 assert.throws(()=>projectLiveOriginalExecutorRun({run:{...r,repository:{full_name:'someone/Reality'}},jobs:[j]}));
});
