import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectOriginalExecutorRun} from '../src/reality-original-executor-run-monitor-v0.1.js';
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
