import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 inspectOriginalWorkRepairEvidence,
 inspectAuthenticatedOriginalWorkRepairEvidence,
} from '../src/reality-recovery-evidence-gate-v0.1.js';

const repo='maloney2323/Reality',root='/repos/'+repo;
const work='work:'+'a'.repeat(32);
const failIds=[40591283500,40591264324];
const workflow=10023,branch='experiment/reality-live-durable-adversarial-20261025';
const later=40601144209;
const toUrl=id=>'https://github.com/'+repo+'/actions/runs/'+id;
const r=(id,{success=false,created_at,head_sha}={})=>({
 id,html_url:toUrl(id),repository:{full_name:repo},
 workflow_id:workflow,name:'Reality Governed Execution Engine v0.1',
 head_branch:branch,head_sha:head_sha||(success?'bbb':'aaa'),
 status:'completed',conclusion:success?'success':'failure',
 created_at:created_at||(success?'2026-10-27T23:20:00Z':'2026-10-27T21:45:00Z'),
});
const recovery={
 original_work_id:work,checkpoint_receipt_id:'checkpoint:verified',
 checkpoint_persisted:true,state:'RECOVERY_BLOCKED_DURABLY_RECORDED',
 job_completed:false,new_external_action_authorized:false,
 existing_issue_url:'https://github.com/'+repo+'/issues/143',
 source_evidence_refs:failIds.map(toUrl),
};
const fakeFetch=(values,calls=[])=>async(url,{method,headers}={})=>{
 calls.push({url,method,headers});
 assert.equal(method,'GET');assert.ok(url.startsWith('https://api.github.com'+root+'/actions/'));
 const path=url.slice('https://api.github.com'.length);
 if(!values.has(path))throw Error('UNEXPECTED_PATH '+path);
 return {ok:true,async json(){return values.get(path)}};
};
function provider({hasSuccess=true,success=r(later,{success:true}),failed}={}){
 const m=new Map();
 for(const id of failIds)m.set(root+'/actions/runs/'+id,failed?.get(id)||r(id));
 m.set(root+'/actions/workflows/'+workflow+'/runs?status=success&per_page=30&branch='+branch,
  {workflow_runs:hasSuccess?[success]:[]});
 if(hasSuccess)m.set(root+'/actions/runs/'+success.id,success);
 return m;
}
test('real historical GitHub failures and fresh later passing run preserve original job and block invented upgrades',async()=>{
 const calls=[];
 const actual=await inspectOriginalWorkRepairEvidence({recovery,
  fetchImpl:fakeFetch(provider(),calls)});
 assert.equal(actual.status,'LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED');
 assert.equal(actual.original_work_id,work);
 assert.equal(actual.recovery_receipt_id,recovery.checkpoint_receipt_id);
 assert.equal(actual.verified_historical_failure_count,2);
 assert.equal(actual.later_success.run_url,toUrl(later));
 assert.equal(actual.root_cause_verified,false);
 assert.equal(actual.original_repair_proven,false);
 assert.equal(actual.capability_gap_proven,false);
 assert.equal(actual.new_upgrade_required,'NOT_ESTABLISHED');
 assert.equal(actual.original_job_completed,false);
 assert.equal(actual.execution_authorized,false);
 assert.equal(actual.external_action_performed,false);
 assert.equal(actual.no_retry_original_issue,true);
 assert.equal(calls.length,4);
 assert.ok(calls.every(x=>x.method==='GET'));
});
test('no subsequent passing GitHub run is not silently inferred from stale failures',async()=>{
 const state=await inspectOriginalWorkRepairEvidence({recovery,
  fetchImpl:fakeFetch(provider({hasSuccess:false}))});
 assert.equal(state.status,'NO_LATER_VERIFIED_SUCCESS_IN_BOUNDED_PROVIDER_WINDOW');
 assert.equal(state.later_success,null);
 assert.equal(state.original_job_completed,false);
});
test('a different job, missing recovery receipt or wrong original issue is rejected before provider reads',async()=>{
 for(const bad of [
  {...recovery,checkpoint_persisted:false},
  {...recovery,state:'REACTIVATION_READY'},
  {...recovery,job_completed:true},
  {...recovery,source_evidence_refs:[toUrl(failIds[0]),'https://evil.test/run/3']},
  {...recovery,source_evidence_refs:[toUrl(failIds[0]),toUrl(failIds[0])]},
  {...recovery,existing_issue_url:'https://github.com/other/Reality/issues/143'},
 ]){
  let called=0;
  await assert.rejects(inspectOriginalWorkRepairEvidence({recovery:bad,
   fetchImpl:async()=>{called++;throw Error('PROVIDER_ACCESS_SHOULD_NOT_HAPPEN')}}),
   /RECOVERY_/);
  assert.equal(called,0);
 }
});
test('wrong workflow identity, branch or provider state is not evidence of a repair',async()=>{
 const badRuns=[
  {...r(failIds[0]),workflow_id:workflow+1},
  {...r(failIds[0]),conclusion:'success'},
  {...r(failIds[0]),repository:{full_name:'untrusted/project'}},
  {...r(failIds[0]),head_branch:'other'},
 ];
 for(const replacement of badRuns){
  const m=provider({failed:new Map([[failIds[0],replacement]])});
  await assert.rejects(inspectOriginalWorkRepairEvidence({recovery,
   fetchImpl:fakeFetch(m)}),/RECOVERY_SOURCE_FAILURES_NOT_EQUIVALENT|RECOVERY_PROVIDER_RUN_IDENTITY_UNVERIFIED/);
 }
});
test('later workflow success needs second exact provider verification',async()=>{
 const candidate=r(later,{success:true});
 const m=provider();
 m.set(root+'/actions/runs/'+later,{...candidate,conclusion:'failure'});
 await assert.rejects(inspectOriginalWorkRepairEvidence({recovery,
  fetchImpl:fakeFetch(m)}),/RECOVERY_LATER_SUCCESS_PROVIDER_RECHECK_FAILED/);
});
test('owner scoped checkpoint readback is required before GitHub calls',async()=>{
 let calls=0;
 const state=await inspectAuthenticatedOriginalWorkRepairEvidence({
  session:{user_id:'owner'},conversationId:'conversation-1',workId:work,
  inspectCheckpoint:async({workId:id})=>{assert.equal(id,work);return recovery},
  fetchImpl:async(...args)=>{calls++;return fakeFetch(provider())(...args)},
 });
 assert.equal(state.original_work_id,work);assert.equal(calls,4);
 await assert.rejects(inspectAuthenticatedOriginalWorkRepairEvidence({
  session:{},conversationId:'conversation-1',workId:work,
  inspectCheckpoint:async()=>({...recovery,original_work_id:'work:wrong'}),
  fetchImpl:async()=>{throw Error('No provider access allowed')},
 }),/RECOVERY_ORIGINAL_WORK_SCOPE_MISMATCH/);
});
test('provider evidence API is read-only and cannot close issues or install upgrades',()=>{
 const code=readFileSync(new URL('../api/reality/personal-recovery-evidence.js',import.meta.url),'utf8');
 assert.match(code,/authenticatedChatSession/);
 assert.match(code,/req\.method!=='GET'/);
 assert.match(code,/inspectAuthenticatedOriginalWorkRepairEvidence/);
 assert.match(code,/original_job_completed:false/);
 assert.doesNotMatch(code,/githubWrite|createPullRequest|mergePullRequest|method:'POST'/);
});
