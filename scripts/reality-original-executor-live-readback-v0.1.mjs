// Independent, networkless read-only run of Reality's model executor with genuine GitHub snapshot.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const WORK='work:24cda9611404e9bcb47909976067605c';
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const SOURCE='test/reality-personal-discovered-work-handoff-v0.1.test.js';
const ROOT='/repos/maloney2323/Reality';
const candidate='/work/owner-original-repair-executor/candidate.mjs';
const source=readFileSync(candidate);
const observed=createHash('sha256').update(source).digest('hex');
assert.equal(observed,'d06ed111a121a4e1a93fb8bcfd47623e2cb60ba6a22e940ec31e0ac5b568d31d');
const snapshot=JSON.parse(readFileSync('/work/original-live-github-snapshot.json','utf8'));
assert.equal(snapshot.original_work_id,WORK);
assert.equal(snapshot.source_provider,'GITHUB_API_READ_ONLY');
assert.equal(snapshot.issue.number,143);
assert.equal(snapshot.issue.state,'open');
assert.equal(snapshot.ref.ref,'refs/heads/'+BRANCH);
assert.match(snapshot.ref.object.sha,/^[a-f0-9]{40}$/);
const expected=new Map([
 [ROOT+'/git/ref/heads/'+BRANCH,snapshot.ref],
 [ROOT+'/issues/143',snapshot.issue],
 [ROOT+'/contents/'+SOURCE+'?ref='+snapshot.ref.object.sha,snapshot.file]
]);
let reads=0;
let writes=0;
const get=async path=>{reads++;assert.equal(typeof path,'string');assert.ok(expected.has(path),'unexpected live GitHub path');return expected.get(path)};
const write=async()=>{writes++;throw Error('LIVE_READ_ONLY_EXECUTION_NO_OWNER_WRITE_AUTHORITY')};
const executor=await import(pathToFileURL(candidate).href);
assert.equal(executor.ORIGINAL_REPAIR_WORK,WORK);
const prepared=await executor.prepareOriginalMaintenanceRepair({get});
assert.equal(prepared.state,'PREEXISTING_FIX_OBSERVED_NO_WRITE');
assert.equal(prepared.original_work_id,WORK);
assert.equal(prepared.model_upgrade_installed,false);
const result=await executor.executeOriginalMaintenanceRepair({
 session:{user_id:'11111111-1111-4111-8111-111111111111'},
 conversationId:'22222222-2222-4222-8222-222222222222',get,write
});
assert.equal(result.status,'PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY');
assert.equal(result.external_write_performed,false);
assert.equal(result.original_job_completed,false);
assert.equal(result.repair_executed_by_reality,false);
assert.equal(writes,0);
assert.ok(reads>=6);
console.log(JSON.stringify({
 state:'REALITY_ORIGINAL_JOB_ACTUAL_GITHUB_READ_ONLY_EXECUTION_VERIFIED',
 original_work_id:WORK,github_ref_sha:snapshot.ref.object.sha,
 github_issue:143,github_issue_state:snapshot.issue.state,
 github_source_blob_sha:snapshot.file.sha,
 model_generated_executor_sha256:observed,
 github_reads_performed_by_executor:reads,
 source_was_fixed_before_upgrade:true,
 repair_executed_by_reality:false,installed_capability:false,
 github_writes_performed:0,owner_warrant_issued:false,original_job_completed:false
},null,2));
