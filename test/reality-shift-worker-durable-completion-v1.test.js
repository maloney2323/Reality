import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isDurablyCompletedShiftWorkerPulse}
 from '../src/reality-shift-worker-durable-completion-v1.js';

const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const valid={
 status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',
 shift_id:SHIFT,worker_status:'WAKE_COMPLETED',
 job_started_by_pulse:false,original_job_completed:false,
 installation_authorized:false,production_changed:false
};
test('only an exact independently recorded completed shift pulse is a checkpoint',()=>{
 assert.equal(isDurablyCompletedShiftWorkerPulse(valid,SHIFT),true);
 for(const broken of [
  {status:'UNVERIFIED'},{shift_id:'00000000-0000-0000-0000-000000000001'},
  {worker_status:'WAKE_FAILED'},{job_started_by_pulse:true},
  {original_job_completed:true},{installation_authorized:true},
  {production_changed:true}
 ]){
  assert.equal(isDurablyCompletedShiftWorkerPulse({...valid,...broken},SHIFT),false);
 }
 assert.equal(isDurablyCompletedShiftWorkerPulse(valid,'invalid'),false);
});
test('worker preserves a durably completed wake when response publication fails',()=>{
 const source=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const checkpoint=source.indexOf('durableWorkerCompletion=completedPulse;');
 const catchBlock=source.indexOf("if(durableWorkerCompletion){");
 const failedPulse=source.indexOf("p_status:'WAKE_FAILED'",catchBlock);
 assert.ok(checkpoint>0&&catchBlock>checkpoint&&failedPulse>catchBlock);
 assert.match(source,/DURABLE_SHIFT_WAKE_COMPLETED_RESPONSE_FALLBACK/);
 assert.match(source,/workerStage='WORKER_RESPONSE_PUBLICATION'/);
});
test('general readback keeps owner, source and independent-CI boundaries without historical issue pins',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_general_shift_riley_revision_failure_readback_v1.sql',import.meta.url),'utf8');
 assert.doesNotMatch(sql,/issues\/263|issues\/185|step_index between 2 and 5/);
 assert.match(sql,/current_user <> 'service_role'/);
 assert.match(sql,/reality_read_current_shift_execution_graph_v1/);
 assert.match(sql,/j.shift_source_proof_sha256=v.source_proof_sha256/);
 assert.match(sql,/x->>'source_ref'=j.issue_url/);
 assert.match(sql,/f.ci_conclusion='failure'/);
 assert.match(sql,/NO_INDEPENDENT_CURRENT_REVISION_FAILURE_RECORDED/);
 assert.doesNotMatch(sql,/insert into|update reality_internal|delete from/i);
});
